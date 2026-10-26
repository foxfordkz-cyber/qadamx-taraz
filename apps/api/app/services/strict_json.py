"""Decode raw provider objects before duplicate keys can be lost.

An already-decoded dictionary cannot prove key uniqueness and is refused here.
Transport envelopes may contain vendor metadata; extraction schemas decide which
payload fields are allowed. No response content is included in validation errors.
"""

import json
import math


def _unique_fields(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON field")
        result[key] = value
    return result


def _invalid_constant(value):
    raise ValueError("Non-finite JSON number")


def _finite_float(value):
    result = float(value)
    if not math.isfinite(result):
        raise ValueError("Non-finite JSON number")
    return result


def strict_json_object(raw):
    if not isinstance(raw, (str, bytes, bytearray)):
        raise ValueError("Raw JSON text required")
    try:
        result = json.loads(
            raw,
            object_pairs_hook=_unique_fields,
            parse_constant=_invalid_constant,
            parse_float=_finite_float,
        )
    except (json.JSONDecodeError, UnicodeError, RecursionError):
        raise ValueError("Malformed provider JSON") from None
    if not isinstance(result, dict):
        raise ValueError("Expected JSON object")
    return result
