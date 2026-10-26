# Isolated staging architecture

Two distinct modes. The executable local rehearsal is available without a cloud
account, production secrets, customer data or paid providers. Hosted staging is a
configuration/review candidate, not a deployed or accepted service.

```mermaid
flowchart LR
  Browser[Installed Chrome / synthetic accounts] --> Web[Stage13 Vite / loopback 4313]
  Web --> API[Real FastAPI routes / loopback 8333]
  API --> JWT[Local signed JWT / fixture JWKS]
  API --> DB[(New disposable PostgreSQL DB / loopback 55441)]
  API --> Offline[Offline AI transport / explicit user confirmation]
  SQL[Independent SQL assertions] --> DB
  DB --> Backup[pg_dump / local ignored dump]
  Backup --> Restore[(New restore and recovery DBs)]
  Stage12[Preserved Stage12 / 4303 and 8322] --> OldDB[(Preserved Stage12 demo DB)]
```

```mermaid
flowchart LR
  Client[Approved staging HTTPS origin] --> Static[Versioned React production bundle]
  Client --> Auth[Separate approved Supabase test project]
  Static --> Server[FastAPI / exact CORS / verified JWT and memberships]
  Server --> StagingDB[(Separate staging PostgreSQL / reviewed application role)]
  Server -. approved keys and bounded budget only .-> Provider[Configured AI / ASR provider]
  Manager[Secret manager / server scope] --> Server
  StagingDB --> Recovery[Encrypted backup / restore into new target]
```

The second diagram is planned infrastructure; no cloud resources were created.
The local cluster is pre-existing dedicated QA PostgreSQL, with new isolated
databases for each run. It is not a separate managed server. The local owner is
elevated; managed-role/transport/RLS deployment acceptance remains separate.

Production Auth, ledger, contracts and deployment configuration are unchanged.
Never deploy tests/*_browser_server.py or expose its fixture login/JWKS routes.
Research predictions remain estimates; synthetic data do not establish merchant
accuracy. AI supplies drafts; only seller confirmation invokes the ledger.
