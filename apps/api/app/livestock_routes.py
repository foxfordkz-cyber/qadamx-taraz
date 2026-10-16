"""JWT-owned livestock catalog. Independent of memberships and the monetary ledger."""

import hashlib
import json
from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated
from uuid import UUID, uuid5
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, File, Header, Query, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import livestock_schemas as s
from app.db import public_session
from app.errors import APIError
from app.models import LivestockListing as Listing
from app.models import LivestockPhoto as Photo
from app.models import LivestockRequest as SavedRequest
from app.routers import Limit, User
from app.schemas import ErrorResponse, Page
from app.services.photos import MAX_UPLOAD, clean_image

router = APIRouter(prefix="/api/v1/livestock", tags=["livestock"])
DB = Annotated[Session, Depends(public_session)]
Key = Annotated[UUID, Header(alias="Idempotency-Key")]
PlaceQuery = Annotated[str, Query(min_length=1, max_length=100, pattern=r"\S")]
ZONE = ZoneInfo("Asia/Almaty")


def server_now(db):
    return db.scalar(select(func.clock_timestamp()))


def today(db):
    return server_now(db).astimezone(ZONE).date()


def visible(day):
    return (Listing.status == "active", Listing.confirmed_on == day)


def projection(db, row, day, owner=False):
    fields = {
        key: getattr(row, key)
        for key in (
            "id",
            "species",
            "quantity",
            "price_per_head_minor",
            "locality",
            "age_months",
            "sex",
            "description",
            "contact",
            "confirmed_on",
            "is_demo",
        )
    }
    photos = db.scalars(select(Photo).where(Photo.listing_id == row.id).order_by(Photo.position))
    fields["photos"] = [
        s.ListingPhoto(id=p.id, url=f"/api/v1/livestock/listings/{row.id}/photos/{p.id}")
        for p in photos
    ]
    if owner:
        return s.OwnerListing(
            **fields,
            status=row.status,
            available_today=row.status == "active" and row.confirmed_on == day,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
    return s.PublicListing(**fields)


def listing_page(db, stmt, limit, cursor, day, owner=False):
    if cursor:
        stmt = stmt.where(Listing.id > cursor)
    rows = list(db.scalars(stmt.order_by(Listing.id).limit(limit + 1)))
    return dict(
        items=[projection(db, row, day, owner) for row in rows[:limit]],
        next_cursor=str(rows[limit - 1].id) if len(rows) > limit else None,
    )


def filtered(stmt, species, locality):
    if species:
        stmt = stmt.where(Listing.species == species)
    if locality:
        stmt = stmt.where(Listing.locality_key == s.normalize_locality(locality).casefold())
    return stmt


def owned(db, id, user):
    row = db.scalar(select(Listing).where(Listing.id == id, Listing.owner_id == user))
    if not row:
        raise APIError(404, "NOT_FOUND", "Listing not found")
    return row


def start_write(db, user, key, action, body):
    # Across API workers, even a seller with no existing row is serialized. Hash collisions
    # only cause unnecessary waiting; authorization still uses full UUID equality.
    lock = int.from_bytes(hashlib.sha256(user.bytes).digest()[:8], "big", signed=True)
    db.execute(select(func.pg_advisory_xact_lock(lock)))
    fingerprint = hashlib.sha256(
        json.dumps(
            [action, body],
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        ).encode()
    ).hexdigest()
    prior = db.get(SavedRequest, (user, key))
    if prior and prior.fingerprint != fingerprint:
        raise APIError(409, "IDEMPOTENCY_CONFLICT", "Key belongs to another request")
    return fingerprint, prior.response_json if prior else None


def finish_write(db, user, key, fingerprint, response):
    data = response.model_dump(mode="json")
    db.add(SavedRequest(owner_id=user, key=key, fingerprint=fingerprint, response_json=data))
    db.commit()  # Mutation and replay snapshot commit atomically before HTTP success.
    return data


def attach_photos(db, row, ids, user):
    photos = list(db.scalars(select(Photo).where(Photo.id.in_(ids), Photo.owner_id == user)))
    if len(photos) != len(ids):
        raise APIError(422, "INVALID_PHOTO", "Use your uploaded photo IDs")
    if any(p.listing_id is not None and p.listing_id != row.id for p in photos):
        raise APIError(409, "PHOTO_IN_USE", "Photo belongs to another listing")
    # Clear positions first to permit safe reordering under the unique slot constraint.
    for old in db.scalars(select(Photo).where(Photo.listing_id == row.id)):
        old.listing_id = old.position = None
    db.flush()
    for photo in photos:
        photo.listing_id, photo.position = row.id, ids.index(photo.id)
    db.flush()


@router.get("/listings", response_model=Page[s.PublicListing])
def feed(
    db: DB,
    species: s.Species | None = None,
    locality: PlaceQuery | None = None,
    limit: Limit = 20,
    cursor: UUID | None = None,
):
    day = today(db)
    stmt = filtered(select(Listing).where(*visible(day)), species, locality)
    return listing_page(db, stmt, limit, cursor, day)


@router.get("/me/listings", response_model=Page[s.OwnerListing])
def mine(
    db: DB,
    user: User,
    status: s.ListingStatus | None = None,
    species: s.Species | None = None,
    locality: PlaceQuery | None = None,
    limit: Limit = 20,
    cursor: UUID | None = None,
):
    stmt = filtered(select(Listing).where(Listing.owner_id == user), species, locality)
    if status:
        stmt = stmt.where(Listing.status == status)
    return listing_page(db, stmt, limit, cursor, today(db), owner=True)


@router.get("/listings/{id}", response_model=s.PublicListing)
def detail(id: UUID, db: DB):
    day = today(db)
    row = db.scalar(select(Listing).where(Listing.id == id, *visible(day)))
    if not row:
        raise APIError(404, "NOT_FOUND", "Listing not found")
    return projection(db, row, day)


@router.post("/listings", response_model=s.OwnerListing)
def publish(payload: s.ListingWrite, db: DB, user: User, key: Key, request: Request):
    fingerprint, replay = start_write(db, user, key, "publish", payload.model_dump(mode="json"))
    if replay:
        return replay
    now = server_now(db)
    row = Listing(
        **payload.model_dump(exclude={"photo_ids"}),
        owner_id=user,
        locality_key=payload.locality.casefold(),
        created_at=now,
        updated_at=now,
        confirmed_on=now.astimezone(ZONE).date(),
        is_demo=request.app.state.livestock_demo_mode,
    )
    db.add(row)
    db.flush()
    attach_photos(db, row, payload.photo_ids, user)
    return finish_write(db, user, key, fingerprint, projection(db, row, today(db), owner=True))


@router.put("/listings/{id}", response_model=s.OwnerListing)
def edit(id: UUID, payload: s.ListingWrite, db: DB, user: User, key: Key):
    fingerprint, replay = start_write(db, user, key, f"edit/{id}", payload.model_dump(mode="json"))
    row = owned(db, id, user)
    if replay:
        return replay
    for field, value in payload.model_dump(exclude={"photo_ids"}).items():
        setattr(row, field, value)
    row.locality_key = payload.locality.casefold()
    row.updated_at = server_now(db)
    attach_photos(db, row, payload.photo_ids, user)
    return finish_write(db, user, key, fingerprint, projection(db, row, today(db), owner=True))


@router.post("/listings/{id}/actions", response_model=s.OwnerListing)
def action(id: UUID, payload: s.ListingAction, db: DB, user: User, key: Key):
    fingerprint, replay = start_write(db, user, key, f"action/{id}", payload.model_dump())
    row = owned(db, id, user)
    if replay:
        return replay
    target = {"sell": "sold", "withdraw": "withdrawn", "confirm_today": "active"}[payload.action]
    if row.status != "active" and row.status != target:
        raise APIError(409, "INVALID_STATE", "Sold or withdrawn listings cannot be reopened")
    row.status = target
    row.updated_at = server_now(db)
    if payload.action == "confirm_today":
        row.confirmed_on = row.updated_at.astimezone(ZONE).date()
    db.flush()
    return finish_write(db, user, key, fingerprint, projection(db, row, today(db), owner=True))


@router.get("/prices", response_model=s.PriceStats)
def prices(db: DB, species: s.Species, locality: PlaceQuery):
    day = today(db)
    stmt = select(
        func.count(Listing.id),
        func.percentile_cont(0.5).within_group(Listing.price_per_head_minor),
    ).where(*visible(day), Listing.is_demo.is_(False))
    count, median = db.execute(filtered(stmt, species, locality)).one()
    return s.PriceStats(
        species=species,
        locality=s.normalize_locality(locality),
        period_from=day,
        period_to=day,
        sample_count=count,
        median_price_per_head_minor=(
            int(Decimal(str(median)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
            if count >= 5
            else None
        ),
        status="available" if count >= 5 else "insufficient_data",
    )


@router.post(
    "/photos",
    response_model=s.PhotoReceipt,
    responses={code: {"model": ErrorResponse} for code in (413, 429)},
)
def upload(db: DB, user: User, key: Key, request: Request, file: Annotated[UploadFile, File()]):
    try:
        raw = file.file.read(MAX_UPLOAD + 1)
    finally:
        file.file.close()
    # Content hash, not filename/MIME/multipart boundary, determines retry equivalence.
    fingerprint, replay = start_write(db, user, key, "photo", hashlib.sha256(raw).hexdigest())
    if replay:
        return replay
    data = clean_image(raw)
    count = db.scalar(
        select(func.count())
        .select_from(Photo)
        .where(
            Photo.owner_id == user,
            Photo.listing_id.is_(None),
        )
    )
    if count >= 30:
        raise APIError(429, "RATE_LIMITED", "At most 30 unattached photos per owner")
    id = uuid5(user, f"{key}/{fingerprint}")
    object_key = f"{user}/{id}.jpg"
    request.app.state.photos.put(object_key, data)
    # A crash before commit may leave a PRIVATE orphan; same retry overwrites only its
    # deterministic object with identical clean bytes. It is never publicly addressable.
    db.add(Photo(id=id, owner_id=user, object_key=object_key, created_at=server_now(db)))
    return finish_write(db, user, key, fingerprint, s.PhotoReceipt(id=id))


def photo_response(request, photo):
    if not photo:
        raise APIError(404, "NOT_FOUND", "Photo not found")
    return Response(
        content=request.app.state.photos.get(photo.object_key),
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )


IMAGE_RESPONSE = {
    200: {"content": {"image/jpeg": {"schema": {"type": "string", "format": "binary"}}}}
}


@router.get("/listings/{id}/photos/{photo_id}", response_class=Response, responses=IMAGE_RESPONSE)
def public_photo(id: UUID, photo_id: UUID, db: DB, request: Request):
    photo = db.scalar(
        select(Photo)
        .join(Listing, Photo.listing_id == Listing.id)
        .where(
            Photo.id == photo_id,
            Listing.id == id,
            *visible(today(db)),
        )
    )
    return photo_response(request, photo)


@router.get("/me/photos/{photo_id}", response_class=Response, responses=IMAGE_RESPONSE)
def private_photo(photo_id: UUID, db: DB, user: User, request: Request):
    return photo_response(
        request,
        db.scalar(
            select(Photo).where(
                Photo.id == photo_id,
                Photo.owner_id == user,
            )
        ),
    )
