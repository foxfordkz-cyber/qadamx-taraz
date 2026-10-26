# Actual UI screenshots — Stage 6

Captured **2026-10-25**, source application **ae43dc25543ab261511c8b5f5982c7dfe8112da8**; new harness content **3c9ed301a0e0d087298b0fb80b558f527d8b75d3**. All images are real browser renders of the integrated application with **synthetic data**. None is a generated mockup or physical-device/live-AI claim.

[Pixel dimensions, capture timestamps and SHA-256 manifest](screenshots.json). Images use full-page capture, so image height can exceed the listed viewport height. Mobile means browser viewport, not a phone.

| File                                                                                       | Locale / viewport | Source and meaning                                                                                          |
| ------------------------------------------------------------------------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| [SQL assistant](screenshots/assistant-sql-ru-1280.png)                                     | RU, 1280×720      | Chrome; real local SQL, structured offline provider; correct 4,200 sales / 2,000 debt and customer reminder |
| [SQL saved feedback](screenshots/feedback-sql-ru-1280.png)                                 | RU, 1280×720      | Chrome; persisted synthetic response after reload                                                           |
| [Research RU mobile](screenshots/research-sql-ru-360.png)                                  | RU, 360×960       | Chrome; SQL history, 30-day forecast and held-out comparison                                                |
| [Research KZ mobile](screenshots/research-sql-kk-360.png)                                  | KZ, 360×960       | Same SQL fixture, localized                                                                                 |
| [Research RU desktop](screenshots/research-sql-ru-1440.png)                                | RU, 1440×960      | Same SQL fixture                                                                                            |
| [Research KZ desktop](screenshots/research-sql-kk-1440.png)                                | KZ, 1440×960      | Same SQL fixture                                                                                            |
| [Research SQL regression](screenshots/regression-postgres-research-ru.png)                 | RU, 1280×720      | Existing SQL suite rerun on combined source                                                                 |
| [Lost-response persisted feedback](screenshots/regression-postgres-feedback-persisted.png) | RU, 1280×720      | Existing SQL retry/reload scenario                                                                          |
| [Unsaved draft guard](screenshots/regression-research-unsaved-kk.png)                      | KZ, 1280×720      | Existing SQL suite, unsaved consented draft warning                                                         |
| [dashboard desktop](screenshots/demo-dashboard-desktop.png)                                | RU, 1440×1000     | Chromium; explicit read-only Demo UI, **not** SQL or live merchant evidence                                 |
| [dashboard mobile](screenshots/demo-dashboard-mobile.png)                                  | RU, 390×844       | Chromium; explicit read-only Demo UI, **not** SQL or live merchant evidence                                 |
| [customers desktop](screenshots/demo-customers-desktop.png)                                | RU, 1440×1000     | Chromium; explicit read-only Demo UI, **not** SQL or live merchant evidence                                 |
| [customers mobile](screenshots/demo-customers-mobile.png)                                  | RU, 390×844       | Chromium; explicit read-only Demo UI, **not** SQL or live merchant evidence                                 |
| [sale desktop](screenshots/demo-sale-desktop.png)                                          | RU, 1440×1000     | Chromium; explicit read-only Demo UI, **not** SQL or live merchant evidence                                 |
| [sale mobile](screenshots/demo-sale-mobile.png)                                            | RU, 390×844       | Chromium; explicit read-only Demo UI, **not** SQL or live merchant evidence                                 |
| [debts desktop](screenshots/demo-debts-desktop.png)                                        | RU, 1440×1000     | Chromium; explicit read-only Demo UI, **not** SQL or live merchant evidence                                 |
| [debts mobile](screenshots/demo-debts-mobile.png)                                          | RU, 390×844       | Chromium; explicit read-only Demo UI, **not** SQL or live merchant evidence                                 |
| [history desktop](screenshots/demo-history-desktop.png)                                    | RU, 1440×1000     | Chromium; explicit read-only Demo UI, **not** SQL or live merchant evidence                                 |
| [history mobile](screenshots/demo-history-mobile.png)                                      | RU, 390×844       | Chromium; explicit read-only Demo UI, **not** SQL or live merchant evidence                                 |

The full flow and screenshot generation are in `e2e/diploma.acceptance.ts`, `research-postgres.acceptance.ts` and `screenshots.spec.ts`. See [reproduction instructions](demo-scenarios.md). Exact screenshots show synthetic seed names only; no real clients, credentials or tokens are present.
