"""Synthetic frontend examples, never real users, debts or AI results."""

from datetime import date, timedelta

from app import livestock_schemas, schemas
from app.analytics_schemas import AnalyticsResponse
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


EXAMPLES["VenueResponse"] = dict(
    id="10000000-0000-4000-8000-000000000001",
    slug="mart",
    name="MART",
    address_label="Demo venue",
    geometry_status="conceptual",
    is_demo=True,
)
EXAMPLES["PublicBusiness"] = dict(
    id="20000000-0000-4000-8000-000000000001",
    venue_id=EXAMPLES["VenueResponse"]["id"],
    slug="mart-demo-clothes",
    name="Demo clothes",
    category="clothes",
    description="Synthetic demo",
    is_demo=True,
)
EXAMPLES["CatalogResponse"] = dict(
    id="30000000-0000-4000-8000-000000000001",
    business_id=EXAMPLES["PublicBusiness"]["id"],
    name="Demo item",
    price_minor=300000,
    available=True,
    is_demo=True,
)
EXAMPLES["ShopResponse"] = dict(**EXAMPLES["PublicBusiness"], catalog=[EXAMPLES["CatalogResponse"]])
EXAMPLES["InquiryReceipt"] = dict(
    id="60000000-0000-4000-8000-000000000001", created_at="2026-10-15T10:00:00Z"
)
EXAMPLES["InquiryResponse"] = dict(
    **EXAMPLES["InquiryReceipt"],
    business_id=EXAMPLES["PublicBusiness"]["id"],
    visitor_name="Demo visitor",
    contact="@demo_contact",
    message="Synthetic inquiry",
    status="new",
)
EXAMPLES["InquiryUpdate"] = dict(status="in_progress")


EXAMPLES["ListingWrite"] = dict(
    species="cattle",
    quantity=2,
    price_per_head_minor=35000000,
    locality="Тараз",
    market="Учебный мал базар A",
    age_months=24,
    sex="female",
    description="Учебный пример, не рыночное объявление",
    photo_ids=[],
    contact="@demo_contact",
    contact_consent=True,
)
EXAMPLES["PublicListing"] = dict(
    **{
        key: value
        for key, value in EXAMPLES["ListingWrite"].items()
        if key not in {"photo_ids", "contact_consent"}
    },
    id="70000000-0000-4000-8000-000000000001",
    currency="KZT",
    photos=[],
    confirmed_on="2026-10-16",
    is_demo=True,
)
EXAMPLES["OwnerListing"] = dict(
    **EXAMPLES["PublicListing"],
    status="active",
    available_today=True,
    created_at="2026-10-16T06:00:00Z",
    updated_at="2026-10-16T06:00:00Z",
)
EXAMPLES["ListingAction"] = dict(action="confirm_today")
EXAMPLES["PhotoReceipt"] = dict(id="80000000-0000-4000-8000-000000000001")
EXAMPLES["PriceStats"] = dict(
    species="cattle",
    locality="Тараз",
    market="Учебный мал базар A",
    period_from="2026-10-16",
    period_to="2026-10-16",
    timezone="Asia/Almaty",
    currency="KZT",
    unit="head",
    sample_count=4,
    min_price_per_head_minor=30000000,
    median_price_per_head_minor=None,
    status="insufficient_data",
    source="asking_prices",
)


EXAMPLES["CustomerPage"] = {
    "items": [EXAMPLES["CustomerResponse"]],
    "next_cursor": CUSTOMER,
}
EXAMPLES["CustomerIdsPage"] = {
    "items": [EXAMPLES["CustomerResponse"]],
    "next_cursor": None,
}
EXAMPLES["CustomerIdsEmptyPage"] = {"items": [], "next_cursor": None}


def model_for_example(name):
    if name == "CanonicalMarketPriceStats":
        return livestock_schemas.PriceStats
    if name.startswith("LocalizedShop"):
        return schemas.ShopResponse
    if name.startswith("Analytics"):
        return AnalyticsResponse
    if name in {"CustomerPage", "CustomerIdsPage", "CustomerIdsEmptyPage"}:
        return schemas.Page[schemas.CustomerResponse]
    if hasattr(livestock_schemas, name):
        return getattr(livestock_schemas, name)
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


def analytics_example(sales=0, receipts=0, count=0, debt=0, debtors=0):
    start = date(2026, 10, 10)
    return dict(
        business_id=BUSINESS,
        days=7,
        timezone="Asia/Almaty",
        currency="KZT",
        as_of="2026-10-16T10:00:00Z",
        period_from=str(start),
        period_to="2026-10-16",
        today_incomplete=True,
        cards=dict(
            sales_minor=sales,
            receipts_minor=receipts,
            sales_count=count,
            average_ticket_minor=sales // count if count else None,
            outstanding_minor=debt,
            debtors_count=debtors,
        ),
        daily=[
            dict(
                date=str(start + timedelta(days=i)),
                sales_minor=sales if i == 6 else 0,
                receipts_minor=receipts if i == 6 else 0,
                sales_count=count if i == 6 else 0,
                is_partial=i == 6,
            )
            for i in range(7)
        ],
        hourly=[dict(hour=h, sales_count=count if h == 15 else 0) for h in range(24)],
    )


EXAMPLES["AnalyticsEmpty"] = analytics_example()
EXAMPLES["AnalyticsSaleAndRepayment"] = analytics_example(300000, 150000, 1, 150000, 1)
EXAMPLES["AnalyticsOldSaleReversedToday"] = analytics_example(receipts=-100000)

EXAMPLES["CustomerCreationCompleted"] = {
    "status": "completed",
    "customer": {**EXAMPLES["CustomerResponse"], "balance_minor": 0},
}
EXAMPLES["CustomerCreationNotObserved"] = {"status": "not_observed", "customer": None}


EXAMPLES["LocalizedShopKK"] = {
    **EXAMPLES["ShopResponse"],
    "name": "Демо MART — Киім",
    "name_i18n": {"ru": "Демо MART — Одежда", "kk": "Демо MART — Киім"},
    "description_i18n": None,
}
EXAMPLES["LocalizedShopRU"] = {
    **EXAMPLES["LocalizedShopKK"],
    "name": "Демо MART — Одежда",
}

EXAMPLES["MarketResponse"] = {
    "id": "10000000-0000-4000-8000-000000000001",
    "key": "example-market",
    "name": "Учебный пример рынка",
    "name_i18n": None,
    "locality": "Тараз",
    "verification_status": "unverified",
    "verified_at": None,
    "accepts_listings": False,
}
EXAMPLES["CanonicalMarketPriceStats"] = {
    **EXAMPLES["PriceStats"],
    "market_id": EXAMPLES["MarketResponse"]["id"],
    "market": None,
    "sample_count": 0,
    "min_price_per_head_minor": None,
    "median_price_per_head_minor": None,
    "status": "insufficient_data",
}
