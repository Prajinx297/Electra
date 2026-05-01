import re

# Simple regex patterns for PII stripping
PII_PATTERNS = {
    "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
    "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
    "phone": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"
}

def strip_pii(text: str) -> str:
    """Removes likely PII from user input."""
    sanitized = text
    for pii_type, pattern in PII_PATTERNS.items():
        sanitized = re.sub(pattern, f"[{pii_type.upper()}_REMOVED]", sanitized)
    return sanitized

def strip_html(text: str) -> str:
    """Strips basic HTML tags to prevent injection."""
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)

def prevent_prompt_injection(text: str) -> str:
    """Basic heuristics to block prompt injection attempts."""
    lower_text = text.lower()
    dangerous_phrases = [
        "ignore previous instructions",
        "system prompt",
        "you are now",
        "forget everything",
        "bypass",
        "developer mode"
    ]
    for phrase in dangerous_phrases:
        if phrase in lower_text:
            # Neutralize the input
            return "I have a question about the election process."
    return text

def sanitize_user_input(text: str) -> str:
    """Full sanitization pipeline for user text."""
    if not text:
        return ""
    # Enforce 500 char limit
    text = text[:500]
    text = strip_html(text)
    text = prevent_prompt_injection(text)
    text = strip_pii(text)
    return text.strip()
