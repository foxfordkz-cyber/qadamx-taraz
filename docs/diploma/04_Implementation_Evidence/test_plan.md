# Функционалдық және зерттеу тест жоспары

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.

| Жинақ | Нақты жағдайлар | Орта/критерий | Evidence |
|---|---|---|---|
| Ledger | Full/partial/unpaid sale; later repayment; overpay rejection; reversal ordering; idempotent replay and mismatch; tenant isolation | Ephemeral PostgreSQL only; exact integer balances; no duplicate entries | DB run log + operation history before/after; not yet run |
| Customer | Same request replay, duplicate normalized contact, ambiguous recovery, delayed commit, foreign tenant | API+Web isolated DB; duplicate customer absent | Current code tests; integration next |
| Draft/AI | RU/KK/mixed; missing amount/payment; unknown customer; timeout/cancel; manual correction; duplicate confirm | Stub unit + consented live offline eval separately; no AI money write | EXP-A per-case + UI E2E |
| Assistant S1 | Wrong metric/customer/value/sign/unit; non-fact prose; unknown key; exact valid controls; fallback; actions | Locked finite engineering corpus; public schema retained | EXP-B current-v2 JSONL + compatibility report |
| Forecast candidate | Thresholds97/98,143/144; scaler leakage; known-at-close reversal; recursively predicted lags; baseline wins; no data | Pure tests current25combined; DB/real origin still missing | T07/T08 + EXP-C real later |
| Risk candidate | Age7/8/30/31; balance identity; paid0; reversal; amount; stable cursor; labels absent | Rule correctness ≠ outcome predictive quality | T07 + DB API later |
| Feedback candidate | Strict consent; nullable ratings; idempotent bodyhash; business/user scopes; delayed response; free-text limits | Migration0009 only isolated DB; browser route needs wiring | No actual run yet; T12 |
| Cross clients | RU/KK;360/390/1440; session switch; refresh; empty/loading/error; web contracts; Flutter parity | Web6 demo previous; Flutter not run | Dated log + screenshot + source SHA |

Checks progression: API pure/contract→isolated DB→web unit/type/lint/build→local E2E→Flutter/toolchain→consented formative acceptance. Failed run сақталады; rerun scope/config айқын. Тест атауының файлда болуы Passed дегенді білдірмейді. Regression кеңейту жаңа changes не unresolved concerns болғанда ғана; осы docs stage-де барлық suite орынсыз қайталанбайды.
