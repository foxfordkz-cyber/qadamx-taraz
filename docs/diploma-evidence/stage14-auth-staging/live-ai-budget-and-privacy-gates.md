# Budget and privacy gates

Authorized Stage14 calls: **ZERO**. Actual live text/ASR calls:0. No provider
credential used; no billing claim.

Proposal requiring explicit provider/model/currency approval:12 text extractions
+1 factual assistant request +6 ASR requests +6 subsequent extractions = maximum25
provider HTTP calls. Reuse returned drafts for UI acceptance, no additional calls.
If using Gemini audio directly or any retry/fallback, recalculate the bound first.

Current Gemini parsing may call twice; OpenAI max_attempts=1, optional fallback
adds work. Assistant daily limit is per-user/in-memory, not a global cost cap.
No live runner shipped. Future operator needs an independent hard request counter/
egress cap, no concurrent paid calls, no automatic retry/fallback. Stop on cap,
unexpected target or sensitive data. Diagnostic cost estimates are not invoices.

Required approval: synthetic test business/users, privately scoped credentials,
request/currency caps, audio consent, payload/log retention and cleanup owner.
No real customer names/financial records, no audio published. Preserve failed
attempts in sanitized results. Offline validator rejects keys and budgets>0;
it does not authorize a later live phase.
