"""Source-grounding regressions, including phrases outside the frozen corpus."""

import asyncio
import json

import pytest
from test_ai import TEXT, VALID, StubProvider

from app.errors import APIError
from app.services.ai import extract
from app.services.extraction_grounding import (
    customer_in_source,
    money_from_evidence,
    money_from_quote,
)
from tools.extraction_eval.evaluate import corpus


@pytest.mark.parametrize(
    "quote,minor",
    [
        ("жетпіс үш мың екі жүз он тоғыз теңге", 7321900),
        ("семьдесят три тысячи двести девятнадцать", 7321900),
        ("четыре мың алты жүз", 460000),
        ("12\u202f345,67 ₸", 1234567),
        ("12\u00a0345.67 тенге", 1234567),
        ("жүз елу теңге", 15000),
        ("две тысячи один", 200100),
        ("жарты мың", None),
        ("1,234", None),
        ("10,00 тиын", 10),
        ("2.5 тыс.", 250000),
        ("100000000 тенге", 10000000000),
        ("100000000,01 тенге", None),
        ("минус 450", None),
        ("-450", None),
        ("450−500", None),
        ("450/500", None),
        ("450 или 500", None),
        ("екі әлде төрт мың", None),
        ("пять пять", None),
        ("екі жүз жүз", None),
        ("1000 USD", None),
        ("1000 рублей", None),
        ("30%", None),
        ("3 шт по 500", None),
        ("номер 12345", None),
        ("около 12345", None),
        ("1e6", None),
        ("1.2.3", None),
        ("пять тысяч тысяч", None),
    ],
)
def test_bounded_amount_grammar(quote, minor):
    assert money_from_quote(quote) == minor


@pytest.mark.parametrize(
    "quote,text,value",
    [
        ("500", "Продажа 1500", None),
        ("500", "Продажа 5000", None),
        ("1250", "Продажа 1250,50", None),
        ("250", "Продажа 1 250", None),
        ("мың", "екі мың теңге", None),
        ("две", "две тысячи", None),
        ("8", "Оплатил 8 тиын", 8),
        ("8", "Оплатил 8 теңге", 800),
        ("8", "Продал за 8 теңге, дали 8 тиын", None),
        ("450", "Продал за -450", None),
        ("10", "Скидка 10%", None),
        ("500", "Продажа 500, оплатили полностью", 50000),
    ],
)
def test_quote_boundaries_and_source_units(quote, text, value):
    assert money_from_evidence(quote, text) == value


def test_decimal_conversion_is_exact_across_unseen_values():
    for tenge in (1, 17, 289, 17003, 99999999):
        for tiyn in (0, 1, 37, 99):
            quote = f"{tenge:,}".replace(",", "\u202f") + f",{tiyn:02} теңге"
            assert money_from_quote(quote) == tenge * 100 + tiyn


@pytest.mark.parametrize(
    "name,text,valid",
    [
        ("Жанар", "Жанарға тауар бердім", True),
        ("Иван", "Ивану продал", True),
        ("Ольга", "Ольге продал", True),
        ("Юлия", "Юлии продал", True),
        ("Пётр", "Петр вернул долг", True),
        ("Данияр", "Даниярдан ақша алдым", True),
        ("Алёна", "Алёне товар", True),
        ("Иван Петров", "Иван Петрову товар", True),
        ("Жанар", "Жанар әлде Гүлнар алды", False),
        ("Ольга", "Ольга или Юлия купила", False),
        ("Жанар", "Гүлнарға саттым", False),
        ("Анна", "Жанна купила", False),
        ("Жанар", "Гүлнар или Жанар купила", False),
        ("customer-uuid-1", "товар", False),
    ],
)
def test_customer_name_is_supported_and_not_ambiguous(name, text, valid):
    assert customer_in_source(name, text) is valid


