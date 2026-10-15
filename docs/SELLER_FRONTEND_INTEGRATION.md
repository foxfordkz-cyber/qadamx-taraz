# Общий frontend: подключение модулей

Один проект `apps/web`: React 19 / TypeScript / Vite, Node.js 22.12+ либо 24, npm и существующий lock-файл. React Three Fiber 9 совместим с выбранным React; зависимости сцены/exports передаёт public-web. Рабочая ветка `feature/seller-dashboard`, Draft PR #3. Main и ветки других участников не изменять.

Принят только одобренный backend `193f6e5` (этап A, commit `246851b`). Текущий `packages/contracts/openapi.json` — источник wire schemas. `npm run generate:api` обновляет `shared/api/generated.ts`, `npm run check:api` обнаруживает дрейф. Backend/контрактные экспорты капитана здесь не редактировались.

## Общие exports и runtime

Пример импортов из `src/features/<module>/Page.tsx`:

```tsx
import { Button, Input, Card, Select, Dialog, Alert, Spinner,
  EmptyState, Badge, PageHeader, ErrorState } from '../../shared/ui';
import { useBusiness, useRuntime, useDraft } from '../../app/runtime';
import { useI18n } from '../../shared/i18n';
import { formatKZT } from '../../shared/format';
import { CustomerPicker, CreateCustomerForm, useCustomers,
  useCreateCustomer } from '../seller';
```

Exports не удалялись. `useBusiness()` внутри `/seller/*` даёт `{business, businesses, selectBusiness}`. UUID/slug брать из разрешённых memberships `/me`, не из произвольного URL. Backend остаётся источником прав. Runtime дополнительно сверяет `/me.id` с Supabase user, а ответы customers — с выбранным business.id. Отсутствующий в membership is_demo не выводится из slug/name/UUID.

`useRuntime()` возвращает `{api, gateway, scope, drafts}`. Использовать общий QueryClient/transport; второй HTTP client и auth provider не создавать. `api.request('/...')` возвращает unknown, поэтому новый endpoint требует подтверждённой схемы и runtime reader. `baseUrl` — VITE_API_BASE_URL, включая `/api/v1`. Актуальный Bearer token получает transport; в queryFn передавать AbortSignal. При 401/отсутствии token выполняется reauth; при logout/смене identity queries и drafts очищаются.

Ключ приватного query: `[scope, business.id, '<module>', ...filters]`. Мутация инвалидирует ключи того же scope/business. Успех показывается только после ответа сервера; мутации автоматически не повторяются. Денежные операции требуют серверной идемпотентности и принадлежат ledger-web.

## Подключённые методы

| Gateway | HTTP в принятом snapshot | Поведение |
|---|---|---|
| me | GET `/me` | MeResponse, UUID/owner memberships, identity guard |
| customers | GET `/businesses/{id}/customers?q=...&limit=50&cursor=...` | Page_CustomerResponse_, nullable UUID cursor |
| createCustomer | POST `/businesses/{id}/customers` | CustomerCreate → CustomerResponse |

Все пути относительно API base `/api/v1`. `shared/api/bindings.ts` содержит реальные readers и customerBody из generated schemas. Проверяются строковые лимиты, UUID, owner role/default, nullable/default fields, cursor, уникальность UUID в странице, safe nonnegative integer balance_minor. Одинаковые имена разрешены.

`gateway.canCreateCustomer` и `gateway.canUpdateInquiry` задают независимые возможности. Старый `canWrite` сохранён и консервативен: сейчас false из-за отсутствующего API заявок. Для формы клиента использовать `gateway.canCreateCustomer ?? gateway.canWrite`, не только старый флаг. `mode === 'demo'` всегда запрещает записи.

Bindings inquiries/catalog отсутствуют. Обращение к соответствующему gateway завершается CONTRACT_PENDING до HTTP, изменение статуса в live недоступно. Пути из продуктового ТЗ не являются доказательством готового endpoint. Не включать их или новые backend commits автоматически.

