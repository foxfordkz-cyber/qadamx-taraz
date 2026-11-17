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

- [Research stabilization: business selection, unsaved feedback and integration readiness](stabilization-20261024.md).
- [Latest end-to-end acceptance: real API/PostgreSQL and Supabase browser login](end-to-end-acceptance.md).

- [Architecture, data flow and database ER](architecture.md).
- [Dataset provenance and preprocessing](dataset.md), [forecast method](forecast-method.md).
- [Reproducible experiment protocol and comparison](../ml-evaluation-plan.md).
- [Real-data absence report](real-data-status.json).
- [7-day synthetic computation](synthetic-forecast-7.json), [30-day synthetic computation](synthetic-forecast-30.json).
- [Test execution and limitations](test-execution.md).
- [Screenshots and capture/local demonstration guide](capture-guide.md).
- [Implemented vs planned](readiness.md), [file ownership and commits](contributions.md).
- [Consent, recruitment and findings protocol](../user-research-plan.md).

Real research findings remain **pending** until consented responses and eligible
historical observations exist. No real dataset or participant result is invented.

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

## Stage 3 — debt review priority

Added `app/services/debt_risk.py` and paged `/research/debt-risk`; it reads the
current net journal including reversed repayments. Factors: oldest open-sale age,
remaining share of initial credit, observed net later payments on those open sales.
Age 8–30 adds 25; age 31+ adds 50; at least half unpaid adds 20; no net later
payment adds 10. Low <30, medium 30–59, high >=60. These are explicit prototype
rules, not learned weights, overdue labels, credit eligibility or probabilities.
No actions or balances are changed. Due dates/outcomes are absent, so supervised
status is `insufficient_data` and classification metrics are null.

Checks: **18/18 pytest** (12 rule boundaries/invalid facts + 6 PostgreSQL research
tests), scoped ruff and generated contract checks passed. Includes paid/reversed
payment balances, paging, authentication and cross-business denial. Stage 2 commit:
`6bdaeb6`; stage 1: `8804795`. UI integration follows in stage 5.

## Stage 4 — consented feedback

Added `ResearchFeedback`, migration `0009_research_feedback`, POST and private paged
GET `/research/feedback`, bilingual `FeedbackForm` and the [research protocol](../user-research-plan.md).
One request ID per immutable submission, transaction committed before success,
explicit retry after unknown result; no automatic replay. No contact requirement.
JWT + membership + submitting author scope apply to reads. RLS enabled, direct
PUBLIC/anon/authenticated access revoked. The migration was applied/downgraded only
on the isolated test DB; production needs captain rollout and retention process.

Checks: **16/16 PostgreSQL feedback tests**, **7/7 component tests**, TypeScript,
scoped lint/format and generated contract check passed. Initial migration check
found SQLAlchemy parsing a JSON literal as a bind parameter; changed the consent
constraint to `jsonb_build_object` and reran successfully. Test fixture typing was
corrected before the final successful typecheck. Stage 3 commit: `45b33ab`.
No real questionnaire response or participant was collected. Screen navigation,
combined rendering and full regression suite follow in stage 5.

## Stage 5 — integration and reproducible evidence

Integrated `/seller/research`, RU/KZ, 7/30 chart and comparison table, explained
debt factors, feedback/private review/export and independent Demo. Added diagrams,
actual-schema ER, dataset/model methods, implemented/planned distinction, ownership
record and four desktop/mobile browser captures. Existing production Auth,
financial commands, Voice, public storefront and Flutter files are unchanged.

Final own checks: **437 backend tests** on isolated PostgreSQL; **625 unit/component
tests** in 46 files; **6 research E2E**. Default E2E: 43 passed in the full run,
then its one corrected legacy navigation case passed in an isolated rerun. TypeScript,
lint, build, format, generated API, backend lint/format/export and reproducibility
checks passed. See [test execution](test-execution.md) for failed/interrupted attempts,
exact limitations and commands; this is not a claim of live production acceptance.

Real scientific findings and actual feedback collection remain pending. Migration
0009 needs a reviewed shared rollout; no production database, deployment or paid AI
was used. Stages 1–4 are already committed above; final publication is recorded in
the [contribution record](contributions.md) and seller handoff.
