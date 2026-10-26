# Передача работы backend

## 2026-10-18 — часть B: PR #94 и архив Pages

По разрешению капитана PR #94 `feature/analytics-redesign`, head
`2afac1df6b1de600080244f5063e44b942f80df7`, включён обычным merge `32103ca`
поверх свежего main `1d47a1d`. Сохранены #89/#91/#90/#93 и обе README
с новым двухминутным видео. Backend, контракты, Auth/recovery и зависимости
не изменены этой интеграцией. Отдельная рабочая ветка: `codex/pages-analytics-94`.

Проверки интегратора на объединённом коде:

- `npm ci --no-audit --no-fund`; check:api, typecheck, lint — PASS.
- `npm test -- --maxWorkers=1 --no-file-parallelism` — **530/530**, 40 файлов.
- E2E по отдельным конфигурациям: analytics **44/44**, assistant **6/6**,
  assistant-qa **13/13**, cabinet-ai-first **10/10**, analytics-redesign **7/7**,
  analytics-layout **5/5**. Наборы пересекаются, не суммировать.
  Все без retries/skips; API/Auth синтетические, RU/KZ и 360/390/1440.
  Это не физическая приёмка телефона и не живой AI.
- `npm run build:hosted` — PASS с прежней публичной конфигурацией,
  `VITE_CUSTOMER_IDS_ENABLED=true`, `VITE_ASSISTANT_ENABLED=true`.
- Node-проверка: **23 файла**, нет `.map`/`.env`, нет известных серверных
  секретов; присутствуют `mobile-v0.5.2-review68.1`, «Спросите Qadam»,
  «Qadam — учёт продаж и долгов голосом», «Объяснить с AI»;
  старой строки `mobile-v0.3.0` нет. ZIP распакован и сверен по SHA-256
  каждого файла с dist, `index.html` находится в корне архива.

Первый typecheck был ошибочно начат до завершения npm ci и не нашёл tsc;
после окончания установки штатный прогон прошёл, код для этого не менялся.
Сохранены прежние предупреждения build о большом JS/3D bundle и пустом auth chunk.
Новые скриншоты локального прогона оставлены отдельно, в commit не добавлены.

Архив `tmp/qadam-pages-<main SHA>-analytics.zip` предназначен для одной ручной
Production-загрузки в существующий проект `qadamx-taraz`. Локальные
`tmp/pages94-evidence/manifest.json` и `zip.json` содержат точный source SHA,
хеши файлов и архива. Это подготовленный ZIP, **не новый deployment**.
Откат Pages: `f89a486c-72e6-4188-bea8-9db5d8e15813`.
Render/Supabase/Environment/deploy-ветки не переключались; платных запросов,
денежных записей и миграций нет. После ручного Success: получить deployment ID,
выполнить `node scripts/verify-pages.mjs`, сверить опубликованные файлы с
манифестом и проверить главную/кабинет/аналитику в Demo без живого AI.

## 2026-10-18 — небольшой PR: демо-цифры главной кабинета

