# Integration readiness және нақты кедергілер

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


| Қабат | Расталғаны | Қалған gate |
|---|---|---|
| Main | Exact `2518b2e80b8c8ef881063a968645382d61aeb37e`; previous audit feature/test evidence қайта байланыстырылды | Fresh DB/Flutter/live-provider evidence жоқ |
| Candidate | `b7c4750b158a6b1fc747e63a68ae7b2d078b5107` main-нан4commit алда,28file diff; forecasting/rules pure25passed | Review generated contract drift; DB/API security; frontend wiring; captain merge decision |
| Assistant | Main/candidate assistant.py byte-equivalent | Proposed structured validator жоқ; pilot semantic gap расталған |
| Forecast/risk | API/service/schema кодта бар; synthetic CLI қайта орындалды | No eligible real series/outcome labels; forecast/risk screen табылмады |
| Feedback | Persistence/migration/API және standalone RU/KK form бар | Form App/router-ға қосылмаған; docs-тағы full research screen дәлелденбеген; study owner/withdrawal/export review |
| Docs | Бұл пакет modular traceability береді | Student independent review; official classification/author split/source reading |

Research candidate бұрын жасалған код болғандықтан S3–S5 «нөлден implement» емес, review/test/integrate ретінде жоспарланады. No merge/deployment/DB change осы кезеңде жасалмады. Main baseline-нан docs branch ғана ашылды; application source hash guard тексеріледі. Candidate migration0009 бұл жерде applied емес. Public API schema changes captain-approved separate implementation шағында ғана.
