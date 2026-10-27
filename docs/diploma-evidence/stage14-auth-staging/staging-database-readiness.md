# PostgreSQL readiness

NEW local PostgreSQL17.11 cluster: ignored tmp/stage14/pgdata,127.0.0.1:55442.
Old Stage13 port55441 was not responding; it was not restarted or changed.
Local trust/elevated qadam_research role is for synthetic testing only.

Unchanged Stage11 rehearsal, runID s14_20261027: **21/21**,12.562s.
[Machine result](runs/migration.json). Three new databases:
qadam_stage11_s14_20261027_{source,restore,recover}_test.
0008→0009 preserves previous table hashes, adds only feedback; schema comparison
reports no new upgrade operations. Consent, duplicate request, replay/conflict,
author isolation, unprivileged RLS denial and persistence pass. Restored hashes/
counts match. Sale3000/received1000 + repayment500 retains debt1500; retry returns
the original operation. Downgrade only on a new restore copy demonstrates feedback
loss; restoration to another new target recovers it.

Dumps/hashes/sizes: machine result; dump files remain ignored under
tmp/stage14/migration. One fresh rehearsal establishes Stage14 evidence on a new
cluster without repeating the full Stage13 suite or touching shared data.

Separate new qadam_stage14_auth_test: **61/61** focused production-route tests:
tenant denial, revoked membership, no money before confirmation, concurrent
retry, consent and feedback readback. Test fixture tears down only its own schema.

Hosted DB NO-GO: exact inventory, TLS, runtime/migrator/backup grants, feedback RLS
strategy, encrypted backup retention, restore operator and rollout window require
approval/verification. No shared0009 or hosted backup performed.
