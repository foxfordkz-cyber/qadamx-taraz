# Diploma extension evidence

## Stage 1 — repository audit, 2026-10-24

Base: `origin/main`, **2518b2e80b8c8ef881063a968645382d61aeb37e**.
Working branch: `feature/ml-sales-debt-research`, separate worktree. The previous
seller worktree was clean and remains unchanged. No merge, deployment or production
database access is authorized by this implementation.

`git fetch origin --prune` succeeded. The remote `integration/team-mvp` has been
deleted by the captain (recorded in backend handoff). Its documented historical
head `3d009dc86c93debcab05dedda530b7d1fe62a304` is an ancestor of current main
(`git merge-base --is-ancestor` exit 0); main contains 344 subsequent commits.
This verifies the archived integration, not a claim about a currently existing
remote branch. Main preserves API 0.7.2, collection/aging analytics, registration,
customer recovery, voice, Flutter and share-day-summary. It is the appropriate base.
The branch was created before the supplementary comparison request arrived; no
implementation changes preceded the comparison.

### Verified integration points

- FastAPI/Pydantic, SQLAlchemy/PostgreSQL, Alembic 0001–0008; routes in
  `apps/api/app/routers.py`, money journal in `app/models/__init__.py`.
- Supabase JWT and `ledger.require_membership`: owner-only tenant access, foreign
  business returns 404. Money is integer KZT minor units; local days Asia/Almaty.
- Existing analytics are descriptive 7/30-day snapshots. No trained forecasting
  model, repayment deadline/outcome labels or feedback table exists.
- React/TypeScript/Vite, existing runtime API client, identity-scoped QueryClient,
  shared components and RU/KZ. Add a research screen without replacing analytics.
- Existing Demo fixtures and physical voice reports do not prove ML performance
  or completed interviews. No real eligible research dataset has been supplied.

### Independent stages / acceptance gates

1. Audit: ancestry, clean worktree, schema/contract review (completed; documentation
   diff check before commit).
2. Forecast: deterministic baseline and lightweight regularized regression,
   chronological validation/test, explicit insufficient-data states. Pure tests and
   real isolated PostgreSQL aggregation tests before dependent integration.
3. Debt: explainable rules using current balances, age and repayment facts. No
   overdue/default prediction or financial action. Boundary and isolation tests.
4. Research: consented bilingual feedback, idempotent submission, private paged
   review, additive migration. Validation, persistence and UI tests.
5. Integration: reproducible exports, methods/results documentation, component/E2E,
   full available backend/frontend checks, screenshots, Draft PR.

### Attribution

Existing ledger/Auth/voice/analytics/visual design belongs to the team; see README.
This extension is implemented for Bekzat with Codex assistance. Newly authored
modules, stage commits, checks and limitations will be recorded here. Test fixtures
are synthetic engineering evidence, never user-research or predictive evidence.

## Evidence index

The completed stages will add architecture/ER diagrams, methodology, dataset
description, experiment status, test execution report and capture instructions here.
Real research findings remain **pending** until consented responses and eligible
historical observations exist.

## Stage 2 — forecast service

Added `app/services/forecasting.py`, scoped `research` service/routes/schemas,
contract examples, reproducible `app.evaluate_research` CLI and forecast tests.
Existing endpoints are preserved; API 0.8.0 adds `/businesses/{id}/research/forecast`.
OpenAPI and generated TypeScript were regenerated with the existing commands.
No dependency was added. [Method and dataset definition](forecast-method.md).

Checks: **17/17 pytest** (13 calculation tests + 4 tests against isolated PostgreSQL
17.11 on localhost:55439), scoped ruff, contract export/check and web generate/check
passed. Tests cover local midnight, day-close reversal behavior, empty/missing
data, tenant 401/404, 7/30 evaluation and reproducibility. The first DB test attempt
failed because database creation had not completed; after creating the empty
dedicated `qadam_diploma_test`, all passed. No production database was accessed.
Python/uv and npm dependencies installed from lock files in this worktree.

`synthetic-forecast-7.json` / `synthetic-forecast-30.json` are deterministic
engineering results only. `real-data-status.json` reports `insufficient_data`:
no real eligible dataset was supplied. UI integration follows in stage 5.
