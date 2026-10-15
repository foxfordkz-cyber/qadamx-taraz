# SELLER FRONTEND — передача следующему Codex

Обновлено: 2026-10-15. Repository: https://github.com/foxfordkz-cyber/qadamx-taraz.
Рабочая ветка: **feature/seller-dashboard**. Merge в main и force push запрещены.

## Состояние и контрольные точки

- База: `ee1847a` — main с документацией, приложения/backend ещё не было.
- Этап 1: `ee6d86f` — общий слой, компоненты, typecheck; push успешен.
- Этап 2: `ec8763e` — router, layout, demo, build/lint; push успешен.
- Этап 3: завершены проверки и документация; актуальный hash после сохранения этой записи получите `git log -1 --format=%H`. Предыдущий опубликованный hash: `ec8763e`. Hash коммита не может содержаться внутри самого себя; финальная запись после этапа фиксирует hash реализации отдельно.
- Статус: независимая frontend-часть готова к проверке; live-интеграция ожидает капитана. Слияния и публичного деплоя нет.

## A. Что реализовано

Единое React 19 / TypeScript / Vite-приложение, React Router, TanStack Query. Адаптивный кабинет, шапка с точкой, RU/KZ, выход, боковая/нижняя навигация. Дизайн-токены по ТЗ; все основные действия от 44 px, focus-visible, reduced-motion, диалог с Escape/focus restore.

UI-kit: Button, Input, Select, Card, Dialog, Alert, Spinner, EmptyState, Badge, PageHeader, ErrorState. Форматтер KZT принимает целые тиыны, не теряет копейки/тиыны; даты в Asia/Almaty по контракту.

Заявки: новизна, имя, контакт, текст, дата, статусы new/in_progress/closed. Сохранение ожидает API, не оптимистическое; после успеха инвалидация. Обновление при возврате на вкладку, polling не нужен. Клиенты: поиск, заметки, необязательный контакт, одинаковые имена с отдельными UUID, форма создания, ссылки к долгам. Общие CustomerPicker, CreateCustomerForm, useCustomers, useCreateCustomer для участника 4. Каталог: цена/нет цены, наличие, Demo label, loading/error/empty.

Supabase provider подготовлен: signInWithPassword, INITIAL_SESSION, TOKEN_REFRESHED, подписка и unsubscribe, выход local scope. Смена пользователя/выход отменяют queries и очищают query/mutation cache; keys включают scope и UUID точки. Старые token/401 callbacks не затрагивают новую identity. Черновики клиентов в памяти сохраняются при смене языка и временной ошибке, очищаются при смене identity/выходе. Список точек берётся только из /me, произвольный ID URL не выбирает новую точку. Серверная membership-проверка всё равно обязательна.

## B. Архитектура и изменённые файлы

```text
apps/web/
  package.json, package-lock.json, .env.example
  index.html, tsconfig.json, vite.config.ts, eslint.config.js
  playwright.config.ts, e2e/seller.spec.ts
  src/main.tsx
  src/app/           App, auth, runtime, query, layout, pages, modules
  src/shared/api/    client, models (frontend views), gateway, bindings
  src/shared/demo/   read-only gateway и учебные fixtures
  src/shared/i18n/   provider и отдельные ru/kk словари
  src/shared/ui/     все общие компоненты и SVG icons
  src/shared/        styles.css, format.ts
  src/features/seller/  Inquiries, Customers, Catalog, queries, exports
  src/test/          transport/cache, auth, экраны, setup
```

За пределами apps/web: `.gitignore` дополнен test artifacts без удаления старых правил; README — команды; `docs/DECISIONS.md` — принятые решения; этот handoff, `docs/handoffs/seller-web.md`, `docs/SELLER_FRONTEND_INTEGRATION.md`, снимки `docs/screenshots/seller-{desktop,mobile}.png`. Чужие модули/backend/другие handoffs не менялись. Собственные исходники отформатированы Prettier, чужого форматирования не было.

## C. Маршруты

- `/login` — настоящий auth flow подготовлен, без конфигурации вход отключён; явная кнопка demo.
- `/seller` — кабинет; `/seller/inquiries`, `/seller/customers`, `/seller/catalog` — экраны собственной роли.
- `/seller/sale`, `/seller/debts`, `/seller/history`, `/seller/summary` — честные страницы ожидания участника 4.
- `/`, `/venues/:slug`, `/shops/:slug` — честное ожидание участника 2.
- Остальные пути — 404. Подключение экспортов: `src/app/modules.ts`; публичные страницы вне auth guard, seller внутри layout/BusinessProvider. Пример и общий API — в integration guide.

## D. API: подготовлено, но НЕ проверено на сервере

Источник путей/модельных полей — `docs/team5/02_ARCHITECTURE_API.md`. Это проект API, не существующая проверенная реализация. Live gateway готовит:

- GET `/me`;
- GET `/businesses/{id}/inquiries`;
- PATCH `/businesses/{id}/inquiries/{inquiry_id}` с `{status}`;
- GET `/businesses/{id}/customers?q=...`;
- POST `/businesses/{id}/customers` через ожидающий подтверждения body binding;
- GET `/businesses/{slug}` для каталога (не выдумывать GET /catalog).

`VITE_API_BASE_URL` содержит полный префикс `/api/v1`. Transport передаёт свежий Bearer, AbortSignal, различает 401/403/404/500/сеть, запрещает внешние URL и HTTP redirects с токеном. Не показывает traceback/raw server messages.

