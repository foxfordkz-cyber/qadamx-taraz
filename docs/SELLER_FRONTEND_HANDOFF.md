# Передача разработки seller frontend

Обновлено: 2026-10-15. Ветка **feature/seller-dashboard**, репозиторий https://github.com/foxfordkz-cyber/qadamx-taraz.

## Контрольная точка 1 — общий слой и компоненты экранов

Основание: `ee1847a` (main после PR с документацией). Точный hash текущей контрольной точки: `git log -1 --format=%H`; hash предыдущей проверенной точки: `ee1847a`. Собственный hash коммита невозможно записать внутрь него самого. Следующая запись будет ссылаться на завершённый предыдущий этап.

### Реализовано

- Единственное приложение `apps/web`, React 19 / TypeScript / Vite, lock-файл.
- Общие UI-компоненты, отдельные словари RU/KK, форматтер KZT **из целых тиынов**.
- Supabase AuthProvider: восстановление через INITIAL_SESSION, подписка, вход/выход, смена пользователя с отменой запросов и очисткой QueryClient.
- API transport с Bearer token, отменой, обработкой HTTP/сети и запретом внешних URL/redirect с токеном.
- Компоненты заявок, каталога, клиентов, CustomerPicker и CreateCustomerForm, хуки чтения/создания клиентов.
- Отдельный read-only demo gateway с явно учебными данными; записи всегда отклоняются. Он не подменяет неудачный live-запрос.

### Файлы и архитектура

`apps/web/src/app`: auth, query, runtime (gateway, разрешённые точки, черновики в памяти). `shared/api`: transport, frontend views, gateway, bindings. `shared/demo`: учебные записи. `shared/ui`, `shared/i18n`, `shared/format.ts`: общий слой. `features/seller`: заявки, клиенты, каталог и общие hooks. Конфигурация web и зависимости в `apps/web`. `.gitignore` дополнен исключениями результатов тестов, существующие исключения сохранены.

### Маршруты и остаток работы

На этом этапе router, layout и entrypoint ещё не подключены; нет работающего browser entrypoint. Следующий этап: `/login`, `/seller`, `/seller/inquiries`, `/seller/customers`, `/seller/catalog`; честные интеграционные страницы `/`, `/venues/:slug`, `/shops/:slug`, `/seller/sale`, `/seller/debts`, `/seller/history`, `/seller/summary`. Затем CSS, тесты, browser-проверка и PR.

### Backend / Supabase

URL, OpenAPI, credentials и реальный backend отсутствуют; пользователь подтвердил продолжение без ожидания. Из `docs/team5/02_ARCHITECTURE_API.md` взяты пути и модельные поля. Это **проект** контракта, не проверенная реализация.

- Полный префикс API задаётся в `VITE_API_BASE_URL` (включая `/api/v1`).
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`: только публичный ключ; service_role/secret запрещены.
- Нет точного ответа `/me`, POST customers и структуры каталога внутри публичной карточки; `shared/api/bindings.ts` оставлен пустым. После OpenAPI добавить runtime-валидируемые mappings реальных ответов в frontend views. Не включать произвольные поля/догадки.
- Статусы `new|in_progress|closed`; PATCH `{status}` подтверждён документом. Запись не оптимистическая.
- Каталог: только документированный `GET /businesses/{slug}`; не добавлять выдуманный GET /catalog. CRUD нет.
- Frontend membership filter не заменяет серверную проверку чужих UUID.
- Публичные страницы участника 2 и финансовые страницы участника 4 пока отсутствуют. Их файлы и backend не менялись.

### Проверки / проблемы

- `npm install --no-audit --no-fund`: зависимости установлены, lock создан.
- `npm run typecheck`: успешно (tsc -b).
- Build, lint, unit и E2E ещё не выполнялись. Живая авторизация/БД/сохранение не проверены.
- Не выдавать этот этап за готовое приложение. Следующая работа описана выше.

### Точные команды (из корня репозитория)

```powershell
git switch feature/seller-dashboard
git pull --ff-only origin feature/seller-dashboard
cd apps/web
npm ci
Copy-Item .env.example .env.local # только при наличии публичной конфигурации; не коммитить
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e # после добавления browser-тестов; Chromium устанавливается отдельно
```

Перед продолжением прочитать `AGENTS.md`, `docs/DECISIONS.md`, `docs/PROJECT_STATUS.md`, свою роль и handoffs. Работать исключительно в указанной ветке, проверять незакоммиченные изменения. Не делать force push/merge в main. После каждого проверенного этапа обновлять этот документ и `docs/handoffs/seller-web.md`, commit и push. Секреты не сохранять.
