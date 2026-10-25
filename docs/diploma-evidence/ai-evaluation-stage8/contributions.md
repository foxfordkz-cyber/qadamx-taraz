# Stage 8 provenance and contribution boundaries

Authoring assistance: Codex, on the user's Stage 8 instruction, 2026-10-25.
No named student's sole authorship is inferred. Existing team contributions remain
attributed through original Git commits.

## Original work preserved

- Stage 6 eb954bf7c2c6b1d18bf360e436ccf12bdbde30dd (application ae43dc2):
  integration, ledger, Research, factual assistant, Auth and UI.
- Stage 7 0313038 (development dataset), b84b4c7 (runtime extraction),
  11ee40a (evidence). Fast-forwarded unchanged into the new worktree.
- Research feature branch 1ece13a1a255e301526af93bb7ac38faeba0b047 already lies
  in Stage 6 history; no duplicate merge. Path overlap with Stage 7 was DECISIONS.md.
- Stage 6's uncommitted demo-scenarios.md was left in its original worktree.
  PR #100 and original branches were not modified.

## New Stage 8 work

| Commit | Content |
|---|---|
| 071ae3ef7b0a1db0091c31ff6b762d16226f91b8 | Synthetic constructed holdout, gold, protocol and hash freeze before evaluation |
| 92aba501844d777fd7a2175b8a7e72a82ffb09bf | Paired evaluator, opt-in live tool, 32 new backend tests, combined browser fixture/config and risk readonly assertion |
| Evidence commit: git log -1 --format=%H -- docs/diploma-evidence/ai-evaluation-stage8/README.md | First results plus exact-commit replay, analysis, screenshots, logs, handoff and decisions |

New modules: apps/api/tools/stage8_eval/{build_corpus,evaluate,live}.py.
New tests/fixture: test_stage8_evaluation.py (18), test_stage8_live_tool.py (14),
stage8_browser_server.py and e2e/stage8.playwright.config.ts.
Existing e2e/diploma.acceptance.ts and extraction.acceptance.ts receive only
isolated URL/evidence overrides; diploma also asserts visible risk and no ledger mutation.

All other new content is evidence under this directory. Backend handoff and
DECISIONS record the findings. [Exact Stage 8 changed-file list](changed-files.txt)
excludes inherited Stage 7 changes. Runtime apps/api/app, apps/web/src, mobile,
contracts, migrations and dependency locks are unchanged from Stage 7 final.

Codex produced code, synthetic annotations and numerical analysis. The diploma
student must independently review language/gold and justify methodology/limits.
No claim of independent participants, real merchant dataset, live model accuracy
or measured business benefit is included.
