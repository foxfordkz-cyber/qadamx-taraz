# Baseline audit

Fresh `git fetch origin --prune`, 2026-10-27. Starting tree clean, origin:
https://github.com/foxfordkz-cyber/qadamx-taraz.git.

| Ref | SHA | Fresh status |
|---|---|---|
| main | 2518b2e80b8c8ef881063a968645382d61aeb37e | unchanged |
| feature/ml-sales-debt-research / PR100 | 1ece13a1a255e301526af93bb7ac38faeba0b047 | open Draft, clean |
| integration/qadam-diploma-v1 / PR101 | 55b39549bc52e767616763e0e1b5e8ab102c78e8 | open Draft, clean |
| feature/diploma-stage13-security-staging / PR102 | a42c72d7b954f5fe7ea8f780e7cb587639000419 | open Draft, clean |
| fix/seller-auth-unicode | 28960f21e13c9c38077bf68b7bb5449eb9aa824d | remote exists |

Remote integration/team-mvp, integration/local-combined-check,
feature/seller-design-integration and feature/seller-analytics are absent after
prune. Historical local worktrees are preserved, not recreated remotely.
New worktree `work/qadam-stage14-auth-staging` starts at exact Stage13 HEAD;
34 other worktrees inventoried before edits.

Commands: git rev-parse --show-toplevel; git branch --show-current; git status
--short; git remote -v; git fetch origin --prune; git for-each-ref; git worktree
list --porcelain; git rev-list --left-right --count. Read-only GitHub PR/check/
status/workflow APIs: [metadata](runs/github-review.json).

Read AGENTS, CONTRIBUTING, README, PROJECT_STATUS, DECISIONS, TEAM_INTEGRATION,
backend role/API instructions, backend handoff and Stage11–13 evidence. Historical
README schema0008/API0.7.2 hosting notes do not certify this candidate: current
OpenAPI0.8.0, migration head0009_research_feedback. Stage13's first frontend timeout
remains historical evidence, not erased by subsequent passing runs.
