# Customer POST unknown result — предложение капитану

2026-10-16. **Этап 1 завершён: анализ и конкретное предложение. Frontend-политика ожидает согласования.** Описанные состояния ещё не реализованы, новые regression tests и Android acceptance не выполнены. Production-код, Backend, OpenAPI и generated.ts не изменены.

## База и границы

База из задания — `origin/integration/local-combined-check`, HEAD `58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76`, API **0.6.0**. От неё создан отдельный worktree `work/qadam-customer-post`, ветка `fix/customer-post-unknown-result`.

[Analytics PR #16](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/16) остаётся отдельным open Draft, HEAD `ce68f01e3fe4a6b9898fd68be8e3ef2e4c467ad1`; автоматически не переносится. PR #13/#14 также open Draft. Merge не выполняется.

## Текущий контракт

Источники: [OpenAPI](../packages/contracts/openapi.json), [CustomerCreate/Response](../apps/api/app/schemas/__init__.py), [Customer routes](../apps/api/app/routers.py), [архитектура API](team5/02_ARCHITECTURE_API.md).

- `POST /api/v1/businesses/{id}/customers`, Bearer Supabase. `id` — UUID разрешённой точки из `/me`.
- `CustomerCreate`: `display_name` — 1–200 Unicode code points; `note` — до 2000, default `""`; `contact` — до 200 либо `null`. Сервер обрезает внешние пробелы; дополнительные поля запрещены.
- Успех — `201 CustomerResponse`: `id`, `business_id`, `display_name`, `note`, `contact`, `balance_minor`. Нет creation-intent ID или `created_at`.
- POST parameters: только `id:path`. Responses: **201/401/404/409/422/503**. `400` не объявлен; generic `409` не означает replay или существующего клиента.
- GET customers: `q` — подстрока имени до 200 символов; UUID `cursor`; `limit` 1–100, default 50; `{items,next_cursor}`. Сортировка по UUID, не по времени создания.

**Идемпотентности Customer POST нет.** В `routers.py`, строки 57–72 на указанной базе, каждый вызов создаёт новый Customer/UUID, выполняет `db.commit()` и возвращает ответ. В [модели](../apps/api/app/models/__init__.py) нет уникальности имени/контакта. Полностью одинаковые клиенты допустимы.

Нет idempotency key, fingerprint, reservation, replay или status lookup. Разрешение заголовка в CORS не реализует идемпотентность метода. Финансовый `IdempotencyRecord` связан с Operation. `X-Request-ID` / `ErrorResponse.request_id` служит диагностике HTTP-запроса; OpenAPI `operationId` обозначает маршрут. Это не durable intent ID. Самостоятельно добавлять заголовок или поле `client_request_id` нельзя.

## Интерпретация результата

| Наблюдение исходного POST | Безопасная интерпретация |
|---|---|
| Runtime-valid ответ 201, клиент исходной точки | `saved` |
| Локальная валидация / доказанная ошибка до отправки | Не отправлено; можно исправить |
| Подтверждённый штатный 401/404/422 этой попытки | `rejected` до записи, без автоматического retry |
| Timeout, network/CORS, abort после отправки, потеря ответа | `unknown`: клиент мог сохраниться |
| Общий 5xx / 503 `DATABASE_UNAVAILABLE` | `unknown`: потеря подтверждения commit не доказывает rollback |
| 2xx с malformed JSON, без ID или с чужой точкой | `unknown`, не успех и не доказанный отказ |
| Неожиданный 400/409/envelope | Уточнить контракт; не выдумывать семантику и не разрешать прежний unknown |
| GET не нашёл клиента, включая все страницы | Не доказывает отсутствие записи или невозможность позднего commit |
| GET нашёл точное совпадение | Только кандидат: это может быть прежний клиент или другой допустимый дубль |

Ошибка последующего GET не отменяет подтверждённый успех. Отказ другой попытки не разрешает предыдущий unknown. GET не предоставляет согласованный snapshot страниц. Поиск NFC-нормализует `q`, создание не нормализует строки: сравнение имён также не является надёжной корреляцией.

## Предлагаемый frontend-этап — требуется согласование

1. Общий coordinator для форм создания и CustomerPicker, привязанный к session epoch и business. Синхронный lock до первого `await`, неизменяемое тело и исходная точка. Локальный `attemptId` связывает callbacks, в API не отправляется.
2. `saving`: блокировать submit и редактирование отправленных полей. Закрытие/reopen не теряет попытку. Автоматических повторов POST нет.
3. Мягкий deadline **20 секунд** переводит `saving` в `unknown` и завершает spinner. Он не отменяет серверную транзакцию. Продолжать наблюдать исходный promise: поздний подтверждённый ответ может разрешить именно эту попытку.
4. `unknown`: «Результат сохранения неизвестен. Клиент мог быть создан. Повторное создание заблокировано, чтобы избежать дубля». Ввод остаётся в памяти, исходная точка не подменяется текущей.
5. Кнопка «Найти возможные совпадения» запускает только опубликованный GET customers с pagination. Состояние `checking`: «Проверяем результат сохранения» с явным пояснением «Ищем возможные совпадения. Список не подтверждает исход отправки». Кандидаты, пустой список и ошибка GET возвращают `unknown`; POST не разблокируется. Можно явно выбрать существующего клиента без утверждения, что он создан этой попыткой.
6. Пока попытка не разрешена, блокируются **все новые Customer POST исходной точки, включая других клиентов**. Это существенное ограничение MVP; другие точки не блокируются. Кнопки обхода «сбросить и повторить» нет.
7. Callbacks проверяют epoch/business/membership/attempt перед UI, cache и `onCreated`. Ответ A не закрывает форму B и не выбирает клиента другой точки. Старые timers/GET не перезаписывают `saved`. Поздний успех после unknown предлагает явный выбор клиента.
8. До отправки сохранять в `localStorage` минимальный marker: версия, scope API/Supabase project, user/business UUID, attempt ID и состояние. **Без содержимого формы, контакта, токенов или тела POST.** UUID остаются псевдонимными метаданными; фильтрация UI по пользователю не защищает browser storage. Если marker невозможно сохранить, POST не отправлять, объяснить причину.
9. После reload `saving` трактуется как `unknown`, автоматической отправки нет. Marker показывается только после восстановления identity и разрешённых membership. Он не удаляется по TTL, пустому GET или logout. Поля хранятся только в памяти текущей сессии и очищаются при logout; **после reload они не восстанавливаются**. Это ограничение предлагается согласовать явно.
10. Только авторитетный ответ исходного POST разрешает его marker. Изменять marker через сравнение `attemptId`: поздний ответ не удаляет marker новой попытки. Подтверждение прежней попытки может снять её marker без UI-эффектов в другой сессии; старые пользовательские данные туда не попадают.
11. После reload исходный promise потерян. API может никогда не дать однозначного ответа, поэтому блокировка остаётся. Ручная сверка капитаном **сама по себе не исключает поздний commit**. Для гарантированного recovery нужен Backend. Административное снятие блокировки потребует отдельного принятия риска и не входит в реализацию.

Защита относится к двойным нажатиям, reopen и reload в данном браузере. Она **не обещает exactly-once между вкладками/устройствами, после очистки storage или изменения API origin**. Если такой lock неприемлем для MVP, сначала нужна серверная идемпотентность.

### Состояния

| Состояние | Разрешённое действие |
|---|---|
| `idle` | Ввод, локальная валидация, один явный submit |
| `saving` | Ожидание; поля и submit заблокированы |
| `saved` | Подтверждённый клиент; ошибка обновления списка не меняет успех |
| `rejected` | Подтверждённый отказ; исправление и новый явный submit |
| `unknown` | Поля в памяти, повторный POST заблокирован |
| `checking` | Только GET кандидатов; подтверждение исходного POST имеет приоритет |

### Scope

Customer coordinator/hook/tests, `Customers.tsx`, seller `useCreateCustomer`, RU/KZ; при необходимости session registry и gateway-интерфейс. API client сейчас скрывает HTTP status: строгая проверка именно 201 потребует необязательной customer-only проверки статуса/метаданных с прежним поведением остальных вызовов. Общий timeout/retry не добавлять.

Backend, OpenAPI, generated.ts, финансовые, public и voice-модули не изменять.

## Необходимое расширение Backend — предложение, не контракт

Капитан определяет имена заголовка, методов и схем. До публикации OpenAPI frontend их не вызывает.

- Стабильный idempotency key создания клиента, scope action/business/creator. Membership проверяется при create, replay и lookup.
- Канонический hash валидированного тела после trim/defaults. Тот же key с другим телом — документированный conflict без INSERT.
- Атомарное сохранение Customer, result ID и результата; конкурентные запросы с одним key сериализуются. Replay того же key/body возвращает исходного клиента.
- Durable lookup: completed с CustomerResponse; processing только при durable reservation; terminal rejected. `not_observed` не доказывает, что исходный запрос не поступит позже.
- Recovery сохраняет тот же key, включая `not_observed` и поздний worker. Новый key для неизвестного результата не генерируется.
- Явная retention/expiry политика с защитой от позднего повторного создания. TTL не должен незаметно разрешать повторное использование key; MVP может хранить ключи без автоматического expiry.
- OpenAPI, examples/generated и PostgreSQL concurrency/rollback/replay/late-worker/membership tests публикует Backend. Frontend mock-тесты не подтверждают серверную идемпотентность.

## Будущие regression tests

Успех 201; 201 с ошибкой follow-up GET; local validation; 400/422 без выдуманной семантики; 401/foreign 404; 5xx; timeout; commit с потерянным ответом; malformed/foreign 201; двойной submit одной/двух форм; повтор при unknown; reopen; business A→B→A; logout/epoch A→B→A с поздним 401/201; reload saving/unknown; storage failure; GET кандидаты/пустой/все страницы/error не разрешают POST; гонка timeout/201/check; marker CAS и позднее разрешение без UI-утечки. RU/KZ, клавиатура, ширины 360/390/768/1440.

## PR #14 — сравнение без merge

Core epoch guard `markExpired/getToken` и code-point parsing уже присутствуют в combined. Отсутствуют полезные дополнения PR #14: защита позднего `signOut`, identity guard перед `getSession`, общая field validation с RU/KZ ошибками, дополнительные Auth/Unicode tests. Автоматического merge нет. Здесь можно адаптировать только необходимые согласованные regression scenarios; более широкий Auth/Unicode scope требует отдельного решения.

## Android/HTTPS — подготовка, приёмка не выполнена

Физический Android не подтверждён, `adb` отсутствует в PATH. Chromium emulation и прежняя desktop-приёмка не заменяют устройство. Новые microphone/audio/live действия не выполнялись.

Отдельная `integration/livestock-https:ca51bbf9bcf1a5e5379b7b8ced147e4114e01434`, [Draft PR #17](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/17), публикует API 0.6.1 и временный HTTPS по отчёту капитана. Она не включена в эту базу; customer POST по её OpenAPI также не содержит idempotency parameter. Доступность URL здесь не проверялась, чужие live-результаты за свои не выдаются.

Android Web требует доверенного secure frontend origin, достижимого HTTPS API, точного CORS и учебных аккаунтов. HTTPS API сам по себе не делает HTTP LAN frontend secure context. Источники: [W3C SecureContext](https://www.w3.org/TR/mediacapture-streams/#navigator-interface-extensions), [Chrome USB debugging](https://developer.chrome.com/docs/devtools/remote-debugging).

Текущий `AudioInput` выбирает `webm/opus` → `mp4` → `ogg/opus` через `isTypeSupported`. Stop/30 секунд/unmount останавливают tracks. Файл — до 8 MiB; duration/MIME проверяет Backend. Загрузка начинается по явному действию «Подготовить черновик», финансовое подтверждение отдельно. **Прослушивания записи в UI нет**, только filename: gap владельцу voice-модуля. Чужой модуль не меняется.

После customer-согласования отдельно проверить на физическом Android Chrome: OS/Chrome/isSecureContext, HTTPS/CORS/login A/B, allow/deny/re-enable microphone, фактический MIME, record/stop/30 секунд, playback, file upload/oversize/unsupported, фон/экран/звонок/unmount, text/manual fallback, RU/KZ, клавиатуру/ориентацию/navigation. Каждый результат фиксируется отдельно. Не публиковать голос, токены, storage state или HAR/trace/видео с персональными данными без согласия; достаточно неперсональных метаданных.

Смежный дефект документации на выбранной базе: `FLUTTER_CONNECTION.md` содержит повреждённые public variable names. Правильные Flutter имена — `API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; web использует `VITE_*`. Чужой документ не исправлялся; HTTPS-ветка капитана уже содержит новые инструкции.

## Проверки и продолжение

Проверены fetch, remote HEAD и статусы PR; изучены контракт, routes/schemas/модели и frontend lifecycle. Этот этап меняет только два документа. Перед commit: `git diff --check`, проверка состава staged diff. Build/unit/E2E не запускались; новые tests и Android acceptance ещё не выполнены.

Далее требуется решение по разделу 6 задания: согласовать frontend с ограничением всех новых созданий точки и невосстановлением полей после reload либо сначала добавить Backend idempotency/recovery. После согласования — frontend/test commits, затем отдельная Android acceptance при наличии устройства и HTTPS origin.
