# Implemented vs planned

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

No deployments, real financial writes, AI requests or Supabase settings changes were
performed. No additional runtime dependency or environment variable is required.
The API version is additive 0.8.0; existing app endpoints/financial models remain.
A dedicated /seller/research link is in secondary navigation, Analytics and Customers.
