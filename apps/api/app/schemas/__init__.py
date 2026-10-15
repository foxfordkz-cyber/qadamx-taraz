from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator
from pydantic_core import PydanticCustomError

MAX_OPERATION_MINOR = 10_000_000_000
PositiveMoney = Annotated[int, Field(strict=True, gt=0, le=MAX_OPERATION_MINOR)]
NonnegativeMoney = Annotated[int, Field(strict=True, ge=0, le=MAX_OPERATION_MINOR)]
Balance = Annotated[int, Field(strict=True, ge=0)]
SignedMoney = Annotated[int, Field(strict=True)]
Description = Annotated[str, Field(max_length=1000)]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, from_attributes=True)


class SaleCreate(Contract):
    kind: Literal["sale"]
    draft_id: UUID | None = None
    customer_id: UUID | None = None
    description: Description
    total_minor: PositiveMoney
    received_minor: NonnegativeMoney

    @model_validator(mode="after")
    def validate_sale(self):
        if self.received_minor > self.total_minor:
            raise PydanticCustomError("INVALID_AMOUNT", "Received amount exceeds sale total")
        if self.received_minor < self.total_minor and self.customer_id is None:
            raise PydanticCustomError("CUSTOMER_REQUIRED", "A credit sale requires a customer")
        return self


class RepaymentCreate(Contract):
    kind: Literal["repayment"]
    draft_id: UUID | None = None
    sale_id: UUID
    amount_minor: PositiveMoney
    description: Description


OperationCreate = Annotated[SaleCreate | RepaymentCreate, Field(discriminator="kind")]


class ReverseCreate(Contract):
    description: Annotated[str, Field(min_length=1, max_length=1000)]


class CustomerCreate(Contract):
    display_name: Annotated[str, Field(min_length=1, max_length=200)]
    note: Annotated[str, Field(max_length=2000)] = ""
    contact: Annotated[str, Field(max_length=200)] | None = None


class CustomerResponse(CustomerCreate):
    id: UUID
    business_id: UUID
    balance_minor: Balance


class CustomerCandidate(Contract):
    id: UUID
    display_name: str


class Operation(Contract):
    id: UUID
    business_id: UUID
    customer_id: UUID | None
    sale_id: UUID
    kind: Literal["sale", "repayment", "reversal"]
    sales_delta_minor: SignedMoney
    receipts_delta_minor: SignedMoney
    reversal_of: UUID | None
    description: str
    created_at: AwareDatetime
    created_by: UUID


class OpenSale(Contract):
    id: UUID
    customer_id: UUID | None
    description: str
    total_minor: PositiveMoney
    received_minor: NonnegativeMoney
    balance_minor: Balance
    created_at: AwareDatetime


class DraftResponse(Contract):
    id: UUID
    transcript: str
    kind: Literal["sale", "repayment", "unknown"]
    customer_query: str | None
    customer_candidates: list[CustomerCandidate]
    sale_candidates: list[OpenSale]
    description: Description | None
    total_minor: PositiveMoney | None
    received_minor: NonnegativeMoney | None
    amount_minor: PositiveMoney | None
    missing_fields: list[str]
    questions: list[str]
    expires_at: AwareDatetime


class OperationResponse(Contract):
    operation: Operation
    sale_balance_minor: Balance
    customer_balance_minor: Balance | None
    created_at: AwareDatetime


class SummaryResponse(Contract):
    date: date
    timezone: Literal["Asia/Almaty"] = "Asia/Almaty"
    currency: Literal["KZT"] = "KZT"
    sales_minor: SignedMoney
    receipts_minor: SignedMoney
    outstanding_minor: Balance
    new_inquiries_count: Annotated[int, Field(strict=True, ge=0)]


class InquiryCreate(Contract):
    client_request_id: UUID
    visitor_name: Annotated[str, Field(min_length=1, max_length=100)]
    contact: Annotated[str, Field(min_length=1, max_length=200)]
    message: Annotated[str, Field(min_length=1, max_length=2000)]


class VenueResponse(Contract):
    id: UUID
    slug: str
    name: str
    address_label: str
    geometry_status: str
    is_demo: bool


class PublicBusiness(Contract):
    id: UUID
    venue_id: UUID
    slug: str
    name: str
    category: str
    description: str
    is_demo: bool


class CatalogResponse(Contract):
    id: UUID
    business_id: UUID
    name: str
    price_minor: NonnegativeMoney | None
    available: bool
    is_demo: bool


class ShopResponse(PublicBusiness):
    catalog: list[CatalogResponse]


class InquiryReceipt(Contract):
    id: UUID
    created_at: AwareDatetime


class InquiryResponse(InquiryReceipt):
    business_id: UUID
    visitor_name: str
    contact: str
    message: str
    status: Literal["new", "in_progress", "closed"]


class InquiryUpdate(Contract):
    status: Literal["new", "in_progress", "closed"]


class BusinessMembership(Contract):
    id: UUID
    slug: str
    name: str
    role: Literal["owner"] = "owner"


class MeResponse(Contract):
    id: UUID
    businesses: list[BusinessMembership]


class Page[T](Contract):
    items: list[T]
    next_cursor: str | None = None


class ErrorDetail(Contract):
    code: str
    message: str
    fields: dict[str, list[str]] = Field(default_factory=dict)


class ErrorResponse(Contract):
    error: ErrorDetail
    request_id: UUID


class HealthResponse(Contract):
    status: Literal["ok"] = "ok"
    service: Literal["qadam-api"] = "qadam-api"
    stage: Literal["manual-ledger"] = "manual-ledger"
