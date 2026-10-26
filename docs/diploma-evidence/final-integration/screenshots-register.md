# Actual browser screenshot register

Captured by installed desktop Chrome against http://127.0.0.1:4303 and the
isolated Stage 10 SQL fixture. These are actual rendered pages, not mockups.
All customers and financial values are synthetic; provider replies are offline.
No JWT, password field value, auth state or real customer data is published.

Desktop screenshots and viewport widths 360/390/768/1440 are browser layout
checks, not physical mobile acceptance. CSS root font-size 200% is explicitly
distinguished from native Chrome zoom. Full-page captures can show a fixed
mobile navigation bar at the original viewport position; this is not a claim
that the bar scrolls with page content.

58 PNG captures. Exact dimensions and byte hashes: [manifest](screenshot-manifest.json).

Selected slide evidence:

- [Desktop Research](screenshots/final-research-ru-1440.png): chronological forecast, held-out comparison, rule-based priority and consent.
- [KZ mobile Dashboard](screenshots/final-dashboard-kk-360.png): existing design with visible synthetic/offline label.
- [Unknown mixed payment](screenshots/unknown-payment-kk-390.png): missing receipt stays empty; clarification required.
- [Strict JSON fallback](screenshots/stage9-openai-duplicate-fallback.png): malformed provider result cannot become a ready money record.
- [Unknown response](screenshots/lost-response-unknown.png) and [SQL-matched analytics](screenshots/analytics-sql-after-retry.png): one committed write, explicit safe recovery.
- [Feedback after reload](screenshots/feedback-sql-ru-1280.png): consented synthetic response persisted in PostgreSQL.

Visual inspection: desktop Research and KZ 360 Dashboard were opened and
inspected by the agent. Automated assertions cover navigation/overflow and
keyboard horizon selection across all eight width/language combinations.
This is not a full accessibility or screen-reader certification.

