# Implemented vs planned

[Stabilization update](stabilization-20261024.md): business selection now survives
reload only after current /me validation; unsaved feedback survives internal
navigation in auth-scoped memory, with reload/logout warnings and immutable retry.
No secure durable feedback draft storage or crash recovery is claimed. Production
gates below remain unchanged.

| Capability | Implemented here | Limit / next gate |
|---|---|---|
| Forecast | Tenant-scoped day-close history, 7/30 baseline + ridge, chronological validation/test, chart/table/export | Experimental; >=98/144 complete days; actual-data completeness not verified |
| Reproducible evaluation | Pure deterministic CLI, dataset/code fingerprints, MAE/RMSE, split/config | Real eligible dataset absent; real-world hypothesis untested |
| Debt assessment | Current balance/age/payment facts, explained low/medium/high rules | Not trained ML, not default probability, overdue unknown |
| Debt supervised evaluation | Eligibility/methodology documented; explicit null metrics | Needs due dates, outcomes, maturity/censoring policy and adequate labeled data |
| User feedback | RU/KZ consent/validation, transactional idempotent write, owner-only paged review/export | Migration/retention/contact rollout required; no real responses yet |
| UX | Existing shell/design, empty/loading/error/retry, business/epoch scope, explicit Demo | Local/browser validation; no production release or physical-device claim |
| Database | Additive Alembic 0009 + constraints/RLS/index, exercised on isolated PostgreSQL | Captain-approved shared rollout, backup/recovery and deletion procedures pending |
| Scientific study | Protocol, real-data absence report and clearly synthetic reproducibility fixtures | Recruitment, real experiments, confidence analysis and findings pending |

Follow-up: [end-to-end acceptance](end-to-end-acceptance.md) now verifies actual
FastAPI/PostgreSQL through a browser, plus actual Supabase login against isolated
local SQL. Feedback was persisted and reread, not merely mocked. The dataset is
still synthetic and no real scientific findings are claimed. Hosted API remains
0.7.2 without research routes; branch Preview is behind Vercel authentication.

No manual deployments, real financial writes, AI requests or Supabase settings changes were
performed. No additional runtime dependency or environment variable is required.
The API version is additive 0.8.0; existing app endpoints/financial models remain.
A dedicated /seller/research link is in secondary navigation, Analytics and Customers.

After the authorized push, the repository's existing Vercel integration automatically
reported a successful branch preview. No deploy command was issued; the preview is
not a production release or evidence of live backend/migration acceptance.
