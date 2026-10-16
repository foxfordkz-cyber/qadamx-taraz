# Qadam demo: Vercel + Render

**Current checkpoint, 2026-10-16:** captain published web **https://qadamx-taraz.vercel.app** and API **https://qadamx-taraz.onrender.com/api/v1**, source commit0f97c44. New real hosted Auth/AI checks, evidence limits, budget and diagnostic patch: [HOSTING_AI_ACCEPTANCE](HOSTING_AI_ACCEPTANCE.md). API0.6.2/DB0006 confirmed; OpenAI-primary/gpt-transcribe confirmed by supplied runtime log. Complete hosting acceptance is still pending; active deployment SHA/extraction model/SSL require account-side evidence. The setup text below records the earlier preparation state, not a claim that the published hosts do not exist.

Prepared 2026-10-16 from PR #35 `cacf57a` (application candidate `b899902`).
This branch adds deployment configuration only. **No hosted service or permanent
URL has been created or verified.** Current laptop services remain untouched.

## Candidate limitations

- API 0.6.2 expects existing Supabase revision `0006_customer_requests`.
- Frontend recovery `fd21874` is excluded: separate forms can issue different
  keys after an unknown result. Do not advertise recovery UI as delivered.
- Full registration `10d9bba` is excluded pending callback/email acceptance.
- Gemini is still the default and may return 503. OpenAI code exists, but this
  deployment does not silently change the provider or enable fallback.
- Physical microphone/Android and this hosting environment are not accepted yet.
- Supabase contains educational data. Keep `LIVESTOCK_DEMO_MODE=true`.

## 1. Accounts and billing

The captain has Vercel; a Render account is still needed. Select the free Render
workspace/Free web service, never a trial requiring a paid upgrade. Do not add a
payment method or enable billable add-ons as part of this task. If Render requires
card verification, stop and let the captain decide. Vercel Hobby is for personal,
non-commercial use: this is an educational hackathon demo, not a paid business
deployment. Reassess plans before commercial use.

Render Free: 512 MB / 0.1 CPU, sleeps after 15 minutes of inactivity, cold start
about one minute, 750 instance hours/month shared by a workspace. Outbound traffic
and build allowances apply; without a payment method exceeding allowances can
suspend services/builds. Supabase/API/Storage traffic counts as external traffic.
Free is suitable for demo evaluation, not a guaranteed available production system.

## 2. Create backend

Use branch `deploy/permanent-062` and root `apps/api` on Render. `render.yaml`
defines only one **Free** web service, Singapore, no database or persistent disk.
If importing a Blueprint is unavailable, enter the same values manually:

- Python 3.12.12, `PYTHON_VERSION=3.12.12`.
- Build: `pip install uv==0.12.10 && uv sync --locked --no-dev`.
- Start: `uv run --no-sync python deploy_start.py`.
- Health: `/api/v1/health`; one worker; disable automatic deploys.

The start command never runs Alembic or seed. Before initial traffic, read the
existing DB revision privately and confirm `0006_customer_requests`; do not repeat
migration merely because the hosting location changes. Preserve SSL in DATABASE_URL.

Enter ONLY the following server settings through Render's secret environment UI
from the existing ignored env. Do not upload the entire env, which contains test
tokens and could contain passwords:

| Variable | Value/source |
|---|---|
| DATABASE_URL | Existing Supabase PostgreSQL URL, including SSL |
| SUPABASE_URL | Existing public project URL |
| JWT_ISSUER | SUPABASE_URL + `/auth/v1` |
| JWT_AUDIENCE | `authenticated` |
| ALLOWED_ORIGINS | JSON array of exact Vercel origin(s), no path/wildcards |
| STORAGE_SERVICE_KEY | Existing server-only key |
| STORAGE_BUCKET | `livestock-photos` |
| LIVESTOCK_DEMO_MODE | `true` |
| AI_PROVIDER | `gemini` (preserves current mode) |
| AI_API_KEY / AI_MODEL | Existing Gemini secret and model |
| AI_FALLBACK_OPENAI | `false` |

For a separately agreed OpenAI-primary mode, set AI_PROVIDER=openai and enter
OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TRANSCRIPTION_MODEL. Never send these to Vercel.
The start script validates required names but a health 200 is **not** DB/Auth/AI
acceptance. No paid AI probes are automatically performed by deployment scripts.

## 3. Create frontend

Import the same repository/branch into Vercel, root **apps/web**, Vite framework.
Confirm the intended deployment branch: do not accidentally deploy older main.
`vercel.json`: npm ci, guarded build, output dist, SPA deep-link rewrites.

Set only public frontend values in the actual deployment environment:

```
VITE_API_BASE_URL=https://<actual-render-service>.onrender.com/api/v1
VITE_SUPABASE_URL=https://<existing-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<existing-sb_publishable-key>
```

Obtain the actual Vercel project domain and add that exact origin to backend CORS.
The backend URL goes directly to Render, including audio/photos: do not proxy
uploads through Vercel Functions (4.5 MB limit versus app 8 MiB limits).
Ensure the public Vercel deployment is accessible without team login; do not
disable application Supabase authentication. Smoke-test asset URLs and deep links
(`/login`, `/seller/analytics`, `/venues/mart`) after deployment.

Do not change Supabase Site URL/redirect allowlist speculatively: current included
build is login-only. Add exact callback URLs only with accepted registration code.

## 4. Acceptance before switching the team

Record actual hosting deployment commit IDs and URLs. Check:

1. health, OpenAPI 0.6.2, no browser localhost requests, exact CORS.
2. Supabase A/B login, `/me`, reload/logout and foreign point 404.
3. Client create/recovery API/replay/conflict using educational data; record IDs.
   Legacy UI cannot claim unknown-result recovery until its fix is integrated.
4. Sales/repayment/history/analytics, unchanged monetary rules and isolation.
5. Livestock feed, market, minimum, private JPEG upload/read/replay/foreign denial.
   Test near-limit photo/audio and rejection over limit. Verify memory usage with
   the app's actual decoding path. 512 MB adequacy is unproven until tested.
6. AI failure keeps input/manual path; live text/audio tests only within the
   remaining approved provider budget. Financial confirmation must stay explicit.
7. WebGL + 2D fallback and physical phone recording/playback/cancel.
8. Wait naturally for Free service idle shutdown, then measure first-request
   recovery. Do not add keepalive loops to defeat the free service policy.
9. Restart hosted API and verify persisted records/Storage remain available.

Render's documented ingress body/timeout limits were not established by the
FastAPI quickstart: acceptance must verify actual 8 MiB+multipart behavior and
25-second AI flow. Do not promise upload success just because health is green.
Local Docker engine is unavailable; Linux PyAV/psycopg wheel installation must
be confirmed in the Render build log before marking deploy accepted.

Only after acceptance give Flutter the permanent API and frontend URLs and
rebuild the APK if config is compile-time. Resolve pending requests against their
original API before changing origin. Do not automatically resend them as new
operations at a new address. Keep old tunnels until this transition is complete.

## Official sources checked 2026-10-16

- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
- https://render.com/docs/deploy-fastapi
- https://vercel.com/legal/terms
- https://vercel.com/docs/functions/limitations

## Checks for this configuration

Checks and publication commit are recorded in backend handoff. Application-level
309 backend / 265 frontend results belong to the upstream candidate review and
are not new hosting tests. A permanent deployment and cold start are pending
account access, remote build and actual HTTP/browser acceptance.
