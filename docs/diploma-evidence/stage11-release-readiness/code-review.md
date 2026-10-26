# Focused application review

Reviewer: Codex, AI-assisted source review on the same development history.
**Not an independent human security audit.** No new reproducible blocking production
defect was established in this bounded review; no production fix/refactor was made.
That statement is not proof that the application is vulnerability-free.

| Area / inspected source under apps/api (unless stated) | Observed control / check |
|---|---|
| `app/auth.py`, `config.py` | RS256/ES256, configured HTTPS JWKS, required issuer/audience/time/subject/role, reject anonymous; no token-selected JWKS URL |
| `app/services/ledger.py:require_membership`, routers | Authenticated membership before business reads/writes; foreign entity lookup scoped to business; 401 vs 404 behavior tested |
| `services/customers.py` | Durable user+business+key receipt; advisory transaction lock; same payload replay; conflict on changed body; not_observed is not proof of absence |
| `services/ledger.py:write_operation` | Business lock; append-only journal; body/action hash; idempotency receipt and journal in same transaction; API commits before success |
| Sale/repayment/reversal in ledger | Integer tiyn; received<=total; debt needs customer; remaining balance under lock; reversal restrictions preserve history |
| `services/drafts.py`, `draft_routes.py` | Membership before provider and again before draft save; author/business/expiry/consumption checks; draft endpoint cannot write money |
| `services/ai.py`, `strict_json.py`, `extraction_grounding.py`, `openai_provider.py` | Reject duplicate JSON keys/nonfinite numbers/unknown fields; strict integer amounts; source-span grounding; missing/contradictory payment asks, never invents zero |
| `services/assistant_structured.py`, `assistant.py` | IDs selected from authorized fact snapshot; deterministic RU/KK rendering; values/names not accepted as provider truth; manual fallback |
| `services/research.py`, `forecasting.py` | Business-scoped point-in-time SQL; first partial/current day excluded; chronological train/validation/test; model selection before held-out test |
| `debt_risk.py`, research DTOs | Explainable rules, not default probability; missing due dates explicit; no fabricated supervised outcomes |
| `research_feedback.py`, `research_routes.py`, migration0009 | Consent required; private author scope; unique request UUID; conflict/replay; transaction commit; no-store; DB RLS/default-deny |
| Web `AuthProvider`, runtime, API client | Identity generation guards and scoped caches; business limited to memberships; bearer only for configured API, redirects rejected; logout clears scope |
| Web Sale/Research + prior Stage10 E2E | Explicit confirmation, recovery, insufficient history, rule labels, no automatic money write; current smoke checks actual Research render |

Fresh regression: auth, ledger (including concurrency/rollback/tenant/reversal),
feedback (including concurrency/consent/author privacy), Stage9 raw JSON/PG rejection,
Stage1 semantic grounding and new tooling: 210 passed.
Final tooling plus Stage9 evaluation/approval guards: 25 passed (6 overlapping).
No real provider calls were made. [Test evidence](test-execution.md).

Review boundaries: not a penetration test, dependency CVE audit, managed PostgreSQL
privilege audit, provider prompt-red-team study, physical-device test or load test.
Current-year provider model availability/price was not inferred from configuration
examples. Remaining concrete release constraints are in [findings](security-findings.md).
Known offline failures S7-090 and S8-080/S8-084 are preserved; no benchmark retuning.
