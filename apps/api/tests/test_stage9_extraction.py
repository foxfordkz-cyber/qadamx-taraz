"""Stage9 supplementary adversarial suite: synthetic transport, never paid AI."""

import asyncio
import json

import httpx
import pytest
from test_ai import TEXT, VALID, StubProvider
from test_audio import wav_bytes
from test_openai import completion, settings, transport

from app.errors import APIError
from app.services.ai import GeminiProvider, extract
from app.services.extraction_grounding import customer_in_source
from app.services.openai_provider import OpenAIProvider


def envelope(raw):
    result = completion()
    result["output"][0]["content"][0]["text"] = raw
    return result


@pytest.mark.parametrize(
    "raw",
    [
        json.dumps(VALID)[:-1] + ',"received_minor":100000}',
        json.dumps(VALID)[:-1] + ',"total_minor":900000}',
        json.dumps(VALID)[:-1] + ',"\\u0072eceived_minor":100000}',
        json.dumps(VALID)[:-1] + ',"transcript":"overwritten"}',
        json.dumps({**VALID, "unexpected": "must not enter draft"}),
        json.dumps({**VALID, "unexpected": {"x": 1}})[:-2] + ',"x":2}}',
        '{"kind":"sale"',
        "[]",
        "null",
        json.dumps({**VALID, "received_minor": float("nan")}),
    ],
)
def test_openai_inner_output_rejected_before_reencoding(monkeypatch, raw):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(200, json=envelope(raw))

    transport(monkeypatch, handler)
    with pytest.raises(APIError) as exc:
        asyncio.run(extract(OpenAIProvider(settings()), text=TEXT))
    assert exc.value.status == 503 and exc.value.code == "AI_UNAVAILABLE"
    assert len(calls) == 1


@pytest.mark.parametrize("fault", ["status", "nested_usage", "nonfinite"])
def test_raw_http_envelope_is_checked_before_dictionary_conversion(monkeypatch, fault):
    raw = json.dumps(completion())
    if fault == "status":
        raw = raw[:-1] + ',"status":"completed"}'
    elif fault == "nested_usage":
        raw = raw.replace('"input_tokens": 100', '"input_tokens": 1,"input_tokens": 100')
    else:
        raw = raw.replace('"input_tokens": 100', '"input_tokens": NaN')
    transport(monkeypatch, lambda _: httpx.Response(200, content=raw))
    with pytest.raises(APIError) as exc:
        asyncio.run(extract(OpenAIProvider(settings()), text=TEXT))
    assert exc.value.code == "AI_UNAVAILABLE"


def test_duplicate_transcription_stops_before_extraction(monkeypatch):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(200, content='{"text":"one","text":"two"}')

    transport(monkeypatch, handler)
    with pytest.raises(APIError):
        asyncio.run(extract(OpenAIProvider(settings()), audio=wav_bytes()))
    assert len(calls) == 1 and calls[0].url.path.endswith("/transcriptions")


def test_valid_envelope_metadata_and_reasoning_item_remain_supported(monkeypatch):
    body = completion(id="synthetic-response", service_tier="default")
    body["output"].insert(0, {"type": "reasoning", "summary": []})
    transport(monkeypatch, lambda _: httpx.Response(200, json=body))
    result = asyncio.run(extract(OpenAIProvider(settings()), text=TEXT))
    assert result.received_minor == 100000 and result.total_minor == 300000


def receipt(text, quote, status="paid", total=271500):
    payload = {
        **VALID,
        "customer_query": None,
        "total_minor": total,
        "total_evidence": "2715",
        "received_minor": total,
        "payment_evidence": quote,
        "payment_status": status,
    }
    provider = StubProvider(json.dumps(payload, ensure_ascii=False))
    provider.max_attempts = 1
    return asyncio.run(extract(provider, text=text))


@pytest.mark.parametrize(
    "clause,quote",
    [
        ("Получено 2715", "Получено 2715"),
        ("2715 оплачены", "2715 оплачены"),
        ("Поступило 2715", "Поступило 2715"),
        ("Кассаға 2715 түсті", "2715 түсті"),
        ("Деньги все передали", "Деньги все передали"),
        ("Ақшаны толық берді", "Ақшаны толық берді"),
        ("Ақшасын түгелдей ұстатты", "Ақшасын түгелдей ұстатты"),
        ("Денежку всю ұстатты", "Денежку всю ұстатты"),
    ],
)
def test_explicit_receipt_grammar_on_new_amounts(clause, quote):
    result = receipt("Продажа 2715. " + clause + ".", quote)
    assert result.received_minor == 271500


@pytest.mark.parametrize(
    "clause,quote",
    [
        ("Не получено 2715", "получено 2715"),
        ("Получено 2715?", "Получено 2715"),
        ("Если получено 2715", "получено 2715"),
        ("Завтра получено 2715", "получено 2715"),
        ("Кассаға 2715 түсті ме?", "2715 түсті"),
        ("2715 түсті емес", "2715 түсті"),
        ("Деньги все передали?", "Деньги все передали"),
        ("Не деньги все передали", "деньги все передали"),
        ("Завтра деньги все передали", "деньги все передали"),
        ("Егер ақшаны толық берді", "ақшаны толық берді"),
        ("Ақшасын түгелдей ұстатты ма?", "Ақшасын түгелдей ұстатты"),
        ("Ақшасын түгелдей ұстатты емес", "Ақшасын түгелдей ұстатты"),
        ("Деньги все передали или только часть", "Деньги все передали"),
    ],
)
def test_receipt_grammar_must_not_drop_negation_question_or_uncertainty(clause, quote):
    assert receipt("Продажа 2715. " + clause + ".", quote).received_minor is None


@pytest.mark.parametrize(
    "text,expected",
    [
        ("Продажа 2715. Ничего не заплатил; всё в долг.", 0),
        ("Продажа 2715. Если ничего не заплатил; всё в долг.", None),
        ("Продажа 2715. Не всё в долг.", None),
    ],
)
def test_explicit_nonpayment_does_not_negate_the_next_zero_clause(text, expected):
    assert receipt(text, "всё в долг", status="debt").received_minor == expected


@pytest.mark.parametrize(
    "name,source,expected",
    [
        ("Самат", "Саматтың төлемі", True),
        ("Серік", "Серіктің қарызы", True),
        ("Айдын", "Айдынның төлемі", True),
        ("Ольга", "для Ольги", True),
        ("Наташа", "для Наташи", True),
        ("Анна", "для Жанны", False),
        ("Самат", "Саматтың әлде Серіктің", False),
        ("Ольга", "для Ольги или Инги", False),
        ("Самат", "Саматтық зат", False),
        ("customer-id", "Саматтың", False),
    ],
)
def test_bounded_name_forms_do_not_select_ids_or_resolve_ambiguity(name, source, expected):
    assert customer_in_source(name, source) is expected


def test_unknown_payment_is_not_filled_even_with_positive_words():
    result = receipt("Продажа 2715. Получено 2715.", "Получено 2715", status="unknown")
    assert result.received_minor is None


def test_duplicate_gemini_http_envelope_is_not_last_value_wins(monkeypatch):
    body = {
        "candidates": [
            {"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(VALID)}]}}
        ]
    }
    raw = json.dumps(body)[:-1] + ',"candidates":' + json.dumps(body["candidates"]) + "}"
    transport(monkeypatch, lambda _: httpx.Response(200, content=raw))
    with pytest.raises(APIError):
        asyncio.run(extract(GeminiProvider(settings(ai_api_key="synthetic-key")), text=TEXT))
