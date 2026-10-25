import asyncio
import json

import pytest

from app.services.strict_json import strict_json_object
from tools.stage8_eval.evaluate import load_corpus, run
from tools.stage9_eval.evaluate import implementations, verify_baseline
from tools.stage9_eval.live import execute, prepare


@pytest.mark.parametrize(
    "raw",
    [
        '{"outer":{"a":1,"a":2}}',
        '{"items":[{"payment":10,"payment":20}]}',
        '{"x":1,"\\u0078":2}',
        '{"x":NaN}',
        '{"x":Infinity}',
        '{"x":-Infinity}',
        '{"x":1e400}',
        '{"x":1} trailing',
        '{"x":}',
        "[1,2]",
        "null",
        '{"x":1,}',
        {"x": 1},
        b'{"x":"\xff"}',
    ],
)
def test_strict_decoder_rejects_nested_duplicates_malformed_and_lossy_objects(raw):
    with pytest.raises(ValueError):
        strict_json_object(raw)


@pytest.mark.parametrize(
    "raw",
    [
        '{"nested":{"x":1},"other":{"x":2}}',
        '{"items":[{"x":1},{"x":2}],"decimal":1.25,"name":"Әсел"}',
        b'{"ok":true,"value":null}',
    ],
)
def test_strict_decoder_accepts_legitimate_metadata_objects(raw):
    assert isinstance(strict_json_object(raw), dict)


def test_historical_module_keeps_its_own_grounding_and_all_prechange_results():
    verify_baseline()
    old, current = implementations()
    assert old.__globals__["ground_extraction"] is not current.__globals__["ground_extraction"]
    from tools.stage9_eval.evaluate import DATA

    saved = {
        r["id"]: r["after"]
        for r in map(
            json.loads,
            (DATA / "baseline-stage8/cases.jsonl").read_text(encoding="utf-8").splitlines(),
        )
    }

    async def compare():
        for case in load_corpus()[0]:
            assert await run(old, case) == saved[case["id"]]

    asyncio.run(compare())


def test_stage9_live_plan_binds_new_source_without_paid_execution(tmp_path):
    from tools.stage8_eval.evaluate import DATA

    plan = prepare(json.loads((DATA / "live-manifest.template.json").read_text(encoding="utf-8")))
    assert len(plan["implementation_source_hashes_lf"]) == 4
    calls = []
    with pytest.raises(ValueError, match="approval"):
        asyncio.run(execute(plan, None, tmp_path, factory=lambda _: calls.append(True)))
    assert calls == []
