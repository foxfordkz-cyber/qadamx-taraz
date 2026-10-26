"""Stage9 opt-in live wrapper. Dry by default; inherits approval/budget/privacy guards."""

import argparse
import asyncio
import json
from pathlib import Path

from tools.stage8_eval import live as guarded
from tools.stage8_eval.evaluate import ROOT, git
from tools.stage9_eval.evaluate import BASE, implementations, source_hashes

authorize = guarded.authorize
private_audio_path = guarded.private_audio_path
word_error = guarded.word_error


def prepare(manifest):
    plan = guarded.prepare(manifest)
    plan.pop("plan_sha256")
    plan["baseline_commit"] = BASE
    plan["implementation"] = "Stage9 exact source hashes"
    plan["prepared_at_commit"] = git("rev-parse", "HEAD")
    plan["implementation_source_hashes_lf"] = source_hashes()
    plan["scientific_status"] = (
        "Known synthetic cases; not blind or independent real-world evaluation"
    )
    plan["plan_sha256"] = guarded.sha(plan)
    return plan


async def execute(plan, approval, destination, factory=guarded.provider_for):
    guarded.authorize(plan, approval)
    if plan.get("implementation_source_hashes_lf") != source_hashes():
        raise ValueError("Source changed after plan approval")
    return await guarded.execute(
        plan, approval, destination, factory=factory, comparators=implementations()
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--approval", type=Path)
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    target = args.output.resolve()
    if (ROOT / "tmp").resolve() not in target.parents or target.exists():
        parser.error("Use a NEW directory under this worktree's ignored tmp/")
    plan = prepare(json.loads(args.manifest.read_text(encoding="utf-8")))
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
