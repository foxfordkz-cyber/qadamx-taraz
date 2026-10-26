"""Read-only source/worktree inventory. Run from apps/api."""

import argparse
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
BASE = "e825dd9a9568dda33a9226e1941e789fd21d2175"
STAGES = {
    "stage6": "eb954bf7c2c6b1d18bf360e436ccf12bdbde30dd",
    "stage7": "11ee40a77a2ff8de3c64818af9d9438b9e23fdf1",
    "stage8": "08fd3eef541c6ab47f1d44e79d38778eefd2c784",
    "stage9": "a921b3f4d6d45a44d4529fb3045888f850cf9018",
}


def git(*args, root=ROOT):
    return subprocess.check_output(
        ["git", "-C", str(root), *args], text=True, encoding="utf-8"
    ).strip()


def inventory():
    trees = []
    for block in git("worktree", "list", "--porcelain").split("\n\n"):
        path = block.splitlines()[0].removeprefix("worktree ")
        trees.append(
            {
                "path": path,
                "head": git("rev-parse", "HEAD", root=path),
                "branch": git("branch", "--show-current", root=path),
                "status": git("status", "--short", root=path).splitlines(),
            }
        )
    return {
        "recorded_utc": datetime.now(UTC).isoformat(),
        "candidate": BASE,
        "review_head": git("rev-parse", "HEAD"),
        "branch": git("branch", "--show-current"),
        "origin_main": git("rev-parse", "origin/main"),
        "main_candidate_counts": git(
            "rev-list", "--left-right", "--count", f"origin/main...{BASE}"
        ),
        "ancestry": {
            name: {
                "sha": sha,
                "is_ancestor": subprocess.run(
                    ["git", "merge-base", "--is-ancestor", sha, BASE], cwd=ROOT
                ).returncode
                == 0,
            }
            for name, sha in STAGES.items()
        },
        "local_only_commits": git(
            "rev-list", "--reverse", BASE, "--not", "--remotes=origin"
        ).splitlines(),
        "candidate_commits_after_main": git(
            "log", "--reverse", "--format=%H %s", f"origin/main..{BASE}"
        ).splitlines(),
        "candidate_changed_files": git(
            "diff", "--name-status", f"origin/main...{BASE}"
        ).splitlines(),
        "remote_heads": git(
            "for-each-ref", "--format=%(refname:short) %(objectname)", "refs/remotes/origin"
        ).splitlines(),
        "worktrees": trees,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(inventory(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
