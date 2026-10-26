# Stage11 checks and reproduction

Date2026-10-26. Application source e825dd9a9568dda33a9226e1941e789fd21d2175.
Rehearsal tooling commit2073960792067f392e7938f733a75ae652116c9f.
Final packet portability fix31cba2d5e0c0e3b0d9ce4d2159a2357005d954c3.
Python3.12.14; Node24.21.0; PostgreSQL17.11; Chrome156.0.8078.47.
Locked Python/Playwright dependencies were reused from the clean Stage10 checkout;
PYTHONPATH imported Stage11 application source. No dependencies/lockfiles changed.

| Check actually run | Result | Evidence |
|---|---|---|
| Selected auth/journal/feedback/rawJSON/factual tests + new tool tests |210 passed,0 failed,0 skipped;1 deprecation warning|runs/review-tests.txt; review-junit.xml|
| Final release tools + Stage9 evaluation/paid-approval guards |25 passed,0 failed,0 skipped;1 warning|runs/tools-tests.txt; tools-junit.xml|
| Final ZIP portability regression |6 passed after reproduced 1failure/5pass; these6 overlap earlier runs|runs/packet-portability-before.txt; packet-portability-final.txt|
| New tools Ruff check/format |PASS|runs/static-checks.txt|
| Exported API contract check |PASS; no contract edits|runs/static-checks.txt|
| Frontend configuration probes |9/9, no network|config-probe.json|
|0009/backup/restore final committed-tool run |21/21,29.562s total local run|migration-restore-result.json|
| Actual read-only Chrome smoke |PASS;7/30 forecast, risk, empty,390px,logout;0page errors|demo-smoke/result.json and2screenshots|
| Live runner dry plan |18planned text requests,0executed|live-dry-plan.json|
| Original worktrees |31 others retain HEAD/status;32total including Stage11|completion-verification.json|
| Candidate blob publication screen |596blobs;0matched secret patterns; binary/heuristic limits apply|publication-screen.json|

Six tooling tests occur in both pytest runs;229 unique collected tests across them,
not235 distinct tests. Full764backend/639frontend/19E2E, TypeScript/lint/build and
frozen score tables are inherited from Stage10 and were NOT rerun in full.
No production source change triggered a full affected-suite rerun. The Chrome smoke
is one new read-only scenario, not another complete financial/browser E2E suite.

## Exact selected test setup (PowerShell, this checkout apps/api)

The first attempt omitted DATABASE_URL comparison config and used the inaccessible
default Windows pytest temp directory:160passed/44setup errors. Both were runner
configuration errors, not waived product failures. The test DB was still empty.
The corrected complete selection passed. No production code was changed to pass it.

```powershell
$env:PYTHONPATH='.'
$env:DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55441/qadam_stage11_unused'
$env:TEST_DATABASE_URL='postgresql+psycopg://qadam_research@127.0.0.1:55441/qadam_stage11_review_test'
$stage11Python='../../../qadam-final-candidate/apps/api/.venv/Scripts/python.exe'
& $stage11Python -m pytest tests/test_auth.py tests/test_ledger.py tests/test_research_feedback.py tests/test_stage9_postgres.py tests/test_stage9_extraction.py tests/test_assistant_semantics.py tests/test_stage11_release.py -q --basetemp='../../tmp/pytest-stage11-pass' --junitxml='../../tmp/stage11-review-pass-junit.xml'
& $stage11Python -m pytest tests/test_stage11_release.py tests/test_stage9_evaluation.py -q --basetemp='../../tmp/pytest-stage11-tools-final' --junitxml='../../tmp/stage11-tools-junit.xml'
& $stage11Python -m ruff check tools/stage11_release tests/test_stage11_release.py
& $stage11Python -m ruff format --check tools/stage11_release tests/test_stage11_release.py
& $stage11Python -m app.export_contracts --check
```

For a new execution use NEW empty DB/temp/output names, not these existing paths.
The existing postgres fixture deliberately migrates/truncates/downgrades only its
explicit empty *_test DB. DATABASE_URL above is a nonexistent comparison sentinel;
do not replace it with shared credentials. TEST_DATABASE_URL must stay disposable.
On another workstation use its own `uv sync --locked` venv, not this relative path.

From repository root:

```powershell
node apps/api/tools/stage11_release/config-probe.mjs tmp/new-config-result.json
node apps/api/tools/stage11_release/demo-smoke.mjs ../qadam-final-candidate/apps/web tmp/new-demo-smoke
```

Smoke requires the existing local OFFLINE fixture on4303/8322. It blocks external
origins and non-GET financial/research API requests; no mock API responses injected.
Auth is explicitly synthetic. Smoke doesn't start/reset DBs or intercept money success.
The existing Stage10 app was started on new DB
qadam_research_browser_stage11_ready_test at55441, exact source e825dd9a.
Current clean-point SQL: sales0/receipts0/debt0,5customers,0feedback; captured separately.

Rehearsal final command, apps/api:

```powershell
& $stage11Python -m tools.stage11_release.rehearsal --run-id r20261026final --port 55441 --pg-bin ../../../qadam-research-tools/pgsql/bin --output ../../tmp/stage11-rehearsal-final
```

Do not repeat with existing names. No DB is dropped; downgrade was performed ONLY
on the newly restored copy to demonstrate feedback loss. Raw dumps stay ignored.

## Failure register / evidence handling

- Old localPG55439 unavailable: attempted connection interrupted; no mutation there.
- First new rehearsal used wrong DTO field id; corrected to operation.id in new tool.
  Failed result/trace retained; seed transaction rolled back; all DBs preserved.
- Initial selected tests:160pass/44setup errors as above; full selection repeated.
- Initial JS config probe had wrong relative import; corrected tool path,9probes pass.
- Initial Ruff found formatting/long-line issues in new tooling; corrected, finalpass.
- The ZIP initially embedded platform-dependent CRLF. A new LF assertion reproduced
  the issue (1failed/5passed); explicit LF and fixed ZIP platform/permissions metadata
  corrected only the new packet generator;6passed and packet regenerated.
- Existing Starlette/httpx deprecation warning remains; no dependency migration added.

Only TXT/XML log line endings/trailing whitespace are normalized for Git; original local
tmp logs are retained. Evidence contains synthetic data/public fixture credentials,
no real users' audio or Auth tokens. No real Supabase, paidAI, physical-device,
staging or production check is labelled passed. See artifact-manifest.json for
checksums and completion-verification.json for source invariance.