| Capture | Dimensions | Meaning |
|---|---|---|
| [analytics-sql-after-retry](screenshots/analytics-sql-after-retry.png) | 1280 × 1597 | analytics sql after retry |
| [assistant-sql-ru-1280](screenshots/assistant-sql-ru-1280.png) | 1280 × 1687 | assistant sql ru 1280 |
| [dashboard-sql-after-retry](screenshots/dashboard-sql-after-retry.png) | 1280 × 1023 | dashboard sql after retry |
| [feedback-sql-ru-1280](screenshots/feedback-sql-ru-1280.png) | 1280 × 2654 | feedback sql ru 1280 |
| [final-analytics-kk-1440](screenshots/final-analytics-kk-1440.png) | 1440 × 1597 | Layout matrix: analytics / kk / 1440 |
| [final-analytics-kk-360](screenshots/final-analytics-kk-360.png) | 360 × 2629 | Layout matrix: analytics / kk / 360 |
| [final-analytics-kk-390](screenshots/final-analytics-kk-390.png) | 390 × 2363 | Layout matrix: analytics / kk / 390 |
| [final-analytics-kk-768](screenshots/final-analytics-kk-768.png) | 768 × 2130 | Layout matrix: analytics / kk / 768 |
| [final-analytics-ru-1440](screenshots/final-analytics-ru-1440.png) | 1440 × 1687 | Layout matrix: analytics / ru / 1440 |
| [final-analytics-ru-360](screenshots/final-analytics-ru-360.png) | 360 × 2473 | Layout matrix: analytics / ru / 360 |
| [final-analytics-ru-390](screenshots/final-analytics-ru-390.png) | 390 × 2394 | Layout matrix: analytics / ru / 390 |
| [final-analytics-ru-768](screenshots/final-analytics-ru-768.png) | 768 × 2130 | Layout matrix: analytics / ru / 768 |
| [final-dashboard-kk-1440](screenshots/final-dashboard-kk-1440.png) | 1440 × 960 | Layout matrix: dashboard / kk / 1440 |
| [final-dashboard-kk-360](screenshots/final-dashboard-kk-360.png) | 360 × 1420 | Layout matrix: dashboard / kk / 360 |
| [final-dashboard-kk-390](screenshots/final-dashboard-kk-390.png) | 390 × 1346 | Layout matrix: dashboard / kk / 390 |
| [final-dashboard-kk-768](screenshots/final-dashboard-kk-768.png) | 768 × 1105 | Layout matrix: dashboard / kk / 768 |
| [final-dashboard-ru-1440](screenshots/final-dashboard-ru-1440.png) | 1440 × 960 | Layout matrix: dashboard / ru / 1440 |
| [final-dashboard-ru-360](screenshots/final-dashboard-ru-360.png) | 360 × 1326 | Layout matrix: dashboard / ru / 360 |
| [final-dashboard-ru-390](screenshots/final-dashboard-ru-390.png) | 390 × 1282 | Layout matrix: dashboard / ru / 390 |
| [final-dashboard-ru-768](screenshots/final-dashboard-ru-768.png) | 768 × 1082 | Layout matrix: dashboard / ru / 768 |
| [final-research-kk-1440](screenshots/final-research-kk-1440.png) | 1440 × 3450 | Layout matrix: research / kk / 1440 |
| [final-research-kk-360](screenshots/final-research-kk-360.png) | 360 × 5131 | Layout matrix: research / kk / 360 |
| [final-research-kk-390](screenshots/final-research-kk-390.png) | 390 × 4879 | Layout matrix: research / kk / 390 |
| [final-research-kk-768](screenshots/final-research-kk-768.png) | 768 × 3779 | Layout matrix: research / kk / 768 |
| [final-research-ru-1440](screenshots/final-research-ru-1440.png) | 1440 × 3456 | Layout matrix: research / ru / 1440 |
| [final-research-ru-360](screenshots/final-research-ru-360.png) | 360 × 5062 | Layout matrix: research / ru / 360 |
| [final-research-ru-390](screenshots/final-research-ru-390.png) | 390 × 4736 | Layout matrix: research / ru / 390 |
| [final-research-ru-768](screenshots/final-research-ru-768.png) | 768 × 3697 | Layout matrix: research / ru / 768 |
| [final-sale-kk-1440](screenshots/final-sale-kk-1440.png) | 1440 × 960 | Layout matrix: sale / kk / 1440 |
| [final-sale-kk-360](screenshots/final-sale-kk-360.png) | 360 × 2629 | Layout matrix: sale / kk / 360 |
| [final-sale-kk-390](screenshots/final-sale-kk-390.png) | 390 × 1665 | Layout matrix: sale / kk / 390 |
| [final-sale-kk-768](screenshots/final-sale-kk-768.png) | 768 × 1557 | Layout matrix: sale / kk / 768 |
| [final-sale-ru-1440](screenshots/final-sale-ru-1440.png) | 1440 × 960 | Layout matrix: sale / ru / 1440 |
| [final-sale-ru-360](screenshots/final-sale-ru-360.png) | 360 × 1704 | Layout matrix: sale / ru / 360 |
| [final-sale-ru-390](screenshots/final-sale-ru-390.png) | 390 × 2573 | Layout matrix: sale / ru / 390 |
| [final-sale-ru-768](screenshots/final-sale-ru-768.png) | 768 × 1557 | Layout matrix: sale / ru / 768 |
| [font200-kk-1440](screenshots/font200-kk-1440.png) | 1440 × 5887 | Research: CSS root text at 200%, keyboard selects 30 days |
| [font200-kk-360](screenshots/font200-kk-360.png) | 360 × 13893 | Research: CSS root text at 200%, keyboard selects 30 days |
| [font200-kk-390](screenshots/font200-kk-390.png) | 390 × 12589 | Research: CSS root text at 200%, keyboard selects 30 days |
| [font200-kk-768](screenshots/font200-kk-768.png) | 768 × 8556 | Research: CSS root text at 200%, keyboard selects 30 days |
| [font200-ru-1440](screenshots/font200-ru-1440.png) | 1440 × 5678 | Research: CSS root text at 200%, keyboard selects 30 days |
| [font200-ru-360](screenshots/font200-ru-360.png) | 360 × 13265 | Research: CSS root text at 200%, keyboard selects 30 days |
| [font200-ru-390](screenshots/font200-ru-390.png) | 390 × 12086 | Research: CSS root text at 200%, keyboard selects 30 days |
| [font200-ru-768](screenshots/font200-ru-768.png) | 768 × 8429 | Research: CSS root text at 200%, keyboard selects 30 days |
| [grounded-kazakh-1280](screenshots/grounded-kazakh-1280.png) | 1280 × 1163 | grounded kazakh 1280 |
| [invalid-provider-fallback-1280](screenshots/invalid-provider-fallback-1280.png) | 1280 × 1081 | invalid provider fallback 1280 |
| [lost-response-unknown](screenshots/lost-response-unknown.png) | 1280 × 939 | lost response unknown |
| [research-30-days](screenshots/research-30-days.png) | 1280 × 3500 | research 30 days |
| [research-7-days](screenshots/research-7-days.png) | 1280 × 3500 | research 7 days |
| [research-error](screenshots/research-error.png) | 1280 × 2510 | research error |
| [research-loading](screenshots/research-loading.png) | 1280 × 2245 | research loading |
| [research-sql-kk-1440](screenshots/research-sql-kk-1440.png) | 1440 × 3450 | research sql kk 1440 |
| [research-sql-kk-360](screenshots/research-sql-kk-360.png) | 360 × 5113 | research sql kk 360 |
| [research-sql-ru-1440](screenshots/research-sql-ru-1440.png) | 1440 × 3456 | research sql ru 1440 |
| [research-sql-ru-360](screenshots/research-sql-ru-360.png) | 360 × 5063 | research sql ru 360 |
| [stage9-openai-duplicate-fallback](screenshots/stage9-openai-duplicate-fallback.png) | 1280 × 1081 | stage9 openai duplicate fallback |
| [stage9-receipt-customer-choice](screenshots/stage9-receipt-customer-choice.png) | 1280 × 1163 | stage9 receipt customer choice |
| [unknown-payment-kk-390](screenshots/unknown-payment-kk-390.png) | 390 × 1837 | unknown payment kk 390 |
