# Real Supabase acceptance — operator protocol

**Blocked / Not Run.** Local tests used signed synthetic JWTs and a loopback issuer,
not real Supabase. No credentials or settings were requested/changed here.

Required: captain's exact staging frontend/API SHA and HTTPS URLs; Auth owner's exact
project/issuer/audience/JWKS and callback policy; approved users A/B (different
memberships), zero-membership user C, fictional business and separate financial-write
permission. Operator signs in personally; never put passwords/tokens in this packet.

| Step | Operator action | Required observable result / evidence |
|---|---|---|
| 1 | Inspect build and protected route while logged out | Correct SHA/contract; no private data; API401; screenshot without secrets |
| 2 | A signs in using Qadam form | Genuine Supabase session; /me lists only A memberships; no Vercel/hosting login confused with app login |
| 3 | Select approved point | Dashboard, customer, Research and debt use that business; record initial totals from authoritative summary |
| 4 | B / foreign business | B cannot read A customer/history/research/feedback or mutate A sale; protected API404, no distinguishing data |
| 5 | Same business, different author | Feedback remains author-private even if both have membership |
| 6 | Zero-membership C | Onboarding, no invented business/automatic binding; no ledger access |
| 7 | A→B→A with a delayed old request | No stale response expires or populates the new session; capture request IDs/status only |
| 8 | Logout, reload, Back | Private cached data gone, protected route asks login; old business/feedback not visible |
| 9 | Expired token / revoked membership |401/404 and safe recovery; no retry causing duplicate money; owner-controlled test only |
| 10 | Registration/resend/callback, separately approved | Exact destination and one-use PKCE flow, state/error handling; no arbitrary redirect, no guessed staging URL |
| 11 | Review privacy | No JWT/key/password/raw customer data in console, traces, screenshot or Git |

Record browser/OS, timestamp, deployed frontend+API SHA, operation IDs only where
authorized, expected/actual and Pass/Fail/Blocked. Do not export HAR/storageState
or paste Authorization headers. Existing production Pages callback is **not** an
approved staging callback. Current registration guard deliberately refuses new
production origins; resolve S11-01 before step10.

If financial confirmation is authorized, use a new synthetic customer:3000 sale,
1000 received →2000 debt;500 repayment →1500. Double-click/retry must create one
operation per intended action. Verify API and persisted journal plus visible UI,
not just HTTP200. Any mismatch stops acceptance; do not auto-repair balances.
