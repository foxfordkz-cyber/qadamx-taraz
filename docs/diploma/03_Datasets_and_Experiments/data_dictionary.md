# Деректер сөздігі

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


Барлық ақша — integer **minor units**. KZT көрсетілімінде 100 minor = 1 ₸; float теңге есептеу/салыстыруға қолданылмайды. CSV-дегі бос ұяшық — өлшем жоқ, нөл емес. Case/speaker/customer/business идентификаторлары pseudonymized; private mapping жария пакетке кірмейді.

| Бағыт | Өрістер | Тип/бірлік және мағына |
|---|---|---|
| A input | case_id, language, speaker_id, template_group, modality, audio_ref, reference_transcript | language: kk/ru/mixed; consented private audio_ref; мәтін мен audio бөлек strata |
| A gold | kind, total_minor, paid_minor, customer_key, missing_fields, clarification_required, evidence_spans | Әр өрісте null ≠ 0; kind sale/repayment; customer_key test snapshot ішіндегі нақты кілт не null; span input-та бар |
| A observed | raw_provider_output, parsed_output, error_type, model_id, prompt_sha, started_at, elapsed_ms, retry_count | Raw output private болуы мүмкін; timeout/error latency бөлек; STT transcript extraction input-пен бірге сақталады |
| B | case_id, validity_gold, mutation_type, snapshot_hash, proposed_claims, accepted_current, accepted_v2, reason | validity_gold: valid/invalid; entity/metric/amount/sign/unit әрқайсысы label; v2 әзірше null |
| C raw | day, sales_minor, provenance, recorded_coverage, as_of, series_sha256 | day ISO local business date; completed ledger day; белгісіз recording gap нөл деп толтырылмайды |
| C report | horizon, origin, train_end, validation_range, test_range, baseline_method, alpha, prediction_minor, actual_minor | h=7/30 recursive horizon; scaler/alpha тек train/validation-нан; test actuals inference-ке берілмейді |
| D snapshot | customer_key, open_balance_minor, initial_debt_minor, later_paid_minor, oldest_open_age_days | Бастапқы қарыз = balance + net later_paid; current open-sale cohort; oldest age due-date емес |
| D optional label | anchor_date, outcome_window, paid_within_window, label_matured, due_date, censor_reason | Бұл өрістер қазір сенімді dataset ретінде жоқ; анықталмай outcome metric есептелмейді |
| U | consent_version, consent_at, participant_code, tasks_used, completion, observed_error, optional_rating, withdrawal_receipt | Рейтинг 1–5 ordinal; қолданылмаған мүмкіндік null; account-linked feedback anonymous деп аталмайды |

Жария UCI: InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country. GBP→KZT автоматты конверсиясы жоқ; returns/cancellations анықтамасы бөлек шешіледі. UCI-де Qadam partial-payment немесе repayment label жоқ. KSC тек ASR benchmark eligibility үшін; shop extraction gold ретінде ауыстырылмайды.
