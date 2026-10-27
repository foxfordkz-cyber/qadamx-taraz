# Privacy: implemented versus unresolved

| Data | Existing handling | Missing acceptance/control |
|---|---|---|
| Money/customers/memberships | PostgreSQL qadam, historical operations, business/created_by checks | Owner-approved retention/export/deletion; never silently delete ledger |
| AI text/names | User text and assistant question/fact catalog reach provider; debtor labels can include names | Redaction/consent/provider terms; no blanket PII guarantee |
| Audio | Bounded in-memory decoding; application does not persist audio files | Provider/intermediary retention not verified |
| Draft | response_json stores transcript/amounts/candidates/author,30-minute expiry | Expiry prevents use, not automatic deletion; no purge job verified |
| Feedback | consent=true constraint, user/business association, per-author GET, no-store, replay/conflict | Withdrawal/delete/export/admin review and retention period absent |
| Auth | Persistent browser SDK session, local logout/cache reset | Real refresh/revocation/device policy acceptance |
| Logs | ai_diagnostics metadata only; no payload/exception messages; deploy_start access_log=false | Cloud sink/ACL/retention/infrastructure logs unknown |
| Backups | Local synthetic dumps outside Git | Hosted encryption/access/retention/deletion policy |

OpenAI store:false is implemented, not a complete provider retention guarantee.
Gemini/ASR account policies unreviewed. Free-text feedback can include private data;
consent alone does not provide deletion/withdrawal functionality.

Feedback API checks membership and author; DB enables RLS and revokes PUBLIC,
anon/authenticated privileges, without a client policy. Owners/BYPASSRLS can bypass
RLS; DB administrator access remains a separate boundary. Local elevated-role
tests do not certify hosted least privilege. Assign an owner for scoped deletion,
audit and backup disposition before collecting real participant data.
