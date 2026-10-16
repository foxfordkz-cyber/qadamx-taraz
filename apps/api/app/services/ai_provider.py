"""Explicit provider selection; optional one-way fallback is disabled by default."""

import asyncio

import httpx

from app.services.ai import GeminiProvider
from app.services.openai_provider import OpenAIProvider


class ProviderPlan:
    def __init__(self, settings):
        self.settings = settings

    def for_request(self):
        if self.settings.ai_provider == "openai":
            return OpenAIProvider(self.settings)
        primary = GeminiProvider(self.settings)
        if not self.settings.ai_fallback_openai:
            return primary
        return LimitedFallback(
            primary, OpenAIProvider(self.settings), self.settings.ai_primary_timeout_seconds
        )


class LimitedFallback:
    max_attempts = 2  # Existing Gemini parse retry; fallback itself never retries.

    def __init__(self, primary, secondary, primary_timeout):
        self.primary, self.secondary = primary, secondary
        self.primary_timeout = primary_timeout
        self.fallback_used = False

    async def generate(self, **kwargs):
        cancellation_count = asyncio.current_task().cancelling()
        if self.fallback_used:
            raise ValueError("Fallback already consumed")
        try:
            async with asyncio.timeout(self.primary_timeout) as deadline:
                value = await self.primary.generate(**kwargs)
            if deadline.expired():
                raise TimeoutError  # Ignore a primary transport that swallowed cancellation.
            return value
        except httpx.HTTPStatusError as error:
            if error.response.status_code != 503 or kwargs["retry"]:
                raise
        except (TimeoutError, httpx.TimeoutException):
            if kwargs["retry"]:
                raise
        # CancelledError, auth/configuration/validation/access errors never reach fallback.
        if asyncio.current_task().cancelling() > cancellation_count:
            raise asyncio.CancelledError
        self.fallback_used = True
        return await self.secondary.generate(**{**kwargs, "retry": False})
