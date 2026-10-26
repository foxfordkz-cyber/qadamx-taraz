# Fresh backup and recovery verification

Each rehearsal produced before-0009.dump and after-0009.dump using PostgreSQL17.11
pg_dump custom format. Dumps stay under ignored tmp/stage13/migration-a and
migration-b; none are published. Their exact sizes/SHA-256 are in both result JSONs.

For both runs, pg_restore --exit-on-error --single-transaction into a NEW database
succeeded. All qadam table row counts and content hashes match the migrated
source; feedback RLS remains enabled. A downgrade of that new restore copy drops
feedback (confirmed data loss), preserves all other rows, and is NOT recommended
as routine rollback. Restoring the original post-0009 backup into a second NEW
recovery target restores every table and feedback receipt replay.

The recovered sale3000/received1000 plus repayment500 yields debt1500 KZT;
ledger summary and restored rows agree. This is synthetic financial evidence.
No balancing/repair operation was added and no old database was dropped.

Operational rollback: stop writes, retain suspect DB/logs, restore last verified
backup into a new DB, compare schema/rows/balances and replay behavior, then ask
owner permission to switch application config. For schema-compatible code-only
rollback, return to the previous artifact without downgrading feedback. Document
backup timestamp/RPO and restoration duration/RTO during approved hosted rehearsal;
these local runs do not establish a production SLA.
