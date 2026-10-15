"""Explicit public projections; private inquiry data never enters public responses."""

from datetime import timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import schemas
from app.db import public_session
from app.errors import APIError
from app.models import Business, CatalogItem, Inquiry, Venue
from app.routers import Limit, User
from app.services.ledger import require_membership

router = APIRouter(prefix="/api/v1", tags=["catalog-inquiries"])
DB = Annotated[Session, Depends(public_session)]


def page(db, stmt, model, limit, cursor):
    if cursor:
        stmt = stmt.where(model.id > cursor)
    rows = list(db.scalars(stmt.order_by(model.id).limit(limit + 1)))
    return {
        "items": rows[:limit],
        "next_cursor": str(rows[limit - 1].id) if len(rows) > limit else None,
    }


@router.get("/venues", response_model=schemas.Page[schemas.VenueResponse])
def venues(db: DB, limit: Limit = 50, cursor: UUID | None = None):
    return page(db, select(Venue), Venue, limit, cursor)


@router.get("/businesses", response_model=schemas.Page[schemas.PublicBusiness])
def businesses(
    db: DB,
    venue_id: UUID | None = None,
    category: Annotated[str, Query(max_length=100)] = "",
    q: Annotated[str, Query(max_length=200)] = "",
    limit: Limit = 50,
    cursor: UUID | None = None,
):
    stmt = select(Business)
    if venue_id:
        stmt = stmt.where(Business.venue_id == venue_id)
    if category:
        stmt = stmt.where(Business.category == category)
    if q.strip():
        stmt = stmt.where(Business.name.icontains(q.strip(), autoescape=True))
    return page(db, stmt, Business, limit, cursor)


@router.get("/businesses/{slug}", response_model=schemas.ShopResponse)
def shop(slug: str, db: DB):
    business = db.scalar(select(Business).where(Business.slug == slug))
    if not business:
        raise APIError(404, "NOT_FOUND", "Business not found")
    catalog = db.scalars(
        select(CatalogItem).where(CatalogItem.business_id == business.id).order_by(CatalogItem.id)
    ).all()
    return schemas.ShopResponse(
        **schemas.PublicBusiness.model_validate(business).model_dump(),
        catalog=[schemas.CatalogResponse.model_validate(row) for row in catalog],
    )


@router.post(
    "/businesses/{id}/inquiries",
    response_model=schemas.InquiryReceipt,
    responses={429: {"model": schemas.ErrorResponse}},
)
def create_inquiry(id: UUID, payload: schemas.InquiryCreate, db: DB):
    # Same tenant lock order as ledger. Serializes retries and rate checks across workers.
    business = db.scalar(select(Business).where(Business.id == id).with_for_update())
    if not business:
        raise APIError(404, "NOT_FOUND", "Business not found")
    row = db.scalar(
        select(Inquiry).where(
            Inquiry.business_id == id, Inquiry.client_request_id == payload.client_request_id
        )
    )
    if row:
        if any(getattr(row, key) != value for key, value in payload.model_dump().items()):
            raise APIError(409, "IDEMPOTENCY_CONFLICT", "Request ID belongs to another payload")
    else:
        now = db.scalar(select(func.clock_timestamp()))
        count = db.scalar(
            select(func.count())
            .select_from(Inquiry)
            .where(Inquiry.business_id == id, Inquiry.created_at > now - timedelta(minutes=1))
        )
        if count >= 20:
            raise APIError(429, "RATE_LIMITED", "Business inquiry limit reached; retry later")
        row = Inquiry(business_id=id, **payload.model_dump())
        db.add(row)
        db.flush()
    receipt = schemas.InquiryReceipt.model_validate(row)
    db.commit()
    return receipt


@router.get("/businesses/{id}/inquiries", response_model=schemas.Page[schemas.InquiryResponse])
def inquiries(id: UUID, db: DB, user: User, limit: Limit = 50, cursor: UUID | None = None):
    require_membership(db, id, user)
    return page(db, select(Inquiry).where(Inquiry.business_id == id), Inquiry, limit, cursor)


@router.patch("/businesses/{id}/inquiries/{inquiry_id}", response_model=schemas.InquiryResponse)
def update_inquiry(id: UUID, inquiry_id: UUID, payload: schemas.InquiryUpdate, db: DB, user: User):
    require_membership(db, id, user)
    row = db.scalar(
        select(Inquiry).where(Inquiry.business_id == id, Inquiry.id == inquiry_id).with_for_update()
    )
    if not row:
        raise APIError(404, "NOT_FOUND", "Inquiry not found")
    row.status = payload.status
    db.flush()
    response = schemas.InquiryResponse.model_validate(row)
    db.commit()
    return response
