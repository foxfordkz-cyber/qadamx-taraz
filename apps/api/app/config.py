from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    database_url: SecretStr | None = None
    supabase_url: str = ""
    jwt_issuer: str = ""
    jwt_audience: str = ""
    allowed_origins: list[str] = []
    demo_owner_a_sub: str = ""
    demo_owner_b_sub: str = ""
    demo_owner_a_token: SecretStr | None = None
    demo_owner_b_token: SecretStr | None = None
    ai_api_key: SecretStr | None = None
    ai_provider: Literal["gemini", "openai"] = "gemini"
    openai_api_key: SecretStr | None = None
    openai_model: str = Field(default="", pattern=r"^(?:gpt-[a-zA-Z0-9._-]+)?$")
    openai_transcription_model: str = Field(default="", pattern=r"^(?:gpt-[a-zA-Z0-9._-]+)?$")
    ai_fallback_openai: bool = False
    ai_primary_timeout_seconds: float = Field(default=8, gt=0, le=15)
    storage_service_key: SecretStr | None = None
    livestock_demo_mode: bool = True
    storage_bucket: str = Field(default="", pattern=r"^(?:[a-z0-9][a-z0-9-]{0,62})?$")
    ai_model: str = Field(default="", pattern=r"^(?:gemini-[a-zA-Z0-9._-]+)?$")

    @field_validator(
        "database_url",
        "demo_owner_a_token",
        "demo_owner_b_token",
        "ai_api_key",
        "openai_api_key",
        "storage_service_key",
        mode="before",
    )
    @classmethod
    def blank_secret(cls, value):
        return None if value == "" else value

    @field_validator("allowed_origins")
    @classmethod
    def exact_origins(cls, values):
        for value in values:
            url = urlsplit(value)
            if (
                url.scheme not in {"http", "https"}
                or not url.netloc
                or url.path
                or url.query
                or url.fragment
                or url.username
                or "*" in value
            ):
                raise ValueError("Use exact HTTP(S) origins without paths")
        return values

    def postgres_url(self):
        if not self.database_url:
            raise ValueError("DATABASE_URL is required")
        url = make_url(self.database_url.get_secret_value())
        if url.drivername not in {"postgres", "postgresql", "postgresql+psycopg"}:
            raise ValueError("PostgreSQL with psycopg is required")
        return url.set(drivername="postgresql+psycopg")

    def jwks_url(self):
        url = urlsplit(self.supabase_url)
        if (
            url.scheme != "https"
            or not url.netloc
            or url.path not in {"", "/"}
            or url.username
            or url.query
            or url.fragment
        ):
            raise ValueError("SUPABASE_URL must be an HTTPS origin")
        expected = self.supabase_url.rstrip("/") + "/auth/v1"
        if self.jwt_issuer != expected or not self.jwt_audience:
            raise ValueError("Set JWT_ISSUER to SUPABASE_URL/auth/v1 and JWT_AUDIENCE")
        return expected + "/.well-known/jwks.json"
