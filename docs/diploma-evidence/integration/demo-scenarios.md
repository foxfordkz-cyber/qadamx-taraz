# Reproducible academic demo

**Local synthetic data; actual React → FastAPI → PostgreSQL. Offline AI adapters; not a live provider.** No shared Supabase, merchant account, production database or real participant responses.

Test/demo implementation: `3c9ed301a0e0d087298b0fb80b558f527d8b75d3`.
Application integration: `ae43dc25543ab261511c8b5f5982c7dfe8112da8`.

## Prerequisites and setup

Use the isolated integration worktree. Python 3.12, uv, Node/npm, Chrome and a separate loopback PostgreSQL are required.

From `apps/api`: `uv sync --locked`.
From `apps/web`: `npm ci --no-audit --no-fund`.

For this workstation PostgreSQL 17.11 is in the sibling `qadam-research-tools/pgsql/bin`; its local QA cluster is listening on **127.0.0.1:55439**. It is not the shared Supabase database. The sample user is a disposable local role, without a secret.

Create a **new empty** DB with a unique name per run, from the worktree root:

```powershell
& '../qadam-research-tools/pgsql/bin/createdb.exe' -h 127.0.0.1 -p 55439 -U qadam_research qadam_research_browser_stage6_demo_test
$env:RESEARCH_TEST_DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_research_browser_stage6_demo_test'
```

The harness rejects non-loopback targets, names outside `qadam_research_browser_*_test` and nonempty DBs. It does not erase previous demos. A different workstation must supply its own **disposable** local PostgreSQL role/port, never shared credentials.

Terminal A, from `apps/api`:

```powershell
$env:PYTHONPATH='.'
$env:RESEARCH_TEST_DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_research_browser_stage6_demo_test'
.venv/Scripts/python.exe tests/diploma_browser_server.py
```

Terminal B, from `apps/web`:

```powershell
$env:VITE_API_BASE_URL='http://127.0.0.1:8316/api/v1'
$env:VITE_SUPABASE_URL='http://127.0.0.1:8316'
$env:VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_local_qa_only'
$env:VITE_ASSISTANT_ENABLED='true'
$env:VITE_CUSTOMER_IDS_ENABLED='true'
npm.cmd run dev -- --port 4297 --strictPort
```

Open **http://127.0.0.1:4297/login**. Local fixture-only sign-in:
`a@research.example.test` / `synthetic-local-only`.
Owner B: `b@research.example.test`, same synthetic password.
These are hardcoded test identities, not Supabase credentials. Do not enter real credentials here.
The existing “Посмотреть демо” button uses the separate read-only fixture mode; use the local sign-in to demonstrate actual SQL writes.

Ports 8316/4297 must be free. Stop only your own demo processes before running E2E. No fake microphone is configured. The local text adapter supports only the documented phrase below; audio is deliberately unavailable.

## Demonstration checklist

1. Login A, select **OFFLINE QA · чистая точка · AI stub**. Verify zero sales/receipts/debt in this newly created fixture.
2. Open customers, create a synthetic client; no real name/contact.
3. Manually enter sale **3,000 ₸**, received **1,000 ₸**, select that client, confirm explicitly.
4. Open debts: **2,000 ₸**. Take payment **500 ₸** against that sale: **1,500 ₸** remains.
5. History: reverse the repayment with explicit confirmation. Both the original repayment and reversal remain; debt returns to **2,000 ₸**.
6. Sale: enter exact text **«Продажа 1200, оплатили сразу полностью»**. Prepare draft. It shows 1,200/1,200; **no financial row is written until confirmation**. Confirm once.
7. Analytics: sales **4,200 ₸**, receipts **2,200 ₸**, debt **2,000 ₸**. Ask Qadam using a suggestion. Offline provider selects IDs; real Stage 1 renderer supplies SQL values/customer association. Reminder is text only.
8. Research on the clean point: honest insufficient-history status, no invented metrics. Debt-risk action opens this customer's actual open sales.
9. Switch to **OFFLINE QA · история 180 дней · AI stub**. View 7- and 30-day forecasts, validation/test dates, baseline and ML MAE/RMSE. Synthetic source label remains visible. This SQL fixture and the standalone synthetic experiment use different series; their metrics need not match.
10. Feedback: use an explicitly synthetic message, consent, submit; reload and load “Мои сохранённые ответы”. The receipt is stored in PostgreSQL.
11. Logout and login B: A's selected business/feedback must not appear. Logout again.
12. Do not use this demonstration to claim live AI accuracy, real merchant forecast quality or completed user research.

## Independent SQL verification

From `apps/api` with the same test DB and PYTHONPATH:

```powershell
.venv/Scripts/python.exe tests/diploma_browser_server.py --verify
```

Expected new-point journal after steps 1–6:

| Operation                    | Sales delta, tiyn | Receipts delta, tiyn | Remaining debt, tiyn |
| ---------------------------- | ----------------: | -------------------: | -------------------: |
| Sale                         |            300000 |               100000 |               200000 |
| Repayment                    |                 0 |                50000 |               150000 |
| Reversal of repayment        |                 0 |               -50000 |               200000 |
| Confirmed offline draft sale |            120000 |               120000 |               200000 |
| Total                        |            420000 |               220000 |               200000 |

[Actual final SQL evidence](workflow-sql.json). The all-business ledger fingerprint is compared before/after assistant checks, so checking only the currently selected point cannot conceal a write elsewhere.

## Automated replay

Use a **different new empty** DB, export its RESEARCH_TEST_DATABASE_URL, then from `apps/web`:

```powershell
npx.cmd playwright test -c e2e/diploma.playwright.config.ts --reporter=line
```

The config launches both servers, uses real installed Chrome, blocks external browser requests and disables traces containing authentication. It performs synthetic writes only in its named disposable DB. The original Research SQL suite additionally exercises response loss, replay, consent, unauthorized requests, and private feedback retrieval.

The timestamped seeded history changes with run date; compare mechanics/invariants, not screenshots pixel-for-pixel across days. After stopping a fixture, use a new DB for another startup. No automated database deletion is included.
