# Backend PR61: разрешённое окно, ручной Render deploy

2026-10-17. Капитан разрешил **только backend application commit
f6b3a9a94d8bf1c982344c05e0203dcb5bc6b8b5**. Frontend/Vercel, миграции, seed,
memberships, денежные записи и paid AI не входят в это переключение.

## Принято после exact-commit Live — 2026-10-17

Капитан передал из панели существующего сервиса `srv-db95nfmk1f9s73fmnce0`:
Most recent deploy **Live**, commit **f6b3a9a**, событие «Deploy live for f6b3a9a:
feat(api): resolve scoped customers by explicit IDs with live balances».
Этот prefix однозначно соответствует разрешённому полному SHA
**f6b3a9a94d8bf1c982344c05e0203dcb5bc6b8b5**. Автодеплой выключен после specific commit.
SHA подтверждён **капитаном из панели**, не самостоятельно через management API;
публичные health/OpenAPI не являются доказательством SHA.

Прежний deployment для учёта отката: **dep-db9lvsijnfac73cq11g0**,
SHA **e699158b5238285fb02c85bc5d92c45a3cc4ca84**, оба переданы капитаном.
ID нового deployment ещё не указан; нельзя приписывать ему прежний dep-ID.
Это оставшийся пункт метаданных, не провал уже выполненной контрактной приёмки.

**Собственная неплатная приёмка по настоящему HTTPS — PASS:**

- health200, OpenAPI200/API0.6.2 **с ids**, полная схема совпала с кандидатом;
- настоящие Supabase JWT: /me A200/6точек, B200/3точки, наборы не пересекаются;
  /me без JWT401;
- для каждого владельца: выборка своего UUID200; смешанный набор свой/чужой/
  отсутствующий/повтор своего вернул только своего один раз, next_cursor=null;
- чужой UUID и случайный отсутствующий UUID поодиночке дали одинаковый пустой Page;
  чужой business404, ids безJWT401;
- balance_minor выбранных существующих клиентов совпал с read-only суммой
  sales_delta_minor-receipts_delta_minor их серверных операций по всем страницам;
  новые денежные записи для этого не создавались;
- по6проверок422 для A/B: пустой ids, невалидный UUID,101повтор,
  ids+q, ids+cursor, ids+limit; error.code=VALIDATION_ERROR;
- прежний customers без ids, explicit limit и продолжение при наличии cursor
  сохраняют Page и не дублируют предыдущую страницу;
- GET/POST preflight200 для production Vercel, Preview43 и старого tunnel origin
  с точным allow-origin; никакой actual POST к денежным/клиентским API не выполнялся.

[Безопасные результаты без имён, токенов и тел ответов](qa/customer-ids/hosted-acceptance.json).
Выполнялись GET/OPTIONS приложения и обычный Auth login; прикладных записей0,
paidAI0, миграций/seed/membership0. AI env и другие закрытые настройки напрямую
не читались и не менялись; их сохранение относится к ручному действию капитана.

### Готовый текст передачи Бекзату

