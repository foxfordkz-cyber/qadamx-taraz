# Общая проверочная сборка API0.6.2 + web

16 октября 2026. Отдельная ветка `integration/unified-web-062`, основана на фактически запущенном backend **4e983b42a2a0466d2fc07e4de09becf87a8ef7d5** и документации rollout1ba7d40. **Общий сервер, HTTPS preview, оба туннеля, main и ветки участников не переключались.** Общая БД0006 не мигрировалась, seed/очистка там не запускались.

## Состав и ancestry

| Источник | Проверенный head | Решение |
|---|---|---|
| PR24 | e5ef1de390309630654698f4c2d3981bebdffd35 | Предок26 |
| PR26 | d91e3a5e1250bc23fc5de9408483352a622e6d3f | Предок27 |
| PR27 | 1c8756dd2e0ea4e1e6f8206b3ffe8bc72be5635c | Предок29 |
| PR29 | 3765ddbef123bc5c52bee243e403d15c527b7f26 | Один merge всей цепочки, без повторного переноса |
| PR31 | c2a94026cd121e9dc89c2b347029b56adc4c957f | Login lock, no-membership UX и тесты; наследует текущую voice-интеграцию |
| PR32 | 713f00f0450ddc1f0e6d10727270ef8e9f3602bb | Уточнения/устаревшие суммы и backend prompt/quota; наследуетPR23, повторного cherry-pick voice нет |
| Seller recovery | fd21874 | Проверен и **исключён** после блокирующего воспроизведения; merge отменён отдельным revert6072cc6, история сохранена |

Remote main1324885, PR22acce3fd, PR30 33cb37a и PR33cba6b32 сохранены через исходную backend-сборку. Merge-конфликты были только в исторической документации: обе передачи сохранены, актуальный rollout не заменён старым0.6.1. `apps/api` остаётся единственным backend. Новые GLB Абзала не требуются: используем существующий manifest и модели.

## Backend PR32 и AI

Изменения runtime относительно4e983b4 ограничены `services/ai.py`: явное уточнение обновляет одну операцию; provider429 возвращает существующийHTTP503 с кодом `AI_QUOTA_EXCEEDED`. Общий SYSTEM_PROMPT используется Gemini и OpenAI, поэтому правило уточнения относится к обоим. Соответствующий OpenAI429-тест обновлён с прежнего generic unavailable на quota. Диагностика сохраняет request_id/stage/provider_status/type/duration, payload не логируется. Fallback не запускается на429; deadline/cancellation/TTL/авторство и атомарное подтверждение сохранены.

OpenAPI **0.6.2**, generated.ts, JSON-примеры, миграции, customer recovery, журнал, аналитика и livestock-схемы сохранены. Новая миграция не нужна. Изменение error.code документировано; формат ErrorResponse прежний.

**Фактически активный общий процесс:** `AI_PROVIDER=gemini`, **`AI_MODEL=gemini-3.6-flash`**, `AI_FALLBACK_OPENAI=false`. Проверено чтением окружения listener28464 без вывода ключей. Наличие OpenAI-кода не означает его включение. OpenAI в этом этапе не вызывался, ранее согласованный резерв$1.40/$2 не увеличен.

**Новый живой Gemini:** одна попытка через новый локальный FastAPI/настоящий UI, тот же provider/model: HTTP503 за2719мс, request_id `b4a9360d-f98d-47ed-95b5-1542d8e130fd`, этапprovider_http/HTTPStatusError. Не429, не ошибка конфигурации и не результат mocks. UI сохранил текст, ручная запись прошла. Циклических повторов нет; полный живой AI-цикл **не завершён**. Старый incident6baafba2 отдельно остаётся открытым.

## Recovery fd21874: блокер и передача автору

Ветка проверена по контракту0.6.2. Дополнительный целевой regression показал нарушение: страница Customers и её CustomerPicker держат разные экземпляры `useCustomerCreationRecovery`. После POST из picker и потери ответа picker сохраняет intent; уже смонтированный page-hook продолжает держать record=null. Закрыть picker → открыть обычную форму с теми же полями → POST получает **другой ключ**. Поздно завершившийся первый POST и второй POST могут создать два клиента. Backend корректно считает разные ключи разными намерениями и не может исправить это угадыванием по имени.

Воспроизведение выполнено на production UI/hooks с синтетическим HTTP; два разных UUID зафиксированы, equality assertion упал. [Минимальный воспроизводящий patch](qa/customer-recovery-picker-regression.patch) применять **к fd21874**, затем из apps/web: `npx vitest run src/test/qa-customers-regression.test.tsx -t "keeps the picker unknown"`. Это ожидаемо падающий тест исходной ветки, не скрытый/skip-тест итогового набора. Основной270-тестовый набор с этой веткой проходил, но не покрывал переход между двумя формами.

