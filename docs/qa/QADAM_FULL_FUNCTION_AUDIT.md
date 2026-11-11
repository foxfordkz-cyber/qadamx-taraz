# Qadam product audit — 2026-11-11

Scope: Stage 0 and Stage 1. This is an audit of the actual main-based product,
not a claim that every requested feature is shipped. Branch:
`fix/qadam-critical-stability`. Base main:
`2518b2e80b8c8ef881063a968645382d61aeb37e`. Includes the previously local
Auth recovery commit `229ffd2fcad475133c59004b3edf9296466e2989`.

## Release boundaries

GitHub permission check: push permitted, admin/maintain not permitted.
Draft PRs #100 → #101 → #102 → #103 form a dependent diploma/research/staging
stack. They are not part of this branch. Main API is 0.7.2; Research in PR #100
uses a later contract/migration. No blind merge, contract replacement, migration
to hosted databases, external AI call or production deployment is part of this task.
The working native Windows QadamX instance, its PostgreSQL and local AI config
are not changed. An isolated loopback PostgreSQL cluster on port 55447 is used.

## Feature matrix

Evidence names below are repository tests, not claims of production acceptance.
“Automated” means the implementation has a relevant executable test; final run
outcomes are recorded in [the Stage 1 report](QADAM_CRITICAL_BUGFIX.md).
Physical microphones and hosted authentication require separate acceptance.

| Feature | Status | Evidence | Bug / gap | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| 1. Auth restoration, pending session, retry | Automated; fixed | loading-recovery tests + Chrome acceptance | C1 unbounded restoration/read | P0 | seller-web |
| 2. Login/logout/register/callback/no membership | Automated with synthetic Auth | auth-onboarding, registration, auth-callback acceptance | Hosted login remains unverified | P0 | seller-web/backend |
| 3. JWT and business isolation | Automated against PostgreSQL/JWKS | test_auth, test_ledger, customer recovery | Never bypass verification | P0 | backend |
| 4. Customer creation and lost-response recovery | Automated with PostgreSQL | test_customer_recovery, customer-recovery UI tests | Idempotency is server-backed; no blind new POST | P0 | backend/seller-web |
| 5. Customer search/Unicode/association | Automated | customer IDs, schema validation, frontend QA | Duplicate names are not duplicate identities | P1 | backend/seller-web |
| 6. Partial/full sales | Automated; browser acceptance provided | stability_browser_acceptance + test_ledger | Explicit confirmation required | P0 | ledger-web/backend |
| 7. Repayment and reversal | Automated; browser acceptance provided | same, reverse_preserves_history | Reversal is not a product-return module | P0 | ledger-web/backend |
| 8. Atomicity/idempotency/concurrency | Automated with real PostgreSQL | test_ledger, test_customer_recovery | In-memory UI locks alone are insufficient | P0 | backend |
| 9. History and pagination | Automated | ledger-reading, test_ledger | Do not infer full balances from one page | P1 | ledger-web |
| 10. Dashboard/day summary | Verified in isolated Chrome/API/SQL; fixed | PostgreSQL scenario, summary-share tests | C4 selected shop reset on reload; day is Asia/Almaty, debt is all-time | P0 | ledger-web/seller-web |
| 11. Analytics 7/30 days | Automated; browser acceptance provided | test_analytics, analytics UI tests | Analytics windows are not sales forecasts | P1 | backend/seller-web |
| 12. Catalog/public marketplace | Automated API/component coverage | test_public, test_market_upgrade, public UI tests | Live Render reads currently time out | P1 | public-web/backend |
| 13. Inquiries/status | Automated API/component coverage | test_public, seller UI tests | Live acceptance blocked by Render | P1 | public-web/seller-web/backend |
| 14. Recorder/stop/cancel/playback/file/manual fallback | Automated synthetic media only | microphone and voice-adaptation tests | Physical hardware acceptance not performed | P1 | ledger-web |
| 15. AI draft validation/timeout/limited requests | Automated stub-provider coverage; fixed | test_ai, test_retry_after, ai-rate-limit acceptance | C2 inaccurate quota diagnosis; C3 lost Retry-After | P0 | backend/ledger-web |
| 16. Assistant facts, validation and labeled fallback | Automated | test_assistant, assistant UI tests | Fallback is not an LLM response | P1 | backend/ledger-web |
| 17. Live RU/KZ/mixed AI and physical voice | Blocked | No external calls or new physical recordings | Owner permission/configuration/provider diagnosis required | P1 | backend/device tester |
| 18. Research, 7/30 forecasts, feedback | Outside this baseline | Draft PR #100 and dependent integration PRs | No Research route/API in main; must review stack | P1 | research/backend |
| 19. Persistent offline financial drafts | Partial | Existing in-memory write/unknown-result handling | No durable offline outbox in main; reload limitations remain | P1 | ledger-web/backend |
| 20. Extended customer profile, due dates, CSV/reporting | Partial/planned | Existing customer debt links, manual WhatsApp templates, day share | No evidenced due dates or delivery log; no invented overdue labels | P1 | product/backend/seller-web |
| 21. Hosted end-to-end availability | Blocked | Fresh public Chrome probes below | Render timeout; underlying infrastructure cause unverified | P0 | authorized hosting owner |

21 groups reviewed; groups 1–16 have automated implementation coverage, groups
17–21 remain blocked, partial or outside this baseline. This is not a count of
21 fully verified production functions; final pass/fail numbers are in the run report.

## Fresh public observations

Chrome opened the Pages login on 2026-11-11. Deployed entry bundle remains
`index-CCvUNJhC.js`; exact deployment SHA is not exposed. Its configured hosts are
the stated Render `/api/v1` and Supabase project `pdjjdqgoitnkpgkbqjtp`.
Public key presence checked without recording its value.

- Supabase `/auth/v1/settings`: HTTP 200, 1927 ms.
- Render `/api/v1/health`, `/openapi.json`, anonymous `/api/v1/me`,
  `/api/v1/venues`: each reached the browser's 12-second deadline (12261–12317 ms).
- CORS OPTIONS `/api/v1/me`: also timed out. No CORS policy can be inferred from silence.

No authenticated real-user request, money operation or paid AI call was made.
This establishes an unavailable backend from this laptop at that time, not a
proven database outage, expired quota, broken password or permanently stopped service.
Render Events/Logs and deployment configuration require the authorized owner.

## Defect accounting

Four confirmed code defects corrected: C1 unbounded Auth/read loading; C2
categorical quota message for ambiguous 429; C3 discarded Retry-After with
immediate manual resubmission; C4 switching to the first membership on reload,
which displayed another shop's zero summary after a successful sale. The browser
test reproduced C4 against real PostgreSQL before the fix; after the fix the
same scenario passed and SQL totals were 420000 / 220000 / 200000 tiyn.
One unresolved operational incident: I1 Render
requests time out. Missing planned features are not counted as fixed defects.
Dependency remediation remains in PR #102 and is not silently imported here.
