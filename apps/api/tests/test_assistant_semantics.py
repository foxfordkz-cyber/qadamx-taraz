"""Frozen paired cases and independent safety/compatibility regressions; no live AI."""

import ast
import asyncio
import copy
import hashlib
import importlib.util
import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test_assistant import bound, settings, stub

from app.assistant_schemas import AssistantFact, AssistantResponse
from app.auth import current_user
from app.db import session_for_request
from app.errors import APIError
from app.main import create_app
from app.services import assistant
from app.services.assistant_structured import OUTPUT_SCHEMA, fact_catalog, fact_index
from app.services.assistant_structured import validate_answer as validate

FIXTURES = Path(__file__).parent / "fixtures"
DATA = json.loads((FIXTURES / "assistant_stage1_cases.json").read_text("utf-8"))
FREEZE = json.loads((FIXTURES / "assistant_stage1_freeze.json").read_text("utf-8"))
A = UUID("00000000-0000-4000-8000-000000000001")
B = UUID("00000000-0000-4000-8000-000000000002")
A_REF = f"debtor:{A}:balance"
B_REF = f"debtor:{B}:balance"
BUSINESS = UUID("00000000-0000-4000-8000-000000000010")
FOREIGN = UUID("00000000-0000-4000-8000-000000000099")


def facts(snapshot="default"):
    return [AssistantFact.model_validate(f) for f in DATA["snapshots"][snapshot]]


def test_dataset_freeze_and_original_definition_integrity():
    baseline = Path(__file__).parent / "evaluation_baselines/assistant_numeric_v1.py"
    for path, expected in [
        (FIXTURES / "assistant_stage1_cases.json", FREEZE["fixture_sha256"]),
        (baseline, FREEZE["baseline_file_sha256"]),
    ]:
        lf = path.read_bytes().replace(b"\r\n", b"\n")
        assert expected in {
            hashlib.sha256(lf).hexdigest(),
            hashlib.sha256(lf.replace(b"\n", b"\r\n")).hexdigest(),
        }
    assert sum(c["expected_valid"] for c in DATA["cases"]) == 18
    assert sum(not c["expected_valid"] for c in DATA["cases"]) == 24
    assert sum(c["case_id"].startswith("P") for c in DATA["cases"]) == 4


def test_offline_evaluation_is_portable_to_a_git_lf_checkout(tmp_path, monkeypatch):
    api = Path(__file__).parents[1]
    spec = importlib.util.spec_from_file_location(
        "stage1_portability_test", api / "tools/diploma_eval/evaluate_stage1.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for relative in [
        "tests/fixtures/assistant_stage1_cases.json",
        "tests/fixtures/assistant_stage1_freeze.json",
        "tests/evaluation_baselines/assistant_numeric_v1.py",
    ]:
        dest = tmp_path / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes((api / relative).read_bytes().replace(b"\r\n", b"\n"))
    monkeypatch.setattr(module, "API_ROOT", tmp_path)
    data, freeze, old = module.load_frozen()
    assert len(data["cases"]) == 42 and freeze["fixture_sha256"] == FREEZE["fixture_sha256"]
    assert (
        freeze["fixture_content_lf_sha256"]
        == hashlib.sha256(
            (tmp_path / "tests/fixtures/assistant_stage1_cases.json").read_bytes()
        ).hexdigest()
    )
    case = data["cases"][0]
    assert old(case["legacy_output"], facts(), case["days"], case["locale"])[0]


@pytest.mark.parametrize("case", DATA["cases"], ids=lambda c: c["case_id"])
def test_frozen_semantic_cases(case):
    if case["expected_valid"]:
        answer, actions = validate(
            case["structured_output"],
            facts(case["snapshot"]),
            case["days"],
            case["locale"],
            shop=case["shop"],
        )
        assert answer and len(answer) <= 1500 and len(actions) <= 3
    else:
        with pytest.raises(ValueError):
            validate(
                case["structured_output"],
                facts(case["snapshot"]),
                case["days"],
                case["locale"],
                shop=case["shop"],
            )


