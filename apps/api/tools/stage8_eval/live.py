"""Opt-in live evaluation runner; default dry plan. No database or financial API.

An approval JSON is an operator guard, not cryptographic proof of human consent.
No invocation with --execute is part of Stage8 acceptance.
"""

import argparse
import asyncio
import hashlib
import json
import os
import re
import statistics
import time
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from uuid import UUID

from app.config import Settings
from app.services.ai import SYSTEM_PROMPT, Extraction, GeminiProvider
from app.services.audio import normalize_audio
from app.services.openai_provider import OPENAI_SEMANTICS, OpenAIProvider, output_schema
from tools.stage8_eval.evaluate import ROOT, implementations, load_corpus, run, summarize


def sha(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


def prepare(manifest):
    rows, freeze = load_corpus()
    lookup = {row["id"]: row for row in rows}
    if manifest["provider"] not in {"openai", "gemini"}:
        raise ValueError("Unsupported provider")
    if not 0 < manifest["timeout_seconds"] <= 25:
        raise ValueError("Timeout must be in (0,25]")
    items = manifest["items"]
    if not 1 <= len(items) <= 36 or len({i["id"] for i in items}) != len(items):
        raise ValueError("Use 1..36 unique item IDs")
    requests = 0
    for item in items:
        if (
            item["case_id"] not in lookup
            or lookup[item["case_id"]]["category"] == "malformed_provider"
        ):
            raise ValueError("Live input must reference a frozen non-malformed synthetic case")
        if item["mode"] not in {"text", "audio"}:
            raise ValueError("Unknown modality")
        if item["mode"] == "audio":
            if not item.get("consent_ref") or not item.get("reference_transcript"):
                raise ValueError("Audio requires speaker consent and a reference transcript")
            if not re.fullmatch(r"[a-f0-9]{64}", item.get("audio_sha256", "")):
                raise ValueError("Audio requires a fixed content hash")
            private_audio_path(item["audio_path"])
        requests += 2 if item["mode"] == "audio" and manifest["provider"] == "openai" else 1
    if requests > manifest["max_requests"]:
        raise ValueError("Request budget is smaller than the planned requests")
    reserve = Decimal(str(manifest["reserve_usd_per_request"]))
    budget = Decimal(str(manifest["max_budget_usd"]))
    if not reserve.is_finite() or not budget.is_finite() or reserve < 0 or budget < 0:
        raise ValueError("Finite nonnegative budget required")
    if reserve * requests > budget:
        raise ValueError("Reserved allowance exceeds budget")
    prompts = {
        "system": SYSTEM_PROMPT,
        "openai_semantics": OPENAI_SEMANTICS,
        "schema": output_schema()
        if manifest["provider"] == "openai"
        else Extraction.model_json_schema(),
        "provider_source_sha256": hashlib.sha256(
            (
                ROOT
                / (
                    "apps/api/app/services/openai_provider.py"
                    if manifest["provider"] == "openai"
                    else "apps/api/app/services/ai.py"
                )
            )
            .read_bytes()
            .replace(b"\r\n", b"\n")
        ).hexdigest(),
        "generation": (
            {
                "max_output_tokens": 2048,
                "store": False,
                "background": False,
                "reasoning_none_only_for": "gpt-6-luna",
            }
            if manifest["provider"] == "openai"
            else {
                "maxOutputTokens": 4096,
                "temperature": 0,
                "thinking_low_only_for": ["gemini-3.6-flash", "gemini-3.8-flash"],
            }
        ),
        "input_template": {"locale": "ru|kk|auto", "text": "exact frozen input"},
        "transcription_prompt": (
            "Russian and Kazakh shop speech; preserve the spoken language "
            "including code switching, negations, currencies and amounts. "
            "Теңге, тиын. Do not invent inaudible words."
        ),
    }
    plan = dict(
        manifest=manifest,
        prompts=prompts,
        dataset_hashes=freeze["hashes_lf"],
        implementation=freeze["implementation"],
        planned_provider_requests=requests,
        reserved_allowance_usd=str(reserve * requests),
        cost_is_not_verified_provider_billing=True,
        inputs=[
            {
                "item": i["id"],
                "text": lookup[i["case_id"]]["input"],
                "locale": "auto"
                if lookup[i["case_id"]]["language"] == "mixed"
                else lookup[i["case_id"]]["language"],
            }
            for i in items
        ],
    )
    plan["plan_sha256"] = sha(plan)
    return plan


def private_audio_path(name):
    target = (ROOT / name).resolve()
    allowed = (ROOT / "tmp/stage8-private-audio").resolve()
    if allowed not in target.parents or target.suffix.lower() not in {
        ".wav",
        ".mp3",
        ".ogg",
        ".webm",
        ".m4a",
        ".mp4",
        ".flac",
    }:
        raise ValueError("Consented audio must be under tmp/stage8-private-audio")
    return target


def authorize(plan, approval):
    manifest = plan["manifest"]
    if not approval or approval.get("allow_paid") is not True or not approval.get("approved_by"):
        raise ValueError("Explicit owner approval required before constructing any provider")
    if approval.get("plan_sha256") != plan["plan_sha256"]:
        raise ValueError("Approval does not match this exact plan")
    UUID(approval["approval_id"])
    expires = datetime.fromisoformat(approval["expires_at_utc"].replace("Z", "+00:00"))
    if expires.tzinfo is None or expires <= datetime.now(UTC):
        raise ValueError("Approval expired or timezone missing")
    if not manifest.get("model") or Decimal(str(manifest["reserve_usd_per_request"])) <= 0:
        raise ValueError("Approved exact model and positive reviewed request allowance required")
    if any(i["mode"] == "audio" for i in manifest["items"]) and (
        not approval.get("allow_consented_audio")
        or (manifest["provider"] == "openai" and not manifest.get("transcription_model"))
    ):
        raise ValueError("Separate audio permission/model required")
    return True


def execution_report(plan, results, cases):
    measured = []
    for result in results:
        row = {**cases[result["case_id"]]}
        for version in ("before", "after"):
            row[version] = result.get(
                version,
                {
                    "result": dict(
                        outcome="unavailable",
                        kind=None,
                        total_minor=None,
                        received_minor=None,
                        amount_minor=None,
                        customer_query=None,
                        customer_refs=[],
                        clarification_fields=[],
                    )
                },
            )
        measured.append(row)
    wers = [r["wer"] for r in results if r.get("wer") is not None]
    slots = sum(
        2 if i["mode"] == "audio" and plan["manifest"]["provider"] == "openai" else 1
        for i in plan["manifest"]["items"][: len(results)]
    )
    return dict(
        results=results,
        attempted=len(results),
        failed=sum(r["status"] == "failed" for r in results),
        not_run=[i["id"] for i in plan["manifest"]["items"][len(results) :]],
        billing_usd=None,
        reserved_request_slots=slots,
        plan_sha256=plan["plan_sha256"],
        metrics_attempted={v: summarize(measured, v) for v in ("before", "after")},
        latency_seconds={
            "median": statistics.median(r["seconds"] for r in results) if results else None,
            "n": len(results),
            "includes_failed_attempts": True,
        },
        wer=(sum(w["edits"] for w in wers) / sum(w["reference_words"] for w in wers))
        if wers
        else None,
        wer_audio_n=len(wers),
    )


def provider_for(manifest):
    settings = Settings(
        _env_file=None,
        ai_fallback_openai=False,
        ai_provider=manifest["provider"],
        ai_api_key=os.environ.get("AI_API_KEY"),
        openai_api_key=os.environ.get("OPENAI_API_KEY"),
        ai_model=manifest["model"] if manifest["provider"] == "gemini" else "",
        openai_model=manifest["model"] if manifest["provider"] == "openai" else "",
        openai_transcription_model=manifest.get("transcription_model", ""),
    )
    return (
        OpenAIProvider(settings) if manifest["provider"] == "openai" else GeminiProvider(settings)
    )


def word_error(reference, hypothesis):
    """Tokenized edit distance; only called for authorized audio, never text inputs."""
    a, b = (re.findall(r"\w+", t.casefold()) for t in (reference, hypothesis))
    if not a:
        return None
    previous = list(range(len(b) + 1))
    for i, word in enumerate(a, 1):
        row = [i]
        for j, other in enumerate(b, 1):
            row.append(min(row[-1] + 1, previous[j] + 1, previous[j - 1] + (word != other)))
        previous = row
    return {"edits": previous[-1], "reference_words": len(a), "wer": previous[-1] / len(a)}


async def execute(plan, approval, destination, factory=provider_for, comparators=None):
    authorize(plan, approval)  # Must precede key access/provider construction.
    original, improved = implementations() if comparators is None else comparators
    cases = {row["id"]: row for row in load_corpus()[0]}
    reservations = ROOT / "tmp/stage8-consumed-approvals"
    reservations.mkdir(parents=True, exist_ok=True)
    # Consume the single-run approval atomically, including failed attempts.
    with (reservations / f"{UUID(approval['approval_id'])}.json").open(
        "x", encoding="utf-8"
    ) as marker:
        json.dump({"plan_sha256": plan["plan_sha256"], "destination": str(destination)}, marker)
    provider = factory(plan["manifest"])
    manifest = plan["manifest"]
    results = []
    for item in manifest["items"]:
        case = cases[item["case_id"]]
        audio = None
        if item["mode"] == "audio":
            path = private_audio_path(item["audio_path"])
            if path.stat().st_size > 8 * 1024 * 1024:
                raise ValueError("Audio exceeds 8 MiB")
            content = path.read_bytes()
            if hashlib.sha256(content).hexdigest() != item["audio_sha256"]:
                raise ValueError("Audio changed since approval")
            audio = normalize_audio(content, item["mime"])
        start = time.perf_counter()
        try:
            # Direct generation exactly once. No ProviderPlan fallback or parse retry.
            async with asyncio.timeout(manifest["timeout_seconds"]):
                raw = await provider.generate(
                    text=case["input"] if audio is None else None,
                    audio=audio,
                    locale="auto" if case["language"] == "mixed" else case["language"],
                    retry=False,
                )
            elapsed = time.perf_counter() - start
            replay = {**case, "provider_raw": raw}
            # Audio's authoritative transcript is the adapter transcript, not gold input.
            transcript = json.loads(raw).get("transcript") if audio is not None else None
            if audio is not None:
                if not isinstance(transcript, str):
                    raise ValueError("Missing usable ASR transcript")
                replay["input"] = transcript
            results.append(
                dict(
                    item=item["id"],
                    case_id=case["id"],
                    status="completed",
                    seconds=elapsed,
                    adapter_output=raw,
                    before=await run(original, replay),
                    after=await run(improved, replay),
                    wer=word_error(item["reference_transcript"], transcript)
                    if audio is not None
                    else None,
                )
            )
        except Exception as exc:
            results.append(
                dict(
                    item=item["id"],
                    case_id=case["id"],
                    status="failed",
                    seconds=time.perf_counter() - start,
                    error_type=type(exc).__name__,
                    error_code=getattr(exc, "code", None),
                    wer=None,
                )
            )
            break  # Failed attempt retained; no automatic paid repeat or continuation.
        finally:
            (destination / "results.json").write_text(
                json.dumps(execution_report(plan, results, cases), ensure_ascii=False, indent=2)
                + "\n",
                encoding="utf-8",
            )
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--approval", type=Path)
    args = parser.parse_args()
    target = args.output.resolve()
    if (ROOT / "tmp").resolve() not in target.parents or target.exists():
        parser.error("Use a NEW directory under this worktree's ignored tmp/")
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    plan = prepare(manifest)
    approval = json.loads(args.approval.read_text(encoding="utf-8")) if args.approval else None
    if args.execute:
        authorize(plan, approval)
    target.mkdir(parents=True)
    (target / "plan.json").write_text(
        json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    if args.execute:
        asyncio.run(execute(plan, approval, target))
    print(
        json.dumps(
            {
                "mode": "execute" if args.execute else "dry_run",
                "plan_sha256": plan["plan_sha256"],
                "planned_requests": plan["planned_provider_requests"],
            }
        )
    )


if __name__ == "__main__":
    main()
