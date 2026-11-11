"""Seller assistant: request-scoped fact selection, server-rendered text, no ledger writes.

The private provider protocol carries identifiers only. Invalid output uses the existing
server fallback. Questions, answers, names and amounts are never logged.
"""

import asyncio
import json
import threading
from datetime import UTC, datetime, time, timedelta

import httpx
from pydantic import ValidationError
from sqlalchemy import func, select

from app.assistant_schemas import AssistantAction, AssistantFact, AssistantResponse
from app.errors import APIError
from app.models import Business, Customer, Operation
from app.services import analytics, ledger
from app.services.ai_diagnostics import ai_stage
from app.services.assistant_structured import (
    INSTRUCTIONS,
    LABELS,
    MAX_ACTIONS,
    OUTPUT_SCHEMA,
    fact_catalog,
    reminder_text,
    tenge,
    validate_answer,
)
from app.services.extraction_grounding import customer_in_source
from app.services.openai_provider import OpenAIProvider
from app.services.strict_json import strict_json_object

TOP_DEBTORS = 5
TIMEOUT_SECONDS = 20


# ---------- facts ----------


def collect_facts(session, business_id, user_id, days, locale):
    """Read-only snapshot, then release the membership lock before any AI call."""
    ledger.require_membership(session, business_id, user_id)
    kk = locale == "kk"
    current = analytics.read(session, business_id, days)
    start = datetime.combine(current.period_from, time.min, tzinfo=ledger.LOCAL_TZ)
    previous = analytics.read(session, business_id, days, as_of=start - timedelta(microseconds=1))
    today = ledger.summary(session, business_id, datetime.now(ledger.LOCAL_TZ).date())
    shop = session.scalar(select(Business.name).where(Business.id == business_id)) or ""
    balances = (
        select(
            Operation.customer_id,
            func.sum(Operation.sales_delta_minor - Operation.receipts_delta_minor).label("debt"),
        )
        .where(Operation.business_id == business_id, Operation.customer_id.is_not(None))
        .group_by(Operation.customer_id)
        .subquery()
    )
    debtors = session.execute(
        select(Customer.id, Customer.display_name, balances.c.debt)
        .join(balances, balances.c.customer_id == Customer.id)
        .where(Customer.business_id == business_id, balances.c.debt > 0)
        .order_by(balances.c.debt.desc(), Customer.id)
        .limit(TOP_DEBTORS)
    ).all()
    session.rollback()

    cards = current.cards

    def fact(key, value_minor=None, count=None):
        return AssistantFact(key=key, label=LABELS[key][kk], value_minor=value_minor, count=count)

    facts = [
        fact("sales", value_minor=cards.sales_minor),
        fact("sales_previous", value_minor=previous.cards.sales_minor),
        fact("sales_change", value_minor=cards.sales_minor - previous.cards.sales_minor),
        fact("receipts", value_minor=cards.receipts_minor),
        fact("outstanding", value_minor=cards.outstanding_minor),
        fact("debtors", count=cards.debtors_count),
        fact("sales_count", count=cards.sales_count),
    ]
    if cards.average_ticket_minor is not None:
        facts.append(fact("average_ticket", value_minor=cards.average_ticket_minor))
    facts += [
        fact("today_sales", value_minor=today.sales_minor),
        fact("today_receipts", value_minor=today.receipts_minor),
    ]
    for customer_id, name, debt in debtors:
        facts.append(
            AssistantFact(
                key="debtor",
                label=name[:200],
                value_minor=int(debt),
                customer_id=customer_id,
            )
        )
    return facts, current.as_of, shop


# ---------- fallback ----------

REMINDER_WORDS = ("напомин", "напомн", "еске сал", "ескерт", "напиши", "жаз")