`src/shared/api/bindings.ts` намеренно пуст. Нет точного примера `/me`, тела/ответа создания клиента, формы каталога в карточке точки и OpenAPI. `models.ts` — frontend views по документированным полям, НЕ новый wire-контракт. Captain предоставляет OpenAPI и реальные ответы; после этого добавить типы/валидируемые mappings и тесты. Cursor pagination нужно сверить с OpenAPI. До bindings live-записи заблокированы, ошибки не заменяются fixtures. Ни один живой endpoint не отмечен как проверенный.

## Demo Mode

Только кнопкой на /login; не включается при API-ошибке. На каждом seller-экране явный banner. Две учебные точки (одна пустая), заявки, товары, одноимённые клиенты. Только чтение: создание клиентов и изменение статусов запрещены. Можно заполнить форму, поменять язык, выбрать учебного клиента; нет сообщений о фиктивном серверном сохранении. Полная перезагрузка завершает demo; язык сохраняется. Учебные данные не являются партнёрством с рынками.

## E. Фактически выполненные проверки

- `npm install --no-audit --no-fund` — успешно, lock сохранён.
- `npm run build` — успешно, включает tsc -b; JS ~338 kB / gzip ~106 kB, CSS ~15 kB / gzip ~4 kB.
- `npm run lint` — успешно, 0 ошибок/предупреждений.
- `npm test` — **36/36**, 3 файла. Auth проверяется тестовым Supabase client; writes/ошибки — явно внедрёнными test gateways.
- `npx playwright install chromium`; `npm run test:e2e` — **5/5** Chromium: защита маршрутов, demo read-only/без backend traffic, logout, выбор точки/пустой каталог, одноимённые клиенты, язык/поля, Escape/focus, отсутствие горизонтального скролла всех seller-маршрутов при 360/768/1440 px. В браузерном сценарии нет JS pageerror. Desktop/mobile screenshots просмотрены.
- `git diff --check` — успешно. Из env отслеживается только .env.example. Поиск шаблонов private key, sb_secret с реальным значением, DB URL с паролем в dist — совпадений нет. Реальные ключи не предоставлялись.
- При первом прогоне исправлены доступные подписи Input/Select/textarea и второй h1 dashboard. Тесты исправлены для ожидания завершения перехода и отличия Vite module requests от API fetch.
- Сначала sandbox не позволял Playwright обращаться к localhost; успешный прогон выполнен с разрешением локальной сети. Это ограничение среды Codex, а не поломка приложения.

Не проверено: настоящий Supabase login/refresh/logout, server-side UUID authorization, заявка из реальной витрины, сохранение после reload в БД, денежная форма участника 4, реальный телефон/WebGL/финансовые операции. Их отсутствие не скрывается успешными demo-тестами.

## F. GitHub и продолжение с другого аккаунта

```powershell
git clone --branch feature/seller-dashboard https://github.com/foxfordkz-cyber/qadamx-taraz.git
cd qadamx-taraz
git status
git branch --show-current
git log -1 --format=%H
```

Если копия уже есть — сначала изучить status и сохранить неизвестные изменения осознанно; не reset/clean/stash чужих файлов автоматически. При чистом дереве `git switch feature/seller-dashboard`, `git pull --ff-only origin feature/seller-dashboard`. После каждого проверенного этапа обновить этот файл и seller-web handoff, добавить только свои пути, commit, `git push -u origin feature/seller-dashboard`. Не менять origin без проверки, не force push и не merge в main. GitHub connector с правом push и Git Credential Manager были доступны в исходном аккаунте; на новом аккаунте может потребоваться вход и доступ к repository.

## G. Точные команды

Из корня после clone:

```powershell
cd apps/web
npm ci
npm run dev
# открыть http://127.0.0.1:5173/login и кнопку demo
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
npm run format:check
```

Node 22.12+ либо 24, npm. `.env.local` НЕ нужен для demo. Для живой среды скопировать `.env.example` в `.env.local`, указать публичные значения и перезапустить Vite. Никаких service_role/secret/AI/DB ключей во frontend. VITE переменные попадают в bundle.

## H. Следующие задачи и зависимости

1. Капитан: URL API, `/openapi.json`, примеры `/me`, customers, inquiries, shop/catalog, подтверждённые query params, CORS, публичные Supabase URL/key, тестовые аккаунты с разными memberships.
2. Заполнить `BackendBindings` по реальным схемам, добавить runtime validation. Сейчас canWrite требует bindings клиента и заявок; при частичной поставке можно разделить capabilities, не включать неподтверждённые записи.
3. Участник 2: реальные exports публичных страниц, зависимости R3F/сцена; подключить в modules.ts без копирования логики.
4. Участник 4: exports sale/debts/history/summary, CustomerPicker и businessId/useRuntime().api; денежные операции и idempotency принадлежат этому модулю/backend.
5. Проверить перечисленные live-сценарии, особенно 401 reauth, чужие IDs, сохранение в БД после reload, смену продавца и real-device.
6. Публикация только отдельным согласованным шагом; нужен SPA fallback на index.html, точный API CORS origin и HTTPS.

## I. Ограничения и ошибки

Независимая frontend-часть завершена. Полная продуктовая интеграция не завершена по внешним зависимостям, список выше. Текущие unit/component/browser проверки проходят; известных оставшихся ошибок сборки/TypeScript/lint нет. Нет фиктивных финансовых компонентов и успешных demo-writes. Проверки не доказывают серверную безопасность. Установщик npm сообщил deprecated dependency whatwg-encoding и ветку ESLint 9 вне поддержки; это dev tooling, lint работает, переход major ESLint требует отдельной проверки совместимости.

## J. Демо / публикация

Публичного URL нет. Локальный demo — /login → «Посмотреть демо». Скриншоты приложены в docs/screenshots. Не выдавать их за опубликованный работающий backend.
