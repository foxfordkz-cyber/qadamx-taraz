# Combined test report — Stage 6, 2026-10-25

**526 backend + 639 frontend unit/component + 86 distinct E2E passed. Final runs: 0 failures, 0 skipped.** This is local integration acceptance with synthetic data and offline providers, not production/live AI acceptance.

Application source: `ae43dc25543ab261511c8b5f5982c7dfe8112da8`.
New test/demo content committed as `3c9ed301a0e0d087298b0fb80b558f527d8b75d3` (the same files were present while running).
Original sources: Research `1ece13a`, Stage 1 delivery `17f6f60`, implementation `6ac5266`, main `2518b2e`.
[Machine-readable counts/environment](test-results.json).

## Environment and isolation

Windows, Node 24.21.0, npm 11.19.0, Python 3.12.14, PostgreSQL 17.11. SQL suites use installed Chrome 156.0.8078.47; ordinary E2E uses Playwright Chromium. One browser worker, zero configured retries. Test PostgreSQL is loopback 127.0.0.1:55439, separate new databases. No shared/production migrations, Supabase changes, live provider calls or real customer records.

Dependency setup actually completed: `npm ci --no-audit --no-fund`; `.venv/Scripts/uv.exe sync --locked`. A Python 3.12 venv/uv was installed locally because uv was not on PATH.

## Commands and actual results

Commands below run from **apps/api** unless marked web.

| Command                                                                                                                                                            | Result                                   | Scope                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `.venv/Scripts/python.exe -m pytest -q --tb=short --basetemp ../../tmp/stage6/pytest-combined --junitxml=../../tmp/stage6/backend-combined.xml`                    | **526 passed**, 300.48 s; 0 errors/skips | Full backend including PostgreSQL, auth, ledger, contracts, drafts, assistant, Research, migration, public/mobile API |
| `.venv/Scripts/ruff.exe check .`                                                                                                                                   | Passed                                   | Full API lint                                                                                                         |
| `.venv/Scripts/ruff.exe format --check .`                                                                                                                          | Passed, 96 files                         | Full API formatting                                                                                                   |
| `.venv/Scripts/python.exe tools/diploma_eval/evaluate_stage1.py --output-dir ../../docs/diploma-evidence/integration/experiments`                                  | 42 paired cases evaluated                | Frozen synthetic comparison; zero live AI calls                                                                       |
| `.venv/Scripts/python.exe -m app.evaluate_research --synthetic --horizon 7 --output ../../docs/diploma-evidence/integration/experiments/forecast-synthetic-7.json` | Experimental result generated            | Explicit synthetic deterministic series                                                                               |
| Same command with horizon 30 / forecast-synthetic-30.json                                                                                                          | Experimental result generated            | Explicit synthetic deterministic series                                                                               |
| Same command with `--empty --horizon 30` / forecast-empty-30.json                                                                                                  | insufficient_data                        | No invented metrics                                                                                                   |
| Web: `npm.cmd test -- --maxWorkers=1`                                                                                                                              | **639 passed**, 47 files, 198.38 s       | Complete unit/component suite                                                                                         |
| Web: `npm.cmd run check:api`                                                                                                                                       | Passed                                   | Reproducible generated contracts                                                                                      |
| Web: `npm.cmd run typecheck`                                                                                                                                       | Passed                                   | TypeScript                                                                                                            |
| Web: `npm.cmd run lint`                                                                                                                                            | Passed                                   | ESLint                                                                                                                |
| Web: `npm.cmd run format:check`                                                                                                                                    | Passed                                   | Prettier source/E2E/config                                                                                            |
| Web: `npm.cmd run build`                                                                                                                                           | Passed                                   | Production bundle built locally; not deployed                                                                         |
| `git diff --check`                                                                                                                                                 | Passed                                   | Final whitespace review                                                                                               |

Backend environment:
`TEST_DATABASE_URL=postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_stage6_backend_test`.
Guard comparison only:
`DATABASE_URL=postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_stage6_not_used`.
The second DB is deliberately unused/nonexistent; the fixture directs tests to TEST_DATABASE_URL after isolation checks. Use new empty test DBs and a basetemp inside the worktree.

Research subset within 526: forecasting 13, debt rules 12, API 6, feedback 16 = **47**. Assistant/semantic subset: 24 + 89 = **113**, including the frozen cases, response policy, unknown IDs, malformed output, reminders, RU/KZ and PostgreSQL checks. These subsets are not additional tests to add to 526.

### Browser commands, from apps/web

All use `npx.cmd playwright test -c <config> --reporter=line`.

| Config                                     | Passed | Evidence boundary                                                                 |
| ------------------------------------------ | -----: | --------------------------------------------------------------------------------- |
| playwright.config.ts                       |     44 | General seller/public/analytics UI, read-only demo and intercepted API fixtures   |
| e2e/research.playwright.config.ts          |      6 | Research UI fixtures; empty/error/retry, no stale graphs, responsive RU/KZ        |
| e2e/assistant.playwright.config.ts         |      6 | Assistant UI, keyboard/focus/clipboard/fallback/demo; provider/API fixtures       |
| e2e/assistant-qa.playwright.config.ts      |     13 | Pending/error/retry/429, facts, reminder actions, stale period/business responses |
| e2e/cabinet-ai-first.playwright.config.ts  |     10 | Dashboard, panel, focus, cancellation, RU/KZ, narrow 200% text                    |
| e2e/research-postgres.playwright.config.ts |      4 | **Real HTTP + signed local JWT + PostgreSQL**, loss/replay/consent/isolation      |
| e2e/diploma.playwright.config.ts           |      3 | **Real full seller workflow + SQL**, offline provider boundary, desktop/mobile    |
| Total distinct tests                       | **86** | No failures or skips in final runs                                                |

