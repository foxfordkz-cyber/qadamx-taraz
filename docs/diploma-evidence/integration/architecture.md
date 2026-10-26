# Integrated architecture — Stage 6

Date: 2026-10-25. Official topic (unchanged): **«Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу»**.

This is an actual local integration, not a production release. React/Vite, FastAPI, PostgreSQL, SQLAlchemy and Alembic are retained. The public API in this checkout is **0.8.0**; the Python package version remains 0.6.2 and is not the API version.

## Verified sources

| Source                  | SHA                                      | Treatment                                     |
| ----------------------- | ---------------------------------------- | --------------------------------------------- |
| origin/main             | 2518b2e80b8c8ef881063a968645382d61aeb37e | Common ancestor; no changes                   |
| Research, PR #100       | 1ece13a1a255e301526af93bb7ac38faeba0b047 | Base of new worktree; source branch untouched |
| Stage 1 implementation  | 6ac5266abddffa7f1278d403ece55cc3eba457a1 | Verified ancestor of delivered bundle         |
| Stage 1 delivery HEAD   | 17f6f6037d6bcc2eadb9711aa2d04f275833a751 | Verified local bundle, imported to FETCH_HEAD |
| Local integration merge | ae43dc25543ab261511c8b5f5982c7dfe8112da8 | Both histories preserved                      |

Branch: `integration/diploma-research-ai-validation`; no upstream and no remote publication. Worktree: `work/qadam-diploma-integration`, beside the original Research checkout.

Stage 1 bundle SHA-256: `604a42b44af530099ae2b2bbddb805b8b252b301fc04c9598bfc754bc66549e1`.
Patch SHA-256: `5174895cddc04253b5c4307ec25d8987066ac4875ea88d603244adb557229e90`.
The bundle requires main 2518b2e and passed `git bundle verify`. Only conflict: appended entries in `docs/DECISIONS.md`; both complete sections were retained. No production code conflict.

## Runtime boundaries

- Normal application: Supabase session → API bearer token → server token verification → business membership. Research and assistant queries are scoped by that business.
- Academic fixture: the **same AuthProvider and server TokenVerifier**, with an ephemeral local ES256 issuer/JWKS. This tests signature, issuer/audience and authorization through HTTP; it does **not** test hosted Supabase login, email callbacks or production credentials.
- The fixture reuses production routers, validation, migrations and SQL. Only provider calls and identity issuance are local test doubles. Its business names explicitly say **OFFLINE QA / AI stub**.
- No real clients, merchant data, audio, paid provider calls or shared database are used.
- Research is calculated on current authorized SQL records; UI values are not hardcoded. Seed history is synthetic and labeled as such.
- No new production feature or visual redesign was necessary: verified implementations integrate without a demonstrated production defect.

## Data and models

Forecasts exclude today and the first possibly partial day. Daily SQL snapshots exclude future reversals from earlier observations, include zero days only within the authoritative recorded period, and cap history at 730 days. Forecasting requires **98 completed days for 7 days**, **144 for 30 days**: 84 train plus one validation and one test horizon. Baseline candidates are rolling mean 7 and seasonal naive 7; ridge regression uses past lags/means/day-of-week. Scaling and selection use training/validation only; test MAE/RMSE do not choose the deployed method. Future recursion uses predicted, never held-out actual, values. Metrics are engineering evidence on synthetic data, not field performance.

Debt risk is an explicit **rule-based review priority**, using open-sale age, remaining fraction and later repayments. It is neither trained ML nor probability of default. No due date or overdue outcome is inferred.

Feedback requires explicit consent, a stable client request ID and server membership. It persists separately from the ledger in migration 0009. Retrieval is limited to the current author/business; private responses use no-store.

Stage 1 requests private structured fact IDs. It rejects unsupported fields, unknown/duplicate IDs, malformed JSON and invalid actions, then renders RU/KZ text from server values. A reminder is draft text, never a sent message. This protects fact associations; it does not establish that the selected answer is relevant or complete for every question.

## Editable diagrams

1. [System](diagrams/system.mmd)
2. [AI sale](diagrams/ai-sale.mmd)
3. [Ledger/debt](diagrams/ledger.mmd)
4. [Research](diagrams/research.mmd)
5. [Fact binding](diagrams/fact-binding.mmd)

These Mermaid sources describe implemented code under `apps/api/app` and `apps/web/src`. They can be rendered by a Mermaid-capable Markdown/editor tool.
