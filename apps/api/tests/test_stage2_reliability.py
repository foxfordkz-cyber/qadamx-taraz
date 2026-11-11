"""Stage 2 synthetic regressions; no external AI or personal data."""

import asyncio
import json

import httpx
import pytest
from test_ai import TEXT, VALID, StubProvider
from test_assistant import FACTS, bound, model

from app.errors import APIError
from app.services.ai import extract
from app.services.assistant import fallback, validate_answer
from app.services.extraction_grounding import money_from_quote
from app.services.provider_errors import limit_reason

PHRASES = [
    ("kk", "Айжанға 3000 теңгеге тауар саттым, 1000 теңгесін төледі", "1000 теңгесін төледі"),
    ("ru", "Продал Айжан товар на 3000 тенге, получила оплату 1000", "получила оплату 1000"),
    ("auto", "Айжанға товар 3000 теңге, оплатила 1000", "оплатила 1000"),
]


@pytest.mark.parametrize("locale,text,payment", PHRASES)
def test_three_requested_languages_ground_same_values(locale, text, payment):
    result = asyncio.run(
        extract(
            StubProvider(
                json.dumps(
                    {
                        **VALID,
                        "customer_query": "Айжан",
                        "payment_evidence": payment,
                    }
                )
            ),
            text=text,
            locale=locale,
        )
    )
    assert result.customer_query == "Айжан"
    assert (result.total_minor, result.received_minor) == (300000, 100000)
    assert result.total_minor - result.received_minor == 200000


@pytest.mark.parametrize(
    "quote,expected",
    [
        ("үш мың", 300000),
        ("три тысячи", 300000),
        ("екі миллион", 200000000),
        ("два миллиона", 200000000),
        ("төрт мың бес жүз", 450000),
        ("1 234,56", 123456),
        ("1000 или 2000", None),
        ("пять пять", None),
        ("екі жүз жүз", None),
        ("-500", None),
        ("1000 рублей", None),
        ("3 шт по 500", None),
        ("три тысячи тысяч", None),
    ],
)
def test_word_amounts_and_ambiguity(quote, expected):
    assert money_from_quote(quote) == expected


@pytest.mark.parametrize(
    "text,quote",
    [
        ("Продал на 3000, не получил 1000", "1000"),
        ("Продал на 3000, оплатит 1000", "оплатит 1000"),
        ("Продал на 3000, получу 1000 завтра", "1000"),
        ("3000 теңгеге саттым, 1000 төледі ме?", "1000 төледі"),
        ("Продал на 3000, получил 1000?", "получил 1000"),
        ("Продал на 3000, получил 1000 или 2000", "получил 1000"),
    ],
)
def test_unasserted_payment_remains_unknown(text, quote):
    result = asyncio.run(
        extract(
            StubProvider(
                json.dumps(
                    {
                        **VALID,
                        "payment_evidence": quote,
                    }
                )
            ),
            text=text,
        )
    )
    assert result.received_minor is None


@pytest.mark.parametrize(
    "text,quote,status,expected",
    [
        ("Продал на 3000, оплатили сразу полностью", "оплатили сразу полностью", "paid", 300000),
        ("3000 теңгеге саттым, толық төледі", "толық төледі", "paid", 300000),
        ("Продал на 3000, все в долг", "все в долг", "debt", 0),
        ("Продал на 3000, ничего не заплатил", "ничего не заплатил", "debt", 0),
        ("Продал на 3000, получил 1000", "получил 1000", "debt", 100000),
    ],
)
def test_explicit_full_zero_partial_are_distinct(text, quote, status, expected):
    result = asyncio.run(
        extract(
            StubProvider(
                json.dumps(
                    {
                        **VALID,
                        "payment_status": status,
                        "payment_evidence": quote,
                    }
                )
            ),
            text=text,
        )
    )
    assert result.received_minor == expected


