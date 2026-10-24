# Архитектура және editable сызбалар

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


Web entry [`apps/web/src/main.tsx:37`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/web/src/main.tsx#L37) → App/Auth/Runtime → features → API client. Flutter [`apps/mobile/lib/crm/crm_api.dart:18`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/mobile/lib/crm/crm_api.dart#L18) ортақ endpoints-ке Bearer token береді. Backend [`apps/api/app/main.py:51`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/main.py#L51) ledger, drafts, assistant, public және livestock router-лерін қосады. Auth — Supabase JWT/JWKS. Ledger SQLAlchemy арқылы PostgreSQL-ге commit жасайды. OpenAI және Gemini httpx adapter-лері server configuration арқылы таңдалады.

Candidate research router [`apps/api/app/research_routes.py:17`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/b7c4750b158a6b1fc747e63a68ae7b2d078b5107/apps/api/app/research_routes.py#L17) ғана forecast/risk/feedback endpoints қосады. FeedbackForm component-іне import тек өз test-інде табылды; App/router integration жоқ. Candidate docs-та described saved-response/export screen-і код дәлелі ретінде қабылданбайды.

Сызбалар Mermaid source ретінде өңделеді. ER-дегі `RESEARCH_FEEDBACK_CANDIDATE` main entity емес. Use-case Mermaid flowchart арқылы көрсетілген; UML renderer-дің native use-case grammar-ы деп ұсынылмайды.

## 01_system_context.mmd

[Өңделетін source](diagrams/01_system_context.mmd)

```mermaid
flowchart LR
  Owner[Сатушы: owner] --> Web[Qadam React Web]
  Owner --> Mobile[Qadam Flutter]
  Visitor[Келуші] --> Web
  Web -->|JSON немесе multipart| API[FastAPI main]
  Mobile -->|Бір ортақ API| API
  Web --> Auth[Supabase Auth]
  Mobile --> Auth
  API -->|JWKS тексеру| Auth
  API --> DB[(PostgreSQL qadam)]
  API --> AI[OpenAI немесе Gemini]
  API --> Storage[Supabase Storage: мал фотолары]
  Web -->|Сатушы ашатын deep link| WA[WhatsApp]
```

## 02_use_cases.mmd

[Өңделетін source](diagrams/02_use_cases.mmd)

```mermaid
flowchart LR
  Visitor[Келуші] --> UC1([Площадка және каталогты көру])
  Visitor --> UC2([Өтінім қалдыру])
  Owner[Owner membership бар сатушы] --> UC3([Сатылымды растау])
  Owner --> UC4([Қарызды және өтемді жүргізу])
  Owner --> UC5([Reversal арқылы түзету])
  Owner --> UC6([Клиенттерді басқару])
  Owner --> UC7([AI draft алу және түзету])
  Owner --> UC8([Аналитика және қорытынды])
  Owner --> UC9([AI көмекшіден сұрау])
  Owner --> UC10([WhatsApp мәтінін ашу])
  Seller[JWT мал хабарландыруының иесі] --> UC11([Хабарландыру және фото])
  UC7 -. Соңғы растау бөлек .-> UC3
```

## 03_components.mmd

[Өңделетін source](diagrams/03_components.mmd)

```mermaid
flowchart TB
  subgraph MAIN[main baseline]
    React[React App және RuntimeProvider] --> Gateway[ApiClient және SellerGateway]
    Flutter[Flutter runtime және CrmApi] --> API[FastAPI create_app]
    Gateway --> API
    API --> Ledger[routers және ledger service]
    API --> Draft[draft_routes және drafts service]
    API --> Assistant[assistant_routes және assistant service]
    API --> Public[public_routes]
    API --> Livestock[livestock_routes]
    Ledger --> ORM[SQLAlchemy models]
    Draft --> ORM
    Public --> ORM
    Livestock --> ORM
    Assistant --> Reads[analytics және journal facts]
    ORM --> PG[(PostgreSQL)]
    Reads --> PG
    Draft --> Providers[ProviderPlan: Gemini немесе OpenAI]
  end
  subgraph CAND[Зерттеу кандидаты ғана: main-ға қосылмаған]
    Routes[research_routes] --> Forecast[forecasting: ridge және baselines]
    Routes --> Risk[debt_risk: rules-v1]
    Routes --> Feedback[research_feedback service]
    Form[FeedbackForm: standalone component]
  end
```

## 04_database_er.mmd

[Өңделетін source](diagrams/04_database_er.mmd)

```mermaid
erDiagram
  VENUES ||--o{ BUSINESSES : venue_id
  BUSINESSES ||--o{ MEMBERSHIPS : business_id
  BUSINESSES ||--o{ CATALOG_ITEMS : business_id
  BUSINESSES ||--o{ CUSTOMERS : business_id
  BUSINESSES ||--o{ OPERATIONS : business_id
  CUSTOMERS o|--o{ OPERATIONS : customer_id
  OPERATIONS ||--o{ OPERATIONS : sale_id
  OPERATIONS o|--o| OPERATIONS : reversal_of
  OPERATIONS ||--o{ IDEMPOTENCY_RECORDS : result_operation_id
  BUSINESSES ||--o{ IDEMPOTENCY_RECORDS : business_id
  BUSINESSES ||--o{ DRAFTS : business_id
  OPERATIONS o|--o| DRAFTS : consumed_operation_id
  BUSINESSES ||--o{ CUSTOMER_CREATION_REQUESTS : business_id
  CUSTOMERS ||--o{ CUSTOMER_CREATION_REQUESTS : result_customer_id
  BUSINESSES ||--o{ INQUIRIES : business_id
  LIVESTOCK_MARKETS o|--o{ LIVESTOCK_LISTINGS : market_id
  LIVESTOCK_LISTINGS o|--o{ LIVESTOCK_PHOTOS : listing_id
  BUSINESSES ||--o{ RESEARCH_FEEDBACK_CANDIDATE : business_id
  OPERATIONS {
    uuid id PK
    uuid business_id FK
    uuid customer_id FK
    uuid sale_id FK
    string kind
    bigint sales_delta_minor
    bigint receipts_delta_minor
    uuid reversal_of FK
  }
  RESEARCH_FEEDBACK_CANDIDATE {
    uuid id PK
    uuid business_id FK
    uuid created_by
    uuid client_request_id
    string request_hash
    jsonb payload
  }
```

## 05_voice_to_sale_sequence.mmd

[Өңделетін source](diagrams/05_voice_to_sale_sequence.mmd)

```mermaid
sequenceDiagram
  actor Seller as Сатушы
  participant UI as React Sale
  participant API as FastAPI
  participant DB as PostgreSQL
  participant AI as Сыртқы provider
  Seller->>UI: Мәтін не аудио, талдауды бастау
  UI->>API: POST drafts, бір source
  API->>DB: Membership тексеру
  API->>DB: Rollback, lock босату
  API->>API: Audio normalize және шектер
  alt OpenAI audio
    API->>AI: Transcription
    AI-->>API: Transcript
    API->>AI: Structured extraction
  else Gemini немесе text extraction
    API->>AI: Structured generation
  end
  AI-->>API: Untrusted JSON
  API->>API: Pydantic және evidence spans
  API->>DB: Membership қайта тексеру, draft commit
  API-->>UI: Draft, missing fields және сұрақтар
  Seller->>UI: Клиент, сома және растау
  UI->>API: POST operations және Idempotency-Key
  API->>DB: Business, draft және sale lock/check
  API->>DB: Operation, receipt және consumed draft commit
  API-->>UI: Operation және current balance
```

## 06_financial_operation_activity.mmd

[Өңделетін source](diagrams/06_financial_operation_activity.mmd)

```mermaid
flowchart TD
  A[Сатушы қолмен не draft арқылы өріс береді] --> V[Schema validation]
  V --> Auth[JWT және owner membership]
  Auth --> Lock[Business FOR UPDATE]
  Lock --> Draft[Берілсе draft author және scope check]
  Draft --> Key{Осы key үшін receipt табылды ма?}
  Key -->|Бар, hash бірдей| Replay[Original committed response]
  Key -->|Бар, hash басқа| Conflict[409 conflict]
  Key -->|Жоқ| Check[Draft expiry және consumed check]
  Check --> Kind{Операция түрі}
  Kind -->|Sale| Sale[Total, received, customer тексеру]
  Kind -->|Repayment| Repay[Sale lock және current balance]
  Kind -->|Reverse| Reverse[Original және dependent payments тексеру]
  Sale --> Write[Operation және receipt қосу]
  Repay --> Write
  Reverse --> Write
  Write --> Consume[Қажет болса draft consume]
  Consume --> Commit[Бір transaction commit]
  Commit --> Response[HTTP success]
  Write -. Exception .-> Rollback[Бәрі rollback]
```

## 07_assistant_validation_current.mmd

[Өңделетін source](diagrams/07_assistant_validation_current.mmd)

```mermaid
flowchart TD
  R[JWT және business membership] --> Facts[Server facts жинау]
  Facts --> Flag{ai=true ме?}
  Flag -->|Жоқ| Fixed[Server fallback template, source=facts]
  Flag -->|Иә| Limit[Per-process daily limit]
  Limit --> Model[Provider: facts және question]
  Model --> Parse[ModelAnswer JSON/schema]
  Parse --> Actions[Allowed actions және reminder customer_id]
  Actions --> Numbers[Digits allowed_numbers жиынына кіре ме?]
  Numbers -->|Жоқ не exception| Fallback[Server fallback, source=fallback]
  Numbers -->|Иә| Result[Model prose, source=ai]
  Result --> Gap[Шектеу: metric-value және free-text name binding толық тексерілмейді]
```

## Stage1 local overlay

[08 improved validation](diagrams/08_improved_ai_validation.mmd) implementation `6ac5266abddffa7f1278d403ece55cc3eba457a1` үшін. Main/candidate source links historicalbaseline болып қалады;current privateprotocol ID-only,server rendering.
