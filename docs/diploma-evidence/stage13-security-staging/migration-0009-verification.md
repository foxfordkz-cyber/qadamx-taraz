# Fresh migration0009 rehearsal

Two actual runs using unchanged tools/stage11_release/rehearsal.py; fresh run IDs
s13a_20261026 and s13b_20261026. Six new local databases, never an existing/shared
DB. The retained tool prefixes names qadam_stage11_ even when used for Stage13;
exact names, source SHA, timestamps and 21 checks per run are in
[runs/migration-a.json](runs/migration-a.json) and
[runs/migration-b.json](runs/migration-b.json).

Both runs: **21/21 checks passed**. Empty DB → supported 0008 baseline with
synthetic ledger → 0009; alembic check reports no drift. Existing qadam table
row hashes/counts unchanged by migration; only research_feedback added. Revision
0009_research_feedback, RLS enabled (not FORCE), indexed owner pagination,
unique (business_id, created_by, client_request_id), foreign key and consent check.
Synthetic feedback persists across connections, same-key replay returns receipt,
changed-body reuse conflicts, another author sees no feedback, false consent and
duplicate requests are rejected by DB constraints. An unprivileged test role has
no feedback rows via RLS. Full PostgreSQL API tests exercise auth/business/consent
and feedback replay separately; they are included in backend total, not counted
as extra migration checks.

Reproduction, from apps/api with the installed PG bin directory and fresh IDs:
```powershell
.\.venv\Scripts\python.exe -m tools.stage11_release.rehearsal --run-id s13_new_a --port 55441 --pg-bin '<PG_BIN>' --output ../../tmp/stage13/migration-new-a
.\.venv\Scripts\python.exe -m tools.stage11_release.rehearsal --run-id s13_new_b --port 55441 --pg-bin '<PG_BIN>' --output ../../tmp/stage13/migration-new-b
```

The tool requires new names/new output directories and rejects local .env. It
never drops a database. It intentionally tests destructive downgrade ONLY in its
new restore copy, leaving source and recovery copies intact. This is not approval
to downgrade a real staging DB. Local owner is superuser/BYPASSRLS; explicit
unprivileged denial was tested, but managed Supabase/application role behavior,
network TLS and cloud restore permissions are still unverified.

Repeatability means the same 21 conditions pass in two new sets of databases.
UUID/time-containing row hashes are not expected to match across independent runs;
within each run all backup/restore/recovery hashes match exactly.
