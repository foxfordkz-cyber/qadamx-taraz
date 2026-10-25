# Stage 8 extraction and evaluation flow

The runtime boxes describe existing Stage 7 behavior. Stage 8 adds the evaluation
and acceptance harnesses only.

## Frozen paired evaluation

```mermaid
flowchart TD
    A[Verify Stage 6 and Stage 7 source commits] --> B[Author synthetic corpus and gold]
    B --> C[Freeze protocol CSV JSONL and hashes in Git]
    C --> D[One authored raw response per case]
    D --> E[Pre-Stage7 validator ae43dc2]
    D --> F[Unchanged Stage7 validator b84b4c7]
    E --> G[Same tenant candidate projection]
    F --> G
    G --> H[Compare gold exact fields and clarification]
    H --> I[Keep all raw results including regressions]
    I --> J[Per-language and category metrics]
    K[Real disposable PostgreSQL] --> L[Separate candidate parity tests]
    L -. scope check .-> G
```

## Actual application confirmation boundary

```mermaid
flowchart LR
    U[Seller text or consented audio] --> P[Provider adapter]
    P --> V[Strict schema and source grounding]
    V --> D[Draft and required clarifications]
    D --> C[Seller edits and explicitly confirms]
    C --> A[Authenticated tenant-scoped API]
    A --> Q[Idempotent transaction and ledger constraints]
    Q --> S[PostgreSQL operation]
    V -->|unusable| M[Manual fallback]
    P -. OpenAI duplicate keys may be erased before V .-> W[Documented adapter gap]
```

AI draft creation does not bypass the seller, authorization or ledger constraints.
The diagram does not claim the unresolved adapter issue is fixed.

## Optional live evaluation

```mermaid
flowchart TD
    M[Frozen text IDs or consented local audio] --> P[Dry plan with exact prompts source hashes and budget]
    P --> A{Exact plan approved and unexpired?}
    A -->|no| X[No provider construction or request]
    A -->|yes| R[Consume single-use approval]
    R --> O[One sequential adapter generation]
    O --> B[Replay same output through both validators offline]
    B --> S[Persist fields errors and measured latency]
    O -->|timeout or error| F[Persist failure and stop; no paid retry]
    S --> W[WER only with authorized audio and reference]
```

No live execution occurred in Stage 8. Budget reservation is an operator guard;
it is not verified provider billing or a provider-enforced quota.
