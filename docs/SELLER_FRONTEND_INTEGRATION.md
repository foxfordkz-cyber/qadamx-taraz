# Общий frontend: подключение модулей

Один проект `apps/web`. Node.js 22.12+ либо 24, npm, lock-файл обязателен. React 19 выбран совместимым с React Three Fiber 9 (R3F ещё не установлен: зависимости и экспорты сцены передаёт участник 2 владельцу web).

Актуализация Git sync: bootstrap из main ced32e7 уже принят. `backend/ledger-auth` 193f6e5 **не принят**, пользователь требует подтверждения капитана. [План подключения /me и customers](SELLER_BACKEND_INTEGRATION_PLAN.md) содержит точные отличия схем и необходимые изменения. Пока bindings не активированы.

Типы принятого OpenAPI: `shared/api/generated.ts`; `npm run generate:api` обновляет их из `packages/contracts/openapi.json`, `npm run check:api` проверяет соответствие. Генератор не добавляет отсутствующие endpoints. В bootstrap есть только health в paths и компоненты первого этапа. Стандартная ошибка проверяется на runtime в `shared/api/errors.ts`; `ApiError.metadata` хранит только валидный requestId и field codes, сырой message сервера не показывается. `ErrorMessage` локализует ошибку и показывает код для поддержки.

Поиск клиентов теперь ждёт 250 ms после ввода, использует trim/NFC и возвращает `isSearchPending`; не показывайте/не выбирайте прежние результаты во время этой паузы. Заявки имеют локальный фильтр по статусу только среди загруженных страниц, без нового query-параметра API.

## Общий слой

Примеры ниже используют относительные импорты из `src/features/<module>/Page.tsx`:

```tsx
import { Button, Input, Card, Select, Dialog, Alert, Spinner,
  EmptyState, Badge, PageHeader, ErrorState } from '../../shared/ui';
import { useBusiness, useRuntime } from '../../app/runtime';
import { useI18n } from '../../shared/i18n';
import { formatKZT } from '../../shared/format';
import { useQueryClient } from '@tanstack/react-query';
import { CustomerPicker, CreateCustomerForm, useCustomers,
  useCreateCustomer } from '../seller';
```

`useBusiness()` доступен внутри `/seller/*`: `{business, businesses, selectBusiness}`. `business.id` — UUID, `business.slug` — публичный slug. ID нельзя брать из произвольного URL. `businesses` формируется исключительно из серверного `/me`; backend всё равно проверяет membership каждого запроса.

`useRuntime()` возвращает `{api, gateway, scope, drafts}`. `gateway` содержит запросы seller-модуля. Для новых денежных endpoints используйте общий `api.request('/...')` по подтверждённому OpenAPI; не создавайте второй HTTP transport и второй QueryClient. `baseUrl` — `import.meta.env.VITE_API_BASE_URL`, включая `/api/v1`. Запросы получают Bearer token, `AbortSignal` передавайте из queryFn. Возврат transport — `unknown`: подтвердите схему и провалидируйте её до использования. В demo денежные записи должны оставаться отключёнными: `gateway.mode === 'demo'`; общий transport не выдаёт demo token.

QueryClient уже в provider. Ключ приватного query: `[scope, business.id, '<module>', ...filters]`. В queryFn передавать `signal` в fetch. После мутации инвалидировать ключи **этого же scope и business.id**. Не возвращать успешный результат до ответа API. Автоповтор денежных записей требует серверной идемпотентности; по умолчанию мутации не повторяются.

## Клиенты

`useCustomers(search)` — infinite query, `data.pages[].items`, `hasNextPage`, `fetchNextPage`. `useCreateCustomer()` — mutation, `mutateAsync(input)` возвращает клиента; вход здесь — frontend view `{display_name, note, contact}`. Это НЕ окончательная схема POST: `customerBody` ожидает OpenAPI. Телефон/контакт необязателен. Одинаковые имена не объединяются; identity — UUID, показывайте заметку и ID.

`<CustomerPicker value={customerOrNull} onChange={setCustomer} />` объединяет поиск, выбор и создание. При успешном серверном создании сразу вызывает onChange с созданным клиентом. В demo создание отключено. Не подменять UUID именем при записи продажи. Денежный сценарий с этим picker ещё не проверен: модуля участника 4 нет.

## Router

`src/app/modules.ts` хранит `FrontendModules`. После передачи экспортов добавьте импорты страниц и React elements:

```tsx
// Пример точки интеграции; пути фактических экспортов согласовать с авторами.
// seller: { sale: <SalePage />, debts: <DebtsPage />,
//           history: <HistoryPage />, summary: <SummaryPage /> }
// public: { home: <ExplorePage />, venue: <VenuePage />, shop: <ShopPage /> }
```

Публичные элементы находятся вне auth guard: `/`, `/venues/:slug`, `/shops/:slug`. `useParams()` отдаёт slug. Закрытые элементы внутри layout и BusinessProvider: `/seller/sale`, `/seller/debts`, `/seller/history`, `/seller/summary`. `customer_id` query-параметр из списка клиентов предназначен для выбора клиента на странице долгов; участник 4 обязан сверять его с точкой и ответом API. Пока экспорты отсутствуют, показывается страница ожидания; операций там нет.

## RU/KZ, суммы и формы

`useI18n()` даёт `{locale, setLocale, t}`. Locale API — `ru|kk`, кнопка показывает KZ. Словари `shared/i18n/ru.ts` и `kk.ts` имеют одинаковые ключи; базовые финансовые подписи `received`, `remaining`, `outstanding`, `inquiry`. Автор модуля передаёт словарь владельцу i18n. Не ставить `key={locale}` на форму и не сбрасывать её при смене языка.

`formatKZT(300000, locale)` → `3 000 ₸`; вход в **целых тиынах**. Для 12345 отображаются `123,45 ₸`. Парсер денежного ввода и расчёт балансов относятся к участнику 4/backend; frontend не вычисляет долг по заявкам.

`useDraft(key, initial)` из `app/runtime` хранит несекретные поля в памяти в рамках текущей identity. Включайте `business.id` и имя формы в key. Выход/смена пользователя очищают drafts; пароль сюда не помещать. Это не хранилище между обновлениями браузера.

## Конфигурация и честная готовность

`apps/web/.env.example`: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Значения только в игнорируемом `.env.local`; frontend env публичны. Service role, JWT secret, DB/AI keys запрещены. AuthProvider отвергает secret/service-role конфигурацию, но случайно добавленный секрет в VITE env уже считается раскрытым и требует ротации.

`shared/api/bindings.ts` **пустой намеренно**. В репозитории нет OpenAPI и точных реальных ответов `/me`, создания клиента и каталога. Captain должен предоставить схемы, примеры и тестовые аккаунты; затем mappings заполняются с runtime-проверкой и тестами. Текущие types — frontend views по документированным полям, не выдуманный wire contract. Пути методов в gateway взяты из `02_ARCHITECTURE_API.md`; `cursor` для следующих страниц нужно сверить с OpenAPI. Новые серверные поля не добавлять по догадке.

Demo включается только кнопкой на `/login`, gateway читает исключительно учебные fixtures и запрещает все writes; banner виден на каждом seller-экране. Backend-ошибка не переключает приложение в demo. Обновление страницы завершает demo. Для живого Supabase сессия сохраняется SDK, но реальная конфигурация ещё не тестировалась.

При публикации SPA настройте fallback всех frontend routes на `index.html` и CORS API на точный origin. Деплой по этому заданию не выполнен. Полный статус и шаги для следующего Codex: [handoff](SELLER_FRONTEND_HANDOFF.md).
