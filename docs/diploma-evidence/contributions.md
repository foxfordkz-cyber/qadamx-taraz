# Change ownership and individual contribution

This is an additive diploma extension requested by Bekzat and implemented with
Codex assistance. This record describes repository work; it does not assign
percentages of the entire team's intellectual contribution or claim that generated
code was handwritten by the diploma author. The author should explain decisions,
review, validation and AI assistance accurately.

Existing Auth, journal/financial safeguards, AI voice, public storefront, mobile,
analytics, CSS system and earlier tests remain team work; owners are in AGENTS.md
and README. This branch reuses them. Backend additions are within the explicit
diploma task; the captain should review before any shared DB rollout.

| Stage | New work | Published implementation commit |
|---|---|---|
| 1 | Repository/branch ancestry audit and evidence gates | 8804795 |
| 2 | Ridge/baselines, daily data read, evaluation CLI, API schemas/examples and tests | 6bdaeb6 |
| 3 | Scoped debt facts, explainable rules, paging and boundary/isolation tests | 45b33ab |
| 4 | Consent form/API/table/migration, per-owner review, safe retries and protocol | b7c4750 |
| 5 | Integrated RU/KZ screen, charts/comparison, evidence/ER, regression/E2E | 4021cf2e9796d59d38cf787cc1e8bea2f8f8fea4 |

Published as [Draft PR #100](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/100),
head feature/ml-sales-debt-research, base main. This publication-only follow-up
records the tested code commit; its own exact hash is available in the branch log.
No merge or deployment is included.

## File/module ownership in this extension

New API modules: research_routes.py, research_schemas.py, research_examples.py,
evaluate_research.py, services/forecasting.py, services/debt_risk.py,
services/research.py, services/research_feedback.py; corresponding test modules;
migration 0009_research_feedback.py.

Modified shared API integration: main.py (router/version/cache policy),
export_contracts.py (new examples), models/__init__.py (one additive feedback model).
The existing ledger service, financial route implementations and old migrations
are not edited.

New web feature: src/features/seller/research/{ResearchPage,FeedbackForm,data,i18n,research.css}.
Shared integration: App.tsx route, layout.tsx secondary link, ru/kk navigation keys,
additive entry links in Customers/AnalyticsPage. Existing Auth/runtime and financial
components are not edited. generated.ts/OpenAPI are regenerated source artifacts,
not independent handwritten contributions.

Tests: research-data/feedback unit components and separate research E2E/config;
existing contract guard now distinguishes fractional MAE/RMSE statistics from
integer monetary fields; navigation expectations include the additional tool.
Two legacy E2E files are aligned with the already accepted main UI: multiple
Demo badges, debt navigation when the assistant feature is disabled, and fixed
read-only summary Demo cards.
No monetary assertion is removed: date, card count, example values, no API writes
and disabled controls are checked. Prettier-only line wrapping is corrected in
dashboard-demo.test.tsx and whatsapp-components.test.tsx (3 insertions/9 deletions).
Those test fixtures and production features remain the original team's work.

Docs: diploma-evidence, ml-evaluation-plan, user-research-plan, RESEARCH_API,
README additive setup, DECISIONS appended decision and seller-web handoff.
Exact path/commit evidence:
```powershell
git log --oneline 2518b2e80b8c8ef881063a968645382d61aeb37e..HEAD
git diff --name-status 2518b2e80b8c8ef881063a968645382d61aeb37e...HEAD
git show --stat <stage-commit>
```

Scientific contribution still pending: acquisition of eligible real data,
consented participants, interpretation of real errors and feedback, independent
replication/peer review. Synthetic test results do not satisfy those items.

## End-to-end follow-up, 2026-10-24 (from 29da962)

New work: fractional-tiyn metric formatting and a read-only customer-sales action
in ResearchPage.tsx/i18n.ts; two component regressions; guarded local browser/SQL
fixture `apps/api/tests/research_browser_server.py`; independent Playwright
research-postgres config and three HTTP/SQL acceptance cases. No backend application,
financial, Auth, migration or contract code changed. Documentation now records
actual Supabase browser login with a local teaching DB, not just mocked UI tests.

Test evidence: 627 unit/component, 47 focused backend, 44 default + 6 research
fixture + 3 real HTTP/SQL E2E passed. New interactive/SQL screenshots and refreshed
Demo captures have explicit provenance in end-to-end-acceptance.md. Actual merchant
data and scientific/user-study results remain absent. This is AI-assisted work
for the diploma author, not a claim of handwritten code or real study participants.

Exact follow-up paths and commits: `git diff --name-status 29da962..HEAD` and
`git log --oneline 29da962..HEAD`; publication SHA is recorded in seller handoff.