def test_ambiguous_or_invented_customer_is_not_a_candidate_query():
    for text in ("Продал на 3000", "Асқар или Айжан взял на 3000"):
        result = asyncio.run(
            extract(
                StubProvider(
                    json.dumps(
                        {
                            **VALID,
                            "payment_status": "unknown",
                            "payment_evidence": None,
                        }
                    )
                ),
                text=text,
            )
        )
        assert result.customer_query is None
        assert "customer_query" in result.uncertain_fields


def test_bound_facts_render_exact_labels_amounts_and_language():
    raw = bound("metric:today_sales", "metric:today_receipts", "metric:outstanding")
    ru, _ = validate_answer(raw, FACTS, 7, "ru")
    kk, _ = validate_answer(raw, FACTS, 7, "kk")
    assert (
        ru
        == "Продажи сегодня: 0 ₸. Поступления сегодня: 500 ₸. Общий долг клиентов сейчас: 1 500 ₸."
    )
    assert "Бүгінгі сатылым: 0 ₸." in kk and "500 ₸" in kk


@pytest.mark.parametrize(
    "raw",
    [
        bound("metric:invented"),
        bound("metric:sales", "metric:sales"),
        bound("debtor:00000000-0000-0000-0000-000000000000:balance"),
        bound("metric:sales", actions=[("send_money", None)]),
        bound("metric:sales")[:-1] + ',"claims":[]}',
    ],
)
def test_fact_bindings_cannot_invent_duplicate_or_execute(raw):
    with pytest.raises(ValueError):
        validate_answer(raw, FACTS, 7, "ru")


def test_fallback_today_and_named_reminder_do_not_silently_switch_customer():
    answer, _ = fallback("Сколько продаж сегодня?", FACTS, 7, "ru", "")
    assert "Продажи сегодня: 0 ₸" in answer and "3 000" not in answer
    answer, _ = fallback("Бүгін қанша ақша түсті?", FACTS, 7, "kk", "")
    assert "Бүгінгі түсім: 500 ₸" in answer
    answer, actions = fallback("Напомни Айжан о долге", FACTS, 7, "ru", "")
    assert all(a.kind != "reminder_draft" for a in actions)
    assert "Выберите конкретного клиента" in answer


@pytest.mark.parametrize(
    "host,code,expected",
    [
        ("api.openai.com", "insufficient_quota", "QUOTA_EXHAUSTED"),
        ("api.openai.com", "rate_limit_exceeded", "RATE_LIMITED"),
        ("api.openai.com", "RESOURCE_EXHAUSTED", None),
        ("generativelanguage.googleapis.com", "insufficient_quota", None),
    ],
)
def test_only_recognized_machine_code_establishes_quota(host, code, expected):
    response = httpx.Response(
        429,
        request=httpx.Request("POST", f"https://{host}/"),
        json={"error": {"code": code, "message": "secret"}},
    )
    assert limit_reason(response) == expected


@pytest.mark.parametrize("provider_name", ["gemini", "openai"])
@pytest.mark.parametrize(
    "raw",
    [
        '{"a":1,"a":2}',
        '{"a":NaN}',
        '{"a":1e9999}',
        '{"a":{"x":1,"x":2}}',
    ],
)
def test_raw_provider_envelopes_do_not_hide_duplicate_or_nonfinite_json(
    monkeypatch, provider_name, raw
):
    from app.config import Settings
    from app.services.ai import GeminiProvider
    from app.services.openai_provider import OpenAIProvider

    real_client = httpx.AsyncClient
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(200, content=raw)

    monkeypatch.setattr(
        httpx, "AsyncClient", lambda **kw: real_client(**kw, transport=httpx.MockTransport(handler))
    )
    settings = Settings(
        _env_file=None,
        ai_api_key="synthetic-only",
        ai_model="gemini-synthetic-model",
        openai_api_key="synthetic-only",
        openai_model="gpt-synthetic-model",
    )
    provider = GeminiProvider(settings) if provider_name == "gemini" else OpenAIProvider(settings)
    with pytest.raises(APIError):
        asyncio.run(extract(provider, text=TEXT))
    assert len(calls) == 1


