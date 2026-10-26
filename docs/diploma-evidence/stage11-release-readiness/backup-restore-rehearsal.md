# Backup and restore rehearsal

Result: **PASS locally — 21 checks**. See [result](migration-restore-result.json)
and [exact commands](runs/migration-commands.txt).
No shared/production database was contacted. No database was dropped or overwritten.

Local cluster: `tmp/stage11-pgdata`, PostgreSQL17.11, loopback55441.
Final tool run uses three NEW names ending source_test/restore_test/recover_test.
The raw dump paths, sizes and SHA256 are in the result; dumps stay in ignored tmp,
not public evidence. All contents are synthetic, yet access should remain local.

Flow:
`new source →0008+synthetic ledger→pre9 dump→0009+feedback→post9 dump`
→ restore into NEW target → compare every table's sorted row hashes →
downgrade only this restored copy → verify only feedback lost →
restore original post9 dump into another NEW target → verify all rows and debt.

Custom-format pg_dump and pg_restore `--exit-on-error --single-transaction` used.
No `--clean`, shared database, existing role mutation, financial correction, or reset.
The pre9 dump was created and hashed; the restoration exercised the **post9** dump.
No claim of a tested point-in-time/WAL restore or restoration to a managed service.

Confirmed final debt150000 tiyn (1500 ₸), two journal rows, one feedback row,
idempotent receipt replay, and all-table data equality. This is a tiny rehearsal,
not a measured production RTO/RPO or storage/load test.

## Reproduce (PowerShell, apps/api)

Install locked dependencies with `uv sync --locked`. Start an explicitly isolated
PG17 instance first. Use a new run ID each time; the tool refuses any existing DB
name or output directory and fixes host to127.0.0.1 and user toqadam_research.

```powershell
$env:PYTHONPATH='.'
.venv/Scripts/python.exe -m tools.stage11_release.rehearsal --run-id new_review_01 --port 55441 --pg-bin '<absolute-isolated-pg-bin>' --output '../../tmp/stage11-new-review-01'
```

This run reused the Stage10 locked venv while importing Stage11 source via PYTHONPATH.
The checkout had no apps/api/.env. Actual command paths are captured in test-execution.

## Failed attempts retained

Old loopback55439 did not answer; no DB was created there. A first new-cluster run
failed in the new rehearsal tool by reading `OperationResponse.id` instead of
`operation.id`. The seed transaction rolled back; those new DBs were preserved.
Fixed only the tool; full rehearsal then passed on fresh names. Initial traces and
JSON are in runs/. No application bug or successful first attempt is claimed.

Operational rollback approval must specify writer pause, last durable journal IDs,
backup/checksum, credentials/roles, target, recovery point, lost-write reconciliation,
privacy and restart owner. Never create balancing transactions to hide a mismatch.
