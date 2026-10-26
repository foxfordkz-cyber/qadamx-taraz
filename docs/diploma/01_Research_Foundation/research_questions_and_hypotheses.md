# Зерттеу сұрақтары мен гипотезалар

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.

| ID | Сұрақ | Гипотеза | Өлшем | Бағалау шарты | Ағымдағы күй |
|---|---|---|---|---|---|
| RQ1/A | RU/KK/mixed енгізуден kind/amount/customer/null дұрыс бөлінеді ме? | H-A: ambiguity мен тілге байланысты қате түрлері ажыратылады | Field exact match, missing/null, clarification, WER, latency | DS-A-PROPOSED; speaker/template holdout | Ешбір тілге әмбебап accuracy алдын ала бекітілмейді |
| RQ2/B | Current numeric set тексерісі semantic қателерді өткізеді ме? | H-B: structured fact/entity binding false acceptance-ті азайтады | Invalid acceptance/valid rejection және meaningful precision/recall/F1 | Locked valid+invalid suite; current vs v2 бір cases | Current pilot: 3 association error өтті; v2 жоқ |
| RQ3/C | Ridge шын 7/30 horizon-да baseline-нен жақсы ма? | H-C: жарамды series-де ridge MAE төмен болуы мүмкін | MAE/RMSE per horizon/per origin; uncertainty | Train→validation→test; selection тек validation | Baseline жеңсе сақталады; universal ML advantage жоқ |
| RQ4/D | Ledger facts түсіндірілетін review priority бере ме? | H-D1: rules нәтижесін owner дұрыс түсіндіреді; H-D2 supervised тек label барда | Rule correctness/interpretation; outcome metrics тек mature labels болса | Open sale age≠overdue; censoring-aware cohort | Labels жоқ; risk probability нәтижесі жоқ |
| RQ5/U | Иесі ұсыныстың шектеуін түсініп, қатені түзете ала ма? | H-U: қолданушы state/confirmation/score meaning-ін ажыратады | Task completion, final errors, observed confusion; ordinal ratings | Actual consented formative sessions | Ешқандай интервью немесе сауалнама жауабы жасалмайды |

Гипотеза result ретінде белгіленбейді. Қабылдау критерийлері engineering correctness пен empirical generalization-ды бөледі. Dataset жеткіліксіз болса «гипотеза расталды» орнына «бағалау мүмкін болмады» деп жазылады. Pre-registration ретінде dataset hash, test freeze, metrics және exclusion policy бірінші нақты model run-нан бұрын бекітіледі.
