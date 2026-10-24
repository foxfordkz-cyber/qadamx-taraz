# Research stabilization — 2026-10-24

Official diploma topic (unchanged):
«Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

## Scope and provenance

Start commit: `8bbc0acae75d2fea23c9e95ce4f36f91e9b7b4e4`.
Base main: `2518b2e80b8c8ef881063a968645382d61aeb37e`.
Branch: `feature/ml-sales-debt-research`, existing [Draft PR100](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/100).

The accidentally submitted Stage 1 task was cancelled before implementation:
the worktree was clean at the start, with no files/commits to revert or separate.
Fetch/prune and ff-only pull succeeded; main was an ancestor (0 behind, 9 ahead).
PR100 remained Draft and conflict-free. Existing work was preserved.

The other Codex chat, “Audit Qadam Business thesis plan”, is using a separate
working copy for assistant factual validation. Its recent scope explicitly
excludes forecast/risk/feedback. This task changes no assistant implementation,
semantic/factual tests or independent AI datasets. No branches were integrated.

## Implemented behavior

### Business selection

Only the selected business ID is stored in **sessionStorage**, namespaced by API
base and authenticated user (Demo has a separate identity). It survives a reload
in the same tab; closing the tab or denied browser storage can remove this
preference. No customer data, financial records, email, credential or token is
added to storage by this feature.

Restoration happens inside BusinessProvider after ProtectedSeller has obtained
the current authorized /me list. Unknown/deleted/revoked IDs fall back to a
permitted business; an empty list renders no business. An ID is never authorization.
Account/environment keys isolate the preference; Runtime's existing auth generation
remount continues to clear private caches/drafts. Initial selection is resolved
synchronously to avoid an unnecessary second initial seller render.

### Unfinished feedback and unknown writes

Research drafts, consent, receipt and the exact POST intent live only in the
existing auth-generation-scoped runtime memory map, keyed by business. Internal
navigation and changing points preserve that point's draft. Another account or
authentication generation cannot restore it. Nothing is automatically submitted.

- RU/KZ distinguishes not submitted, unsaved, saving, confirmed saved and unknown.
- Dirty/unknown drafts register the existing runtime's beforeunload warning, even
  after leaving Research. Logout asks before discarding this in-memory work.
- Explicit discard is available only before an unresolved send; it requires
  confirmation. Unknown writes cannot be silently replaced with a new intent.
- Navigating away during POST aborts transport and records **unknown**, because
  SQL may already have committed. Returning permits only explicit same-body/key
  replay; a late result from the old component cannot change the current screen.
- Fixed: after an unknown attempt, a later 4xx does not erase the original key or
  prove the first attempt failed. Fields stay locked and the original intent is
  retained. First-attempt validation rejection still leaves fields editable.
- Confirmed receipts survive internal navigation, preventing another submission
  of the same form. Reload never replays a POST; server-side review remains available.

This is **loss prevention, not durable draft storage**. Browser warnings may be
suppressed on mobile, process termination or before user activation. Accepting
reload/logout, session expiry or closing the process can discard unsaved text and
the in-memory key. The UI states this limitation. After such a loss, inspect saved
responses before starting a new one. No unsupported exactly-once or crash recovery
guarantee is claimed.

### Forecast and debt presentation

History and forecast date ranges are displayed separately; the chart marks their
boundary. Its scrollable region preserves readable labels at mobile widths, with
keyboard access and an exact-value table. The comparison column is called “Method”,
not “Selected method”: validation selection and the held-out test winner differ.

Fractional MAE/RMSE formatting remains intact. Forecast target, chronological
train/validation/test split, 98/144-day minimum, baseline candidates, ridge model,
selection and errors are unchanged; see [methodology](forecast-method.md).
Baseline can legitimately win. No new accuracy result is claimed.

Debt UI explains low 0–29 / medium 30–59 / high 60–100 as review-priority **points**,
not percentages or a trained model. Balances still come from backend; the existing
customer open-sales link is read-only. No payments, balance edits, reversals,
reminders or WhatsApp sends are introduced.

## Verification

Commands run from `apps/web` unless marked otherwise:

