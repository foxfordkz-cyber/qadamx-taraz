# API 0.6.2: rollout и живая приёмка

16 октября 2026, после явного разрешения капитана «окно открыто». **Команда может возобновить запросы.** Миграция `0006_customer_requests` применена; API переключён на проверенный код **`4e983b42a2a0466d2fc07e4de09becf87a8ef7d5`**. Main и frontend не менялись. Постоянного деплоя нет.

## Подключение и версии

- **API_BASE_URL:** `https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1`
- **Frontend:** <https://negotiations-exist-newman-ohio.trycloudflare.com/login>
- [Живой OpenAPI 0.6.2](https://thorough-readings-riverside-suggesting.trycloudflare.com/openapi.json), [Swagger](https://thorough-readings-riverside-suggesting.trycloudflare.com/docs).
- [Зафиксированный OpenAPI](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/4e983b42a2a0466d2fc07e4de09becf87a8ef7d5/packages/contracts/openapi.json), [контракт recovery](../packages/contracts/CUSTOMER_RECOVERY_API.md), [JSON-примеры](../packages/contracts/customer-recovery-examples.json), [Flutter](FLUTTER_CONNECTION.md).
- FastAPI: ветка `integration/openai-recovery-062`, checkout остаётся строго на `4e983b4`. Содержит PR22 `acce3fd`, диагностику PR30 `33cb37a`, OpenAI PR33 `cba6b32`. Документация этого rollout ведётся отдельно, без изменения работающего checkout.
- Действующий frontend: код **`7f511ddc8f3dc0a6fc1550566b9ead9abbfb98ce`**, документационный checkout `0737439`; preview5192, локальный preview5191 сохранены. Новые изменения PR23/32 автоматически не подключались.
- Remote main перед переключением: `13248851fd2b2a502aff211a506f71e85c2b0ab1`. PR22/30/33 остаются Draft, merge не выполнялся.

Оба Quick Tunnel сохранены без перезапуска. Адреса временные: нужны включённый ПК капитана, сеть, FastAPI и оба cloudflared. Это не постоянный production URL. После остановки туннеля hostname может измениться; нельзя заменять ключ неизвестного pending-запроса из-за смены адреса.

## Fresh backup и сохранность данных

Перед применением создан новый read-only MVCC snapshot `qadam` и `alembic_version`. Архивы **действительно восстановлены** в новую отдельную локальную PostgreSQL `qadam_restore_0006_window_test`, 127.0.0.1:55432. У всех **12 таблиц** совпали количества и SHA256 полного содержимого. На восстановленной копии прошли `alembic upgrade 0006_customer_requests` и `alembic check`, старые данные сохранились.

Приватные архивы, manifest и журналы: `tmp/customer-rollout-window-private/fresh-0006`, ACL ограничены пользователем капитана, SYSTEM и Administrators; каталог игнорируется Git. Проверены SHA256 архивов перед общей миграцией. Это backup **qadam + revision**, не полный backup Supabase Auth и Storage payloads. Исходная ACL metadata сохранена; восстановление Supabase owners/grants локально не заявляется проверенным.

Snapshot начат `2026-10-16T15:49:04.687195Z`, restore проверен до переключения. `qadam.dump`:45567байт, SHA256 `1277a3f77bf3525bcf23d73baeab42900094de07de9a68d77bf2744107a9f745`; `revision.dump`:3097байт, SHA256 `2277615263bb4241446e8b7618436ca3448c585216e70df953285e3882310a40`.

Непосредственно до общей миграции повторно проверены чистый commit, ревизия0005 и соответствие всех данных свежему snapshot. После0006 все прежние12 таблиц совпали по count/content SHA256, новая таблица была пустой. RLS включён; прямые права PUBLIC/anon/authenticated отсутствуют. `alembic check` прошёл. Seed, очистка и downgrade не запускались.

Сначала0.6.2 поднят на отдельном8020 **после миграции**: health, реальные `/me` A/B, recovery lookup и CORS прошли. Затем заменён только FastAPI8018; локальная readiness достигнута за5.719с (это не измерение полного внешнего downtime). Временный8020 остановлен. Туннели и preview не затронуты.

## Реальный внешний HTTP с ПК капитана

Без моков: настоящий Supabase password login, общая PostgreSQL и private Storage, запросы через внешний HTTPS.

| Проверка | Результат |
|---|---|
| Health, OpenAPI, Auth | 200, версия0.6.2; A видит6 точек, B3; без JWT401 |
| Потеря ответа customer POST | Одноразовый локальный relay передал POST во внешний HTTPS, дождался upstream201 и оборвал соединение до передачи ответа клиенту. GET по сохранённому ключу вернул completed и исходного клиента |
| Replay и конфликт | Два повтора с тем же ключом/телом вернули тот же201/ID; другое тело409 IDEMPOTENCY_CONFLICT; ровно один keyed-клиент и receipt в БД |
| Membership и изоляция | Чужие create/lookup/list и аналитика404; lookup без JWT401 |
| Старый frontend POST | POST без ключа по прежней схеме успешно создал отдельного учебного клиента |
| Журнал | Продажа3000₸/оплата1000₸: дельты продажи+3000, поступления+1000, долг+2000, количество+1. Доплата500₸: итоговые дельты продажи+3000, поступления+1500, долг+1500, количество+1 |
| Replay денег | Повторы исходных sale/repayment key/body вернули прежние IDs; в истории учебного клиента ровно2 операции |
| Аналитика/summary | Проверены дельты от снятой до теста базы; средний чек HALF_UP от backend-набора продаж, суммы дневного графика совпали с карточками. Recovery snapshot клиента остался balance0, текущий долг150000minor |
| Мал базар | Публичная лента, мои объявления A/B, market-фильтр, цены с min_price_per_head_minor доступны; приватная лента без JWT401 |
| Фото | Синтетический PNG → JPEG без EXIF в настоящем Storage; повтор загрузки вернул прежний photoID; private owner200/foreign404, фото опубликованного объявления200 |
| CORS | Сохранены точные origins5188/5191/5192 и HTTPS frontend; Authorization/Idempotency-Key проходят; посторонний origin отклонён |

Потеря ответа искусственно внесена в **настоящий HTTP** путь, данные/авторизация/сервер не подменялись. Конкурентные запросы и отзыв membership ранее проверены PostgreSQL-тестами; новый конкурентный live-прогон на общей БД не заявляется. Публикация/продажа livestock-объявления заново не выполнялась. Положительная минимальная цена не создавалась искусственными non-demo записями.

## Настоящий браузер и границы проверки

Headless Chromium390×844 открыл действующий HTTPS frontend: настоящий login A → cross-origin `/me` → выбор точки → deep link аналитики с сохранённой сессией → logout → login B → чужая аналитика404 → logout/защита закрытого маршрута. Demo fallback отсутствовал. Все запросы браузера к API шли на внешний HTTPS, обращений к localhost не было. Браузерный сценарий не создавал новых записей; денежный сценарий выше выполнен через HTTP, не через клики формы.

Secure context/getUserMedia/MediaRecorder, запись, playback/pause/delete/cancel и сохранение текста прошли с **синтетическим устройством Chromium**. Аудио не отправлялось, AI не вызывался. Физический микрофон, Flutter SDK и телефон в этом rollout не проверялись. HAR/trace/video/screenshots/session storage с credentials не сохранялись.

Flutter PR15 актуален на **`1a93469f26a93fb12b7adb7158a1800009f0d257`**. Проверены transport/response validators: Bearer, `/api/v1`, optional market/minimum, multipart и private-photo пути совместимы. Все8 livestock OpenAPI paths и все прежние component schemas совпадают с0.6.1 (сравнение JSON-структур). Проверка с устройства остаётся за Flutter-разработчиком; его ветка не менялась.

## Оставленные учебные записи

Точка `ad6203bc-7320-5b36-982b-135504c5af68` (`mart-demo-clothes`), отдельные клиенты с явной меткой `DEMO rollout062`:

- Keyed-клиент: `737fd8e6-7707-430b-9800-6723cdff91f5`.
- Legacy-клиент без ключа: `723b5ff5-a98a-4cd0-b298-b1f8afada41f`.
- Продажа: `0610d6cd-069e-4104-9e7e-e2593d6ef9c0`.
- Доплата: `6b2bf2f3-6a43-433e-a3b6-66d9d28083fa`.
- Приватное синтетическое фото32×32: `75094591-28ac-5078-9ade-a02c42a91317`.

Автоматически не удалять: они обеспечивают аудит приёмки. Ключи идемпотентности, пароли, JWT, реальные клиентские записи и содержимое backup не публикуются.

После приёмки: customers14→16, operations15→17, idempotency_records15→17, livestock_photos4→5, livestock_requests16→17, customer_creation_requests0→1. Без изменения: businesses9, catalog_items9, drafts8, inquiries2, livestock_listings4, memberships9, venues3. Это намеренные учебные добавления после проверки сохранности миграции, не изменение прежних записей.

## Откат, AI и следующий шаг

Откат не потребовался. При последующем отказе использовать проверенный [guard-план](CUSTOMER_RECOVERY_ROLLOUT.md): сохранить0006 и receipts, запускать старый API **только через `legacy_customer_guard.py`**, customer POST/lookup отвечают503 CUSTOMER_RECOVERY_PAUSED. Нельзя возвращать raw0.6.1, который игнорирует ключ, делать downgrade или восстанавливать старый dump поверх новых записей.

Точный CORS сохранён: `http://127.0.0.1:5188`, `http://127.0.0.1:5191`, `http://127.0.0.1:5192`, `https://negotiations-exist-newman-ohio.trycloudflare.com`. Auth/Storage и серверный.env сохранены. После рестарта listener28464/launcher12888 обслуживает8018; tunnel PIDs25616 и11412 прежние. PID — наблюдение этого запуска, не постоянная конфигурация.

AI-провайдер оставлен **Gemini, `gemini-3.6-flash`**; `AI_FALLBACK_OPENAI=false`. Код OpenAI/безопасной диагностики присутствует, но платный OpenAI не включён. Новых платных проверок нет; ранее зарезервировано$1.40 из$2, это не фактический счёт. Старый Gemini incident `6baafba2-a7ab-4471-8b1b-fb95e9cc0229` **не закрыт** этим rollout.

Ранее проверенная сборка:307 backend tests на отдельной PostgreSQL,73 frontend tests с заглушками, lint/typecheck/contracts PASS. Эти результаты не выдаются за повторённый набор после миграции; здесь выполнена новая внешняя HTTP/браузерная приёмка без изменения кода.

Бекзату: backend gate API0.6.2 открыт. Реализовать recovery в своей текущей ветке по согласованному контракту: сохранять key/body до POST, после неопределённого результата GET, повтор только с тем же телом/ключом; никакого keyless fallback или нового ключа. `not_observed` не означает, что поздний запрос не завершится. Доступность backend не означает, что recovery UI уже опубликован. Flutter: продолжить проверку на устройстве по прежнему URL. Main/voice/ветки команды не менять; постоянный деплой — отдельный этап.
