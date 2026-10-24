# Baseline және candidate әдістері

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


| Бағыт | Салыстыру | Қазіргі іске асуы | Ғылыми шек |
|---|---|---|---|
| A | Existing provider + frozen gold; text-only vs audio pipeline | OpenAI STT→extract; Gemini audio/extract adapter | Stub tests live quality емес; human confirmation money gate |
| B | Numeric-membership validator vs proposed bound-claim renderer | Current validate_answer бар; proposed v2 жоқ | Бүгінгі pilot4 түгел invalid; balanced test қажет |
| C | rolling_mean_7, seasonal_naive_7, ridge-lags-v1 | Үшеуі candidate-де бар; validation selector | Baseline winning allowed; no arbitrary model replacement |
| D | rules-v1; supervised extension conditional | Rule code бар; trained risk ML жоқ | Probability/default/overdue деп берілмейді |

Ridge objective: minimize ||y−Xβ||² + α||β_regularized||²; intercept penalty және scaling нақты code бойынша тексеріледі. Candidate11features: intercept, lag1, lag7, rolling7, rolling28 және6weekday dummy. Custom Gaussian elimination solver; sklearn runtime dependency емес. Кейінгі validation task: дәл сондай design matrix/regularization-пен independent numerical reference салыстыру, degenerate/constant series және conditioning. Алдын ала тең нәтижені claim етуге болмайды.

Immutable source: [`apps/api/app/services/forecasting.py:113`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/b7c4750b158a6b1fc747e63a68ae7b2d078b5107/apps/api/app/services/forecasting.py#L113); rules: [`apps/api/app/services/debt_risk.py:1`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/b7c4750b158a6b1fc747e63a68ae7b2d078b5107/apps/api/app/services/debt_risk.py#L1). L09/L12 — әдіснамалық түсіндірме, candidate нәтижесінің орнына жүрмейді.