| Check | Result |
|---|---|
| `npm test -- --maxWorkers=1 src/test/business-selection.test.tsx src/test/research-feedback.test.tsx src/test/research-data.test.tsx src/test/qa-auth-regression.test.tsx` | 47 passed; storage, account epochs, consent, ambiguous writes and receipts |
| `npm test -- --maxWorkers=1`, final whole run | **639/639 passed**, 47 files, 317.68s, no skips |
| `.venv/Scripts/python.exe -m pytest -q tests/test_forecasting.py tests/test_debt_risk.py tests/test_research_api.py tests/test_research_feedback.py --tb=short`, apps/api | **47/47 passed**, 40.22s, isolated PostgreSQL |
| `python -m app.export_contracts --check`, `ruff check app tests`, `ruff format --check app tests`, apps/api venv | Passed, 72 files; no contract drift |
| `npm run test:e2e -- --reporter=list --timeout=60000` | **44/44 passed**, 4.2 minutes, no retries/skips; existing seller, analytics, public pages, money and recovery scenarios |
| `npx playwright test -c e2e/research.playwright.config.ts --reporter=list` | **6/6 passed**, 31.7s; explicit intercepted fixtures, RU/KZ, 360/390/768/1440px, no backend writes |
| `npm run typecheck`, `npm run check:api`, `npm run lint`, `npm run format:check`, `npm run build` | Passed on final production code; build 44.59s, existing large-chunk warning |
| `npx playwright test -c e2e/research-postgres.playwright.config.ts --reporter=list` | **4/4 passed**, 1.4 minutes, no retries/skips; real local HTTP/PostgreSQL, final code and test harness |

Earlier attempts remain recorded: the first full unit run had 637 passes and two
facts-loading timeouts (Assistant and Analytics); a two-file rerun had 35 passes
and one timeout. No assistant code/tests were changed. After resolving initial
business selection synchronously, the isolated facts case passed (27 unrelated
cases filtered out) and the final **complete** unit run passed all639. CPU load and
short existing waits may contribute; the isolated run is not a replacement for
the full run. The first SQL browser run had 3 passes/1 failed harness wait: it
incorrectly awaited a navigation after the user cancelled reload. The test now
observes the actual beforeunload dialog and retained form; the next whole run
passed4/4. Formatting initially found one wrapped test expression; it was formatted
and rechecked. Raw logs/JUnit are ignored under `tmp/research-stabilization/`.

The first default E2E run had43 passes/1 failure: its Analytics reload assertion
explicitly expected the old reset-to-first-business behavior. It now expects the
validated remembered point, verifies that the other point's3,000₸ is absent, then
explicitly switches back to check3,000₸. Existing no-write and route assertions
remain. This is a test update for the requested behavior, not removed money checks.

The second default run had 43 passes/1 startup timeout, before the Demo button
appeared, in the compact Analytics case. The final complete run used a 60-second
per-test CLI limit and passed all 44 without retries or removed assertions. Host
resource pressure was observed, but is not asserted as a proven root cause.
No production Auth or Analytics implementation was changed for this timeout.

A subsequent SQL run had 3 passes/1 menu-navigation timeout: the new test attempted
to reopen Research while the previous route transition was closing the secondary
menu. The test now awaits the actual debts heading and closed-menu state before
the next user navigation. No sleep, forced click or production change was used.
The next SQL run passed that scenario but had 3 passes/1 startup failure: the
seller shell exceeded its five-second post-login assertion during cold dev-server
startup. The login helper now waits up to 15 seconds for that same visible shell;
authentication, data assertions and the 60-second test budget remain unchanged.
The subsequent complete SQL run is recorded below; earlier failures are retained.

Existing large bundle, jsdom/WebGL and locked dependency warnings are not new
production defects and were not silently removed. No paid AI calls were made.

All database tests use newly created disposable loopback databases on port55439;
neither shared PostgreSQL nor Supabase storage is used.

SQL browser reproduction (create a **new empty** database for each run; do not
reuse the already populated database from the recorded run):

