"""Frozen acceptance packet rehearsal with explicit provider doubles. No live AI."""

import argparse
import asyncio
import hashlib
import json
from pathlib import Path

from app.assistant_schemas import AssistantFact
from app.config import Settings
from app.errors import APIError
from app.services.ai import extract
from app.services.assistant import Assistant

ROOT = Path(__file__).resolve().parents[4]
PACKET = ROOT / "docs/diploma-evidence/stage14-auth-staging/live-ai-asr-test-cases.json"


class OfflineProvider:
    max_attempts = 1

    def __init__(self, raw):
        self.raw = raw

    async def generate(self, **kwargs):
        return self.raw


async def run_case(case):
    if case["level"] == "assistant-factual":
        facts = [
            AssistantFact(key=k.removesuffix("_minor"), label=k, value_minor=v)
            for k, v in case["synthetic_facts"].items()
        ]
        facts += [
            AssistantFact(key="debtors", label="debtors", count=1),
            AssistantFact(key="sales_count", label="sales_count", count=1),
            AssistantFact(key="sales_change", label="sales_change", value_minor=0),
        ]

        async def wrong_provider(*args):
            return '{"answer":"Вам должны 2000 ₸","actions":[]}'

        answer, _, source = await Assistant(Settings(_env_file=None), wrong_provider).answer(
            question=case["text"], facts=facts, days=7, locale="ru", shop="Synthetic shop"
        )
        compact = "".join(answer.split())
        return {
            "id": case["id"],
            "pass": source == "fallback" and "1500" in compact and "2000" not in compact,
            "source": source,
            "answer": answer,
        }
    raw = case.get("raw") or json.dumps(case["offline_provider_payload"], ensure_ascii=False)
    try:
        result = await extract(OfflineProvider(raw), text=case.get("text", ""))
    except APIError as exc:
        return {"id": case["id"], "pass": exc.code == case.get("expected_error"), "error": exc.code}
    expected = case.get("expected", {})
    actual = {key: getattr(result, key) for key in expected}
    return {"id": case["id"], "pass": bool(expected) and actual == expected, "actual": actual}


def evaluate():
    content = PACKET.read_bytes().replace(b"\r\n", b"\n")
    digest = hashlib.sha256(content).hexdigest()
    if digest != PACKET.with_suffix(".sha256").read_text().split()[0]:
        raise ValueError("Frozen packet checksum mismatch")
    data = json.loads(content)
    rows = [asyncio.run(run_case(case)) for case in data["cases"]]
    return {
        "evidence_level": "offline-provider-response-validation",
        "live_provider_calls": 0,
        "asr_calls": 0,
        "dataset_sha256": digest,
        "passed": sum(row["pass"] for row in rows),
        "total": len(rows),
        "cases": rows,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = evaluate()
    args.output.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    print(json.dumps({k: v for k, v in result.items() if k != "cases"}))
    raise SystemExit(0 if result["passed"] == result["total"] else 1)


if __name__ == "__main__":
    main()
