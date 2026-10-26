# Staging decision: NO-GO for deployment; separate owner approval required

This candidate is prepared for local synthetic demonstration and code review.
It is not authorized or verified for staging deployment. No push, PR, deploy or
shared-database migration was performed. Existing public Pages/Render releases
do not serve this local candidate merely because they share a repository.

Before an owner may change this to GO, complete and record:

- Approve exact source SHA, target staging environment, owners and rollback window.
- Review diff against deployed source, locked dependencies, API 0.8.0 contracts,
  flags and environment configuration. Use private secrets management; never copy
  local test issuer/provider settings into production.
- Record current database migration and role permissions. Migration
  `apps/api/migrations/versions/0009_research_feedback.py` adds private consented
  feedback after 0008: owner/business/request uniqueness, JSON consent check,
  index, RLS enabled and revocation from PUBLIC/anon/authenticated.
- Back up the target database with an approved retention/access policy. Restore
  that backup into a separate isolated database and rehearse the migration there.
  Record backup and restore verification, ownership/permissions, row counts and
  ledger totals. Local disposable-fixture migrations are not this rehearsal.
- Review 0009 on the target role: API server access must work, direct browser
  access must remain unavailable. Check consent, idempotent feedback, owner
  isolation, changed-body conflicts and data retention/withdrawal requirements.
- Apply to staging only after explicit owner authorization and confirmed backup.
  Never run this repository's truncate/downgrade pytest fixture on shared data.
- Rollback: stop writes/routing to the new candidate, restore prior application
  release/configuration; prefer preserving the additive feedback table. Downgrade
  0009 deletes feedback and must not be an automatic rollback. If restoration is
  required, restore to a separate DB and reconcile any intervening journal writes
  before switching; never silently lose financial data.
- Verify actual Supabase login, logout, refresh, callback allowlist, A/B ownership
  and customer/operation recovery on staging with approved synthetic accounts.
  Local signed test JWTs do not complete live authentication acceptance.
- Enable provider calls only after fresh model/budget/privacy approval. Stage 10
  paid calls = 0. Test invalid/refused/duplicate output and manual fallback.
- Verify HTTPS and real iPhone Safari, Android Chrome/APK build identity,
  microphone allow/deny, recording/playback, actual ASR and user confirmation.
  Desktop viewport emulation does not substitute for these tests.
- Check logs contain no JWTs, raw audio or real debt/customer details; verify
  observability, timeouts, backups and operational incident ownership.
- Obtain independent team review and acceptance signature before rollout.

Unexecuted: target backup/restore rehearsal, live Supabase/AI, physical devices,
staging migrations and deployment. Their absence prevents a deployment GO;
it does not imply these actions were attempted and failed.
