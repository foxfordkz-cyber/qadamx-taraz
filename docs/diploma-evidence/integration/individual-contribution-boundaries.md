# Contribution boundaries — local Stage 6

This record describes code provenance and actual work, not percentages of human effort.

| Workstream                                                  | Provenance                                                                                            | Stage 6 handling                                                                                            |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Existing Qadam platform, UI, auth, ledger, analytics, voice | main 2518b2e and its team history                                                                     | Preserved; no reimplementation or ownership claim                                                           |
| Research forecasting, risk rules, feedback, stabilization   | feature/ml-sales-debt-research 1ece13a / Draft PR100                                                  | Reused as complete integration base                                                                         |
| AI factual validation                                       | independent delivery 17f6f60; implementation 6ac5266; author recorded as Codex                        | Verified bundle and frozen corpus, integrated without recreating                                            |
| Stage 6 integration                                         | local merge ae43dc2                                                                                   | Resolved only appended DECISIONS documentation conflict, kept both sides                                    |
| Stage 6 new work                                            | new offline demo harness, three cross-module browser tests, SQL verification and integration evidence | AI-assisted implementation/verification in this local worktree; no claim of manual authorship or user study |

## Exact new paths

- `apps/api/tests/diploma_browser_server.py`: guarded fixture wrapper, local draft/assistant providers, SQL snapshot including all-business ledger fingerprint.
- `apps/web/e2e/diploma.playwright.config.ts`: isolated real API/browser configuration.
- `apps/web/e2e/diploma.acceptance.ts`: full seller flow, structured assistant and RU/KZ responsive assertions.
- `docs/diploma-evidence/integration/**`: diagrams, actual test/experiment evidence, screenshots, demo/release instructions.
- `docs/handoffs/seller-web.md`: appended Stage 6 local integration handoff.

No Stage 6 edits to production `apps/web/src`, production `apps/api/app`, financial contracts, generated types or frozen Stage 1 fixtures. Their merge changes are attributed to the original source history.

Use `git log --oneline --first-parent` and `git diff --name-status ae43dc2..HEAD` to distinguish Stage 6 additions from inherited work. Source branch heads and PR100 remain unchanged. The integration branch is local only; publishing requires separate user authorization.