По прямому условию капитана ветка целиком исключена из итогового runtime: нет частичного переноса её Auth fences или coordinator. Бекзату требуется единый coordinator текущего project/user/business для страницы и picker, повторное чтение/синхронизация durable intent перед отправкой и запрет нового key при unknown. Дополнительно текущий storage key содержит только user/business: перед включением подтвердить привязку к API project и безопасную смену URL, не создавать новый intent в другой среде. Не хранить клиентские PII ради recovery. После исправления повторить обе формы, потерю ответа/reload/смену точки/A-B-A и одинаковые key/body. Второй исполнитель/параллельная реализация не назначается.

Backend recovery сохранён и прошёл полный PostgreSQL-набор: атомарность, replay/conflict, concurrency, real-loopback потеря HTTP-ответа, membership/retention и legacy POST. Новая живая frontend recovery приёмка **заблокирована** дефектом выше. До включения исправленного frontend старый POST без ключа совместим, но восстановление его потерянного результата не обещается.

## Проверки итогового кода

| Категория | Фактический результат |
|---|---|
| Backend | **309 passed** на отдельной localhost PostgreSQL *_test; Ruff check/format и `python -m app.export_contracts --check` PASS |
| Frontend | **265 unit/component**, check:api, typecheck, lint, build PASS |
| Microphone components | **35 passed**,27 пересекаются с обычным набором |
| Browser с synthetic Auth/API | Auth/no-membership7; microphone18; standard/Seller/Analytics/public24; QA21 (8 пересечений со standard); money-flow1 — PASS |
| Новый browser, настоящие Auth+HTTP+SQL, только AI stub | Клиент/reload → unknown payment → clarification → выбор клиента → confirmation → history → Analytics без reload → reload → повтор без дубля → смена точки → logout/B/foreign404 — PASS |
| Public browser | MART/Кайкармет/Ауыл Береке на360/390/1440;9hotspots ведут в те же магазины, что карточки; no-WebGL/GLB-failure сохраняют список3магазинов — PASS |

Изолированный полный сценарий использовал обычный Supabase login A/B, новую локальную **qadam_unified_web_062_test**, web5206/API8033. Для deterministic AI-пути только drafts направлялись в отдельный8034 с явным SyntheticProvider; Auth, SQL, подтверждение и идемпотентность не подменялись. Первый draft300000/null → второй300000/100000; до confirmation деньги не изменялись, после confirmation продажи+300000, поступления+100000, долг+200000, чек+1. Повтор вернул тот же operationID. Это **не живой Gemini и не общий HTTPS**.

Успешный synthetic-AI UI run оставил только в локальной БД клиента4048842d-3bd0-44af-83a9-04eb969f1626, draft305adf54-2d0a-41ee-a51a-803cf777b32a и operation73afdf75-a0bd-4d8d-b4c2-64edcaf11b85. Общих Supabase financial/customer/draft writes —0. Первый live-Gemini/manual run также оставил только локальную учебную запись408cffae-c28c-4b6e-a529-c95ba672cfd2. Не выдавать эти IDs за общие данные команды.

В ходе подготовки corrected test harness: сначала не был задан отдельный runtime DATABASE_URL, затем поправлены путь export command и выбор фактической точки после reload. До новых действий история проверялась, неизвестные POST не повторялись новым ключом. Backend unit failure OpenAI429 обнаружил старое ожидание кода ошибки, исправлен тест по объединённому контракту. Итоговые числа выше относятся к завершившимся наборам, не складываются с предварительными прогонами.

Физический Android/iOS, микрофон телефона, email delivery/callback и Flutter SDK этим этапом не проверялись. Общий frontend после reload выбирает первую доступную точку, а не сохраняет предыдущий выбор; сценарий проверен с явной сверкой businessID. После последнего небольшого3D-исправления повторены typecheck/lint/build и публичный browser-набор. Большой3Dchunk остаётся предупреждением; public-env build нужен перед preview.

## Найденное и исправленное оформление

На первом demand-frame подписи обзорной сцены проектировались по устаревшей матрице камеры: Кайкармет оказался за левым краем, подписи не совпадали с силуэтами. `SceneAnchors.Projector` теперь обновляет camera matrix перед projection и invalidates при изменении размера. После исправления подписи совпали; скриншоты desktop/home и mobile/MART осмотрены. Ни модель, ни UUID/hotspot binding не менялись; карточки/fallback остаются рабочими. Изменение ограничено общей проекцией3D, новый визуальный каркас не добавлен.

## Auth callback: согласование, не готовая регистрация

