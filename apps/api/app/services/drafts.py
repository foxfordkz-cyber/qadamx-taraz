from datetime import timedelta
from uuid import uuid4

from sqlalchemy import func, select

from app import schemas
from app.models import Customer, Draft
from app.services import ledger

QUESTIONS = {
    "kind": ("Это продажа или погашение долга?", "Бұл сату ма, әлде қарызды өтеу ме?"),
    "total_minor": ("Какова полная сумма продажи?", "Сатудың толық сомасы қанша?"),
    "received_minor": ("Сколько оплачено сейчас?", "Қазір қанша төленді?"),
    "amount_minor": ("Какова сумма погашения?", "Өтеу сомасы қанша?"),
    "customer_id": ("Выберите или создайте клиента.", "Клиентті таңдаңыз немесе қосыңыз."),
    "sale_id": ("Выберите непогашенную продажу.", "Өтелмеген сатуды таңдаңыз."),
    "description": ("Уточните товар или назначение.", "Тауарды немесе мақсатты нақтылаңыз."),
}


def authorize_then_release(session, business_id, user_id):
    ledger.require_membership(session, business_id, user_id)
    session.rollback()  # Never hold a membership lock/connection while calling Gemini.


def save_draft(session, business_id, user_id, extraction, locale):
    ledger.require_membership(session, business_id, user_id)  # Membership may have been revoked.
    candidates = []
    if extraction.customer_query:
        candidates = list(
            session.scalars(
                select(Customer)
                .where(
                    Customer.business_id == business_id,
                    Customer.display_name.icontains(extraction.customer_query, autoescape=True),
                )
                .order_by(Customer.display_name, Customer.id)
                .limit(20)
            )
        )
    sales = []
    missing = []
    if extraction.kind == "unknown":
        missing.append("kind")
    elif extraction.kind == "sale":
        for name in ("total_minor", "received_minor"):
            if getattr(extraction, name) is None:
                missing.append(name)
        credit_or_unknown = (
            extraction.total_minor is None
            or extraction.received_minor is None
            or extraction.received_minor < extraction.total_minor
        )
        if (credit_or_unknown or extraction.customer_query) and len(candidates) != 1:
            missing.append("customer_id")
    else:
        if extraction.amount_minor is None:
            missing.append("amount_minor")
        if len(candidates) != 1:
            missing.append("customer_id")
        else:
            sales = ledger.history(
                session, business_id, None, candidates[0].id, True, 20, None
            ).items
        # Never choose a debt automatically, even if there is only one candidate.
        missing.append("sale_id")
    if extraction.kind != "unknown" and not extraction.description:
        missing.append("description")
    if "customer_query" in extraction.uncertain_fields and "customer_id" not in missing:
        missing.append("customer_id")
    now = session.scalar(select(func.clock_timestamp()))
    result = schemas.DraftResponse(
        id=uuid4(),
        transcript=extraction.transcript,
        kind=extraction.kind,
        customer_query=extraction.customer_query,
        customer_candidates=[schemas.CustomerCandidate.model_validate(row) for row in candidates],
        sale_candidates=sales,
        description=extraction.description,
        total_minor=extraction.total_minor,
        received_minor=extraction.received_minor,
        amount_minor=extraction.amount_minor,
        missing_fields=missing,
        questions=[QUESTIONS[name][locale == "kk"] for name in missing],
        expires_at=now + timedelta(minutes=30),
    )
    session.add(
        Draft(
            id=result.id,
            business_id=business_id,
            created_by=user_id,
            created_at=now,
            expires_at=result.expires_at,
            response_json=result.model_dump(mode="json"),
        )
    )
    session.commit()
    return result
