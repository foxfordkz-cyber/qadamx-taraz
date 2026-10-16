"""Server-only transcription then structured extraction. No DB, tools, or SDK retries."""

import io
import json
import wave

import httpx

from app.errors import APIError
from app.services.ai import SYSTEM_PROMPT, Extraction
from app.services.ai_diagnostics import ai_stage


def output_schema():
    # Keep strict types/enums/required/additionalProperties. Enforce bounds again locally.
    def clean(value):
        if isinstance(value, dict):
            return {
                k: clean(v)
                for k, v in value.items()
                if k
                not in {
                    "title",
                    "minLength",
                    "maxLength",
                    "maxItems",
                    "minimum",
                    "maximum",
                    "exclusiveMinimum",
                    "exclusiveMaximum",
                    "pattern",
                }
            }
        if isinstance(value, list):
            return [clean(v) for v in value]
        return value

    return clean(Extraction.model_json_schema())


def usage_metadata(stage, body, model):
    """Conservative estimate from returned usage, not an invoice or quota guarantee."""
    usage = body.get("usage", {})
    if not isinstance(usage, dict):
        return
    for name in ("input_tokens", "output_tokens"):
        value = usage.get(name)
        if type(value) is int and value >= 0:
            setattr(stage, name, value)
    prices = {
        "gpt-6-luna": (0.10, 0.50),
        "gpt-4o-mini-transcribe": (1.25, 5),
        "gpt-4o-mini-transcribe-2025-12-15": (1.25, 5),
    }
    # Mini transcription prompt input is conservatively priced at the audio rate here.
    if model in prices and stage.input_tokens is not None and stage.output_tokens is not None:
        inbound, outbound = prices[model]
        stage.cost_estimate_usd = round(
            (stage.input_tokens * inbound + stage.output_tokens * outbound) / 1_000_000, 9
        )


class OpenAIProvider:
    max_attempts = 1

    def __init__(self, settings):
        self.key = settings.openai_api_key
        self.model = settings.openai_model
        self.transcription_model = settings.openai_transcription_model

    async def post(self, client, path, model, *, audio_seconds=None, **kwargs):
        with ai_stage(
            "openai_transcription" if path.endswith("transcriptions") else "openai_extraction"
        ) as diagnostic:
            diagnostic.provider, diagnostic.model = "openai", model
            diagnostic.audio_seconds = audio_seconds
            response = await client.post(
                "https://api.openai.com/v1/" + path,
                headers={"Authorization": "Bearer " + self.key.get_secret_value()},
                **kwargs,
            )
            diagnostic.provider_status = response.status_code
            response.raise_for_status()
            body = response.json()
            if not isinstance(body, dict):
                raise ValueError("Expected provider object")
            usage_metadata(diagnostic, body, model)
            if model == "gpt-transcribe" and audio_seconds is not None:
                diagnostic.cost_estimate_usd = round(audio_seconds * 0.0045 / 60, 9)
            return body

    async def generate(self, *, text, audio, locale, retry):
        if not self.key or not self.model or (audio is not None and not self.transcription_model):
            raise APIError(503, "AI_UNAVAILABLE", "OpenAI is not configured; use manual input")
        async with httpx.AsyncClient(timeout=25, follow_redirects=False) as client:
            if audio is not None:
                with wave.open(io.BytesIO(audio), "rb") as wav:
                    audio_seconds = wav.getnframes() / wav.getframerate()
                transcription_data = {
                    "model": self.transcription_model,
                    "response_format": "json",
                    "prompt": "Russian and Kazakh shop speech; preserve the spoken language "
                    "including code switching. Теңге, тиын. Do not invent inaudible words.",
                }
                if self.transcription_model == "gpt-transcribe":
                    transcription_data["languages[]"] = ["ru", "kk"]
                transcript = await self.post(
                    client,
                    "audio/transcriptions",
                    self.transcription_model,
                    audio_seconds=audio_seconds,
                    files={"file": ("input.wav", audio, "audio/wav")},
                    data=transcription_data,
                )
                text = transcript.get("text")
                if not isinstance(text, str) or not 1 <= len(text.strip()) <= 4000:
                    raise ValueError("Invalid transcription")
                text = text.strip()
            body = {
                "model": self.model,
                "store": False,
                "background": False,
                "max_output_tokens": 2048,
                "instructions": SYSTEM_PROMPT,
                "input": json.dumps({"locale": locale, "text": text}, ensure_ascii=False),
                "text": {
                    "format": {
                        "type": "json_schema",
                        "name": "qadam_extraction",
                        "strict": True,
                        "schema": output_schema(),
                    }
                },
            }
            if self.model == "gpt-6-luna":
                body["reasoning"] = {"effort": "none"}
            result = await self.post(client, "responses", self.model, json=body)
        if result.get("status") != "completed":
            raise ValueError("Incomplete extraction")
        output = result.get("output")
        if not isinstance(output, list) or any(not isinstance(item, dict) for item in output):
            raise ValueError("Invalid output envelope")
        content = []
        for item in output:
            if item.get("type") == "message":
                parts = item.get("content")
                if not isinstance(parts, list) or any(not isinstance(part, dict) for part in parts):
                    raise ValueError("Invalid output content")
                content.extend(parts)
        if len(content) != 1 or content[0].get("type") != "output_text":
            raise ValueError("Missing extraction or refusal")
        raw = content[0].get("text")
        if not isinstance(raw, str) or len(raw) > 32_000:
            raise ValueError("Invalid extraction size")
        extracted = json.loads(raw)
        if not isinstance(extracted, dict):
            raise ValueError("Invalid extraction object")
        # The STT output, like original text input, is authoritative over an LLM rewrite.
        extracted["transcript"] = text
        return json.dumps(extracted, ensure_ascii=False)
