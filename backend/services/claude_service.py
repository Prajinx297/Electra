from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

from anthropic import Anthropic

from backend.services.sanitizer import sanitize_user_text

SYSTEM_PROMPT = """
You are the Oracle for ELECTRA, a civic intelligence operating system for real voters.
Always return one JSON object with this schema:
{
  "message": "max two sentences, plain language",
  "tone": "warm|informative|warning|celebratory",
  "render": "WelcomeStep|GoalSelect|DecisionCard|RegistrationChecker|DeadlineCalculator|IDChecker|PollingFinder|BallotWalkthrough|VoteCounter|ConsequenceTree|AccessibilitySupport|JourneySummary|StatusSummary|JourneyGraph|null",
  "renderProps": {},
  "primaryAction": { "label": "...", "action": "..." },
  "secondaryAction": { "label": "...", "action": "..." } | null,
  "progress": { "step": 1, "total": 7, "label": "..." },
  "proactiveWarning": "string or null",
  "stateTransition": "journey_state",
  "cognitiveLevel": "simple|normal|detailed",
  "nextAnticipated": "same render enum or null",
  "confidence": 0.0 to 1.0
}
Do not use jargon without plain wording.
Keep message warm, concise, and reassuring.
""".strip()


@dataclass
class OracleDecision:
    message: str
    tone: str
    render: str | None
    renderProps: dict[str, Any]
    primaryAction: dict[str, str]
    secondaryAction: dict[str, str] | None
    progress: dict[str, Any]
    proactiveWarning: str | None
    stateTransition: str
    cognitiveLevel: str
    nextAnticipated: str | None
    confidence: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "message": self.message,
            "tone": self.tone,
            "render": self.render,
            "renderProps": self.renderProps,
            "primaryAction": self.primaryAction,
            "secondaryAction": self.secondaryAction,
            "progress": self.progress,
            "proactiveWarning": self.proactiveWarning,
            "stateTransition": self.stateTransition,
            "cognitiveLevel": self.cognitiveLevel,
            "nextAnticipated": self.nextAnticipated,
            "confidence": self.confidence,
        }


def localized(value: str, language: str) -> str:
    if language == "es":
        mapping = {
            "Start here.": "Empiece aqui.",
            "Choose the help you need.": "Elija la ayuda que necesita.",
            "You still have options.": "Todavia tiene opciones.",
            "Check your ID now.": "Revise su identificacion ahora.",
            "Find your voting place.": "Encuentre su lugar para votar.",
            "See the count in simple steps.": "Vea el conteo paso a paso.",
        }
        return mapping.get(value, value)
    if language == "fr":
        mapping = {
            "Start here.": "Commencez ici.",
            "Choose the help you need.": "Choisissez l'aide dont vous avez besoin.",
            "You still have options.": "Vous avez encore des options.",
            "Check your ID now.": "Verifiez votre piece d'identite maintenant.",
            "Find your voting place.": "Trouvez votre lieu de vote.",
            "See the count in simple steps.": "Voyez le depouillement etape par etape.",
        }
        return mapping.get(value, value)
    if language == "en-simple":
        mapping = {
            "Start here.": "Start here.",
            "Choose the help you need.": "Pick your help.",
            "You still have options.": "You still can act.",
            "Check your ID now.": "Check your ID now.",
            "Find your voting place.": "Find your vote place.",
            "See the count in simple steps.": "See count step by step.",
        }
        return mapping.get(value, value)
    return value


def build_decision(
    *,
    message: str,
    render: str | None,
    state_transition: str,
    progress_step: int,
    progress_label: str,
    primary_label: str,
    primary_action: str,
    secondary_action: dict[str, str] | None = None,
    proactive_warning: str | None = None,
    tone: str = "warm",
    cognitive_level: str = "simple",
    next_anticipated: str | None = None,
    render_props: dict[str, Any] | None = None,
    confidence: float = 0.96,
) -> OracleDecision:
    return OracleDecision(
        message=message,
        tone=tone,
        render=render,
        renderProps=render_props or {},
        primaryAction={"label": primary_label, "action": primary_action},
        secondaryAction=secondary_action,
        progress={"step": progress_step, "total": 7, "label": progress_label},
        proactiveWarning=proactive_warning,
        stateTransition=state_transition,
        cognitiveLevel=cognitive_level,
        nextAnticipated=next_anticipated,
        confidence=confidence,
    )


