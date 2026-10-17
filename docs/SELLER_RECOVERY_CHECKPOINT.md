# Checkpoint continuation — 2026-10-17

Resumed by explicit user request from published HEAD
`25525053b7e4ac0fe20f5280d1a9a9053dd2e57a`, in the same clean worktree.
Fetch/prune and own-branch pull --ff-only succeeded. Current main was verified as
`9845b91b64d388c54312d2a8a75000218c7774af`; its two documentation changes were
merged as expressly authorized, without conflicts, in
`0aa8561dffae12021339132370adaa9a54bc03f5`. The saved Recovery application and
test code did not change. No old PR was merged, and PR #31 was not modified.

The final full serial run now confirms **311/311 unit/component tests**, including
both companions that previously ran only separately. The original captain case
also passes independently (1/1); strict microphone tests pass 35/35. npm ci,
check:api, typecheck, lint, build and format:check passed on the synchronized code.
All six browser suites passed: Recovery 5/5, QA 21/21, Voice integration 1/1,
Auth onboarding 7/7, microphone 18/18 and Analytics/Seller/public 24/24.
Review and publication status are maintained in
[seller handoff](handoffs/seller-web.md), with the [technical report](SELLER_CUSTOMER_RECOVERY_SAFE.md).

Published [Draft PR #42](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/42)
from `fix/seller-customer-recovery-safe` to `main`. Verification report commit
`14f5ad8129605f47f65967603401c5c3cd17851f` was pushed and matched remote HEAD.
The following docs-only commit records this publication; get the exact current
revision with `git log -1 --format=%H`. No merge into main or manual deployment
was performed. The repository's automatic Vercel preview reported success for
`61044473a2be3026294c2d17f3d5f26ff1f39f28`; no live browser acceptance was run.

To continue in the existing worktree, inspect `git status --short`, run
`git fetch origin --prune`, compare main/related PRs and use
`git pull --ff-only origin fix/seller-customer-recovery-safe`. Stop on divergence;
do not reset, rebase or merge other branches automatically. All required local
verification is complete; live acceptance remains gated as documented.

The checkpoint below is historical: its pause and missing final checks describe
the earlier session, not a new instruction to stop. Resume from the current
branch HEAD, not by resetting to this historical snapshot.

---

# Historical checkpoint — paused by user, 2026-10-17

User requested an immediate safe checkpoint because approximately 10% of the
session limit remains. Do not resume tests or new work until the next request.

## Repository and branch

- Repository: https://github.com/foxfordkz-cyber/qadamx-taraz
- Worktree: `work/qadam-customer-recovery-safe` (under this task workspace).
- Branch: `fix/seller-customer-recovery-safe`.
- Base checked at task start: `origin/main:07197bec0a8ac331714eea3036f3af6eac939e7e`.
- Saved implementation WIP: `1bf9fe417f35bbafd6a47d6a054914f7b621f9fd`, pushed successfully; local/remote HEAD matched. The documentation-only follow-up records final Git freshness.
- Final fetch found main advanced to `9845b91b64d388c54312d2a8a75000218c7774af`. Its two new commits only add `docs/DEMO_NAMES_RU_KZ.md` and update `docs/handoffs/backend.md`; no file overlap with this recovery diff. Nothing was merged. Recovery base remains07197be. Compare fresh main on resume and obtain approval before any base merge.
- This checkpoint is a WIP commit, not final acceptance. Exact checkpoint hash:
  `git log -1 --format=%H` on this branch. Final response records the published hash.
- No unresolved Git conflicts. No merge into main, force push, reset or deploy.

## Completed

Registration synchronization is already published separately as
`6f808677c067cc00fb6b6b9eb26384f68c3d1e38`, branch
`feature/seller-registration-onboarding`, open Draft PR #31. Authorized main merge
resolved only `docs/DECISIONS.md`, preserving both sides. Last GitHub read:
mergeable=true; base remains `integration/voice-preview-061`. No callback rollout.

Recovery selectively imports source9a3c868 and implements shared coordination,
key+bodyHash compare-and-clear, mounted owner/session/user/business/API guards,
Web Locks across tabs, preserved unknown keys, same-body explicit retry, GET-only
reload and blocked unknown-origin legacy records. Captain test reproduced RED on
old code and is now an ordinary passing regression. No backend/contracts/generated,
financial, Voice/public production modules, models, dependencies or secrets changed.

Detailed architecture and complete changed-file list:
[SELLER_CUSTOMER_RECOVERY_SAFE.md](SELLER_CUSTOMER_RECOVERY_SAFE.md).
Prepared 17-row rehearsal: [SELLER_FINAL_DEMO_REHEARSAL.md](qa/SELLER_FINAL_DEMO_REHEARSAL.md).
It separates synthetic evidence and fresh read-only HTTPS probes from blocked
live Auth/DB/AI/physical-device steps. No shared DB writes, real email or audio.

## Tests actually completed

Recovery worktree:

- npm ci; check:api; typecheck; lint; build; format:check and git diff --check passed
  in the earlier full run.
- Full serial unit/component run: **309/309**, 21 files.
- Strict microphone unit/component: **35/35** (27 overlap the default suite).
- Recovery Chromium E2E: **5/5**, including native Web Locks and two real tabs.
- Existing QA E2E: **21/21** on the final repeat. Initial20/21 revealed that invalid
  JSON was incorrectly displayed as network loss; UI fixed, original assertion kept.
- Seller/Analytics/public E2E: **24/24**; Auth onboarding **7/7**; synthetic money /
  Analytics journey **1/1**; fake-device microphone **18/18**. Suites overlap;
  these are synthetic HTTP/SDK/audio tests, not live persistence acceptance.
- Added two final companion tests in a separate agent worktree: **2/2** targeted
  PASS (Customers→Picker and K2 reload after late K1); copied to this worktree.
  Coordinator now37 and QA Customers now33 tests. Full post-addition expected
  total311 has **not** completed, and must not be reported as passed.
- Latest post-change check:api, typecheck and lint PASS. User pause interrupted the
  latest build pipeline before completion; final build/format/full-unit still
  require rerun. Earlier successful build/format do not certify this last snapshot.

Registration branch, tested separately: unit288/288, Auth/Registration E2E17/17,
synthetic money1/1, Seller/Analytics/public24 cases (one isolated repeat), Voice18
cases (one isolated repeat). Initial parallel resource timeouts were rerun without
weakening assertions. Existing three dev-dependency audit findings and large3D
bundle warning remain, outside this change.

## Still unfinished

1. Complete the final build/format/full-unit on this exact checkpoint. New tests
   were targeted individually, not yet included in a final all-green full run.
2. Review final staged/branch diff and exact forbidden-path diff again.
3. Finish recovery publication as a separate **Draft PR to main**. No Recovery PR
   has been created at this pause. Update PR/handoff with final counts/hash.
4. Final live demo remains blocked on approved training accounts/writes, reviewed
   deployment, paid-AI permission and a physical device/speaker consent.
5. Registration callback/email still needs exact URL, redirect allowlist and
   approved confirmation mechanism. Do not invent URLs or change Supabase settings.
6. A late read-only public browser review was stopped on user request; do not
   count it as completed evidence. Existing root/health/OpenAPI/venues GET probes
   succeeded; production 3D visual correctness was not certified here.

## Resume commands

Use this worktree; do not check out or edit another participant's branch.

```powershell
cd 'C:\Users\user\Documents\Codex\2026-10-15\github-plugin-github-openai-curated-remote\work\qadam-customer-recovery-safe'
git branch --show-current
git status --short
git fetch origin --prune
git log -1 --format=%H origin/main
git log --oneline HEAD..origin/main
git pull --ff-only origin fix/seller-customer-recovery-safe
# If ff-only fails, stop and report divergence; do not merge/rebase automatically.
# Read AGENTS.md, current main release, handoff and this checkpoint first.
cd apps/web
npm.cmd run check:api
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run format:check
npm.cmd test -- --no-file-parallelism
# Re-run relevant suites only if the resumed code changes/failures warrant it:
npx.cmd playwright test --config e2e/customer-recovery.playwright.config.ts --trace off
npx.cmd playwright test --config e2e/qa.playwright.config.ts --trace off
cd ../..
git diff --check
git diff origin/main...HEAD -- apps/api packages/contracts apps/web/src/shared/api/generated.ts apps/web/src/features/voice apps/web/src/features/ledger apps/web/src/features/summary apps/web/src/features/explore apps/web/src/features/inquiry apps/mobile apps/web/public
# Expected forbidden-path diff: empty.
# After final reviewed changes/tests: commit explicitly selected own files.
git fetch origin --prune
git pull --ff-only origin fix/seller-customer-recovery-safe
git push origin fix/seller-customer-recovery-safe
git rev-parse HEAD
git ls-remote origin refs/heads/fix/seller-customer-recovery-safe
```

Create the recovery PR as Draft with base main, head fix/seller-customer-recovery-safe;
verify mergeability, attach it to the task and update handoff. Do not merge/deploy.
An external publishing helper exists at `work/publish-customer-recovery-safe-pr.ps1`
(branch/head guard, GCM credentials in memory only); its body file still needs the
final checked report. It is not part of Git. Do not invoke it before final checks.
Local ignored logs are under `apps/web/test-results/recovery`; existing tracked
screenshots were preserved. All necessary implementation context is committed.
