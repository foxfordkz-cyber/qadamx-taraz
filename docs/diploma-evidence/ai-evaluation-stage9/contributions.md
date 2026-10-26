# Contribution register

Codex implementation under the user's Stage 9 assignment, 2026-10-25.
This register describes new work, not ownership of prior contributors' modules.

| Local commit | Work |
|---|---|
| fe4e73f5723c46d6b308c6b1115327d881611db9 | Save pre-edit baseline, freeze hashes and evaluation protocol |
| fa73fe4999c0201626643be7eaf9d2667dc328ef | Four runtime files, strict JSON/grammar fixes, regressions, evaluator, dry live wrapper and browser acceptance |
| Subsequent documentation commit | Actual results/logs/screenshots, full regression analysis, independent annotation protocol, reproduction, backend handoff and decision |

Get the evidence commit: git log -1 --format=%H -- docs/diploma-evidence/ai-evaluation-stage9/README.md.
The final delivery reports the exact final HEAD; a commit cannot contain its own
hash without changing that hash.

## Committed implementation and baseline paths

- apps/api/app/services/ai.py
- apps/api/app/services/extraction_grounding.py
- apps/api/app/services/openai_provider.py
- apps/api/app/services/strict_json.py
- apps/api/tests/stage9_browser_server.py
- apps/api/tests/test_stage8_evaluation.py
- apps/api/tests/test_stage8_live_tool.py
- apps/api/tests/test_stage9_evaluation.py
- apps/api/tests/test_stage9_extraction.py
- apps/api/tests/test_stage9_postgres.py
- apps/api/tools/stage8_eval/live.py
- apps/api/tools/stage9_eval/evaluate.py
- apps/api/tools/stage9_eval/live.py
- apps/web/e2e/stage9.acceptance.ts
- apps/web/e2e/stage9.playwright.config.ts
- docs/diploma-evidence/ai-evaluation-stage9/baseline-freeze.json
- docs/diploma-evidence/ai-evaluation-stage9/baseline-stage7/cases.json
- docs/diploma-evidence/ai-evaluation-stage9/baseline-stage7/summary.json
- docs/diploma-evidence/ai-evaluation-stage9/baseline-stage8/cases.csv
- docs/diploma-evidence/ai-evaluation-stage9/baseline-stage8/cases.jsonl
- docs/diploma-evidence/ai-evaluation-stage9/baseline-stage8/summary.json
- docs/diploma-evidence/ai-evaluation-stage9/evaluation-protocol.md


## Documentation scope

All new Stage 9 evidence is under docs/diploma-evidence/ai-evaluation-stage9/.
Only append Stage 9 material to docs/handoffs/backend.md and docs/DECISIONS.md.
The exact artifact list and hashes are in artifact-manifest.json.

## Preserved

Stage 1/7/8 frozen datasets and original Stage 8 reports; financial ledger and
balances; migrations/shared DB; Auth and tenant logic; public/seller frontend
production source and RU/KZ design; research forecasting, debt assessment and
feedback implementation; external API/OpenAPI/generated types; original Stage 8
worktree; PR #100; independent Word diploma documents.

Only synthetic test DB fixtures contain newly saved operations. No real merchant
data, recording, consent record, participant or independent reviewer was created.
The user/diploma author must describe Codex assistance and their own verification
accurately; known-set test results are not an independently conducted experiment.
