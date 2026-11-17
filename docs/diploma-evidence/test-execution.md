# Test execution report — 2026-10-24

Later in this session, the [end-to-end follow-up](end-to-end-acceptance.md) passed
all 44 default E2E in one run, 6 research fixture E2E, 3 real HTTP/PostgreSQL E2E,
627 unit/component and 47 focused backend tests. Actual Supabase login with local
SQL was also inspected in browser. The original runs below remain historical.

Branch: feature/ml-sales-debt-research. Base:
2518b2e80b8c8ef881063a968645382d61aeb37e. Tested stage changes are recorded in
[contributions](contributions.md); final code SHA is in seller-web handoff and Git.
All results below are **own engineering checks**, not real-world model validation,
user research, physical-phone acceptance or a live Supabase login.

## Completed checks

| Check | Actual result |
|---|---|
| Locked dependencies | uv sync --locked (41 Python packages); npm ci (357 web packages) |
| Full backend pytest, real local PostgreSQL | **437 passed, 0 failed, 0 skipped**, 272.04s |
| Backend ruff check / format | Passed; 71 files formatted |
| Backend contract export --check | Passed |
| Existing OpenAPI paths/schemas vs base | All existing definitions structurally identical; research additions only |
| generate:api / check:api | Passed; generated.ts reproduced |
| Full frontend unit/component, maxWorkers=1 | **625 passed in 46 files**, 418.22s |
| Final TypeScript / ESLint | Passed |
| Final production build | Passed |
| Final format:check | Passed |
| Synthetic 7/30 + empty-input CLI rerun | All 3 JSONs identical to committed evidence including hashes and metrics |
| git diff --check | Passed |

Backend uses Python 3.12.14, PostgreSQL 17.11 on loopback, a newly created empty
qadam_diploma_final_test database, local synthetic JWKS and stub providers.
No connection to production DB, Supabase settings or paid AI. Test durability
settings were relaxed only for this disposable cluster, not production.
[Machine-readable summary from JUnit](backend-test-summary.json).
The fixture upgraded through migration 0009, checked model/migration parity,
exercised real SQL constraints/concurrency and downgraded afterward.
The local server was stopped cleanly after the successful run.

Frontend uses Node 24.21.0 and locked Vitest/Playwright. Chrome for research
captures: 156.0.8078.47, headless. The complete default E2E set uses the project's
configured Chromium. Both use synthetic fixtures, not a live backend.

## Browser acceptance

The completed default full run had **43 passed / 1 failed**. The remaining legacy
navigation test expected an assistant-only reminder card while that suite's
assistant flag is off. Its financial no-write checks and unfiltered destination
assertions remain; the corrected scenario uses the available seller navigation.
The corrected test's isolated rerun **passed 1/1 (18.2s)**. Thus the default set
has 43 passes in the full run plus the corrected case passing separately; the
earlier full command was not an all-green single run.

Research's initial dedicated run: **6/6 passed**, including RU/KZ at
360/390/768/1440px, disabled Demo persistence/no API traffic, horizon changes,
live-contract error/retry without Demo fallback, business switch clearing the
old graph, confirmed feedback receipt/private review and logout. The final rerun
after timeout/receipt hardening also **passed 6/6 (29.1s)**.
The screenshots are explicit Demo only; see [capture guide](capture-guide.md).

Final browser commands from apps/web:
```powershell
npm run test:e2e -- --reporter=list
npx playwright test e2e/analytics.spec.ts -g 'direct route/reload' --reporter=list
npx playwright test -c e2e/research.playwright.config.ts --reporter=list
```
The default run wrote captures under ignored tmp using QADAM_SCREENSHOT_ROOT;
the research run wrote the four explicitly synthetic evidence screenshots.

## Coverage and corrected failures

- Forecast: exact MAE/RMSE, zero/constant series, baseline win/tie, 7/30 horizons,
  chronological split and held-out values not changing method selection, invalid
  money/dates, retained outliers, tenant 401/404 and time-zone/reversal boundaries.
- Risk: age/ratio threshold boundaries, invalid facts, net payments after reversal,
  paging and isolation; model explicitly rules-v1, outcomes/overdue unavailable.
- Feedback: strict consent/ratings, Unicode code points, transaction persistence,
  replay/concurrent same-key requests, changed-payload 409, author/business privacy,
  RLS/grants, no monetary writes, double submit, unknown result and explicit same
  intent retry, unmount and a transport that ignores abort.
- Existing UI/Auth/ledger/voice/customer recovery/public storefront are included
  in unit and default E2E checks; their production implementations are unchanged.

The first parallel frontend run had 11 failures: two navigation expectations
needed the new secondary route; the contract guard needed an exception limited
to ForecastMetrics' fractional averages (all actual money fields remain integer);
the remaining timing failures passed in the full single-worker run. No timeouts
were increased to conceal them. An early new component test used alert instead of
the existing informational status role; the selector was corrected.

Old E2E expectations also predated accepted main behavior: three Demo badges
instead of a unique badge, and the fixed 2026-10-15 read-only Summary with four
contract-example cards. A separate detached main copy reproduced the disabled
date failure; its other Analytics attempt hit page-startup timeout. The legacy
tests were updated without changing production or removing no-write assertions.
Two pre-existing Prettier issues were line-wrapping only (3 insertions/9 deletions).
The corresponding original team screenshots were preserved; regenerated legacy
captures were redirected to ignored tmp, not committed over their files.

An execution-host restart interrupted earlier long runs, so those partial logs
are not counted as completed. The final backend run used a new empty test DB
rather than the interrupted schema. Earlier stage results remain separately
recorded in README. Raw local logs/JUnit are under tmp/diploma-checks (ignored);
no private dataset or credentials are published.

## Remaining limits

Build emits a large-chunk warning (the existing 3D bundle is included). Backend
tests emit a Starlette/httpx deprecation warning from the locked dependencies.
No new runtime dependency was added to address unrelated tooling warnings.

Actual merchant data completeness, real Supabase integration, shared migration
rollout, physical mobile acceptance and user recruitment are **not tested here**.
Scientific results on real businesses and supervised debt metrics are unavailable.
A passing mock/UI or isolated DB test is not evidence for model accuracy, consented
participants, production deployment or paid-provider behavior.
