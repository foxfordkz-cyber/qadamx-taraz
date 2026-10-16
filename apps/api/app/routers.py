from datetime import date as Date
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import schemas
from app.analytics_schemas import AnalyticsResponse
from app.auth import current_user
from app.db import session_for_request
from app.errors import APIError
from app.models import Business, Membership
from app.services import analytics, customers, ledger

router = APIRouter(prefix="/api/v1")
DB = Annotated[Session, Depends(session_for_request)]
User = Annotated[UUID, Depends(current_user)]
Key = Annotated[
    str, Header(alias="Idempotency-Key", min_length=1, max_length=200, pattern=r"^[!-~]+$")
]
OptionalKey = Annotated[
    str | None,
    Header(alias="Idempotency-Key", min_length=1, max_length=200, pattern=r"^[!-~]+$"),
]
Limit = Annotated[int, Query(ge=1, le=100)]


@router.get("/me", response_model=schemas.MeResponse, tags=["auth"])
def me(db: DB, user: User):
    businesses = db.scalars(
        select(Business)
        .join(Membership, Membership.business_id == Business.id)
        .where(Membership.user_id == user, Membership.role == "owner")
        .order_by(Business.id)
    ).all()
    return schemas.MeResponse(
        id=user, businesses=[schemas.BusinessMembership.model_validate(row) for row in businesses]
    )


@router.get(
    "/businesses/{id}/customers",
    response_model=schemas.Page[schemas.CustomerResponse],
    tags=["customers"],
)
def get_customers(
    id: UUID,
    db: DB,
    user: User,
    q: Annotated[str, Query(max_length=200)] = "",
    limit: Limit = 50,
    cursor: UUID | None = None,
):
    ledger.require_membership(db, id, user)
    return ledger.customers(db, id, q, limit, cursor)


@router.post(
    "/businesses/{id}/customers",
    response_model=schemas.CustomerResponse,
    status_code=201,
    tags=["customers"],
    description="Optional Idempotency-Key scopes a durable creation to this user and business. "
    "Replay returns the original 201 snapshot; changed validated body returns 409. "
    "Without the key, each request creates a new customer (legacy behavior).",
)
def create_customer(
    id: UUID, payload: schemas.CustomerCreate, db: DB, user: User, key: OptionalKey = None
):
    ledger.require_membership(db, id, user)
    result = customers.create(db, id, user, payload, key)
    db.commit()
    return result


@router.get(
    "/businesses/{id}/customer-creation-result",
    response_model=schemas.CustomerCreationResult,
    tags=["customers"],
    description="Recover this user's committed customer creation using Idempotency-Key. "
    "not_observed does not rule out an in-flight or delayed request. No automatic expiry.",
)
def get_customer_creation_result(id: UUID, db: DB, user: User, key: Key):
    ledger.require_membership(db, id, user)
    return customers.result(db, id, user, key)


@router.post(
    "/businesses/{id}/operations", response_model=schemas.OperationResponse, tags=["ledger"]
)
def create_operation(id: UUID, payload: schemas.OperationCreate, db: DB, user: User, key: Key):
    ledger.require_membership(db, id, user)
    result = ledger.write_operation(db, id, user, key, payload)
    db.commit()  # No HTTP success until both journal + idempotency record are committed.
    return result


@router.post(
    "/businesses/{id}/operations/{operation_id}/reverse",
    response_model=schemas.OperationResponse,
    tags=["ledger"],
)
def reverse_operation(
    id: UUID, operation_id: UUID, payload: schemas.ReverseCreate, db: DB, user: User, key: Key
):
    ledger.require_membership(db, id, user)
    result = ledger.write_operation(db, id, user, key, payload, reverse_id=operation_id)
    db.commit()
    return result


@router.get(
    "/businesses/{id}/operations",
    response_model=schemas.Page[schemas.Operation] | schemas.Page[schemas.OpenSale],
    tags=["ledger"],
)
def get_operations(
    id: UUID,
    db: DB,
    user: User,
    date: Date | None = None,
    customer_id: UUID | None = None,
    outstanding_only: bool = False,
    limit: Limit = 50,
    cursor: UUID | None = None,
):
    ledger.require_membership(db, id, user)
    return ledger.history(db, id, date, customer_id, outstanding_only, limit, cursor)


@router.get("/businesses/{id}/summary", response_model=schemas.SummaryResponse, tags=["ledger"])
def get_summary(id: UUID, db: DB, user: User, date: Date | None = None):
    ledger.require_membership(db, id, user)
    return ledger.summary(db, id, date or datetime.now(ledger.LOCAL_TZ).date())


@router.get("/businesses/{id}/analytics", response_model=AnalyticsResponse, tags=["analytics"])
def get_analytics(
    id: UUID, db: DB, user: User, response: Response, days: Annotated[int, Query(enum=[7, 30])] = 7
):
    if days not in (7, 30):
        raise APIError(422, "VALIDATION_ERROR", "days must be 7 or 30")
    ledger.require_membership(db, id, user)
    response.headers["Cache-Control"] = "no-store"
    return analytics.read(db, id, days)
