# Бағалау хаттамасы: A–D және owner study

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


## Ортақ алдын ала бекіту

Әр run алдында experiment_id, source SHA, dataset SHA-256/license/consent, code+prompt/schema hash, model/provider нақты returned ID, seed, cutoff, inclusion/exclusion, split, metrics және execution environment сақталады. Test freeze кейін label/threshold өзгерсе жаңа experiment_id ашылады. Failed/timeout cases denominator-дан үнсіз алынып тасталмайды. Raw case нәтижелері aggregate-ке дейін сақталады; student independently verifies labels. Екі labeler мүмкін болса келіспеушілік пен adjudication тіркеледі; бір labeler болса limitation ашылады.

## A — қаржылық extraction

H-A: тіл мен ambiguity error түрін өзгертеді; алдын ала superiority нәтижесі жоқ. DS-A-FIX08 — smoke; scientific test емес. DS-A-PROPOSED үшін ұсынылатын бастапқы жоспар: kk/ru/mixed әр қабатта ≥30 мәтін, соның ішінде consented audio жұптары мүмкіндігіне қарай; бұл жиналған көлем емес, power calculation емес. Sale/full/partial/unpaid, repayment, unknown customer, unknown amount/payment, slang/negation және clarification strata белгіленеді. Speaker/template топтары development/test арасында бөлінеді; бір paraphrase екі жаққа түспейді. Provider салыстыруы бір locked set-пен, retry policy/cost бірдей, order counterbalanced. Live request өздігінен жасалмайды.

Transaction kind accuracy = дұрыс kind / gold kind бар барлық case. Amount exact match = integer minor дәл тең / gold amount белгілі case. Customer association = дұрыс key / gold customer decision бар case (null/no-match бөлек). Missing-field handling = gold missing-set дәл сәйкестік; false fill саны міндетті. Clarification correctness = gold ambiguity жағдайында нақтылау сұралуы және белгілі facts-ті жоғалтпау; ambiguity жоқ case-те unnecessary clarification бөлек. Extraction error/timeout total N ішінде қате деп белгіленеді; conditional-on-parse метрикасы тек қосымша беріледі.

WER = (S+D+I)/N_reference_words. Raw және нормаланған WER екеуі сақталады; регистр/тыныс normalization ережесі алдын ала бекітіледі, сандарды жоғалтуға болмайды. Text-only case-де WER null. Latency end-to-end және STT/extract бөлек: median/p95 тек жеткілікті N болғанда, N және failure rate бірге; local clock monotonic. Accuracy үшін numerator/denominator және 95% Wilson interval; tiny language strata-да жалпылау жасалмайды.

Engineering gate: malformed/negative/fractional minor/unsupported customer financial commit-ке өтпейді; адам confirmation міндетті. Empirical gate: кемінде жоспардағы N немесе shortfall disclosure, per-language толық raw scoring, leakage жоқ, student қорытындысы. Алдын ала ойдан 95–99% accuracy acceptance қойылмайды.

## B — factual validation

H-B: fact/entity-bound server rendering semantic false acceptance-ті азайтады. Current validator vs proposed v2 **бір** frozen snapshot/case жиынында. Gold-valid positive class деп алынады: TP valid accepted, FN valid rejected, FP invalid accepted, TN invalid rejected. False acceptance = FP/(FP+TN), false rejection = FN/(TP+FN); precision = TP/(TP+FP), recall = TP/(TP+FN), F1 = 2PR/(P+R). Denominator0 болса null + reason, нөл метрика емес. Mutation category бойынша metric/customer/amount/unsupported claim counts беріледі; paired case table және uncertainty қажет.

Ағымдағы төрт deliberate-invalid counterexample: invented_customer, wrong_fact_binding, wrong_debtor_amount accepted; new_number_control rejected. Бұлар valid controls жоқ targeted pilot. Оны «75% жалпы қате» немесе meaningful precision/recall/F1 деп атауға болмайды. S1 frozen engineering set кемінде16 valid +16 invalid + осы4 regression cases; unknown keys/entity/fact/sign/unit/null/strict integers, RU/KK, cross-tenant facts тексеріледі. Осы finite set-те invalid accepted0 және valid rejected0 — correctness gate, population accuracy емес.

