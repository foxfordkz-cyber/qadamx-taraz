# Supabase Auth acceptance matrix

A = local synthetic JWT/SDK doubles. B = separate staging with real Supabase.
C = production. B and C are NOT RUN for this candidate throughout this table.

| Case | Source / fresh A evidence | Required B/C acceptance |
|---|---|---|
| Signature/sub | app/auth.py; test_auth verifies ES256 signature via loopback JWKS | Project-issued token matches /me |
| Wrong signature/alg/kid | RS256/ES256 allowlist, required kid; wrong/none/HS256 rejected401 | Altered token denied; key rotation/revocation |
| Missing/expired/issuer/audience/role/anonymous | Required exp/iat/iss/aud/sub/role; UUID; test_auth rejects401 | Same failures with real project and no token logging |
| Unavailable JWKS | New regression: sanitized503 AUTH_UNAVAILABLE | Outage/recovery without bypass |
| Missing Bearer/unconfigured Auth | Missing401, unconfigured verifier503 | No private data |
| Refresh/expiry | autoRefreshToken, scoped getToken; targeted Auth tests | Real refresh, expired refresh, reload |
| A→B→A/logout | generation guards; qa-auth-regression and callback tests | Cache reset, old401 isolation; local logout does not revoke all devices |
| Email | SDK events establish session; exchange and /me identity checks | Confirm-email/SMTP/resend/expired/replayed link |
| Callback | PKCE; detectSessionInUrl false;19 config cases plus callback tests | Independent exact allowlist + approved frontend change |
| CORS | Exact origins, Authorization/Idempotency-Key; inventory rejects wildcard | Allowed/disallowed origin; CORS is not authorization |
| Membership/tenant | Fresh PostgreSQL drafts/ledger/feedback, foreign404 and revoked membership | A cannot access B before/after provider wait |
| Feedback | Per-author GET, consent, replay/conflict tests | Real subjects + reviewed DB role |

[Fresh tests](stage14-test-results.md). A does not verify real Supabase DNS/TLS,
RS256 rotation, email delivery or project settings. TokenVerifier does not enforce
an independent email-confirmed claim; it trusts approved Supabase authenticated
session policy. Review confirm-email settings explicitly. No live settings changed.
