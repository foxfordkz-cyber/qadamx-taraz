# Stage1: нақты implementation scope және acceptance

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


> Бұл бастапқы planning scope. Current implementation report: [Stage1 result](04_Implementation_Evidence/stage1_implementation_report.md).

## Нақты проблема және baseline

[`apps/api/app/services/assistant.py:199`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/services/assistant.py#L199) жауаптағы сандардың facts set-ке кіруін тексереді, бірақ олардың metric/customer байланысын толық бекітпейді. Main/candidate implementation бірдей. Pilot4deliberately-invalid cases ішіндегі invented name,wrong metric value,wrong debtor amount өтті;new unsupported number rejected. Бұл counterexample detection, representative accuracy емес.

## Ұсынылатын өзгеріс

1. **Internal** model-output contract-та allowed claim types және server-provided fact identifiers енгізу: мысалы `metric:sales` және `debtor:<snapshot customer UUID>:balance`. Бұл illustrative design IDs; public API existing key деп танылмайды.
2. Fact map тек current authenticated business/window snapshot-тен жасалады. Claim entity/metric/type бір-біріне қатаң байланысады. Модель еркін amount/name/unit жасап бере алмайды; server тиісті value/name/unit-ті өзі қайта құрастырады.
3. RU/KK мәтінін finite localized templates арқылы server render етеді. Arbitrary prose ішіндегі қаржылық assertion safe деп саналмайды. Optional prose сақталса тек vetted non-factual phrase allowlist немесе бөлек immutable explanatory field; жауаптағы барлық financial claims controlled path-тан шығады.
4. Reminder action тек snapshot-та бар debtor-ға, дәл current balance-ке және server template-ке байланады. WhatsApp-қа automatic send жоқ; existing action shape сақталады.
5. Unsupported/malformed/unknown/timeout output→existing safe facts/fallback. Public `AssistantResponse`, `source=ai|fallback|facts` semantics compatibility contract-ы сақталады; жаңа source enum не DB schema қажет емес.

## Өзгеретін files

- `apps/api/app/services/assistant.py`: provider response orchestration, fact-map creation, internal validation+safe rendering integration.
- Proposed `apps/api/app/services/assistant_structured.py`: strict internal schema, fact/entity binding және rendering; нақты атауы coding review-де таңдалады.
- `apps/api/tests/test_assistant.py`: existing fallback/tenant/action compatibility regressions.
- Proposed `apps/api/tests/test_assistant_semantics.py`: locked positive/negative cases және no-write assertions.
- `docs/diploma/03_Datasets_and_Experiments` registry және evidence run files: implementation SHA/observations жаңарту.

Financial ledger/customer models/migrations/frontend routing өзгермейді; contract өзгерісі қажет болса бөлек scope ретінде ашылады. No live AI request/production test/DB migration бұл stage scope-қа міндетті емес.

## Test matrix және өлшеу

Кемінде16gold-valid +16gold-invalid +4existing counterexample frozen before implementation evaluation. Wrong entity/name,correct number wrong metric,wrong debtor value,unsupported amount,sign/unit,foreign tenant,unknown fact key,duplicate claim,null/boolean/fractional/negative typed value,malformed keys/action тексеріледі. Valid RU/KK controls ішінде zero,integer amount,empty/no-debt,allowed reminder және fallback бар. Model internal schema нақтылағаннан кейін cases exact payload-қа байланады;gold labels өзгертілмей сақталады.

Current және v2 per-case accept/reject/reason бірге жазылады; model/provider callсіз parser/renderer harness. TP=validaccepted,FP=invalidaccepted;FAR/FRR және meaningfulP/R/F1 frozen finite set үшін ғана. Seed/prompt/schema/source hash/actual case count/duration/raw outputs retained. Pilot4-ті balanced experiment орнына қолданбау.

## Қабылдау критерийлері

- Frozen finite invalid cases-де **false acceptance0**;valid controls-де **false rejection0**. Бұл population guarantee емес.
- Metric–value/customer–value сәйкестігі сервер snapshot-інен ғана; әр emitted financial claim source key-мен traceable.
- Public AssistantResponse/action schema және RU/KK expected behavior retained; generated contracts check/typecheck passes if touched.
- Existing assistant/fallback regressions + new semantic tests pass; unsupported output safely falls back,raw unchecked prose financial answer ретінде шықпайды.
- Ledger/database money-write шақырулары жоқ;cross-tenant fact қолданылмайды;API key/PII logs жоқ.
- Exact implementation SHA + current-v2 raw case JSONL + aggregate counts + limits + student review evidence тіркеледі.

## Rollback және scope completion

AI wording feature-ін disable етіп server facts/fallback-қа қайту; unsafe legacy prose-ге үнсіз қайтпау. DB rollback/migration жоқ. Stage1 осы жерде **жоспарланды,іске асырылмады**. Келесі coding session осы scope бойынша бөлек commit/PR және captain review жасайды;main-ға тікелей merge жасалмайды.

## Stage1 implementation update — 24.10.2026

Local implementation `6ac5266abddffa7f1278d403ece55cc3eba457a1`,frozen42comparison және final318backend/57web checks бар. [Actual implementation report](04_Implementation_Evidence/stage1_implementation_report.md). Бұрынғы «planned/not implemented» мәтін бастапқы planning snapshot;жаңа report current Stage1 күйін береді. RealDB/liveAI,student attribution және later stages әлі pending.
