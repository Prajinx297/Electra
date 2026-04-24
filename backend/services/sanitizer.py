from __future__ import annotations

import re

BLOCKED_PATTERN = re.compile(
    r"(ignore previous|system prompt|<script|</script|javascript:)",
    re.IGNORECASE,
)


def sanitize_user_text(value: str, limit: int = 500) -> str:
    cleaned = re.sub(r"<script.*?>.*?</script>", "", value, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"[<>\u0000-\u001f\u007f]", "", cleaned)
    cleaned = BLOCKED_PATTERN.sub("", cleaned)
    return cleaned.strip()[:limit]


def sanitize_address(value: str) -> str:
    cleaned = sanitize_user_text(value)
    return re.sub(r"[^a-zA-Z0-9\s,.\-#/]", "", cleaned)
