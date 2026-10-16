Готовый merchant redesign из **a77f1a02b240dbf9e8c627937a5cb6445d92fb51** перенесён в общую Team MVP сборку от **3d009dc86c93debcab05dedda530b7d1fe62a304** ограниченным diff. Seller и финансовые страницы теперь используют зелёную Qadam палитру, Manrope, общие карточки/формы и мобильное меню; публичная витрина согласована через CSS tokens.

## Изменения

- Qadam tokens/brand, локальные Manrope + Kazakh fallback с OFL, dashboard/cards/buttons/forms/keyboard focus.
- Customers/inquiries search presentation, read-only catalog local name/availability filters, RU/KZ.
- Mobile More dialog: Escape, route changes, Back/Forward и возврат фокуса; достаточные touch targets.
- Scoped ledger breakpoint1100: формы в одну колонку на tablet/mobile, KPI в две. Честное Demo empty state без вымышленных финансовых сумм.
- Public `.ex` token bridge без изменения public/3D исходников.
- Scoped web/.gitattributes исправляет Windows CRLF format:check для JS/MJS/HTML.

## Сохранено

Backend, OpenAPI **0.4.0**, generated.ts, auth/runtime/BusinessProvider/modules/router, API client/bindings/gateway/queries, CustomerPicker и RU/KZ архитектура, package/lock, 3D assets. Sale/Debts/History/Summary, voice/manual input, explicit confirmation, exact pending body/Idempotency-Key, server totals и identity/business isolation остаются кодом Team MVP. Финансовые/голосовые/public feature-модули не переписаны.

## Собственные проверки

Из apps/web: npm ci; check:api; typecheck; lint; **84 unit/component в 8 файлах**; build; **14 Chromium E2E**; format:check; git diff --check — passed. Все seller routes и public fixture routes проверены на360/390/768/1440; menu Escape/Back/Forward/focus, формы/RU-KZ, customer selection, no Demo writes/traffic, WebGL fallback. Старые результаты и live-проверки капитана не засчитаны.

## Screenshots

20 настоящих PNG запущенного UI: [все кадры](https://github.com/foxfordkz-cyber/qadamx-taraz/tree/feature/seller-design-integration/docs/screenshots/team-mvp-design). Dashboard/customers/sale/debts/history/summary/inquiries/catalog — desktop и mobile, явный read-only Demo. Public home/shop — подписи API stub, полностью перехваченные OpenAPI typed fixtures, без успешной серверной отправки.

![Dashboard desktop](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-design-integration/docs/screenshots/team-mvp-design/dashboard-desktop.png?raw=true)
![Sale mobile](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-design-integration/docs/screenshots/team-mvp-design/sale-mobile.png?raw=true)

## Ограничения и файлы

Собственный live acceptance **Blocked**: API127.0.0.1:8000 connection refused; в изолированной копии нет server env/public env/test passwords. Supabase login, /me/customer create/reload/JWT/CORS/real AI/money/GLB/hotspots в этой сессии не подтверждены. Физический Android/микрофон недоступен — только Chromium emulation. Общая Supabase не мигрировалась/не очищалась, секреты не добавлены.3 унаследованных dev audit findings Vitest/Tinypool; production-only audit0; lock сохранён. Build warning о3D chunk остаётся.

Production files: app/{layout,pages}, features/seller/{Customers,Inquiries,Catalog}, shared/{tokens,styles,merchant}, shared/ui/{Brand,Icon}, shared/i18n/{ru,kk}, main, fonts, index theme-color, web/.gitattributes. Проверки: screens.test, e2e helpers/seller/screenshots/integration-design/public-design, Playwright config. Документация: собственные seller handoffs/design notes/этот PR body, дополнение DECISIONS, новые PNG. Общие README/PROJECT_STATUS/TEAM_INTEGRATION и чужие handoffs сохранены.

Подробная передача: [SELLER_FRONTEND_HANDOFF](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-design-integration/docs/SELLER_FRONTEND_HANDOFF.md). Незавершённого frontend-кода нет; live/device acceptance остаётся отдельно. PR оставить **Draft**, base **integration/team-mvp**. Merge не выполнялся и не запрашивается автоматически; QA test/seller-regression не затронут.
