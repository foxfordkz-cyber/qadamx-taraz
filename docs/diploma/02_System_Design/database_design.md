# Дерекқор моделі

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.

| Entity | Маңызды өріс/constraint | Байланыс | Шектеу |
|---|---|---|---|
| Venue | id, slug, name, i18n | Business.venue_id | Public demo geography |
| Business | id, venue_id, slug, is_demo | Membership/Customer/Operation/Draft | Tenant boundary |
| Membership | (user_id,business_id) PK, role=owner | Local user FK табылмаған | JWT subject≠local user entity |
| CatalogItem | business_id, price_minor, available | Business | Read-only catalog; sale line FK жоқ |
| Customer | id, business_id, name/contact | Operation composite FK | Names жеке тұлға идентификаторы емес |
| Operation | id,business_id,kind,sale_id,customer_id,deltas,reversal_of | Self FK, tenant composite FK | Immutable trigger; kind sale/repayment/reversal |
| IdempotencyRecord | (business_id,key), hash,response_json | Result operation composite FK | Durable replay |
| Draft | business_id,created_by,expires_at,response_json,consumed_operation_id | Nullable unique consumed FK | 30min TTL; raw audio entity жоқ |
| CustomerCreationRequest | business/created_by/key,request_hash,result_customer_id | Customer composite FK | Durable user-scoped creation receipt |
| Inquiry | business_id,client_request_id,status | Unique business/request | Visitor contact private projection |
| Livestock entities | Market/Listing/Photo/Request | market_id; owner/listing composite FK | Core sales ledger-ден тәуелсіз |
| ResearchFeedback [candidate] | id,business,created_by,client_request_id,hash,payload,time | Business FK; triple unique | 0009; consent check, RLS+revoke; no shared rollout |


Негізгі entity дәлелі: [`apps/api/app/models/__init__.py:123`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/models/__init__.py#L123). Candidate entity: [`apps/api/app/models/__init__.py:104`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/b7c4750b158a6b1fc747e63a68ae7b2d078b5107/apps/api/app/models/__init__.py#L104); migration: [`apps/api/migrations/versions/0009_research_feedback.py:13`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/b7c4750b158a6b1fc747e63a68ae7b2d078b5107/apps/api/migrations/versions/0009_research_feedback.py#L13).

`D=Σ(sales_delta_minor−receipts_delta_minor)`. `repayment` sales delta0. `reversal` original delta-ларды терістейді. `(business_id,customer_id/sale_id/reversal_of)` құрамдас FK entity-ді басқа tenant-ке байлауға тосқауыл береді. Business-level `FOR UPDATE` ақша write-тарын сериалдайды. 0002 trigger UPDATE/DELETE-ті болдырмайды. Бұл схема double-entry general ledger емес.

Core migrations0001–0008. Candidate0009 тек feedback үшін; forecast/risk read-only SQL қосымша financial table талап етпейді. RLS core-дың бәріне бар деген тұжырым жасалмайды. ResearchFeedback created_by UUID local auth.users-ке FK емес. Migration осы кезеңде орындалмады.

[ER source](diagrams/04_database_er.mmd). Data dictionary-де historical snapshot, partial day, null және unit semantics көрсетілген. Due date/default outcome entity жоқ; age-ден supervised target шығарылмайды.
