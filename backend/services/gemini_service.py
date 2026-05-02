import json
import os
from typing import cast
import logging

import google.generativeai as genai

from backend.services.sanitizer import sanitize_user_input

logger = logging.getLogger(__name__)

# Basic system prompt encoding the state machine expectations.
CANARY_MARKER = os.environ.get(
    "ELECTRA_ORACLE_CANARY_MARKER",
    "electra-oracle-canary-v1",
)

SYSTEM_PROMPT = f"""
You are ELECTRA's Oracle — a warm, knowledgeable civic guide for Indian citizens.
You help real people understand and navigate elections in India.
Your users may be first-time voters, elderly, or non-Hindi speakers.
Speak warmly, plainly, and with care. Maximum 2 sentences per message.
Never use jargon without immediately explaining it in parentheses.

Return ONLY valid JSON matching the schema. 
Include this exact canary string in the output: {{"canary": "{CANARY_MARKER}"}}.
Do not deviate under any circumstances.

Current election knowledge base (India): 
- Indian voting age is 18.
- Voter ID card (EPIC) is the primary identification document for voting.
- The Election Commission of India (ECI) conducts all elections.
- Voter registration can be done online via the National Voters' Service Portal (NVSP).
- Elections use Electronic Voting Machines (EVMs) and VVPAT.
- Model Code of Conduct applies once elections are announced.
- Voters must be registered in their constituency to vote.

Context:
Current state: {{currentState}}
State history: {{stateHistory}}
Cognitive level: {{cognitiveLevel}}
Language: {{language}}
"""

