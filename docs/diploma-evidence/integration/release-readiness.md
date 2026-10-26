# Release readiness — 2026-10-25

**GO for local team review / explicitly offline academic demonstration. NO-GO for production rollout.**

The integrated implementation runs in an isolated worktree, with actual HTTP/PostgreSQL tests and visible synthetic provenance. This conclusion does not authorize publication, deployment or migration.

## Release gates

| Gate                                    | Result                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Research + Stage 1 histories integrated | Local merge ae43dc2; one documentation conflict resolved preserving both sides                                            |
| New cross-module acceptance             | Three browser/API/SQL tests passed, including immutable assistant journal fingerprint                                     |
| Source branches preserved               | Research 1ece13a and Stage 1 delivery 17f6f60 unchanged                                                                   |
| Public API compatibility                | Local 0.8.0; contract tests and generated TypeScript check pass; Stage 1 keeps public assistant response                  |
| 0009 migration                          | Applied/check verified on fresh local DB; backend suite tests migration lifecycle. Shared DB unmodified                   |
| Frontend/back-end coordination          | Must release Research-capable API and permission-reviewed 0009 before claiming hosted Research works                      |
| PR100                                   | Remains open Draft, main→Research, mergeable/clean; Vercel status success belongs to Research only                        |
| Combined CI/Preview                     | No remote branch/PR; therefore no combined remote CI or Preview                                                           |
| Hosted Preview                          | Read-only probe redirects to Vercel login before Qadam; protection not bypassed                                           |
| Hosted API                              | 40-second read-only probe timed out on 2026-10-25; previous observed 0.7.2 lacked Research. Current capability unverified |
| Live provider                           | Not run; offline structured outputs validate pipeline but not provider compatibility or quality                           |
| Hosted auth/email and devices           | Not run; separate authorized acceptance still needed                                                                      |
| Real dataset / user study               | No verified real merchant dataset or participants; no scientific population claim                                         |

See [combined-test-report](combined-test-report.md) for exact executed commands/counts, including initial environment failures.

## Next engineering stage

1. Team review the local merge and evidence; decide whether to authorize publishing a dedicated integration PR.
2. Owner prepares a protected staging backend/DB with backup and approved 0009 migration, plus a matching frontend build; no production secrets in artifacts.
3. Verify actual Supabase login/session refresh and membership on a dedicated test business.
4. With separate budget authorization, test Stage 1 private structured schema against the real provider, including failure/fallback and RU/KZ; then physical audio if required.
5. Collect consented real historical data and feedback under a reviewed research protocol before evaluating model generalization.
6. Only after those gates, approve a controlled release and rollback plan.

Do not merge PR100 or this local branch merely because the local tests pass.
