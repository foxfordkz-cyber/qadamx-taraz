# Findings and release constraints

Severity indicates impact on the proposed release/acceptance. These are verified
configuration/operational limitations, not newly proven exploitable vulnerabilities.
No clearly scoped production blocking defect was reproduced that justifies a code
change in Stage11. Each item still needs a named human owner.

## S11-01 — P1: staging registration/callback gate

- File: `apps/web/src/app/auth-callback-config.ts`; `vite.config.ts`; AuthProvider registrationRequest.
- Reproduce: run `node apps/api/tools/stage11_release/config-probe.mjs <new-result.json>`.
  The production callback allows the exact Pages origin; a production bundle at
  `https://stage11.example.test` rejects registration. No network used.
- Expected for full staging Auth acceptance: registration/resend/confirmation return
  to the approved staging environment.
- Actual: callback is fixed to `https://qadamx-taraz.pages.dev/auth/callback`;
  arbitrary staging origins are deliberately blocked. Existing-user sign-in is a
  separate path and has not been proven with real Supabase here.
- Correction: captain/Auth owner must approve exact staging origin and PKCE callback
  policy, then authorize a separate narrowly scoped implementation and Supabase
  allowlist change. Do not weaken the guard or add wildcards.
- Evidence: [9 probes](config-probe.json). Current guard is fail-closed, not a bypass.

## S11-02 — P1: real feedback collection lacks operational privacy workflow

- Files: `apps/web/src/features/seller/research/i18n.ts:66,174`;
  `apps/api/app/services/research_feedback.py`;
  `docs/user-research-plan.md`; `docs/diploma/02_System_Design/security_and_privacy.md`.
- Reproduce: UI promises retention up to 90 days and receipt-based withdrawal;
  source implements private create/read, but no complete assigned purge/withdrawal
  procedure is supplied. This was already documented as pending.
- Expected before real participants: named contact, consent text, deletion/export/
  backup retention workflow, restricted access and a tested withdrawal request.
- Actual: synthetic persistence and privacy controls work; operational ownership and
  execution are unverified. Consent=true alone is not complete informed consent.
- Correction: study lead approves and rehearses procedure before recruitment.
  No personal feedback was collected in Stage11; no speculative delete feature added.
- Evidence: new feedback tests, migration RLS probe, current UI screenshot.

## S11-03 — P1: provider budget/quota is not a global billing cap

- Files: `services/assistant.py:DailyLimit`, `services/ai.py:_extract`,
  `config.py`, `tools/stage8_eval/live.py`.
- Reproduce by inspection: assistant allowance is per process and resets with the
  process; extraction permits provider-dependent parsing retries/fallback policy.
  A browser action therefore need not equal one billable request.
- Expected: controlled acceptance must fit an explicitly approved provider/project
  budget across text, ASR, retries and instances.
- Actual: no Stage11 paid approval, exact accessible model or billing cap.
- Correction: use prepared serial opt-in manifest, verify exact model and prices,
  disable fallback for the comparison, provider-side hard budget where available,
  count actual requests, and stop if cost cannot be bounded. Approve any additional
  in-app retry allowance separately. Do not treat a local JSON allowance as billing proof.
- Evidence: [dry plan](live-dry-plan.json); execute intentionally Not Run.

## S11-04 — P2: liveness/version are insufficient release evidence

- Files: `apps/api/app/main.py`, `pyproject.toml`, root README.
- Reproduce by inspection: health does not prove DB migration or protected queries;
  runtime OpenAPI is 0.8.0 while package metadata is 0.6.2 and public README badge
  describes 0.7.2. These represent different scopes.
- Expected: acceptance identifies deployed SHA, exact contract, migration head and
  protected API behavior.
- Actual: local source identified; no approved staging target exists.
- Correction: attach deployment SHA/build artifact, exported OpenAPI hash and
  migration/readiness proof. Do not silently rename public release metadata.
- Evidence: provenance, contract check, actual local migration and Chrome smoke.
