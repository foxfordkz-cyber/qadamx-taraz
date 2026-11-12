"""Read-only business views; money is derived from the existing signed journal."""

from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field

from app.schemas import Balance, Contract, OpenSale, Operation, SignedMoney


class AgedOpenSale(OpenSale):
    age_days: Annotated[int, Field(strict=True, ge=0)]


class DebtAge(Contract):
    bucket: Literal["0_7", "8_30", "31_plus"]
    balance_minor: Balance
    sales_count: Annotated[int, Field(strict=True, ge=0)]


class BusinessReport(Contract):
    business_id: UUID
    customer_id: UUID | None
    date_from: date | None
    date_to: date | None
    timezone: Literal["Asia/Almaty"] = "Asia/Almaty"
    currency: Literal["KZT"] = "KZT"
    as_of: AwareDatetime
    sales_minor: SignedMoney
    receipts_minor: SignedMoney
    outstanding_minor: Balance
    opening_balance_minor: Balance | None
    closing_balance_minor: Balance | None
    operation_count: Annotated[int, Field(strict=True, ge=0)]
    last_operation: Operation | None
    debt_aging: list[DebtAge]
