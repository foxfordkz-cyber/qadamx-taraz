from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from pydantic.json_schema import models_json_schema
from starlette.exceptions import HTTPException

from app.config import Settings
from app.examples import EXAMPLES
from app.schemas import SCHEMA_MODELS, ErrorDetail, ErrorResponse, HealthResponse


def error_response(request: Request, status: int, code: str, message: str, fields=None):
    body = ErrorResponse(
        error=ErrorDetail(code=code, message=message, fields=fields or {}),
        request_id=request.state.request_id,
    )
    return JSONResponse(status_code=status, content=body.model_dump(mode="json"))


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    app = FastAPI(
        title="Qadam Business API",
        version="0.1.0",
        description=(
            "Local bootstrap. Only health is implemented. Components contain the first-stage "
            "frontend contracts; money, auth, AI and catalog routes are not implemented yet. "
            "Health checks the process only, not external services."
        ),
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_id(request: Request, call_next):
        request.state.request_id = uuid4()
        response = await call_next(request)
        response.headers["X-Request-ID"] = str(request.state.request_id)
        return response

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        codes = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}
        response = error_response(
            request, exc.status_code, codes.get(exc.status_code, "HTTP_ERROR"), str(exc.detail)
        )
        response.headers.update(exc.headers or {})
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        fields: dict[str, list[str]] = {}
        code = "VALIDATION_ERROR"
        for error in exc.errors():
            field = ".".join(str(part) for part in error["loc"])
            fields.setdefault(field, []).append(error["type"])
            if error["type"] in {"INVALID_AMOUNT", "CUSTOMER_REQUIRED"}:
                code = error["type"]
        return error_response(request, 422, code, "Request validation failed", fields)

    @app.exception_handler(Exception)
    async def internal_error(request: Request, exc: Exception):
        response = error_response(request, 500, "INTERNAL_ERROR", "Internal server error")
        response.headers["X-Request-ID"] = str(request.state.request_id)
        return response

    @app.get("/health", response_model=HealthResponse, tags=["health"])
    @app.get("/api/v1/health", response_model=HealthResponse, tags=["health"])
    def health() -> HealthResponse:
        return HealthResponse()

    def openapi():
        if app.openapi_schema is None:
            schema = get_openapi(
                title=app.title, version=app.version, description=app.description, routes=app.routes
            )
            _, contracts = models_json_schema(
                [(model, "validation") for model in SCHEMA_MODELS],
                ref_template="#/components/schemas/{model}",
            )
            schema.setdefault("components", {}).setdefault("schemas", {}).update(contracts["$defs"])
            for name, example in EXAMPLES.items():
                schema["components"]["schemas"][name]["examples"] = [example]
            schema["components"]["schemas"]["OperationCreate"] = {
                "oneOf": [
                    {"$ref": f"#/components/schemas/{name}"}
                    for name in ("SaleCreate", "RepaymentCreate")
                ],
                "discriminator": {
                    "propertyName": "kind",
                    "mapping": {
                        "sale": "#/components/schemas/SaleCreate",
                        "repayment": "#/components/schemas/RepaymentCreate",
                    },
                },
            }
            app.openapi_schema = schema
        return app.openapi_schema

    app.openapi = openapi
    return app


app = create_app()
