from uuid import UUID

from fastapi import APIRouter, Request
from starlette.concurrency import run_in_threadpool
from starlette.datastructures import UploadFile
from starlette.exceptions import HTTPException

from app import schemas
from app.errors import APIError
from app.routers import DB, User
from app.services.ai import extract
from app.services.ai_diagnostics import ai_stage, diagnostic_request
from app.services.audio import MAX_AUDIO_BYTES, normalize_audio
from app.services.drafts import authorize_then_release, save_draft

router = APIRouter(prefix="/api/v1")
FORM_SCHEMA = {
    "requestBody": {
        "required": True,
        "content": {
            "multipart/form-data": {
                "schema": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "text": {"type": "string", "minLength": 1, "maxLength": 4000},
                        "audio": {
                            "type": "string",
                            "format": "binary",
                            "description": "<=8 MiB, <=30s",
                        },
                        "locale": {
                            "type": "string",
                            "enum": ["ru", "kk", "auto"],
                            "default": "auto",
                        },
                    },
                    "oneOf": [
                        {"required": ["text"], "not": {"required": ["audio"]}},
                        {"required": ["audio"], "not": {"required": ["text"]}},
                    ],
                }
            }
        },
    }
}


@router.post(
    "/businesses/{id}/drafts",
    response_model=schemas.DraftResponse,
    tags=["drafts"],
    openapi_extra=FORM_SCHEMA,
    responses={status: {"model": schemas.ErrorResponse} for status in (413, 415, 504)},
    description="RU/KK text or audio → draft. No monetary write. Confirm via POST operations. "
    "Exactly one source; 30-minute expiry, author and business scoped, single use. "
    "AI failure leaves manual input available. Audio is decoded to WAV in memory.",
)
async def create_draft(id: UUID, request: Request, db: DB, user: User):
    with diagnostic_request(request.state.request_id), ai_stage("draft_request"):
        return await _create_draft(id, request, db, user)


async def _create_draft(id, request, db, user):
    await run_in_threadpool(authorize_then_release, db, id, user)
    if not request.headers.get("content-type", "").startswith("multipart/form-data"):
        raise APIError(415, "UNSUPPORTED_MEDIA_TYPE", "Use multipart/form-data")
    # Bound actual streamed body, including chunked requests, BEFORE multipart spooling.
    size = 0

    async def receive():
        nonlocal size
        message = await request.receive()
        size += len(message.get("body", b""))
        if size > MAX_AUDIO_BYTES + 16384:
            raise APIError(413, "AUDIO_TOO_LARGE", "Upload exceeds 8 MiB plus form overhead")
        return message

    bounded = Request(request.scope, receive=receive)
    try:
        async with bounded.form(max_files=1, max_fields=2, max_part_size=16384) as form:
            items = form.multi_items()
            keys = [key for key, _ in items]
            if (
                len(keys) != len(set(keys))
                or set(keys) - {"text", "audio", "locale"}
                or (("text" in form) == ("audio" in form))
            ):
                raise APIError(422, "VALIDATION_ERROR", "Supply exactly one of text or audio")
            locale = form.get("locale", "auto")
            if locale not in ("ru", "kk", "auto"):
                raise APIError(422, "VALIDATION_ERROR", "Locale must be ru, kk or auto")
            text = form.get("text")
            audio = None
            if "text" in form:
                if not isinstance(text, str) or not 1 <= len(text.strip()) <= 4000:
                    raise APIError(422, "VALIDATION_ERROR", "Text must contain 1–4000 characters")
                text = text.strip()
            else:
                file = form["audio"]
                if not isinstance(file, UploadFile):
                    raise APIError(415, "AUDIO_UNSUPPORTED", "Upload an audio file, not a URL")
                raw = await file.read(MAX_AUDIO_BYTES + 1)
                with ai_stage("audio_decode"):
                    audio = await run_in_threadpool(normalize_audio, raw, file.content_type or "")
    except HTTPException:
        raise APIError(422, "VALIDATION_ERROR", "Invalid multipart form") from None
    extracted = await extract(request.app.state.ai, text=text, audio=audio, locale=locale)
    with ai_stage("draft_save"):
        return await run_in_threadpool(save_draft, db, id, user, extracted, locale)
