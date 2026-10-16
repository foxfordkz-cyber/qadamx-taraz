"""Private server-only Storage. No client paths, original bytes or EXIF are published."""

import io
import warnings
from urllib.parse import urlsplit

import httpx
from PIL import Image, ImageOps, UnidentifiedImageError
from starlette.exceptions import HTTPException

from app.errors import APIError

MAX_UPLOAD = 8 * 1024 * 1024
MAX_PIXELS = 20_000_000


class PhotoBodyLimit:
    """Bound streamed multipart input before Starlette spools it to temporary storage."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path") != "/api/v1/livestock/photos":
            return await self.app(scope, receive, send)
        received = 0

        async def limited_receive():
            nonlocal received
            message = await receive()
            received += len(message.get("body", b""))
            if received > MAX_UPLOAD + 65536:
                raise HTTPException(413, "Photo request body too large")
            return message

        await self.app(scope, limited_receive, send)


def clean_image(raw: bytes) -> bytes:
    if not raw or len(raw) > MAX_UPLOAD:
        raise APIError(422, "INVALID_PHOTO", "Photo must be at most 8 MiB")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as original:
                if (
                    original.format not in {"JPEG", "PNG", "WEBP"}
                    or original.width * original.height > MAX_PIXELS
                    or getattr(original, "n_frames", 1) != 1
                ):
                    raise ValueError("Unsupported image")
                original.load()
                frame = ImageOps.exif_transpose(original).convert("RGB")
                frame.thumbnail((1600, 1600))
                # Fresh image has no metadata, ICC profile, comments, XMP or EXIF.
                clean = Image.frombytes("RGB", frame.size, frame.tobytes())
                output = io.BytesIO()
                clean.save(output, format="JPEG", quality=85)
                return output.getvalue()
    except (
        OSError,
        ValueError,
        UnidentifiedImageError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise APIError(422, "INVALID_PHOTO", "Use a valid static JPEG, PNG or WebP") from exc


class SupabasePhotoStore:
    def __init__(self, settings):
        self.origin = settings.supabase_url.rstrip("/")
        self.bucket = settings.storage_bucket
        self.secret = settings.storage_service_key

    def request(self, method, key, content=None):
        url = urlsplit(self.origin)
        if (
            not self.secret
            or not self.bucket
            or url.scheme != "https"
            or not url.hostname
            or url.path
            or url.query
            or url.fragment
            or url.username
        ):
            raise APIError(503, "STORAGE_UNAVAILABLE", "Private photo storage is not configured")
        # Keys are generated only by the server and never accepted from a request.
        headers = {
            "Authorization": "Bearer " + self.secret.get_secret_value(),
            "apikey": self.secret.get_secret_value(),
            "Content-Type": "image/jpeg",
            "x-upsert": "true",
        }
        prefix = "object/authenticated" if method == "GET" else "object"
        try:
            with httpx.Client(timeout=10, follow_redirects=False, trust_env=False) as client:
                response = client.request(
                    method,
                    f"{self.origin}/storage/v1/{prefix}/{self.bucket}/{key}",
                    headers=headers,
                    content=content,
                )
                response.raise_for_status()
                return response.content
        except httpx.HTTPError as exc:
            # Never include provider bodies/headers or private paths in the API error.
            raise APIError(503, "STORAGE_UNAVAILABLE", "Photo storage unavailable; retry") from exc

    def put(self, key, data):
        self.request("POST", key, data)

    def get(self, key):
        return self.request("GET", key)
