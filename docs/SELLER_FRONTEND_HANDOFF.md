# Seller frontend — актуальная передача

2026-10-15. Ветка feature/seller-dashboard; существующий Draft PR #3. Не merge в main, не force push. Последний опубликованный commit до этапа A: 27cfdae64f95987f4f3bd5466c5642d9ac42dbc7. Точный текущий HEAD: git log -1 --format=%H.

## Этап A: одобренный backend и frontend bindings

Новое задание явно подтверждает разрешение капитана на **193f6e527d716549d759d805dc4b86db1d9e059e**, PR #4. Прежний запрет интеграции из предыдущей сессии отменён этим заданием. Только этот snapshot принят в feature-ветку; более новые commits не включались. Конфликты README/DECISIONS разрешены с сохранением обеих сторон. apps/api и packages/contracts идентичны одобренному backend, исходники/миграции капитана не редактировались.

В `apps/web/src/shared/api/bindings.ts` подключены реальные MeResponse, CustomerCreate/Response, Page_CustomerResponse_ из generated.ts с runtime-валидацией UUID, owner role, строк/лимитов, nullable/default полей, cursor и безопасных целых остатков. Gateway проверяет /me identity против текущего Supabase user и принадлежность всех GET/POST клиентов точке. Пустой контакт → null; имена не дедуплицируются; balance_minor показывается с сервера без расчётов.

Раздельные canCreateCustomer/canUpdateInquiry добавлены без удаления старого canWrite. CustomerPicker и форма используют отдельную возможность записи. Inquiries/catalog bindings отсутствуют, их запросы не отправляются; Live показывает недоступность, Demo остаётся явно учебным read-only режимом. Membership не содержит is_demo — флаг из slug/name/UUID не выводится.

AuthProvider восстанавливает сессию SDK, передаёт свежий token, очищает queries/drafts при смене identity/выходе. При отсутствии token transport переводит в reauth. Публичные URL/key капитана сохранены только в игнорируемом apps/web/.env.local; файл не включать в Git. Серверного apps/api/.env нет; DB credentials не придумывались.

Фактическая проба http://127.0.0.1:8000/api/v1/health — ECONNREFUSED. Поэтому живые Supabase login, JWT/JWKS, GET/POST с БД и CORS не объявлены проверенными. Нет паролей тестовых аккаунтов. Не запускать миграции/seed/разрушающие тесты на общей demo-базе.

Проверки этапа A: typecheck, lint, unit **70 passed** (6 файлов), build, check:api, Chromium E2E **6 passed**; текущие 360/768/1440, язык/формы, cache/logout, API contract fixtures и auth test client. Обновлён пример ошибки на BALANCE_CHANGED из одобренного examples.json, старые проверки полей сохранены отдельным синтетическим тестом. Это contract/mock tests, не живой backend. Auth SDK вынесен в отдельный chunk после предупреждения размера сборки.

Изменены app/runtime, shared/api/{bindings,client,gateway,generated,models}, Customers/Inquiries, tests/bindings/errors, vite config, README/DECISIONS и handoff. После завершённого этапа — commit, fetch, pull --ff-only feature-ветки и push. Backend staged файлы — только результат согласованного merge, не авторские правки.

## Следующий этап B

Polaris-inspired merchant redesign существующих компонентов без Shopify API/Auth/App Bridge и без массовой миграции. Сохранить палитру, exports, Supabase и бизнес-логику. Улучшить dashboard, клиентский список/мобильные карточки, поиск заявок, каталог, loading/error/empty. Проверить 360/390/768/1440 и сохранить 6 требуемых screenshots в docs/screenshots. Повторить все проверки отдельно, затем отдельный commit и push. Официальный UX-референс: https://shopify.dev/docs/api/polaris.

## Запуск/проверки

Из apps/web: npm ci; npm run dev; /login (live при готовом API) или Посмотреть демо. npm run generate:api; npm run check:api; npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e. Для browser установить npx playwright install chromium. Существующие package-lock и exports сохранять.

Общие интерфейсы: app/runtime useBusiness/useRuntime().api, shared/ui, shared/i18n, shared/formatKZT, features/seller CustomerPicker/useCustomers/useCreateCustomer. Маршруты собственные /login, /seller, /seller/inquiries/customers/catalog; sale/debts/history/summary и публичные страницы ждут авторов в app/modules.ts. Денежные формы/3D не дублировать.

Для live-проверки получить от капитана серверное окружение PostgreSQL/API, accounts безопасным способом. Разрешённые frontend origins: localhost:5173 и 127.0.0.1:5173, production отдельно. Из этой копии серверная CORS-конфигурация не менялась. Следующему Codex прочитать AGENTS.md, API, этот handoff и integration guide; новый merge backend больше не нужен, одобренный snapshot уже принят.
