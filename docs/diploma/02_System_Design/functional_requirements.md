# Функционалдық талаптар

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.

| ID | Талап | Feature ID | Acceptance | Source күйі |
|---|---|---|---|---|
| FR01 | Owner өз business-ін ғана көреді | F11 | Бөтен business/customer/sale/draft→404 | main |
| FR02 | Sale total>0 және 0≤received≤total | F01 | Debt болса customer міндетті; money strict integer minor | main |
| FR03 | Repayment sales-ті өсірмейді | F02 | sales_delta=0, amount≤current balance | main |
| FR04 | Reversal тарихты сақтайды | F04 | Immutable operation және opposite delta; dependent payments check | main |
| FR05 | Retry duplicate money жасамайды | F01/F05 | Same key/same payload→same receipt; different payload409 | main |
| FR06 | Бір source-тен AI draft алу | F06 | text XOR audio; locale ru/kk/auto; 8MiB/30s | main |
| FR07 | Белгісіз төлем null, seller confirm бөлек | F07 | Missing fields нақтылау; draft lifetime30min | main |
| FR08 | SQL аналитикасын model response-тан бөлу | F09 | 7/30 period, collection cohort және current aging | main |
| FR09 | Assistant ақша жазбайды | F08 | Read-only facts, restricted action kinds, fallback | main; semantic gap бар |
| FR10 | WhatsApp мәтінін сатушы өзі жібереді | F10 | Deep link; no automatic sending | main |
| FR11 | Semantic claim fact/entity-ге байланады | F13 | S1 locked suite және server rendering | proposed |
| FR12 | Forecast horizon7/30 және no-data state | F14 | Candidate98/144 daily history gate; selection validation-only | candidate |
| FR13 | Risk score түсіндіріледі, overdue claim жоқ | F15/F17 | Rules-v1 factors; supervised_status insufficient_data | candidate |
| FR14 | Feedback consent және author scope | F16 | Consent true; key replay; private paged reads | candidate; UI standalone |

FR11–14 main функциясы ретінде көрсетілмейді. Толық feature evidence және observed test outcome 04 бөлімінде.