## C — болжам

H-C: ridge нақты eligible held-out history-де baseline-нен төмен MAE беруі мүмкін. Dataset: synthetic180 тек engineering; authorized business series жоқ; UCI alternative external benchmark жүктелмеген. Daily sales пен cash receipts шатастырылмайды. Business time zone, start/end, recording completeness және known-at-cutoff reversals сақталады. Candidate completed-day extraction first partial onboarding day/today-ді алып тастайды; filled0 тек толық жүргізілген күн екені расталғанда eligible. Consent/privacy/license тексерілмей raw business data алынбайды.

Candidate бір origin: train=[start,n−2h), validation=[n−2h,n−h), test=[n−h,n). Train≥84, total≥98(h7) не144(h30); бұл **кодтың минимумы**, статистикалық жеткіліктілік кепілі емес. Train-only scale; alpha∈{0.1,1,10} validation MAE бойынша; baseline/ML selection validation-да; test бір рет ашылады. Recursive prediction болашақ actual sales-ті lag ретінде алмайды. Бір күндік rolling one-step forecast бөлек эксперимент, true7/30 орнына көрсетілмейді.

Жаңа real run жоспары: минимум3 толық test origin мүмкіндігі болса, weekly step және overlapping horizons disclose; соңғы horizon толық жетілсін. Әр origin-де features/scaler/model жаңадан fit; validation past-only; test results tuning-ге берілмейді. Origin жетпесе single-origin limitation. MAE_h=Σ|y−ŷ|/h; RMSE_h=√(Σ(y−ŷ)²/h), minor және ₸ units. Per-horizon/per-origin, zero-sales periods және errors сақталады. MAPE zero denominator үшін primary емес. Ridge жеңбесе baseline selected болады. No history→insufficient_data, real metrics null; synthetic line chart шынайы forecast UI-іне ауыстырылмайды.

## D — debt review / conditional supervised ML

H-D1: rules factor explanation owner-ге review priority-ді түсіндіреді. Candidate rules-v1 жас/remaining-share/no-later-payment бойынша deterministic score; training жоқ. Баланс0→low0; age8–30 +25,31+ +50; initial debt-тің кемінде жартысы қалса+20; кейінгі net төлем0 болса+10. Low<30, medium30–59, high≥60. Максимум80, DTO0–100 диапазоны probability scale емес. Due_date жоқ→overdue_status unknown_no_due_dates.

Rule validation: boundaries7/8/30/31, paid/no-debt, reversal, aggregation identity, factor sum, sort/pagination, membership. Owner interpretation бойынша observed confusion ғана, outcome accuracy емес. Outcome labels жоқ болғандықтан precision/recall/F1/ROC-AUC **null**.

H-D2 тек сенімді outcome label пайда болғанда: anchor current debt, алдын ала келісілген30күндік repayment outcome, window fully observed; censored cases reason-мен бөлінеді. Features anchor кезінде ғана белгілі, later payment outcome feature-ге өтпейді. Time split және customer/business group isolation; prevalence, mature counts, naive majority baseline; logistic regression candidate, PR-AUC/precision/recall/F1/calibration тек жеткілікті both-class support болса. Threshold validation-да, test untouched. Уәде етілген төлем күніне қатысты delinquency target-і үшін нақты due_date міндетті; debt age-тан overdue label ойлап табылмайды.

## Owner research — келесі кезеңнің хаттамасы

Ұсыныс5–10 convenience-sample owner,15–20мин formative session; нақты recruited N=0. Тапсырмалар: partial sale, repayment, voice correction/confirmation, forecast unavailable/experimental state, rule explanation. Consent/contact/private storage/deletion жауаптысы тағайындалмай басталмайды. Candidate feedback API account-linked; 1–5 рейтинг means inferential efficacy емес. Transcript/қатысушы пікірі ойдан толтырылмайды. Қатысу/withdrawal, task outcome, final financial error, confusions және sample bias бөлек тіркеледі.