def fallback(question, facts, days, locale, shop):
    kk = locale == "kk"
    by_key = {f.key: f for f in facts if f.key != "debtor"}
    debtors = [f for f in facts if f.key == "debtor"]
    # These are only the top debtors, never a complete customer lookup. A named
    # request must not silently create a reminder for the first, unrelated person.
    named = [
        f
        for f in debtors
        if customer_in_source(f.label, question)
        or any(
            len(word) >= 3 and customer_in_source(word, question)
            for word in f.label.split()
            if word.casefold() != "демо"
        )
    ]
    question_lower = question.casefold()
    if len(named) == 1:
        debtor = named[0]
        answer = (
            f"{debtor.label}: қарызы {tenge(debtor.value_minor)}."
            if kk
            else f"{debtor.label}: долг {tenge(debtor.value_minor)}."
        )
        actions = [AssistantAction(kind="open_debts")]
        if any(word in question_lower for word in REMINDER_WORDS):
            actions.insert(
                0,
                AssistantAction(
                    kind="reminder_draft",
                    customer_id=debtor.customer_id,
                    text=reminder_text(debtor, shop, kk),
                ),
            )
        return answer, actions
    if "сегодня" in question_lower or "бүгін" in question_lower:
        keys = (
            ["today_receipts"]
            if any(word in question_lower for word in ("поступ", "получ", "түсті", "түсім"))
            else ["today_sales", "today_receipts"]
        )
        return " ".join(f"{LABELS[key][kk]}: {tenge(by_key[key].value_minor)}." for key in keys), [
            AssistantAction(kind="open_history")
        ]
    sales, receipts = by_key["sales"].value_minor, by_key["receipts"].value_minor
    outstanding, count = by_key["outstanding"].value_minor, by_key["debtors"].count
    change = by_key["sales_change"].value_minor
    if kk:
        parts = [f"Соңғы {days} күнде сатылым {tenge(sales)}, түсім {tenge(receipts)}."]
        if change > 0:
            parts.append(f"Бұл өткен {days} күннен {tenge(change)} көп.")
        elif change < 0:
            parts.append(f"Бұл өткен {days} күннен {tenge(-change)} аз.")
        parts.append(
            f"Қазір клиенттердің қарызы {tenge(outstanding)}, қарызы барлар: {count}."
            if outstanding > 0
            else "Қазір ешкім қарыз емес."
        )
        if debtors:
            top = debtors[0]
            parts.append(f"Ең көп қарыз — {top.label}: {tenge(top.value_minor)}.")
    else:
        parts = [f"За последние {days} дней продажи {tenge(sales)}, поступления {tenge(receipts)}."]
        if change > 0:
            parts.append(f"Это на {tenge(change)} больше, чем за прошлые {days} дней.")
        elif change < 0:
            parts.append(f"Это на {tenge(-change)} меньше, чем за прошлые {days} дней.")
        parts.append(
            f"Сейчас клиенты должны {tenge(outstanding)}, должников: {count}."
            if outstanding > 0
            else "Сейчас никто не должен."
        )
        if debtors:
            top = debtors[0]
            parts.append(f"Больше всего должен {top.label}: {tenge(top.value_minor)}.")
    actions = []
    if any(word in question_lower for word in REMINDER_WORDS) or len(named) > 1:
        parts.append(
            "Нақты клиентті қарыздар тізімінен таңдаңыз. Бұл тек ең үлкен қарыздар тізімі."
            if kk
            else "Выберите конкретного клиента в долгах. Здесь показаны только крупнейшие долги."
        )
    if outstanding > 0:
        actions.append(AssistantAction(kind="open_debts"))
    if by_key["sales_count"].count == 0:
        actions.append(AssistantAction(kind="new_sale"))
    return " ".join(parts), actions[:MAX_ACTIONS]


# ---------- providers ----------


def model_payload(question, facts, days, locale):
    return json.dumps(
        {
            "locale": locale,
            "period_days": days,
            "facts": fact_catalog(facts),
            "question": question,
        },
        ensure_ascii=False,
    )


