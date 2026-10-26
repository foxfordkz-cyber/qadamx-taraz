# Publication relationship to Research PR #100

Decision: one stacked Draft PR, `integration/qadam-diploma-v1` →
`feature/ml-sales-debt-research`. No change to PR #100 itself.

At the 2026-10-26 fetch, main is `2518b2e80b8c8ef881063a968645382d61aeb37e`.
PR #100 is open/Draft, base main, head
`1ece13a1a255e301526af93bb7ac38faeba0b047`, mergeable/clean. Both are ancestors
of Stage 11 `e94d9a71ded625881e94f8747430348a81e13e5f`.

| Comparison before Stage 12 documentation | Commits ahead / behind | Files | Insertions / deletions |
|---|---:|---:|---:|
| Stage 11 vs main | 33 / 0 | 594 | 81321 / 1590 |
| Stage 11 vs PR #100 head | 22 / 0 | 520 | 70141 / 190 |

Stacking removes the eleven Research commits already offered in #100 from the
review diff. The head branch still contains the COMPLETE application, including
Research, and can be cloned/run without separately merging #100. Most additional
files are reproducible synthetic evidence and acceptance tooling, not new product
modules. See [source provenance](source-provenance.md) for exact ancestry.

The owner must review #100 and the stacked PR in order. If #100 is squash/rebase
merged, stop and compare ancestry before any retarget or integration; do not
automatically rebase, merge, reset or force-push. A merge retaining ancestry allows
a later reviewed retarget to main. No merge/retarget is performed in Stage 12.
