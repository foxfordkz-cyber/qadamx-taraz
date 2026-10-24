# Source revision және тармақтарды салыстыру

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


## Baseline шешімі

Негізгі code interpretation: `main@2518b2e80b8c8ef881063a968645382d61aeb37e`. Candidate evidence бөлек: `feature/ml-sales-debt-research@b7c4750b158a6b1fc747e63a68ae7b2d078b5107`. Main unchanged; research тармағы4commit ahead,main-only0. Source interpretation deployed revision деп танылмайды. Branch graph fetch24.10.2026snapshot, кейін өзгеруі мүмкін.

`integration/team-mvp` remote ref жоқ. Historical `3d009dc86c93debcab05dedda530b7d1fe62a304` main ancestor екені merge-base exit0 арқылы расталды; main-ға дейін344commit бар. Сондықтан old integration snapshot current baseline ретінде алынбайды. Өзге active refs ancestry санымен ғана салыстырылды, deploy readiness емес.

| Remote ref | SHA | main-only | ref-only | Commit date |
|---|---|---|---|---|
| origin/main | 2518b2e80b8c8ef881063a968645382d61aeb37e | 0 | 0 | 2026-10-18T13:38:08+05:00 |
| origin/feature/ml-sales-debt-research | b7c4750b158a6b1fc747e63a68ae7b2d078b5107 | 0 | 4 | 2026-10-24T12:03:34+05:00 |
| origin/feature/aidana-ai-assistant | 880d7137f39648f0bbce355369ee3e755d981f02 | 376 | 3 | 2026-10-16T17:13:44+05:00 |
| origin/feature/analytics-072 | b140a7bf5f02fc4a33304f3498c19581b151f502 | 16 | 2 | 2026-10-18T12:24:27+05:00 |
| origin/release/pages-assistant-20261018 | f44338240333a8d8d5d9b9618641341bc71592cf | 46 | 2 | 2026-10-18T09:59:42+05:00 |
| origin/deploy/permanent-062 | e34ca6bd87f60b1f77d44fb812e2cda61b79fbb9 | 20 | 0 | 2026-10-18T12:04:36+05:00 |
| origin/integration/latest-visible-release | abaee73901db39f54c838a5af3be83ed7d48f068 | 219 | 1 | 2026-10-17T16:02:54+05:00 |
| origin/feature/mobile-native-parity | ecab54df4183debf67ab498a3f48bc5ba3e843fb | 128 | 3 | 2026-10-18T08:49:56+05:00 |

## Аудиттен кейінгі маңызды жаңару

Candidate-де forecast/risk/feedback **код бар**; main-да жоқ.25pure tests current run өтті; candidate DB/API/frontend integration тексерілмеді. FeedbackForm standalone, App/router wiring табылмады. Forecast/risk frontend route табылмады. Current assistant main/candidate byte-equivalent,Stage1gap бар. Осыны ескермей S3–S5 нөлден жазу duplication болар еді.

`docs/diploma` бастапқыда жоқ; main-нан `docs/diploma-research-workspace` local branch ашылды. App code edit/merge/commit/push/deploy/DB migration жасалмайды. Exact application file hashes және prior-audit hashes `evidence/baseline_comparison.json`; final source guard root verification-да. University PDF/capture source provenance manifest арқылы бақыланады.
