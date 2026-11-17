# Capture and demonstration guide

Screenshots are **own browser-automation captures of explicit synthetic Demo**,
24 October 2026, local Vite + desktop Chrome. They are not real customer data,
user interviews, device acceptance or deployed Pages evidence.

- [RU desktop, 1440px](screenshots/research-ru-1440.png)
- [KZ desktop, 1440px](screenshots/research-kk-1440.png)
- [RU mobile viewport, 360px](screenshots/research-ru-360.png)
- [KZ mobile viewport, 360px](screenshots/research-kk-360.png)

The mobile captures emulate viewport size; no physical phone is claimed. Full-page
screenshots can show a fixed bottom navigation at its original viewport position.
At 360/390/768/1440px, automated checks require document width <= viewport width.
Graphs have a text legend and an expandable exact-value table.

## Demo without credentials, data or paid AI

From apps/web: `npm ci`, `npm run dev -- --port 5173 --strictPort`.
Open http://127.0.0.1:5173/login → **Посмотреть демо** → **Ещё** →
**Прогноз и обратная связь**. Use client navigation: Demo is intentionally in-memory.
Check the synthetic banner, 7/30 horizon, history/forecast table, baseline comparison,
rules disclaimer and disabled feedback submission. Switch RU/KZ.

To reproduce the screenshots and six acceptance cases:
`npx playwright test -c e2e/research.playwright.config.ts` from apps/web.
Chrome must be installed. The suite uses a separate localhost:4296 server and
intercepts all API/Auth traffic; no real credentials, provider calls or money writes.

## Live/local integration prerequisites

Only after captain approval: own PostgreSQL/JWT/CORS configuration, migration 0009,
owner login and current frontend/API from this branch. The route is
/seller/research. Empty history must display insufficient_data (98 days for 7-day,
144 for 30-day), not a synthetic forecast. Select another point/user and confirm
the previous result and form disappear. Request errors must offer retry without
switching to Demo.

Before collecting real feedback, assign the researcher/contact, consent channel,
restricted storage and manual retention/withdrawal process. Use the explicit
consent checkbox, submit once, retain receipt, and load own responses for review.
No live feedback was submitted during implementation.

Capture only a consented teaching point or anonymized research dataset. Include
code SHA, environment, provenance and date in accompanying notes. Never photograph
tokens, contacts, other businesses or unapproved debts. Do not label a desktop
viewport test as physical Android/iPhone acceptance.
