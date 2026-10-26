# Migration0009 readiness

Source: `apps/api/migrations/versions/0009_research_feedback.py`, unchanged.
Parent `0008_canonical_markets`; head `0009_research_feedback`.

Adds only `qadam.research_feedback`: business FK; author and client request UUID;
request hash; JSONB consented payload; created_at; unique business/author/request;
owner pagination index; DB consent=true check. RLS enabled; PUBLIC and existing
anon/authenticated grants revoked. No permissive RLS policy; backend role/owner
privileges must be reviewed on the target. RLS is not FORCE; a privileged backend
still relies on the tested application membership/author checks.

## Actually performed

New PostgreSQL17.11 cluster, 127.0.0.1:55441, trust restricted to loopback, no external
credentials. Three new databases for the final successful rehearsal; details and
complete table row hashes in [migration-restore-result.json](migration-restore-result.json).

- Upgrade empty DB to0008; seed fictional memberships/customers; create a 3000/1000
  sale and500 repayment through existing ledger services.
- Dump before0009; upgrade tohead; Alembic check reports no new operations.
- Every pre-existing table's row count/hash remains identical; only feedback added.
- Submit synthetic feedback; same request replays; changed body conflicts;
  other author sees none. DB rejects false consent and duplicate request.
- Unique temporary NOLOGIN/NOBYPASSRLS role sees zero feedback even with SELECT.
  Only that task-created role was revoked/dropped; existing roles were not changed.
- Feedback survives dump/restore with RLS; restored debt1500 ₸ and replay receipt match.

This is local compatibility evidence, not authorization for shared migration.
Target-managed PostgreSQL version, backend role privileges, role ownership, backup
encryption, migration lock/write window and maintenance owner remain unverified.

Downgrade drops the feedback table and its contents. Confirmed only in the newly
restored rehearsal DB. Financial rows stay unchanged. Do not downgrade a live study
to roll back application code; retain the additive table or preserve/reconcile all
feedback first under a separately approved recovery plan.
