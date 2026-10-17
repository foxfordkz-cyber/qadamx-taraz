"""Emergency rollback: fail closed for livestock after schema 0008.

This branch deliberately pauses the entire livestock module. CRM, ids, customer
recovery and money use the previously deployed 0.6.2 implementation unchanged.
Never use the unguarded parent SHA after introducing canonical market links.
"""

from urllib.parse import parse_qs
from uuid import uuid4

from starlette.responses import JSONResponse


class MarketsRollbackGuard:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "").rstrip("/")
            query = parse_qs(
                scope.get("query_string", b"").decode("latin-1"), keep_blank_values=True
            )
            if (
                path == "/api/v1/livestock"
                or path.startswith("/api/v1/livestock/")
                or "market_id" in query
            ):
                request_id = str(uuid4())
                response = JSONResponse(
                    {
                        "error": {
                            "code": "MARKETS_MAINTENANCE",
                            "message": "Livestock temporarily unavailable",
                            "fields": {},
                        },
                        "request_id": request_id,
                    },
                    status_code=503,
                    headers={
                        "Cache-Control": "no-store",
                        "Retry-After": "300",
                        "X-Request-ID": request_id,
                    },
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)
