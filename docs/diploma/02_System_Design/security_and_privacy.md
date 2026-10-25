# Қауіпсіздік және дербес деректер

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


## Нақты бақылаулар

JWT verifier RS256/ES256, issuer/audience/exp/iat/sub/role және kid тексереді; token-supplied jku/x5u қолданбайды. [`apps/api/app/auth.py:20`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/auth.py#L20). Әр жабық business route membership тексереді. Tenant composite FK — қосымша DB тұтастығы. API error secret DSN/provider body шығармайды. CORS нақты origin-дермен шектеледі, бірақ авторизацияны алмастырмайды.

Core qadam tables үшін migration-дарда REVOKE бар; барлық core table-де RLS бар деп айтуға дәлел жоқ. Candidate0009 feedback-ке RLS enable және direct role revoke қосады. Бұл source code фактісі, production DB state емес.

## AI шекарасы

Raw transcript және assistant facts ішіндегі клиент атауы/сомасы сыртқы provider-ге берілуі мүмкін. `store=false` толық дерек-резиденттік немесе provider retention кепілі ретінде жазылмайды. Audio жадта normalize болады; multipart upload уақытша spool қолдануы мүмкін. Schema output мағынаның дәлдігін кепілдемейді. DailyLimit memory/per-process; restart/multi-worker quota мәселесі бар. [`apps/api/app/services/assistant.py:385`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/services/assistant.py#L385).

## Feedback privacy

Candidate feedback `business_id/created_by` сақтайды: ол аноним сауалнама емес, жеке account-пен байланысқан private feedback. Consent=true backend check зерттеуге жеке хабардар келісімнің толық орнын баспайды. Free-text-та клиент/телефон/қаржы дерегі кетуі мүмкін, сондықтан нұсқаулық, access control, redaction және withdrawal рәсімі қажет.

Candidate study plan raw retention90күн ұсынады; автоматты purge немесе admin delete workflow коды осы кезеңде расталмады. Жауапты researcher/contact, restricted storage, receipt-based withdrawal, backup/export handling нақтыланбай recruitment басталмайды. Follow_up flag автоматты хабар жіберуге рұқсат емес.

## Зерттеу экспорты

Private user-level exports Git пен ZIP-ке кірмейді. Dataset register-де permission/license, collection date, data owner, pseudonymization және withdrawal scope сақталады. Public UCI/KSC тек license-aware сыртқы benchmark, жергілікті бизнес evidence емес. Осы пакетте тек synthetic examples және public documentation metadata бар; нақты клиент немесе owner жауабы жиналған жоқ.

## Stage1 safety gate

Fact/entity reference тек current tenant snapshot-тен; arbitrary UUID/amount/new number қабылданбайды. Server rendering тексерілмеген prose-ті ақша фактісі ретінде шығармайды. Модельде ledger write tool жоқ. Қате жауабына existing fallback қолданылады; public schema/financial logic сақталады.
