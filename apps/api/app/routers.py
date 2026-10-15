from datetime import date as Date
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import schemas
from app.auth import current_user
from app.db import session_for_request
from app.models import Business, Customer, Membership
from app.services import ledger

router = APIRouter(prefix="/api/v1")
DB = Annotated[Session, Depends(session_for_request)]
User = Annotated[UUID, Depends(current_user)]
Key = Annotated[
    str, Header(alias="Idempotency-Key", min_length=1, max_length=200, pattern=r"^[!-~]+$")
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
)
def create_customer(id: UUID, payload: schemas.CustomerCreate, db: DB, user: User):
    ledger.require_membership(db, id, user)
    row = Customer(business_id=id, **payload.model_dump())
    db.add(row)
    db.flush()
    result = schemas.CustomerResponse(
        id=row.id, business_id=id, balance_minor=0, **payload.model_dump()
    )
    db.commit()
    return result


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
