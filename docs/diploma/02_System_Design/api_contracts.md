# API келісімшарттары

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.

| Method | Path | Access | Контракт | Қабат |
|---|---|---|---|---|
| GET | /api/v1/me | JWT | Membership scope | main |
| GET/POST | /api/v1/businesses/{id}/customers | JWT+membership | Search/create; optional customer idempotency | main |
| GET | /api/v1/businesses/{id}/customer-creation-result | JWT+membership | Idempotency-Key; completed/not_observed | main |
| POST | /api/v1/businesses/{id}/operations | JWT+membership | Sale/repayment, required Idempotency-Key | main |
| POST | /api/v1/businesses/{id}/operations/{operation_id}/reverse | JWT+membership | Opposite delta + receipt | main |
| GET | /api/v1/businesses/{id}/operations | JWT+membership | History/open-sale page | main |
| POST | /api/v1/businesses/{id}/drafts | JWT+membership | multipart text XOR audio; draft only | main |
| GET | /api/v1/businesses/{id}/summary | JWT+membership | Selected-day sales/receipts; current overall debt | main |
| GET | /api/v1/businesses/{id}/analytics | JWT+membership | days7/30; one-statement snapshot | main |
| POST | /api/v1/businesses/{id}/assistant | JWT+membership | ai=false facts; ai=true provider+validation | main |
| GET/POST | /api/v1/businesses/{slug} / businesses/{id}/inquiries | Public read/submit | Public projection; seller inquiry reads private | main |
| GET | /api/v1/businesses/{id}/research/forecast | JWT+membership | horizon7/30, experimental/insufficient_data | candidate |
| GET | /api/v1/businesses/{id}/research/debt-risk | JWT+membership | rules-v1; cursor; outcome_metrics null | candidate |
| POST/GET | /api/v1/businesses/{id}/research/feedback | JWT+membership+created_by reads | Consent; client_request_id replay;201 after commit | candidate |


OpenAPI негізгі source: [`packages/contracts/openapi.json:1`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/packages/contracts/openapi.json#L1); экспорт [`apps/api/app/export_contracts.py:1`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/export_contracts.py#L1). Ledger routes [`apps/api/app/routers.py:1`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/routers.py#L1); draft [`apps/api/app/draft_routes.py:1`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/draft_routes.py#L1); candidate research [`apps/api/app/research_routes.py:1`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/b7c4750b158a6b1fc747e63a68ae7b2d078b5107/apps/api/app/research_routes.py#L1). Main schema мен candidate generated clients араластырылмайды.

Ақша minor integer; ISO date/time; page next_cursor UUID/null; localized locale `ru`, `kk`, draft үшін `auto`. Foreign resource404, unauthenticated401, conflict409, invalid input422; provider unavailable503/timeout504. Stage1 public AssistantResponse shape пен `source=ai|fallback|facts` enum-ы сақталуға тиіс. Internal provider output schema өзгеруі public financial endpoint өзгерісін талап етпейді.
