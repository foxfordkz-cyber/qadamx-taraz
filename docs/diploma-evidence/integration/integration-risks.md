# Integration risks and limits

Updated 2026-10-25. No production deployment or shared migration performed.

| Item                             | Current boundary / required action                                                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production Research availability | Local API is 0.8.0; hosted 0.7.2 was previously missing Research. See current read-only probe in combined report. Owner must approve coordinated rollout before claiming hosted support.                            |
| Database migration               | 0009 creates feedback storage and constraints. Upgrade/check/downgrade are exercised only on disposable local DBs. Review backup, privileges and migration window separately; never run local fixture on shared DB. |
| Identity                         | Local test issuer passes real server JWT validation. Hosted Supabase login/registration/email callback/session refresh remain separate live acceptance.                                                             |
| Preview                          | Existing PR100 Preview is protected by Vercel. No bypass or protection/settings changes. Temporary combined branch has no Preview.                                                                                  |
| Stage 1 provider protocol        | New private structured schema/prompt requires a controlled real-provider compatibility/cost/latency test. Offline valid/invalid outputs do not establish live model compliance.                                     |
| Forecast quality                 | Synthetic series and finite test horizons do not establish merchant generalization. Real consented historical data and rolling-origin evaluation are future work.                                                   |
| Risk model                       | Rules only; no default/overdue labels, no probability or accuracy/F1/AUC claim.                                                                                                                                     |
| Physical audio                   | No physical microphone/phone/APK acceptance in this stage. Text draft + offline extraction verified.                                                                                                                |
| CI                               | PR100 CI belongs to Research source only. This local combined branch has no remote CI result.                                                                                                                       |
| Windows tests                    | Initial missing test guard variable and pytest temp permissions were environment failures. Full rerun uses separate loopback URLs and a worktree basetemp.                                                          |
| Data retention                   | Local demo DB is intentionally persistent until the operator removes it. Restart fixture requires a NEW EMPTY DB; never silently truncate or reuse.                                                                 |
| Future main movement             | Fetch and compare before team integration; do not automatically merge updated remote changes.                                                                                                                       |

## Rollback review

For an approved future deployment, retain previous frontend/backend artifacts and restore those through the release process if required. Do not downgrade 0009 against collected feedback merely to roll back code: its downgrade drops feedback storage. Preserve a backup and obtain the data owner's decision first. Facts-only operation remains available when assistant AI is disabled; do not restore an unsafe validator as a substitute for provider outage handling.

No integration task changes production environment variables, ledger rules, auth code, Supabase settings or deployment controls.
