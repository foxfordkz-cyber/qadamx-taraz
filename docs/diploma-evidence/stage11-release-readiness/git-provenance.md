# Source provenance and publication decision

Captured after `git fetch origin --prune`; see [source-provenance.json](source-provenance.json)
and final `completion-verification.json`. No old worktree was switched, merged or cleaned.

| Source | Exact revision |
|---|---|
| Stage10 application/docs | e825dd9a9568dda33a9226e1941e789fd21d2175 |
| Stage6 | eb954bf7c2c6b1d18bf360e436ccf12bdbde30dd |
| Stage7 | 11ee40a77a2ff8de3c64818af9d9438b9e23fdf1 |
| Stage8 | 08fd3eef541c6ab47f1d44e79d38778eefd2c784 |
| Stage9 | a921b3f4d6d45a44d4529fb3045888f850cf9018 |
| origin/main | 2518b2e80b8c8ef881063a968645382d61aeb37e |
| PR100 head | 1ece13a1a255e301526af93bb7ac38faeba0b047 |

All listed stages are ancestors of Stage10. Main is also an ancestor: candidate is
30 commits ahead, zero behind. The inventory lists **19 local-only commits** relative
to *all* origin refs, in order, plus every candidate/main changed path and commit.
Publishing a future branch at the candidate tip would make those ancestors reachable;
pushing all historical branch names is unnecessary.

[PR100 read-only snapshot](pr100-readonly.json): open, Draft,
`feature/ml-sales-debt-research → main`; GitHub reports mergeable/clean for **PR100**.
This is not a GitHub conflict check for a nonexistent Stage11 PR.
The integrated candidate contains PR100's work, so it overlaps that PR. Captain must
choose the integration/review sequence; do not merge two overlapping proposals blindly,
close PR100 automatically or cherry-pick its changes twice.

An independent Draft PR is technically feasible against the inspected main without
rebasing. Publication is **not authorized in Stage11**. Human review, sensitive-file
review and captain approval remain gates. Future fetch may change this conclusion.
A future publish must recheck main, remote branch existence and diff; stop on divergence.

The inventory preserves all worktree HEADs and short statuses. Ten pre-existing
worktrees have dirty/untracked work (assistant QA, earlier diploma demo notes,
screenshots, measurement, microphone and customer recovery work). They are not
silently included in this candidate. Status/HEAD equality does not prove byte-level
preservation of every ignored or untracked file. Only new ignored demo logs were
added to the verified Stage10 checkout; no tracked files there were edited.

Application delta versus main is already recorded under `candidate_changed_files`.
Stage11 adds only review tools/tests/evidence and backend handoff/decision notes.
Application, migrations, contracts and Stage1/7/8/9 frozen data remain identical to
the verified candidate. The checked source is local; public Pages is not evidence
of this SHA being deployed.
