# Stage 8 integration test execution

Date 2026-10-25. Application exactly Stage 7 final 11ee40a, implementation b84b4c7,
integrated on Stage 6 eb954bf. Tool/test source frozen at
92aba501844d777fd7a2175b8a7e72a82ffb09bf. Windows, Python 3.12.14, Node 24.21.0,
Chrome 156.0.8078.47, PostgreSQL 17.11. Locked uv and npm dependencies.
Synthetic local businesses and AI fixtures only.

Committed logs preserve all result/error lines. Only CRLF and trailing blank lines
are normalized for Git; test-execution.json records original-file hashes and
portable LF-normalized log hashes. Original console files remain in local tmp/stage8.

## Final checks

| Command / scope | Passed | Failed/errors | Skipped | Deselected | Evidence |
|---|---:|---:|---:|---:|---|
| Full pytest, real isolated PostgreSQL | 647 | 0 | 0 | 0 | [log](logs/backend.log), [JUnit](logs/backend.xml) |
| Full frontend Vitest, 47 files | 639 | 0 | 0 | 0 | [log](logs/frontend.log) |
| Stage 8 Chrome → real HTTP/API/SQL, retries 0 | 6 | 0 | 0 | 0 | [final log](logs/browser-final.log) |
| Focused live-tool fake-provider tests | 14 | 0 | 0 | 0 | [log](logs/live-tool-final.log) |
| Stage 1 frozen paired validation | 42 cases | 0 new failures | 0 | 0 | [log](logs/stage1-regression-final.log) |
| Stage 7 frozen extraction replay | 100 cases | 1 expected mismatch S7-090 | 0 | 0 | [log](logs/stage7-regression.log) |
| Stage 8 held-out comparison | 120 cases per method | 16 improved-method mismatches | 0 | 0 | [paired results](results-replay/summary.json) |

Stage 1: original TP18/FP19/TN5/FN0; improved TP18/FP0/TN24/FN0.
Stage 7 unchanged 71/100 → 99/100; its known conservative mismatch is retained.
Evaluation mismatches are scientific results, not suppressed unit failures.

Passed exit 0: Ruff check/format, backend export_contracts --check, frontend
check:api, typecheck, lint, format:check, build, git diff --check.
Typecheck/lint/format were repeated after the final risk-readonly E2E assertions.
One existing Starlette/httpx deprecation warning remains. No migration or contract
was changed; the isolated fixture exercises migrations including research feedback.

## Browser/API/SQL acceptance matrix

| Required behavior | Actual check | Result |
|---|---|---|
| Manual sale / partial payment | UI 3000/1000, customer, SQL debt 2000 | Passed |
| AI-assisted text / full payment | Authored provider text draft 1200 fully paid; before-confirm SQL unchanged | Passed, offline provider |
| Grounded Kazakh partial sale | 3000/1000 from fixture, explicit confirmation, SQL delta | Passed |
| Unknown receipt | Mixed phrase yields empty receipt in KZ UI; no write, user clarifies | Passed |
| Customer selection | Tenant-scoped picker / synthetic customer; 14 SQL projection parity cases | Passed for tested scope |
| User confirmation | Draft does not write money; explicit UI confirm required | Passed |
| Persistence | Direct PostgreSQL snapshots and operation rows | Passed |
| Idempotent retry / double-click | One operation, replay same operation ID | Passed |
| Repayment / reversal | 500 repayment reduces debt, reversal preserves signed journal history | Passed |
| Stage 1 factual assistant | Current SQL facts, RU/KZ, scoped IDs, fallback and foreign-business denial | Passed, offline provider |
| Research 7/30 | Chart and held-out MAE rendered in RU/KZ at 360/1440 | Passed on synthetic history |
| Debt-risk readonly | Visible rule-based label and risk item; all-business ledger hash unchanged | Passed |
| Feedback | Consent required; explicit save; SQL record and subsequent display | Passed, synthetic feedback |
| Tenant / logout | Other owner cannot read scoped research/feedback/assistant; foreign access 404 | Passed for fixture identities |
| Error/manual fallback | Malformed provider output preserves input and permits manual form | Passed |

First workflow snapshot: sales 420000, receipts 220000, debt 200000 **tiyn**,
four operations (sale, repayment, reversal, full sale), one feedback row.
Separate extraction assertion: +300000 sales, +100000 receipts, +200000 debt;
double click creates exactly one operation.
[Workflow SQL](workflow-sql.json), [extraction SQL](screenshots/sql-confirmation.json).
These are different snapshots at different test stages; do not add them as final balances.

## Failed setup/invocations retained

1. Focused live-tool initial run: 8 passed, 6 setup errors. Windows denied pytest's
   default user TEMP path (WinError 5). With worktree-local --basetemp, 14 passed.
   [Original failure log](logs/live-tool-tests.log), [successful rerun](logs/live-tool-final.log).
2. Stage 1 was initially invoked with --verify-original, which correctly refuses
   running after the Stage 1 application change. The normal comparison command then
   completed 42 cases. [Original error](logs/stage1-regression.log).
3. Preliminary evaluator selection: 4 passed, 14 deselected before database setup.
   Full pytest later included them, 647 passed. [Log](logs/evaluation-tests.log).
4. First six browser scenarios passed; after adding explicit risk/ledger hash
   assertions all six passed again on a new empty database. Both logs retained.

## Not executed / not established

Paid/live Gemini/OpenAI, live ASR/WER, physical phone/microphone, real Supabase,
production/Preview, real merchant data, independent human annotation and survey.
The historical Stage 6 86-test browser total is not a Stage 8 result.
Other browser configurations and Flutter were not rerun; relevant combined suite is six.
Passing synthetic tests do not resolve the documented OpenAI canonicalization gap,
all unsupported language grammar, or real-world correctness.

Local URLs during tests: frontend http://127.0.0.1:4301, API http://127.0.0.1:8320.
Playwright starts and stops these fixtures; they are not a persistent Preview.
Backend suite DB qadam_stage8_backend_test; final browser DB
qadam_research_browser_stage8_final_test, on isolated 127.0.0.1:55439.
Original worktrees, running older demo services and shared databases were preserved.