Backend доступен: **https://qadamx-taraz.onrender.com/api/v1**, API **0.6.2**,
deployed SHA **f6b3a9a94d8bf1c982344c05e0203dcb5bc6b8b5** (Live подтверждён панелью
капитана; HTTPS schema/ids/A-B проверены независимо). [Контракт](../packages/contracts/CUSTOMER_IDS_API.md),
[OpenAPI](https://qadamx-taraz.onrender.com/openapi.json).
Использовать repeated `ids=UUID&ids=UUID`,≤100, без q/cursor/limit; пустой набор
не отправлять; map поUUID, кэш user+business+IDs. Backend-зависимость снята.
Frontend ещё требует собственного review и имён в долгах/истории после reload;
его выпуск этим отчётом не выполняется. Участникам автоматически ничего не отправлено.

Main/deploy refs пока1a541ef; Render был развёрнут **specific commit**, поэтому
состояние ветки не заменяет runtime evidence. Vercel и APK этим этапом не менялись.
Ниже сохранена история неуспешного первого gate и ручной подготовки.

## История: после первого сообщения капитана «новый deployment Live»

Капитан подтвердил прежний SHA **e699158b5238285fb02c85bc5d92c45a3cc4ca84**;
новый SHA и оба deployment ID ещё уточняются. Само сообщение Live не является
подтверждением целевого f6b3a9a.

Новая реальная HTTPS-проверка: health200, OpenAPI200/API0.6.2, но GET customers
по-прежнему имеет только **q, limit, cursor — ids отсутствует**. Независимый запрос
с уникальным query и Cache-Control/Pragma:no-cache дал ту же прежнюю схему;
`cf-cache-status=DYNAMIC`, schema равна старой и не равна кандидату PR61.
Все три CORS origins по-прежнему проходят GET/POST preflight200.
Повторная авторизация настоящими JWT: /me A200/6точек, B200/3точки;
свои customers/operations/summary/analytics200, чужие404, без токена401.
Это приёмка прежних методов текущего процесса, не ids-контракта.

**Контрактный gate rollout не пройден.** Не запускать зависимый frontend и не
выдавать старое200 с проигнорированным ids за результат новой выборки. Полная
приёмка смешанных UUID/балансов/валидации нового контракта отложена до его появления.
Точная причина требует checkout SHA и deployment ID именно нового Live события.
Remote deploy/permanent-062 пока1a541ef, поэтому Latest commit не является заменой
разрешённому Deploy a specific commit:f6b3a9a. Агент настройки/код Render не менял.

## Предварительно проверено

- PR61 head735145e содержит тот же runtime f6b3a9a; последующие изменения — отчёт.
  Main/deploy refs остаются1a541ef. Новый код сохраняет диагностикуe699158,
  API0.6.2, recovery/Auth/AI/аналитику/Мал базар; новых миграций/env нет.
- Настроенного Render management key в согласованных местах нет; браузерный
  inventory не содержит панели Render. Агент не может нажать Deploy или прочитать
  текущий Live deployment ID. Публичный health не сообщает SHA.
- Последний SHA, подтверждённый капитаном из панели: **e699158b5238285fb02c85bc5d92c45a3cc4ca84**.
  Это историческое подтверждение, не новая проверка текущего процесса.
- Предварительный HTTPS: health200/OpenAPI200/version0.6.2, **ids отсутствует**;
  /me A200/6точек, B200/3точки; свои чтения200, чужие404, безJWT401.
- CORS: GET и POST preflight200 с точным allow-origin для всех трёх адресов:
  `https://qadamx-taraz.vercel.app`,
  `https://qadamx-taraz-git-integration-seller-registrat-7d21c0-p-it-chers.vercel.app`,
  `https://negotiations-exist-newman-ohio.trycloudflare.com`.
  Это проверка текущих разрешений, не полный снимок всех Environment.

## Действия капитану

1. В существующем сервисе, обслуживающем `qadamx-taraz.onrender.com`, открыть
   Deploys/Events и последнее Live. **До переключения** сохранить deployment ID,
   полный SHA, время Live. В чат можно передать только эти метаданные.
   Если SHA отличается от ранее подтверждённого e699158/эквивалентного1a541ef,
   сначала проверить diff нового работающего кода, чтобы не потерять исправления.
2. Сохранить текущие Environment локально в закрытом месте панели/оператора:
   особенно действующие OpenAI provider/models/key, fallback, DB/Auth/Storage,
   весь ALLOWED_ORIGINS. Не публиковать значения или полный Environment.
   Ничего не заменять значениями из исторического render.yaml.
3. **Manual Deploy → Deploy a specific commit** → вставить
   `f6b3a9a94d8bf1c982344c05e0203dcb5bc6b8b5` → **Deploy Commit**.
   Не выбирать Latest, не менять связанную ветку/Blueprint и не запускать миграции.
   Специальный commit deploy в Dashboard выключает auto-deploy; оставить выключенным.
   [Официальный порядок](https://render.com/docs/deploys#deploying-a-specific-commit).
4. Дождаться Live. Сохранить новый deployment ID и полный SHA; прислать их без
   секретов вместе с прежними. Агент проверит HTTPS, не принимая факт push за deployment.

Root `apps/api`; команды существующего сервиса сохраняются:
build `pip install uv==0.12.10 && uv sync --locked --no-dev`,
start `uv run --no-sync python deploy_start.py`, health `/api/v1/health`.
`deploy_start.py` не выполняет alembic/seed. Vercel не требует rebuild.

## Уточнённый откат — сохранить текущие env и Preview CORS

Важное уточнение к прежнему общему плану: Render **Rollback** переиспользует
environment variables целевого старого deployment для запуска. Текущие настройки
панели при этом не перезаписываются, но старый процесс может получить старые ключи
или не получить позднее добавленный Preview origin.
[Официальная таблица поведения rollback](https://render.com/docs/rollbacks).

Поэтому для этого окна предпочтительно **Manual Deploy → Deploy a specific commit →
предыдущий зафиксированный Live SHA**, с **текущим** Environment. Это новый deploy
старого кода, а не кнопка Rollback. Проверить health, /me A/B, прежний customers и
все три CORS origins после запуска. БД/данные не восстанавливать и не откатывать.

Сейчас зависимый frontend не выпускается, поэтому возврат прежнего backend допустим.
После будущего frontend с ids обычный старый API опасен: он молча игнорирует ids.
Тогда сначала вернуть прежний web, сохраняя совместимый ids-backend для открытых
вкладок; backend-откат потребует сохранения поддержки ids или отдельной явной защиты.

## Готовая HTTPS-приёмка после Live

Использовать существующие учебные данные и настоящие JWT A/B:

- health/OpenAPI200, версия0.6.2, query `ids`; schema соответствует f6b3a9a;
- /me A/B200 и непересекающиеся доступные точки; anonymous401;
- `?ids=свой&ids=чужой&ids=несуществующий&ids=свой` возвращает только своего один
  раз, без дополнительных полей, next_cursor=null. Повторить для обоих владельцев;
- чужой/несуществующий UUID поодиночке дают одинаковый пустой Page;
  чужой business404, ids безJWT401;
- balance_minor сравнить с read-only суммой sales_delta_minor-receipts_delta_minor
  существующих операций этого клиента (все страницы). При конкурентной записи
  расхождение повторно исследовать, не создавать фикстуры на общей БД;
- пустой/невалидный ids,101повтор, сочетания q/cursor/limit →422;
- прежние customers без ids, explicit limit и следующая страница работают;
- CORS production/Preview43/старый tunnel остаются прежними.

Подготовлен локальный проверяющий скрипт `tmp/ids_rollout_https.py`; он читает
согласованные локальные credentials только в памяти, выполняет GET/OPTIONS приложения
и обычный Auth refresh/login, не сохраняет тела с клиентами/JWT и ничего не пишет в БД.
Сначала проверяет наличие ids в OpenAPI; при отсутствии завершает со статусом
`waiting_for_manual_deployment`, не объявляя контракт принятым.

## Передача Бекзату после приёмки

Заполнить **только после Live и PASS**:
`Render deployment ID / SHA (panel evidence); API0.6.2; HTTPS ids/A-B PASS`.
Адрес: `https://qadamx-taraz.onrender.com/api/v1`.
[Контракт](../packages/contracts/CUSTOMER_IDS_API.md), [OpenAPI](../packages/contracts/openapi.json).
До этого подтверждённого deployed SHA нет; переключать зависимый frontend рано.

Обнаружен новый PR65 (`559b4d0e36d60e8cadda46118f8dad1f057c2cab`) с frontend ids;
он не рассматривается автоматически как принятый и не входит в backend window.
PR67 рассматривается отдельно: [review аналитики](ANALYTICS_67_REVIEW.md).
