# Stage 9 integration and verification

Local Windows environment: Python 3.12.14, Node 24.21.0, Chrome 156.0.8078.47,
PostgreSQL 17.11. Production source equals commit
`fa73fe4999c0201626643be7eaf9d2667dc328ef`.
Tests ran before that commit on the same source; the evaluation was replayed after
commit with exact source hashes. Documentation changes do not alter application code.

## Final results

Commands run from apps/api unless marked apps/web. Full commands/environment in
[reproduction](reproduction.md). Logs retain actual command output.

| Check | Actual result | Evidence |
|---|---|---|
| Full pytest with TEST_DATABASE_URL | 723 passed, 0 failed/skipped, 530.70 s | logs/backend.log; backend.xml |
| Supplementary extraction before edits | 21 failed, 30 passed (intentional red baseline) | logs/supplementary-before.log |
| Focused first corrected suite | 192 passed, 3 PostgreSQL tests deselected | logs/focused-first.log |
| Tool/decoder checks | 88 passed, 14 PostgreSQL tests deselected | logs/tool-tests.log |
| Full Vitest, apps/web, final sequential run | 639 passed / 47 files, 171.97 s | logs/frontend-final.log |
| Chrome combined acceptance, apps/web | 8 passed, 2.8 min, retries 0 | logs/browser-final.log |
| Stage 8 paired replay via Stage 9 evaluator | 104/120 → 118/120; original baseline reproduced | results-final; logs/evaluation-final.log |
| Frozen Stage 7 replay | 99/100 unchanged | stage7-after |
| Frozen Stage 1 replay | TP18/TN24/FP0/FN0, 42 cases | stage1-after |
| Ruff check + changed-file format check | Passed; 13 formatted files | logs/ruff-final.log; ruff-format-final.log |
| Backend export_contracts --check | Passed | logs/export-contracts.log |
| Web check:api, typecheck, lint, format:check | All exit 0 | logs/web-checks.json and corresponding logs |
| Web build | Passed; existing >500 kB chunk warning | logs/web-build.log |
| Frozen artifact hash verification | Passed | evidence-verification.json |
| Live runner dry plan | Passed, no provider construction/calls | live-dry-plan.json; logs/live-final.log |

Focused-suite deselections were subsequently covered by the full 723-test run;
they are not reported as SQL passes on their own. Stage 7 and Stage 8 remaining
gold mismatches are evaluator outcomes, not hidden test skips.

## Initial failures retained

1. Before production changes, 21/51 new supplementary assertions failed. They
   identify lost duplicate keys and source-grammar/context gaps. All pass after
   changes as part of the full suite.
2. Initial Ruff found three E501 line-length issues; formatting corrected them.
3. First browser setup failed before tests because the new synthetic OpenAI model
   string `fixture-only` violated existing Settings' `gpt-` prefix validation.
   The test fixture now uses `gpt-fixture-only`. No model is contacted.
4. The next browser run had 7 passes and one 180-second whole-test timeout at
   feedback reload. It had already saved the feedback. Concurrent full pytest,
   Vitest and static/build runs were active. Initial Vitest also had two 5-second
   timeouts: analytics-redesign's facts/business workflow and qa-auth-regression's
   mock login; 637 other tests passed.
5. With heavy suites run sequentially and a NEW empty browser database, all eight
   browser cases passed with unchanged 180-second timeout (whole workflow 1.1 min).
   All 639 frontend tests then passed with unchanged timeout. No test was skipped,
   retried by Playwright, weakened or given a larger time limit. The observed
   duration drop is consistent with resource contention, not proof of a unique
   underlying timing cause.

Initial logs: browser-first.log, browser-second.log, frontend.log; failing browser
context: logs/browser-second-error-context.md. No production change was made in
response to these timeouts.

Warnings retained: Starlette/httpx TestClient deprecation; existing jsdom canvas
not-implemented diagnostics in passing public-site tests; Vite large chunks.
No dependency upgrade or unrelated UI change was made.

## Genuine local browser/API/SQL coverage

| Scenario | Observed boundary |
|---|---|
| Local login, membership, customer create | Real JWT verifier and production API, local synthetic issuer |
| Draft from offline provider | No operation until explicit UI confirmation |
| Sale 3000/1000 | Debt 2000; retry same idempotency key does not add operation |
| Repayment 500 | Debt 1500; original sale selected |
| Reversal of repayment | Debt 2000; append-only journal preserved |
| Fully paid manual sale 1200 | Workflow snapshot sales 4200, receipts 2200, debt 2000 |
| Stage 1 assistant RU/KZ | Real SQL facts and structured binding; malformed output fallback; no writes |
| Research forecast/risk | Real synthetic SQL history, data/insufficient-data states, RU/KZ 360/1440 px |
| Feedback | Consent, server save, SQL count, reload/read-back, other-owner isolation |
| KK partial payment | Faulty provider paid label corrected; explicit save and double-click protection |
| Unknown mixed-language payment | Empty received field and clarification, mobile KZ |
| Duplicate common provider JSON | 503/manual fallback, input retained, ledger unchanged |
| Stage 9 receipt/genitive | Correct 2715/915, two local candidates, foreign same-name excluded |
| Stage 9 OpenAI inner duplicate | Real inner decoder rejects; no draft success or ledger change |

The eight browser tests combine multiple assertions. New PostgreSQL tests also
verify raw-envelope/inner/extra/malformed output rejection, 401/404 before provider,
no saved draft/operation on invalid output, tenant-scoped candidate ambiguity,
idempotency, repayment, reversal and no validation-error paid fallback.

## Test data and limits

Backend DB: qadam_stage9_backend_test on dedicated loopback port 55439.
Browser attempt DBs: qadam_research_browser_stage9_test (setup error),
qadam_research_browser_stage9_retry_test (timeout),
qadam_research_browser_stage9_final_test (complete pass). Each was newly created;
old test databases were preserved, not reset for a rerun. No shared/production DB.

Browser API 8321 and Vite 4302 were started by Playwright and stopped afterward.
Existing Stage 6/8 services were not modified. External browser requests were
blocked. The visible “Рабочие данные” mode denotes the API path, not real merchant
data: the selected business explicitly says OFFLINE Stage9 · synthetic provider.

Not run: real OpenAI/Gemini inference, ASR, physical microphones/devices, live
Supabase, production/Preview acceptance and independent human annotation.
No live/model accuracy, WER, latency, human agreement or actual spend is claimed.
