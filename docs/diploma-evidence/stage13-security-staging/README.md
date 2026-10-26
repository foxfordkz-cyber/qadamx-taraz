# Stage13 — dependency security and isolated staging candidate

Branch: `feature/diploma-stage13-security-staging`.
Base: `integration/qadam-diploma-v1`, `55b39549bc52e767616763e0e1b5e8ab102c78e8`.
Implementation source: `9afb7ed65c4dae7dd2c2702029983932b3041466`. Final documentation commit is
available from this branch's Git HEAD / Draft PR; source hashes are in
[runs/verified-inputs.json](runs/verified-inputs.json).

**The development dependency advisories are fixed. Hosted staging/production is
NOT accepted or deployed.** All data/providers/auth used in executable acceptance
are explicitly synthetic local fixtures around real application/API/SQL code.

- [Fresh dependency audit](dependency-audit.md): three affected dev packages to zero;
  production audit remains zero.
- [Actual fix and compatibility](dependency-fix-report.md): Vitest3.2.7 →4.1.12;
  mocker4.1.12, tinypool removed, runtime packages preserved.
- [Stacked PR100/101 integration sequence](pr-integration-plan.md): do not duplicate
  commits, retarget/merge only by future owner approval.
- [Architecture diagrams](staging-architecture.md) and
  [configuration/startup/rollback](staging-configuration.md), with safe template.
- [0009 verification](migration-0009-verification.md) and
  [backup/recovery proof](backup-restore-report.md): two fresh21-check rehearsals.
- [All new test results and commands](full-test-results.md), including initial unit
  timeout and follow-up results; no inherited pass is counted as a fresh run.
- [Local demo/SQL/screenshots](demo-verification.md).
- [Real Supabase/AI/ASR protocol](live-auth-ai-test-plan.md): prepared, not executed.
- [Release blockers and next priority](blockers.md).
- [Complete changed-file and contribution inventory](changed-files.md).

Only this Stage13 worktree is modified. Original Stage12 demo and other worktrees
are preserved; final comparison is in runs/worktree-preservation.json. No ledger,
production Auth, OpenAPI, generated types, migrations or frozen datasets are
changed. No merge, history rewrite, shared DB migration, manual deployment or paid
AI call was performed. This stage prepares a reviewable incremental candidate.

## Evidence provenance and academic integrity

Backend/PG and browser tests use artificial records; synthetic JWTs/offline model
responses are not live provider acceptance. Test screenshots are actual installed
Chrome captures, not mockups. No new forecasting or extraction accuracy result is
claimed. Model limitations documented in earlier stages remain valid. No merchant
conversations, participant labels or user research results were invented.

The initial frontend timeout remains visible beside the passing follow-up; see
full-test-results.md. Provider and private deployment acceptance remain blocked by
specific approvals, not papered over by unit tests. Artifact hashes are in
artifact-manifest.json (the manifest excludes itself).

Published log copies use .txt because repository rules ignore .log. Their original
raw .log files stay in ignored tmp/stage13. The artifact manifest hashes canonical
Git blob bytes (normalized text line endings), not platform checkout encodings.
