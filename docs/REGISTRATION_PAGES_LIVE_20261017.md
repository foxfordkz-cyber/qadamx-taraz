# Registration release on Cloudflare Pages — 2026-10-17

## Published candidate, user-assisted live acceptance completed

- Production: https://qadamx-taraz.pages.dev
- Deployment: `51e0a264-e0e7-4635-9b26-e02c6587badd`.
- Published source: `818bb2561becb68e3f4c89cb9515620108d52f8f`.
- Original JS/CSS bundle source: `ff896931042eac106bb9cba0f1d5a4d7467d295f`.
- Corrected ZIP SHA-256: `6baf703f2641436053b3567204ea6176043e528d0f02755a65c0a87837a7014a`.
- Preview: `60ffb45d-9a21-4b79-9927-4543ebfe1afd`.
- Supabase now includes the exact Pages `/auth/callback` Redirect URL. Both
  previous Vercel callback URLs and Site URL were preserved.

The supplied ZIP matched its checksum, manifest and expected source, but its
explicit `_redirects` rewrites made Cloudflare return HTTP 308 to `/` for
`/auth/callback`. The first deployment `00e8cf17-ef4b-443e-b880-5f339ea394db`
was rolled back to `1cd035e1-b6db-43d4-8d0e-45914ecb777d` before email acceptance.
Commit 818bb25 removes those rewrites and uses native Pages SPA fallback. The
callback no-store/no-referrer headers remain. Runtime bundle files are unchanged.

The corrected archive was checked on Preview before Production. On each,
23 public files match SHA-256; eight route probes return HTTP 200 without following
redirects, including `/auth/callback` and a synthetic query-string probe.
Both callback probes retain `Cache-Control: no-store` and `Referrer-Policy:
no-referrer`. The exact Pages origin passes API CORS; anonymous `/me` is 401.

An existing ordinary user session survived a full production reload and loaded
all six assigned businesses and current analytics. This is existing-session
read-only verification, not a new-user email confirmation test or a fresh login.
The captain then completed registration and the real email link in the same
browser, reporting success. The agent independently observed the new account on
`/seller`, its own email label and the zero-membership state; a full reload kept
that same account signed in. The callback redirects to `/seller` only after
the authenticated `/me` result matches the confirmed session user. No tokens or
confirmation URLs were captured, and the email-click step is user-confirmed
rather than an agent-recorded network trace.

The captain subsequently signed out and signed in with the existing ordinary
account. The agent observed the real-data indicator and all six assigned
businesses. A full reload preserved this session and the business list.
These are real hosted checks, not Demo or synthetic Auth. No memberships were
added to the newly registered account.

## Concurrent final release preserved

While this check ran, the captain published final-defense source
`672731a9ca836782728a9f80493b68996c913adf` as deployment
`9fc7b2a8-bd91-4383-9f1a-b45518765558`. This was discovered after registration
publication. Comparison with the registration base `f023aae` showed no changes
under `apps` or `packages`: only README, reports and submission artifacts changed.
The integration branch now includes 672731a by ordinary merge
`671497a2914794b04f749045831155f13c2112d9`. Its runtime source is byte-identical
to published 818bb25. No newer application functionality was removed.

## Acceptance and rollback

Complete while signed out: register a new test email, open its confirmation link
in the same browser profile, confirm callback/session/`/me`, then reload. Do not
mistake an already signed-in session for successful PKCE confirmation. Never put
passwords, confirmation links or tokens in reports.

The live scenario above is now accepted within its stated evidence limits.
PR43 remains Draft in GitHub: its original head still contains the broken Pages
rewrites. The final integration branch also includes PR43 head `2b3c374` by merge
`7cdb34822087ec6d02a50eee31337122d36dec2a`; those additional changes are documentation
and test formatting only. Before main integration, retain routing fix 818bb25.
Main and deploy branches were not advanced by this task. If a later regression
requires rollback,
rollback Pages to the newer verified final-defense deployment
`9fc7b2a8-bd91-4383-9f1a-b45518765558`, then compare its 22-file manifest and
verify ordinary login. Earlier 1cd035e1 is only the historical rollback used
before the concurrent final release was discovered.

Render, database contents/schema, memberships and AI configuration were not
changed by this release work. No financial writes or paid AI calls were made.
Registration itself may create the user-authorized test Auth account.
