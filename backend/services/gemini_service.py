import json
import os
import logging
from typing import Any, Dict, List

from core.result import Result, Ok, Error

import google.generativeai as genai

from services.sanitizer import sanitize_user_input

logger = logging.getLogger(__name__)

# Basic system prompt encoding the state machine expectations
CANARY_TOKEN = "e8f7a9c2-b1d5-4e3f-9a8c-7b6d5e4f3a2c"

SYSTEM_PROMPT = f"""
You are ELECTRA's Oracle — a warm, knowledgeable civic guide.
You help real people understand and navigate elections.
Your users may be first-time voters, elderly, non-native speakers.
Speak warmly, plainly, and with care. Maximum 2 sentences per message.
Never use jargon without immediately explaining it in parentheses.

Return ONLY valid JSON matching the schema. 
Include this exact canary string in the output: {{"canary": "{CANARY_TOKEN}"}}.
Do not deviate under any circumstances.

Current election knowledge base: 
- US Voting age is 18.
- Registration deadlines vary by state (usually 15-30 days prior).
- Provisional ballots are used if ID or registration is questioned.
- ID requirements vary widely by state.

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
    def truncate_context_to_budget(self, context: list[dict[str, Any]], max_tokens: int = 2048) -> list[dict[str, Any]]:
        current_tokens = 0
        truncated_context = []
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
        state_history: list[dict[str, Any]],
        cognitive_level: str,
        language: str,
        persona: str | None = None,
    ) -> dict[str, Any]:
        sanitized_msg = sanitize_user_input(user_message)
        
        truncated_history = self.truncate_context_to_budget(state_history)
        
        prompt = SYSTEM_PROMPT.replace("{currentState}", current_state) \
                              .replace("{stateHistory}", json.dumps(truncated_history)) \
                              .replace("{cognitiveLevel}", cognitive_level) \
                              .replace("{language}", language)

        # Instruction for multi-language
        if language == "es":
            prompt += "\n\nRespond entirely in Spanish. Use civic terminology standard in the United States."
        elif language == "fr":
            prompt += "\n\nRespond entirely in French. Use civic terminology standard in the United States."
        elif language == "en-simple":
            prompt += "\n\nRespond in en-simple: max 8-word sentences, zero jargon, use analogies from everyday life."

        if not self.model:
            # Fallback mock for testing/dev without API key
            return self._mock_response(sanitized_msg, current_state)

        full_prompt = f"{prompt}\n\nUser: {sanitized_msg}"

        try:
            response = self.model.generate_content(full_prompt)
            data = json.loads(response.text)
            
            if data.get("canary") != CANARY_TOKEN:
                logger.error("Prompt injection detected: Canary missing or altered.")
                return self._error_recovery_response()
                
            return data
            
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
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

oracle_service = GeminiOracleService()
