import json

import pytest
from pydantic import TypeAdapter, ValidationError

from app.examples import EXAMPLES, model_for_example
from app.export_contracts import OUTPUT, artifacts
from app.schemas import (
    MAX_OPERATION_MINOR,
    DraftResponse,
    InquiryCreate,
    OperationCreate,
    RepaymentCreate,
    SaleCreate,
    SummaryResponse,
)


@pytest.mark.parametrize("name", list(EXAMPLES))
def test_examples_validate_as_json(name):
    model_for_example(name).model_validate_json(json.dumps(EXAMPLES[name]))


@pytest.mark.parametrize("amount", [0, -1, 1.5, 100.0, "300000", True, MAX_OPERATION_MINOR + 1])
def test_sale_rejects_invalid_money(amount):
    with pytest.raises(ValidationError):
        SaleCreate.model_validate({**EXAMPLES["SaleCreate"], "total_minor": amount})


@pytest.mark.parametrize("amount", [0, -1, 0.5, 100.0, "50000", False, MAX_OPERATION_MINOR + 1])
def test_repayment_rejects_invalid_money(amount):
    with pytest.raises(ValidationError):
        RepaymentCreate.model_validate({**EXAMPLES["RepaymentCreate"], "amount_minor": amount})


def test_sale_requires_customer_only_for_debt():
    with pytest.raises(ValidationError, match="CUSTOMER_REQUIRED"):
        SaleCreate.model_validate({**EXAMPLES["SaleCreate"], "customer_id": None})
    SaleCreate.model_validate(
        {**EXAMPLES["SaleCreate"], "customer_id": None, "received_minor": 300000}
    )
    SaleCreate.model_validate({**EXAMPLES["SaleCreate"], "received_minor": 0})


@pytest.mark.parametrize("amount", [-1, True, "100000", 0.1, 300001])
def test_sale_rejects_invalid_receipt(amount):
    with pytest.raises(ValidationError):
        SaleCreate.model_validate({**EXAMPLES["SaleCreate"], "received_minor": amount})


@pytest.mark.parametrize(
    "field,value",
    [
        ("sale_balance_minor", 0),
        ("created_at", "2026-10-15T10:00:00Z"),
        ("customer_id", "customer-uuid"),
        ("kind", "reversal"),
    ],
)
def test_input_rejects_server_fields_and_invalid_ids(field, value):
    with pytest.raises(ValidationError):
        SaleCreate.model_validate({**EXAMPLES["SaleCreate"], field: value})


def test_operation_union_selects_by_kind():
    adapter = TypeAdapter(OperationCreate)
    assert isinstance(adapter.validate_python(EXAMPLES["SaleCreate"]), SaleCreate)
    assert isinstance(adapter.validate_python(EXAMPLES["RepaymentCreate"]), RepaymentCreate)
    with pytest.raises(ValidationError):
        adapter.validate_python({**EXAMPLES["SaleCreate"], "kind": "reversal"})


def test_draft_can_request_clarification_but_needs_timezone():
    draft = {
        **EXAMPLES["DraftResponse"],
        "kind": "unknown",
        "total_minor": None,
        "received_minor": None,
        "missing_fields": ["kind"],
        "questions": ["Что записать?"],
    }
    DraftResponse.model_validate(draft)
    with pytest.raises(ValidationError):
        DraftResponse.model_validate({**draft, "expires_at": "2026-10-15T10:30:00"})


def test_summary_supports_negative_reversals_but_not_negative_debt():
    SummaryResponse.model_validate(
        {**EXAMPLES["SummaryResponse"], "sales_minor": -300000, "receipts_minor": -100000}
    )
    with pytest.raises(ValidationError):
        SummaryResponse.model_validate({**EXAMPLES["SummaryResponse"], "outstanding_minor": -1})


@pytest.mark.parametrize(
    "field,value", [("visitor_name", "  "), ("contact", ""), ("message", "x" * 2001)]
)
def test_inquiry_limits(field, value):
    with pytest.raises(ValidationError):
        InquiryCreate.model_validate({**EXAMPLES["InquiryCreate"], field: value})


def test_export_is_current():
    for name, content in artifacts().items():
        assert (OUTPUT / name).read_text(encoding="utf-8") == content
