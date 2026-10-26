# Separately authorized staging plan

Status: **NO-GO to deploy now**. This file is a plan, not permission or deployment evidence.
Target URL, infrastructure owner, isolated DB, Auth project and test accounts: unassigned.

## Configuration inventory

| Layer | Required approved settings | Current verification |
|---|---|---|
| React | HTTPS VITE_API_BASE_URL ending exactly /api/v1; VITE_SUPABASE_URL; publishable key | Guard accepts synthetic valid config, rejects HTTP/wrong suffix/server-secret variable |
| Hosted build | `node scripts/build-hosted.mjs`; VITE_CUSTOMER_IDS_ENABLED pinned true | Must pair with customer id lookup/recovery API; do not deploy older API |
| Assistant | VITE_ASSISTANT_ENABLED + ASSISTANT_ENABLED | Keep both off until approved paid acceptance; default backend off |
| FastAPI | artifact SHA + OpenAPI 0.8.0; Python3.12 lock; ALLOWED_ORIGINS exact origins | Source verified locally; health alone insufficient |
| Auth | SUPABASE_URL, JWT_ISSUER, JWT_AUDIENCE; exact callback/redirect allowlist | Real project and staging callback not approved; S11-01 |
| PostgreSQL | secret DATABASE_URL; backend role, TLS, pool limits; migration head0009 | PG17.11 locally verified only; managed target permissions not exercised |
| Provider | AI_PROVIDER, exact model, private key; ASR model if applicable | Templates are not proof of access; paid calls disabled/not authorized |
| Fallback/timeouts | AI_FALLBACK_OPENAI=false for comparison; reviewed request timeout/count | Count possible native provider retries separately |
| Other existing features | STORAGE_SERVICE_KEY/STORAGE_BUCKET server-only if required; LIVESTOCK_DEMO_MODE policy | Do not use live storage or real market data in rehearsal |
| Research | No independent feature switch currently supplied | Whole candidate/API+0009 must be compatible; do not invent a flag |

Never expose DATABASE_URL, service_role, provider keys, JWTs or credentials via VITE_*,
public logs, source, screenshots or evidence exports. Supply secrets through approved
environment management, not a committed .env. Do not copy local test issuer/QA routes
or `tests/*browser_server.py` to a hosted deployment.

## Ordered gates / owner sign-off

1. Captain names candidate SHA/base/PR sequence and approves publication separately.
2. Independent team reviewer reviews production delta, financial isolation and known
   findings; no AI-only review claim.
3. Infrastructure owner assigns isolated staging HTTPS/API/DB/storage and rollback
   artifact; capture current schema and permissions. Take encrypted backup; restore
   into another isolated target and reconcile journal/receipts/feedback.
4. Auth owner resolves exact PKCE callback/origin and real membership provisioning.
   No wildcard, unapproved Supabase change or production account migration.
5. Apply 0009 only after backup, permission and compatibility approval. Upgrade DB
   before starting ORM/API that requires it. Keep frontend/backend contract aligned.
6. Build locked frontend/API from pinned source. Check API export, CORS, routes,
   health AND protected /me, summary, research reads. Record deployed SHA, not only 200.
7. Run real Auth and tenant checklist using approved synthetic business/accounts.
8. Enable bounded live AI only after separate approval; human confirmation remains.
9. Require financial reconciliation, withdrawal procedure and privacy sign-off
   before any real participant study.
10. Roll back application artifact if needed; prefer retaining additive0009. Never
    run destructive downgrade as a default rollback. Stop writers and reconcile before
    restoring a DB; data after backup otherwise can be lost.

This task deployed nothing. Local migration uses a superuser on a fresh cluster,
so managed DB CREATE/ALTER/RLS/role permission compatibility remains an explicit gate.
