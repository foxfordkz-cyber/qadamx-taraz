from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field

from app.schemas import Contract

Count = Annotated[int, Field(strict=True, ge=0)]
Amount = Annotated[int, Field(strict=True, ge=0)]
SignedAmount = Annotated[int, Field(strict=True)]


class AnalyticsCards(Contract):
    sales_minor: Amount
    receipts_minor: SignedAmount
    sales_count: Count
    average_ticket_minor: Amount | None
    outstanding_minor: Amount
    debtors_count: Count


class AnalyticsDay(Contract):
    date: date
    sales_minor: Amount
    receipts_minor: SignedAmount
    sales_count: Count
    is_partial: bool


class AnalyticsHour(Contract):
    hour: Annotated[int, Field(strict=True, ge=0, le=23)]
    sales_count: Count


class AnalyticsResponse(Contract):
    business_id: UUID
    days: Literal[7, 30]
    timezone: Literal["Asia/Almaty"] = "Asia/Almaty"
    currency: Literal["KZT"] = "KZT"
    as_of: AwareDatetime
    period_from: date
    period_to: date
    today_incomplete: Literal[True] = True
    cards: AnalyticsCards
    daily: Annotated[list[AnalyticsDay], Field(min_length=7, max_length=30)]
    hourly: Annotated[list[AnalyticsHour], Field(min_length=24, max_length=24)]
