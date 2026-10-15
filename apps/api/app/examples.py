"""Synthetic transport examples for frontend work; these are not API results."""

BUSINESS = "10000000-0000-4000-8000-000000000001"
CUSTOMER = "20000000-0000-4000-8000-000000000001"
SALE = "30000000-0000-4000-8000-000000000001"
DRAFT = "40000000-0000-4000-8000-000000000001"
OWNER = "50000000-0000-4000-8000-000000000001"
TIME = "2026-10-15T10:00:00Z"

EXAMPLES = {
    "SaleCreate": {
        "kind": "sale",
        "draft_id": None,
        "customer_id": CUSTOMER,
        "description": "Учебный товар",
        "total_minor": 300000,
        "received_minor": 100000,
    },
    "RepaymentCreate": {
        "kind": "repayment",
        "draft_id": None,
        "sale_id": SALE,
        "amount_minor": 50000,
        "description": "Учебная частичная оплата",
    },
    "DraftResponse": {
        "id": DRAFT,
        "transcript": "Асқарға үш мың теңгеге тауар бердім, мыңын төледі",
        "kind": "sale",
        "customer_query": "Асқар",
        "customer_candidates": [{"id": CUSTOMER, "display_name": "Демо Асқар"}],
        "sale_candidates": [],
        "description": "Тауар",
        "total_minor": 300000,
        "received_minor": 100000,
        "amount_minor": None,
        "missing_fields": [],
        "questions": [],
        "expires_at": "2026-10-15T10:30:00Z",
    },
    "OperationResponse": {
        "operation": {
            "id": SALE,
            "business_id": BUSINESS,
            "customer_id": CUSTOMER,
            "sale_id": SALE,
            "kind": "sale",
            "sales_delta_minor": 300000,
            "receipts_delta_minor": 100000,
            "reversal_of": None,
            "description": "Учебный товар",
            "created_at": TIME,
            "created_by": OWNER,
        },
        "sale_balance_minor": 200000,
        "customer_balance_minor": 200000,
        "created_at": TIME,
    },
    "SummaryResponse": {
        "date": "2026-10-15",
        "timezone": "Asia/Almaty",
        "currency": "KZT",
        "sales_minor": 300000,
        "receipts_minor": 150000,
        "outstanding_minor": 150000,
        "new_inquiries_count": 1,
    },
    "InquiryCreate": {
        "client_request_id": "60000000-0000-4000-8000-000000000001",
        "visitor_name": "Демо-покупатель",
        "contact": "demo@example.test",
        "message": "Есть ли школьный рюкзак до 15 000 тенге?",
    },
    "ErrorResponse": {
        "error": {
            "code": "CUSTOMER_REQUIRED",
            "message": "A credit sale requires a customer",
            "fields": {"customer_id": ["CUSTOMER_REQUIRED"]},
        },
        "request_id": "70000000-0000-4000-8000-000000000001",
    },
}
