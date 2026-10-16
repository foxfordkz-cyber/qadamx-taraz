# feat: seller dashboard, Supabase authentication and Qadam merchant design

Продавец получает единый кабинет с Supabase-входом, разрешёнными точками и реальными `/me`/GET/POST customers bindings. UI согласован с публичной витриной Qadam и принципами Polaris: зелёный Dashboard, читаемые списки, локальный поиск каталога, удобная мобильная навигация. Demo остаётся явно помеченным read-only режимом.

## Интерфейс и совместимость

- Тема взята из реальной `feature/public-storefront` **8818e8b73ecc2e2dd2f517f18796782b10d1872f**: Manrope, paper/green/lime, ступенчатый qadam. `shared/tokens.css` сохраняет aliases прежнего UI; чужой CSS/модули не импортированы и не объединялись. Собственные React-компоненты, без Shopify API/Auth/App Bridge и новых UI dependencies.
- Manrope и Noto Kazakh fallback размещены локально с OFL, исходными URL и hashes. Runtime Google Fonts requests не требуются; Ә Ғ Қ Ң Ө Ұ Ү Һ І поддержаны.
- Dashboard: основной CTA и четыре действия без выдуманных KPI. Клиенты: desktop list/mobile cards, note/UUID различают одинаковые имена; CustomerPicker/form exports, debounce и server balance_minor сохранены.
- Заявки: статусы, время, сообщение, локальные поиск/фильтры. Каталог: локальные search/availability/count/no-results/reset по загруженным items, без новых API params и fictitious save.
- Mobile: компактная шапка, сохранённый Demo notice, нижняя навигация и «Ещё» с диалогом всех прежних маршрутов. Escape/focus restore, skip link со sticky header, nav/RU/KZ минимум44×44. Язык не сбрасывает поля/фильтры.

## API и границы

Код backend принят ранее только на **193f6e527d716549d759d805dc4b86db1d9e059e**, без правок капитана. OpenAPI0.3.0 отдельно принят из **2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c**, generated.ts воспроизводим. /me/customers совместимы; multipart types добавлены контрактным этапом, AI gateway/hooks/UI не активированы. Ограничение генератора XOR text/audio записано в handoff.

В текущем redesign не менялись backend, contracts, shared API, Supabase AuthProvider/runtime/query и финансовая логика. /me проверяется против Supabase user, ответы customers — против выбранного business, query cache/drafts изолированы и очищаются при logout/смене identity. Общие public/ledger модули ожидают exports авторов; их страницы здесь не переписывались.

## Проверки

После финальных mobile уточнений прошли **typecheck, lint, build, check:api, format:check; 74 unit/component tests в6 файлах и9 Chromium E2E**. Browser matrix **360/390/768/1440**: все прежние маршруты, отсутствие horizontal overflow, RU/KZ, CustomerPicker, формы, Demo без backend traffic/writes, новые menu/catalog scenarios, локальные font faces для ӘҒҚҢҰ, Escape/focus/skip link и touch targets. API/auth проверки используют approved fixtures/mock transport/test auth client, не живую БД.

10 новых **реальных Chromium screenshots**, визуально проверенных, все в Demo:

| Экран | Desktop | Mobile |
|---|---|---|
| Dashboard | [1440](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/screenshots/dashboard-desktop.png) | [390](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/screenshots/dashboard-mobile.png) |
| Customers | [1440](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/screenshots/customers-desktop.png) | [390](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/screenshots/customers-mobile.png) |
| Inquiries | [1440](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/screenshots/inquiries-desktop.png) | [390](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/screenshots/inquiries-mobile.png) |
| Catalog | [1440](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/screenshots/catalog-desktop.png) | [390](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/screenshots/catalog-mobile.png) |

Дополнительно [Dashboard768](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/screenshots/dashboard-tablet.png), [Catalog KZ360](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/screenshots/catalog-mobile-kk.png). [Дизайн, источники и контраст](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/SELLER_DESIGN_NOTES.md).

## Проверенная готовность и передача

Серверный env/PostgreSQL credentials и тестовые пароли не предоставлены этой seller-копии; `.env.local` с публичной конфигурацией игнорируется Git. Живой browser login/refresh, DB persistence и CORS здесь не подтверждены. Captain live TypeScript-client /me/customer create/sale/repayment/history/summary и AI HTTP проверки отмечены как его результаты, не наши.

HTTP заявок/публичного каталога ещё нет; эти live bindings не включены. Demo не подменяет backend errors и не имитирует серверное сохранение. Публичного деплоя нет.

[Handoff](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/SELLER_FRONTEND_HANDOFF.md) содержит архитектуру, файлы, команды и следующий шаг; [integration guide](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/SELLER_FRONTEND_INTEGRATION.md) — общие exports. Запуск: `cd apps/web`, `npm ci`, `npm run dev`, `/login` → «Посмотреть демо».

PR остаётся **Draft**, ветка только **feature/seller-dashboard**. Merge в main, force push и переписывание чужих модулей не выполнялись.
