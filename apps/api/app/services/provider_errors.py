"""Classify only documented machine codes, never billing guesses or raw messages."""

from app.services.strict_json import strict_json_object


def limit_reason(response):
    if response.request.url.host != "api.openai.com" or len(response.content) > 8192:
        return None
    try:
        error = strict_json_object(response.content).get("error")
    except ValueError:
        return None
    if not isinstance(error, dict):
        return None
    # RESOURCE_EXHAUSTED / HTTP 429 alone is not proof of exhausted credit.
    if error.get("code") in ("insufficient_quota", "credit_balance_exhausted"):
        return "QUOTA_EXHAUSTED"
    if error.get("code") in ("rate_limit_exceeded", "slow_down"):
        return "RATE_LIMITED"
    return None
