"""Hosting entry point: validate configuration, never migrate or seed."""

import os

import uvicorn

from app.config import Settings


def main():
    try:
        settings = Settings()
    except Exception:
        raise SystemExit("Invalid hosting settings; inspect names/formats privately") from None
    required = ["database_url", "storage_service_key", "storage_bucket", "allowed_origins"]
    if settings.ai_provider == "gemini":
        required.extend(["ai_api_key", "ai_model"])
    if settings.ai_provider == "openai" or settings.ai_fallback_openai:
        required.extend(["openai_api_key", "openai_model", "openai_transcription_model"])
    missing = [name.upper() for name in required if not getattr(settings, name)]
    if missing:
        raise SystemExit("Missing hosting settings: " + ", ".join(missing))
    # Report invalid configuration without printing connection strings or secrets.
    try:
        settings.postgres_url()
        settings.jwks_url()
        port = int(os.environ.get("PORT", "10000"))
        if not 1 <= port <= 65535:
            raise ValueError("invalid port")
    except Exception:
        raise SystemExit("Invalid database, Auth or PORT configuration") from None
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, workers=1, access_log=False)


if __name__ == "__main__":
    main()
