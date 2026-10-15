from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_MONEY = 10_000_000_000


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Credentials(StrictModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=False)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=10, max_length=128)

    @field_validator('email')
    @classmethod
    def email_format(cls, value):
        value = value.strip().lower()
        if value.count('@') != 1 or '.' not in value.split('@')[1] or any(c.isspace() for c in value):
            raise ValueError('Жарамды email енгізіңіз')
        return value

class Registration(Credentials):
    business_name: str = Field(min_length=2, max_length=120)

    @field_validator('business_name')
    @classmethod
    def business_format(cls, value):
        value = value.strip()
        if len(value)<2:
            raise ValueError('Дүкен атауын енгізіңіз')
        return value


class Customer(StrictModel):
    display_name: str = Field(min_length=1, max_length=120)
    note: str = Field(default='', max_length=200)


class Operation(StrictModel):
    kind: Literal['sale', 'repayment']
    draft_id: str | None = None
    customer_id: str | None = None
    sale_id: str | None = None
    description: str = Field(default='', max_length=500)
    total_minor: int | None = Field(default=None, strict=True, ge=1, le=MAX_MONEY)
    received_minor: int | None = Field(default=None, strict=True, ge=0, le=MAX_MONEY)
    amount_minor: int | None = Field(default=None, strict=True, ge=1, le=MAX_MONEY)


class Extraction(StrictModel):
    transcript: str = Field(max_length=10000)
    kind: Literal['sale','repayment','unknown']
    customer_query: str | None = Field(default=None, max_length=120)
    description: str = Field(default='', max_length=500)
    total_minor: int | None = Field(default=None, strict=True, ge=1, le=MAX_MONEY)
    received_minor: int | None = Field(default=None, strict=True, ge=0, le=MAX_MONEY)
    amount_minor: int | None = Field(default=None, strict=True, ge=1, le=MAX_MONEY)
    missing_fields: list[str] = Field(default_factory=list, max_length=10)
    questions: list[str] = Field(default_factory=list, max_length=10)