@pytest.mark.parametrize("status", [429, 502, 503])
def test_provider_faults_never_retry_or_leak_body(status):
    request = httpx.Request("POST", "https://api.openai.com/v1/responses")
    response = httpx.Response(
        status,
        request=request,
        headers={"Retry-After": "3"},
        json={"error": {"code": "insufficient_quota", "message": "private"}},
    )
    stub = StubProvider(httpx.HTTPStatusError("private", request=request, response=response))
    with pytest.raises(APIError) as failure:
        asyncio.run(extract(stub, text=TEXT))
    assert len(stub.calls) == 1
    assert "private" not in failure.value.message
    if status == 429:
        assert failure.value.fields == {"provider_reason": ["QUOTA_EXHAUSTED"]}
        assert failure.value.retry_after == 3
    if status == 502:
        assert failure.value.status == 502 and failure.value.code == "AI_PROVIDER_ERROR"


@pytest.mark.parametrize("provider_name", ["gemini", "openai"])
@pytest.mark.parametrize("locale", ["ru", "kk"])
def test_assistant_adapters_use_fact_binding_schema_offline(monkeypatch, provider_name, locale):
    from test_assistant import settings

    from app.services.assistant import Assistant

    real_client = httpx.AsyncClient
    requests = []
    raw = bound("metric:outstanding")

    def handler(request):
        body = json.loads(request.content)
        requests.append(body)
        if provider_name == "gemini":
            assert "claims" in body["generationConfig"]["responseJsonSchema"]["properties"]
            payload = json.loads(body["contents"][0]["parts"][0]["text"])
            result = {
                "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": raw}]}}]
            }
        else:
            assert "claims" in body["text"]["format"]["schema"]["properties"]
            payload = json.loads(body["input"])
            result = {
                "status": "completed",
                "output": [{"type": "message", "content": [{"type": "output_text", "text": raw}]}],
            }
        assert payload["locale"] == locale
        assert all("fact_id" in f for f in payload["facts"])
        assert "tools" not in body
        return httpx.Response(200, json=result)

    monkeypatch.setattr(
        httpx, "AsyncClient", lambda **kw: real_client(**kw, transport=httpx.MockTransport(handler))
    )
    service = Assistant(
        settings(
            ai_provider=provider_name,
            ai_model="gemini-synthetic",
            ai_api_key="synthetic-only",
            openai_model="gpt-synthetic",
            openai_api_key="synthetic-only",
        )
    )
    answer, actions, source = asyncio.run(
        service.answer(question="Долг?", facts=FACTS, days=7, locale=locale, shop="Synthetic")
    )
    assert source == "ai" and "1 500 ₸" in answer and actions == []
    assert len(requests) == 1


def test_amount_must_agree_with_quoted_source_not_provider_number():
    result = asyncio.run(
        extract(StubProvider(json.dumps({**VALID, "total_minor": 900000})), text=TEXT)
    )
    assert result.total_minor == 300000


def test_future_payment_cannot_be_reported_as_received():
    text = "Продал Айжан товар на 3000, завтра оплатит 1000"
    result = asyncio.run(
        extract(
            StubProvider(
                json.dumps(
                    {
                        **VALID,
                        "customer_query": "Айжан",
                        "payment_evidence": "оплатит 1000",
                    }
                )
            ),
            text=text,
        )
    )
    assert result.received_minor is None


def test_duplicate_json_keys_are_not_last_value_wins():
    raw = json.dumps(VALID).replace(
        '"total_minor": 300000', '"total_minor": 900000, "total_minor": 300000'
    )
    with pytest.raises(APIError):
        asyncio.run(extract(StubProvider(raw), text=TEXT))


@pytest.mark.parametrize(
    "answer",
    [
        "Сегодня продажи 3 000 ₸.",  # Period total assigned to today's zero.
        "Неизвестный клиент должен 1 500 ₸.",  # Allowed number, invented association.
        "Я записал продажу на 3 000 ₸.",  # No such action took place.
    ],
)
def test_unbound_model_prose_is_not_a_verified_financial_fact(answer):
    with pytest.raises(ValueError):
        validate_answer(model(answer), FACTS, 7, "ru")