@pytest.mark.parametrize("locale", ["ru", "kk"])
def test_exact_customer_and_metric_bindings_are_server_rendered(locale):
    answer, actions = validate(
        bound("metric:sales", "metric:receipts", A_REF, B_REF, actions=[("reminder_draft", B_REF)]),
        facts(),
        7,
        locale,
        shop="Демо MART",
    )
    assert "3 000 ₸" in answer and "1 500,50 ₸" in answer
    assert '"Демо Асқар"' in answer and '"Демо Айгүл"' in answer
    assert '"Демо Асқар": ' + ("долг" if locale == "ru" else "қарызы") + " 1 500 ₸" in answer
    assert '"Демо Айгүл": ' + ("долг" if locale == "ru" else "қарызы") + " 500 ₸" in answer
    assert actions[0].customer_id == B and "500 ₸" in actions[0].text
    assert "1 500" not in actions[0].text and "Демо Асқар" not in actions[0].text
    assert "Демо MART" in actions[0].text


@pytest.mark.parametrize(
    "field,value",
    [
        ("value_minor", 150000),
        ("value_minor", -300000),
        ("value_minor", True),
        ("value_minor", 3000.5),
        ("value_minor", "300000"),
        ("value_minor", None),
        ("currency", "USD"),
        ("unit", "tiyn"),
        ("label", "Invented customer"),
        ("text", "unsupported claim"),
        ("customer_id", str(FOREIGN)),
    ],
)
def test_model_cannot_supply_its_own_values_names_units_or_identity(field, value):
    raw = json.loads(bound("metric:sales"))
    raw["claims"][0][field] = value
    with pytest.raises(ValueError):
        validate(json.dumps(raw), facts(), 7, "ru")


@pytest.mark.parametrize(
    "raw",
    [
        "null",
        "[]",
        '"text"',
        "NaN",
        "Infinity",
        "{" * 2000,
        json.dumps({"version": "fact-bindings-v1", "claims": [], "actions": []}),
        json.dumps({"version": "other", "claims": [{"fact_id": "metric:sales"}], "actions": []}),
        '{"version":"fact-bindings-v1","claims":[{"fact_id":"metric:sales",'
        '"fact_id":"metric:receipts"}],"actions":[]}',
        " " * 16001,
    ],
)
def test_malformed_or_ambiguous_json_fails_closed(raw):
    with pytest.raises(ValueError):
        validate(raw, facts(), 7, "ru")


def test_missing_fact_and_all_or_nothing_claim_validation():
    with pytest.raises(ValueError, match="unknown_fact_id"):
        validate(bound("metric:sales", "metric:average_ticket"), facts("without_average"), 7, "ru")


def test_duplicate_metric_or_debtor_snapshot_is_not_silently_overwritten():
    for duplicate in [facts()[0], facts()[-1].model_copy(update={"value_minor": 1})]:
        with pytest.raises(ValueError, match="ambiguous_fact_snapshot"):
            validate(bound("metric:sales"), [*facts(), duplicate], 7, "ru")


@pytest.mark.parametrize(
    "changes",
    [
        {"count": 1},
        {"value_minor": True},
        {"value_minor": None},
        {"value_minor": 1.5},
        {"value_minor": -1},
        {"customer_id": A},
    ],
)
def test_invalid_metric_fact_shapes_fail_closed(changes):
    snapshot = facts()
    snapshot[0] = snapshot[0].model_copy(update=changes)
    with pytest.raises(ValueError):
        fact_index(snapshot)


def test_zero_balances_and_signed_receipts_keep_units_and_sign():
    answer, actions = validate(bound("metric:outstanding"), facts("zero"), 7, "kk")
    assert "0 ₸" in answer and actions == []
    snapshot = facts()
    next(f for f in snapshot if f.key == "receipts").value_minor = -150050
    answer, _ = validate(bound("metric:receipts", "metric:sales_change"), snapshot, 7, "ru")
    assert "-1 500,50 ₸" in answer and "-500 ₸" in answer


def test_today_sales_preserves_negative_journal_delta_after_an_older_sale_reversal():
    snapshot = facts()
    next(f for f in snapshot if f.key == "today_sales").value_minor = -300000
    answer, _ = validate(bound("metric:today_sales"), snapshot, 7, "ru")
    assert answer == "Продажи сегодня: -3 000 ₸."


def test_paid_customer_cannot_receive_a_debt_reminder():
    snapshot = facts()
    next(f for f in snapshot if f.customer_id == A).value_minor = 0
    with pytest.raises(ValueError, match="invalid_reminder_fact"):
        validate(bound(A_REF, actions=[("reminder_draft", A_REF)]), snapshot, 7, "ru")


