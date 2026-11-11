"""Normalize an untrusted Retry-After header; never forward provider diagnostics."""

import math
import re
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime


def retry_after_seconds(value: str | None, *, now: datetime | None = None) -> int | None:
    if not value or len(value) > 128:
        return None
    value = value.strip()
    if re.fullmatch(r"[0-9]{1,10}", value):
        seconds = int(value)
    else:
        try:
            deadline = parsedate_to_datetime(value)
            if deadline.tzinfo is None:
                return None
            seconds = max(0, math.ceil((deadline - (now or datetime.now(UTC))).total_seconds()))
        except (ValueError, TypeError, OverflowError):
            return None
    return seconds if 0 <= seconds <= 2_147_483_647 else None
