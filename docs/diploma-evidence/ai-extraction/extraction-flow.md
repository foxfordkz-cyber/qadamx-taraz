# Stage 7 extraction flow

```mermaid
flowchart TD
    U["Seller: RU / KK / mixed text or audio"] --> A["Existing JWT + membership validation"]
    A --> P["Existing provider adapter + timeout / retry policy"]
    P --> J{"Strict JSON and schema"}
    J -->|"invalid / duplicate key"| F["Existing error + manual fallback"]
    J --> Q["Exact quote must occur in transcript"]
    Q --> G["NEW: bounded source grounding"]
    G --> N["KZT / tiyn normalization; number boundaries; negation"]
    G --> C["Spoken name check; ambiguity remains unresolved"]
    N --> M["Null unknown fields; existing RU / KK clarification"]
    C --> M
    M --> D["Persist Draft only; scoped customer / sale candidates"]
    D --> V["Seller reviews, corrects and selects customer / debt"]
    V -->|"explicit confirmation"| O["Existing operation endpoint"]
    O --> S["Existing schema + tenant checks + idempotency + atomic ledger"]
    S --> B["Server-computed balances"]
    G -.-> X["No ledger writes from AI or grounding"]
```

Text is authoritative when supplied by the seller. Audio transcripts remain provider output;
this flow does not verify physical microphones or ASR. The offline evaluator replaces only
the provider response with frozen synthetic output. Browser tests keep real HTTP, signed
local test JWTs, migrations, PostgreSQL, frontend providers and explicit confirmation.
