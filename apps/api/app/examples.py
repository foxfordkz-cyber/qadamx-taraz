"""Synthetic frontend examples, never real users, debts or AI results."""

from app import schemas
from app.seed import demo_id

BUSINESS = str(demo_id("mart-demo-clothes"))
CUSTOMER = str(demo_id("mart-demo-clothes-customer"))
SALE = "30000000-0000-4000-8000-000000000001"
PAYMENT = "30000000-0000-4000-8000-000000000002"
OWNER = "50000000-0000-4000-8000-000000000001"
TIME = "2026-10-15T10:00:00Z"
SALE_ROW = dict(
    id=SALE,
    business_id=BUSINESS,
    customer_id=CUSTOMER,
    sale_id=SALE,
    kind="sale",
    sales_delta_minor=300000,
    receipts_delta_minor=100000,
    reversal_of=None,
    description="Учебная продажа",
    created_at=TIME,
    created_by=OWNER,
)

EXAMPLES = {
    "SaleCreate": {
        "kind": "sale",
        "draft_id": None,
        "customer_id": CUSTOMER,
        "description": "Учебная продажа",
        "total_minor": 300000,
        "received_minor": 100000,
    },
    "RepaymentCreate": {
        "kind": "repayment",
        "draft_id": None,
        "sale_id": SALE,
        "amount_minor": 50000,
        "description": "Доплата",
    },
    "OperationResponse": {
        "operation": SALE_ROW,
        "sale_balance_minor": 200000,
        "customer_balance_minor": 200000,
        "created_at": TIME,
    },
    "RepaymentOperationResponse": {
        "operation": {
            **SALE_ROW,
            "id": PAYMENT,
            "kind": "repayment",
            "sales_delta_minor": 0,
            "receipts_delta_minor": 50000,
            "description": "Доплата",
        },
        "sale_balance_minor": 150000,
        "customer_balance_minor": 150000,
        "created_at": TIME,
    },
    "SummaryResponse": {
        "date": "2026-10-15",
        "timezone": "Asia/Almaty",
        "currency": "KZT",
        "sales_minor": 300000,
        "receipts_minor": 150000,
        "outstanding_minor": 150000,
        "new_inquiries_count": 0,
    },
    "CustomerCreate": {
        "display_name": "Демо Асқар",
        "note": "Вымышленный покупатель",
        "contact": None,
    },
    "CustomerResponse": {
        "id": CUSTOMER,
        "business_id": BUSINESS,
        "display_name": "Демо Асқар",
        "note": "Вымышленный покупатель",
        "contact": None,
        "balance_minor": 150000,
    },
    "OpenSale": {
        "id": SALE,
        "customer_id": CUSTOMER,
        "description": "Учебная продажа",
        "total_minor": 300000,
        "received_minor": 150000,
        "balance_minor": 150000,
        "created_at": TIME,
    },
    "ErrorResponse": {
        "error": {
            "code": "BALANCE_CHANGED",
            "message": "Payment exceeds current balance",
            "fields": {},
        },
        "request_id": "70000000-0000-4000-8000-000000000001",
    },
    "MeResponse": {
        "id": OWNER,
        "businesses": [
            {
                "id": BUSINESS,
                "slug": "mart-demo-clothes",
                "name": "Демо MART clothes",
                "role": "owner",
            }
        ],
    },
    "ReverseCreate": {"description": "Исправление ошибочной записи"},
    "DraftResponse": {
        "id": "40000000-0000-4000-8000-000000000001",
        "transcript": "Продал товар на 3000, Демо Асқар заплатил 1000",
        "kind": "sale",
        "customer_query": "Демо Асқар",
        "customer_candidates": [{"id": CUSTOMER, "display_name": "Демо Асқар"}],
        "sale_candidates": [],
        "description": "Товар",
        "total_minor": 300000,
        "received_minor": 100000,
        "amount_minor": None,
        "missing_fields": [],
        "questions": [],
        "expires_at": "2026-10-15T10:30:00Z",
    },
    "InquiryCreate": {
        "client_request_id": "60000000-0000-4000-8000-000000000001",
        "visitor_name": "Демо",
        "contact": "demo@example.test",
        "message": "Учебная заявка",
    },
}

EXAMPLES["ClarificationDraftResponse"] = {
    **EXAMPLES["DraftResponse"],
    "transcript": "Тауарды үш мың теңгеге саттым",
    "customer_query": None,
    "customer_candidates": [],
    "received_minor": None,
    "missing_fields": ["received_minor", "customer_id"],
    "questions": ["Қазір қанша төленді?", "Клиентті таңдаңыз немесе қосыңыз."],
}
EXAMPLES["RepaymentDraftResponse"] = {
    **EXAMPLES["DraftResponse"],
    "transcript": "Демо Асқар вернул 500 тенге",
    "kind": "repayment",
    "description": "Погашение",
    "total_minor": None,
    "received_minor": None,
    "amount_minor": 50000,
    "sale_candidates": [EXAMPLES["OpenSale"]],
    "missing_fields": ["sale_id"],
    "questions": ["Выберите непогашенную продажу."],
}
EXAMPLES["ConfirmedSaleCreate"] = {
    **EXAMPLES["SaleCreate"],
    "draft_id": EXAMPLES["DraftResponse"]["id"],
}
EXAMPLES["AIUnavailableErrorResponse"] = {
    **EXAMPLES["ErrorResponse"],
    "error": {
        "code": "AI_UNAVAILABLE",
        "message": "AI unavailable; use manual input",
        "fields": {},
    },
}


def model_for_example(name):
    if name in {"ClarificationDraftResponse", "RepaymentDraftResponse"}:
        return schemas.DraftResponse
    if name == "ConfirmedSaleCreate":
        return schemas.SaleCreate
    if name == "AIUnavailableErrorResponse":
        return schemas.ErrorResponse
    return (
        schemas.OperationResponse
        if name == "RepaymentOperationResponse"
        else getattr(schemas, name)
    )
