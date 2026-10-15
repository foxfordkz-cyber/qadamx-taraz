from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: SecretStr | None = None
    supabase_url: str = ""
    jwt_issuer: str = ""
    jwt_audience: str = ""
    ai_api_key: SecretStr | None = None
    ai_model: str = ""
    allowed_origins: list[str] = []

    @field_validator("database_url", "ai_api_key", mode="before")
    @classmethod
    def blank_secret(cls, value):
        return None if value == "" else value

    @field_validator("allowed_origins")
    @classmethod
    def exact_origins(cls, values: list[str]) -> list[str]:
        from urllib.parse import urlsplit

        for value in values:
            url = urlsplit(value)
            if (
                url.scheme not in {"http", "https"}
                or not url.netloc
                or url.username
                or url.password
                or url.path
                or url.query
                or url.fragment
                or "*" in value
            ):
                raise ValueError("ALLOWED_ORIGINS must contain exact HTTP(S) origins without paths")
        return values

    def postgres_url(self):
        if self.database_url is None:
            raise ValueError("DATABASE_URL is required for database commands")
        url = make_url(self.database_url.get_secret_value())
        if url.drivername not in {"postgres", "postgresql", "postgresql+psycopg"}:
            raise ValueError("Only PostgreSQL with psycopg is supported")
        return url.set(drivername="postgresql+psycopg")