`ApiError` и `shared/api/errors.ts` runtime-проверяют стандартный ErrorResponse; наружу передаются безопасные requestId/field codes. Сырые server messages не выводятся. RU/KZ состояния 401/403/404/409/422/429/500 доступны через ErrorMessage/ErrorState.

## Клиенты и CustomerPicker

`useCustomers(search)` — infinite query: `data.pages[].items`, `hasNextPage`, `fetchNextPage`. Поиск trim/NFC, debounce 250 ms, `isSearchPending`; прежние результаты во время паузы скрываются. `q`, `cursor`, `limit` соответствуют принятому OpenAPI. Не отбрасывать одноимённых клиентов; identity — UUID.

`useCreateCustomer()` — mutation; `mutateAsync(input)` возвращает сохранённого клиента. View input `{display_name, note, contact}` преобразуется в generated CustomerCreate: trim строк, пустой contact → null, имя 1–200, note до 2000, contact до 200. После ответа инвалидируется customers query текущей точки. balance_minor берётся только из CustomerResponse и форматируется без пересчёта долга.

`<CustomerPicker value={customerOrNull} onChange={setCustomer} />` объединяет поиск/выбор/создание. Успешный POST передаёт созданного клиента в onChange. Не заменять customer_id именем при продаже. Денежный сценарий участника 4 ещё ожидает его модуль и совместную live-проверку. Optional `Customer.balance_minor` в frontend view оставлен для старых fixtures/потребителей; live reader требует поле. `Business.is_demo` тоже optional, в live не выдумывается.

## Router и стили

`src/app/modules.ts` хранит `FrontendModules`; авторы передают фактические exports для seller.sale/debts/history/summary и public.home/venue/shop. Публичные `/`, `/venues/:slug`, `/shops/:slug` вне auth guard; seller routes внутри BusinessProvider. Сейчас отсутствующие страницы показывают ожидание без операций. Query `customer_id` на `/seller/debts` нужно сверять с API/точкой в модуле ledger-web.

Seller-owned routes: `/login`, `/seller`, `/seller/customers`, `/seller/inquiries`, `/seller/catalog`. Последние два используют данные только в Demo до backend HTTP API.

`shared/merchant.css` подключён после исходных токенов: адаптация общего UI-kit без новых Shopify зависимостей и удаления exports. Цвета Qadam сохранены. Повторно проверять новых потребителей на 360/390/768/1440; применять Card/Button/Input/Dialog из общего UI, не второй дизайн-каркас. [Дизайн и screenshots](SELLER_DESIGN_NOTES.md).

## RU/KZ, деньги и drafts

`useI18n()` → `{locale, setLocale, t}`, locale `ru|kk`, UI подпись KZ. Ключи словарей совпадают. Не ставить key={locale} на форму. `formatKZT(300000, locale)` → `3 000 ₸`, вход целые тиыны; 12345 → `123,45 ₸`. Денежный parser/расчёты — ledger-web/backend.

`useDraft(key, initial)` хранит несекретные поля в памяти identity; в key включить business.id/имя формы. Logout/смена пользователя очищают drafts. Пароли сюда не помещать. Это не storage между reload.

## Конфигурация и проверенная готовность

`apps/web/.env.example` содержит VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY. Реальные публичные значения только в игнорируемом `.env.local`. Service role, JWT secret, DB/AI keys запрещены. AuthProvider отвергает secret/service-role config, но VITE-переменные всегда публичны.

Supabase provider поддерживает signInWithPassword/session restore/refresh/logout; это проверено test client. Серверного env/БД и тестовых паролей здесь нет; health дал ECONNREFUSED. Реальные Supabase/DB/CORS запросы не объявлены проверенными. Frontend origins капитана — localhost:5173 и 127.0.0.1:5173; production origin согласовать отдельно, backend config не менять самостоятельно.

Demo включается только кнопкой `/login`, fixtures read-only, banner на seller-экранах. Backend error не переводит в demo; reload завершает Demo. Для SPA hosting нужен index.html fallback; деплоя нет. Полные команды, результаты 71 unit/component и 8 E2E, следующий шаг — [handoff](SELLER_FRONTEND_HANDOFF.md).
