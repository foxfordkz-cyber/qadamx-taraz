"""Temporary rollback entrypoint: run API 0.6.1 without unsafe customer retries.

Use only in an agreed rollback window, with the 0006 table and receipts retained.
Normal startup of API 0.6.2 does not import or enable this guard.
"""

import argparse
import re
import sys
from pathlib import Path
from uuid import uuid4

import uvicorn
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

CUSTOMER_ROUTE = re.compile(r"^/api/v1/businesses/[^/]+/(customers|customer-creation-result)/?$")


class CustomerWritePause:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        match = CUSTOMER_ROUTE.fullmatch(scope.get("path", ""))
        if scope["type"] == "http" and match and scope["method"] != "OPTIONS":
            lookup = match[1] == "customer-creation-result"
            if lookup or scope["method"] == "POST":
                request_id = str(uuid4())
                response = JSONResponse(
                    status_code=503,
                    content={
                        "error": {
                            "code": "CUSTOMER_RECOVERY_PAUSED",
                            "message": "Customer creation temporarily paused; keep the original "
                            "idempotency key and body. The previous result remains unknown.",
                            "fields": {},
                        },
                        "request_id": request_id,
                    },
                    headers={"Cache-Control": "no-store", "X-Request-ID": request_id},
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


def protect_legacy_app(app, allowed_origins):
    # Outer CORS ensures that a browser sees the 503 envelope, including for paused POSTs.
    # All other paths still pass through the legacy app's normal Auth/CORS/middleware.
    return CORSMiddleware(
        CustomerWritePause(app),
        allow_origins=allowed_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
        expose_headers=["X-Request-ID"],
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--legacy-api-dir", type=Path, required=True)
    parser.add_argument("--port", type=int, default=8021)
    args = parser.parse_args()
    legacy = args.legacy_api_dir.resolve(strict=True)
    if not (legacy / "app/main.py").is_file():
        parser.error("Expected the reviewed API 0.6.1 apps/api directory")
    sys.path.insert(0, str(legacy))
    # This process loads the explicitly supplied old checkout, never this branch's app.
    from app.config import Settings
    from app.main import app

    if app.version != "0.6.1":
        parser.error("Rollback entrypoint requires exactly API 0.6.1")
    uvicorn.run(
        protect_legacy_app(app, Settings().allowed_origins),
        host="127.0.0.1",
        port=args.port,
        access_log=False,
    )


if __name__ == "__main__":
    main()
