import json
import os
import logging
from typing import Any, cast
from anthropic import AsyncAnthropic

from backend.services.sanitizer import sanitize_user_input

logger = logging.getLogger(__name__)

# Basic system prompt encoding the state machine expectations
SYSTEM_PROMPT = """
You are ELECTRA's Oracle — a warm, knowledgeable civic guide.
You help real people understand and navigate elections.
Your users may be first-time voters, elderly, non-native speakers.
Speak warmly, plainly, and with care. Maximum 2 sentences per message.
Never use jargon without immediately explaining it in parentheses.

You must respond ONLY with valid JSON matching this schema exactly:
{
  "message": "string (max 2 sentences, warm tone, plain English)",
  "tone": "warm | informative | warning | celebratory",
  "render": "string | null (component key from registry)",
  "renderProps": {},
  "primaryAction": { "label": "string", "action": "string" },
  "secondaryAction": { "label": "string", "action": "string" } | null,
  "progress": { "step": "number", "total": "number", "label": "string" },
  "proactiveWarning": "string | null",
  "stateTransition": "string",
  "cognitiveLevel": "string",
  "nextAnticipated": "string | null",
  "trust": {
    "sources": [{"id": "string", "title": "string", "url": "string", "publisher": "string", "lastVerified": "YYYY-MM-DD"}],
    "confidence": "number from 0 to 1",
    "lastVerified": "YYYY-MM-DD",
    "rationale": "string"
  }
}

Current election knowledge base: 
- US Voting age is 18.
- Registration deadlines vary by state (usually 15-30 days prior).
- Provisional ballots are used if ID or registration is questioned.
- ID requirements vary widely by state.

Context:
Current state: {currentState}
State history: {stateHistory}
Cognitive level: {cognitiveLevel}
Language: {language}
"""

class ClaudeOracleService:
    def __init__(self) -> None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not set. Using dummy client.")
            self.client = None
        else:
            self.client = AsyncAnthropic(api_key=api_key)
            
    async def generate(
        self,
        user_message: str,
        current_state: str,
        state_history: list[dict[str, Any]],
        cognitive_level: str,
        language: str,
        persona: str | None = None,
    ) -> dict[str, Any]:
        sanitized_msg = sanitize_user_input(user_message)
        
        prompt = SYSTEM_PROMPT.replace("{currentState}", current_state) \
                              .replace("{stateHistory}", json.dumps(state_history)) \
                              .replace("{cognitiveLevel}", cognitive_level) \
                              .replace("{language}", language)

        # Instruction for multi-language
        if language == "es":
            prompt += "\n\nRespond entirely in Spanish. Use civic terminology standard in the United States."
        elif language == "fr":
            prompt += "\n\nRespond entirely in French. Use civic terminology standard in the United States."
        elif language == "en-simple":
            prompt += "\n\nRespond in en-simple: max 8-word sentences, zero jargon, use analogies from everyday life."

        if not self.client:
            # Fallback mock for testing/dev without API key
            return self._mock_response(sanitized_msg, current_state)

        try:
            response = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                system=prompt,
                messages=[
                    {"role": "user", "content": sanitized_msg}
                ]
            )
            
            response_text = str(getattr(cast(Any, response.content[0]), "text", ""))
            
            # Extract JSON if Claude wrapped it in markdown blocks
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                json_str = response_text.split("```")[1].strip()
            else:
                json_str = response_text.strip()
                
            return json.loads(json_str)
            
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            return self._error_recovery_response()

    def _trust_metadata(self) -> dict[str, Any]:
        return {
            "sources": [
                {
                    "id": "usa-gov-voting",
                    "title": "Voting and elections",
                    "url": "https://www.usa.gov/voting",
                    "publisher": "USAGov",
                    "lastVerified": "2026-04-30"
                }
            ],
            "confidence": 0.82,
            "lastVerified": "2026-04-30",
            "rationale": "Electra combines the current journey state with general US voting guidance. Local deadlines should be verified with the user's election office."
        }

    def _error_recovery_response(self) -> dict[str, Any]:
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

    def _mock_response(self, msg: str, state: str) -> dict[str, Any]:
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

oracle_service = ClaudeOracleService()
