# Source provenance — 2026-10-26

Publication source: **e94d9a71ded625881e94f8747430348a81e13e5f**,
`review/diploma-stage11-readiness`. New separate worktree/branch:
`integration/qadam-diploma-v1`. Original origin URL is unchanged:
https://github.com/foxfordkz-cyber/qadamx-taraz.git.

| Preserved stage | Exact commit, confirmed ancestor |
|---|---|
| Main at fetch | 2518b2e80b8c8ef881063a968645382d61aeb37e |
| Research PR #100 | 1ece13a1a255e301526af93bb7ac38faeba0b047 |
| Stage 1 implementation | 6ac5266abddffa7f1278d403ece55cc3eba457a1 |
| Stage 6 integration | ae43dc25543ab261511c8b5f5982c7dfe8112da8 |
| Stage 7 evidence | 11ee40a77a2ff8de3c64818af9d9438b9e23fdf1 |
| Stage 8 evidence | 08fd3eef541c6ab47f1d44e79d38778eefd2c784 |
| Stage 9 evidence | a921b3f4d6d45a44d4529fb3045888f850cf9018 |
| Stage 10 final candidate | e825dd9a9568dda33a9226e1941e789fd21d2175 |
| Stage 11 release review | e94d9a71ded625881e94f8747430348a81e13e5f |

Stage 11 is 33 commits ahead of main, 0 behind; 22 ahead of Research PR #100, 0 behind.
No main conflict exists in this ancestry comparison; no merge was needed.
The 22 previously local-only commits (authors, times, subjects, full hashes) and
33 worktree snapshots are in [source-provenance.json](source-provenance.json).
Ten pre-existing dirty worktrees are recorded; none of their unfinished changes
were staged or published. The new worktree was initially clean. No history rewrite,
cherry-pick/repeated integration, deletion, remote/ownership change was performed.

Publication adds only test-output isolation and current verification/development
documentation. Production modules, financial ledger, Auth, API contracts,
migrations and frozen datasets remain unchanged from Stage 11. Stage 11 already
preserves Stage 10 production source. Git authorship remains exactly in history.

## Verified safety backup

A local full Git bundle prepared before publication was reused and reverified:
149079156 bytes; SHA256
`9d5281c50b5b500279aaf134e5746672848d8b0f0a72964ee1bae961cdb431fc`.
It contains 75 refs, all 32 pre-publication worktree HEADs, unique branches and tags.
Restored refs match, restored fsck exit 0, Stage 10/11 commits resolve in the restored
local backup. No ignored .env, database directories or dependencies were copied.
The bundle and restore remain local, are NOT GitHub artifacts, and are not deleted.
See [backup-verified.json](backup-verified.json).

The personal-repository migration was cancelled before repository creation:
read-only GitHub lookup returned 404 for the proposed personal destination. No
active migration command remained. Stage 12 uses only the existing repository.