@pytest.mark.parametrize(
    "quote,status",
    [
        ("не всё в долг", "debt"),
        ("полностью не оплачено", "paid"),
        ("толық төлемеді", "paid"),
        ("остальное потом", "debt"),
        ("кейін төлейді", "debt"),
        ("если оплатили полностью", "paid"),
        ("полностью оплачено?", "paid"),
        ("полностью оплачено 1000 или 2000", "paid"),
        ("весь долг 1000", "debt"),
        ("должен оплатить 1000", "partial"),
    ],
)
def test_unknown_or_contradictory_receipt_is_not_zero_or_full(quote, status):
    text = "Продажа 3700. " + quote
    payload = {
        **VALID,
        "total_minor": 370000,
        "total_evidence": "3700",
        "payment_status": status,
        "payment_evidence": quote,
        "customer_query": None,
    }
    result = asyncio.run(extract(StubProvider(json.dumps(payload)), text=text))
    assert result.received_minor is None
    assert "received_minor" in result.uncertain_fields


def test_uncertain_fields_are_never_filled_by_grounding():
    payload = {**VALID, "uncertain_fields": ["total_minor", "received_minor", "customer_query"]}
    result = asyncio.run(extract(StubProvider(json.dumps(payload)), text=TEXT))
    assert (result.total_minor, result.received_minor, result.customer_query) == (None, None, None)


def test_same_scale_quote_with_two_possible_amounts_conservatively_asks_total():
    text = "Жанарға мыңға тауар, екі мың төледі"
    payload = {
        **VALID,
        "total_minor": 100000,
        "received_minor": 200000,
        "total_evidence": "мың",
        "payment_evidence": "екі мың төледі",
        "customer_query": "Жанар",
    }
    result = asyncio.run(extract(StubProvider(json.dumps(payload)), text=text))
    assert result.total_minor is None and "total_minor" in result.uncertain_fields


def test_reject_duplicate_json_fields_instead_of_last_value_wins():
    raw = json.dumps(VALID)[:-1] + ',"total_minor": 777777}'
    provider = StubProvider(raw)
    provider.max_attempts = 1
    with pytest.raises(APIError) as exc:
        asyncio.run(extract(provider, text=TEXT))
    assert exc.value.code == "AI_UNAVAILABLE" and len(provider.calls) == 1


def test_foreign_currency_cannot_be_normalized_into_kzt():
    result = asyncio.run(extract(StubProvider(), text=TEXT + " USD"))
    assert result.kind == "unknown" and result.total_minor is None and result.received_minor is None


@pytest.mark.parametrize(
    "text,received",
    [
        ("Продажа 1200, оплатили сразу полностью", 120000),
        ("Продажа 1200, не оплатили полностью", None),
        ("Продажа 1200, оплатили полностью?", None),
    ],
)
def test_short_full_payment_quote_requires_positive_source_clause(text, received):
    payload = {
        **VALID,
        "customer_query": None,
        "total_minor": 120000,
        "received_minor": 120000,
        "total_evidence": "1200",
        "payment_status": "paid",
        "payment_evidence": "полностью",
    }
    result = asyncio.run(extract(StubProvider(json.dumps(payload)), text=text))
    assert result.received_minor == received


@pytest.mark.parametrize(
    "text,quote",
    [
        ("Продажа 1200, не оплатили полностью", "оплатили полностью"),
        ("Продажа 1200, не заплатил 700", "заплатил 700"),
        ("Продажа 1200, не заплатил 700", "700"),
        ("Тауар 1200, 700 теңге төлемеді", "700"),
        ("Продажа 1200, не все в долг", "все в долг"),
        ("Продажа 1200, все в долг?", "все в долг"),
        ("Тауар 1200, бәрі қарызға емес", "бәрі қарызға"),
    ],
)
def test_quote_cannot_omit_an_adjacent_negation(text, quote):
    payload = {
        **VALID,
        "customer_query": None,
        "total_minor": 120000,
        "received_minor": 70000,
        "total_evidence": "1200",
        "payment_status": "paid",
        "payment_evidence": quote,
    }
    result = asyncio.run(extract(StubProvider(json.dumps(payload)), text=text))
    assert result.received_minor is None


def test_frozen_corpus_and_baseline_hashes_match_original_source():
    cases, freeze, _ = corpus()
    assert len(cases) == 100 and freeze["baseline_commit"].startswith("ae43dc2")