```powershell
# Existing local isolated PostgreSQL, not a shared DATABASE_URL:
createdb -h 127.0.0.1 -p 55439 -U qadam_research qadam_research_browser_stabilization_e2e5_test
cd apps/web
$env:RESEARCH_TEST_DATABASE_URL = 'postgresql+psycopg://qadam_research@127.0.0.1:55439/qadam_research_browser_stabilization_e2e5_test'
npx playwright test -c e2e/research-postgres.playwright.config.ts --reporter=list
```

The harness refuses a nonempty or non-loopback database. It uses an ephemeral test
JWT issuer and existing API verification; it does not simulate the Research
responses. SQL assertions confirm one row after response-loss/replay and unchanged
ledger sums. Missing/tampered JWTs return 401, foreign business returns 404, missing
consent returns 422. The last two harness-only edits were formatter/linter checked
after the full static run. Screenshots at 360px were visually inspected; only the
chart region scrolls horizontally, and the entire page does not overflow.

Interactive browser: existing actual Supabase session → ordinary local FastAPI
:8320 → isolated local synthetic database → UI on :4298. Checked 7/30 dates/metrics,
explained 400 ₸ debt and business restoration after reload. An initial /me503
resolved after explicit retry; it was not replaced with Demo results.

- [Interactive local application after reload](screenshots/research-stabilized-local.jpg).
- [Actual SQL-backed browser forecast/risk](screenshots/postgres-research-ru.png).
- [Confirmed feedback retrieved after reload](screenshots/postgres-feedback-persisted.png).
- [KZ unsaved state, synthetic test text](screenshots/research-unsaved-kk.png).
- Existing RU/KZ viewport screenshots distinguish explicit Demo fixtures.

No actual merchant history or survey participant was collected. All SQL journal
and questionnaire fixtures are synthetic engineering evidence.

## Integration / release gates

API remains 0.8.0 in this candidate. No backend, OpenAPI/generated artifact, Auth
implementation, migration or financial logic changes in this stabilization.
Structural JSON comparison with origin/main found zero changed existing paths
and zero changed existing schemas; only the three Research paths are additive
(forecast, debt-risk, feedback GET/POST). Contract export/generation checks passed.
Migration0009 depends on 0008_canonical_markets; only isolated upgrade/downgrade
tests are allowed here.

Initial GitHub checks: Vercel status and Preview Comments succeeded. They do not
prove unit/integration coverage or authenticated hosted acceptance. The last
independently confirmed hosted API is still **0.7.2 with zero research endpoints**;
this session's first public schema request timed out after25s and one subsequent
bounded read succeeded with that version. Browser navigation
again confirmed the Preview redirects to Vercel's own login, before Qadam; no
credentials were entered and protection was not changed. Hosted feature readiness
is therefore not verified.

Before release: captain reviews this Draft PR, deploys a compatible backend with
approved 0009 migration/backup plan, provides authorized Preview access, verifies
real merchant completeness and consent/retention/withdrawal procedures, and repeats
browser acceptance against that environment. This task performs no such rollout.

Rollback plan for later owner review: restore the previous frontend/API artifact;
retain the additive feedback table/data until a reviewed backup/recovery decision.
Do not run a destructive 0009 downgrade on shared data as a frontend rollback.
The tab-local business preference can be ignored by an old frontend. Auth and
ledger code are unchanged. No rollback or shared migration was executed.

## Changed-file / contribution record

Application: app/business-selection.ts (new); app/runtime.tsx, App.tsx, layout.tsx;
research/FeedbackForm.tsx, ResearchPage.tsx, i18n.ts, research.css; shared RU/KZ
logout warning. Tests: business-selection.test.tsx (new), research-feedback.test.tsx,
test/setup.ts (sessionStorage isolation), research-postgres.acceptance.ts.
The existing analytics.spec.ts reload expectation is updated for the requested
selection persistence, retaining all financial/no-write assertions.
Research reports/handoff/screenshots record actual evidence.

Exact tracked paths: `git diff --name-status 8bbc0ac..HEAD`.
This is AI-assisted implementation and verification, not a claim of manual
authorship, empirical model improvement or completed participant research.
