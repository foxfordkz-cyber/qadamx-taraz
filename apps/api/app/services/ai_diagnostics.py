"""Allowlisted AI stage metadata only: never log payloads or exception messages."""

import asyncio
import json
import logging
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from time import monotonic

import httpx

from app.errors import APIError

logger = logging.getLogger("uvicorn.error.qadam.ai")
request_id = ContextVar("ai_request_id", default="-")


@contextmanager
def diagnostic_request(value):
    token = request_id.set(str(value))
    try:
        yield
    finally:
        request_id.reset(token)


@dataclass
class Stage:
    provider_status: int | None = None
    provider: str | None = None
    model: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    cost_estimate_usd: float | None = None
    audio_seconds: float | None = None
    request_body_bytes: int | None = None
    input_chars: int | None = None


@contextmanager
def ai_stage(name):
    started = monotonic()
    details = Stage()
    error_type = None
    error_code = None
    try:
        yield details
    except BaseException as exc:
        # Class names/codes are selected from application/library types, never str(exc).
        if isinstance(exc, httpx.HTTPStatusError):
            error_type = "HTTPStatusError"
            details.provider_status = exc.response.status_code
        elif isinstance(exc, asyncio.CancelledError):
            error_type = "CancelledError"
        elif isinstance(exc, (TimeoutError, httpx.TimeoutException)):
            error_type = "TimeoutError"
        elif isinstance(exc, httpx.HTTPError):
            error_type = "HTTPError"
        elif isinstance(exc, APIError):
            error_type = "APIError"
            if exc.code in {
                "AI_TIMEOUT",
                "AI_UNAVAILABLE",
                "AUDIO_UNSUPPORTED",
                "AUDIO_TOO_LONG",
                "AUDIO_TOO_LARGE",
                "VALIDATION_ERROR",
                "UNSUPPORTED_MEDIA_TYPE",
            }:
                error_code = exc.code
        elif isinstance(exc, (ValueError, RecursionError)):
            error_type = "ValidationError"
        else:
            error_type = "UnexpectedError"
        raise
    finally:
        event = {
            "event": "ai_stage",
            "request_id": request_id.get(),
            "stage": name,
            "provider_status": details.provider_status,
            "error_type": error_type,
            "error_code": error_code,
            "duration_ms": round((monotonic() - started) * 1000),
            "provider": details.provider,
            "model": details.model,
            "input_tokens": details.input_tokens,
            "output_tokens": details.output_tokens,
            "cost_estimate_usd": details.cost_estimate_usd,
            "audio_seconds": details.audio_seconds,
            "request_body_bytes": details.request_body_bytes,
            "input_chars": details.input_chars,
        }
        logger.log(logging.WARNING if error_type else logging.INFO, json.dumps(event))
