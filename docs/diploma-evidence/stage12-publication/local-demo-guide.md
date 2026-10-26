# Run the actual local application

The integration branch contains React, FastAPI, PostgreSQL and explicitly OFFLINE
AI adapters. Local synthetic Auth exercises API authorization/tenant checks; it is
not Supabase acceptance. No paid keys, real customer data or shared DB are needed.

After locked installs in [development-workflow.md](development-workflow.md), from
the repository root, with the dedicated local PostgreSQL server running:

```powershell
createdb -h 127.0.0.1 -p 55441 -U qadam_research qadam_research_browser_stage12_show_test
if ($LASTEXITCODE -ne 0) { throw 'STOP: choose a new empty DB' }
$env:PYTHONUTF8='1'
apps/api/.venv/Scripts/python.exe apps/api/tools/stage10_eval/demo.py --database-url 'postgresql+psycopg://qadam_research@127.0.0.1:55441/qadam_research_browser_stage12_show_test' --output tmp/stage12-show
```

Open **http://127.0.0.1:4303/login**, API **http://127.0.0.1:8322/docs**.
The launcher refuses occupied ports, non-loopback, non-test or nonempty databases
and existing output directories. It never deletes an old DB to force a restart.
Use a fresh DB/output name for another rehearsal. Ctrl+C stops its children and
preserves the DB. The startup ready.json records exact source and local PIDs.

Synthetic local-only accounts: `a@research.example.test` and
`b@research.example.test`, password `synthetic-local-only`. These only work against
the local test issuer; never try them on production. The initial selected point
may contain synthetic history; explicitly select the labelled clean point for the
money demonstration. Initial clean-point sales/receipts/debt are zero, five fixture
customers exist. The history point has 180 seeded entries, 179 eligible full days.

## Demonstration sequence (not a timing study)

1. Login A, select `OFFLINE AI · SYNTHETIC · чистая точка` and inspect zero totals.
2. Choose/create a synthetic client. Manual sale 3000 ₸, received 1000 ₸. Confirm:
   sales 3000, receipts 1000, debt 2000.
3. Repay 500 ₸ against that original sale: sales 3000, receipts 1500, debt 1500.
4. Reverse that repayment: sales 3000, receipts 1000, debt 2000. History remains.
5. Prepare the offline fully paid 1200 ₸ draft, inspect it without writing, then
   explicitly confirm: sales 4200, receipts 2200, debt 2000. A repeat of the same
   confirmation must retain the same operation and not create another entry.
6. Open Analytics. Change to the synthetic history point and Research; inspect
   7/30 horizons, temporal train/validation/test split and baseline comparison.
7. Inspect explainable debt priorities (rule-based, not default probabilities).
   Submit a synthetic consented feedback form, reload and check saved feedback.
8. Logout/switch to B; A's point/data must not remain visible. Empty point must
   explain insufficient history rather than show a fabricated forecast.

Do not improvise financial data on a shared database to match these figures.
The separate automated response-loss scenario adds later fixture entries; read
its checkpoint JSON instead of confusing its final totals with step 5 above.

The local SQL/Chrome results and actual demo source are in
[test-results.md](test-results.md) and [git-publication-report.md](git-publication-report.md).
Stage 10's [flow](../final-integration/candidate-flow.mmd) and
[recovery diagram](../final-integration/confirmation-recovery.mmd) remain applicable.

The running demonstration uses published source `e94d9a71` and the new local
database `qadam_research_browser_stage12_ready_test`. The Stage12 documentation
commit leaves those application trees identical. Read-only Chrome smoke confirmed
login, 7/30 Research, empty mobile state and logout without financial writes.

Optional read-only smoke on a running demo, from the repository root:

```powershell
node apps/api/tools/stage11_release/demo-smoke.mjs apps/web tmp/stage12-smoke-next
```

Use a NEW output folder. This historical tool hardcodes the Stage10 source label;
record the launcher's actual ready.json checkout separately. Stage12 ran a local
UTF-8 copy with only that label replaced from ready.json; assertions are unchanged,
and the original tracked tool is preserved. The first copy's encoding failure
and corrected pass are both recorded in test-results.md. Complete publication
E2E commands do not require a copied tool.
