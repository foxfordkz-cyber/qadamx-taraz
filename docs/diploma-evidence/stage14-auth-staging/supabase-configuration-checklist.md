# Independent Supabase configuration checklist

Placeholders only; owner supplies actual values privately, never in Git/issues.

| Item | Required setting |
|---|---|
| Project | STAGING_SUPABASE_URL; independent of existing shared project |
| Browser key | STAGING_SUPABASE_ANON_KEY → VITE_SUPABASE_PUBLISHABLE_KEY; use publishable format for build:hosted |
| Issuer | STAGING_JWT_ISSUER = approved project origin + /auth/v1 |
| Audience/signing | authenticated, asymmetric RS256/ES256 JWKS; no HS256 workaround |
| Callback | STAGING_AUTH_REDIRECT_URL, exact staging HTTPS origin + /auth/callback |
| Site URL/allowlist | Exact reviewed addresses, no wildcard/production reuse |
| Flow/destination | Existing PKCE explicit exchange; /seller after matching /me |
| Accounts | Synthetic A/B owners plus zero-membership user, private credentials |
| Email | Confirm-email, SMTP, rate limits, expiry/resend acceptance |
| CORS | Exact frontend origin on independent API |
| Service keys | Server only, independent DB/storage roles, least privilege |

Production bundle pins `https://qadamx-taraz.pages.dev/auth/callback` and blocks
registration on another deployed origin. VITE_AUTH_EMAIL_CALLBACK_URL cannot
override it. Stage14 retains this guard. Existing-test-user login can be planned;
staging email acceptance is BLOCKED pending approved callback code/config change
and tests. The template describes the desired callback, it does not enable it.
No accounts, email, callbacks or real project settings were changed.