The original SQL suite used `qadam_research_browser_stage6_research_test`; final new suite used `qadam_research_browser_stage6_final_test`. Export the appropriate RESEARCH_TEST_DATABASE_URL before launch, as in [demo instructions](demo-scenarios.md). Test servers use localhost 8316/4297 and refuse an existing listener/nonempty fixture DB.

### Full workflow facts

The new scenario verifies UI **and independent SQL**, not just HTTP 200:

- Sign in, business selection, customer creation.
- Sale 3,000/1,000 → debt 2,000. Double click and exact API idempotency replay leave **one** operation.
- Repayment 500 → debt 1,500, sales unchanged.
- Reversal of that repayment → debt 2,000; original sale/repayment/reversal retained.
- Offline text draft 1,200/1,200: no journal write before confirmation; then total sales **4,200**, receipts **2,200**, debt **2,000 ₸**.
- Analytics and assistant display these SQL values, and reminder matches the customer.
- Current clean business reports insufficient forecast history; historical fixture supports 7/30 comparisons. Debt-risk link opens the correct customer's sales.
- Consented synthetic feedback persists; reload/retrieval confirms it; account B cannot see A's business or feedback.
- Structured RU/KZ assistant, malformed JSON/unknown metric fallback, facts-only no-provider mode, foreign-business 404; **all-business ledger fingerprint unchanged**.
- Research chart/table and navigation fit 360/1440; general suite also covers 390/768. No physical-device claim.

Actual [SQL journal snapshot](workflow-sql.json), [screenshots](screenshots-register.md).

### Initial failures and reruns

1. First backend run: 343 passed / 183 fixture setup errors because DATABASE_URL required by the isolation guard was absent. No production defect; fixed only shell test configuration.
2. Next backend run: 525 passed / 1 setup error from Windows permission denial on the default pytest temp directory. Focused repeat with a worktree basetemp passed (1 test).
3. Full final backend run with both local URLs and basetemp: **526 passed**.
4. New E2E passed 3/3 initially. After strengthening SQL observation to fingerprint **every business journal row**, a new empty DB rerun passed 3/3 again. The rerun is not counted twice in 86.
5. No production-code fix was required by the combined runs. New test labels were matched to actual UI localization before testing; frozen Stage 1 cases were never modified.

Non-blocking warnings: Starlette/httpx TestClient deprecation; Vite bundle chunks above 500 kB (main about 611 kB and 3D about 1019 kB, minified); Node color environment warning. These do not prove release performance and were not hidden by configuration changes.

## Frozen Stage 1 comparison

Corpus: DS-B-LOCKED-42-v1; 18 valid, 24 invalid. Same semantic intents/snapshots, **different frozen legacy-prose and structured-ID encodings**; strict policy failures included. Windows byte SHA256 `46732cf49f163a0b571019c32ea44e9910c6e46d96a65f961786e0db66988700`; Git LF content SHA256 `1ae46abeb313140c24475e5896b5d78362280f948022dabe63d0d95035781ccf`. Source fixture and freeze match Stage 1 delivery unchanged.

| Validator                           | True accept | False accept | True reject | False reject |
| ----------------------------------- | ----------: | -----------: | ----------: | -----------: |
| Frozen original numerical validator |          18 |           19 |           5 |            0 |
| Structured fact binding             |          18 |            0 |          24 |            0 |

[Summary with runtime/hashes](experiments/comparison_summary.json), [per-case results](experiments/comparison_cases.csv).
This is a finite constructed protocol test, **not 100% real-world AI accuracy**, model-training evidence or an unbiased population sample. The legacy baseline is the frozen snapshot, not the deployed code today.

[Forecast 7](experiments/forecast-synthetic-7.json), [forecast 30](experiments/forecast-synthetic-30.json), [empty](experiments/forecast-empty-30.json) preserve train/validation/test dates and tiyn-based MAE/RMSE. Debt metrics remain null because no verified outcomes/due dates exist. There are no real survey participants.

## Remote and unexecuted checks

Final fetch/prune kept main 2518b2e and PR100 Research 1ece13a unchanged. PR100 remains Draft, open, mergeable/clean; Vercel status successful. This is not CI for the local combined branch.

Read-only hosted OpenAPI request timed out after 40 seconds on 2026-10-25. Previous 0.7.2/no-Research observation is historical, not a fresh successful query. Preview reached Vercel login (HTTP 200 of the login page, **not** application acceptance); no protection bypass.

**Not run:** paid/live AI, hosted Supabase/email acceptance, physical microphone/iPhone/Android/APK, shared/production migration, production load testing, real merchant model evaluation or user research. No push, PR mutation, main merge or deploy.

Raw local logs remain in ignored `tmp/stage6/`; curated count/hash summaries and screenshots are committed here. Test-generated images in older documentation were preserved locally and restored in their original locations; new evidence is isolated here.