async def ask_openai(settings, payload):
    provider = OpenAIProvider(settings)
    if not provider.key or not provider.model:
        raise APIError(503, "AI_UNAVAILABLE", "OpenAI is not configured")
    body = {
        "model": provider.model,
        "store": False,
        "background": False,
        "max_output_tokens": 1024,
        "instructions": INSTRUCTIONS,
        "input": payload,
        "text": {
            "format": {
                "type": "json_schema",
                "name": "qadam_assistant",
                "strict": True,
                "schema": OUTPUT_SCHEMA,
            }
        },
    }
    if provider.model == "gpt-6-luna":
        body["reasoning"] = {"effort": "none"}
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=False) as client:
        result = await provider.post(
            client, "responses", provider.model, input_chars=len(payload), json=body
        )
    if result.get("status") != "completed":
        raise ValueError("incomplete")
    texts = [
        part.get("text")
        for item in result.get("output") or []
        if isinstance(item, dict) and item.get("type") == "message"
        for part in item.get("content") or []
        if isinstance(part, dict) and part.get("type") == "output_text"
    ]
    if len(texts) != 1 or not isinstance(texts[0], str) or len(texts[0]) > 16_000:
        raise ValueError("invalid output")
    return texts[0]


async def ask_gemini(settings, payload):
    if not settings.ai_api_key or not settings.ai_model:
        raise APIError(503, "AI_UNAVAILABLE", "AI is not configured")
    with ai_stage("provider_http") as diagnostic:
        diagnostic.provider, diagnostic.model = "gemini", settings.ai_model
        diagnostic.input_chars = len(payload)
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=False) as client:
            response = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{settings.ai_model}:generateContent",
                headers={"x-goog-api-key": settings.ai_api_key.get_secret_value()},
                json={
                    "systemInstruction": {"parts": [{"text": INSTRUCTIONS}]},
                    "contents": [{"role": "user", "parts": [{"text": payload}]}],
                    "generationConfig": {
                        "temperature": 0.2,
                        "maxOutputTokens": 1024,
                        "responseMimeType": "application/json",
                        "responseJsonSchema": OUTPUT_SCHEMA,
                    },
                },
            )
        diagnostic.provider_status = response.status_code
        response.raise_for_status()
    candidate = strict_json_object(response.content)["candidates"][0]
    if candidate.get("finishReason") != "STOP":
        raise ValueError("blocked")
    return "".join(
        part.get("text", "") for part in candidate["content"]["parts"] if not part.get("thought")
    )


# ---------- limits and service ----------


class DailyLimit:
    """Per-process daily counter. Resets on restart; documented as a soft budget guard."""

    def __init__(self, limit):
        self.limit = limit
        self.lock = threading.Lock()
        self.day = None
        self.counts = {}

    def take(self, user_id):
        today = datetime.now(ledger.LOCAL_TZ).date()
        with self.lock:
            if today != self.day:
                self.day, self.counts = today, {}
            used = self.counts.get(user_id, 0)
            if used >= self.limit:
                raise APIError(429, "ASSISTANT_LIMIT", "Daily assistant limit reached")
            self.counts[user_id] = used + 1


class Assistant:
    def __init__(self, settings, generate=None):
        self.settings = settings
        self.enabled = settings.assistant_enabled
        self.limit = DailyLimit(settings.assistant_daily_limit)
        self.generate = generate or (ask_openai if settings.ai_provider == "openai" else ask_gemini)

    async def answer(self, *, question, facts, days, locale, shop):
        payload = model_payload(question, facts, days, locale)
        with ai_stage("assistant") as diagnostic:
            diagnostic.input_chars = len(question)
            try:
                async with asyncio.timeout(TIMEOUT_SECONDS + 2):
                    raw = await self.generate(self.settings, payload)
                answer, actions = validate_answer(raw, facts, days, locale, shop=shop)
                return answer, actions, "ai"
            except (
                APIError,
                httpx.HTTPError,
                TimeoutError,
                ValueError,
                ValidationError,
                KeyError,
                IndexError,
                TypeError,
            ) as error:
                diagnostic.validation_reason = type(error).__name__
        answer, actions = fallback(question, facts, days, locale, shop)
        return answer, actions, "fallback"


def response(business_id, days, locale, as_of, answer, facts, actions, source):
    return AssistantResponse(
        business_id=business_id,
        days=days,
        locale=locale,
        as_of=as_of.astimezone(UTC),
        answer=answer,
        facts=facts,
        actions=actions,
        source=source,
    )
