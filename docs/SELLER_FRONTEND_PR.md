# feat: seller dashboard, authentication and shared frontend

Добавлено единое приложение `apps/web`: кабинет продавца, маршруты, дизайн-система, RU/KZ, Supabase AuthProvider и API transport. Без конфигурации доступен только явно выбранный read-only Demo Mode. Учебные заявки, отдельные одноимённые клиенты и каталог не выдаются за backend; записи запрещены.

## Реализовано

- `/login`, `/seller`, `/seller/inquiries`, `/seller/customers`, `/seller/catalog`, адаптивный layout и выбор разрешённой точки.
- Supabase session subscription/restore, signIn/signOut, отмена и очистка Query cache при смене identity; старые token/401 callbacks не затрагивают нового пользователя.
- Заявки со статусами `new/in_progress/closed`, ожидание подтверждения API без оптимистического успеха. Поиск клиентов, необязательный контакт, форма создания и CustomerPicker/useCustomers/useCreateCustomer для участника 4. Каталог с ценой из integer tiyn, наличием и Demo label.
- Общие Button, Input, Select, Card, Dialog, Alert, Spinner, EmptyState, Badge, PageHeader, ErrorState; KZT formatter, отдельные словари RU/KK.
- `src/app/modules.ts` для публичных страниц участника 2 и sale/debts/history/summary участника 4; пока показываются честные страницы ожидания.
- README, `.env.example`, полный handoff и integration guide для продолжения с другого аккаунта. Backend и чужие frontend-модули не менялись.

## Проверки

Из `apps/web`: `npm run build` (включая `tsc -b`), `npm run lint`, `npm test` — 36/36; `npm run test:e2e` — 5/5 Chromium. Все seller-маршруты проверены на 360/768/1440 px без горизонтального overflow; диалог Escape/focus restore, сохранение полей при смене языка, одноимённые клиенты, demo без API traffic и JS pageerror.

401/403/404/500 и write-confirmation проверены явно внедрёнными test gateways; auth — тестовым Supabase client. Эти проверки не считаются реальными Supabase/DB/permissions тестами. Проверка форматирования и `git diff --check` пройдены; реальные ключи не предоставлялись, отслеживается только env example.

Снимки с учебными данными: [desktop](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/screenshots/seller-desktop.png), [mobile](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/screenshots/seller-mobile.png).

## Backend и границы готовности

Пути взяты из `docs/team5/02_ARCHITECTURE_API.md`: GET /me, GET/PATCH inquiries, GET/POST customers, каталог через GET /businesses/{slug}. Реальных backend URL, OpenAPI и публичной Supabase-конфигурации пока нет. Response/body bindings намеренно пусты до подтверждённых схем `/me`, customers и shop/catalog; frontend views не объявляются новым wire-контрактом. Live-записи до подключения заблокированы. Ни один живой API/Auth/DB сценарий не отмечен как проверенный.

Капитан предоставляет OpenAPI/URL/CORS, тестовые аккаунты и публичные Supabase URL/key; участники 2/4 передают exports. Денежные формы, расчёты и 3D не дублируются. Сохранение в БД после reload, серверная проверка чужих UUID и финансовые сценарии ожидают интеграции. Деплоя нет.

## Запуск и продолжение

`cd apps/web` → `npm ci` → `npm run dev` → `/login` → «Посмотреть демо». Подробнее: [handoff](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/SELLER_FRONTEND_HANDOFF.md), [integration](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/SELLER_FRONTEND_INTEGRATION.md).

Независимая frontend-часть готова к code review. PR draft, пока живая интеграция ожидает внешние зависимости. Merge не выполнять автоматически.
