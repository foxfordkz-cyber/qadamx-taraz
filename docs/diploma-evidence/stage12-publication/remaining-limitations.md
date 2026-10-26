# Remaining limits: local demo GO, staging/production NO-GO

- Stage 12 is a publication/verification task, not a deployment or new product
  implementation. Production source/financial rules remain the verified candidate.
- Fresh `npm audit` returned exit1: Vitest and tinypool critical, @vitest/mocker
  moderate. These are development/test dependencies. The registry proposes a
  Vitest5 major upgrade; no automatic dependency/lockfile change was made. Scope,
  exploitability and upgrade regression require review. See security-check.md.
- No real Supabase email/login/callback, managed-role/RLS, external AI/ASR,
  physical microphone, mobile APK or production acceptance was run. Local JWT
  tests do not prove live provider configuration.
- Production registration callback is intentionally pinned to the approved Pages
  URL. Arbitrary production Preview origins are blocked. Do not weaken this
  guard for a convenient preview; obtain an approved origin/callback first.
- Migration 0009 research_feedback exists and is tested locally. Applying it to
  shared PostgreSQL/Supabase needs separate backup, role and rollout approval.
  The local role has elevated privileges; managed service privilege behavior is
  a distinct gate. A downgrade removes feedback and is not a lossless rollback.
- Feedback consent exists; real participant recruitment, retention/withdrawal
  ownership and independent annotation remain unexecuted. No research participants
  or personal merchant datasets are invented.
- Frozen synthetic fixture errors S7-090, S8-080 and S8-084 remain reported.
  The Stage 8 corpus is now exposed regression data; repeated results are not new
  independent model accuracy. Stage 10's42 cases are authored by the same researcher.
- Forecast comparison on synthetic SQL demonstrates the pipeline and may select a
  seasonal baseline. It does not establish accuracy on merchants. Debt priority
  is explainable rules, not a trained default-probability model.
- Package version 0.6.2, historic README/deployed API badge 0.7.2 and candidate
  OpenAPI 0.8.0 describe different things. No silent version bump is made here.
- Other standalone E2E suites are not implied by the reported named suite counts.
  Automatic GitHub CI/Preview is reported independently, never as live acceptance.