После интеграции #89 → #91 → #90 и test-only исправлений (main `ab473f1`)
подготовлена отдельная `codex/demo-cabinet-overview`: [PR #93](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/93),
проверенный код `9f32f41`, включён обычным merge после проверок. Dashboard в явном Demo
читает последний день существующего makeDemoAnalyticsSnapshot: продажи 12 000 ₸,
поступления 9 000 ₸, общий долг 35 000 ₸. Рядом явно указаны «Демо» и дата
учебного снимка 2026-10-16 — это не текущая серверная сводка.
В том же модуле демо-аналитики добавлены три строки учебного preview долгов
для существующих demo-клиентов; они не являются полным списком восьми должников
агрегата. Вторая демо-точка остаётся пустой. Live summary/ledger не изменены,
ошибки live никогда не подменяются демо-цифрами, все денежные действия Demo запрещены.

Проверено последовательно: check:api, typecheck, lint, **520 unit/component**
из 39 файлов, build PASS. Новые UI-тесты RU/KZ/360/390/1440 **6/6**,
cabinet **10/10**, assistant **6/6**, assistant-qa **13/13**, release-surfaces **8/8**.
Это локальный Chromium и синтетические API; не физический телефон и не живой AI.
[Полный отчёт и промежуточные сбои](../HOME_QA_INTEGRATION_20261018.md).
Pages, deploy-ветки, Render, Supabase, Environment не переключались.
Далее — review опубликованного analytics-redesign и ZIP/ручной upload части B.

## 2026-10-18 — часть A: новая главная и независимые отчёты QA

Основа `a4ce3b0`, отдельная ветка `integration/ordered-home-qa-20261018`.
Порядок обычных merge: #89 `e919817` → #91 `22dd388` → #90 `aa0ce33`.
#91 содержит только E2E/docs, #90 — только docs. Единственный конфликт двух
QA-handoff разрешён сохранением обоих полных исторических отчётов.

После #89: npm ci, check:api, typecheck, lint, 517 unit/component, build PASS.
После #91: typecheck/lint/517 unit PASS; assistant 6/6, assistant-qa 13/13,
cabinet 10/10, release-surfaces 8/8 (включая четыре hero), public-design 1/1.
После #90: typecheck/lint/517 unit PASS, QA E2E 21/21. Повторные наборы пересекаются;
суммировать их как независимое покрытие нельзя. Браузерные API/Auth — заглушки.

На неизменённом main `a4ce3b0` отдельно воспроизведены все шесть падений #90:
пять recovery из-за неучтённых GET summary/operations и меню «Мне должны».
Исправлены только эти два тестовых файла; файлы #91 не переписаны.
Сохранены assertions ключа/тела/числа POST и запрет неожиданных запросов.
Также на чистом main воспроизведены три IDs-сценария общего E2E: флаг IDs был
выключен. Он включён только в default/analytics тестовых конфигурациях,
как в отдельном ledger-reading и опубликованном frontend. Production не меняется.
Все 15 существующих E2E-конфигураций проверены; последние результаты PASS без
пропусков/авторетраев. [Точная таблица, baseline и промежуточные сбои](../HOME_QA_INTEGRATION_20261018.md).
Наборы пересекаются, их числа не складываются. Исправлены также оставшиеся
ожидания active-route и числа touch targets в том же menu-тесте. WebKit установлен
и проверен на Windows; это не физический iPhone. Полные итоговые прогоны default
38/38, analytics 38/38, QA 21/21, Chromium/WebKit 10/10.

Render/API 0.7.1, Supabase, Environment и действующий Pages не меняются.
Живые AI-вопросы, денежные записи и миграции не выполняются.

## 2026-10-17 — интеграция перед заморозкой

Принятая регистрация с routing818bb25, Flutter0.5.2, README/защита и отчёты
сохранены в общей интеграции. [Точный состав и ограничения](../FINAL_FREEZE_20261017.md).
Backend относительноmain672731a не изменился. Render, схема0008, memberships,
AI и CORS сохранены. Повторный backend deploy или миграции не нужны.
Pages теперь818bb25; приведённый ниже672731a — исторический предыдущий web-выпуск.

## 2026-10-17 — финальный Pages опубликован и проверен

После ручного upload капитан сообщил Success в22:31:
`9fc7b2a8-bd91-4383-9f1a-b45518765558`. Основной домен независимо совпал по22/22
файлам с source `672731a9ca836782728a9f80493b68996c913adf`; шесть SPA URL200.
Повторная живая read-only A/B-приёмка нового сайта прошла:6/3точки, reload,
клиенты, существующий recovery-результат, история, summary, аналитика7/30,
изоляция404, RU/KZ/360/390/1440. Новых записей и AI-запросов нет.
Render8fa0029/API0.6.3 и БД0008 сохранены. Отчёт публикуется отдельной docs-веткой,
замороженный main/deploy672731a не меняется. [Результат и откат](../FINAL_DEFENSE_RELEASE_20261017.md).

## 2026-10-17 22:25 — ZIP передан, публикация Pages ещё ожидается

Main и deploy-ветки = `672731a9ca836782728a9f80493b68996c913adf`;
ZIP `tmp/qadam-final-672731a.zip` соответствует этому SHA. Cloudflare CLI получает
403 в правильном аккаунте, поэтому капитану переданы точные шаги ручного upload.
Присланный им ID 1cd035e1 — прежний deployment; сайт независимо совпал с 8fa0029
по 22 файлам, шесть SPA URL доступны. Render/API0.6.3/0008 не менялись.
Свежая живая read-only A/B-приёмка действующего Pages прошла: вход, 6/3 точки,
reload клиента, сохранённый recovery-результат, история, summary, аналитика7/30,
изоляция404, RU/KZ и 360/390/1440. Не путать это с приёмкой нового ZIP.
Деньги/клиенты/AI не создавались. [Точные результаты и откат](../FINAL_DEFENSE_RELEASE_20261017.md).
Далее: капитан загружает ZIP один раз в существующий Production-проект; после
нового Success/ID сверить 22 хеша и smoke. Если не успеваем — оставить рабочий8fa0029.
Видео команда ещё готовит; QR и сценарий уже опубликованы. Регистрация/цены исключены.

## 2026-10-17 — финальная подготовка: фактическая production-база

Работа начата от main f023aae в отдельной integration/final-defense-20261017.
Отчёт80a3242 и его HTTP/manifest evidence перенесены выборочно, новые записи handoff
сохранены. [Production rollout](../PUBLIC_DATA_MARKETS_PRODUCTION_20261017.md):
Render8fa0029/API0.6.3, общая Supabase0008 после проверенного backup/restore;
Pages source8fa0029 на старте задачи. README RU/KZ исправлены точечно.
Позднее изменение health.stage в main — только косметика, не свидетельство сбоя AI.
Render, Environment, AI-бюджет, БД и memberships в этом окне не меняются.
Регистрация43, неподтверждённые demo/внешние цены и новые APK не включаются автоматически.

Проверено: 75 unit/component, 6 последовательных web E2E, отдельно 1 voice-integration,
typecheck/lint/check:api/hosted build. E2E используют заглушки; первый параллельный прогон
был остановлен после timeout, повтор завершён успешно без изменения приложения.
Cloudflare CLI не имеет доступа к нужному аккаунту (403): подготовлен ручной путь
ZIP → Production upload → 22 хеша → живая read-only приёмка. Наличие архива не deployment.
[Финальный отчёт](../FINAL_DEFENSE_RELEASE_20261017.md),
[материалы сдачи](../submission/DEFENSE_CHECKLIST.md).
## 2026-10-17 — AI-бюджет $20 и одна hosted-текстовая проба

Отдельная docs/ai-defense-budget-20 от свежего origin/main
`8fa0029a847895a2b968592fb6ab5b8cc39ee0a1`. Изменены только запись решения
в DECISIONS.md и этот handoff; код, Render, Environment, fallback, модели и timeout
не менялись. Секреты/значения Environment не переписывались и не публиковались.

Капитан разрешил общий лимит $20. Существующий игнорируемый локальный журнал
`tmp/openai-drafts-live-budget.json` сохранён с прежними записями и резервом $1.80.
Лимит повышен без освобождения неизвестных расходов. До пробы остаток $18.20;
перед единственным hosted POST зарезервировано $0.05, итог $1.85 / остаток $18.15.
Стоп при остатке $2; новый резерв не должен пересекать этот порог. Фактический billing
не получен; $1.85 — защитный резерв, не подтверждённое списание. Журнал не коммитится.

Через настоящий HTTPS Render выполнены вход учебного A, /me и выбор доступной
`mart-demo-clothes`, затем ровно один POST drafts (multipart text, locale kk):
«Асқарға үш мың теңгеге тауар бердім, мыңын төледі».

- HTTP **200**, длительность самого POST **4719 мс**.
- kind=sale; total_minor=**300000**, received_minor=**100000** — совпали с ожиданием.
- request_id: `540d87ba-8bc5-4c4b-80aa-e554227c331e`.
- draft_id: `cb009ce1-b947-4eff-a103-1782ea48dc71`.
- expires_at: `2026-10-17T16:54:44.570722Z`.
- Клиент не создавался/не выбирался, операция не подтверждалась. Финансовых POST — 0;
  read-only снимки истории и карточек аналитики до/после совпали.
- Аудио/STT, дополнительные AI-запросы и повторы не выполнялись. Ошибка прежнего
  recording.webm этой текстовой пробой не закрывается.

Provider/model: **OpenAI / gpt-6-luna по последней подтверждённой конфигурации капитана
и принятому режиму**. Публичный DraftResponse не возвращает provider/model/usage;
management-доступа или новых stage-логов этого запроса нет. Точное соответствие
runtime-модели для этого request_id независимо не подтверждено; успешный HTTP-ответ
сам по себе его не доказывает. Проверить можно по безопасному stage-логу Render,
без ещё одного платного вызова и без публикации Environment/ключей.

Результат проверки: настоящие Supabase Auth → Render → сохранённый черновик,
не заглушка и не браузерная/телефонная приёмка. Деплой не выполнялся, общая БД
не очищалась, миграции/memberships не менялись. Следующий шаг — подготовка защиты
с этим правилом резервирования; текущая задача разрешала только одну пробу.

## 2026-10-17 — PR B #72: канонические рынки, кандидат API 0.6.3

Ветка backend/canonical-markets, Draft PR #72 поверх backend/public-localization
(PR #70, f2b662f964de133d20faf2d5d5afd8d797ac5ecf). Контракт опубликован до кода
в b5fb813: [LIVESTOCK_MARKETS_API](../../packages/contracts/LIVESTOCK_MARKETS_API.md).
Повторный fetch подтвердил main 86ca9af15017b163a9e47335c68eee46ac2fafde.
Проверенный код реализации — 5ff4b99; последующий commit исправляет только документацию.

Добавлены /livestock/markets, detail, optional market_id в listings/mine/prices
и ListingWrite. ID выбирается явно из verified registry; свободный market/market_key
сохраняется без сопоставления по имени. 0008 зависит от 0007: пустой registry
с RLS/revoke, nullable FK/index. Старые объявления, UUID/slug, Auth, customer ids/recovery,
AI и денежный журнал сохранены.

Отзыв проверки рынка скрывает public listings/detail/photos и цены; автор продолжает
видеть свои данные и приватные фото. Цены — целые тиыны за голову, без demo и неактивных
или просроченных объявлений. Нет выборки — null. Концепт mal-bazar не связан с рынком.
verification_note не выдаётся. Старый API игнорирует market_id: безопасный откат требует
отключения зависимого UI и защитного отказа либо forward fix. Связи не удалять.

Фактические проверки:
- **357 backend tests PASS** на отдельной PostgreSQL qadam_canonical_markets_test,
  loopback55432: полный набор, migrations/check/сохранность, fallback, registry constraints,
  фильтры/пагинация, Almaty-полночь, minimum/median, автор/чужие фото, старые fingerprint,
  конкурентное создание и конфликт другого market_id. JWT подписаны тестовым JWKS,
  AI/Storage заглушены. Это не live Supabase. Одна существующая Starlette/httpx warning.
- Ruff format/check и export PASS. OpenAPI, examples.json и generated.ts обновлены.
- **46 web tests PASS**: client/bindings/customer-ids-contract. Typecheck/lint/check:api/build
  PASS. Build предупреждает о большом 3D chunk и пустом auth chunk. Набор пересекается
  с PR A: числа не складывать.
- Flutter проверен по JSON parsers исходников. SDK, устройство и hosted-приёмка
  не выполнялись; UI вместо участников не реализован.

Команды: apps/api — uv run pytest -q с отдельной пустой TEST_DATABASE_URL,
uv run ruff check app tests migrations, uv run python -m app.export_contracts --check.
apps/web — npm run typecheck, npm run lint, npm run check:api, npm run build,
npm test -- src/test/client.test.ts src/test/bindings.test.ts src/test/customer-ids-contract.test.ts.

Передача web/Flutter — последний раздел контракта: lang=kk, market_id в query/body,
cache key и сброс cursor; не дописывать поля в старые pending retries.
Порядок: review A, затем B (после merge A перенаправить B в main), согласованный
backup/restore → 0007/0008 → backend/HTTPS-проверка → клиенты.
Переводы требуют языкового review и отдельного безопасного обновления учебных данных;
реальные рынки — проверки места.

**Опубликованный код, не deployment.** Render, Pages, shared Supabase0006, memberships,
Environment и production-данные не изменялись. Seed на общей БД не запускался.
Живых записей и платных AI-вызовов нет; main/deploy ветки не менялись.

## 2026-10-17 — PR A: публичные RU/KK варианты, issue69

Отдельная backend/public-localization от86ca9af. Контракт опубликован до кода,
commit9d100d6: [PUBLIC_LOCALIZATION_API](../../packages/contracts/PUBLIC_LOCALIZATION_API.md).
Nullable name/address_label/description_i18n, lang=ru|kk для public catalog и scoped/me;
без lang исходные поля сохранены, fallback по полю к исходной строке. UUID/slug,
Auth/ids/recovery/денежные правила не меняются. API-кандидат0.6.3, migration0007.

344backend PASS на отдельной loopback PostgreSQL qadam_public_localization_test:
upgrade/head/check/downgrade, сохранность данных, RU/KK/fallback/изоляция,
ограничения JSONB, dry-run/repeat-safe demo patch. Auth локально подписан, сервисы
AI/Storage в тестах заглушены; это не hosted-приёмка. Ruff/format/export PASS.
Web46client/bindings/ids тестов PASS; typecheck/lint/check:api PASS.
Flutter parsers проверены по коду (игнорируют дополнительные поля), SDK/device тесты
не повторялись. Web/Flutter владельцы добавляют lang в запрос/cache после rollout;
UI в этом PR не менялся. API0.6.2 без lang остаётся совместимым.

Предложения переводов явно reviewed=false: сначала языковой review, затем отдельный
план обновления известных неизменённых demo templates. Seed не меняется/не запускается.
Shared Supabase/Render/Pages/Environment/memberships не трогали, платных AI0.
PR B канонических рынков будет отдельным поверх A; его0008 зависит от0007.

## 2026-10-17 — зависимый frontend PR63/65 принят в отдельном кандидате

Проверенный application/build SHA **53ea0b9eb9013fd7826d3ece927a1428c1bd03fa**:
PR63 ae593c1 + PR65 559b4d0 поверх PR64/актуального main1a541ef и API f6b3a9a.
Backend/contracts побайтово сохранены. Hosted builder фиксирует public ids=true
после уже принятого HTTPS rollout; это не переключение production в данной задаче.

[Подробный review, доказательства, план выпуска и Safari](../CUSTOMER_IDS_FRONTEND_ACCEPTANCE.md).
378 unit, 6 history E2E, 5 recovery E2E, 18 synthetic microphone E2E PASS;
typecheck/lint/build/check:api PASS. Отдельный hosted build с входным false подтвердил
принудительное включение ids. Настоящие A/B Supabase+Render через локальный bundle:
имя/history/reload, фильтр+серверный баланс, RU/KZ360/390/1440, смена точки и foreign404 PASS.
Случай клиента51/гонки — fixtures; общую БД ради них не заполняли. Appwrites0/paidAI0.

Production Vercel пока **1a541ef**, event DvMb7zzTZjWX418eKdJLYVUCTjDf;
проверен по GitHub status и совпадению публичных asset bytes с сохранённой сборкой.
Кандидат публикуется в существующий Draft PR64, не в deploy. Render f6b3a9a не менялся,
новый dep-ID ожидается от капитана отдельно. APK не менялся.

#66 код a964646 есть в отдельном Vercel preview, отсутствует в production.
Новый head ca45a53 проверен: только уточнение двух документов, тот же код.
Капитан подтвердил Demo на iOS26/27: disabled запись/деньги ожидаемы по коду;
без обычного входа и повтора на физическом iPhone инцидент не закрыт.
Desktop WebKit: исходный тест focus 1PASS/2FAIL; исправленная keyboard/touch/Demo
обвязка 5PASS, component4PASS. Patch опубликован в отчёте, приложение #66 отдельно.
#43 новыйhead6ce3d29 и #67 остаются вне кандидата. Следующий шаг — согласованный
frontend release с подтверждением VercelSHA/ids GET, без нового Render rollout.

## 2026-10-17 — PR61 на Render: HTTPS ids/A-B PASS

Капитан подтвердил новый specific-commit Live **f6b3a9a94d8bf1c982344c05e0203dcb5bc6b8b5**
в панели srv-db95nfmk1f9s73fmnce0. Прежний Live: dep-db9lvsijnfac73cq11g0 / e699158.
Новый dep-ID не указан; публичный SHA независимо не извлекается. Отличать это
panel evidence от собственных HTTPS-проверок.

[Текущий отчёт и текст Бекзату](../CUSTOMER_IDS_RENDER_WINDOW.md),
[безопасный протокол](../qa/customer-ids/hosted-acceptance.json).
Health/OpenAPI200/API0.6.2 с ids, schema=f6b3a9a. JWT A/B /me200/6и3точки;
свои/смешанные UUID, повторы, foreign/missing, серверный баланс по журналу,
422 по6случаям для каждого владельца, legacy list/limit/cursor PASS.
Чужая точка404, без JWT401; все три CORS origins, включая Preview43, сохранены.
Никаких общих финансовых/клиентских записей, migrations/seed/memberships или paidAI.

Backend-зависимость frontend ids снята; PR65/новый web ещё требует отдельного
review и проверки имён после reload. Vercel/main/deploy-ветки/APK не менялись.
Откат до выпуска зависимого web: previousSHAe699158 через specific commit с текущим
env, не слепой Rollback старого env. После зависимого frontend сохранять ids-совместимость.
Ниже — история предыдущих проверок, в том числе первого Live без ids.

## 2026-10-17 — сообщён Live, но HTTPS ещё без ids

Капитан подтвердил прежний Live SHAe699158; новый SHA/обаdeploymentID уточняются.
После сообщения Live повторно проверен публичный OpenAPI:200/API0.6.2, только
q/limit/cursor. Уникальный cache-busting query + no-cache подтверждает старую схему,
не schemaf6b3a9a; cf-cache-statusDYNAMIC. Health200 и все три CORS GET/POST200 сохранены.
**Rollout PR61 не принят**, frontend ids не выпускать. Требуется checkoutSHA нового
Live; после появления ids выполнить готовый GET-only контрактный gate.
[Актуальный отчёт](../CUSTOMER_IDS_RENDER_WINDOW.md). Работающий сервер, данные,
memberships/финансы и Vercel агентом не менялись; paidAI0.

## 2026-10-17 — окно PR61 разрешено; ручной Render deploy и отдельный PR67

[Точные ручные действия, фиксация Live SHA/ID, HTTPS gate и уточнённый откат](../CUSTOMER_IDS_RENDER_WINDOW.md).
Разрешён только backend **f6b3a9a94d8bf1c982344c05e0203dcb5bc6b8b5**.
Management key/доступной панели Render у агента нет; текущий health не раскрывает SHA.
Предварительный реальный HTTPS: health/OpenAPI200 API0.6.2 **без ids**; A/B6/3,
own200/foreign404,anon401. Все три CORS origins, включая Preview43, GET/POST OPTIONS200.
Ожидаются прежний и новый Live deployment ID/SHA из панели и ручной exact-commit deploy.
Проверяющий GET-only сценарий ids/балансов/валидации/A-B подготовлен; post-Live PASS
и deployed SHA ещё не заявляются. Vercel, БД/memberships, финансы и paidAI не менялись.

Уточнение прежнего плана: Render Rollback берёт env целевого старого deployment.
Для сохранения текущего ключа/OpenAI/CORS использовать **новый specific-commit deploy
прежнего Live SHA с нынешним Environment**, а не слепую кнопку Rollback.

[PR67 review](../ANALYTICS_67_REVIEW.md): точный **8da93dc48ff998230212be4f31c32944a173f53b**;
347unit,3responsive/keyboard E2E, typecheck/lint/build/check:api PASS. Только локальные
fixtures/Demo; блокирующих дефектов не найдено. Backend и shared/format.ts не меняются;
перенос дат ожидает согласования Бекзата. Код67 не включён в эту ветку/окно/deployment.
Обнаружен PR65 **559b4d0** с зависимым ids frontend; не принимать автоматически.

## 2026-10-17 — совместная проверка PR61/63 без rollout

[Точные SHA, review и последовательность приёмки](../CUSTOMER_IDS_HISTORY_JOINT_REVIEW.md).
От main1a541ef в отдельной `integration/customer-ids-history` объединены
PR61 **735145e** (application **f6b3a9a**) и PR63 **ae593c1**. Application merge
**7107e446a700134b05d96c9638a477e72e5306e2**, без конфликтов; backend/contracts
побайтово равны PR61. Диагностикаe699158 и текущие интеграции сохранены.
Историю PR63 можно принимать независимо: она не требует ids. Имена вне первой
страницы ещё не подключены, три name-теста skipped; это отдельный блокер frontend.
Сначала backend/окно → HTTPS ids/A-B → новый зависимый frontend → имена/reload.
Main/deploy, Render/Vercel, memberships/данные и APK не менялись; paidAI не вызывался.
Проверки объединённой версии: [joint-checks.json](../qa/customer-ids/joint-checks.json).

## 2026-10-17 — review PR61 и подготовка окна Render

[Review, точные версии, frontend-зависимость, HTTPS gate и откат](../CUSTOMER_IDS_ROLLOUT_REVIEW.md).
Кандидат приложения: **f6b3a9a94d8bf1c982344c05e0203dcb5bc6b8b5**, от текущих
main/deploy **1a541ef**. Блокирующих дефектов не найдено; e699158 сохранён.
Повторно: **335 backend tests** на отдельной новой локальной PostgreSQL, Ruff/экспорт;
**346 web unit/component**, typecheck/lint/build/check:api — PASS. Наборы не суммируются.
Реальный текущий Render: health/OpenAPI200, версия0.6.2 **ещё без ids**; /me A/B200
с6/3точками, свои чтения200/чужие404, безJWT401, точный Vercel CORS и приватность PASS.
Никаких общих записей, memberships, миграций, paidAI или переключений сервера.

PR63 **ae593c1** пока не подключает ids: имена всё ещё с первой страницы; три
соответствующих теста skipped. Бекзату передать контракт и отдельный lookup без
q/cursor/limit; реализацию клиента не дублировать. Backend выпускается первым
после отдельного окна, затем живые read-only ids/A-B, затем принятый frontend
и имена после reload. До этого нельзя объявлять общий сценарий исправленным.
Откат после frontend не должен вернуть API, молча игнорирующий ids; подробности в review.
Membership-назначение капитану **отложено по последнему ответу**, ничего не менять.
Точный runtime SHA публично не доступен; e699158 — последнее подтверждение капитана
из панели, не новое независимое доказательство. Код/отчёт в GitHub, не новый deployment.

## 2026-10-17 — клиенты по ids, отдельный PR61

От актуального main **1a541ef** создана `backend/customer-ids`. Контракт опубликован
**до реализации** в commit **c5638f22d2ebe68d39171b2b7b7cb21de49394b5**:
[CUSTOMER_IDS_API](../../packages/contracts/CUSTOMER_IDS_API.md), [PR61](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/61).

- GET `/businesses/{id}/customers?ids=UUID&ids=UUID`: 1–100 исходных значений,
  дедупликация с сохранением первого порядка; полный Page с `next_cursor=null`.
- В режиме ids запрещены явно переданные q/cursor/limit. Пустые/невалидные значения
  и >100 возвращают422. Чужие и отсутствующие UUID одинаково пропускаются; без
  membership точки404, без JWT401. Ни одной строки другой точки, включая другую
  точку того же владельца. Без ids старые поиск, limit и cursor не меняются.
- Балансы — прежняя SQL-сумма журнала в тиынах, включая погашения/отмены; ограничены
  выбранной точкой/клиентами. Прежний CustomerResponse, без дополнительных полей.
  Ledger writes, Auth, customer POST/recovery, AI и миграции не менялись.
- Код: `apps/api/app/routers.py`, `services/ledger.py`, `app/examples.py`;
  `tests/test_customer_ids.py`; экспорт `openapi.json`, `examples.json`, generated.ts.

Проверки: **335 backend tests PASS**, из них **19 новых cases ids** (входят в335).
Команда `python -m pytest -q --tb=short`, локальная PostgreSQL127.0.0.1:55432,
отдельная новая пустая база `qadam_customer_ids_*_test`. Общая Supabase не использовалась.
Проверены смешанные UUID,100 результатов за пределами первой страницы,101 до
дедупликации, порядок/повторы, пустой/невалидный ввод, q/cursor/limit,401/404 и отзыв
membership, серверный долг200000→150000→200000→0, совместимость прежнего поиска/cursor.
Реальная PostgreSQL + HTTP TestClient + тестовые подписанные JWT/JWKS; **не живая
приёмка Render/Supabase**, платные AI не вызывались. Starlette выдаёт одно существующее
deprecation warning по httpx TestClient, тесты не пропущены.

`ruff check .`, форматирование изменённых Python, `app.export_contracts --check` — PASS.
Web: `npm ci --no-audit --no-fund`, `npm run generate:api`, `npm run typecheck`,
`npm run check:api` — PASS. Runtime frontend не менялся, поэтому browser/unit web
набор заново не заявляется. Первый инфраструктурный запуск остановлен из-за зависшего
помощника запуска PostgreSQL; завершённый прогон использовал уже доступный loopback
сервер и отдельную новую БД. Остановлен только собственный Python launcher, не API.

**Статус:** код/контракт опубликованы в отдельном Draft PR; main, deploy-ветки и Render
не переключались. API версия0.6.2 остаётся; наличие ids проверять по OpenAPI и согласованному
deployed SHA, старый сервер игнорирует неизвестный query. Миграций не требуется.

Следующий шаг Бекзату: запросить ID из строк долгов повторяющимся ключом, группами≤100,
не добавлять q/cursor/limit, пустой набор не отправлять; map по UUID, кэш/AbortSignal по
user+business. Нет найденной строки — нейтральное имя, а не чужие данные. Включать только
после отдельного согласованного backend rollout. Регистрацию/назначение membership
своему аккаунту эта задача не выполняет. Секреты/личные учётные записи в PR не добавлялись.

## 2026-10-17 — интеграция следующего видимого выпуска

По поручению капитана подготовлен [общий кандидат](../LATEST_VISIBLE_RELEASE.md):
новая аналитика `3064294`, transport-защиты заявки и ссылка на тестовый APK0.3.0.
346 unit/29 E2E и сборочные проверки PASS. Backend, БД, секреты и платные AI не
затрагивались. Проверено 70 опубликованных веток; PR43/email и PR53/SDK+Android
оставлены отдельными. Следующий шаг — подтверждение Vercel после продвижения refs.

## 2026-10-17 — интеграция PR47/49/52 без изменения backend

От ad63a00 проверены точные heads d010f5e / 674e5d7 / 565e17d; отдельная ветка integration/abzal-public-catalog. InquiryForm (включая unknown→4xx/Unicode), customer recovery, Auth, API0.6.2/e699158 и GLB сохранены побайтово. [Полный отчёт и публикация](../ABZAL_PUBLIC_RELEASE.md). 336 unit/component; typecheck/lint/build/check:api; recovery5, QA21, voice1, microphone18, general24, Auth7 — PASS, наборы не суммировать. Настоящие Supabase/Render A/B, read-only recovery/inbox/каталог/аналитика и9hotspots на360/390/1440 прошли в кандидате; новая запись не создавалась. Использована заявка e77aa7d2-1799-4139-be37-728642d0925d. Backend/БД/миграции/Render не менялись. Следующий шаг — подтверждение production SHA/повтор read-only после Vercel, затем физическая приёмка команды; регистрация/mobile отдельно.

## 2026-10-17 — следующая интеграция публичной заявки

От main8ee78ae, без повторного PR41/42: выборочный перенос формы e6c9dd, реальное имя ShopPage, защита unknown→4xx сохраняет key/body, смена магазина изолирует late response. Отдельный public-inquiry.md по поручению капитана, public-web.md не заменён. Apps/api/OpenAPI/AI/recovery/аналитика/GLB не менялись, Render не перезапускается.

333unit/component, typecheck/lint/build/check:api PASS; recovery5/QA21/voice1/microphone18/general24/Auth7 PASS с заглушками (пересечения). Один устаревший E2E-selector формы обновлён, повтор прошёл. Живой кандидат с real Supabase/Render: hotspot→магазин→POST→локально потерянный ответ→тот же intent→та же квитанция; inboxA/foreignB404. Заявка e77aa7d2-1799-4139-be37-728642d0925d, точкаad6203bc-7320-5b36-982b-135504c5af68. Денег/AI/миграций/seed/cleanup0.

[Review, rollout и ограничения](../INQUIRY_RELEASE_REVIEW.md). PR43 eba0f91 не содержит согласованный callback, оставлен отдельно; текущие public Auth flags сняты read-only, Site URL/allowlist не видны без администратора. PR45 cbb4d0c: APK0.2.2+5/source96ef1c4 скачан, SHA/config проверены; устройство ожидается, APK не собирался. Ссылка витрины ведёт на новый test release. Новые721da4e/PR46 и d010f5e сравнили, whole-branch не добавляли; следующий шаг владельцам — сверка с выпущенной формой и отдельная приёмка их оставшихся изменений.

## 2026-10-17 — совместная приёмка PR42 recovery + PR41 polish

От свежего main9845b91 в отдельной `integration/recovery-polish-062` объединены remote heads **2058b91** и **7d84cb6**, production-код merge **539bee6**. Пересечения Customers/test прочитаны: сохранены compare-and-clear, owner/session guards, Web Locks и полировка без UUID. Исправлен один тестовый селектор имени; приложение ради теста не менялось. API0.6.2/OpenAPI/generated/Auth/GLB/Flutter сохранены; apps/api равен e699158.

**Собственные проверки:** полный319unit/component PASS, typecheck/lint/build/check:api PASS; Chrome recovery5, QA21, Voice1, microphone18, General24, Auth7 PASS (пересечения, синтетические API/audio). Asset validator0errors/warnings. LateK1/K2 и вкладки проверены изолированно, без лишних записей общейБД.

**Живое:** candidate dist подставлен только в тестовом браузере на разрешённом Vercel origin, настоящий Supabase+Render. LoginA6, UI customerPOST201→локально потерянный ответ→unknown→GETcompleted→явный samekey/body replay201→ровно1клиент; reload/возвратA восстанавливают receipt; смена точки/logoutB3/foreign404 PASS. Первый harness ошибся с точкой после полной навигации, затем с подписью поиска; продолжение только по исходному key/body/receipt. Клиент **f02abd40-6356-47e3-9c31-7f8268b981f1**, точка **2c234f1c-2c79-5e3a-ab77-042e3da4dafa**, явно учебное имя. Денег/AI/миграций/seed/очистки нет.

PR43 **eba0f91** исключён. [Контракт регистрации](../../packages/contracts/REGISTRATION_CALLBACK.md): единый Supabase, PKCE `/auth/callback`, точные URLs, ошибки/повтор/другой браузер, `/me` с0точек. Это передача владельцу frontend; настройки Auth не применены, email-приёмка отдельно.

[Полный отчёт и откат](../RECOVERY_POLISH_RELEASE.md). Предыдущий Vercel deployment vF1TeDmkSY815MSLvgUSSSGdE1hU/9845b91 сохранён. Капитан разрешил обновить main/deploy refs после приёмки; Render auto-deploy off, неизменный backend не перезапускается. Deployed SHA подтверждается после push. Flutter получает прежнийAPI0.6.2; APK/телефон не проверены. Старый audio incident открыт.

## Повторная сверка опубликованных изменений — 2026-10-17

По поручению капитана проверены свежие remote heads после общей базы 07197be. Включён PR40 `6e8fc5d`: только [предложение RU/KZ-названий](../DEMO_NAMES_RU_KZ.md), без изменения данных, seed, API или интерфейса. Регистрация `6f80867` подтянула main, но callback по-прежнему не реализован (`detectSessionInUrl: false`, redirect ожидает согласования); остаётся вне production. Recovery `9a3c868` не обновлён, прежний блокер сохраняется. Flutter `421b2fb`, AI `7c19a22`, модели `996a1b4` не изменились. Полировка продажи/долгов ещё не опубликована и не может быть перенесена с компьютера автора.

Интеграция выполняется в отдельной ветке `integration/team-update-20261017`; обычный push синхронизирует main/deploy-062/deploy/permanent-062. Проверки этого этапа: review единственного нового документа, отсутствие изменений apps/packages/render.yaml относительно 07197be, git diff --check. Повторные тесты приложения не нужны для документационного изменения. Runtime Render e699158, БД и настройки не переключаются. Слияние таблицы не является утверждением переводов или разрешением миграции общей БД.

## Общая интеграция 2026-10-17

По поручению капитана подготовлена база main/deploy из PR39 `8be10b3` и Flutter PR25 `421b2fb`. [Точный состав, проверки и ограничения](../MAIN_RELEASE_20261017.md). Backend побайтово совпадает с e699158: повторный rollout Render/миграции не нужны. Web совпадает с production a8e358f. Recovery UI 9a3c870 и signup PR31 остаются исключёнными до исправлений/приёмки. Исторические разделы ниже не определяют текущую ревизию.

Роль: капитан, весь backend. Обновлено: 2026-10-15. Ручной этап `backend/ledger-auth` сохранён коммитом `78483b8`, интеграция с опубликованным bootstrap — `193f6e5`; ветка запушена, открыт [PR #4 в main](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/4), без слияния. Исходная `0001_catalog` сохранена из main (`ced32e7`, PR #2), тесты каркаса сохранены и адаптированы. Текущая ветка `backend/ai-drafts` основана на head PR журнала. Актуальный результат AI-этапа и следующий шаг — в последней секции этого файла. Ни merge, ни деплой не выполнены.

## Сделано в ручном этапе (PR #4)

- При начале задачи исходники первого этапа отсутствовали в checkout (сохранились только окружение/кэши), рабочая ветка содержала документацию. Восстановлен один каркас `apps/api`, без параллельного приложения.
- FastAPI, Python 3.12, Pydantic 2, SQLAlchemy 2/Alembic/PostgreSQL, фиксированные зависимости `uv.lock`, настройки, health, единые ошибки и CORS. Health не обещает готовность внешних сервисов.
- Supabase JWT через PyJWT/JWKS: ES256/RS256, issuer/audience, срок, subject UUID, роль authenticated; anonymous/service-role/невалидные токены не допускаются. Все закрытые методы используют токен, все запросы к точке проверяют memberships; чужие сущности дают 404.
- `/api/v1/me`; получение/создание клиентов с остатками; ручная продажа, частичное погашение; история и открытые продажи с ограниченной keyset-пагинацией; итог дня `Asia/Almaty` и текущий долг; идемпотентная отмена ошибочной записи.
- Одна транзакция на денежную запись и запись идемпотентности. Порядок блокировок: membership FOR SHARE, business FOR UPDATE, исходная sale FOR UPDATE при погашении/отмене. Переплата исключается пересчётом под блокировкой. Повтор возвращает прежнюю операцию и исходный JSON-ответ; другой payload/action с тем же ключом — 409.
- Миграции `0001_catalog`, `0002_ledger`: восемь таблиц в закрытой `qadam`, составные FK принадлежности, ограничения денег, уникальность ключей/отмен, trigger запрета UPDATE/DELETE журнала. AI-таблица добавлена следующим этапом, см. ниже.
- Повторяемый seed: 3 площадки, 9 точек, 9 товаров, 9 учебных клиентов. Реальные владельцы привязываются только после проверки их Supabase access token и совпадения subject. Старые синтетические owner memberships удалены только у учебных точек; новые не создаются.
- Реальные владельцы Supabase привязаны: A — 6 точек, B — 3. Live smoke сохранил явно учебные продажу 3000 ₸/оплату 1000 ₸ и доплату 500 ₸. В точке `mart-demo-clothes` итог: продажи 300000, поступления 150000, долг 150000 тиынов. Две строки остаются для демонстрации; повторы не добавляют их снова.
- OpenAPI и примеры экспортированы, README запуска и общий контракт уточнены. Frontend и чужие handoff-файлы не менялись.

## Файлы и интерфейсы

- `apps/api/app/auth.py`, `config.py`, `db.py`, `main.py` — авторизация, подключения, приложение и ошибки.
- `apps/api/app/routers.py`, `services/ledger.py`, `models/__init__.py`, `schemas/__init__.py` — маршруты, транзакции, модели и схемы.
- `apps/api/migrations`, `app/seed.py` — миграции и проверенная привязка владельцев.
- `apps/api/tests` — JWT/JWKS, PostgreSQL, API, гонки, откат, контракты.
- `apps/api/scripts/with_env.py`, `scripts/smoke_manual.py` — выбор игнорируемой конфигурации и live demo smoke.
- `apps/api/README.md`, `packages/contracts/{openapi,examples,demo-seed}.json` — запуск и передача frontend. Экспорт не содержит memberships, реальных пользователей или секретов.

Контрактные уточнения ручного этапа отражены в [API](../team5/02_ARCHITECTURE_API.md) и `docs/DECISIONS.md`: лимит 100 млн ₸, схемы клиента/открытой продажи/отмены, курсоры, статусы 200/201, `customer_balance_minor=null` без клиента, сохранённый ответ идемпотентности. Потребителей frontend в checkout пока нет. Публичные методы и заявки не реализованы. Поддержка ненулевого `draft_id` добавлена AI-этапом ниже.

## Проверки

Все команды ниже из `apps/api`, Python 3.12.14. Cache/install Python находятся в игнорируемом `tmp/`.

- `uv sync` / `uv sync --locked` — зависимости установлены и закреплены.
- `.venv/Scripts/python scripts/with_env.py .env.local-postgres -m pytest -q` — **101 passed** после интеграции тестов bootstrap из main (до интеграции 45), без skipped. Есть одно deprecation-предупреждение Starlette о TestClient/httpx; ошибок нет. Использован настоящий PostgreSQL 17.11, не SQLite. Тестовый JWT подписывается ES256 и проверяется через HTTP JWKS; production auth dependency не подменяется.
- Проверены: 300000−100000=200000; доплата 50000 → долг150000 без роста продаж; повтор после COMMIT; одновременный одинаковый ключ; два одновременных погашения 100000 при долге150000 → один200/один409, долг50000; изоляция A/B и подмена customer/sale/cursor; откат операции и идемпотентности при внедрённом сбое; отмены и неизменность журнала; местная полночь; повтор seed, FK и денежная валидация.
- `.venv/Scripts/python -m ruff check app tests scripts migrations`, `ruff format --check app tests scripts migrations` — успешно.
- `.venv/Scripts/python -m app.export_contracts` и `--check` — экспорт актуален, примеры валидируются, ссылки OpenAPI разрешаются, закрытые методы имеют Bearer security.
- Локальная demo: `python scripts/with_env.py .env.local-postgres -m alembic upgrade head`, затем `alembic check` — применено, расхождений нет; `app.seed --demo` выполнен дважды.
- Supabase demo: проверены подключение, версия17.11, `alembic upgrade head`, `alembic check`, два последовательных seed в транзакциях. Ревизия `0002_ledger`, 3 площадки/9 точек/9 товаров/9 клиентов/9 memberships; права USAGE на `qadam` у anon/authenticated — false. Разрушающие тесты сюда не направлялись.
- `.venv/Scripts/python -m app.seed --demo --bind-owners` — реальные JWT проверены, привязка успешна.
- `.venv/Scripts/python scripts/smoke_manual.py --demo` — **PASS** на настоящих Supabase JWT и PostgreSQL: `/me`, собственные данные, чужие404, аноним401, продажа, доплата, оба повтора и summary300000/150000/150000.
- Отдельный процесс Uvicorn на `127.0.0.1:8766`: реальные HTTP health/docs/OpenAPI200, анонимный `/me`401, `/me` с настоящим Supabase-токеном200 (6 точек). Проверочный API-процесс остановлен.
- `git diff --check` и проверка игнорирования `.env*`, `.venv`, `tmp` — успешно; секреты не включены в экспорт/исходники.

## Зависимости и ограничения

Supabase demo и два реальных пользователя настроены, реквизиты только в игнорируемом `apps/api/.env`. Короткоживущие demo-токены требуют обновления обычным входом после истечения срока; API не использует постоянный обход авторизации. JWKS имеет ES256. `TEST_DATABASE_URL` в Supabase `.env` намеренно пуст.

Выделенная локальная PostgreSQL работает на `127.0.0.1:55432`; `.env.local-postgres` содержит отдельные `qadam_demo`/`qadam_test`. Бинарники/данные — в `tmp/postgres` и `tmp/qadam-pgdata-ledger`, в Git не входят. Windows sandbox не позволял pg_ctl запустить процесс; он запущен через разрешённое повышение доступа. На другой машине нужен свой PostgreSQL. Полный pytest по умолчанию без TEST_DATABASE_URL пропускает интеграционные тесты; команда выше явно подключает отдельную тестовую БД.

В PR #4 AI ещё не было; текущая реализация описана ниже. Не реализованы публичный каталог/витрина, HTTP-заявки, rate limiting этих будущих методов, frontend-интеграция и деплой. Счётчик заявок читает реальную таблицу, в demo он0. Записи одной точки сериализуются — сознательный предел производительности MVP. API не выполняет обновление Supabase-сессии и не проверяет онлайн отзыв уже выданного JWT до его истечения.

## План после ручного этапа (история; актуальный план ниже)

1. Передать frontend OpenAPI и подключить ручную форму/клиентов/историю к Bearer API; сохранять Idempotency-Key при сетевом повторе.
2. Следующий backend-этап — AI-адаптер и черновики: отдельная таблица, автор/точка/TTL/однократное потребление в транзакции подтверждения. Не менять уже проверенный путь ручного ввода.
3. После этого публичные каталоги/заявки и деплой; проверять HTTPS и полноценный пользовательский сценарий. Опубликовать текущую ветку через PR по решению капитана.

## Журнал параллельной настройки Supabase

Ниже сохранены записи владельца настройки по ходу работы. Отметки ожидания/нулевых memberships и следующего шага в них исторические; актуальный результат ручного учёта и отдельной тестовой PostgreSQL описан выше.

## Supabase environment — 2026-10-15

В этом checkout подготовлен игнорируемый `apps/api/.env` для отдельного проекта `qadam-demo`: Session pooler PostgreSQL (SSL required), Supabase URL, issuer, audience и локальные origins Vite. Пароль базы пока заменён заглушкой; подключение к PostgreSQL и миграции не выполнялись. TEST_DATABASE_URL оставлен пустым: нельзя направлять разрушающие тесты в demo-базу.

Проверка текущим Python окружением: Settings принимает файл; публичный JWKS возвращает HTTP 200 и ключ ES256, совместимый с текущим backend. Пользователи Auth и DEMO_OWNER_* ещё не настроены. Следующий шаг: владелец локально добавляет пароль, затем проверка SELECT 1, проверенные миграции и создание двух demo Auth пользователей с привязкой seed. Секреты в handoff не записываются.

### Supabase connection and migrations verified

Password supplied locally by owner; SELECT 1 succeeded against qadam-demo. Applied Alembic upgrade head (0001_catalog, 0002_ledger) and app.seed.seed without owner binding. Verified revision 0002_ledger; counts: venues 3, businesses 9, catalog_items 9, customers 9, memberships 0, operations 0. has_schema_privilege USAGE on qadam is false for both anon and authenticated. No destructive tests run against demo database. Auth users still pending; browser form prepared for owner-a@example.test; second intended account owner-b@example.test. Next: user creates passwords/accounts, then obtain verified short-lived tokens locally and run seed --demo --bind-owners. No secrets committed.

### Auth accounts checked

Both owner-a@example.test and owner-b@example.test exist in auth.users with confirmed email and distinct IDs. Password login and membership binding await local password entry via outputs/connect-demo-owners.py (outside repository). Helper uses Supabase password grant, verifies real JWTs, calls existing verified_owners + seed, saves only short-lived tokens/subjects to ignored .env, checks /me, own customers, cross-owner access and anonymous 401 using FastAPI TestClient against real PostgreSQL. Helper syntax/imports checked; live login checks not yet executed. No memberships created in this step.

### Текущий итог Supabase/Auth: PASS

Предыдущие отметки ожидания паролей и привязки выше закрыты. Пользователь выполнил outputs/connect-demo-owners.py; локальный demo-auth-result.json подтверждает status=passed. Реальный вход обоих пользователей и проверка JWT успешны; A привязан к 6 магазинам, B к 3. Проверены /me и чтение своих клиентов через FastAPI TestClient с настоящей БД, без подмены авторизации. Без токена /me возвращает 401; доступ к чужим клиентам в обоих направлениях — 404. UUID и краткоживущие access tokens сохранены только в игнорируемом apps/api/.env; пароли пользователей скрипт не сохраняет.

Настройка demo PostgreSQL и Auth завершена. Это не проверка браузерного frontend или полного денежного сценария. Следующий этап: отдельная тестовая PostgreSQL для транзакционных тестов журнала, затем интеграция frontend; TEST_DATABASE_URL пока пуст. Истёкшие demo токены требуют повторного входа, постоянными ключами они не являются.

## Реализация AI-этапа — 2026-10-15, `ad107f5` (итог интеграции ниже)

### Сделано и границы публикации

- Завершённый журнал проверен на секреты, сохранён, запушен и передан через [PR #4](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/4): head `backend/ledger-auth`, base `main`, последний commit `193f6e5`. Слияние не выполнялось. Новая AI-ветка основана на этом commit; её изменения не добавлены в PR #4.
- `app/services/ai.py`: серверный Gemini REST `generateContent`, фиксированный Google endpoint, ключ в заголовке, Pydantic JSON Schema и повторная валидация ответа. Модель не получает UUID/список клиентов/балансы/токены, не имеет tools или доступа к БД. Суммы — строго целые тиыны; неясная оплата/сумма остаётся null. Проверяется наличие текстовых свидетельств в исходной фразе/транскрипте. Это дополнительная проверка формы ответа, не доказательство правильного понимания речи.
- `app/draft_routes.py`, `services/drafts.py`: авторизованный multipart `POST /api/v1/businesses/{id}/drafts`, ровно text либо audio, locale ru/kk/auto; сквозной лимит тела, до 4000 символов текста. Кандидаты клиентов/продаж берутся только из выбранной точки, до 20; одинаковые/неизвестные имена требуют выбора, погашение всегда требует выбора продажи. Уточнения RU/KZ в `missing_fields`/`questions`. Membership проверяется до и после AI; во время вызова провайдера SQL-транзакция и соединение не удерживаются.
- `app/services/audio.py`: проверка MIME/реального контейнера, размера 8 MiB и декодированной длительности 30 секунд. WAV, WebM/Opus, Ogg/Opus, MP3, M4A/MP4, FLAC → PCM WAV 16 kHz mono. Только разрешённые demuxers, запрещены playlist/удалённые ссылки. PyAV 17.1.0 из locked wheel, отдельный FFmpeg CLI не нужен. Аудио не сохраняется после запроса; Files API не используется.
- `models.Draft`, `0003_drafts`: приватный JSON черновика, author `created_by`, business, время PostgreSQL, TTL 30 минут, ссылка на операцию потребления с tenant FK. Миграции 0001/0002 сохранены. `services/ledger.py` добавляет только проверку/блокировку/потребление draft к прежней транзакции: membership → business → draft → sale. Денежные формулы, ограничения и отмены не изменены.
- Подтверждение идёт через существующий POST operations и конечные поля продавца. Чужой draft/автор/точка — 404; истёкший — 409 `DRAFT_EXPIRED`; использованный с новым ключом — 409 `DRAFT_USED`. Исходный ключ/тело повторяет прежний ответ даже после TTL, с проверкой автора. Ошибка/rollback не потребляет draft. Ручной ввод с `draft_id=null` остаётся независимым от AI.
- Общий timeout 25 секунд включает один повтор невалидного JSON/схемы. Сеть/HTTP/квота не повторяются автоматически. Ошибки 503 `AI_UNAVAILABLE`, 504 `AI_TIMEOUT`; без мока и без записи денег. UI сохраняет введённые данные и открывает ручную форму. Для выбранной Flash установлен thinking level low, общий deadline не увеличен.
- Обновлены OpenAPI, валидируемые примеры успешного/неясного/repayment draft, подтверждения и ошибки, API README, общий контракт, DECISIONS и сводка состояния. Frontend-файлы и чужие handoff не менялись. `scripts/smoke_ai.py` запускает явно запрошенный live разбор без БД и без вывода ключей.

### Фактические локальные проверки (Gemini заменён заглушкой)

Команды из `apps/api`:

```powershell
.venv/Scripts/python scripts/with_env.py .env.local-postgres -m alembic upgrade head
.venv/Scripts/python scripts/with_env.py .env.local-postgres -m alembic check
.venv/Scripts/python scripts/with_env.py .env.local-postgres -m app.seed --demo
# Та же команда seed выполнена второй раз.
.venv/Scripts/python scripts/with_env.py .env.local-postgres -m pytest -q --tb=short
.venv/Scripts/python -m ruff check app tests scripts migrations
.venv/Scripts/python -m ruff format --check app tests scripts migrations
.venv/Scripts/python -m app.export_contracts --check
```

Результат: **162 passed**, без skipped, PostgreSQL 17.11; одно deprecation-предупреждение Starlette TestClient/httpx. Ruff и экспорт актуальны. Локальная demo-БД обновлена до `0003_drafts`, `alembic check` не обнаружил drift, двойной seed успешен. Отдельная пустая `qadam_test` использовалась для upgrade/check/downgrade и очищалась только защитной fixture; Supabase не очищался и не мигрировался на этом AI-этапе.

Проверены прежние денежные сценарии (3000−1000=2000; +500 → долг1500 без увеличения продаж; concurrent repayment; idempotency; изоляция A/B; reversals) и новый путь: создание draft без operations/idempotency; 30-минутный TTL; чужая точка/автор, в том числе совладелец; неизвестный UUID; повтор с тем же и новым ключом; две конкурентные попытки потребления; недопустимое исправление; rollback после пометки потребления; отзыв membership во время AI; уточнение неизвестной оплаты/двух имён/неизвестного клиента; scoped sale candidates; общий deadline и отмена async-запроса; повтор JSON ровно один раз; API-ошибки не раскрывают сообщения провайдера; ручная операция после отказа AI.

Аудиотесты реально кодируют/декодируют синтетическую тишину в WebM, Ogg, MP3, M4A/MP4, FLAC и WAV. Проверены неверный MIME, повреждённые данные, playlist, лишние/дублирующие поля, URL вместо файла, 31 секунда, размер и лимит всего тела. Эти тесты проверяют pipeline, **не качество распознавания речи**.

`git diff --check` и поиск значений локальных паролей/API key/access tokens по versionable файлам успешны. `.env`, `.env.local-postgres`, временные инструменты, аудио и данные PostgreSQL игнорируются Git. В `.env` по поручению владельца изменён только `AI_MODEL`; ключ, DB URL, Supabase-параметры и токены не перезаписаны и не выводились.

### Живой Gemini — отдельно от тестов

- `GET /v1beta/models` с предоставленным локально ключом вернул 200. Выбран точный `AI_MODEL=gemini-3.6-flash`, стабильная Flash с audio input и structured output по [официальному описанию](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash). `gemini-3.8-flash` при проверке отвечала 503/high demand. Пробный старый 3.5 alias отвечал 200, но документация сообщает перенаправление на 3.6, поэтому alias не оставлен в конфигурации. Платный тариф/биллинг не подключались; численные квоты проекта не измерены.
- По ходу live прогонов успешно проверены **11 уникальных текстовых fixture**: `ru01–ru08`, `kk01`, `kk02`, `mix01`. Подтверждены 300000/100000, полная оплата, явный долг=0 оплаты, частичное погашение, неизвестная сумма/оплата=null, запрос неизвестного типа и смешанная фраза. `ru08` после первоначального отказа отдельно вернул валидный unknown; `kk02` после отказа отдельно вернул 200000/200000.
- Полный непрерывный набор **20/20 не пройден**: прогоны останавливались на временной недоступности (`ru08`, `kk02`, `kk03`) и timeout (`ru04`; повторный отдельный прогон прошёл). Остальные KZ/mixed-фразы не считаются проверенными. Сбои показаны как ошибки, не заменены заготовкой.
- Живое аудио: локально синтезирован WAV голосом Windows Microsoft Irina (RU), фраза «Продал товар на три тысячи тенге, покупатель оплатил полностью». `smoke_ai.py --live --audio ../../tmp/ai-synthetic-ru.wav --expected-total-minor 300000 --expected-received-minor 300000` → PASS, kind sale, непустая транскрипция, обе суммы 300000. Файл только в игнорируемом `tmp`. Это **синтетическая русская речь**, не голос продавца/телефон/шум рынка; KZ-аудио пока не проверено.
- Live прогоны проверяли извлечение без БД. HTTP→авторизация→draft→подтверждение→журнал проверен отдельно на реальном локальном PostgreSQL с заглушкой Gemini. Совместный живой Gemini+Supabase/frontend сценарий ещё не выполнен.

### Оставшиеся ограничения и следующий шаг

1. Review и ручное слияние PR #4 выполняет капитан. AI-ветка зависит от него; перед её отдельной публикацией сверить новый main и контракт. Автослияние не включать.
2. Повторить оставшиеся 9 текстовых fixture после стабилизации провайдера, записать реальные короткие RU/KZ-аудио с телефона и проверить суммы/неясности с носителем языка. Текущие live результаты не гарантируют качество всех будущих фраз.
3. Для запуска AI на Supabase применить **только новую добавочную `0003_drafts`** отдельным release-step после review. Сейчас Supabase на `0002_ledger`; `.env` сохранён. Очищающие pytest туда не направлять. Затем проверить live draft без записи, отдельное подтверждение и повторы с реальными владельцами/обновлёнными access tokens.
4. Передать frontend обновлённые OpenAPI/примеры: хранить форму при 503/504, показывать вопросы/кандидатов, отправлять выбранные поля с draft_id и стабильным Idempotency-Key; ручной путь сохраняется. Реальной интеграции UI/телефона/деплоя пока нет.
5. Просроченные drafts остаются в БД; плановая очистка/политика хранения и лимит частоты AI-запросов пока не реализованы. Кандидаты ограничены 20 и буквальным поиском; для полного списка пользоваться GET. Следующий функциональный backend-этап — публичный каталог и заявки, затем общий пользовательский сценарий и HTTPS-деплой.

## Актуальная интеграция AI + Supabase — 2026-10-15

### Review и локальные тесты

Проверен `ad107f5f7e883a8a1e7bf8e95d5c270aa74be071`: `0003_drafts`, модели, маршруты, авторизация, создание/подтверждение, тесты. Дефектов в проверках прав, TTL и транзакции потребления не обнаружено; изменения runtime-кода и миграции не потребовались. Денежные правила и функциональность не расширены. Исправлены устаревшие сообщения README/сводки о неприменённой Supabase-миграции и неподтверждённом полном сценарии.

- `draft_id` ищется по id + business + created_by под блокировкой до возврата идемпотентного ответа. Даже совладелец не подтверждает/повторяет чужой draft. При создании membership проверяется повторно после Gemini.
- Срок 30 минут задаётся по `clock_timestamp()` PostgreSQL. Проверка времени выполняется после ожидания бизнес-блокировки, чтобы просроченный в очереди запрос не прошёл.
- При новом ключе consumed draft даёт 409; при исходном ключе/теле возвращается прежний ответ. Для разных ключей блокировки business/draft предотвращают вторую операцию; одинаковый ключ при гонке возвращает один ответ обоим запросам.
- INSERT operation, UPDATE consumed_operation_id и INSERT idempotency_records выполняются одной SQLAlchemy-транзакцией. HTTP-успех — только после COMMIT. Тест перед COMMIT подтвердил откат всех трёх изменений.
- В миграции проверены tenant FK, unique consumed_operation_id, expiry constraint, индексы, REVOKE PUBLIC/anon/authenticated. Прямые Supabase Data API роли не получают доступ к draft.

Добавлены три содержательные проверки в `apps/api/tests/test_drafts.py`: гонка с одинаковым ключом, ошибка непосредственно перед COMMIT после flush всех трёх записей, истечение срока во время ожидания business lock. Команды из `apps/api`:

```powershell
.venv/Scripts/python scripts/with_env.py .env.local-postgres -m pytest tests/test_drafts.py tests/test_ledger.py tests/test_postgres.py -q --tb=short
.venv/Scripts/python scripts/with_env.py .env.local-postgres -m pytest -q --tb=short
.venv/Scripts/python -m ruff check app tests scripts migrations
.venv/Scripts/python -m ruff format --check app tests scripts migrations
.venv/Scripts/python -m app.export_contracts --check
```

Результат: **36 targeted passed, 165 total passed**, без skipped, одна прежняя deprecation Starlette/httpx. Ruff и экспорт успешно. Настоящая локальная PostgreSQL 17.11; Gemini в pytest — заглушка, JWT подписаны тестовым ключом и проверены через JWKS. На Supabase pytest/очистка не выполнялись.

### Применение миграции на qadam-demo

После локальных проверок выполнен `alembic upgrade 0003_drafts` через проверяющий локальный скрипт с контролем project reference и revision. Переход **0002_ledger → 0003_drafts** подтверждён. До/после миграции одинаковые количества: operations 2, idempotency_records 2, memberships 9, customers 9. Миграция добавочная; никаких truncate/delete/downgrade на Supabase.

Проверены эффективные права: у `anon`/`authenticated` нет USAGE схемы `qadam` и ни одного из SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER на `qadam.drafts`; PUBLIC grants отсутствуют. Контрольная сумма `.env` до и после миграции совпала; ключи/токены не выводились, файл не переписывался.

После применения `.venv/Scripts/python -m alembic check` на Supabase завершился успешно: `No new upgrade operations detected.`

### Живой Gemini и полный HTTP-сценарий

`apps/api/scripts/smoke_draft_flow.py --demo` запустил собственный Uvicorn на случайном loopback-порту. Запросы прошли через настоящий HTTP, штатную авторизацию, настоящие Supabase PostgreSQL/JWKS и **живой `gemini-3.6-flash`**; ни auth, ни Gemini, ни БД не подменялись.

1. Оба JWT действительны и соответствуют реальным subjects: A — 6 точек, B — 3; аноним получает 401. B не создаёт/не подтверждает draft в точке A — 404.
2. В `mart-demo-food` текст «Продал товар на 3000 тенге, Демо Асқар заплатил 1000 тенге, остальное в долг» дал sale, `total_minor=300000`, `received_minor=100000`, кандидата учебного клиента. До подтверждения количество operations и summary не изменились.
3. Скрипт отдельно подтвердил проверенные учебные поля с фиксированным `Idempotency-Key=ai-integration-2026-10-15-sale`. В журнале появилась **ровно одна** строка «Учебная AI-проверка интеграции 2026-10-15», draft consumed_operation_id указывает на неё, автор/точка совпадают.
4. Повтор того же ключа/тела вернул идентичный ответ; новый ключ для consumed draft дал **409 DRAFT_USED**. В истории запись одна. Summary точки: sales_minor **300000**, receipts_minor **100000**, outstanding_minor **200000**.

Команда: `.venv/Scripts/python scripts/smoke_draft_flow.py --demo` → **PASS, live-full-flow**. Скрипт оставляет учебную запись в demo и ничего не удаляет. Повторный запуск восстанавливает исходный draft по сохранённой операции и проверяет идемпотентность без повторного вызова Gemini; такой результат помечается `replay-only`.

Второй запуск с новым процессом API также фактически выполнен: **PASS, replay-only**, итоги не изменились, второй продажи нет.

Это отдельный живой интеграционный результат, а не один из 165 тестов с заглушкой. Предыдущие 11 RU/KZ/mixed-текстов и синтетическое RU-аудио остаются результатами этапа реализации; весь набор 20/20, реальное KZ-аудио и браузер/телефон в этом узком шаге не перепроверялись. HTTPS-деплой не выполнен.

### Передача и следующий шаг

Проверенный backend commit: **`99ce3f3852d552cc1c59ae1c109020c8fcdacb07`**. Ветка `backend/ai-drafts` опубликована, создан [PR #5](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/5) в `backend/ledger-auth`; [PR #4](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/4) остаётся открытым в `main`. Автоматическое слияние не включалось. Следующий commit содержит только документацию передачи.

Frontend получает [AI_INTEGRATION.md](../../packages/contracts/AI_INTEGRATION.md): ссылки на OpenAPI и валидированные примеры по точному commit, multipart text/audio, ответ с уточнением, тело подтверждения, обработку TTL/повторов/ошибок. OpenAPI/JSON-примеры остаются совместимыми с `ad107f5`: поля и денежные правила не изменены. Для frontend нужен действующий Supabase access token и UUID точки из `/me`; схема `qadam` напрямую недоступна. Проверять форму перед отдельным подтверждением, сохранять Idempotency-Key при сетевом повторе, при 503/504 оставлять ручной ввод.

Следующий шаг: review двух PR с учётом зависимости, затем подключение формы frontend и браузерная проверка того же сценария. HTTPS API пока не опубликован. Новые функции backend не добавлять в этот интеграционный шаг.

## Подготовка подключения команды — 2026-10-15, backend/integration-readiness

### Актуальные опубликованные снимки и совместимость

GitHub проверен в начале и повторно во время работы. PR #3 обновился с `246851b2d4df996f054c7b1a27b2ba2933d2b3ee` до **`9b4156122e22f12839f9f69384cb79a43e90c730`**, остаётся draft/open в main. PR #4 — **`193f6e527d716549d759d805dc4b86db1d9e059e`**, open в main. PR #5 — **`2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`**, open в backend/ledger-auth. Main — `ced32e7aa8e737a0cbc5318715ad02bdc98a89d4`. Автослияние выключено у всех.

Создан отдельный detached worktree `tmp/integration-review-20261015`; локально совмещены опубликованные снимки, итог `6c6f5090c9d5ea3e97bdbf37168e7d40ba6c768c`. Это не опубликованная интеграционная ветка и не merge PR. Код совместился, конфликты только README и PROJECT_STATUS. В проверочной копии сохранены обе стороны; перед реальным merge нужна осмысленная редакция общей сводки. Рабочие ветки друзей не менялись. Backend-код и экспорт побайтно совпадают с PR #5; новые функции не добавлялись.

### Проверки с заглушками и локальной PostgreSQL

- В совмещённой копии `python scripts/with_env.py <абсолютный .env.local-postgres> -m pytest -q --tb=short` → **165 passed**, без skipped, одна прежняя Starlette/httpx deprecation. Только отдельная локальная PostgreSQL 17.11, тестовые JWT/JWKS и заглушка Gemini. После обновления PR #3 backend не менялся — повторять этот прогон не требовалось.
- `python -m ruff check app tests scripts migrations`, `ruff format --check` (37 файлов), `python -m app.export_contracts --check` → PASS.
- Frontend `npm ci`, typecheck, lint, build → PASS. На актуальном PR #3 `npm test` → **71 passed** (ранее 70 на первом снимке). Format check сначала выявил только Windows CRLF в generate-api.mjs/eslint.config.js/index.html; после локальной нормализации LF → PASS, Git-содержимое этих файлов не изменилось.
- `npm run check:api` в общей копии → **FAIL: generated API types out of date**. Отдельная сверка подтвердила, что frontend generated.ts точно соответствует PR #4, а schemas/paths ручного журнала и seller endpoints в PR #5 не изменились. Требуется штатная генерация типов владельцем frontend при принятии AI-контракта; чужие файлы не исправлялись.

### Браузерные результаты — только опубликованный demo

Существующий `npm run test:e2e` после установки нужного Chromium → **8 passed** на `9b41561` (ранее 6 на `246851b`). Это реальный Chromium, но приложение в явно учебном read-only режиме, без Supabase login и API-записей. Первоначальный запуск не стартовал из-за отсутствующего Chromium 1248; после установки успешный прогон выполнен. Screenshot-тест обновил шесть кадров только в отдельной копии; они не публиковались и не меняли ветку автора.

**Полный живой браузерный сценарий не проводился**, как согласовано пользователем. Supabase password login/refresh/reload, денежные формы и AI UI не объявляются проверенными. В `app/modules.ts` seller/public exports пока пусты: sale/debts/history/summary/voice **ожидаются от команды ledger-web**, публичные экраны/3D — **от public-web/assets-3d**. Ничего не реализовано вместо участников.

### Живые API, Supabase и AI

Сначала только чтением подтверждены `0003_drafts`, 3 прежние операции и отсутствие USAGE qadam для anon/authenticated. Сохранённые JWT были просрочены; пользователь обновил их через обычный вход. Затем реальная подпись/JWKS/subject прошли. `.env` не переписывался агентом; секреты не выводились. Миграции/seed/очищающая pytest на Supabase в этом шаге не запускались.

Живой HTTP-прогон использовал опубликованные неизменённые TypeScript `createApiClient`, `createLiveGateway`, `backendBindings`, `formatKZT` из PR #3 под Node и Uvicorn из интеграционной копии. **Не браузер и не SDK-login**. В обновлении `246851b → 9b41561` эти модули и Auth/runtime не изменились (git diff проверен).

- `/me`: A — 6 точек, B — 3; создан и повторно прочитан один явно учебный клиент «Демо интеграция PR3 2026-10-15», contact null.
- Продажа 300000/100000 → долг 200000; доплата 50000 → долг 150000, sales_delta доплаты 0. Клиент получает серверный balance_minor=150000; форматтер показывает 1500 ₸.
- Каждый денежный запрос повторён с прежним ключом/телом — идентичный ответ. Изменённое тело с прежним ключом → 409 IDEMPOTENCY_CONFLICT. История клиента содержит ровно две операции. A/B не читают чужую точку; B не пишет в точку A — 404. Без token — 401.
- Summary mart-demo-clothes с учётом прежних операций: sales_minor=600000, receipts_minor=300000, outstanding_minor=300000. В demo оставлены один новый учебный клиент и продажа/доплата; операций всего **5**, удаления/очистки не было.
- CORS реальным OPTIONS: localhost:5173 и 127.0.0.1:5173 с Authorization/Content-Type/Idempotency-Key → 200; посторонний HTTPS origin → 400 без разрешения. `/openapi.json` живого сервера совпал с экспортом.
- `scripts/smoke_draft_flow.py --demo` с явным серверным env → **PASS replay-only**: сохранённая AI-продажа возвращается, новый ключ → 409 DRAFT_USED, summary mart-demo-food прежний 300000/100000/200000. **Нового Gemini-вызова в этом шаге не было**. Ранее выполненный живой текст → Gemini → Supabase описан выше; его не смешивать с текущими тестами.

Временные инструменты этого прогона: игнорируемые `tmp/run_integration_api.py`, `tmp/frontend_live_bridge.ts` (сборка esbuild, реальные imports), `tmp/check_integration_prs.py`. Токены передавались только окружением. Тестовые бизнес-UUID публичны, реальные subjects/пароли/JWT в отчёт не включены.

### Передача, блокеры и порядок PR

Подготовлена [инструкция подключения](../BACKEND_FRONTEND_CONNECTION.md): проверенный backend **2d2fc56**, точный OpenAPI/примеры, запуск без повторной инициализации Supabase, Base URL **http://127.0.0.1:8000/api/v1**, три публичные VITE-переменные, CORS и девять тестовых businessId. Ссылки добавлены в README API/contracts. Документация находится в отдельной backend/integration-readiness; опубликованные PR и ветки команды не редактировались.

PR #4 готов к review/ручному слиянию. Затем изменить base PR #5 на main, проверить diff; #5 готов как зависимый backend-этап. Рекомендуется обычный merge #4 для сохранения истории, на которую уже опираются #3/#5. PR #3 остаётся draft: владельцу обновить README/PROJECT_STATUS при интеграции, сгенерировать типы по #5, подтвердить login/клиентов в браузере и готовность PR. Код seller endpoints совместим; отсутствие ledger UI — задача отдельного участника, а не требование написать его вместо команды.

Блокеры полного сценария: ожидаемые ledger/AI/public модули, generated.ts после #5, конфликты общей документации, неподтверждённый браузерный login/refresh и отсутствие общего HTTPS API. Следующий шаг — передача инструкции команде и, после её готовности, браузерная интеграция. PR не сливались, деплой не выполнялся.

## Живой Seller Frontend и публикация передачи — 2026-10-15

Повторно проверены GitHub PR #3/#4/#5: heads соответственно `9b4156122e22f12839f9f69384cb79a43e90c730`, `193f6e527d716549d759d805dc4b86db1d9e059e`, `2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`; все open, #3 draft, base #5 по-прежнему backend/ledger-auth. Использована отдельная `tmp/integration-review-20261015`; ветки друзей и PR не менялись. Модули ledger/AI/public остаются **ожидаемыми от команды**, ничего не реализовано вместо авторов.

### Проверено в настоящем браузере

Playwright Chromium, живой Vite/React, настоящий Supabase password login и FastAPI/PostgreSQL, без mocks или инъекции готовой сессии. Пользователь временно добавил пароли в игнорируемый `.env`. Успешно выполнен один сценарий с **10 контрольными точками**:

1. Вход A через email/пароль → Supabase HTTP 200 → `/me` 200 → шесть своих точек в UI, живой режим без demo-banner.
2. Выбор mart-demo-clothes, создание через форму клиента «Демо браузер PR3 2026-10-15» → 201, contact=null, balance_minor=0, появление в списке.
3. Переключение на другую свою точку скрывает клиента; возврат показывает его.
4. Reload восстанавливает реальную SDK-сессию, снова вызывает `/me`; после выбора исходной точки поиск возвращает того же клиента/UUID, без повторного создания.
5. Logout закрывает доступ; прямой переход на `/seller/customers` возвращает к `/login`.
6. Вход B обычной формой → три точки, ни одного UUID A в селекторе. Клиент A отсутствует; query `business_id=A` не подменяет выбор своей точки.
7. Logout B → повторный login A → снова шесть своих точек и ранее созданный клиент. Завершение logout, ошибок pageerror не было.

Первый запуск остановился после входа A на двух совпадающих кнопках «Новый клиент». Исправлен только селектор временного теста; повторный прогон полностью успешен. Приложение и ветка frontend для обхода ошибки не изменялись. Естественное истечение JWT/автоматический refresh длительным ожиданием не проверялись; reload подтверждает восстановление сессии, а не этот отдельный случай.

### Отдельно API и сохранность данных

В рамках браузерного прогона проверены реальные ответы Auth `/token`, API `/me`, POST/GET customers. Дополнительный fetch **из браузера** с текущим JWT B к `/businesses/{businessA}/customers` → **404 NOT_FOUND**; это прямая API-проверка изоляции, не действие формы. До/после `0003_drafts`, operations **5 → 5**. В demo оставлен только один новый явно учебный клиент. Миграции, seed, очистка БД и денежные записи не выполнялись. Gemini в этом шаге не вызывался.

Trace, HAR, video, screenshots и storageState не сохранялись. Пароли/токены не выводились в логи или отчёт. После каждого запуска удалены **только** `DEMO_OWNER_A_PASSWORD` и `DEMO_OWNER_B_PASSWORD` из исходного `.env`; сохранность всех остальных parsed значений проверена. Email, публичный ключ и прежние настройки не переписывались. Временные средства: `tmp/live_seller_browser.mjs`, `tmp/run_live_seller.py`, только в игнорируемом tmp. Запуск: `apps/api/.venv/Scripts/python tmp/run_live_seller.py`; вывод содержит только статусы и безопасные счётчики. Скрипт удаляет эти две переменные после завершения.

### generated.ts и публикация

В отдельной копии `npm run generate:api` по OpenAPI backend `2d2fc56` обновил только `apps/web/src/shared/api/generated.ts`. `npm run check:api`, `npm run typecheck`, `npx vitest run src/test/bindings.test.ts src/test/client.test.ts src/test/errors.test.ts` → **PASS, 45 tests passed**. Это контрактные тесты с заглушками, отдельно от живого браузера. Exact patch проверен обратным `git apply --reverse --check`.

Для автора frontend опубликованы [разбор изменений](../../packages/contracts/FRONTEND_TYPES_UPDATE.md) и [patch](../../packages/contracts/frontend-generated-ai.patch): +178/-48 строк, новый multipart POST drafts и его operation; CustomerCandidate/DraftResponse лишь перемещаются, существующие ручные типы не меняются. Ограничение XOR text/audio не выражается генератором строго — проверяется формой и backend. Generated-файл в ветке автора не менялся; patch служит точной передачей.

Коммит **`afbef782893d2c973bf14d9ba7b9b3e261d21dee`** проверен на секреты и опубликован в `backend/integration-readiness`, remote SHA подтверждён. [Инструкция подключения на GitHub](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/backend/integration-readiness/docs/BACKEND_FRONTEND_CONNECTION.md) дополнена текущими результатами. [Воспроизведение на компьютере frontend-разработчика](../SELLER_LIVE_ACCEPTANCE.md) содержит отдельный worktree, команды двух процессов, публичный env, точный UI-сценарий и различие собственного localhost/удалённого адреса.

Следующий шаг: seller-web принимает согласованный OpenAPI/patch, актуализирует README/PROJECT_STATUS при объединении и готовность draft PR #3. Ожидаются страницы ledger/AI от команды; полный денежный браузерный сценарий после их появления. Общий сетевой URL ещё не опубликован. PR не сливались, деплой не выполнялся.

## Интеграция всей команды после PR #7 — 2026-10-15

Ветка `integration/team-mvp`, отдельный worktree `tmp/integration-team`, основа `main:8c932dd`. Remote refs обновлены; GitHub подтверждает #7 merged, #3/#6 draft/open, #4/#5 open (база #5 остаётся backend/ledger-auth). Приняты Seller `b3d0328`, API/AI `2d2fc56`, readiness `95f6087`, public sources `a1ba5ae`, assets **`f53d469`** (новее указанного капитаном `1d49c29`). Полные SHA и способы переноса — [TEAM_INTEGRATION](../TEAM_INTEGRATION.md). Ветки друзей и main не изменялись, unrelated histories/force push не использовались.

### Сделано

- Единственный backend `apps/api`: PostgreSQL, Supabase JWT/JWKS и Gemini. `services/ledger.py` и миграции относительно принятого API не изменены. Root backend/SQLite/cookie-auth и root frontend PR #7 удалены **после** адаптации полезных сценариев; история PR #7 остаётся в предках.
- Единый `apps/web` построен на router/AuthProvider/runtime/BusinessProvider/API client/UI/RU-KZ Seller Frontend. `app/modules.ts` подключает адаптированные Sale/AudioInput, Debts/History, Summary и публичные страницы. Нового router/login/CustomerProvider нет. Общий CustomerPicker, Bearer токен, денежный decimal parser, серверные остатки, явное AI-подтверждение.
- Pending сохраняет точные ключ и тело при сетевой ошибке, невалидном ответе или 5xx. Запросы/cache/pending изолированы по identity scope + business; формы сбрасываются при смене точки. Runtime пересоздаётся при смене аккаунта. Pending хранится в памяти; beforeunload предупреждает о незавершённой попытке, offline/durable replay не реализован. После принудительного закрытия вкладки сверить журнал перед новой записью.
- Исходники public-web перенесены без отдельного каркаса/node_modules/dist. Envelope приведён к Page, venue_id — UUID, цены — price_minor; visitor_name обязателен. Публичная и seller-локализация используют общий context. CSS витрины ограничен `.ex`.
- Manifest управляет GLB/WebP, bounds, camera и hotspots. UUID **и** slug сверены с актуальными девятью Supabase-точками и seed. Маркер и карточка ведут на один shop. После визуальной проверки длинные подписи заменены номерами 1–3 с теми же номерами карточек, title и aria-label имени магазина; модель не перекрыта текстом. Без WebGL/при ошибке GLB остаются превью и список.
- `app/public_routes.py`: GET venues/businesses/shop; POST inquiry с квитанцией id/created_at, одинаковый client_request_id/body → та же квитанция, иной body → 409; PostgreSQL-лимит 20 новых заявок на точку/минуту. Private GET/PATCH inquiries проверяют membership/tenant. Публичные проекции не включают клиентов, долги или memberships. Денежные суммы заявки не меняют.
- OpenAPI/версия API 0.4.0, валидируемые примеры и generated.ts обновлены; включены runtime bindings seller inquiries/catalog. README и передача обновлены; прежние документы snapshot помечены как история. Главная актуальная инструкция — [TEAM_INTEGRATION](../TEAM_INTEGRATION.md).

### Тесты и локальные проверки — отдельно от живых сервисов

- Отдельная локальная PostgreSQL 17.11, пустая `*_test`; команда через `scripts/with_env.py` с **локальным** `.env.local-postgres`: `python -m pytest -q --tb=short` → **175 passed**. Миграции upgrade/check/downgrade, транзакции, seed, конкурентные погашения, TTL/авторство/конкурентное потребление draft/rollback, idempotency/изоляция, новые публичные проекции/заявки/лимит проходят. JWT подписывает тестовый JWKS, Gemini — заглушка; БД настоящая. Очистка только этой test БД. Предупреждение Starlette TestClient/httpx остаётся некритичным.
- `ruff check app tests migrations`, `ruff format --check app tests migrations`, `python -m app.export_contracts --check`, `uv lock --check --offline` → PASS. Новая миграция **не требуется**: каталог и inquiries уже есть до 0003_drafts; существующие migrations не переписаны.
- Web: `npm run check:api`, `typecheck`, `lint`, `format`, `npm test`, `build` → PASS. **81 unit/component tests** с заглушками, включая одинаковые body/key после неопределённого результата, double click, чужой ответ, pending scope, timeout/невалидный AI-response с сохранением текста/ручной формы и без денежного POST. Не считать их живым Gemini.
- `npm run test:e2e -- seller.spec.ts` → **7 passed**, Chromium demo, размеры 360/390/768/1440 и RU/KZ. Старый screenshot-only spec отдельно не запускался. Сборка предупреждает о lazy 3D chunk около 1 МБ (gzip около 275 КБ); оптимизация/FPS физического телефона не заявлены. Сборка без публичного env проверяет компиляцию; live Vite запускался с реальными публичными настройками.
- `python tools/assets/validate_assets.py --report tmp/assets-integration-validation.json` → PASS, 0 ошибок/предупреждений; GLB 609624 / 859988 / 779864 байт, без внешних URI. Связи с seed подтверждены.

### Настоящий браузер, Supabase и денежный ввод

Использованы опубликованный код объединённого приложения, реальный FastAPI/Uvicorn на loopback, настоящая Supabase и обычная форма email/password. Auth/денежные/публичные ответы не подменялись.

- A → `/me` → 6 точек, создание одного явно учебного клиента «Демо интеграция команды 2026-10-15», reload с восстановлением сессии/клиента; смена точки скрывает клиента и очищает денежную форму. Logout закрывает private routes. B → 3 другие точки, клиента A нет; B → A восстанавливает только свои точки. Проверка естественного expiry/refresh длительным ожиданием не проводилась.
- Через форму и общий CustomerPicker: продажа **3000 ₸ / получено 1000 ₸ → долг 2000 ₸**; через выбор той же продажи доплата **500 ₸ → долг 1500 ₸**. История и итог дня открываются. Точный повтор sale через отдельный browser fetch вернул тот же operation ID; это API-проверка, а не второе нажатие UI.
- Настоящий GLB hotspot MART → нужный shop → публичная форма заявки → квитанция → inbox владельца A. Контакт/текст только учебные; в общей БД оставлена одна заявка.
- Анонимный Chromium 360×800: все три GLB и **все девять hotspot** открыли соответствующие shops; горизонтального overflow нет, bounds/кадрирование проверены визуально. WebGL отключён через browser injection: декодированное превью + карточки работают; отдельная подмена только GLB-network на error при реальном public API также оставляет переход к магазину. Это desktop Chromium с мобильным viewport, не физический телефон. В раннем расширенном прогоне был timeout ожидания markers; финальный прогон всех девяти прошёл. Отдельные снимки только анонимных публичных страниц в игнорируемом tmp.

### Живой Gemini и API — не смешивать с браузерным успехом

- Через браузер получен **один валидный настоящий Gemini draft** для полной оплаты 3000 ₸, поля отобразились в форме. Первоначальный автоматизированный прогон остановился до подтверждения из-за отсутствующей функции во временном тестовом скрипте. Последующие попытки провайдера дали 503 AI_UNAVAILABLE; отдельная безопасная диагностика показала **HTTP 429 Gemini**. Модель/ключ/тариф не менялись, платный тариф не подключался. Полный повторный RU/KZ browser AI acceptance сейчас **не подтверждён**; прежние 11 RU/KZ/mixed и RU-audio результаты остаются историей предыдущего этапа.
- Сохранённый ещё действующий браузерный live draft затем явно подтверждён **через API** с настоящим JWT A: операция → история → summary. Дельта sales/receipts +300000/+300000 тиынов, долг +0; точный повтор возвращает прежнюю операцию, новый ключ → DRAFT_USED. Новых вызовов Gemini для этого не было. Это подтверждение через API, не через кнопку браузера.
- Реальные JWT B: GET customers, operations, summary и inquiries точки A → **404**. CORS разрешённый origin/Authorization/Idempotency-Key → PASS; чужой origin → отказ. Повторная проверка публичных UUID/slug по текущей Supabase совпала с manifest.
- До/после общая Supabase остаётся **0003_drafts**, операций **5 → 8**: две ручные (sale/repayment) и одна API-confirmation живого draft, все помечены учебными. Никаких миграций, seed, TRUNCATE, downgrade или очистки Supabase. Существующие `.env` не переписывались; пароли из отдельного игнорируемого файла, ключи/JWT/пароли не печатались и не записывались в trace/HAR/video/storageState.

### Следующий шаг и ограничения Draft PR

Получить review владельцев frontend/3D по интеграционному diff. После восстановления бесплатной квоты Gemini завершить **одним браузерным проходом** RU/KZ text → draft → явная кнопка подтверждения → history/summary. Проверить реальное аудио/микрофон и физический телефон отдельно; этого текущий прогон не доказывает. Для развёртывания понадобится отдельное разрешение/настройка достижимого HTTPS API и frontend origins; localhost коллеги недоступен удалённо.

Интеграционный PR остаётся Draft. Слияние либо всей этой ветки после review, либо согласованный последовательный порядок #4 → retarget #5 → #3/#6 → оставшийся integration diff с новой проверкой; не сливать все варианты одновременно. Ветки команды не удалять. Секреты проверены по известным локальным значениям и Git diff; приватные env, node_modules и dist исключены.

Проверенный commit кода: **`dab0fe7f91b1dbf8c8d7522694759ae9b9cebfc6`**. Последующая передача меняет только документацию. `git diff --check`, `format:check` и `check:api` прошли; `main` перед публикацией всё ещё `8c932dd49b8defa8456fd3b7015ed7828ddae3b7`. Основная рабочая копия `backend/integration-readiness` осталась чистой.

Ветка опубликована; создан **[Draft PR #8 → main](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/8)**. При создании head документации — `4fd5cea48aa2bdd0d194900f964ee1d1db022a93`; текущая запись лишь добавляет ссылку публикации. [Инструкция подключения](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/integration/team-mvp/docs/TEAM_INTEGRATION.md). PR оставлен open/draft, автоматическое слияние не включалось. Следующий шаг — review интеграции и завершение живой browser AI-проверки после восстановления квоты, затем решение капитана о слиянии; деплой требует отдельного этапа.

## Integration update 2026-10-16

Separate worktree tmp/integration-mobile, branch integration/team-mobile from PR #8 3d009dc. Early Flutter contract commit 0f2b06d. Assets 11c4e45 imported by explicit paths; storefront 8818e8b presentation selectively adapted, real API fields/name/price_minor, shared locale, seller route, keyed inquiry form and manifest VenueScene retained. Added sixth mobile role without changing other assignments. No frontend/backend duplicates or unrelated history.

Checks: typecheck/lint/build PASS; 81 web unit/component tests PASS (stubs). Asset validator PASS: GLB bytes 1312516/712724/745044, 0 errors/warnings. Real anonymous Chromium with real public Supabase API: all 3 venues and 9 hotspots -> matching shops, 360x800 no overflow, screenshots visually inspected; WebGL disabled and GLB network failure leave working previews/cards. No physical phone/FPS check. Supabase revision 0003_drafts, operations 8 -> 8, no migrations/cleanup. Gemini not called in this stage. npm audit reports 3 existing dev-tool findings (Vitest/mocker/tinypool); major test-tool upgrade deferred, no force audit fix. Lazy 3D chunk warning remains. Next: livestock implementation on a separate dependent backend branch, local-only migration, Storage live upload requires private bucket/server key (not configured).

## «Мал базар»: backend и передача Flutter — 2026-10-16

Рабочая копия `tmp/integration-mobile`, feature-ветка **backend/livestock** от обновлённой **integration/team-mobile:f240b27**. Ранняя публикация предложенного контракта — `0f2b06d`, до реализации. [LIVESTOCK_API](../../packages/contracts/LIVESTOCK_API.md) теперь описывает реализованный API 0.5.0, ограничение общей среды, Storage policies/env и подключение телефона. Общая Supabase не мигрировалась: по-прежнему 0003_drafts. Данные/ветки команды/локальные `.env` сохранены.

### Сделано

- `app/livestock_schemas.py`, `livestock_routes.py`, новые модели и **0004_livestock**: публичные лента/карточка/статистика, свои объявления, публикация/полное редактирование, confirm_today/sell/withdraw. Автор — проверенный JWT subject, без фиктивного магазина. Публичный ответ исключает subject/memberships/денежные данные. Контакт публикуется только с явным boolean consent=true.
- PostgreSQL clock → Asia/Almaty. В 00:00 вчерашние active скрываются; редактирование не продлевает наличие. Confirm обновляет ту же запись, sold/withdrawn не переоткрываются. Ключ UUID в области user; advisory transaction lock, нормализованный payload hash и исходный JSON-ответ атомарны с записью. Строгие целые тиыны, фильтры, bounded UUID pagination. Формулы/код ledger service не изменены.
- Медиана цен предложений за сегодня по виду/месту, минимум пять объявлений, quantity не даёт дополнительных наблюдений. Demo исключены. Без LLM. Default `LIVESTOCK_DEMO_MODE=true` помечает создаваемые учебные объявления навсегда.
- `services/photos.py`: Supabase private Storage adapter, проверка реального JPEG/PNG/WebP, лимит 8 MiB/20 MP, без анимации, EXIF orientation и перекодирование до 1600 px в JPEG без metadata. До трёх фото, проверка owner/attachment, составной owner FK и уникальные slots. До 30 unattached на пользователя, bounded multipart streaming, private orphan после сбоя DB не публикуется. Download через API с no-store, без раздачи object keys/серверного ключа.
- OpenAPI 0.5.0, шесть новых JSON-примеров, generated.ts, API README, инструкции Flutter, роль mobile, общие решения/статус обновлены. Flutter-каркас и отдельная авторизация не создавались.

### Настоящая локальная PostgreSQL + тестовые JWKS/Storage

Из `apps/api`: Python 3.12, `scripts/with_env.py <root>/apps/api/.env.local-postgres -m pytest -q --tb=short` → **218 passed**. Это отдельная пустая `qadam_test` на loopback: upgrade до 0004, `alembic check`, downgrade до base в fixture. Ни миграции, ни очистка тестов не направлялись на Supabase.

Проверены concurrent publish и photo retry, одинаковый key/body и конфликт payload, независимость ключей разных users, rollback перед commit, гонка sell/withdraw, пользователь без memberships, чужие PUT/actions/photo, UTC→Almaty граница суток, повтор старого key на следующий день, terminal states, фильтры/пагинация, медиана <5/5/6 и округление, исключение demo/просрочки, SQL RLS/права, входные ограничения, фото type/size/pixels/animation/EXIF/reorder/orphan/квота. Существующие ledger/drafts regression tests включены. Один первоначальный дефект next_cursor (UUID вместо string) исправлен. Слишком длинный ID pytest для 8 MiB fixture заменён именованным; это проблема теста, не загрузки API.

JWT в этом наборе подписаны тестовым JWKS. Storage HTTP transport tests подменяют сеть (upload/download, timeout/403/redirect), MemoryStorage подменяет удалённый bucket. Реальные байты обрабатывает Pillow. Эти проверки **не подтверждают живой Supabase Storage**. Прежние AI-тесты используют заглушки Gemini.

`ruff check app tests migrations`, `ruff format --check app tests migrations`, `python -m app.export_contracts --check`, `uv lock --check --offline`, `git diff --check` → PASS. Web: generate/check API, typecheck, lint, format:check и build → PASS. 81 web test с заглушками прошёл на обновлении интеграции; последующие web изменения — только сгенерированные типы. Известны предупреждение Starlette/httpx, lazy 3D chunk и три npm audit findings существующего dev toolchain; эти ограничения не скрыты как успешный security audit зависимостей.

### Живой Auth и HTTP API — отдельно

Настоящий Supabase login A/B, проверка реальных JWT/JWKS, Uvicorn/HTTP и **локальная qadam_demo**. После успешного тестового upgrade отдельно применена 0004 только в этой локальной demo БД; `alembic check` без отличий. Публикация → public feed/card → точный replay → B PUT чужого 404/своё пустое → без токена 401 → confirm_today с прежним ID → sell → public 404. Статистика исключает demo, журнал не изменился. Оставлено одно явно учебное локальное объявление, статус sold. Ключи/пароли/JWT не печатались; файлы конфигурации не изменялись.

**Живой Gemini в этом этапе не вызывался. Живой Storage не проверен:** STORAGE_SERVICE_KEY/BUCKET отсутствуют. Полный Flutter UI/Android device flow не проверен — приложение делает mobile-участник.

### Браузер и витрина — отдельно

Обновление `f240b27`: настоящий анонимный Chromium, реальный public API Supabase, новые GLB/preview/manifest 11c4e45. Три площадки, девять hotspots → правильные shops, 360×800 без horizontal overflow, визуальная проверка кадров. Отключённый WebGL и отдельно сетевой сбой GLB оставляют рабочие preview/cards. Это desktop Chromium с узким viewport, не физический телефон. Supabase проверена на 0003, операции 8→8. Seller login/ledger UI в этом новом этапе повторно не прогонялись; их прежние результаты не выдаются за новую проверку.

### Передача и следующий шаг

Flutter уже может использовать актуальные OpenAPI/examples и LIVESTOCK_API, запускать локальный API с 0004. Base URL desktop `http://127.0.0.1:8000/api/v1`, Android emulator `http://10.0.2.2:8000/api/v1`; телефон — LAN IP компьютера или `adb reverse`. Native HTTP разрешать только для debug, публичные параметры API_BASE_URL/SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY. Пароли/JWT/service_role/DB/AI key не являются публичным env.

Для общей среды капитану потребуется отдельно разрешить 0004, создать private Storage bucket с image/jpeg и лимитом 8 MiB, закрыть client policies (включая прежние broad policies) и настроить серверный service_role key. Затем проверить живую загрузку/приватность с двумя аккаунтами и Flutter на устройстве. Без Storage можно публиковать без фото. Не выполнены автоматическая уборка orphan/unattached, TTL удаления idempotency snapshots, production moderation/anti-spam, физический телефон/FPS. Голосовое заполнение — следующий этап. Новая миграция на общей Supabase, merge PR и deploy в этой задаче не выполнялись.

### Публикация

**[Draft PR #9](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/9)**: integration/team-mobile → integration/team-mvp, интеграция `f240b278f292e40f8033db6526fd0161e035cd96`. **[Draft PR #10](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/10)**: backend/livestock → integration/team-mobile, проверенный backend **`c447a594a6a7d9aad1ee7fca751053bf6a176a61`**. Ссылки на точный OpenAPI/примеры — в LIVESTOCK_API. Отдельное сравнение JSON OpenAPI с интеграционной базой подтвердило: **ни один прежний schema/path не изменён**, добавлен только livestock. Последующие commits — передача/ссылки.

Порядок review: #8, #9, #10; при принятии #8 капитан вручную проверяет diff и retarget #9, после него #10. В этой задаче PR только открыты как Draft, main и ветки команды не менялись. Проверка известных локальных секретов охватила 204 versionable paths и diff; значения не выводились, `.env`/tmp/node_modules/dist игнорируются. Корневая рабочая копия backend/integration-readiness чистая.

Дополнительная анонимная браузерная проверка главной витрины после публикации: 360/1440 px, три реальные карточки/превью, seller link, переключение RU→KZ и сохранение locale после перехода на MART — PASS. Снимки публичных страниц просмотрены, секретных browser artifacts нет. Read-only Supabase проверка повторно подтвердила 0003_drafts и 8→8 операций. Код не менялся.

## 2026-10-16 — review и живая приёмка общей версии

Проверенный код **c5ecd5e5abb579e75121c9e05541b9b8d14a0591**, integration/local-combined-check. Исходный merge614b13e сохранён; включены уже опубликованные PR #11 c9e099e и #12 abee31f. [Полный отчёт, команды запуска, точные результаты и Flutter-подключение](../COMBINED_ACCEPTANCE.md). После этого code commit меняется только передача/публичные снимки.

Исправлено: поколение Auth при позднем401 A→B→A; UUID next_cursor в Pydantic/OpenAPI и валидируемый CustomerPage example; Unicode длина клиента в bindings/форме; доступный RU/KZ alert ручного ввода при отказе AI. Денежный сервис/правила, router/modules/runtime и новые модели сохранены. Включены готовые меню/адаптивность PR #11. QA-тесты согласованы с API0.5 и подключёнными financial/public-модулями; исправлены ожидание layout, KZ selector, разделены E2E-конфигурации.

**Живой браузер:** A login→6 points→учебный клиент→reload; B login→3 points без данных A; form reset при смене business; sale3000/paid1000→debt2000; repay500→debt1500; history/summary; GLB hotspot→магазин→учебная заявка→inboxA. **Живой Gemini:** одна UI-попытка RU-разбора через gemini-3.6-flash, весь UI-цикл draft→проверка полей→нажатие confirm→history прошёл, без платного тарифа/повторов. KZ/audio заново не проверялись; живой429 в этот раз не возникал.

**Живой API отдельно:** точный replay продажи даёт тот же ID; использованный AI draft с новым ключом409 DRAFT_USED; JWT B к customers/operations/summary/inquiries A даёт404; без токена401; CORS разрешает5188, чужой origin отклонён. После финальных Auth/schema-изменений повторены A/B, reload/history/summary и replay. Дельты ручного этапа: sales+300000, receipts+150000, debt+150000; с AI: +600000/+450000/+150000. Общая БД operations8→11, только3 помеченные учебные операции. Созданы один учебный клиент и одна заявка; данные не удалялись.

**3D:** реальные GLB всех3 площадок визуально просмотрены на1440/360/390px, все9 hotspots совпадают со slug и UUID реального public API. При отключённом WebGL и отдельно оборванном GLB работают preview/list/shop. [Анонимные публичные снимки](../screenshots/combined-live-public/README.md); исходные10 Demo PNG и новые20 Demo/API-fixture PNG просмотрены перед commit.

**Тесты:**219 backend passed только на локальной qadam_test:55432 (синтетические JWT/JWKS/Gemini/Storage);142 frontend unit/component;15 стандартных Chromium Demo/public fixtures;21 QA Chromium synthetic Auth/API (8 тестов повторяются). typecheck/lint/build/format:check/check:api и export_contracts --check passed; после примера3 contract tests passed. Исходные QA-001/002/003 сначала воспроизведены красными, затем зелёные. Browser fault injection: прерванный до API money POST сохраняет те же body/key, pending изолирован по точке/user; операций не добавлено. 429/503/timeout/invalidJSON AI проверены заглушками, ввод сохраняется, один запрос, ноль денежных writes.

**Окружение:** начальный Vite не имел публичных Supabase env; добавлены только недостающие публичные настройки в игнорируемый web/.env.local. Серверные env/пароли не заменялись. Просмотр восстановлен на прежнем5188, API с обновлённой схемой на8018; оба оставлены работать. Общая Supabase подтверждена0003 до/после: upgrade/seed/очищающие тесты на ней не запускались, Storage не менялся. Секреты/privatenv/node_modules/dist не публикуются; auth-артефактов нет.

**Ограничения/следующий шаг:** backend — после отдельного разрешения backup→0004_livestock→private bucket/серверный key→живая фото/изоляция/полночь; до этого livestock API общей БД не заявляется рабочим. Frontend — физический телефон, микрофон/аудио, mobile performance; QA-G01 (нет собственного deadline у customer POST) остаётся ограничением. Flutter — ожидается приложение участника и его handoff; использовать LIVESTOCK_API/OpenAPI0.5, int minor, Supabase session, API_BASE_URL для emulator/LAN/adb. Не применять0004 и не менять Storage без следующего разрешения.

Публикация — отдельный Draft из общей ветки в backend/livestock, зависимость #10→#9→#8→main; #11/#12 уже включены с сохранением истории. Не сливать/retarget автоматически. Старые role/QA отчёты описывают свои snapshots; текущие результаты — здесь.

### Публикация общей приёмки

Создан **[open Draft PR #13](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/13)**, head `integration/local-combined-check`, base `backend/livestock`. Проверенный код `c5ecd5e5abb579e75121c9e05541b9b8d14a0591`; `17ee90f` и текущая запись добавляют только отчёт/публичные снимки/ссылку. Ветка опубликована без force push. Существующие PR и их базы не менялись, merge/deploy не выполнялись. [Инструкция и результаты](../COMBINED_ACCEPTANCE.md).

### 2026-10-16 — общая Supabase: livestock и Storage подключены

По прямому разрешению капитана применена `0004_livestock` на qadam-demo. Миграция добавочная, RLS включён на трёх новых таблицах; прямого SELECT у anon/authenticated нет. Полный backup не создавался: перед/после сверены ревизия и количества существующих записей. Сохранены 9 businesses, 9 catalog_items, 13 customers, 3 drafts, 11 idempotency_records, 2 inquiries, 9 memberships, 11 operations, 3 venues. Очищающие тесты и повторный seed не запускались в рамках настройки.

Создан private bucket `livestock-photos`, JPEG, лимит 8 MiB. Policies на storage.objects отсутствуют. STORAGE_SERVICE_KEY, STORAGE_BUCKET и LIVESTOCK_DEMO_MODE=true сохранены только в существующем игнорируемом серверном .env основной рабочей копии. Секреты не выводились и не включены в Git. Новые процессы API должны загрузить обновлённое окружение; уже запущенный процесс автоматически настройки не получает.

Живая проверка через FastAPI TestClient с настоящими Supabase JWT A/B, общей PostgreSQL и настоящим Supabase Storage: /me обоих владельцев; upload PNG с преобразованием в JPEG без EXIF; повтор upload возвращает тот же photo ID; публикация и повтор с прежним listing ID; чужое редактирование и приватное фото дают 404; confirm_today; публичное фото доступно до sell, после sell объявление и публичное фото дают 404, владельцу приватное фото доступно. PASS. Это API-проверка, не Flutter/браузерный UI-прогон.

Оставлена учебная запись e93b4262-a6bf-4ddc-8665-3e2ee657ad35, is_demo=true, status=sold; фото 53120e8e-6156-5185-8b0c-cd4a08ba55c2 — синтетический цветной квадрат. Дополнительно в private Storage оставлен setup-check/7160de2d-2cc3-4c33-ab97-2af9c9ec5dea.jpg для проверки серверного адаптера. Прямое чтение объекта публичным URL и только publishable key отклонено (400), серверное чтение/загрузка PASS. Существующий денежный журнал не изменился.

Остаются Flutter/физический телефон, проверка реальной смены суток и эксплуатационная очистка непривязанных объектов. Старые указания о текущей версии 0003 в документации являются историческими: общая БД теперь 0004_livestock. Merge/deploy не выполнялись.


### 2026-10-16 — настоящий HTTP, передача Flutter и аналитика 7/30

Сохранён и опубликован исходный локальный отчёт setup без переписывания. Обновлены refs: отдельные remote mobile da6a3a0 и seller fix 28960f2/PR14 только просмотрены, не объединялись. Общая ветка integration/local-combined-check, Draft PR13 → backend/livestock сохраняется; зависимость #10 → #9 → #8 → main. Нового PR-дубля нет.

Контракт аналитики и JSON-примеры опубликованы **первым** commit 2089e44c18f7b715156dcf44e0199f993b03f932, затем реализация **cd655e96ec809bb8857666ad1fffa16e56e6d02a**, API0.6.0. Добавлены analytics_schemas.py, services/analytics.py, защищённый GET businesses/{id}/analytics?days=7|30, тесты; OpenAPI/examples/generated.ts обновлены. Один SQL snapshot, нулевые дни/часы, действующие продажи и HALF_UP среднего, поступления по датам движений, весь текущий долг/должники. Отмены/границы подробно в ANALYTICS_API. Денежные записи/summary не менялись, новой миграции нет. Исправлен тест JSON-примеров: имя примера не обязано совпадать с именем модели (CustomerPage и несколько AnalyticsResponse).

Read-only сверка общей БД: 0004_livestock, повторных setup/migration/seed/очисток не было. На начало работы старые слушатели 8018/5188 отсутствовали: восстановлены без остановки чужих процессов. Позднее точечно перезапущены только наш API launcher/child для нового кода и env; web5188 сохранён. Сервер loopback8018, CORS ровно http://127.0.0.1:5188. Конфиг загружен из прежнего игнорируемого apps/api/.env, файл не менялся. Просроченные demo access tokens не переписаны: для HTTP проверок обычный Supabase login с существующими временными credentials, JWT только в памяти.

**Настоящий HTTP (не TestClient):** health, /me A/B, public livestock feed, mine, upload PNG→JPEG без EXIF, точный повтор с тем же photo ID, private owner read200/foreign404/anonymous401, старое sold объявление public404, CORS — PASS. Повтор smoke не создал ещё одно фото. Новое приватное синтетическое непривязанное фото 835b4921-6594-5570-8a32-f6bc56c29e47 оставлено, существующие учебные записи не удалялись. До/после business9/customer13/inquiry2/operations11 без изменений. Аналитика7/30 с реальными JWT A/B: карточки=графики, авторизация401/чужаяточка404/неверныйпериод422, no-store — PASS, без записи денег. Настоящий сервер доступен на этом ПК; внешнее устройство этим не доказано.

**Тесты отдельно:** pytest -q **235 PASS** на отдельной локальной qadam_test: настоящие PG SQL/транзакции/миграции, синтетические Auth/JWKS/Gemini/Storage. После UTC-нормализации повторно tests/test_analytics.py **10 PASS**. Cases:3000/1000+500→sales3000/receipts1500/debt1500,count1,avg3000; старыйдолг; отменыдругойдень/внепериода; границы7/30,полночь,пустые/нули; HALF_UP/должники; owner isolation; графики=карточки. Экспорт, ruff check/format PASS. Warning deprecated TestClient/httpx сохранён. Web **142 PASS**, generate/check:api,typecheck,lint,build PASS; предупреждение большого 3D chunk. Новый браузерный/Flutter-прогон не выполнялся. **Живой Gemini повторно не вызывался**; прежние RU/UI результаты остаются историей, новые AI-тесты — заглушки.

Актуальные инструкции: docs/FLUTTER_CONNECTION.md, LIVESTOCK_API, README, TEAM_INTEGRATION; текущие устаревшие0003 указания заменены, исторические результаты сохранены. Удалённому mobile-разработчику подготовлен Quick Tunnel HTTPS только к FastAPI, публичные Supabase URL/key и public.local.json; серверные ключи ему не нужны. Туннель **не запущен**, действующего внешнего API_BASE_URL пока нет. Адрес временный, ПК/FastAPI/cloudflared должны работать; платных услуг/деплоя нет. Настройка и проверка с его устройства — следующий согласованный шаг. Учебный аккаунт передаёт капитан приватно, не JWT в Git/chat.

Следующее: backend — согласованное окно тестового HTTPS и внешняя HTTP-приёмка, затем эксплуатационные правила уборки private фото; frontend — UI аналитики по опубликованным контракту/примерам через общий runtime, без пересчёта; Flutter — получить свой учебный аккаунт и проверенный HTTPS URL, принять опубликованный mobile-клиент и пройти live upload/publish/owner isolation на устройстве. PR остаётся Draft; main, ветки друзей, merge/deploy не затрагивались.

Финальная сверка remote перед публикацией: mobile обновился da6a3a0 → a2c0aab, diff только docs/handoffs/mobile.md с APK-проверками и блокерами физического Android. Прочитан; настройки подключения не изменились, чужая ветка не объединялась и не редактировалась.

## 2026-10-16 — конкретный мал базар и минимальная цена

API 0.6.1, отдельная ветка backend/livestock-market-minimum от 58d4eb4. ListingWrite/ответы получают market (название рынка), выдача/мои объявления/цены — фильтр market совместно с locality. Пробелы/регистр нормализованы; это заявленное название, не проверенный географический справочник. Старый клиент поддерживается: market optional/null, legacy PUT без поля сохраняет существующее значение и прежний fingerprint. Старые записи остаются без привязки.

PriceStats.min_price_per_head_minor — минимум среди сегодняшних активных неучебных предложений вида/места/рынка, доступен с одного объявления. Медиана по-прежнему с пяти; status insufficient_data относится к медиане. Пустой минимум null. Flutter должен показать «От … ₸ за голову среди сегодняшних объявлений» и sample_count, а не гарантированную рыночную цену.

Добавочная миграция 0005_livestock_market проверена на отдельной PostgreSQL, upgrade/check/downgrade в fixture успешны. Общая Supabase НЕ изменена: остаётся 0004, новый backend запускать только после миграции. Никаких реальных рынков/адресов не выдумывали, использованы синтетические test names.

Проверки: 34 livestock tests и полный backend 236 passed на отдельной PostgreSQL (JWT/Storage/Gemini в тестах подставные); Ruff passed; OpenAPI/examples экспортированы. Flutter UI в этой ветке отсутствует: изменения DTO, формы и фильтров описаны в LIVESTOCK_API.md. Денежные правила и аналитика сохранены.


### 2026-10-16 — API0.6.1, проверенная миграция и внешний HTTPS

Отдельная ветка integration/livestock-https от e26f732 (родитель58d4eb4). Код/дополнительные проверки: 4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5. Исходную backend/livestock-market-minimum и ветки друзей не меняли. Remote PR13:58d4eb4 Draft→backend/livestock; PR15:a2c0aab Draft→backend/livestock. Новая ветка готовится отдельным Draft→integration/local-combined-check, зависит отPR13; merge/main/deploy не выполняются. Денежные services/ledger и analytics не изменились.

Review:0005 добавляет nullable market/market_key и индекс. Старый POST/PUT без market и fingerprint сохраняются; явный null в PUT снимает рынок. Минимум по соответствующим сегодняшним active non-demo, null при0, медиана по-прежнему требует5. Добавлены tests/test_market_upgrade.py: восстановление совместимости0004→0005, неизменность строк/старого ключа, clear/null/omission, вид/demo/полночь. Полный pytest **238 PASS** только на локальной qadam_test; ruff format/check и export PASS. Auth/JWKS/Storage/Gemini в тестах синтетические. Web check:api/typecheck/lint PASS. Flutter SDK/UI здесь не запускались; статически проверены config.dart, livestock_api.dart, response_validation.dart, listing_form.dart и price UI PR15.

После явного разрешения капитана backup tmp/qadam-before-0005.dump **реально восстановлен** в новой отдельной локальной qadam_restore_0005_test; все12 таблиц совпали по количеству и содержимому. Backup покрывает qadam schema/data без первоначальных owner/ACL, не SupabaseAuth/Storage. Приватный backup и восстановленная база сохранены, не коммитятся. Затем выполнен только alembic upgrade0005 с ограниченным ожиданием блокировки. До/после прежние business9/catalog9/customer13/draft3/idempotency11/inquiry2/listing1/photo2/livestock_requests5/membership9/operations11/venue3 совпали. Старые market=null, индекс и RLS/запреты anon/authenticated проверены. Повторного seed/очистки общей БД не было. API0.6.1 включён только после migration+read-only app preflight; опознанный API8018 перезапущен, web5188 сохранён, env не перезаписан.

**Живой внешний HTTPS с ПК капитана:** https://kelkoo-student-skiing-universal.trycloudflare.com/api/v1. Cloudflared2026.10.1, официальный release/SHA256 проверен, только proxy8018, PostgreSQL не открыт. Health/OpenAPI0.6.1, настоящий password login A/B→/me, аналитика7 дней, public feed/mine, anonymous401, чужое редактирование/private photo404, CORS5188 PASS. Upload PNG7692562байта (>4.5MB,<8MiB)→JPEG безEXIF через настоящий Storage, повтор same photoID PASS. Старый publish receipt до0005 повторён без дубля; новый POST безmarket/retry, PUTmarket, feed/mine market filter и publicphoto PASS. Demo исключено: count0/minnull; положительный минимум только testPG, искусственные non-demo записи в общей среде не создавались.

Оставлены учебные listing16b8f0be-732c-449e-81f6-5fb3fb0fff83 и photodd1478b0-2f0f-5159-87fc-e68b698b893f: синтетическое место/рынок/контакт и шумовое изображение, is_demo=true. Никакого удаления; существующий журнал11операций/business9/customer13/inquiry2 сохранён. После местной полуночи publiclisting исчезает доconfirm_today по контракту. Пароли/JWT не выводились, только публичный конфиг в docs. Временные credentials не перезаписывались.

**Не проверено:** устройство/компьютер Flutter-разработчика, новый браузерный UI, живой Gemini в этом этапе. Живой минимум ненулевого non-demo набора не имитирован. Туннель временный, ПК/API/cloudflared должны работать; новый запуск может сменить host. Стабильный hosting предложен в docs/PERMANENT_HOSTING_PLAN.md: Vercel SPA + отдельный FastAPI Web Service, прямые uploads до8MiB; ingress/memory/timeout выбранного постоянного сервиса ещё нужно проверить. Постоянного деплоя и платных услуг нет.

Передача: docs/FLUTTER_CONNECTION.md содержит точный API_BASE_URL, публичные Supabase URL/key, API0.6.1 и изменения Flutter. Mobile: добавить optional market DTO/form/filter, minimum независимо от insufficient_data median, получить аккаунт приватно, выполнить device live acceptance. Backend: поддержать окно туннеля и затем согласовать постоянный hosting. Frontend: отдельный UI аналитики, без изменения денежных правил. PR остаются Draft, автоматических merge нет.

Публикация завершена: [Draft PR #17](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/17) → integration/local-combined-check (PR13). Первый опубликованный head1c6ecbd49d653f68a1192aedaad05de42e1e7668, проверенный код4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5; последующая фиксация ссылки меняет только документацию. Diff проверен на настроенные секреты, найденных утечек нет. Force push, merge и постоянный deploy не выполнялись.

### 2026-10-16 — Seller Analytics поверх актуального PR17/API0.6.1

В отдельном worktree создана integration/seller-analytics-061 от remote PR17ca51bbf9bcf1a5e5379b7b8ced147e4114e01434. Добавлен обычным merge PR16ce68f01e3fe4a6b9898fd68be8e3ef2e4c467ad1; общий предок58d4eb4 подтверждён до работы, remote heads повторно сверены. Проверенный merge **94e2b7aff76dc18990e0f410174e6ca99e42faf6** содержит оба ancestry. Единственный конфликтDECISIONS разрешён сохранением обоих разделов. Собственных правок frontend-кода не потребовалось. Документация команды изPR16 сохранена как отчёт автора, наш итог — [ANALYTICS_061_INTEGRATION](../ANALYTICS_061_INTEGRATION.md).

apps/api,packages/contracts,generated.ts и FLUTTER_CONNECTION побайтово равныPR17: API0.6.1, market/market_key, minimum, финансовые правила и аналитика не потеряны. Общая Supabase только read-only подтверждена0005; миграции/seed/очистка не запускались. API8018, captain web5188 и cloudflared не останавливались. Существующие env и временные credentials не менялись, секретные значения не выводились.

**Проверено живьём:** Chromium на отдельном5191 с same-origin Vite proxy→настоящий API8018; форма Supabase loginA/B, /me6/3точки, UI Analytics7/30, карточки соответствуют серверным значениям, daily/hourly согласованы с totals, смена точки/reload/logout/B, foreignAnalytics404 и закрытый маршрут после logout.360/390px без document overflow. Ноль изменяющих запросов кAPI, никаких новых денег/клиентов/заявок. Начальный тест неверно ожидал сохранения периода30 и точки после смены/reload; исправлен только временный скрипт согласно существующему reset оболочки, итоговый полный прогон PASS. Никаких HAR/trace/session/screenshot с живыми данными. Внешние health/OpenAPI0.6.1 повторно PASS по прежнему HTTPS сПК капитана. Новый прямой CORS5191 и устройство Flutter не проверены: proxy не заменяет такую проверку.

**Тесты с заглушками:**207/207 unit/component;23/23 standard+Analytics Chromium на4181 (исключён Analytics screenshot writer);21/21 QA Chromium на4175,8сценариев пересекаются. check:api,lint,build(включаяTypeScript),format:check,diff --check PASS. Прежние warnings3Dchunk/emptyauth при buildбезenv остаются. Существующие screenshot writers изменили9старыхDemoPNG — только эти изменения восстановлены;7PNG автора Analytics сохранены, desktop7/mobile30 просмотрены. Backend pytest не повторялся:238PASS PR17 — предыдущий этап на отдельной PostgreSQL, не новые результаты. Живой Gemini/новые деньги/новый Storage upload в этом шаге не запускались.

**Следующий шаг:** review отдельного Draft→integration/livestock-https(PR17), далее зависимостьPR13 и существующая цепочка. PR16 уже включён историей, повторный перенос не нужен; существующие PR не retarget/merge автоматически. Backend поддерживает туннель; frontend делает review и отдельно рассматривает дополнительные guardsPR14/QA-G01; Flutter заканчивает optionalmarket/minimum UI и device acceptance по неизменённому FLUTTER_CONNECTION. UI Analytics готов в этой интеграции. Неизменённый просмотр5188 ещё показывает прежнюю запущенную web-версию; новый просмотр запускается отдельно по инструкции. Постоянного deploy, платных услуг, force push и изменений main/веток друзей нет.

Публикация: **[Draft PR #18](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/18)** создан в `integration/livestock-https`, зависимостьPR17. Head с исходным отчётомb5a5b29b4f0109878a85112b6b6ecfcaca07dbd2; последующая запись ссылки — docs-only. Перед созданием проверено отсутствие дубля и неизменность remote PR16/17. Итоговый HEAD смотреть в PR; проверенный source merge94e2b7a. Никаких GitHub merge или изменений чужих PR.

### 2026-10-16 — PR18: живая запись и обновление Analytics

Проверен опубликованный0821127, source94e2b7a. Настоящий Chromium на отдельном5191, форма SupabaseA, основной API8018, общая PostgreSQL. Создан отдельный явно учебный клиент `ДЕМО PR18 аналитика 3000-1000-500 16.10.2026` (f1f37747-b848-4565-a7fc-2adb4d90198f) в mart-demo-clothes/ad6203bc-7320-5b36-982b-135504c5af68. UI-продажа3000/1000:65a09952-879f-4d51-838c-991f35af3aa5; UI-доплата500:6adc7672-a609-4159-ae07-305833b9c977. Только учебные записи, без очистки/seed/миграций/автоотмен.

Baseline7дней: sales1800000/receipts1200000/debt600000/count6/average300000тиынов. После продажи2100000/1300000/800000/count7/average300000; после доплаты2100000/1350000/750000/count7/average300000. Все ожидаемые дельты PASS; карточкиUI совпали сbackend, daily/hourly согласованы, дополнительноAPIдельты30дней PASS. Analytics заранее открыта до записи и обновлялась при навигации безreload после каждого действия. После отдельногоreload/выбора той же точки значения сохранены.

Повтор проверен черезUI: после успешногоCOMMIT доплаты один раз прервана доставка ответа браузеру. Перед штатнымretry прочитана история, найдена одна доплата. «Проверить результат тем же запросом» отправила прежнийkey/точноеbody, получилаHTTP200 с прежнимUUID и остатком150000тиынов; финальная история1sale+1repayment, показатели не изменились отretry. Это живая БД с инъекцией транспортного сбоя, не stub финансового ответа. Новыйключ при неоднозначности не создавался. Credentials/HAR/trace/живыеscreenshots не публиковались.

Просмотр **http://127.0.0.1:5191/seller/analytics** оставлен работать (VitePID9268); вход/login, учебная точка выше.5188 по-прежнему старая версия, не PR18. API8018/PID31160 и cloudflared/PID33900 не перезапускались; после проверки health/OpenAPI0.6.1 по прежнемуHTTPS PASS. ЛокальныйURL5191 доступен только наПК капитана, физическоеFlutterустройство здесь не проверено. [Полный отчёт, baseline и ID](../ANALYTICS_LEDGER_LIVE_ACCEPTANCE.md). Код/контракты без изменений; новые unit/backend tests не запускались для docs. Следующий шаг — reviewPR18 и device acceptance Flutter; основная живая приёмка Analytics после записи закрыта. Main/merge/deploy не выполнялись.

### 2026-10-16 — HTTPS frontend PR18 для физической проверки

Remote проверены: PR18 **5ab11b146778698f54164057974fc81c397192dc**, PR17ca51bbf, PR20 **39a730e** добавляет толькоtests/docs. PR19/doc99ed2c0, корневая Aidana880d713 и mobile3ac3a1a не объединялись. Playback/cancel в общемAudioInput отсутствуют; исходники/денежные правила/контракты не менялись. ИзPR18 собрана отдельнаяproductiondist с публичным внешнимAPIenv, безlocalhostAPI/серверныхсекретов. Types/buildPASS,3Dchunkwarning прежний.

**Frontend:** https://crucial-funky-marion-barcelona.trycloudflare.com/login → loopback5192/previewPID33204, отдельныйcloudflared34696. **API:** https://kelkoo-student-skiing-universal.trycloudflare.com/api/v1 прежний, код4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5, чистыйcheckoutca51bbf. Web5188/PID28500 и5191/PID9270 сохранены. [Инструкция/URL/commits](../HTTPS_FRONTEND_PREVIEW.md).

По разрешённой задаче точный frontend origin добавлен к CORS5188 после preflight на8019. Команда предупреждена [в PR18](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/18#issuecomment-6215381194); перезапущен только опознанный API8018, переключение/readiness заняло около6секунд. Новый API listener10208/launcher34292, прежний API cloudflared33900 сохранён. [О восстановлении сообщено](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/18#issuecomment-6215495430). .env не менялся, ALLOWED_ORIGINS задан в окружении процесса и сохранён в игнорируемом tmp/api-runtime-overrides.json; учитывать при следующем restart. Ревизия0005 только прочитана, БД/Storage/setup не менялись.

**Реальные HTTP/браузер:** оба HTTPS200, OpenAPI0.6.1, anonymous me401, CORS Authorization/Content-Type/Idempotency-Key200 только для точных origins, чужой origin400. Настоящий Supabase A/B→me6/3→Analytics/deep link/reload/logout, foreignAnalytics404 PASS на390px. API-запросы браузера идут непосредственно на HTTPS API,0localhost requests/0API writes; Demo fallback нет. Скриншоты/HAR/trace/сессии не сохранялись.

**Синтетический media smoke:** secure context true/getUserMedia/MediaRecorder/MIME и Record button доступны. Fake-device Chromium Record→Stop→clip12966байт/tracks ended PASS, без upload/Gemini/денег. Первые попытки без Windows fake-UI flag получили NotSupportedError; добавлен только флаг тестового браузера из подготовки PR20, не production-правка. Playback/cancel нет, MIC gaps не исправлены. Физический микрофон/Android/iOS/permission UI/voice AI не проверены; полный suite PR20/pytest не повторялся. Следующий шаг — участник на устройстве по HTTPS-инструкции, ledger-владелец согласует исправления MIC. Оба preview/туннеля оставлены работать; платных услуг/постоянного деплоя/merge/main нет.

### 2026-10-16,18:40 — восстановление общей среды и проверка voice PR23

Старые API8018/web5191 и оба туннеля отсутствовали; cloudflared logs фиксируют завершение по сигналу около18:04. Причина сигнала не установлена. Read-only Supabase:0005_livestock_market, customer_creation_requests отсутствует; PR22/e441401 остаётся Draft.0006/seed/очистка не выполнялись. Восстановлен подтверждённый FastAPI код4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5 из чистого checkoutca51bbf. Серверный .env и private Storage сохранены, JWT включён.

От актуального remote main1324885 создана отдельная integration/voice-preview-061. Merge **7f511ddc8f3dc0a6fc1550566b9ead9abbfb98ce** имеет родителей1324885 и точный voice PR23/a1e5252478eec61d85607b41557ff584b52cfe17. Новые main/app/shared/API/контракты сохранены; старый корневой backend не перенесён. После финальных label/error markup исправлений:242 frontend unit/component,35 strict microphone,18 native microphone E2E,24 standard/Analytics E2E и21 QA E2E PASS; наборы частично пересекаются. Typecheck/lint/build/check:api/format PASS. Предупреждение большого3Dchunk прежнее. Backend pytest не повторялся, код сервера не менялся.

Внешний frontend **https://negotiations-exist-newman-ohio.trycloudflare.com/login**, Flutter **API_BASE_URL=https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1**. Локальные8018 и5191 восстановлены;5191/5192 отдают одну production-сборку7f511dd, публичный env указывает внешнийAPI. CORS разрешает точный новыйorigin и localhost-порты, чужойorigin400; PostgreSQL не открыт. API launcher20736/listener9272, cloudflared25616; preview5192/PID23856 и5191/PID28892, frontend cloudflared11412. Процессы оставлены работать; условия — включённыйПК/сеть/процессы, временныеURL безSLA.

Живой Chromium с ПК капитана: настоящий Supabase loginA/B→me6/3→Analytics/deep link→logout/guard, чужаяAnalytics404, обаHTTPS200/OpenAPI0.6.1,0localhostAPI calls/0API writes. Native synthetic device в productionUI: Record/Stop12000байт/ended tracks, playback/pause/delete и отдельныйCancel сохраняют текст. Отдельные18E2E используют fake media и mockAuth/API. Не заявляются физический телефон, настоящий голос, живойGemini, Flutterdevice или новаяденежнаяприёмка. Аудио/пароли/токены/живыебраузерныеартефакты не сохранены. DemoPNG тестов восстановлены вGit, новыеизображения не публикуются.

[Актуальная инструкция, commits, проверки и запуск](../VOICE_HTTPS_RESTORED.md); FLUTTER_CONNECTION обновлён. Следующий шаг — команда подключается по новымURL и проводит физическуюAndroid/iOS/Flutterприёмку; customer recovery rollout остаётся отдельным согласованием. Main/PR не сливались, веткидрузей не изменены, постоянногодеплоя нет.

### 2026-10-16 — сервер customer POST recovery, отдельная ветка от PR18

База: integration/seller-analytics-061 **13248851fd2b2a502aff211a506f71e85c2b0ab1**. PR19 **99ed2c03c8c4d75987ad5e41119055c2bb5142c6** прочитан, выбран backend-first вариант, его frontend-блокировку не переносили. Ветка **backend/customer-post-recovery**. Сначала опубликован точный контракт с JSON **737a559ca5120639ecdd5b3d99fdfdfb574700c8**, затем реализация API0.6.2. Draft направляется в ветку PR18, сохраняет цепочку PR18→PR17→PR13; не main. Ветки друзей не изменялись.

Сделано: optional Idempotency-Key для POST customers; GET customer-creation-result с обязательным ключом. Scope пользователя/точки, SHA256 валидированного тела с defaults/trim, PostgreSQL transaction advisory lock, клиент+receipt атомарно,201 только послеCOMMIT. Replay возвращает первоначальный CustomerResponse, даже если позднее изменился долг. Другой body409; GET completed/not_observed, без ложного processing. Membership проверяется при create/replay/lookup и удерживается FOR SHARE до конца транзакции. Без ключа старые клиенты продолжают создавать новые записи. Receipt бессрочный, FK не позволяет удалить его клиента. Cache-Control:no-store включая ошибки. Финансовый service и его receipt не менялись.

Пути: apps/api/app/services/customers.py, модели/схемы/routers/main; migrations/versions/0006_customer_requests.py; tests/test_customer_recovery.py. Обновлены OpenAPI0.6.2, examples.json, generated.ts и FRONTEND_TYPES_UPDATE. [Контракт](../../packages/contracts/CUSTOMER_RECOVERY_API.md), [JSON](../../packages/contracts/customer-recovery-examples.json), [локальный запуск/rollout](../../apps/api/README.md). Машинное сравнение с OpenAPI1324885: прежние схемы/маршруты идентичны, кроме версии, описания и optional заголовка customerPOST; добавлен новый маршрут и две схемы. Analytics/market/minimum сохранены.

**Настоящая отдельная PostgreSQL:** полный `python scripts/with_env.py <ignored-local-env> -m pytest -q` — **257PASS**.17 новых проверок охватывают legacy/defaults/trim/Unicode, replay/conflict,6 параллельных одинаковых и6 различных тел, scope автора/точки/финансовых ключей, rollback при500/503, отзыв/восстановлениеmembership, конкурентный отзыв (фактически наблюдался PostgreSQL lock wait), новый экземплярAPI и старыйreceipt, сохранность клиентов0005→0006, RLS/ACL и tenantFK. pg_engine требует пустую отдельную `*_test`, запрещает совпадение с основнойБД, выполняет upgrade/check/downgrade только там. После уточнения обязательности полей result-union повторены customer+contract suites: **21PASS**. Ruff check/format, export_contracts--check, uv lock--check--offline PASS. Прежнее Starlette/httpx deprecation warning остаётся.

**Настоящий HTTP, синтетические пользователи/локальная БД:** отдельный uvicorn на свободном loopback-порту; сокет клиента закрыт доCOMMIT без чтения ответа. Пока receipt не закоммичен, GET возвращаетnot_observed; исходный worker завершается, конкурентный повтор прежнего key/body возвращает тот жеID. В БД ровно один новый клиент и одинreceipt. Новый экземплярAPI получает сохранённый результат. Это проверка механизма потери ответа, не живой Supabase/browser acceptance.

**Frontend с заглушками:**73PASS в qa-customers-regression, qa-contract-regression, client, bindings; check:api/typecheck/lint PASS. Изначально запуск блокировался записью Vite temp за пределами sandbox, повтор с доступом прошёл; неверный первоначальный test-filter не нашёл файлы, после указания реальных src/test/* suite выполнен. UI/coordinator seller не реализовывались, новые E2E/браузерные/liveGemini проверки не заявляются.

**Сохранённая живая среда:** readonly HTTP200 у API8018/health, внешнего APIhealth и frontend/login; внешний OpenAPI по-прежнему0.6.1. FastAPI listener10208/launcher34292, код4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5, checkoutca51bbf; cloudflared33900/API и34696/frontend не тронуты. Preview5192/PID33204, старые5188/PID28500 и5191/PID9270 сохранены. [Текущие адреса](../HTTPS_FRONTEND_PREVIEW.md). Общую Supabase не очищали, setup/seed/0006 не запускали, новых учебных записей там нет, env/секреты не меняли. Это доступность с ПК капитана, не новая физическая приёмка Flutter.

Следующий шаг: review Draft и согласованный rollout0006/0.6.2 с проверенным восстановимым backup, затем отдельная живая приёмка customer recovery. Frontend берёт текущие OpenAPI/generated, хранит key по identity/APIproject/business доPOST, повторяет только прежниеkey/body и трактуетnot_observed как unknown. Доrollout нельзя включать recovery endpoint на существующемHTTPS0.6.1. Послеreload при утраченном body иnot_observed безопасное автоматическое завершение не гарантируется; поиск клиента по имени не заменяет receipt. Main/PR не сливались, деплоя нет.

### 2026-10-16 — review PR22 и подготовка 0006 без изменения общей среды

Проверены remote main **13248851fd2b2a502aff211a506f71e85c2b0ab1**, PR22 **e4414012ff4dd749ed154a4d767f8eff1225fae2**, PR19 **99ed2c03c8c4d75987ad5e41119055c2bb5142c6**. Main входит в ancestry PR22. Работа остаётся в backend/customer-post-recovery, Draft PR22 поверх integration/seller-analytics-061. Общая Supabase read-only подтверждена на **0005_livestock_market**, таблица customer_creation_requests отсутствует. Разрешения на общую0006 и окно переключения пока нет; миграция/seed/очистка не выполнялись.

Review подтвердил atomic customer+receipt/commit-before-response, PostgreSQL serialization, replay/conflict, membership при create/replay/lookup, бессрочную retention, tenantFK и совместимость POST без ключа. Код приложения/миграция из e441401 сохранены. Найден операционный риск: raw API0.6.1 игнорирует Idempotency-Key, поэтому откат после начала recovery допускает дубль. Добавлен отдельный **scripts/legacy_customer_guard.py**: старый API с сохранённой схемой0006, но все customer POST и recovery lookup временно возвращают503 CUSTOMER_RECOVERY_PAUSED/no-store. Это отдельный rollback entrypoint, не middleware обычного0.6.2. Нельзя делать downgrade или восстанавливать старый dump поверх новых данных. [Полный review и конкретный план](../CUSTOMER_RECOVERY_ROLLOUT.md).

Backup действительно создан и восстановлен: **scripts/prepare_customer_rollout.py** получил единый read-only MVCC snapshot для qadam, alembic_version и контрольных сумм; оба custom-архива восстановлены в новую локальную **qadam_restore_0006_20261016_test**, 127.0.0.1:55432. Содержимое всех12 таблиц совпало по count/SHA256. Затем только на копии применена0006, alembic check PASS, старые данные неизменны, новая таблица пустая/RLS. Архивы/manifest/логи приватно в игнорируемом tmp/customer-rollout-0006-20261016 с ограниченными ACL; в Git не включены. Это backup qadam+revision, не Auth/Storage; исходная ACL metadata сохранена, restore Supabase owners/grants не заявляется проверенным. Перед будущим rollout нужен свежий snapshot/restore, поскольку телефонная приёмка продолжает записи.

**Проверки:** полный backend suite на отдельной пустой qadam_test — **263PASS**; после добавления теста сбоя миграции затронутый набор customer/rollout/guard/contracts — **28PASS**, пересечения не суммируются. Новый тест подтвердил транзакционный rollback при ошибке после CREATE TABLE/RLS:0005, без новой таблицы/потери клиентов. Ruff check/format и export_contracts --check PASS. Репетиция на восстановленной локальной копии:0.6.2 create → raw0.6.1 действительно дублирует retry → guarded0.6.1 блокирует POST/lookup, оставляет GET/Auth/Analytics →0.6.2 восстанавливает исходныйreceipt без новой строки. TestClient и подписанные синтетические JWT/local JWKS; две синтетические записи только на local restore DB. Это не live Supabase customer recovery. Frontend suite/живой Gemini/физический микрофон в этом review не запускались.

**Координация:** [запрос Бекзату @bekzatwr в существующем PR19](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/19#issuecomment-6216966633) содержит точный опубликованный контракт, key/body/scope/reload/unknown и gate до API0.6.2. Ответ по текущей ветке и подтверждение контракта ожидаются; второй frontend-исполнитель не назначался, UI не менялся. Дополнен CUSTOMER_RECOVERY_API: нельзя fallback на новый key/POST без ключа при timeout/503/смене временного URL.

**Среда сохранена:** API-код **4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5**, checkout ca51bbf; voice frontend **7f511ddc8f3dc0a6fc1550566b9ead9abbfb98ce**. [Актуальные HTTPS URL](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/0737439/docs/VOICE_HTTPS_RESTORED.md), контрольные внешние health/login200 и OpenAPI0.6.1. Сервер, preview и туннели не перезапускались; main/voice-ветка не менялись. Старые PID/URL в предыдущих разделах — исторические.

Следующий шаг: подтверждение контракта Бекзатом, разрешение капитана именно на0006 и согласованное с командой окно переключения. Затем свежий backup/restore, migration/preflight, переключение0.6.2 и настоящий внешний HTTP с Supabase JWT: учебный create, потеря ответа, lookup, replay,409 и foreign404. Эта приёмка пока **не выполнена**; новых клиентов в общей БД в ходе review не создавали. PR остаётся Draft, merge нет.

### 2026-10-16 — Gemini: реальный сбой и безопасная диагностика, отдельно от recovery

Отдельная ветка backend/ai-runtime-diagnostics от remote main1324885/API0.6.1. PR22acce3fd и общая Supabase0005 подтверждены;0006 отсутствует. Капитан разрешил0006/0.6.2 после нового backup/restore, **переключение только после сообщения «окно открыто»**. Пока его нет, миграция/перезапуск не выполняются. Бекзату результат customer recovery передаётся после будущей внешней приёмки, не заранее.

Исходный request_id6baafba2-a7ab-4471-8b1b-fb95e9cc0229 в журнале работающегоAPI не найден: обработанные исключения не логировались. Причина этого старого запроса неизвестна,429 не приписывается. Read-only окружение именно listener9272 подтвердило AI_API_KEY present и AI_MODEL=gemini-3.6-flash, совпадение с.env; значения ключа не выводились. Работающий код4f67e2c/checkoutca51bbf, voicefrontend7f511dd не изменялись.

**Живой Gemini:** через исходный адаптер с process env — текст provider503/UNAVAILABLE, синтетическое WebM provider200 и валидированные300000/300000minor. Через действующий внешнийHTTPS — текст503, аудио200/неподтверждённый draft fefde9eb-c1e7-4fe8-8152-73a95c6a5452. На отдельном временномHTTP8023 с патчем — текст200/draft1ac0a79c-ee55-4e92-8dc5-1887b340116f; аудио decode32мс PASS, затем provider503 через18562мс. Новый requestd80df26b-ca17-4ae4-9c5c-f7673aaa0da1 точно связан с provider_http/HTTPStatusError. Это непостоянный отказ провайдера, не подтверждённая ошибка декодирования/ключа; доступность Gemini не считается исправленной. Никаких confirmations/денежных операций, counts13→13, очистки нет. Синтетическая речь, не телефонный микрофон; реальное recording.webm не сохранялось/не использовалось повторно.

**Исправление:** services/ai_diagnostics.py + services/ai.py + draft_routes.py сохраняют request_id/stage/provider_status/error_type/error_code/duration_ms при преобразовании исключений. ContextVar изолирует параллельные запросы. Только allowlisted metadata; нет JWT/key, текста, аудио, имени файла, exception message/traceback или полного ответа. Прежние схемы/ошибки/deadline/retry/manual fallback и денежные правила сохранены. Патч работает только в диагностической проверке, не загружен в общий процесс.

**Заглушки/локальная PostgreSQL:**73PASS затронутых AI/audio/draft/contract tests; после уточнения классификации CancelledError по deadline повторены9 диагностических тестов (пересечения не суммируются). Покрыты400/429/503, timeout/invalidJSON/configuration, отмена transport по общему deadline, конкурентная корреляция и route error. Ruff check/format, export_contracts --check PASS.429 был только в тесте. Физическая проверка/новый frontend suite не заявляются. Временный8023 остановлен, общий8018/preview/туннели/CORS сохранены. [Полные результаты, requestIDs, адреса и следующий шаг](../GEMINI_RUNTIME_DIAGNOSIS.md). Отдельный incident остаётся открытым; включить проверенный патч при согласованном окне, затем сопоставить новую попытку телефона с безопасными логами. Main/voice не менялись, платных услуг/merge нет.

### 2026-10-16 — OpenAI: явный серверный адаптер и ограниченная платная оценка

Ветка `backend/openai-drafts` от PR #30 `33cb37a` (main `1324885`), отдельно от PR #22. Добавлены `services/openai_provider.py`, `ai_provider.py`, `ai_request.py`, безопасные usage/model/stage метаданные, config/env.example и 33 теста. Text → strict Responses/Luna; audio → нормализованный WAV → transcription → те же валидируемые поля. Один deadline 25 с, один платный pipeline без retry. Опциональный однонаправленный fallback только после Gemini503/timeout, default off. Наблюдаемый ASGI disconnect отменяет работу; настоящий TCP-тест обнаружил и устранил проблему probe за middleware. Поздний результат не сохраняется. Ограничение: disconnect во время уже начатого COMMIT может оставить неиспользованный TTL-черновик, не деньги; разные POST drafts не стали идемпотентными.

**Живые API провайдеров, без БД:** OpenAI проектный GET models200; текст Luna 6/6 (RU/KZ/mixed, неизвестная оплата/неоднозначный клиент/погашение). Gemini те же синтетические тексты 4/6, два настоящих provider503. Три разрешённых учебных OGG отправлены только OpenAI: mini STT верно RU3000/1000, KZ суммы null, mixed7000/оплата null/ошибка имени. GPT-Transcribe + Luna: KZ5000/2000 и mixed7000/4000/учебное имя верны; RU STT200, но два extraction timeout25с, дальнейшие повторы остановлены. Ни автоматического выбора/создания клиентов, ни сохранения черновиков/денег; записи и транскрипции не публикуются. Это реальные вызовы адаптера, не общий HTTP/UI/телефонная приёмка.

13 платных pipelines, защитный резерв $0.65/$2. Полученная usage/duration оценка $0.004194549 **не полный счёт**: стоимость двух прерванных extraction без usage неизвестна и остаётся покрыта резервом. Billing не запрашивался. Модели/тарифы/точные результаты и ограничения: [OPENAI_DRAFT_EVALUATION](../OPENAI_DRAFT_EVALUATION.md).

**Тесты с заглушками:** полный backend `pytest -q` — **280 PASS** на отдельной PostgreSQL; 33 новых tests включены в это число. Реальный loopback TCP-разрыв + test PostgreSQL:0 Draft/Operation; membership до провайдера, fallback→1Draft/0Operations, ошибки/late answer/общий deadline PASS. Прежние TTL/однократное атомарное подтверждение/журнал покрыты полным набором. Ruff check/format и `export_contracts --check` PASS. Предупреждение Starlette о будущей замене httpx в TestClient; тесты не пропущены. Команды и env в README/отчёте. Публичный контракт/generated/examples прежние, AI_INTEGRATION дополнен без изменения схем.

Рекомендация — явный OpenAI для ограниченной текстовой проверки после review/окна, fallback off; голос ещё не принят целиком из-за RU timeout. Следующее: безопасная HTTP/UI-проверка и исследование стабильности Responses для RU, без бесконечных повторов; frontend только сохраняет прежнюю форму/уточнение/подтверждение. Общие env/БД0005/API0.6.1, voice preview и туннели не изменялись;0006 не применена, restart не выполнялся. Customer rollout ждёт «окно открыто». Исходный Gemini request_id остаётся отдельным incident. Main/ветки друзей/постоянный деплой не менялись.

### 2026-10-16 — продолжение PR33: RU, семантика и отдельная проверочная API0.6.2

Код OpenAI `aa897fd`, тестовая изоляция логов `04a1ba7`; проверочная сборка `integration/openai-recovery-062` / **76e03d0927ec6b266de23b8a9905522fc7a6beeb** содержит PR22acce3fd и PR30 33cb37a. Merge09b029f конфликтовал только в API README/handoff, сохранены обе передачи. Main1324885, ветки recovery/диагностики/команды не менялись. Recovery OpenAPI0.6.2/generated/examples/миграции побайтово сохранены. [Точная диагностика, таблица результатов, запуск и режим защиты](../OPENAI_DEFENSE_READINESS.md).

**Живые OpenAI, без БД:** прежняя транскрипция не сохранялась. Новая RU STT проверена в составе аудиопути и затем этот же текст напрямую: identical JSON3325bytes/75chars, Luna/none/2048,2.937с против10.000с extraction; полный путь4.594с, оба3000/1000₸. Исторический timeout не объявлен исправленным, общий25с не увеличен. Добавлены безопасные request_body_bytes/input_chars. Для явной иностранной валюты OpenAI prompt уточнён доunknown/null без пересчёта; неизвестная оплата null, явное неоплаченное0,тиыны/repayment проверены. Gemini prompt и журнал не менялись.

Новый полный аудиопрогон:RU3000/1000 PASS19.610с,KZ5000/2000 PASS11.484с,**mixed7000/3000 FAIL вместо7000/4000**,3.625с. Один целевой mixed повтор5.125с верен; источник/payment evidence содержат4000,не3000, валюту/долг сохранил. Ошибочный прогон не ретроспективно приписывается конкретному этапу, его текст не сохранён. Поэтому нельзя писать3/3 или обещать надёжный голос. Никаких клиентов/сохранённых drafts/денежных операций, записей/транскрипций в Git/логах нет.

Дополнительно15 paid pipelines, совокупно28. Оценка новых завершённых этапов$0.004391561, всего доступных оценок$0.00858611; фактический billing неизвестен, два старых extraction безusage не обнулены. Защитный совокупный резерв$1.40/$2, не фактическая стоимость. Больше платных вызовов после этой проверки не выполнялось.

**Автоматические:** отдельная версияPR33 доmerge281PASS; объединённая API0.6.2 **307PASS** на отдельной test PostgreSQL. Первые2log-capture теста упали из-за Uvicorn-конфигурации recovery; исправлена изоляция тестов, весь набор повторён. Включены реальные loopbackHTTP/disconnect/recovery-loss тесты со stubAI/localJWT, миграция0006/rollback, изоляция и денежные правила. Ruff/check/format/export_contracts PASS. Frontend контракты **73PASS** в4наборах с HTTP-заглушками, check:api/typecheck/lint PASS. Физический микрофон, свежая браузерная приёмка и общийHTTP сOpenAI/0.6.2 не заявляются.

Режим защиты: основной AI-ввод текст RU/KZ/mixed, OpenAI gpt-6-luna; STT-кандидат gpt-transcribe с обязательной человеческой сверкой, mini не использовать как общий KZ/mixed. Fallback off, общий25с, без paid retries; при ошибке сохранить форму и перейти к ручному вводу без подстановки0. После неоднозначного денежногоPOST сначала тот жеkey/body, не новая операция. Следующий шаг — review/согласованное окно, свежий backup/restore и внешнийHTTP/UI acceptance. Общая Supabase0005/customer receipts отсутствуют, API0.6.1/voicepreview/обаHTTPS сохранены;0006 не применялась, процессы/env/CORS не менялись. Старый Gemini incident остаётся отдельным.


### 2026-10-16 — окно открыто: API0.6.2 / customer recovery работает

По разрешению капитана выполнен rollout **4e983b42a2a0466d2fc07e4de09becf87a8ef7d5** (`integration/openai-recovery-062`, PR22+30+33). Remote main1324885 и PR22acce3fd/30 33cb37a/33cba6b32 проверены. Общая qadam-demo теперь **0006_customer_requests**; API8018/внешний OpenAPI **0.6.2**. Работающий checkout остался чистым на4e983b4, отчёт подготовлен в отдельной документационной ветке. [Адреса и полный отчёт](../CUSTOMER_RECOVERY_LIVE_ACCEPTANCE.md), [Flutter](../FLUTTER_CONNECTION.md).

Свежий MVCC backup qadam+revision в приватном ignored tmp/customer-rollout-window-private/fresh-0006 реально восстановлен в новую отдельную qadam_restore_0006_window_test на127.0.0.1:55432. Count/content SHA256 всех12 таблиц совпали; локальные0006/alembic check PASS. До общей миграции проверены archive SHA256 и совпадение живых данных со snapshot. После применения старые12 таблиц неизменны, receipt table пустая/RLS/без direct PUBLIC/anon/authenticated grants, alembic check PASS. Не полный backup Auth/Storage, не проверка восстановления Supabase owners/grants. Seed/очистки/downgrade нет. Preflight8020 с реальными JWT/CORS прошёл, затем заменён только8018. Guard-откат не потребовался.

**Новая живая HTTP-приёмка:** внешний HTTPS, настоящие Supabase loginA/B6/3точки, PostgreSQL и Storage. POST с потерянным ответом через relay → GET completed → replay тот же201/ID → другое тело409; чужие create/lookup/list404, безJWT401; legacyPOST без ключа совместим. Sale3000/paid1000 → debt2000, repayment500 → debt1500; дельты аналитики/summary, средний чек/дневные суммы и replay двух операций PASS. Recovery snapshot balance0. Мал базар feed/mine/market/prices, synthetic PNG→JPEG/noEXIF upload/replay/privateA200/B404/publicphoto200 PASS. Все8 livestock OpenAPI paths и прежние component schemas неизменны относительно0.6.1. FlutterPR15 1a93469 проверен по transport/validators, SDK/устройство не запускались.

**Новый браузер:** действующий HTTPS frontend7f511dd, Chromium390px, настоящий AuthA→/me→Analytics→logout→B→изоляция404→logoutguard PASS; внешниеAPI, безlocalhost/Demofallback. Синтетический MediaRecorder/playback/pause/delete/cancel PASS, текст сохранён. Аудио не отправлялось, физических телефона/микрофона не было. Браузер не создавал денег: операции выше черезHTTP. Ignored runners: rollout_062_acceptance.py, run_rollout_062_browser.py; безHAR/trace/session artifacts. Прежние307 backend/73 stubfrontend не выдаются за новый полный прогон; код не менялся.

Учебная точкаad6203bc-7320-5b36-982b-135504c5af68. Клиенты737fd8e6-7707-430b-9800-6723cdff91f5 (keyed) и723b5ff5-a98a-4cd0-b298-b1f8afada41f (legacy), sale0610d6cd-069e-4104-9e7e-e2593d6ef9c0, repayment6b2bf2f3-6a43-433e-a3b6-66d9d28083fa, photo75094591-28ac-5078-9ade-a02c42a91317. Явные DEMO rollout062, фото32×32синтетика; не удалялись. Итоговые counts: customers14→16,operations15→17,idempotency15→17,photos4→5,livestock_requests16→17,customer_receipts0→1. Businesses9/catalog9/drafts8/inquiries2/listings4/memberships9/venues3 прежние.

Среда: оба URL/точныйCORS/voicepreview/env/Auth/Storage сохранены. AI **Gemini/gemini-3.6-flash**, fallbackOpenAI=false; платных вызовов нет, прежний резерв$1.40/$2 сохранён. Старый incident6baafba2-a7ab-4471-8b1b-fb95e9cc0229 не закрыт. Команда может возобновить запросы. Следующий шаг: Бекзат подключает recovery в своей ветке; Flutter проверяет устройство; новыйAI-режим согласовать отдельно. При откате только guard0.6.1+0006, никакого raw0.6.1/keylessfallback. Main/voice/ветки друзей/merge/deploy не менялись.

### 2026-10-16 — общая проверочная web-интеграция поверх работающего API0.6.2

Ветка **integration/unified-web-062**, код **b89990254a6bdfe3c48274193f0cd494830c73b8**, основа rollout4e983b4 и docs1ba7d40. После ancestry review включена одна цепочка дизайна PR24→26→27→29 (3765ddb), Auth PR31 c2a9402 и PR32 713f00f. [Полный состав, команды, локальные учебные IDs и ограничения](../UNIFIED_WEB_062_REVIEW.md). Общий backend остаётся4e983b4, preview7f511dd, Supabase0006; оба внешних URL/health/OpenAPI/точный CORS повторно проверены без перезапуска. Новых общих customer/financial/draft writes, миграций, seed и очистки нет.

**Review recovery:** разрешённая fd21874 проверена, затем целиком исключена revert6072cc6. После неизвестного результата в CustomerPicker уже смонтированная форма страницы использует новый ключ для того же создания. Воспроизведён падающий компонентный regression с разными UUID; [patch для автора](../qa/customer-recovery-picker-regression.patch). Backend не может объединять разные intent по имени клиента. Нужен общий coordinator и синхронизация durable pending state; второй исполнитель не назначен. Auth fences исключены вместе с этой веткой, generated/OpenAPI0.6.2 сохранены. Живая frontend recovery приёмка остаётся заблокированной, backend recovery и legacy POST проходят тесты.

**Backend PR32:** уточнение одной операции и quota429 совместимы с OpenAI/диагностикой; исправлено ожидание OpenAI-теста на AI_QUOTA_EXCEEDED. Runtime money/recovery/analytics/livestock, TTL, cancellation и схемы не изменены. Активный процесс подтверждён: **Gemini / gemini-3.6-flash**, fallback=false. Один новый реальный Gemini UI запрос вернул provider HTTP503 за2719мс (b4a9360d-f98d-47ed-95b5-1542d8e130fd), ввод сохранён, ручная запись прошла только в local test DB. Полного живого AI-цикла нет. OpenAI не вызывался; прежний резерв$1.40/$2 не изменён. Старый Gemini incident не объявлен исправленным.

**Фактические проверки:** backend309PASS на отдельной PostgreSQL; Ruff/check/format/export PASS. Frontend265PASS, check:api/typecheck/lint/build PASS; strict microphone35 (27 пересечений). Синтетические browser Auth7, mic18, Analytics/standard24, QA21 (8 пересечений), money journey1 PASS. Настоящий Supabase login A/B + новый local FastAPI/PostgreSQL: customer/reload, черновик неизвестной оплаты→уточнение→выбор клиента→подтверждение→history→Analytics без reload→reload, monetary replay и A/B404 PASS; **только AI этого полного сценария заменён заглушкой**. Public browser:360/390/1440, девять hotspots, fallback без WebGL/при GLB error PASS. Физический телефон/микрофон и email delivery не проверены. В SceneAnchors исправлена устаревшая camera matrix, итоговые desktop/mobile screenshots осмотрены; новых GLB не требуется.

**Свежий remote PR31:** 10d9bba добавил signup b156bc3 уже после основного прогона. Diff прочитан, автор оставил callback/email Blocked; эта незавершённая часть не включена. Проверенный c2a9402 сохранён. Предложение callback/PKCE/точного allowlist передано автору в PR31, настройки Supabase не менялись, подтверждение участника ожидается. Устройства/реальные email и recovery UI — следующие задачи их владельцев, не новая параллельная реализация.

Отдельный public-env artifact b899902 собран для будущего preview: внешний API/Auth настроены, серверные секреты отсутствуют. [Инструкция](../UNIFIED_WEB_062_REVIEW.md) и [отдельный план постоянного хостинга](../PERMANENT_HOSTING_PLAN.md) обновлены. Следующий шаг — review Draft PR, исправление recovery Бекзатом, callback-согласование и отдельное разрешение переключить preview/backend PR32. Main, действующий API и preview автоматически не переключать.

### 2026-10-16 — preparation for laptop-independent hosting

Branch `deploy/permanent-062` from PR35/cacf57a. Captain has Vercel, no Render account yet. Added root render.yaml (explicit Free Python service, manual deploys, locked uv installation), apps/api/deploy_start.py (required configuration, one worker, no migrations/seed), apps/web/vercel.json (Vite/SPA), and a public-env build guard. Full setup and acceptance: docs/DEPLOY_VERCEL_RENDER.md.

Actual checks: uv lock --check --offline PASS (42 packages); Ruff check/format PASS; JS syntax and four public-env cases PASS (valid/missing/localhost/server-secret); startup configuration exercised with mocked uvicorn PASS; Prettier and diff whitespace PASS. No new app/runtime code or dependencies changed. Linux build/PyAV and hosting ingress/memory/cold start remain unverified. Docker daemon is unavailable. Existing upstream tests are not claimed as rerun.

No hosted service exists yet, no permanent URL. Browser inventory is empty and iab unavailable in this session; account authorization cannot be completed here. User will create Render account, existing Vercel will host frontend. Secrets have not been copied to any hosting provider. Database, current API, previews, tunnels, main and team branches unchanged. Candidate still excludes faulty frontend recovery and unaccepted signup, Gemini default/fallback off retained. Next: authorized account setup, actual Render/Vercel builds and end-to-end acceptance before team URL change.

### Проверочная интеграция PR #36 после приёмки e699158 — без production push

Отдельная ветка `integration/models-render-062` от последнего PR #37 `6ab0c11`. Только один commit моделей PR #36 `996a1b4` перенесён как **a5685636ffeaa100ee07b55e332aac783b845a09**; старые ветки дизайна не сливались. Конфликт DECISIONS разрешён сохранением обеих сторон. Вся история e699158 сохранена; apps/api, контракты, web/src, Auth/деньги/аналитика/recovery неизменны. 265 frontend unit/component, typecheck/lint/build/check:api и 24 Chrome E2E PASS. Asset validator и Khronos — без ошибок/предупреждений. Локальная production сборка: software WebGL на 360/390/1440, 27 hotspot-переходов, шесть fallback случаев, осмотр desktop/mobile снимков. Render использован только для публичных GET с тестовым CORS bridge, 9 UUID/slug совпали. Это не физический телефон и не production deployment. Backend-тесты не повторялись: код совпадает с принятым e699158.

Vercel GLB по SHA-256 всё ещё совпадают со старым 0f97c44; новые модели на сайте отсутствуют. Render остаётся e699158 по подтверждению капитана. APK не собирался, конкретный APK команды не идентифицирован. После review переносить в deploy-062 только с отдельным разрешением: push запускает production Vercel. Не синхронизировать deploy/permanent-062 вслепую поверх вручную развёрнутого e699158.

Исходный recording.webm среди разрешённых локальных записей не найден, его ожидаемые суммы неизвестны. План одного pipeline: STT + extraction, без retry/confirm; предложенный потолок согласования $0.05. Бюджет $2: резерв $1.80, доступные неполные estimates $0.00944561, billing неизвестен; $0.20 резерва не считать фактическим остатком. Платных запросов/нового резервирования нет, инцидент не закрыт. [Полный отчёт, разграничение GitHub/Vercel/Render/APK и задачи владельцев](../MODELS_DEPLOY_REVIEW.md). Main, production-ветки, серверы, БД и миграции не менялись; чужие handoff импортированы без редактирования, сообщения участникам не отправлялись.

### 2026-10-16 — реальная hosted AI-приёмка после ручного переключения Render

**После ручного deployment диагностики:** капитан подтвердил Live **e699158b5238285fb02c85bc5d92c45a3cc4ca84**, отзыв старого OpenAI key и применение нового. Независимо через HTTPS проверены health 200 (484 мс), OpenAPI 200 (1735 мс), точный контракт 0.6.2, настоящий Supabase login A/B → /me 200 (6/3 непересекающиеся точки), anonymous 401. Customers/operations/summary/analytics своей точки — 200, чужой — 404 в обоих направлениях. Vercel CORS 200 с точным origin, посторонний origin 400 без allow-origin. В 21 JSON-ответе 200/401/404/422 и заголовках нет внутренних diagnostic fields/известных секретов; ErrorResponse и request ID сохранены. Новый AI 503 не провоцировали, stage не выдаём за живьём проверенный: для него есть прежние review/314 тестов. Платных AI-запросов и прикладных writes нет; БД, миграции, Vercel и туннели не менялись. Public health не сообщает SHA, GitHub deployments/checks/statuses e699158 пусты, Render management недоступен: running commit и ротация подтверждены капитаном, не независимо агентом. [Подробный post-deploy отчёт](../RENDER_DIAGNOSTIC_ROLLOUT.md). Следующий шаг — получить исходный recording.webm/ожидаемые суммы и отдельное разрешение на один платный целевой повтор; инцидент остаётся открытым. Неплатная приёмка deployment завершена, нижеследующие pre-deploy записи исторические.

**Последующее review PR #37, без платных вызовов:** капитан предоставил build → Live лог с `0f97c44c672363eebb319f295f76bfd8b87c4610`. Remote deploy-ветка не изменилась. Патч c6e0411 проверен относительно этого commit: фиксированные причины/длины, без аудио, текста, клиентов, ключей или JWT; денежная логика не меняется. Кандидат Render **e699158b5238285fb02c85bc5d92c45a3cc4ca84** сохраняет весь deploy head. Исправлена обнаруженная зависимость diagnostic-тестов от порядка: loopback Uvicorn больше не меняет глобальные logging handlers. После исправления 86 targeted и 314 full backend PASS на отдельной test PostgreSQL; Ruff/format/export PASS. Текущий HTTP до нового deployment: health/OpenAPI 200, 0.6.2, A/B /me 200 (6/3), anonymous 401, foreign 404, точный CORS. Management-доступа Render нет, поэтому новый код не развёрнут; post-deploy smoke ожидает ручного Live. Капитан сообщил о замене OpenAI key в локальном env и Render; отзыв старого и применение к процессу ещё не подтверждены. Подготовлены [точные шаги и безопасный откат с новым ключом](../RENDER_DIAGNOSTIC_ROLLOUT.md). Исходный recording.webm/ожидаемые суммы не предоставлены, в логах нет Responses/validation/save; инцидент открыт. Целевой повтор спланирован, но не разрешён к запуску. Shared БД/миграции, Auth/Storage, Vercel, main и туннели не менялись.

**Обновление remote перед публикацией отчёта:** Бекзат опубликовал исправление recovery `50ea34d`, текущий head `9a3c868`. Прежнее указание ниже «исправляет fd21874» относится к началу проверки. Новый diff прочитан, но не включён в деплой и независимо не принят. Нужна отдельная проверка перехода CustomerPicker → страница клиентов и миграции legacy intent при смене API origin; подробности в HOSTING_TEAM_HANDOFF.

Отдельная ветка **review/hosting-acceptance-062** от deploy0f97c44; code **c6e0411ca485d43552caebf50b85dd9a0d232915** добавляет только безопасную диагностику непригодной транскрипции и quota-code. [Полный отчёт с request/draft IDs, временем, бюджетом и границами доказательств](../HOSTING_AI_ACCEPTANCE.md), [неотправленные тексты команде, постоянный callback и Flutter config](../HOSTING_TEAM_HANDOFF.md). Капитан уже опубликовал Vercel/Render, затем сам применил OpenAI Environment; агент не получил Render admin key и не менял деплой.

Публичные адреса: `https://qadamx-taraz.vercel.app`, API_BASE_URL `https://qadamx-taraz.onrender.com/api/v1`. OpenAPI0.6.2 целиком соответствует0f97c44, read-only ревизия0006. Точный CORS Vercel, посторонний origin отклонён, anonymous401; реальные браузерные запросы идут наRender/Supabase безlocalhost/tunnel. JS chunks проверены на известные server secrets. Vercel GitHub deployment status связан с0f97c44, но actual alias/Render process SHA независимо не доказаны. Runtime extraction model/fallback и SSL именно Render требуют panel/log evidence; не выдавать ветку/local env за running state.

Логи капитана установили: **0d2772f8 — Gemini/gemini-3.6-flash HTTP429**; **d53a7f33 — OpenAI/gpt-transcribe HTTP200,11.46с аудио,2.025сSTT**, затем общий AI_UNAVAILABLE до наблюдаемогоopenai_extraction. Код проверяет1–4000chars transcript.text, но старый лог не различает missing/type/empty/too-long. Конкретная причина recording.webm остаётся ограниченно локализованной, не объявлена исправленной. Новый stage openai_transcript_validation пишет только фиксированный reason и длину, не текст. API/схемы/журнал/timeout/ретраи не менялись. Render patch не развёрнут.

**Живые проверки:** RU3000/1000(4.703с),KZ5000/2000(3.969с),mixed7000/null(3.579с),разрешённаяRUOGG3000/1000(4.844с) —HTTP200 черезRender. НастоящийVercelUI unknown3000/null→уточнение3000/1000(4.257/3.514с)→ручная правка1500 PASS.6неподтверждённыхdrafts наdemoMART,0денежныхPOST/новых клиентов/фото, Analyticscardsдо/послеравны. A6точек→Analytics7/30/history/summary/reload→logoutB3→foreign404/customers/operations/analytics/summary/recovery→logoutguard PASS. Public360/390/1440,9hotspots,GLBвизуально иfallback PASS; screenshots осмотрены. Physicalmic/Android не тестировались.

**Заглушки/локальные:** late response послеcancel и503 сохранениеввода проверены отдельно в браузере, без provider call. **314 backend PASS** на отдельнойlocalPostgreSQL,Ruff/check/format/exportPASS,5новыхtranscript-validationcases. Тесты общейБД не касались. Первые browserharness failures: ошибочное ожидание disabled-кнопки и слишком короткое ожиданиеhostedGLB; исправлены тесты, продукт ради них не менялся.

**Бюджет:** прежнийreserve1.40+0.10наприсланные/неопределённыеusercalls+6×0.05=**$1.80/$2**,осталось$0.20защитногорезерва. Доступная новаяestimate$0.0008595толькоизSTTлога;usageшестипроб недоступен,billingнеизвестен,нулевойрасходнеприписываем. Платныевызовыостановлены. КлючизIDEпопалвчат:капитанпредупреждёнонеобходимостиотзыва/замены;значениевGit/артефакты/логи не переносилось.

Следующее: review diagnosticpatch; подтвердитьLivecommit/model/SSL, при необходимости согласованно применитьpatch и одинраз воспроизвести разрешённый originalaudio в оставшемся резерве. Полнуюhostingприёмку money/photo/coldstart завершить отдельно послеприоритетногоAI. Бекзат исправляетcoordinatorfd21874 ипринимаетcallbackcontract;10d9bbaрегистрацияещёнедопущена,демоmembershipsневыдавались. Aidana7c19a22прочитанкакhandoffк713f00f,повторногomergeнет. FlutterPR25/421b2fbполучаетpublicконфигдляпересборкииchecklistустройствачерезкапитана. Main/веткикоманды/БД/Storage/Auth/туннелинеизменялись.


### 2026-10-17 — recovery review и отдельный выпуск моделей

Проверен remote recovery **9a3c868**: 50 авторских customer/Auth тестов PASS, новый regression late-success-after-unmount **FAIL**. Поздний ответ K1 удаляет новый unknown intent K2; recovery остаётся вне релиза. Бекзату переданы воспроизведение и требования compare-and-clear/scope fencing; legacy intent без API origin также требует безопасной обработки. Ветка автора не менялась.

Отдельная сборка от принятого PR38/5118fd1 сохраняет e699158, API0.6.2, Auth/AI/аналитику/контракты и новые GLB. Повторно: 265 frontend tests, 24 synthetic Chrome E2E, typecheck/lint/build/check:api и asset validator PASS. Код приложения/контрактов не менялся. До production push сохранены прежний deployment DpvX4gCcsQ9RNCw62u5DxqGhKFqy, commit0f97c44 и хеши production GLB; это GitHub status + HTTP evidence, не management API alias lookup. Render/main/БД/миграции/туннели не меняются.

Капитан подтвердил отсутствие исходного recording.webm. Точный повтор невозможен, старый инцидент не закрыт. Подготовлена инструкция сохранения нового файла телефона: новая запись считается новым сценарием; платные вызовы не выполнялись. [Полный review, rollback и передача команде](../MODELS_PRODUCTION_ACCEPTANCE.md). Результаты фактического Vercel deployment будут дописаны отдельно после проверки.


### 2026-10-17 — модели реально опубликованы на production Vercel

Release **a8e358f9d3f555bb1456847f980e931597bfd6a6** в deploy-062; Vercel event **Dqtc8FnqY4QGcfM3WKxWDQxuvmpV** success и все3 production GLB SHA256 совпадают. Отчётный commit отдельной review-ветки не означает ещё один production deploy. Recovery9a3c870 исключён из-за подтверждённого late-response удаления нового pending intent. Диагностический e699158 сохранён, Render не переключался; process SHA остаётся подтверждением капитана, публичный API0.6.2 повторно проверен.

Новый настоящий Vercel→Render browser loginA6→точка→клиенты/history/summary HTTP200→Analytics7/30/reload→logoutB3→foreign404→logout PASS. Production3D360/390/1440,RU/KZ,27hotspots/6введённыхfallbacks PASS; физический телефон не заявляем. Read-onlyHTTP health/OpenAPI/Auth/CORS/изоляция/21JSONprivacy PASS. Ни новых клиентов, ни денег, ни AI-запросов, ни миграций. [Полный отчёт и следующий шаг по владельцам](../MODELS_PRODUCTION_ACCEPTANCE.md). APK не обновлялся. Исходный recording.webm отсутствует, инцидент открыт; новая запись будет отдельным сценарием после разрешения расходов.

### 2026-10-17 — мелкие исправления: title страниц и stage в health

Ветка `fix/titles-health-stage` от main `8fa0029`.

- `GET /health` и `/api/v1/health` возвращают `stage: "mvp"`. Значение `manual-ledger` устарело: в API уже есть AI-черновики, каталог, заявки, аналитика и Мал базар. Это изменение константы контракта. Обновлены `openapi.json`, `generated.ts` и тест. Версия кода API не менялась (0.6.3 в main, на production Render — 0.6.2), клиенты значение `stage` не читают. В публичном API значение появится только при следующем deployment backend. Этот deployment нельзя запускать до миграций 0007/0008 (см. TEAM_FINAL_INTEGRATION_20261017).
- Web: на публичных страницах (`/`, `/venues/*`, `/shops/*`) вкладка называлась «Кабинет продавца». Теперь там «Магазины рынков Тараза · Qadam Business» (KZ: «Тараз базарларының дүкендері»). На `/login` и `/seller/*` заголовок остался прежним. Это небольшое исправление в зоне seller-web (`app/App.tsx`, `shared/i18n`), согласовать в PR.
- Проверки: API — ruff, format, `export_contracts --check`, pytest: 204 прошли, 153 пропущены без отдельной PostgreSQL. Web — check:api, typecheck, lint, Vitest 396/396, build: всё прошло. Браузерные E2E не запускались. Не трогали Render, БД, миграции и AI.

### 2026-10-17 — README: запуск и деплой, ссылка на APK 0.5.2

Ветка `docs/readme-run-deploy` от main `34250ed`. README RU/KZ: подробный локальный запуск (требования, БД, API, сайт, Flutter, переменные) и раздел о деплое (Pages Direct Upload, Render по `render.yaml`, Supabase, OpenAI, Releases). Статус Safari записан со слов команды: основные функции сайта проверены вручную; Flutter на физических телефонах остаётся открытым. Ссылка «Открыть приложение для Android» на сайте ведёт теперь на релиз 0.5.2 вместо 0.3.0, текст RU/KZ обновлён. Проверки: mal-bazar и venue-showcase 7/7, typecheck и lint прошли, ссылки README целы. На сайте изменение появится только после новой публикации Pages, Render не затронут.

### 2026-10-18 — «Спросите Qadam»: AI-помощник продавца, API 0.7.0

Ветка `feature/ai-assistant-api` от main `45b0384`. Новый `POST /api/v1/businesses/{id}/assistant`: сервер собирает факты точки (аналитика за 7/30 дней и прошлый период, итог дня, до 5 должников), модель через существующий серверный адаптер OpenAI/Gemini только формулирует ответ и действия. Каждое число и `customer_id` проверяются по фактам; при любой ошибке AI или проверке — 200 с `source=fallback` из серверного шаблона RU/KZ. Записей в журнал нет, напоминание — текст для копирования. Флаг `ASSISTANT_ENABLED` (по умолчанию выключен → 404 `ASSISTANT_DISABLED`), лимит `ASSISTANT_DAILY_LIMIT`=20 на пользователя в сутки в памяти процесса (429 `ASSISTANT_LIMIT`). Без миграций.

Контракт: [ASSISTANT_API.md](../../packages/contracts/ASSISTANT_API.md), `openapi.json`, `examples.json`, `generated.ts`. Проверки: ruff, format, `export_contracts --check`, web `check:api` и typecheck прошли; pytest на локальной PostgreSQL `qadam_test` — 383/383, из них 22 новых (проверка чисел, отказ при выдуманной сумме или чужом клиенте, fallback при сбоях, изоляция точек, 401, 422, лимит, KZ, отсутствие записей). Модель в тестах — заглушка, платных вызовов не было.

Выпуск: Render вручную после review, в Environment добавить `ASSISTANT_ENABLED=true` (провайдер и ключ — существующие `AI_PROVIDER`/`OPENAI_*`). Один контрольный платный вопрос — после резерва $0.05 в журнале бюджета. Если что-то не так — `ASSISTANT_ENABLED=false` выключает метод без отката кода.

**Выпуск 2026-10-18 01:14 GMT+5.** `main`, `deploy-062`, `deploy/permanent-062` = `3061623` (fast-forward). В Render Environment добавлен `ASSISTANT_ENABLED=true` («Save only»), затем Manual Deploy `dep-db9te3jrjlhs7383v1dg` из `3061623`. Проверено: OpenAPI 0.7.0, health 200 (`stage: mvp`), `/assistant` без JWT 401, preflight с Pages 200, `/venues` 3, `/businesses` 9, `/me` без JWT 401, Pages `/`, `/login`, `/seller` 200. Точка отката — деплой `8fa0029` в истории Render; выключить помощника без отката — `ASSISTANT_ENABLED=false`. Контрольный вопрос с JWT продавца ещё не задавался: сделать через интерфейс после выпуска фронтенда, с резервом $0.05 в журнале бюджета.

### 2026-10-18 — помощник: режим сводки без AI, API 0.7.1

`POST /assistant` принимает `ai` (по умолчанию `true`). `ai=false` возвращает те же факты и серверную сводку RU/KZ с `source="facts"`: без вызова модели, без расхода бюджета и без дневного лимита. Сводка теперь сравнивает продажи с прошлым периодом. Нужен для автоматической загрузки «Итога периода» и «Кому напомнить» на аналитике и главной; AI — только по явной кнопке. Контракт, пример `AssistantFactsResponse`, OpenAPI и `generated.ts` обновлены; в web добавлен явный `ai: true` в существующий запрос помощника и в два теста. Проверки: API 387/387 на локальной PostgreSQL (портативный сервер в `tmp/qadam-pgdata-ledger` был остановлен и запущен заново на 55432), ruff, format, export; web check:api, typecheck, lint, build, Vitest 509 (mal-bazar отдельно 4/4).

**Выпуск 0.7.1, 2026-10-18 ~10:40 GMT+5.** `main` = deploy-ветки = `0a2ac3b`, Render Manual Deploy `dep-dba5g661egvs739egbvg`. Проверено: OpenAPI 0.7.1, `ai` в запросе, `source` ∈ ai/fallback/facts, health 200, `/assistant` и `/me` без JWT 401, `/venues` 3, CORS с Pages 200. Environment не менялся. Текущий сайт Pages совместим (без `ai` API ведёт себя как 0.7.0).

### 2026-10-18 — аналитика: собираемость и возраст долгов, API 0.7.2

`GET /analytics` получил необязательные `collection` и `debt_aging` (один SQL-снимок с остальной аналитикой, без миграций). Инварианты проверяются во всех тестах аналитики: собираемость в сумме = продажи периода, возраст долгов в сумме = «Мне должны». Новые тесты: корзины 0–7/8–30/31+, отменённая продажа, отменённое погашение. Текущий web принимает ответ с новыми полями (проверено на `readAnalyticsSnapshot`), поэтому API можно выпускать раньше фронтенда. Контракт: `packages/contracts/ANALYTICS_API.md`, `openapi.json`, `examples.json`, `generated.ts`.

**Выпуск 0.7.2, 2026-10-18 ~12:50 GMT+5.** `main` = deploy-ветки = `e34ca6b`, Render `dep-dba6vbjrjlhs739596n0`. Проверено: OpenAPI 0.7.2 с `collection` и `debt_aging`, health 200, публичные `/venues` и `/businesses` 200, `/analytics` без JWT 401, CORS с Pages 200; текущий сайт (Pages `11f8c826`) в живом кабинете показывает аналитику без ошибок. Environment не менялся.

### 2026-10-18 — интегратор: «Напомнить в WhatsApp», отдельный frontend PR

Ветка `feature/whatsapp-reminder` от свежего `origin/main` **daa0a0d517b3e32a347754064030e56c730bf8cb**. По срочному поручению капитана изменены только frontend и его тесты/документация. В `shared/whatsapp.ts` — согласованные RU/KZ шаблоны с общим `formatKZT` и `wa.me` с `encodeURIComponent`. Телефон `+7`/`8` и 10 цифр нормализуется; нет однозначного телефона — выбор контакта в WhatsApp. Произвольные email/имена и несколько разных телефонов не превращаются в адресата.

В карточке напоминания помощника ссылка передаёт готовый текст и контакт точного клиента через существующий scoped lookup. В `/seller/debts` текст использует серверный `balance_minor` конкретной продажи, имя клиента и выбранной точки; отдельного AI-вызова нет. Открывается новая вкладка с `noopener noreferrer`, рядом пояснение о самостоятельной отправке. Иконка, текст, минимум 44 px, RU/KZ. В Demo показаны три явно учебных долга из общего `shared/demo/debts.ts`; другая demo-точка остаётся пустой. Gateway, Auth, API, финансовые записи и `features/seller/analytics` не менялись.

Проверки итогового кода из `apps/web`:

- `npm ci`; `npm run check:api`, `npm run typecheck`, `npm run lint`, `npm run build` — PASS.
- `npm test -- --maxWorkers=1 --no-file-parallelism` — **559/559**, 42 файла; включает 23 новых utility и 6 component cases.
- `npx playwright test -c e2e/whatsapp-reminder.playwright.config.ts --retries=0` — **8/8**: RU/KZ × 360/390/1440, две поверхности, href/остаток/контакт, размер, отсутствие скролла/ошибок и Demo без API.
- Отдельные конфиги `assistant` — **6/6**, `assistant-qa` — **13/13**, `ledger-reading` — **6/6**. Все browser Auth/API/assistant ответы синтетические; не живая приёмка WhatsApp, телефона или AI.
- [Два скриншота 390 RU](../screenshots/whatsapp-reminder/README.md) осмотрены. Автоматически обновлённые чужие screenshots аналитики не включены в PR.

На исходном main существовал lint blocker в `e2e/manual-entry-timing.acceptance.ts:336` (`no-control-regex`). Во время работы команда уже исправила его в **cd8c71b** вместе с вычиткой KZ. Свежий main принят обычным merge; сохранён именно вариант этого теста из main, собственная временная замена regex не входит в итоговый diff PR. Все новые казахские формулировки сохранены. Первые ошибки типов новых тестов и их неоднозначный селектор исправлены до итогового зелёного прогона. Build сохранил предупреждения об empty auth chunk и размере JS >500 kB; сборка успешна.

Публикация кода в GitHub не означает выпуск сайта: main/deploy-ветки, Pages, Render, Supabase и Environment в этой задаче не переключались. Никаких живых AI-вызовов, денежных записей или отправленных сообщений. Следующий шаг: review этого PR капитаном; включение в общую Pages-сборку после принятия. В 14:00 запланировано продолжение части B с повторной проверкой свежих refs; уже включённый PR #94 повторно не сливать.

### 2026-10-18 — интегратор: PR #97, #98, #99 в main, README

- В `main` по очереди влиты [PR #98](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/98) (fast-forward, `2e245d9`), [PR #97](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/97) (merge `dfcfd70`; конфликт в `e2e/manual-entry-timing.acceptance.ts` решён вариантом PR со `stripVTControlCharacters`) и [PR #99](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/99) (merge `9af29fa`).
- Проверено перед каждым push из `apps/web`: `check:api`, `typecheck`, `lint`, `vitest run`, `build`. После #99 — 44 файла, 610 тестов, всё зелёное.
- Валидатор #97 отклоняет весь снимок при расхождении сумм. Проверено, что на живых данных это не срабатывает: `paid_later` считается как остаток, `sale_id` обязателен с миграции 0002, а продажу с доплатами отменить нельзя (`DEPENDENT_PAYMENTS`). Поэтому суммы по продажам равны `cards.outstanding_minor`.
- KZ: «Demo · синтетикалық аналитика» → «Демо · үлгі деректермен аналитика». «AI» на «ЖИ» не меняли: в казахском интерфейсе «AI» используется в 7 строках, точечная замена дала бы разнобой.
- README RU/KZ: собираемость и возраст долгов в строке аналитики, новые строки «Напоминание в WhatsApp» и «Итог дня в WhatsApp», три новых скриншота в `docs/assets/readme`.
- Ограничения: WhatsApp-ссылки не проверены на физическом телефоне. Сайт обновится только после Direct Upload ZIP этой версии.

### 2026-10-18 — интегратор: выпуск сайта `7334485` на Cloudflare Pages

- ZIP собран из чистой копии `73344856590c38788a040916697ac619e421dd09`: `npm ci`, `npm run build:hosted` с публичными настройками (API Render, Supabase URL и publishable key, `VITE_CUSTOMER_IDS_ENABLED=true`, `VITE_ASSISTANT_ENABLED=true`). 23 файла, 1 491 389 байт, SHA-256 `1ca32cac6ef3ab05ca3c8492015b113312ebf98c3b423c14ca8291434bae2b02`. Нет `.map` и `.env`, проверено отсутствие известных секретов. В бандле найдены строки WhatsApp-напоминания, собираемости, возраста долгов, итога дня, APK 0.5.2 и новые KZ-тексты.
- Direct Upload капитаном: deployment `716abc61-20c9-4aa5-a5d4-364278170d2a`, 18.10 13:20 (UTC+5). На `716abc61.qadamx-taraz.pages.dev` и на `qadamx-taraz.pages.dev` все 22 обслуживаемых файла совпали с манифестом сборки побайтно. `/login`, `/seller/debts`, `/seller/analytics`, `/seller/summary` отдают `index.html`.
- Только чтение на живой учебной точке «Демо Кайкармет food»: у 4 долгов есть «Напомнить в WhatsApp» (`wa.me`, `noopener noreferrer`, текст с остатком и названием точки). Аналитика на API 0.7.2: «Собрано 64%», сумма по возрасту долгов 25 000 ₸ совпала с «Мне должны сейчас». Итог дня совпал с аналитикой за сегодня. Ничего не отправлялось и не записывалось.
- Ограничения: WhatsApp не открывался на физическом телефоне. На этой точке есть технический клиент «Учебный recovery PR41+42…», для показа лучше другая учебная точка.

### 2026-10-18 — интегратор: Vercel отключён, ветки почищены

- Vercel больше не используется: капитан убрал доступ GitHub-приложения Vercel к репозиторию. Последние коммиты получали от `vercel[bot]` статус `failure` («Deployment rate limited»); уже поставленные статусы GitHub удалить не даёт. Сайт размещён только на Cloudflare Pages, упоминание старого адреса убрано из README.
- Удалены 87 удалённых веток, которые полностью входят в `main`. Список «ветка → SHA» для восстановления лежит у интегратора локально. Оставлены `main`, `deploy/permanent-062`, `deploy-062` и 33 ветки с коммитами, которых нет в `main`.
- В `main` добавлены слайды защиты `docs/pitch/Qadam-Business-slides-KZ.pdf` и полные имена команды QadamX/QadamK в README и ТЗ.

### 2026-10-24 — Stage1 assistant fact bindings, local feature branch

`feature/stage1-factual-validation` от main `2518b2e80b8c8ef881063a968645382d61aeb37e`. Implementation `6ac5266abddffa7f1278d403ece55cc3eba457a1`;
freeze `3cb1ee19cc43a4b9fe5fcfd8436503cc864dbf8d`. Модель выбирает только scoped factIDs;сервер пишет
RU/KK имена,суммы,единицы и reminder. Свободная prose/numeric-membership validation
убрана из runtime;original сохранён только в tests/evaluation_baselines. Provider transport,
collector,fallback,лимиты иpublicDTO сохранены. Ledger/models/migrations не менялись.

Frozen42paired syntheticcases:18valid/24invalid;originalTP18/FP19/TN5/FN0,newTP18/FP0/TN24/FN0.
Это смена protocol representation,не доказательство реальной LLM accuracy. Final pytest
`-m "not postgres"`:318passed,32skipped,129deselected,1warning;Ruff check/format и
export_contracts --check passed. Web check:api/typecheck/lint passed;assistant/WhatsApp57tests
в3files passed. HTTP/providers stubbed. Initial103pass/1fail escape assertion log сохранён.

Docs: `docs/diploma/04_Implementation_Evidence/stage1_implementation_report.md`,
`03_Datasets_and_Experiments/stage1_experiment_results.md`,editable08diagram;raw/config/logs
вstage1/. Git LF/WindowsCRLF hashes portable,fixture/gold неизменны. Source/treehash guard827
прочих apps/packages файлов unchanged;publicOpenAPI/examples/generatedTS unchanged.

Нет Postgres daemon;realDB suite/Flutter/liveAI не запускались. No push/PR/merge/deploy,
sharedDB/serviceconfig не трогали. Latercandidate `b7c4750b158a6b1fc747e63a68ae7b2d078b5107` untouched. Следующий шаг:
captain review,isolatedDB acceptance ипоследующийStage2;не возвращать unsafelegacy parser.
CodexAI assistance раскрыта,студент/личный вклад не установлены;teamcode не присвоен студенту.

## 2026-10-25 — Stage 7: RU/KK extraction grounding (local feature branch)

Ветка `feature/multilingual-ai-extraction`, отдельный worktree от Stage 6
`eb954bf7c2c6b1d18bf360e436ccf12bdbde30dd`; application baseline
`ae43dc25543ab261511c8b5f5982c7dfe8112da8`. Чужие ветки и незавершённое
изменение Stage 6 demo-scenarios.md сохранены.

Изменены только production `app/services/ai.py` и новый
`app/services/extraction_grounding.py`: проверка duplicate JSON keys, ограниченная
нормализация RU/KK сумм по цитате, сохранение неизвестной оплаты, проверка названного
клиента, противоречий и границ чисел. AI сохраняет лишь Draft; подтверждение,
идемпотентность и ledger остаются существующими. API, миграции, Auth, Stage 1 и
Research не менялись.

100 синтетических примеров и provider doubles заморожены commit
`0313038e33b3f518b777682b7006c82f448ac483` до изменений. Offline full match:
71/100 → 99/100; 29 улучшений, один сохранённый регресс-уточнение S7-090.
Это проверка post-provider validation, не live LLM/ASR accuracy.
Stage 1 frozen corpus не менялся.

Проверено: полный pytest с отдельной PostgreSQL — 615 passed, без skips;
Ruff/format, export_contracts --check; web check:api/typecheck/lint/format/build;
82 frontend-теста в шести связанных файлах; 3 Chrome→API→SQL сценария.
Синтетическая продажа 3000/1000 даёт долг 2000, до подтверждения ledger неизменен,
двойной клик создаёт одну операцию. Неизвестная оплата остаётся null; ошибка JSON
оставляет ввод и ручное продолжение. Скриншоты содержат только тестовые данные.

Команды, полные результаты, файлы и source SHA:
`docs/diploma-evidence/ai-extraction/`, особенно `reproduction.md`,
`test-report.md`, `comparison/summary.json`, `implementation-report.md`.
Из apps/api: `python tools/extraction_eval/evaluate.py --output ../../tmp/stage7-replay`.
Browser: из apps/web `npx playwright test -c e2e/extraction.playwright.config.ts`;
требуется новый пустой loopback RESEARCH_TEST_DATABASE_URL, см. reproduction.

Ограничения: ноль платных/live provider запросов; нет проверки ASR, физических
устройств, production Supabase и независимого holdout. Парсер намеренно ограничен,
может запросить лишнее уточнение; выбор семантической роли цитаты остаётся
провайдеру и человеку. Следующий Stage 8: независимая разметка/holdout и отдельно
согласованный live-provider/ASR бюджет. Shared DB, merge и deploy не выполнялись.

## 2026-10-25 — Stage 8: интеграция и constructed held-out evaluation

Локальная ветка `feature/diploma-stage8-ai-evaluation`, отдельный worktree.
Stage 6 eb954bf7 → fast-forward Stage 7 11ee40a; исходные коммиты сохранены,
production-код Stage 7 не менялся. Новое: frozen 120-case corpus, paired evaluator,
SQL parity, combined Chrome/API/PostgreSQL acceptance и отключённый по умолчанию
live evaluation runner. Freeze: 071ae3ef7b0a1db0091c31ff6b762d16226f91b8.
Tool/test commit: 92aba501844d777fd7a2175b8a7e72a82ffb09bf.

Полное совпадение 75/120 → 104/120; RU 35/40, KZ 34/40, mixed 35/40.
41 улучшение и 12 новых консервативных регрессий; все 16 оставшихся ошибок сохранены.
Это authored provider fixtures, не измерение live LLM/ASR. Набор новый, но тот же
Codex-автор знал Stage 7: независимой слепой разметки/реальных разговоров нет.
Gold и frozen Stage 1/7 не менялись.

Найдено ограничение: OpenAI adapter json.loads/json.dumps может удалить duplicate
keys до общего validator. Characterization test воспроизводит это; 12/12 offline
rejection нельзя выдавать за проверку всей OpenAI-цепочки. Исправление и новый
набор для разработки — отдельный Stage 9, без подгонки текущего holdout.

Проверки: полный pytest 647 passed (отдельная PostgreSQL), Vitest 639/47 files,
combined Chrome E2E 6 passed, retries 0; Ruff, export_contracts, check:api,
typecheck, lint, format, build passed. Stage 1: TP18/TN24/FP0/FN0; Stage 7: 71→99.
Начальные ошибки TEMP и неверного Stage 1 флага сохранены в evidence/logs.
Paid requests 0; live ASR/WER, physical devices и Supabase acceptance не выполнены.

Команды: apps/api — python -m tools.stage8_eval.evaluate --output ../../tmp/stage8-repro;
apps/web — npx playwright test -c e2e/stage8.playwright.config.ts с новой пустой
loopback RESEARCH_TEST_DATABASE_URL. Подробные безопасные команды, файлы,
скриншоты, raw results и методика: docs/diploma-evidence/ai-evaluation-stage8/README.md.
Доказательства зафиксированы отдельным docs-коммитом; точный SHA:
git log -1 --format=%H -- docs/diploma-evidence/ai-evaluation-stage8/README.md.
Push, изменение PR #100, main merge, deploy и shared DB не выполнялись.

## 2026-10-25 — Stage 9: strict JSON и исправление регрессий извлечения

Отдельная локальная ветка `feature/diploma-stage9-extraction-hardening` от
`08fd3eef541c6ab47f1d44e79d38778eefd2c784`.
Baseline/protocol до правок: `fe4e73f5723c46d6b308c6b1115327d881611db9`.
Код и тесты: `fa73fe4999c0201626643be7eaf9d2667dc328ef`.
Evidence-коммит: `git log -1 --format=%H -- docs/diploma-evidence/ai-evaluation-stage9/README.md`.

Runtime: только `app/services/{strict_json.py,openai_provider.py,ai.py,extraction_grounding.py}`.
Дубликаты ключей проверяются по HTTP bytes и inner JSON до OpenAI
json.loads/json.dumps-нормализации; parsed dict не выдаётся за исходный JSON.
Неожиданные extraction-поля по-прежнему запрещены схемой. Исправлены bounded
падежные формы имён, явное получение оплаты, полная и нулевая оплата с защитой
от отрицаний/вопросов/неопределённости. Ledger, Auth, API и frontend не изменены.

На известном frozen Stage 8 наборе 104/120 → 118/120: исправлены все 12 регрессий
и ещё 2 случая, новых регрессий нет. S8-080/084 остаются wrong against gold:
повторяющееся «мың» не разрешено выбором произвольного вхождения. Stage 7 — 99/100,
Stage 1 — TP18/TN24/FP0/FN0. Это offline engineering evidence, не live AI accuracy.

Финальные проверки: pytest 723 passed с отдельной PostgreSQL; Vitest 639 passed;
Chrome/API/SQL 8 passed, retries 0; Ruff/format/export_contracts/check:api/
typecheck/lint/build прошли. Сохранены первоначальные 21 supplementary failure,
ошибка настройки browser fixture и timeouts при одновременных тяжёлых прогонах.
Последовательный повтор прошёл без увеличения timeout и без исключения тестов.

Команды: apps/api — `python -m tools.stage9_eval.evaluate --output ../../tmp/stage9-repro`;
apps/web — `npx playwright test -c e2e/stage9.playwright.config.ts` с НОВОЙ ПУСТОЙ
loopback `qadam_research_browser_*_test` базой. API 8321 / Vite 4302.
Подробные команды, actual logs, raw cases, source hashes, диаграммы и screenshots:
`docs/diploma-evidence/ai-evaluation-stage9/README.md`.

Независимая разметка, adjudication и consent — только подготовленный протокол,
участников и реальных записей нет. Live runner по умолчанию dry, budget 0,
вызовов 0; старые презентационные бюджеты не дают разрешения на новый эксперимент.
Следующий этап: независимый blind corpus, отдельное согласование live AI/ASR
и анализ repeated-number spans. Push, PR #100, main, shared DB и deploy не менялись.

## 2026-10-25 — Stage 10: локальный интеграционный кандидат

Ветка `integration/diploma-final-candidate`, база Stage 9
`a921b3f4d6d45a44d4529fb3045888f850cf9018`. Проверено происхождение main и Stage
6/7/8/9: все уже входят в историю, повторных merge/cherry-pick нет. Исходные
worktree и чужие незакоммиченные файлы сохранены. Production app, ledger, Auth,
frontend src, contracts и миграции не изменены.

Freeze нового challenge: `9946ce34c996d1dd7027ec19e1fef2a85a6a01eb`.
Код acceptance/demo: `49832f828c890fb5346eaa0de06baf849bc3f4b0`.
Добавлены `apps/api/tools/stage10_eval`, final browser fixture и тесты,
`apps/web/e2e/final.*`; Stage 9 browser test принимает локальный API origin.
Доказательства: `docs/diploma-evidence/final-integration/README.md`.

Фактически: backend 764 passed (включая 211 postgres-marked), frontend 639 passed,
Chrome/API/SQL 19 passed без retries; Ruff, полный Python format, API export,
check:api, typecheck, lint, Prettier и build прошли. Первые 2 browser-падения
оказались ошибками новых тестов (ранняя проверка pending и неверный HTTP 200
вместо 201/lookup path); логи сохранены, полный повтор — на новой БД.

Новый frozen challenge: 42/42 до и после, точный повтор после commit. Это 11
семантических семей × 3 языка и 9 invalid replies, автор прежний, независимого
human review/live AI нет. Stage 7 остаётся 99/100; Stage 8/9 — 118/120 с S8-080/084;
Stage 1 — TP18/TN24/FP0/FN0. Gold и старые evidence не менялись.

Демо: `python apps/api/tools/stage10_eval/demo.py --database-url <NEW EMPTY
loopback qadam_research_browser_*_test URL> --output tmp/<new-output>`.
Точные PowerShell-команды и локальный synthetic login — в demo-guide.md.
API 8322 / React 4303, реальные routes/SQL, offline provider/local JWT issuer.
Launcher отказывается использовать непустую/неподходящую БД и занятые порты.
58 настоящих browser screenshots; initial/final SQL, consent/reload, потеря
ответа и идемпотентное восстановление проверены. No physical-device claim.

Staging NO-GO до согласованного rollout, backup/restore/0009 rehearsal,
live Supabase/AI и physical acceptance. Paid calls 0. Публикация запрещена ТЗ:
push, PR #100, main, deploy и общая БД не менялись. Следующий этап — независимая
разметка и разрешённая staging-приёмка, не очередной merge того же кода.

## 2026-10-26 — Stage11 release-readiness review (local only)

Ветка `review/diploma-stage11-readiness`, база Stage10
`e825dd9a9568dda33a9226e1941e789fd21d2175`. Tooling commit:
`2073960792067f392e7938f733a75ae652116c9f`.
Поправка переносимости ZIP: `31cba2d5e0c0e3b0d9ce4d2159a2357005d954c3`;
регрессия воспроизведена (1fail/5pass), после фикса LF/ZIP metadata6pass.
Production, миграции, OpenAPI/generated.ts и frozen datasets не менялись.
Повторяемые утилиты: `apps/api/tools/stage11_release/`; тесты:
`apps/api/tests/test_stage11_release.py`. Полная передача:
`docs/diploma-evidence/stage11-release-readiness/README.md`.

Проверки:210selected tests и отдельно25tool/live-guard tests (6повторяются),
9config probes,21migration/backup/restore checks на НОВОМ локальном PG17.11:55441.
0009 сохраняет прежние строки; восстановление всех таблиц и остатка1500 ₸ прошло;
downgrade только восстановленной копии подтвердил потерю feedback. Старые БД не
удалялись. Initial failures сохранены. Ruff/format/API check прошли.
Stage10полные764/639/19 являются inherited evidence, не повторным Stage11результатом.

Рабочее локальное демо:4303/login, API8322, новая
`qadam_research_browser_stage11_ready_test`, исходник e825dd9a, syntheticJWT/offlineAI.
Read-only Chrome smoke прошёл:7/30,риск,empty,390px,logout;2скриншота;денежных writes0.
Точные команды в test-execution.md;5/3минутные сценарии — план показа, не замер.

Прежние31worktree сохранили HEAD/status. origin/main2518b2e неизменён;
Stage10ahead30,behind0,19commits local-only относительно всехoriginrefs.
PR100openDraft не менялся. Публикация отдельного Draft технически возможна, но
запрещена текущим ТЗ до отдельного разрешения и решения о пересечении сPR100.

Staging NO-GO: нет согласованной среды/realAuth; callback production жёстко Pages;
нет liveAI бюджета/моделей и подтверждённого retention/withdrawal процесса.
Blind60packet готов, humanreviewers0. Code review выполнен AI, не независимым
человеком. Следующий шаг капитана:назначить reviewers,точную staging/Auth конфигурацию
и отдельно разрешить публикацию/live acceptance. Push/PR/merge/deploy/paid/sharedDB0.

## 2026-10-26 — Stage 12: публикация в существующий репозиторий

Новая база: `integration/qadam-diploma-v1`, [Draft PR #101](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/101)
в `feature/ml-sales-debt-research`. PR #100 не изменён. Первый опубликованный
source: `e94d9a71ded625881e94f8747430348a81e13e5f`, включая Stage10
`e825dd9a9568dda33a9226e1941e789fd21d2175` и всю историю Stage1–11.
Main: `2518b2e80b8c8ef881063a968645382d61aeb37e`, без изменения.
32 прежних worktree сохранили HEAD/status; полный локальный Git backup проверен.
Перенос в личный репозиторий отменён. История и авторство команды сохранены.

Stage12 добавляет два publication Playwright config в apps/web/e2e, новые отчёты,
SQL/metrics/screenshots в `docs/diploma-evidence/stage12-publication/`, ссылки в
README/DECISIONS и эту передачу. Production/backend, ledger, Auth, контракты,
миграции и frozen datasets не изменены. Последний SHA документации — в PR #101.

Свежие проверки: 770 backend (в том числе 211 PostgreSQL), 639 frontend,
19 Chrome/API/SQL E2E и 8 Chrome Seller/Demo E2E — прошли, без failures/skips/retries.
Ruff, Python format, API check, TypeScript, ESLint, Prettier и build прошли.
SQL подтвердил 0009/consent; итог отдельных сценариев: 10600/6600/4000 ₸,
6 операций, 7 клиентов и 1 feedback. Потеря ответа не создаёт дублей.
Stage1: TP18/TN24/FP0/FN0; Stage7: 99/100; исходный Stage8: 104/120;
Stage9: 118/120; Stage10 challenge: 42/42. S7-090 и S8-080/084 сохранены.
Это synthetic regression evidence, не точность live AI.

Демо: http://127.0.0.1:4303/login, API8322, новая локальная
`qadam_research_browser_stage12_ready_test`, offline AI/synthetic JWTs.
Начальная чистая точка: 0 операций/сумм/feedback, 5 учебных клиентов.
Отдельный read-only Chrome smoke прошёл; начальная ошибка UTF-8 локальной копии
скрипта, uv setup и пути JUnit сохранены в отчёте, исходные логи не удалены.

Локальное академическое демо GO; staging/production NO-GO. npm audit: Vitest/
tinypool critical, @vitest/mocker moderate (dev dependencies), без force-upgrade.
Общие 0009/roles, real Auth/callback, privacy owners и независимая live AI/ASR/
device acceptance остаются отдельными этапами. После push Vercel автоматически
сообщил success; live acceptance этим не подтверждается. Merge, намеренного deploy,
платных AI-запросов и изменений общей БД не было.

Продолжение — отдельная ветка от origin/integration/qadam-diploma-v1; сначала
review #100/#101, затем dependency findings и согласованные staging gates.
Команды: `docs/diploma-evidence/stage12-publication/development-workflow.md`.

## Stage13 — dependency security and isolated staging (2026-10-26)

Branch feature/diploma-stage13-security-staging, base Stage12
55b39549bc52e767616763e0e1b5e8ab102c78e8. Verified implementation commit:
9afb7ed65c4dae7dd2c2702029983932b3041466. Final documentation SHA is the branch HEAD.
Incremental review depends on Draft PR101 and PR100; neither was modified/merged.

Changes: apps/web/package.json + lock (Vitest4.1.12); e2e/staging*.config.ts;
apps/api/tools/stage13_staging; tests/stage13_browser_server.py and
 test_stage13_staging.py. Production API/ledger/Auth, migrations, OpenAPI/generated
and all frozen datasets are unchanged. New dependency audit0, production audit0.
Fresh backend782/782 including211 PostgreSQL and12 new isolation checks; frontend
final serial639/639; Chrome/API/SQL19/19; Seller/Demo8/8; TS/lint/format/build/API
checks pass. Initial full unit638/639 timeout is retained, targeted6/6 and full
serial rerun pass with no code/timeout change. It is not hidden as a clean first run.

0009 from0008 and backup/restore rehearsed twice in6 NEW disposable local databases:
21 checks each, restored hashes/rows/feedback/balances match. Downgrade deletes
feedback, demonstrated only on a new restore copy; no in-place rollback recommended.
Local role is elevated; cloud roles and real Auth are not certified.

Start new demo from apps/api:
`.\.venv\Scripts\python.exe -m tools.stage13_staging.demo --database-url <NEW_LOOPBACK_TEST_DB_URL> --output ../../tmp/stage13-new-demo`
New defaults http://127.0.0.1:4313/login / API8333; original Stage12 remains4303/8322.
Create an empty qadam_research_browser_*_test DB first; no .env files in fixture
checkout. Synthetic login a@research.example.test / synthetic-local-only.
Detailed commands, fresh results, SQL, safe env inventory, diagrams and blockers:
docs/diploma-evidence/stage13-security-staging/README.md.

Next: owner reviews PR100→101→Stage13 sequence, approves separate staging DB/roles
and exact Supabase origin/callback policy. Current arbitrary staging registration
is blocked by the existing Pages guard. No paid AI/ASR, real accounts/customer data,
physical-device acceptance, shared DB migration or manual deployment was performed.