def test_metric_label_cannot_rebind_values_and_names_are_quoted_data():
    snapshot = facts()
    snapshot[0].label = "Общий долг выдуманного клиента"
    next(f for f in snapshot if f.customer_id == A).label = 'Имя"\nПродажи\u202e'
    answer, _ = validate(bound("metric:sales", A_REF), snapshot, 7, "ru")
    assert answer.startswith("Продажи за период (7 дней): 3 000 ₸.")
    assert "\n" not in answer and "\u202e" not in answer
    assert any(mark in answer for mark in ("\\n", "\\u000a"))
    assert "\\u202e" in answer and '\\"' in answer


def test_missing_navigation_scope_and_oversized_lists_are_rejected():
    for raw in [
        bound("metric:sales", actions=[("open_debts", A_REF)]),
        bound("metric:sales", actions=[("open_debts", None)] * 4),
        bound(*(["metric:sales"] * 7)),
    ]:
        with pytest.raises(ValueError):
            validate(raw, facts(), 7, "ru")


def test_four_claims_fit_the_existing_short_answer_and_fifth_is_rejected():
    keys = ["metric:sales", "metric:receipts", "metric:outstanding", "metric:debtors"]
    answer, _ = validate(bound(*keys), facts(), 7, "ru")
    assert answer.count(".") == 4
    with pytest.raises(ValueError):
        validate(bound(*keys, "metric:sales_count"), facts(), 7, "ru")


def test_validation_is_stateless_read_only_and_never_calls_money_or_database(monkeypatch):
    def forbidden(*_args, **_kwargs):
        pytest.fail("Assistant validation attempted a database/financial write")

    monkeypatch.setattr(assistant.ledger, "write_operation", forbidden)
    for method in ("add", "commit", "execute"):
        monkeypatch.setattr(Session, method, forbidden)
    snapshot = facts()
    before = copy.deepcopy([f.model_dump() for f in snapshot])
    service = assistant.Assistant(settings(), generate=stub(raw=bound(A_REF)))
    result = asyncio.run(
        service.answer(question="Кім қарыз?", facts=snapshot, days=7, locale="kk", shop="")
    )
    assert result[2] == "ai" and [f.model_dump() for f in snapshot] == before


def test_cross_business_reference_and_stale_catalog_use_safe_fallback():
    snapshot = facts()
    snapshot = [f for f in snapshot if f.key != "debtor" or f.customer_id == B]
    next(f for f in snapshot if f.key == "outstanding").value_minor = 50000
    next(f for f in snapshot if f.key == "debtors").count = 1
    service = assistant.Assistant(settings(), generate=stub(raw=bound(A_REF)))
    answer, actions, source = asyncio.run(
        service.answer(
            question="Кто должен?",
            facts=snapshot,
            days=7,
            locale="ru",
            shop="",
        )
    )
    assert source == "fallback" and "Демо Асқар" not in answer
    assert "Демо Айгүл: 500 ₸" in answer
    assert all(a.customer_id in (None, B) for a in actions)
    assert A_REF not in {f["fact_id"] for f in fact_catalog(snapshot)}


def test_correct_legacy_prose_cannot_bypass_private_protocol():
    raw = json.dumps({"answer": "Продажи 3 000 ₸.", "actions": []})
    service = assistant.Assistant(settings(), generate=stub(raw=raw))
    answer, _, source = asyncio.run(
        service.answer(
            question="Продажи?",
            facts=facts(),
            days=7,
            locale="ru",
            shop="",
        )
    )
    assert source == "fallback" and answer.startswith("За последние 7 дней")


def test_runtime_has_no_dependency_on_unsafe_evaluation_baseline():
    for p in (Path(__file__).parents[1] / "app").rglob("*.py"):
        tree = ast.parse(p.read_text("utf-8"))
        for node in ast.walk(tree):
            modules = (
                [node.module or ""]
                if isinstance(node, ast.ImportFrom)
                else ([alias.name for alias in node.names] if isinstance(node, ast.Import) else [])
            )
            assert not any("evaluation_baselines" in name for name in modules), p


