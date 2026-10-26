# Integration scope and module verification

Stage 9 is the source candidate, not a patch to be merged twice. Git ancestry
contains main and Stages 6–8. See source-provenance.json for exact commits and the
initial inventory of other worktrees, including pre-existing uncommitted changes.

Stage 10 adds isolated acceptance tooling and reproducible evidence. No confirmed
production integration defect was found in the executed scenarios. Application
source, money rules, authentication, contracts and migrations are preserved.

## Application coverage

| Module | Executed path or automated coverage | Boundary |
|---|---|---|
| Auth and membership | Actual login UI, signed local JWT, production verifier and `/me`, allowed business selection | Local issuer, not live Supabase |
| Customers | Actual create/picker; lost POST response recovered by request lookup; backend search/ownership tests | Synthetic names, no merchant records |
| Manual sale | Browser creates 3000 ₸ sale with 1000 ₸ receipt; SQL independently checked | Explicit seller confirmation |
| Partial/debt | SQL debt 2000 ₸, debt page and customer filter | Integer minor units, no client ledger calculation |
| Repayment | Browser pays 500 ₸ against the original sale; SQL debt 1500 ₸ | No new sale used as repayment |
| Reversal | History reversal restores receipts/debt while preserving original journal rows | No deletion of financial history |
| AI extraction | Actual endpoint receives authored offline provider replies; browser checks resulting fields | No autonomous clean-text LLM benchmark |
| RU/KZ/mixed | RU full payment, Kazakh partial payment, mixed unknown payment; 3-language challenge | No ASR or pronunciation measurement |
| Seller confirmation | SQL hash unchanged during drafts; explicit confirm produces one operation despite double click | No automatic money write |
| Stage 1 factual assistant | SQL-backed fact selection, wrong metric/malformed fallback, `ai=false` avoids provider | Offline provider; read-only SQL hash checks |
| Stage 9 strict JSON | Duplicate raw keys rejected; browser manual fallback; provider transport unit tests | No paid provider calls |
| Dashboard/analytics | Actual SQL values rendered after lost-response recovery; assistant fact results | Synthetic ledger, not business success metrics |
| Research 7/30 | Actual 180-day SQL series → API → rendered graph/table; loading/503/retry/empty | Artificial series; no real predictive accuracy claim |
| Debt priority | Reasons and outstanding amounts from SQL; user action opens related debt | Explainable rules, not default probability |
| Feedback | Consent UI, API insert, SQL count, reload and owner read-back; duplicate/ownership backend tests | QA text, zero human survey participants |
| Isolation | A→B browser switch hides A feedback; API denies foreign business; full backend tenant tests | No production accounts tested |

Exact pass/fail/skip counts belong to full-test-results.md, not to this coverage
matrix. A passing local workflow does not establish reliability under arbitrary
network failures, concurrency, real provider output or production load.

## Changes and ownership

- `apps/api/tools/stage10_eval/`: frozen challenge authoring/evaluation and guarded
  local demo launcher. No external service or credential is required.
- `apps/api/tests/final_browser_server.py`: loopback-only fixture composing the
  existing Stage 9 test server and visible OFFLINE AI / SYNTHETIC business names.
- `apps/api/tests/test_stage10_challenge.py`: freeze checks and real PostgreSQL
  customer projection parity for the 33 semantic cases.
- `apps/api/tests/test_final_demo_guard.py`: reject non-local, non-test or
  underspecified demo database targets.
- `apps/web/e2e/final.*`: new real browser/SQL failure-recovery, Research and layout
  scenarios; reuses 8 existing integrated scenarios.
- `apps/web/e2e/stage9.acceptance.ts`: API origin can be set by the new local
  configuration; the old default and test assertions remain unchanged.
- `docs/diploma-evidence/final-integration/`, backend handoff and decisions: actual
  source/procedure/results, diagrams, screenshots and limits.

Implementation was performed with Codex assistance under the user's task.
Existing product modules remain attributed to their existing Git authors. Stage
10 does not re-label all inherited product implementation as new individual work.
The commit/file manifest records exactly which files belong to this stage.
