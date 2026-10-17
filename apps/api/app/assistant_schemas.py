from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field

from app.schemas import Contract

FactKey = Literal[
    "sales",
    "sales_previous",
    "sales_change",
    "receipts",
    "outstanding",
    "debtors",
    "sales_count",
    "average_ticket",
    "today_sales",
    "today_receipts",
    "debtor",
]
ActionKind = Literal["open_debts", "new_sale", "open_history", "open_analytics", "reminder_draft"]


class AssistantRequest(Contract):
    question: Annotated[str, Field(min_length=1, max_length=500)]
    locale: Literal["ru", "kk"] = "ru"
    days: Literal[7, 30] = 7


class AssistantFact(Contract):
    """A server-calculated value. The model may cite it but never produces it."""

    key: FactKey
    label: Annotated[str, Field(max_length=200)]
    value_minor: int | None = None
    count: Annotated[int, Field(ge=0)] | None = None
    customer_id: UUID | None = None


class AssistantAction(Contract):
    kind: ActionKind
    customer_id: UUID | None = None
    text: Annotated[str, Field(max_length=600)] | None = None


class AssistantResponse(Contract):
    business_id: UUID
    days: Literal[7, 30]
    locale: Literal["ru", "kk"]
    timezone: Literal["Asia/Almaty"] = "Asia/Almaty"
    currency: Literal["KZT"] = "KZT"
    as_of: AwareDatetime
    answer: Annotated[str, Field(min_length=1, max_length=1500)]
    facts: Annotated[list[AssistantFact], Field(max_length=20)]
    actions: Annotated[list[AssistantAction], Field(max_length=3)]
    source: Literal["ai", "fallback"]
