# Единый Qadam Business: интеграционная ветка

**Текущее состояние 2026-10-16:** общая ветка `integration/local-combined-check`, Draft PR #13 → backend/livestock. API 0.6.0, аналитика точки без миграции; qadam-demo уже 0004_livestock + private Storage. [Точное подключение и серверный запуск](FLUTTER_CONNECTION.md). Ниже сохранены commits и результаты предыдущих этапов; их ограничения среды не являются текущими.

Публикация текущего этапа: **[Draft #9](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/9)** integration/team-mobile → integration/team-mvp, commit `f240b278f292e40f8033db6526fd0161e035cd96`; **[Draft #10](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/10)** backend/livestock → integration/team-mobile, проверенный код `c447a594a6a7d9aad1ee7fca751053bf6a176a61`. Сначала #8 → main, затем обновить base #9 на main после проверки diff, затем аналогично #10. Использовать merge с сохранением истории либо отдельно разобрать stacked diff при squash; никаких автоматических retarget/merge здесь нет.

Обновление 2026-10-16: **`integration/team-mobile:f240b27`** — отдельная интеграция от PR #8 (`3d009dc`), новые ассеты `11c4e45` и адаптированный UI `8818e8b`. **`backend/livestock`** основан на этой обновлённой ветке, добавляет API 0.5.0 и миграцию 0004 только для локальных проверок. [Контракт Flutter и подключение телефона](../packages/contracts/LIVESTOCK_API.md). Нижний зафиксированный commit `dab0fe7` относится к предыдущему этапу; текущие результаты находятся в последней секции backend handoff. Порядок review/merge: PR #8 → обновление интеграции → livestock; автоматически ничего не сливается.

Публикация: **[Draft PR #8 в main](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/8)**. Без автоматического слияния и деплоя.

Проверенный commit кода backend/frontend/контракта: **`dab0fe7f91b1dbf8c8d7522694759ae9b9cebfc6`**. [OpenAPI на этом commit](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/dab0fe7f91b1dbf8c8d7522694759ae9b9cebfc6/packages/contracts/openapi.json), [примеры](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/dab0fe7f91b1dbf8c8d7522694759ae9b9cebfc6/packages/contracts/examples.json). Последующие commits передачи меняют только документацию.

Ветка `integration/team-mvp`, основа `main:8c932dd` с уже слитым PR #7. Рабочая копия капитана — `tmp/integration-team`; ветки друзей не изменялись. Единственные приложения: `apps/api` и `apps/web`. История merge PR #7 сохранена, полезные сценарии перенесены, его второй backend и корневой frontend удалены только здесь.

## Источники

| Часть | Принятый commit | Способ |
|---|---|---|
| Основной API/AI | `2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c` | Через историю readiness |
| Документация backend | `95f6087bc85c1a0763101088e6660c70cc4afa75` | Merge в интеграционную ветку |
| Seller Frontend #3 | `b3d03285b5661b9652e3c5b57e5ab1ce11eae5ab` | Merge; router/auth/runtime/UI сохранены |
| Ledger/voice/summary PR #7 | `d7acc9c7e7c265c637bedc220ab65423039695f4` | Адаптация ввода, review/save, recorder, debt/history/reversal/stats и decimal parser в features |
| Public storefront | `a1ba5ae` | Только исходники explore/inquiry; без unrelated merge, зависимостей и сборки чужого каркаса |
| Ассеты PR #6 | `f53d4690c15ada5d1872a912a9d35f730f616ae1` | Merge, manifest и оригинальные GLB/WebP |

Проверки выполняются для итогового commit интеграции из backend handoff, а не автоматически распространяются на последующие изменения веток команды.

## Запуск у frontend-разработчика

Node.js 22.12+ или 24, Python 3.12 и uv. Получите интеграционную ветку в собственной копии:

```powershell
git fetch origin
git worktree add ../qadam-team-check origin/integration/team-mvp
cd ../qadam-team-check/apps/api
uv sync --locked
# Настроить собственный игнорируемый .env по .env.example.
uv run alembic current
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Для готовой общей Supabase ожидается `0004_livestock`; **не запускать upgrade, downgrade, seed или pytest на ней**. Новая миграция для публичного API не нужна: используются venues/businesses/catalog_items из 0001 и inquiries из 0002. Для новой отдельной локальной demo PostgreSQL допустимы `uv run alembic upgrade head` и `uv run python -m app.seed --demo`; привязка настоящих Supabase subjects описана в API README. Синтетические владельцы seed не дают вход.

В другом терминале:

```powershell
cd apps/web
npm ci
npm run check:api
npm run dev -- --port 5173 --strictPort
```

В Windows с запретом npm.ps1 используйте `npm.cmd`. В `apps/web/.env.local` только публичные значения:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_SUPABASE_URL=https://pdjjdqgoitnkpgkbqjtp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key проекта>
```

API Base URL включает `/api/v1`; Swagger — `http://127.0.0.1:8000/docs`, OpenAPI — `http://127.0.0.1:8000/openapi.json`. Серверные DATABASE_URL, JWT_ISSUER, JWT_AUDIENCE, AI_API_KEY, AI_MODEL остаются только в `apps/api/.env`. CORS: `ALLOWED_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]`. Пароли, access tokens, service role и AI key во frontend env запрещены.

`127.0.0.1` доступен только на компьютере, где запущены процессы. Для другого компьютера нужен отдельно согласованный достижимый API URL и точный origin в CORS; HTTPS-деплой этим PR не выполняется. Supabase URL — это Auth, не адрес FastAPI.

## Контракт и подключения

Источник — [OpenAPI](../packages/contracts/openapi.json), [примеры](../packages/contracts/examples.json), [seed UUID/slug](../packages/contracts/demo-seed.json). Генератор уже обновил `apps/web/src/shared/api/generated.ts`; вручную файл не редактировать. Проверка: из API `uv run python -m app.export_contracts --check`, из web `npm run check:api`. После изменения схем сначала экспорт API, затем `npm run generate:api`.

Версия 0.4.0 добавляет публичные GET venues/businesses/business-by-slug, POST inquiry и приватные GET/PATCH inquiries. Списки — `{items,next_cursor}`, фильтр площадки — `venue_id` UUID, цены — `price_minor`; GET shop содержит `catalog`. Заявка: `client_request_id`, обязательные `visitor_name`, `contact`, `message`; квитанция только `id,created_at`. Денежные контракты и правила не менялись.

`app/modules.ts` подключает публичные страницы и sale/debts/history/summary в существующий router. Private-запросы идут через общий API client с Supabase Bearer. Query keys и незавершённые денежные запросы включают пользователя и business. Ручная форма сбрасывается при смене точки; runtime пересоздаётся при смене пользователя. При неизвестном результате сохраняются **исходное тело и Idempotency-Key**, новая операция до разрешения повтора недоступна. Состояние pending хранится в памяти текущей сессии: перед закрытием вкладки необходимо разрешить неопределённый результат, иначе сверить журнал после входа; автоматического offline replay нет.

AI: [multipart, уточнение и подтверждение](../packages/contracts/AI_INTEGRATION.md). Текст и файл взаимоисключающие; голос записывается максимум 30 секунд. Клиент выбирается через общий CustomerPicker, неизвестная оплата остаётся пустой. Backend валидирует и потребляет draft только при явном подтверждении. При 503/504 текст и ручная форма остаются.

## Учебные точки

| Владелец | slug | businessId |
|---|---|---|
| A | mart-demo-clothes | `ad6203bc-7320-5b36-982b-135504c5af68` |
| A | mart-demo-food | `d96e604f-930b-59b5-a239-820d0ae1b02e` |
| B | mart-demo-home | `07691851-9886-5ce4-bb82-a3ed33630fe1` |

Полные 9 UUID — в demo-seed.json. Аккаунты и пароли передаются вне Git. Вход A даёт 6 точек, B — 3; UI использует только `/me`, а не произвольный URL/query businessId. Public hotspot проверяет одновременно UUID и slug; карточка открывает тот же `/shops/:slug`. Отсутствующий marker не подменяет магазин.

## Приёмка

1. Обычный login A → `/me` → клиент → reload → logout → B → только его точки. Запросы B к клиентам/операциям/summary/заявкам A — 404.
2. Создать явно учебного клиента; продажа 3000 ₸ / оплачено 1000 ₸ → долг 2000 ₸. По этой продаже доплата 500 ₸ → долг 1500 ₸, продажи остаются 3000 ₸. Сравнивать дельту summary, если в точке есть прежние операции.
3. Повторить точное тело и ключ: тот же operation ID. В тестовой среде смоделировать потерю ответа; UI предлагает повтор исходного запроса. Не создавать отдельную «заменяющую» продажу.
4. Текст RU/KZ → AI draft → проверить поля/уточнить → подтвердить → журнал. Ошибка AI оставляет ручной ввод. Не считать заглушку живым Gemini.
5. Площадка → GLB hotspot → тот же магазин, что у карточки → заявка → inbox владельца. Проверить список/превью при отсутствии WebGL или ошибке GLB, ширины 360/390/768/1440.

Очищающий pytest — только отдельная пустая PostgreSQL с именем `*_test`, `TEST_DATABASE_URL` отличается от основной БД. Frontend `npm test` использует заглушки; demo E2E не подтверждают живые Auth/AI/БД. Фактические результаты этих категорий отдельно фиксируются в [backend handoff](handoffs/backend.md).

## PR и публикация

Интеграционный Draft PR предназначен в main и содержит историю #3/#4/#5/#6. После review капитан может принять его целиком; отдельное последующее слияние старых PR уже не требуется. PR #5 пока направлен в backend/ledger-auth: не сливать его отдельно в main и не выполнять force push/retarget без согласования. Альтернативный раздельный порядок — #4, затем retarget #5 в main, #3 и #6, затем оставшийся интеграционный diff; потребуется заново проверить итог. В этой задаче PR не сливаются, ветки не удаляются и деплой не выполняется.

## Update 2026-10-16: integration/team-mobile

Based on PR #8 head 3d009dc. Assets imported selectively from 11c4e45 (models, previews, manifest, research/build materials); public UI from 8818e8b adapted to the existing API, router and common RU/KZ. No unrelated-history merge or duplicate application. The previous source table above describes the baseline. Mobile role owns apps/mobile; proposed contract is packages/contracts/LIVESTOCK_API.md, published before backend implementation.