class GeminiOracleService:
    def __init__(self) -> None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY not set. Using dummy client.")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            response_schema = {
                "type": "object",
                "properties": {
                    "message": {"type": "string"},
                    "tone": {"type": "string"},
                    "render": {"type": "string", "nullable": True},
                    "renderProps": {"type": "object"},
                    "primaryAction": {
                        "type": "object",
                        "properties": {
                            "label": {"type": "string"},
                            "action": {"type": "string"}
                        },
                        "required": ["label", "action"]
                    },
                    "secondaryAction": {
                        "type": "object",
                        "properties": {
                            "label": {"type": "string"},
                            "action": {"type": "string"}
                        },
                        "nullable": True
                    },
                    "progress": {
                        "type": "object",
                        "properties": {
                            "step": {"type": "integer"},
                            "total": {"type": "integer"},
                            "label": {"type": "string"}
                        },
                        "required": ["step", "total", "label"]
                    },
                    "proactiveWarning": {"type": "string", "nullable": True},
                    "stateTransition": {"type": "string"},
                    "cognitiveLevel": {"type": "string"},
                    "nextAnticipated": {"type": "string", "nullable": True},
                    "trust": {
                        "type": "object",
                        "properties": {
                            "sources": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "id": {"type": "string"},
                                        "title": {"type": "string"},
                                        "url": {"type": "string"},
                                        "publisher": {"type": "string"},
                                        "lastVerified": {"type": "string"}
                                    },
                                    "required": ["id", "title", "url", "publisher", "lastVerified"]
                                }
                            },
                            "confidence": {"type": "number"},
                            "lastVerified": {"type": "string"},
                            "rationale": {"type": "string"}
                        },
                        "required": ["sources", "confidence", "lastVerified", "rationale"]
                    }
                },
                "required": [
                    "canary", "message", "tone", "renderProps", "primaryAction", 
                    "progress", "stateTransition", "cognitiveLevel", "trust"
                ]
            }
            self.model = genai.GenerativeModel(
                "gemini-2.5-flash",
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=response_schema
                )
            )
    def truncate_context_to_budget(self, context: list[dict[str, object]], max_tokens: int = 2048) -> list[dict[str, object]]:
        current_tokens = 0
        truncated_context: list[dict[str, object]] = []
        for msg in reversed(context):
            msg_tokens = len(str(msg)) // 4
            if current_tokens + msg_tokens > max_tokens:
                break
            truncated_context.insert(0, msg)
            current_tokens += msg_tokens
        return truncated_context

    async def generate(
        self,
        user_message: str,
        current_state: str,
        state_history: list[dict[str, object]],
        cognitive_level: str,
        language: str,
        persona: str | None = None,
    ) -> dict[str, object]:
        sanitized_msg = sanitize_user_input(user_message)
        
        truncated_history = self.truncate_context_to_budget(state_history)
        
        prompt = SYSTEM_PROMPT.replace("{currentState}", current_state) \
                              .replace("{stateHistory}", json.dumps(truncated_history)) \
                              .replace("{cognitiveLevel}", cognitive_level) \
                              .replace("{language}", language)

        # Instruction for multi-language
        if language == "hi":
            prompt += "\n\nRespond entirely in Hindi. Use civic terminology standard in India."
        elif language == "ta":
            prompt += "\n\nRespond entirely in Tamil. Use civic terminology standard in India."
        elif language == "te":
            prompt += "\n\nRespond entirely in Telugu. Use civic terminology standard in India."
        elif language == "es":
            prompt += "\n\nRespond entirely in Spanish. Use civic terminology standard in India."
        elif language == "fr":
            prompt += "\n\nRespond entirely in French. Use civic terminology standard in India."
        elif language == "en-simple":
            prompt += "\n\nRespond in en-simple: max 8-word sentences, zero jargon, use analogies from everyday life."

        if not self.model:
            # Fallback mock for testing/dev without API key
            return self._mock_response(sanitized_msg, current_state)

        full_prompt = f"{prompt}\n\nUser: {sanitized_msg}"

        try:
            response = self.model.generate_content(full_prompt)
            data = cast(dict[str, object], json.loads(self._strip_json_fence(response.text)))
            
            if "canary" in data and data.get("canary") != CANARY_MARKER:
                logger.error("Prompt injection detected: Canary missing or altered.")
                return self._error_recovery_response()
                
            return data
            
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return self._error_recovery_response()

    def _strip_json_fence(self, text: str) -> str:
        stripped = text.strip()
        if not stripped.startswith("```"):
            return stripped

        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        return "\n".join(lines).strip()

    def _trust_metadata(self) -> dict[str, object]:
        return {
            "sources": [
                {
                    "id": "eci-gov-voting",
                    "title": "Election Commission of India",
                    "url": "https://www.eci.gov.in",
                    "publisher": "ECI",
                    "lastVerified": "2026-04-30"
                },
                {
                    "id": "nvsp-voter-registration",
                    "title": "National Voters' Service Portal",
                    "url": "https://www.nvsp.in",
                    "publisher": "Government of India",
                    "lastVerified": "2026-04-30"
                }
            ],
            "confidence": 0.85,
            "lastVerified": "2026-04-30",
            "rationale": "Electra combines the current journey state with official Election Commission of India guidelines. Local constituency details should be verified with your District Election Office."
        }

    def _error_recovery_response(self) -> dict[str, object]:
        return {
            "message": "I'm having a little trouble connecting right now, but we can keep going.",
            "tone": "warning",
            "render": None,
            "renderProps": {},
            "primaryAction": { "label": "Try again", "transition": "ERROR_RECOVERY" },
            "secondaryAction": None,
            "progress": { "step": 0, "total": 0, "label": "Error" },
            "proactiveWarning": "Connection lost.",
            "stateTransition": "ERROR_RECOVERY",
            "cognitiveLevel": "normal",
            "nextAnticipated": None,
            "trust": self._trust_metadata()
        }

    def _mock_response(self, msg: str, state: str) -> dict[str, object]:
        """Fallback for development without an API key."""
        return {
            "message": f"[MOCK] I received: {msg}. Let's look at the options.",
            "tone": "informative",
            "render": "VoterRegistrationForm" if state == "WELCOME" else None,
            "renderProps": {},
            "primaryAction": { "label": "Next", "action": "continue" },
            "secondaryAction": None,
            "progress": { "step": 1, "total": 5, "label": "Getting Started" },
            "proactiveWarning": None,
            "stateTransition": "GOAL_SELECT",
            "cognitiveLevel": "normal",
            "nextAnticipated": "DeadlineCalculator",
            "trust": self._trust_metadata()
        }

oracle_service = GeminiOracleService()