[Предложение автору PR31 @bekzatwr](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/31#issuecomment-6219757089) отправлено, ответ участника пока ожидается. PR31 содержит **готовность login/no-memberships, а не signup/callback**. Создание точек, приглашения и автоматические memberships не реализуем. Пересечение с recovery рассмотрено: PR31 правит App/pages/переводы, fd21874 — auth.tsx fences; последний теперь исключён с блокером.

Предложенный маршрут `/auth/callback`, существующий AuthProvider/SDK, явный PKCE и однократный exchangeCodeForSession; session:null после signup означает ожидание email. Удалять code/error изURL, не логировать URL/токены, без внешних next redirects. При открытии письма в другом браузере verifier может отсутствовать: объяснить обычный login, не разрушая чужую активную сессию. Это следует из [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow); точная реализация и совместимость установленного SDK остаются за автором Auth.

После реализации согласовать точный Redirect URL `https://negotiations-exist-newman-ohio.trycloudflare.com/auth/callback`, SiteURL этого frontend origin; без wildcard для всех trycloudflare. Не добавлять callback в production заранее, старый preview ещё не реализует маршрут. Resend только явной кнопкой, cooldown и обработка provider quota; нейтральный duplicate-email UX. [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

Read-only public settings сейчас: signup enabled, email enabled, confirmation required. Redirect allowlist/SMTP/доставку/password policy этим endpoint проверить нельзя; настройки Supabase не менялись, новые пользователи/письма не создавались. No-membership UI/RU-KZ/refresh/logout проверен synthetic browser tests; настоящий новый email-account без точек не выдаётся за проверенный.

## Предложение обновления preview

Кандидат кода для обновления preview: **b899902**. После review пересобрать **apps/web** с публичными VITE_API_BASE_URL текущего HTTPSAPI, VITE_SUPABASE_URL/key. Не копировать серверный.env. Сохранить прежний frontend origin и оба tunnel процесса; новую dist подготовить отдельно. До согласованного переключения текущий preview остаётся7f511dd, backend4e983b4.

Frontend schema-совместим с текущим0.6.2; однако полный смысл уточнений/понятная quota изPR32 требуют также проверенный новый backend ai.py в отдельном согласованном окне. Это не разрешение переключить API сейчас. Frontend recovery не включать до исправленияfd21874. При неготовом Gemini использовать ручной ввод с явной проверкой; не объявлять проверенным AI весь путь с заглушкой. [Постоянный хостинг](PERMANENT_HOSTING_PLAN.md) готовится отдельно, без деплоя/тарифов.

## Финальная сверка remote: новое продолжение PR31

После основных проверок `fetch` обнаружил новый PR31 **10d9bba** (код регистрации **b156bc3**), потомок проверенного c2a9402. Diff прочитан: `/register`, существующий AuthProvider/signUp/resend, нейтральное ожидание email и тесты. Callback, redirect allowlist и настоящая email-приёмка **самим автором обозначены Blocked**; `detectSessionInUrl:false` сохранён. Регистрация пока отправляет SDK-запросы без согласованного redirect/flow. Это подготовленная часть, а не подтверждённый сквозной signup.

В эту проверочную сборку включён **c2a9402**, а не поздний 10d9bba: не подключаем незавершённый email flow к общему preview. Ранее отправленное предложение callback остаётся предложением, не разрешением менять Supabase и не подтверждением реализации. После ответа автора и согласования настроек потребуется отдельная интеграция b156bc3 и настоящая проверка письма. Чужая ветка не откатывалась и не изменялась. Числа тестов выше относятся именно к составу таблицы, не к новым 277/17 из отчёта автора PR31.

## Воспроизведение и адреса

Отдельная production-сборка **b89990254a6bdfe3c48274193f0cd494830c73b8** с текущим внешним HTTPS API и публичными Supabase настройками прошла. Проверено включение Auth chunk, отсутствие локального API8033 и значений серверных секретов в JS. Артефакт подготовлен отдельно от работающего dist; preview не переключался. Предупреждение о 3D chunk ~944 kB остаётся. Осмотренные публичные screenshots: [desktop](screenshots/unified-web-062/desktop-home.png), [360px MART](screenshots/unified-web-062/mobile-mart.png), только явно учебные точки, без Auth/клиентских данных.

Из `apps/web`: `npm ci`, `npm run check:api`, `npm run typecheck`, `npm run lint`, `npm test -- --no-file-parallelism`, `npm run build`. Microphone: `npx vitest run --config vitest.microphone.config.ts`. Browser: `npx playwright test --config e2e/auth-onboarding.playwright.config.ts --trace off`; аналогично configs microphone, analytics, qa, voice-integration. Для analytics задавать QADAM_SCREENSHOT_ROOT в игнорируемую папку, не переписывать PNG команды.

Backend: отдельная PostgreSQL с именем `*_test`, TEST_DATABASE_URL и отдельный runtime DATABASE_URL; из `apps/api`: `python -m pytest -q`, `python -m ruff check .`, `python -m ruff format --check .`, `python -m app.export_contracts --check`. Общую DATABASE_URL не передавать тестам. Для локального просмотра candidate использованы API8033 и web5206; эти адреса доступны только на ПК капитана, не с телефона коллеги.

Действующие общие адреса остаются:

- API_BASE_URL: `https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1`.
- Frontend: `https://negotiations-exist-newman-ohio.trycloudflare.com/login`.
- OpenAPI: `https://thorough-readings-riverside-suggesting.trycloudflare.com/openapi.json`.

Это прежние временные туннели, зависят от включённого ПК и процессов. Они пока **не показывают эту новую сборку**. Серверная ревизия 0006 сохранена; никаких новых миграций, очисток или перезапусков общей среды в этом этапе нет.
