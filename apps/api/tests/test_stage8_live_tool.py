import asyncio
import copy
import json
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from tools.stage8_eval.evaluate import DATA, load_corpus
from tools.stage9_eval.live import authorize, execute, prepare, private_audio_path, word_error


def manifest():
    body = json.loads((DATA / "live-manifest.template.json").read_text(encoding="utf-8"))
    body.update(model="gpt-6-luna", reserve_usd_per_request="0.01", max_budget_usd="0.20")
    body["items"] = body["items"][:2]
    return body


def approval(plan):
    return dict(
        allow_paid=True,
        approval_id=str(uuid4()),
        approved_by="synthetic unit test, NOT live authorization",
        plan_sha256=plan["plan_sha256"],
        expires_at_utc=(datetime.now(UTC) + timedelta(minutes=1)).isoformat(),
    )


def test_default_dry_plan_has_zero_authorized_budget_and_explicit_prompts():
    body = json.loads((DATA / "live-manifest.template.json").read_text(encoding="utf-8"))
    plan = prepare(body)
    assert plan["planned_provider_requests"] == 18
    assert plan["reserved_allowance_usd"] == "0.00"
    assert "integer TIYN" in plan["prompts"]["system"]
    assert plan["cost_is_not_verified_provider_billing"]
    with pytest.raises(ValueError, match="model"):
        authorize(plan, approval(plan))


@pytest.mark.parametrize("fault", ["missing", "hash", "expired", "not_explicit"])
def test_execution_authorization_is_checked_before_provider_construction(tmp_path, fault):
    plan = prepare(manifest())
    agreed = approval(plan)
    if fault == "missing":
        agreed = None
    elif fault == "hash":
        agreed["plan_sha256"] = "wrong"
    elif fault == "expired":
        agreed["expires_at_utc"] = "2000-01-01T00:00:00Z"
    else:
        agreed["allow_paid"] = False
    calls = []
    with pytest.raises(ValueError):
        asyncio.run(execute(plan, agreed, tmp_path, factory=lambda _: calls.append(True)))
    assert calls == []


@pytest.mark.parametrize(
    "field,value",
    [
        ("max_budget_usd", "0.001"),
        ("reserve_usd_per_request", "NaN"),
        ("max_requests", 1),
        ("timeout_seconds", 26),
        ("provider", "unknown"),
    ],
)
def test_invalid_limits_are_rejected(field, value):
    body = manifest()
    body[field] = value
    with pytest.raises(ValueError):
        prepare(body)


def test_one_provider_output_is_replayed_without_second_paid_call(tmp_path):
    body = manifest()
    body["items"] = body["items"][:1]
    plan = prepare(body)
    case = load_corpus()[0][0]

    class Fake:
        calls = 0

        async def generate(self, **kwargs):
            self.calls += 1
            assert kwargs["retry"] is False and kwargs["audio"] is None
            return case["provider_raw"]

    fake = Fake()
    agreed = approval(plan)
    result = asyncio.run(execute(plan, agreed, tmp_path, factory=lambda _: fake))
    assert fake.calls == 1 and result[0]["before"]["provider_calls"] == 1
    assert result[0]["after"]["provider_calls"] == 1 and result[0]["wer"] is None
    stored = json.loads((tmp_path / "results.json").read_text(encoding="utf-8"))
    assert stored["billing_usd"] is None and stored["not_run"] == []
    assert (
        stored["attempted"] == 1
        and stored["metrics_attempted"]["after"]["full_all"]["denominator"] == 1
    )
    assert stored["wer"] is None
    with pytest.raises(FileExistsError):
        asyncio.run(execute(plan, agreed, tmp_path, factory=lambda _: fake))
    assert fake.calls == 1


def test_timeout_retains_failure_and_leaves_remaining_items_not_run(tmp_path):
    body = manifest()
    body["timeout_seconds"] = 0.01
    plan = prepare(body)

    class Fake:
        calls = 0

        async def generate(self, **kwargs):
            self.calls += 1
            await asyncio.sleep(1)

    fake = Fake()
    result = asyncio.run(execute(plan, approval(plan), tmp_path, factory=lambda _: fake))
    assert fake.calls == 1 and result[0]["status"] == "failed"
    assert result[0]["error_type"] == "TimeoutError"
    assert json.loads((tmp_path / "results.json").read_text())["not_run"] == ["text-02"]


def test_audio_requires_consent_reference_and_cannot_point_at_secrets():
    body = manifest()
    body["items"][0].update(mode="audio")
    with pytest.raises(ValueError, match="consent"):
        prepare(body)
    for path in ("../../.env", "tmp/stage8-private-audio/../.env", "https://audio.example/a.wav"):
        with pytest.raises(ValueError):
            private_audio_path(path)
    body["items"][0].update(
        consent_ref="synthetic-test-only",
        reference_transcript="Тест",
        audio_sha256="a" * 64,
        audio_path="tmp/stage8-private-audio/synthetic.wav",
    )
    body["max_requests"] = 3
    plan = prepare(body)
    assert plan["planned_provider_requests"] == 3
    with pytest.raises(ValueError, match="audio"):
        authorize(plan, approval(plan))


def test_wer_arithmetic_is_not_a_claim_of_speech_accuracy():
    assert word_error("Әлібек төледі", "әлібек төледі")["wer"] == 0
    assert word_error("Әлібек мың төледі", "Әлібек екі мың төледі")["edits"] == 1
    assert word_error("", "мәтін") is None
    body = manifest()
    changed = copy.deepcopy(body)
    changed["model"] = "gpt-test-version"
    assert prepare(body)["plan_sha256"] != prepare(changed)["plan_sha256"]
