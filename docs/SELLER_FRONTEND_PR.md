# feat: seller dashboard, authentication and shared frontend

Единое React/TypeScript/Vite приложение `apps/web`: кабинет продавца, RU/KZ, общая дизайн-система, Supabase AuthProvider и API transport. При отсутствии конфигурации доступен только явно выбранный read-only Demo Mode. Записи в демо запрещены.

## Реализовано и улучшено

- `/login`, `/seller`, `/seller/inquiries`, `/seller/customers`, `/seller/catalog`; адаптивный layout, разрешённые точки, session/identity boundaries и очистка Query cache.
- Заявки по новизне, три статуса; локальный фильтр по статусу с указанием границ загруженных страниц и сбросом. Никаких выдуманных query-параметров API.
- Общий поиск клиентов с debounce 250 ms, trim/NFC, очисткой и скрытием устаревших результатов; отдельные одноимённые клиенты, необязательный контакт, форма и CustomerPicker/hooks для участника 4.
- Каталог с ценой в KZT из integer tiyn, наличием и Demo label. Серверные успехи без backend не имитируются.
- UI-kit, отдельные словари RU/KK, диалог Escape/focus restore, мобильная навигация и размеры действий от 44 px.
- Генерация `shared/api/generated.ts` только из принятого `packages/contracts/openapi.json`, команды `generate:api` и `check:api` против дрейфа контракта.
- Обработка опубликованного ErrorResponse с runtime-проверкой, безопасный request_id для поддержки, RU/KZ ошибки 401/403/404/409/422/429/500, без сырых server messages.

## Синхронизация команды

По прямому согласованию пользователя `main` **ced32e7** принят в feature-ветку merge-коммитом **3b03ed3**. Конфликты README и DECISIONS разрешены с сохранением frontend/backend разделов. Backend и packages/contracts идентичны принятому main — код капитана не редактировался.

Обнаружен отдельный кандидат `backend/ledger-auth` **193f6e5**, PR #4: /me, GET/POST customers, JWT/JWKS и журнал. **Эта ветка НЕ объединена:** пользователь требует предварительного подтверждения капитана, которого пока нет. Выполнен только анализ; [план интеграции](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/SELLER_BACKEND_INTEGRATION_PLAN.md) перечисляет schemas, отличия is_demo/balance_minor/contact, необходимые mappings, capabilities, CORS и проверки.

В принятом bootstrap фактически реализованы только GET /health и GET /api/v1/health. Наличие компонентов схем не означает готовность endpoints. Bindings /me/customers/inquiries/catalog остаются неактивными. Supabase URL/public key, доступный API и browser accounts в этой копии не предоставлены; живая авторизация/БД/frontend интеграция не проверены. Результаты backend handoff капитана не выдаются за наши проверки.

## Проверки

Из `apps/web` успешно выполнены typecheck, lint, build, check:api и format:check; **52 unit/component tests и 6 Chromium E2E passed**. Последний проверенный commit реализации `7e3d2abb08644ca9ee21f86a2dd8b02a51525bcc` отправлен после fetch/pull --ff-only; удалённый hash совпал. Подробности в [handoff](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/SELLER_FRONTEND_HANDOFF.md).

E2E проверяют ширины 360/768/1440 без горизонтального overflow, фильтр/поиск RU/KZ, язык без потери полей, фокус диалога, выбор точки, дубликаты имён, demo read-only/без backend traffic и logout. HTTP ошибки/мутации и session restoration тестируются явно внедрёнными fixtures/test clients, не реальным Supabase/PostgreSQL.

## Передача и ограничения

`app/modules.ts` ждёт public pages участника 2 и sale/debts/history/summary участника 4; вместо отсутствующих модулей честные страницы ожидания. Денежная логика и 3D не копировались. Обновлены README, integration guide, [handoff](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/SELLER_FRONTEND_HANDOFF.md) и seller-web handoff, добавлен план backend интеграции для следующего аккаунта Codex.

Запуск: `cd apps/web` → `npm ci` → `npm run dev` → `/login` → «Посмотреть демо». Публичного деплоя нет. PR остаётся Draft; в Ready не переводить и merge в main не выполнять автоматически.
