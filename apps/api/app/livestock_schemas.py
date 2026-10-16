from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, StrictBool, field_validator

from app.schemas import Contract, PositiveMoney

Species = Literal["cattle", "sheep", "goat", "horse", "camel"]
ListingStatus = Literal["active", "sold", "withdrawn"]
Locality = Annotated[str, Field(min_length=1, max_length=100)]


def normalize_locality(value: str) -> str:
    return " ".join(value.split())


class ListingWrite(Contract):
    species: Species
    quantity: Annotated[int, Field(strict=True, ge=1, le=10000)]
    price_per_head_minor: PositiveMoney
    locality: Locality
    age_months: Annotated[int, Field(strict=True, ge=0, le=600)] | None = None
    sex: Literal["male", "female", "unknown"] | None = None
    description: Annotated[str, Field(max_length=2000)] | None = None
    photo_ids: Annotated[list[UUID], Field(max_length=3)] = []
    contact: Annotated[str, Field(min_length=1, max_length=200)]
    contact_consent: StrictBool

    @field_validator("contact_consent")
    @classmethod
    def consent(cls, value):
        if not value:
            raise ValueError("Explicit publication consent required")
        return value

    @field_validator("locality")
    @classmethod
    def location(cls, value):
        return normalize_locality(value)

    @field_validator("photo_ids")
    @classmethod
    def unique_photos(cls, value):
        if len(set(value)) != len(value):
            raise ValueError("Unique photo IDs required")
        return value


class PhotoReceipt(Contract):
    id: UUID


class ListingPhoto(PhotoReceipt):
    url: str


class PublicListing(Contract):
    id: UUID
    species: Species
    quantity: int
    price_per_head_minor: PositiveMoney
    locality: str
    age_months: int | None
    sex: Literal["male", "female", "unknown"] | None
    description: str | None
    contact: str
    currency: Literal["KZT"] = "KZT"
    photos: list[ListingPhoto]
    confirmed_on: date
    is_demo: bool


class OwnerListing(PublicListing):
    status: ListingStatus
    available_today: bool
    created_at: AwareDatetime
    updated_at: AwareDatetime


class ListingAction(Contract):
    action: Literal["confirm_today", "sell", "withdraw"]


class PriceStats(Contract):
    species: Species
    locality: str
    period_from: date
    period_to: date
    timezone: Literal["Asia/Almaty"] = "Asia/Almaty"
    currency: Literal["KZT"] = "KZT"
    unit: Literal["head"] = "head"
    sample_count: int
    median_price_per_head_minor: int | None
    status: Literal["available", "insufficient_data"]
    source: Literal["asking_prices"] = "asking_prices"
