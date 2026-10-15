# feat: seller dashboard, authentication and shared frontend

Кабинет продавца теперь использует одобренные `/me` и GET/POST customers из backend `193f6e5`, а интерфейс адаптирован под ежедневную работу продавца по принципам Polaris. Supabase остаётся единственной авторизацией; Shopify зависимости не добавлены. Отдельный Demo Mode явно помечен и запрещает записи.

## Backend/Supabase — этап A

По разрешению капитана принят **только 193f6e527d716549d759d805dc4b86db1d9e059e**, commit интеграции **246851b2d4df996f054c7b1a27b2ba2933d2b3ee**. Ранее согласованный main уже принят в feature-ветку. README/DECISIONS сохраняют обе части. `apps/api` и `packages/contracts` идентичны одобренному snapshot, backend не переписывался. Новые backend commits не включались автоматически.

- Типы генерируются из принятого OpenAPI; runtime readers валидируют UUID, owner memberships, nullable/default fields, лимиты строк, cursor и safe integer balance_minor.
- `/me` сверяется с текущим Supabase user; разрешённые точки берутся из ответа. GET/POST customers проверяют business_id. Query cache/drafts изолированы identity/точкой и очищаются при logout/смене пользователя.
- Поиск с debounce, пагинация по контракту, одноимённые клиенты с note/UUID, необязательный contact → null, создание/выбор через общий CustomerPicker. Список обновляется после ответа POST; баланс отображается с сервера без расчётов.
- Отдельные canCreateCustomer/canUpdateInquiry сохраняют совместимость старого canWrite. Неподтверждённые HTTP API заявок и каталога не активированы, live-запросов к ним нет.

## Merchant UI — этап B

- Dashboard с активной точкой, RU/KZ, одним основным CTA, четырьмя главными действиями и дополнительными разделами; без придуманных финансовых KPI.
- Клиенты: аккуратный desktop список и mobile карточки, быстрый поиск, форма, полезное пустое состояние, loading/error.
- Заявки: локальный поиск по загруженным имени/контакту/тексту вместе со статусным фильтром; без придуманных API query params. Live изменение статуса отключено.
- Каталог: цена/отсутствие цены, наличие и Demo label; условная иконка без вымышленных API-фото.
- Собственная React/CSS дизайн-система сохраняет палитру Qadam, общие exports, focus/Escape, крупные мобильные действия, RU/KZ и поля форм при смене языка. Денежные/public модули других участников не переписаны.

[Дизайн, контраст и 6 screenshots](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/SELLER_DESIGN_NOTES.md): dashboard desktop/mobile, customers desktop/mobile, inquiries desktop, catalog mobile. Все кадры показывают **Demo**, не живой backend.

## Проверки

Оба этапа отдельно прошли `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check:api`, `npm run test:e2e`; Prettier также passed.

| Этап | Unit/component | Chromium E2E |
|---|---|---|
| A: Backend/Supabase bindings | 70, 6 файлов | 6 |
| B: Merchant UI | 71, 6 файлов | 8 |

Browser matrix: **360/390/768/1440**, нет горизонтального overflow, RU/KZ, формы/фокус, Demo без writes/backend traffic. API/auth проверки используют contract fixtures, mock transport и внедрённый auth test client: session restore, ошибки, отсутствие token, identity/business guards, customer create/search/cache. Это не live-проверки Supabase/PostgreSQL.

## Что ожидает среды и других участников

Публичная Supabase-конфигурация капитана задана только в игнорируемом `.env.local`; файл/значения в PR не включены. **Серверный apps/api/.env, PostgreSQL credentials и пароли владельцев отсутствуют**. Проба API health дала ECONNREFUSED. Реальные login/refresh, JWT/JWKS, GET/POST с БД, persistence после reload, 6/3 memberships, межпользовательский 404 и CORS остаются непроверенными до подготовки среды. Миграции и данные общей БД не менялись.

HTTP заявок/каталога ещё нет. `app/modules.ts` ждёт public pages участника 2 и sale/debts/history/summary участника 4, сейчас честные страницы ожидания. Деплоя нет.

Запуск: `cd apps/web`, `npm ci`, `npm run dev`, затем `/login` → «Посмотреть демо». Для live нужны подготовленный backend и тестовые пароли безопасным каналом. [Handoff](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/SELLER_FRONTEND_HANDOFF.md) содержит архитектуру, файлы, точные команды и план live acceptance; [integration guide](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/feature/seller-dashboard/docs/SELLER_FRONTEND_INTEGRATION.md) — общие exports/контракты.

PR остаётся **Draft** для капитана. Merge в main и force push не выполнялись.
