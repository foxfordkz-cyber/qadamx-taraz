# Actual test execution — 2026-10-25

Environment: Windows, Python 3.12.14, Node 24.21.0, locked repository dependencies,
PostgreSQL 17.11 on loopback, Playwright Chrome channel. No external provider calls.
Commands are in [reproduction.md](reproduction.md).
The [machine-readable execution record](test-execution.json) binds these checks to
implementation `b84b4c70b58c21465705f1dc8c3ca31657054fce` and records local log hashes.

| Check | Actual final result | Scope |
|---|---|---|
| Full backend pytest with TEST_DATABASE_URL | **615 passed**, 0 failed/skipped, 283.81 s | Unit, HTTP/JWT, tenant, ledger, Research, assistant and real disposable PostgreSQL tests |
| Ruff check | Passed | apps/api |
| Backend API export --check | Passed | Existing public contracts |
| npm check:api | Passed | Generated TypeScript vs OpenAPI |
| npm typecheck | Passed | Existing frontend + new E2E test files |
| npm lint / format:check | Passed | apps/web |
| npm build | Passed | Existing application |
| Selected frontend regression suite | **82 passed in 6 files**, 48.21 s | Voice, recorder adaptation, ledger, assistant, Research data/feedback |
| New Chrome → HTTP → PostgreSQL acceptance | **3 passed**, 1.2 min, retries=0 | Successful confirmation, null-payment clarification, malformed-provider fallback |
| Frozen comparison | **100 paired cases**, 0 live calls | Initial and final raw rows, explicit metric denominators |

The final backend run emitted one existing Starlette/httpx deprecation warning.
Frontend build warnings are not claims of a production release. Full unrelated frontend
and mobile suites were not rerun; selected frontend regression coverage is named above.

## Browser evidence

1. Kazakh “Асқарға үш мың теңгеге тауар бердім, мыңын төледі” with a deliberately wrong
   provider `paid` label: UI shows 3000/1000, database ledger hash is unchanged while
   reviewing the draft; explicit double-click confirmation creates exactly one sale.
   SQL deltas: sales +300000, receipts +100000, debt +200000 tiyn.
2. Mixed “Ерланға екі мың теңгеге сатым, остальное потом”: KZ interface at 390 px shows
   2000, empty received field and “Қазір қанша төленді?”. Ledger hash remains unchanged.
3. Duplicate-key provider response: safe error, original input and manual action remain;
   exactly one offline provider call, no ledger change.

- [Desktop grounded draft](screenshots/grounded-kazakh-1280.png)
- [Mobile KZ clarification](screenshots/unknown-payment-kk-390.png)
- [Manual fallback](screenshots/invalid-provider-fallback-1280.png)
- [Asserted SQL deltas](screenshots/sql-confirmation.json)

These are actual automated browser screenshots of the existing app against a test API.
All records are synthetic. Mobile viewport emulation is not physical-device acceptance.
Full-page captures retain fixed navigation and focus indicators; this stage is not a
new design audit. The UI assertions independently verify the displayed money fields.

## Failed attempts retained in the record

- Initial focused tests exposed three old expectations that allowed paid/debt labels
  to replace an explicitly quoted partial receipt. Updated them to the quoted amount.
- An additional amount test found unsupported “жарты мың” was partly parsed.
  It now requests clarification. Added adjacent-negation regressions as well.
- First browser fixture failed to start because it used `Customer.name` rather than
  the existing `display_name`; corrected the test fixture.
- Next browser run: one pass, two failures. A customer selector matched both “Асқар”
  and the seeded “Демо Асқар”; it now targets the explicitly created test customer.
  A service GET reused an expired keep-alive socket after a SQL probe; control GETs
  now use Connection: close. No financial POST retry was added.
- The final entire three-test browser suite passed on a new empty database. These
  setup failures are not omitted or presented as product failures.

Local diagnostic logs are under ignored `tmp/stage7/`; the committed report and raw
evaluation are the portable evidence. Test credentials are fictional loopback fixtures,
not real accounts. Shared databases, production settings, Stage 1 corpus, ledger/Auth
implementation and deployed application were not changed.
