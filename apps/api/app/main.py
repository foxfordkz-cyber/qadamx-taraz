from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from pydantic.json_schema import models_json_schema
from sqlalchemy.exc import DBAPIError
from starlette.exceptions import HTTPException

from app import schemas
from app.assistant_routes import router as assistant_router
from app.auth import TokenVerifier
from app.config import Settings
from app.db import make_engine
from app.draft_routes import router as draft_router
from app.errors import APIError
from app.livestock_routes import router as livestock_router
from app.public_routes import router as public_router
from app.research_routes import router as research_router
from app.routers import router
from app.services.ai_provider import ProviderPlan
from app.services.assistant import Assistant
from app.services.photos import PhotoBodyLimit, SupabasePhotoStore


def private_response(request):
    path = request.url.path.rstrip("/")
    return (
        path.startswith("/api/v1/livestock")
        or (path.startswith("/api/v1/businesses/") and "/research/" in path)
        or path.endswith("/customer-creation-result")
        or (request.method == "POST" and path.endswith("/customers"))
    )


def error_response(request, status, code, message, fields=None):
    body = schemas.ErrorResponse(
        error=schemas.ErrorDetail(code=code, message=message, fields=fields or {}),
        request_id=request.state.request_id,
    )
    response = JSONResponse(status_code=status, content=body.model_dump(mode="json"))
    response.headers["X-Request-ID"] = str(request.state.request_id)
    if private_response(request):
        response.headers["Cache-Control"] = "no-store"
    if status == 401:
        response.headers["WWW-Authenticate"] = "Bearer"
    return response


def create_app(settings: Settings | None = None):
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app):
        yield
        if app.state.engine is not None:
            app.state.engine.dispose()

    app = FastAPI(
        title="Qadam Business API",
        version="0.8.0",
        lifespan=lifespan,
        description="Authenticated manual ledger and optional Gemini drafts. "
        "AI never writes money. Public catalog and private seller inquiries.",
        responses={
            status: {"model": schemas.ErrorResponse} for status in (401, 404, 409, 422, 503)
        },
    )
    app.state.engine = make_engine(settings) if settings.database_url else None
    app.state.ai = ProviderPlan(settings)
    app.state.assistant = Assistant(settings)
    app.state.photos = SupabasePhotoStore(settings)
    app.state.livestock_demo_mode = settings.livestock_demo_mode
    app.state.verifier = (
        TokenVerifier(settings)
        if any((settings.supabase_url, settings.jwt_issuer, settings.jwt_audience))
        else None
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
        expose_headers=["X-Request-ID"],
    )
    app.add_middleware(PhotoBodyLimit)

    @app.middleware("http")
    async def request_id(request: Request, call_next):
        request.state.request_id = uuid4()
        response = await call_next(request)
        response.headers["X-Request-ID"] = str(request.state.request_id)
        if private_response(request):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(APIError)
    async def api_error(request, exc):
        return error_response(request, exc.status, exc.code, exc.message, exc.fields)

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        response = error_response(
            request,
            exc.status_code,
            {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED", 413: "PHOTO_TOO_LARGE"}.get(
                exc.status_code, "HTTP_ERROR"
            ),
            str(exc.detail),
        )
        response.headers.update(exc.headers or {})
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        fields = {}
        code = "VALIDATION_ERROR"
        for error in exc.errors():
            name = ".".join(str(part) for part in error["loc"])
            kind = error["type"]
            if kind in {"INVALID_AMOUNT", "CUSTOMER_REQUIRED"}:
                code = kind
                name = "customer_id" if kind == "CUSTOMER_REQUIRED" else "received_minor"
            elif any(str(part).endswith("_minor") for part in error["loc"]):
                code = "INVALID_AMOUNT"
            fields.setdefault(name, []).append(kind)
        return error_response(request, 422, code, "Request validation failed", fields)

    @app.exception_handler(DBAPIError)
    async def database_error(request, exc):
        # No DSN, SQL, parameters or private customer data in HTTP errors.
        return error_response(
            request,
            503,
            "DATABASE_UNAVAILABLE",
            "Database unavailable; retry with the same idempotency key",
        )

    @app.exception_handler(Exception)
    async def unexpected_error(request, exc):
        return error_response(request, 500, "INTERNAL_ERROR", "Internal server error")

    @app.get("/health", response_model=schemas.HealthResponse, tags=["health"])
    @app.get("/api/v1/health", response_model=schemas.HealthResponse, tags=["health"])
    def health():
        return schemas.HealthResponse()

    app.include_router(router)
    app.include_router(research_router)
    app.include_router(draft_router)
    app.include_router(assistant_router)
    app.include_router(public_router)
    app.include_router(livestock_router)

    def openapi():
        if app.openapi_schema is None:
            schema = get_openapi(
                title=app.title, version=app.version, description=app.description, routes=app.routes
            )
            _, extra = models_json_schema(
                [(schemas.DraftResponse, "validation"), (schemas.InquiryCreate, "validation")],
                ref_template="#/components/schemas/{model}",
            )
            schema["components"]["schemas"].update(extra["$defs"])
            app.openapi_schema = schema
        return app.openapi_schema

    app.openapi = openapi
    return app


app = create_app()
