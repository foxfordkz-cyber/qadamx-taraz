"""One extraction result, discarded on an observed disconnect. No detached saves."""

import asyncio

from app.errors import APIError
from app.services.ai import extract


async def extract_connected(request, provider, **kwargs):
    async def disconnected():
        # The body has already been fully consumed. Use the ASGI event directly:
        # is_disconnected()'s cancelled probe can miss events behind BaseHTTPMiddleware.
        while True:
            if (await request.receive())["type"] == "http.disconnect":
                return

    work = asyncio.create_task(extract(provider, **kwargs))
    watcher = asyncio.create_task(disconnected())
    try:
        await asyncio.wait((work, watcher), return_when=asyncio.FIRST_COMPLETED)
        if watcher.done():
            raise APIError(503, "AI_UNAVAILABLE", "AI request cancelled; use manual input")
        return await work
    finally:
        work.cancel()
        watcher.cancel()
        await asyncio.gather(work, watcher, return_exceptions=True)