def fallback_decision(
    user_message: str, current_state: str, cognitive_level: str, language: str
) -> dict[str, Any]:
    message = sanitize_user_text(user_message).lower()

    if current_state == "WELCOME":
        return build_decision(
            message=localized("Choose the help you need.", language),
            render="GoalSelect",
            state_transition="GOAL_SELECT",
            progress_step=1,
            progress_label="Choosing your goal",
            primary_label="Continue",
            primary_action="continue with my choice",
            secondary_action={"label": "Tell me more", "action": "tell me more about this start"},
            next_anticipated="RegistrationChecker",
            confidence=0.98,
        ).to_dict()

    if "never voted" in message or "first" in message:
        return build_decision(
            message="We will start by checking registration. You do not need to know everything today.",
            render="RegistrationChecker",
            state_transition="REGISTRATION_CHECK",
            progress_step=2,
            progress_label="Checking registration",
            primary_label="Check my registration",
            primary_action="check my registration",
            secondary_action={"label": "Tell me more", "action": "explain why registration matters"},
            proactive_warning="Registration deadlines can close earlier than people expect.",
            next_anticipated="DeadlineCalculator",
            confidence=0.97,
        ).to_dict()

    if "registration" in message and ("wrong" in message or "problem" in message or "not found" in message):
        return build_decision(
            message="If your registration is missing, you still have options. Let's check the details calmly.",
            render="RegistrationChecker",
            state_transition="REGISTRATION_ISSUE",
            progress_step=2,
            progress_label="Checking your registration",
            primary_label="Check my details",
            primary_action="check my details",
            secondary_action={"label": "Tell me more", "action": "explain my backup vote option"},
            proactive_warning="If the deadline is close, act today.",
            render_props={
                "title": "We can look this up together.",
                "description": "A missing email does not always mean your registration failed.",
            },
            next_anticipated="StatusSummary",
            confidence=0.95,
        ).to_dict()

    if "deadline" in message or "backup vote" in message:
        return build_decision(
            message="The regular deadline may be over. I will show the safest backup path now.",
            render="ConsequenceTree",
            state_transition="DEADLINE_PASSED",
            progress_step=3,
            progress_label="Looking at your options",
            primary_label="Show my best backup path",
            primary_action="show my best backup path",
            secondary_action={"label": "Tell me more", "action": "explain what this changes"},
            proactive_warning="Do not leave the polling place without asking what you can still do.",
            tone="warning",
            render_props={
                "affects": [
                    "Your regular ballot path may be blocked.",
                    "You may need same-day help at the polling place.",
                ],
                "recoveryPaths": [
                    "Ask about a backup vote option.",
                    "Bring any valid ID you can get before polls close.",
                ],
                "bestPath": "Ask for the backup option before you leave.",
            },
            next_anticipated="PollingFinder",
            confidence=0.94,
        ).to_dict()

    if "id" in message:
        return build_decision(
            message="Let's check what ID you have right now. I will help you find the best next move.",
            render="IDChecker",
            state_transition="ID_ISSUE",
            progress_step=4,
            progress_label="Checking your ID",
            primary_label="Check my ID",
            primary_action="check my id",
            secondary_action={"label": "Tell me more", "action": "explain my backup vote option"},
            proactive_warning="If polls are closing soon, ask what you can still do before you leave.",
            tone="warning",
            next_anticipated="PollingFinder",
            confidence=0.96,
        ).to_dict()

    if "where" in message or "place" in message or "location" in message or "vote place" in message:
        return build_decision(
            message=localized("Find your voting place.", language),
            render="PollingFinder",
            state_transition="POLLING_FINDER",
            progress_step=5,
            progress_label="Finding where you vote",
            primary_label="Use this place",
            primary_action="use this place",
            secondary_action={"label": "Tell me more", "action": "explain accessibility support"},
            proactive_warning="Choose the easiest place to reach, not just the closest one.",
            next_anticipated="StatusSummary",
            confidence=0.93,
        ).to_dict()

    if "count" in message or "precinct" in message or "recount" in message:
        return build_decision(
            message=localized("See the count in simple steps.", language),
            render="VoteCounter",
            state_transition="COUNTING_EXPLAINED",
            progress_step=6,
            progress_label="Understanding the count",
            primary_label="Keep learning",
            primary_action="keep learning about the count",
            secondary_action={"label": "Tell me more", "action": "what if a precinct reports late"},
            tone="informative",
            cognitive_level="detailed" if cognitive_level == "detailed" else "normal",
            next_anticipated="JourneyGraph",
            confidence=0.95,
        ).to_dict()

    if "access" in message or "walker" in message or "low vision" in message or "language help" in message:
        return build_decision(
            message="We can build a plan around your needs. You do not have to figure this out alone.",
            render="AccessibilitySupport",
            state_transition="ACCESSIBILITY_NEEDS_PATH",
            progress_step=3,
            progress_label="Finding the right support",
            primary_label="Show support options",
            primary_action="show support options",
            secondary_action={"label": "Tell me more", "action": "show accessible voting places"},
            next_anticipated="PollingFinder",
            confidence=0.97,
        ).to_dict()

    if "voting day" in message or "cast" in message or current_state == "POLLING_FINDER":
        return build_decision(
            message="You are almost ready. I can show what happens next so the day feels familiar.",
            render="BallotWalkthrough",
            state_transition="VOTING_DAY_PREP",
            progress_step=6,
            progress_label="Getting ready for voting day",
            primary_label="See what happens next",
            primary_action="see what happens next",
            secondary_action={"label": "Tell me more", "action": "tell me what to bring"},
            next_anticipated="JourneySummary",
            confidence=0.94,
        ).to_dict()

    if "complete" in message or current_state == "VOTING_DAY_PREP":
        return build_decision(
            message="You are officially ready to vote. This is a big deal.",
            render="JourneySummary",
            state_transition="COMPLETE",
            progress_step=7,
            progress_label="You are ready",
            primary_label="Start over",
            primary_action="start over",
            tone="celebratory",
            next_anticipated="WelcomeStep",
            confidence=0.99,
        ).to_dict()

    return build_decision(
        message=localized("Start here.", language),
        render="DecisionCard",
        state_transition=current_state if current_state else "WELCOME",
        progress_step=1,
        progress_label="Getting started",
        primary_label="Show me the next step",
        primary_action="show me the next step",
        secondary_action={"label": "Tell me more", "action": "tell me more"},
        render_props={
            "title": "We will keep this simple.",
            "description": "Tell me what happened, and I will guide one small step at a time.",
            "bullets": [
                "You can stay in guest mode.",
                "You can go back to any step.",
                "You do not need special words.",
            ],
        },
        next_anticipated="GoalSelect",
        confidence=0.9,
    ).to_dict()


class ClaudeOracleService:
    def __init__(self) -> None:
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
        self.client = Anthropic(api_key=self.api_key) if self.api_key else None

    def generate(
        self,
        user_message: str,
        current_state: str,
        history: list[dict[str, Any]],
        cognitive_level: str,
        language: str,
    ) -> dict[str, Any]:
        sanitized_message = sanitize_user_text(user_message)

        if self.client is None:
            return fallback_decision(
                sanitized_message, current_state, cognitive_level, language
            )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=700,
            temperature=0.2,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "userMessage": sanitized_message,
                            "currentState": current_state,
                            "history": history[-6:],
                            "cognitiveLevel": cognitive_level,
                            "language": language,
                        }
                    ),
                }
            ],
        )
        text = "".join(
            block.text for block in response.content if getattr(block, "type", "") == "text"
        )
        try:
            return json.loads(text[text.find("{") : text.rfind("}") + 1])
        except json.JSONDecodeError:
            return fallback_decision(
                sanitized_message, current_state, cognitive_level, language
            )
