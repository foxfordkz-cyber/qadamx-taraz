from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.auth import current_user
from app.errors import APIError


def make_engine(settings):
    return create_engine(
        settings.postgres_url(),
        pool_pre_ping=True,
        connect_args={"connect_timeout": 5},
        isolation_level="READ COMMITTED",
    )


def session_for_request(request: Request, user: Annotated[UUID, Depends(current_user)]):
    yield from public_session(request)


def public_session(request: Request):
    engine = request.app.state.engine
    if engine is None:
        raise APIError(503, "DATABASE_UNAVAILABLE", "Database is not configured")
    # Endpoint writes explicitly commit before returning. Read-only requests roll back on close.
    with Session(engine, expire_on_commit=False) as session:
        yield session
