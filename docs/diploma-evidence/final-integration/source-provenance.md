# Candidate source provenance

The raw preflight is [source-provenance.json](source-provenance.json). It records
every local worktree's initial HEAD/status, relevant exact commits and production
tree IDs before candidate creation.

| Source | Verified SHA |
|---|---|
| origin/main | 2518b2e80b8c8ef881063a968645382d61aeb37e |
| Stage 6 integrated Research + factual validation | eb954bf7c2c6b1d18bf360e436ccf12bdbde30dd |
| Stage 7 extraction | 11ee40a77a2ff8de3c64818af9d9438b9e23fdf1 |
| Stage 8 evaluation | 08fd3eef541c6ab47f1d44e79d38778eefd2c784 |
| Stage 9 implementation | fa73fe4999c0201626643be7eaf9d2667dc328ef |
| Stage 9 evidence/head used as candidate base | a921b3f4d6d45a44d4529fb3045888f850cf9018 |

All six are ancestors of the candidate base (git merge-base --is-ancestor).
Stage 9's implementation→evidence production diff is empty. Stage 8→9 changes
only four backend service files: ai.py, openai_provider.py, extraction_grounding.py
and strict_json.py. Research, frontend and contracts were already integrated.
No duplicate merge or cherry-pick was needed.

A previously nonexistent branch integration/diploma-final-candidate was created
at Stage 9 evidence HEAD in its own qadam-final-candidate worktree. The original
worktrees and branches remain. Existing dirty files, including Stage 6's
demo-scenarios.md and older unrelated QA work, were not copied over or reset.

The new challenge and protocol were frozen before execution in commit
9946ce3 (use git rev-parse 9946ce3 for the full SHA). The source-provenance file
was copied from preflight and has no real customer data or secrets.

Final production tree/source hashes, exact commit references and preservation
checks are recorded in candidate-verification.json. Publication is prohibited
by this task: no push, automatic PR, PR #100 update, main merge or deployment.