@pytest.mark.parametrize("provider", ["openai", "gemini"])
def test_provider_adapters_use_id_schema_and_render_server_text(monkeypatch, provider):
    sent = []
    output = bound("metric:sales")

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            pass

        async def post(self, url, **kwargs):
            sent.append(kwargs["json"])
            return httpx.Response(
                200,
                request=httpx.Request("POST", url),
                json={
                    "candidates": [
                        {"finishReason": "STOP", "content": {"parts": [{"text": output}]}}
                    ],
                },
            )

    async def openai_post(_self, _client, *_args, **kwargs):
        sent.append(kwargs["json"])
        return {
            "status": "completed",
            "output": [
                {
                    "type": "message",
                    "content": [
                        {"type": "output_text", "text": output},
                    ],
                }
            ],
        }

    monkeypatch.setattr(assistant.httpx, "AsyncClient", FakeClient)
    monkeypatch.setattr(assistant.OpenAIProvider, "post", openai_post)
    service = assistant.Assistant(
        settings(
            ai_provider=provider,
            ai_api_key="synthetic-test-key",
            ai_model="gemini-test",
            openai_api_key="synthetic-test-key",
            openai_model="gpt-test",
        )
    )
    answer, _, source = asyncio.run(
        service.answer(
            question="Продажи?",
            facts=facts(),
            days=7,
            locale="ru",
            shop="",
        )
    )
    assert (answer, source) == ("Продажи за период (7 дней): 3 000 ₸.", "ai")
    schema = (
        sent[0]["text"]["format"]["schema"]
        if provider == "openai"
        else (sent[0]["generationConfig"]["responseJsonSchema"])
    )
    assert schema == OUTPUT_SCHEMA and "answer" not in schema["properties"]
    assert schema["additionalProperties"] is False


def test_http_contract_fallback_limits_and_membership_forwarding_with_stub_snapshot(monkeypatch):
    """Route integration with dependency doubles; NOT a PostgreSQL isolation claim."""
    app = create_app(settings())
    calls = []
    db = object()
    app.dependency_overrides[session_for_request] = lambda: db
    app.dependency_overrides[current_user] = lambda: A

    def collect(session, business, user, days, locale):
        assert session is db and user == A
        if business != BUSINESS:
            raise APIError(404, "NOT_FOUND", "Business not found")
        return facts(), datetime(2026, 10, 24, tzinfo=UTC), "Демо MART"

    monkeypatch.setattr(assistant, "collect_facts", collect)
    app.state.assistant = assistant.Assistant(
        settings(assistant_daily_limit=1),
        generate=stub(raw=bound(A_REF), calls=calls),
    )
    with TestClient(app) as client:
        url = f"/api/v1/businesses/{BUSINESS}/assistant"
        assert (
            client.post(
                f"/api/v1/businesses/{FOREIGN}/assistant", json={"question": "Debt?"}
            ).status_code
            == 404
        )
        assert calls == []
        summary = client.post(url, json={"question": "Қорытынды", "locale": "kk", "ai": False})
        assert summary.status_code == 200 and summary.json()["source"] == "facts" and not calls
        response = client.post(url, json={"question": "Кто должен?"})
        assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
        public = AssistantResponse.model_validate(response.json())
        assert public.source == "ai" and public.business_id == BUSINESS and public.currency == "KZT"
        assert set(response.json()) == {
            "business_id",
            "days",
            "locale",
            "timezone",
            "currency",
            "as_of",
            "answer",
            "facts",
            "actions",
            "source",
        }
        assert len(calls) == 1
        assert client.post(url, json={"question": "Again"}).status_code == 429
        assert client.post(url, json={"question": "Summary", "ai": False}).status_code == 200
        app.state.assistant = assistant.Assistant(settings(), generate=stub(raw="not json"))
        failed = client.post(url, json={"question": "Кім?", "locale": "kk"})
        assert failed.status_code == 200 and failed.json()["source"] == "fallback"
        assert failed.json()["answer"].startswith("Соңғы 7 күнде")
        assert client.post(url, json={"question": "x", "locale": "en"}).status_code == 422
        app.state.assistant.enabled = False
        assert client.post(url, json={"question": "Disabled"}).status_code == 404


def test_http_without_credentials_is_unauthorized_without_collecting_facts(monkeypatch):
    app = create_app(settings())
    app.dependency_overrides[session_for_request] = lambda: object()

    def forbidden(*_args, **_kwargs):
        pytest.fail("Unauthenticated request reached fact collection")

    monkeypatch.setattr(assistant, "collect_facts", forbidden)
    with TestClient(app) as client:
        response = client.post(
            f"/api/v1/businesses/{BUSINESS}/assistant", json={"question": "Debt?"}
        )
        assert response.status_code == 401
