# Git publication record — 2026-10-26

Existing repository: https://github.com/foxfordkz-cyber/qadamx-taraz.
Published branch: [integration/qadam-diploma-v1](https://github.com/foxfordkz-cyber/qadamx-taraz/tree/integration/qadam-diploma-v1).
One **[Draft PR #101](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/101)**,
base `feature/ml-sales-debt-research`, head `integration/qadam-diploma-v1`.

Initial source push succeeded; local/remote both resolved to
**e94d9a71ded625881e94f8747430348a81e13e5f**. This publishes all Stage 1–11
ancestors, including Stage10 `e825dd9a9568dda33a9226e1941e789fd21d2175`.
This subsequent Stage12 documentation/test-config commit preserves that exact
application source; its latest exact SHA is available in PR #101 and `git rev-parse
HEAD`, rather than a self-referential hash inside this commit.

Main remains `2518b2e80b8c8ef881063a968645382d61aeb37e`. PR #100 remains
open/Draft, base main, head `1ece13a1a255e301526af93bb7ac38faeba0b047`.
GitHub reported PR #101 mergeable=true/clean; no merge was performed.
See [GitHub receipt](github-receipt.json) for the initial publication snapshot.

The remote branch did not exist before the first push, so pull was not applicable.
Before the Stage12 follow-up push, fetch and ff-only pull of this own branch are
used. Final remote/local equality is checked by the publishing agent and reflected
in the PR body. No force push, rebase, reset, branch deletion or PR #100 mutation.

The first attempted documentation commit was stopped by `git diff --check` on
three trailing blank lines in copied command logs. Only those copies were trimmed,
original logs retained, and manifest regenerated. The already verified Stage11
source was published first; Stage12 evidence follows as a normal descendant.

## Automatic CI is not acceptance

For source e94d9a71, GitHub reported Vercel status success ("Deployment has
completed") and Vercel Preview Comments check success. These are automatic effects
of the existing integration after an authorized branch push. No deploy command,
production setting or merge was issued. The Vercel app itself, protected Preview
login, environment classification and live Auth/DB/AI were not accepted by this
task. A subsequent documentation push may trigger another automatic run; inspect
the current PR status separately. Staging/production remain NO-GO.

## Running local demonstration

http://127.0.0.1:4303/login; API http://127.0.0.1:8322/docs.
Checkout source is the published e94d9a71 above, with identical product trees in
the Stage12 follow-up. The new local DB is
`qadam_research_browser_stage12_ready_test`, offline provider and synthetic local
JWTs. Initial clean point has zero operations/sales/receipts/debt/feedback and
five fixture customers. [Ready record](demo-ready.json),
[read-only initial SQL](demo-initial-sql.json), [commands](local-demo-guide.md).
No old demo database or worktree was deleted. The old owned demo processes were
stopped to free their ports; the published checkout now serves the new demo.
