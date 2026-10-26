# Limits that remain after local acceptance

1. This is a local candidate. No public Preview URL serves this branch; no push,
   PR, main merge, PR #100 modification, deployment or shared DB change occurred.
2. Authentication uses local signed test JWTs through the real verifier and UI.
   Real Supabase login, refresh, callback and production roles need separate
   acceptance on an authorized staging environment.
3. No live model or ASR was called. Provider replies are authored fixtures;
   fresh challenge results describe deterministic validation/grounding, not a
   model's independent extraction from clean text or real speech.
4. The new challenge has 42 records, including 11 semantic families × 3 languages
   plus 9 malformed variants. Author exposure and correlated cases limit
   generalization. No independent human gold review or merchant corpus exists.
5. Frozen Stage 8 cases S8-080 and S8-084 remain ambiguous repeated-`мың`
   regression mismatches; no gold is rewritten to hide them. Conservative
   clarification remains preferable to an unjustified ready-to-save amount.
   Stage 7's known S7-090 mismatch also remains documented in its replay.
6. Research forecasts use a seeded artificial 180-day series, not actual merchant
   performance. MAE/RMSE from that series cannot support commercial accuracy
   claims. Sparse/empty history intentionally yields no forecast.
7. Debt priority is rule-based, not a trained classifier, overdue label or
   probability of default. Feedback records are synthetic, with no study subjects.
8. Chrome viewport checks are not physical iPhone, Android, Safari, APK or
   microphone tests. The 200% test increases CSS root font size; native browser
   zoom, screen readers and a full WCAG audit remain unexecuted.
9. Demonstrated financial retry reuses a pending request's exact key/body in the
   same running session. It is not an assertion of arbitrary reload recovery or
   universal exactly-once delivery. Unknown results are not silently new writes.
10. The demo runner deliberately requires a NEW EMPTY named local test DB. It
    preserves completed/failed demo databases instead of erasing them for reuse.
    Existing data require a new database name for another seeded run.
11. Test fixture routes and local issuer must never be deployed. The normal
    production entry point and configuration are unchanged.
12. Staging backup/restore, migration permissions, rollback, live provider budget,
    production monitoring and independent team review remain approval gates.

Priority next steps: independent human annotation/adjudication; explicit review
of the two repeated-scale ambiguities; authorized live-provider evaluation with
fixed model/budget and raw responses; then staging auth/backup/0009 rehearsal and
physical-device acceptance. Do not retune the frozen sets and present them as a
new independent improvement.
