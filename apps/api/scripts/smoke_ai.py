"""Opt-in LIVE Gemini extraction of synthetic fixtures. Does not connect to PostgreSQL."""

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings
from app.errors import APIError
from app.services.ai import GeminiProvider, extract
from app.services.audio import normalize_audio

FIXTURES = Path(__file__).resolve().parents[3] / "docs/team5/fixtures/ai_cases.json"


async def run(ids, pause, fixtures=FIXTURES):
    settings = Settings()
    if not settings.ai_api_key or not settings.ai_model:
        print("NOT RUN: AI_API_KEY and AI_MODEL required in ignored .env")
        return 2
    print(
        json.dumps(
            {
                "provider": "live Gemini",
                "model": settings.ai_model,
                "database": "not used",
                "input": "synthetic text fixtures",
            }
        ),
        flush=True,
    )
    provider = GeminiProvider(settings)
    cases = json.loads(fixtures.read_text(encoding="utf-8"))["cases"]
    cases = [case for case in cases if not ids or case["id"] in ids]
    failed = 0
    for index, case in enumerate(cases):
        if index and pause:
            await asyncio.sleep(pause)
        try:
            result = await extract(
                provider,
                text=case["text"],
                locale="auto" if case["locale"] == "mixed" else case["locale"],
            )
            observed = result.model_dump()
            mismatches = [
                name
                for name, value in case["expected"].items()
                if name in observed and observed[name] != value
            ]
            status = "FAIL" if mismatches else "PASS"
            failed += bool(mismatches)
            print(
                json.dumps(
                    {"id": case["id"], "status": status, "mismatches": mismatches},
                    ensure_ascii=True,
                ),
                flush=True,
            )
        except APIError as error:
            # No provider body, credentials or private data printed. Stop on unavailable quota/key.
            print(json.dumps({"id": case["id"], "status": "ERROR", "code": error.code}), flush=True)
            return 1
    print(
        json.dumps(
            {
                "completed": len(cases),
                "failed": failed,
                "scope": "extraction only; candidate selection/ledger tested separately",
            }
        )
    )
    return 1 if failed else 0


async def run_audio(path, mime, expected_total, expected_received):
    settings = Settings()
    if not settings.ai_api_key or not settings.ai_model:
        print("NOT RUN: AI_API_KEY and AI_MODEL required in ignored .env")
        return 2
    try:
        audio = normalize_audio(path.read_bytes(), mime)
        result = await extract(GeminiProvider(settings), audio=audio)
        matches = (expected_total is None or result.total_minor == expected_total) and (
            expected_received is None or result.received_minor == expected_received
        )
        print(
            json.dumps(
                {
                    "provider": "live Gemini",
                    "model": settings.ai_model,
                    "input": "explicit local audio",
                    "database": "not used",
                    "status": "PASS" if matches else "FAIL",
                    "kind": result.kind,
                    "transcript_present": bool(result.transcript),
                }
            )
        )
        return 0 if matches else 1
    except APIError as error:
        print(json.dumps({"input": "explicit local audio", "status": "ERROR", "code": error.code}))
        return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", required=True)
    parser.add_argument("--ids", nargs="*", help="Fixture IDs; omitted means all cases")
    parser.add_argument("--fixtures", type=Path, default=FIXTURES)
    parser.add_argument("--pause", type=float, default=13, help="Seconds between live requests")
    parser.add_argument(
        "--audio", type=Path, help="Explicit local audio file instead of text cases"
    )
    parser.add_argument("--mime", default="audio/wav")
    parser.add_argument("--expected-total-minor", type=int)
    parser.add_argument("--expected-received-minor", type=int)
    args = parser.parse_args()
    if args.audio:
        action = run_audio(
            args.audio, args.mime, args.expected_total_minor, args.expected_received_minor
        )
    else:
        action = run(args.ids, args.pause, args.fixtures)
    raise SystemExit(asyncio.run(action))
