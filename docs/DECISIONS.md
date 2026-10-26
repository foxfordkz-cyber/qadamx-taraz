# Общие решения команды

## 2026-10-17 — registration Pages routing and live acceptance

Use native Pages SPA fallback, not explicit rewrites to `/index.html`: those
rewrites returned 308 to `/` for the real callback. Check routes without following
redirects. Exact Pages callback added while retaining prior URLs; user-assisted
real email/new-session/reload and existing-account checks completed.
Published source818bb25; main672731a preserved in the integration branch, not
overwritten. [Evidence and rollback](REGISTRATION_PAGES_LIVE_20261017.md).

## 2026-10-17 — выпуск рынков завершён; финальное окно только web

Отчёт rollout80a3242 перенесён без замены новых handoff: API0.6.3/source8fa0029,
схема0008, проверенный backup/restore, пустой registry. Служебная смена health.stage
в main не требует deployment Render. Его Auto-Deploy выключен по подтверждению
капитана; Environment и БД в финальном web-окне не меняются.
После0008 обычный старый API игнорирует market_id: откат только forward fix либо
подготовленный guard7cb9040, без удаления схемы/данных. Pages откатывается отдельно.
[Доказательства и deployment ID](PUBLIC_DATA_MARKETS_PRODUCTION_20261017.md).

## 2026-10-17 — точечное получение клиентов для имён должников

Отдельный backend-кандидат добавляет repeated query `ids` (до100 исходных UUID)
к существующему GET customers. Полный Page, серверные балансы, порядок первого
вхождения, чужие/отсутствующие одинаково пропускаются; режим несовместим с явно
переданными q/cursor/limit. Без ids прежнее поведение сохраняется.
[Контракт зафиксирован до реализации](../packages/contracts/CUSTOMER_IDS_API.md).
Публикация PR61 не означает rollout Render; frontend включает режим после подтверждения
deployed SHA и query ids в OpenAPI. Миграций и новых приватных полей нет.

## 2026-10-17 — Мал базар: концепт-модель и страница без данных (роль №6)

- Ни один кандидат на «Мал базар Тараз» не подтверждён официальным адресом ([исследование](../assets/venues/research/mal-bazar-research.json)). Модель — концепция по типичным признакам скотных рынков у Тараза, без названия и вывески реального рынка; животные декоративные.
- Мал базар — отдельное направление, не площадка API: модель описана в `apps/web/public/mal-bazar-asset.json`, `venue-assets.json` с тремя площадками не меняется. Страница — `/venues/mal-bazar` внутри витрины.
- Лента, наличие и цены показываются только из API с каноническим ключом рынка. Сейчас `market` — свободный текст продавца, ключа нет, поэтому сайт данных не показывает и не подставляет статистику другого рынка; `null` минимума — «Нет данных».

## 2026-10-17 — обзор площадок на главной (роль №6)

- На главной — опубликованная GLB одной выбранной площадки, остальные площадки — вкладки с превью. Модель грузится только по выбору, по одной; на сенсорных экранах сначала превью и кнопка «Смотреть в 3D». Упрощённая сцена из коробок-силуэтов удалена: она не передавала облик площадок.
- Без WebGL и при сбое загрузки модели — превью и пояснение; выбор площадки и переход на неё работают.
- Карточка рядом со сценой показывает только данные API и manifest: название, учебная или живая площадка, категории, число точек на схеме. Это не карта: площадки показываются по одной, без взаимного расположения; пометка «Условная схема, не карта» сохраняется.

## 2026-10-17 — совместный recovery/polish и отдельная регистрация

PR42/2058b91 и PR41/7d84cb6 проверяются/выпускаются совместно, сохраняя API0.6.2 и текущую production базу. Безопасный customer coordinator и оформление объединены; поздние ответы не удаляют другой intent, отсутствие Web Locks не обходится небезопасным POST. [Фактическая приёмка](RECOVERY_POLISH_RELEASE.md).

PR43 не входит: [точный контракт регистрации](../packages/contracts/REGISTRATION_CALLBACK.md) задаёт один общий Supabase и будущий PKCE callback. Это спецификация для владельца frontend, не изменение текущего Auth/allowlist и не подтверждение доставки email. До полного живого email confirmation→session→`/me` регистрация не включается; demo-memberships автоматически не выдаются.

## 2026-10-17 — презентационная полировка кабинета и витрины (роль №6)

- Суммы в тенге форматируются с группировкой `ru-KZ` для RU и KZ: у `kk-KZ` то же «12 500,5», но в Chrome нет данных kk и он печатает «12,500». Даты в долгах и истории — числовые («16.10», «16.10.2026, 13:10») по той же причине.
- Общий долг на «Мне должны» берётся только с сервера: `outstanding_minor` из `/summary`, для фильтра по клиенту — `balance_minor` клиента. Загруженную страницу не суммируем.
- `request_id` в ошибках «Продажи» убран в «Технические подробности». Общий `ErrorMessage` (клиенты, каталог) не менялся: там код поддержки виден по решению seller-web и тестам.
- Витрина ведёт к опубликованному Android-выпуску `mobile-v0.2.1-shell.1` с пометкой «тестовая сборка»; фиктивной web-ленты Мал базара нет, пометка условной схемы сохранена. Ссылка — одна константа в `MalBazar.tsx`, менять вместе с выпусками mobile.
- Превью площадок только кадрируются `tools/assets/frame_posters.py` (пустое небо и тёмная полоса пола), пиксели не перекрашиваются; GLB не меняются. Перекраска фона дала артефакты на светлых крышах и отклонена; другой фон — только через рендер в Blender.

## 2026-10-17 — Registration review на deploy-062

По отдельному заданию капитана signup/resend PR31 `6f80867` переносится выборочно
в `integration/seller-registration-deploy-review` от deploy-062 `9845b91`.
Сохраняются единый AuthProvider, API 0.6.2 и действующие модули; Recovery PR42
не включается. Некорректный Supabase service URL отклоняется без исправления
адреса и раскрытия конфигурации. Ошибка `/me` не означает пустые memberships.
Callback URL/allowlist/механизм и live email не считаются согласованными по одному
production origin. Draft не разрешает merge/deployment или изменение Supabase.
[Диагностика и приёмка](SELLER_REGISTRATION_DEPLOY_REVIEW.md).

## 2026-10-17 — единая база main и deploy по поручению капитана

Принятая web/API production-версия объединяется с исходниками Flutter PR25. После проверок main и обе deploy-ветки продвигаются обычным fast-forward; ветки участников сохраняются. Это не массовое слияние всех PR: дефектный recovery UI и незавершённый signup остаются отдельно. Render не перезапускается при идентичном apps/api; Vercel сборка подтверждается отдельно. Flutter SDK/Android-приёмка и новый APK остаются ответственностью mobile. [Состав и проверки](MAIN_RELEASE_20261017.md).

**Перенос после приёмки:** `deploy-062` запускает production Vercel. Изменения сначала проверяются в отдельной общей ветке с сохранением всего актуального deploy-кода, включая вручную работающий Render e699158. Push/PR не означает deployment; в отчётах отдельно указываются GitHub, Vercel, Render и конкретный APK. Проверочная интеграция новых GLB описана в [MODELS_DEPLOY_REVIEW](MODELS_DEPLOY_REVIEW.md); production refs пока не меняются.

## 2026-10-17 — страница площадки и общие тексты (роль №6)

- Маркер площадки — кнопка 44 × 44 с видимым кружком 34 px (28 px на телефоне); наведение и фокус связывают маркер и карточку точки в обе стороны.
- Страница магазина показывает только данные публичного API: название, категорию, `is_demo`, описание, площадку и номер точки из manifest, каталог с наличием. Адрес, часы, фото и контакты не выдумываются; учебные бейджи — только по `is_demo`. Форма заявки — отдельный компонент своего автора; страница подключает её `import InquiryForm from "../inquiry/InquiryForm"` с `businessId` и `businessName` текущего магазина и не меняет её поведение.
- В пользовательских текстах нет «API», «интеграции», «WebGL» и «капитана»: вместо «капитана» — «администратор Qadam».

## 2026-10-16 — разрешённый OpenAI-адаптер, отдельно от rollout

Капитан разрешил OpenAI для AI-черновиков и небольшие платные проверки до $2. Серверный явный `AI_PROVIDER` сохраняет единый draft/clarification/confirmation контракт; default Gemini, автоматический fallback выключен. Ключ `OPENAI_API_KEY` только в игнорируемом серверном env. После проверки документации, проектного списка моделей и живых запросов кандидат: `gpt-6-luna` + транскрипция `gpt-transcribe`. Mini STT не подходит наблюдавшимся KZ/mixed; новая комбинация ещё не прошла RU из-за двух extraction timeout. [Результаты и расходы](OPENAI_DRAFT_EVALUATION.md).

Никаких автоматических денежных действий/клиентов, новой схемы или frontend-каркаса. Общий сервер не переключать до отдельного согласованного окна; дальнейшие общесерверные расходы согласовать. Fallback разрешён кодом только после Gemini503/timeout, один OpenAI pipeline под прежним общим deadline; ошибки доступа/валидации/авторизации и отмена его не запускают. Не объявлять старый Gemini incident исправленным. Customer recovery PR #22/0006/0.6.2 — отдельный rollout после сообщения «окно открыто» и свежего backup/restore.

## 2026-10-16: единое оформление и продолжение функциональных веток

По новому поручению капитана шестой участник отвечает за общие стили и 3D. Айдана и seller-фронтендер продолжают функциональность; изменения общих компонентов и оформления согласуют через владельца единого визуального слоя, чтобы не создавать разные оформления. Текущая серия визуальных изменений — PR #24–#27, автор `ab0ka`. Это уточняет распределение визуальной работы относительно прежних записей ниже; нового переноса Flutter или изменения API оно не задаёт.

Общая база — `main` **13248851fd2b2a502aff211a506f71e85c2b0ab1**, API **0.6.1**. Текущую работу сохраняем в собственных ветках и получаем main обычным merge, без reset --hard и force push. Новые задачи начинаем от актуального main. Flutter, новая voice-адаптация и customer recovery остаются отдельными этапами; это поручение не означает их слияния в main.

Поручение передано [Айдане в PR #23](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/23#issuecomment-6217223383) и [seller-фронтендеру в PR #16](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/16#issuecomment-6217224239). Отправка уведомлений не означает подтверждения получения участниками.

## 2026-10-16: реализация «Мал базара»

Шестой участник ведёт `apps/mobile`, единственный backend — `apps/api`. Контракт: [LIVESTOCK_API](../packages/contracts/LIVESTOCK_API.md). В `backend/livestock` ключ идемпотентности UUID в области пользователя общий для livestock actions/upload. PostgreSQL advisory transaction lock по subject сериализует конкурентные записи; изменение и JSON-снимок ответа сохраняются атомарно. Коллизия хэша lock лишь сериализует двух пользователей, проверка владельца всегда сравнивает полный UUID. Membership/locks/формулы журнала не меняются.

Статистика — активные объявления за текущую дату Asia/Almaty, по виду/нормализованному месту, одно наблюдение на объявление, минимум пять. Для чётного количества медиана округляется вверх при половине тиына. `LIVESTOCK_DEMO_MODE=true` — default учебной среды; is_demo фиксируется при создании, не принимается от клиента и исключается из статистики. Это цены предложений, не оценка и не сделки.

Фото: private bucket, доступ клиента только через API, обработка Pillow без EXIF/metadata, максимум три owner-bound photo ID. Multipart ограничен 8 MiB + 64 KiB, исходный файл 8 MiB/20 MP, до 30 непривязанных фото на пользователя. Storage не участвует в DB-транзакции: возможные private orphan не публикуются; повтор пишет те же очищенные байты по детерминированному пути. Автоматическая уборка вне MVP. Общая Supabase не обновляется без отдельного разрешения.

## Решение капитана: единая интеграция после PR #7

Основной backend — только `apps/api` (FastAPI, PostgreSQL, Supabase Auth, Gemini). Корневой `backend/` из PR #7 с SQLite и собственной cookie-авторизацией не меняет архитектуру. В `integration/team-mvp` полезные сценарии PR #7 перенесены в `apps/web/src/features/{ledger,voice,summary}`, затем дублирующий root frontend/backend удалён с сохранением Git-истории. Основой web остаётся Seller Frontend #3: один router, AuthProvider, runtime, BusinessProvider, CustomerPicker и общий RU/KZ context.

Публичные исходники `a1ba5ae` импортированы без объединения несвязанных историй; каркас, node_modules и dist той ветки не перенесены. Ассеты `f53d469` подключаются через `venue-assets.json`, hotspot принимается только при совпадении business UUID и slug с API. Геометрия концептуальная.

Каталог и заявки используют таблицы существующих миграций до `0003_drafts`; новая миграция не требуется. Публичная квитанция содержит только id/created_at, приватный GET/PATCH заявок проверяет membership и точку. Повтор client_request_id с другим нормализованным телом — 409. Лимит — 20 новых заявок на точку за скользящую минуту, общий для процессов благодаря PostgreSQL-блокировке; повторы квитанции лимит не расходуют. Это минимальный лимит MVP, не полноценная защита от распределённого спама.

В этой интеграции не выполняются миграции общей Supabase, merge PR или деплой. Результаты проверок и ограничения — в последней записи backend handoff.

Решения на старт разработки 15 октября 2026 года. При изменении указывать причину и затронутые файлы; изменение API отражать и в его контракте. Не поддерживать две противоречащие версии одного решения.

| Решение | Почему | Что означает для реализации |
|---|---|---|
| Главный путь — голос → черновик → подтверждение → журнал | Практическая польза и проверяемая роль AI | AI не пишет деньги автоматически |
| Общий продукт для торговых точек трёх площадок | Повторяется процесс продажи и оплаты | Нет трёх отдельных приложений |
| Капитан делает весь backend | Распределение команды | Остальные согласуют API, не создают свои серверы |
| FastAPI, PostgreSQL, Supabase Auth | Схемы, транзакции и готовая авторизация | Один API и одна БД |
| Gemini через адаптер | Аудио и структурированный ответ | Конкретная модель определяется доступом и тестом |
| React/TypeScript/Vite, R3F | Единый web и интеграция GLB | Владелец кабинета создаёт общий каркас |
| Деньги целыми тиынами | Однозначные суммы | `_minor`, KZT, вычисления на backend |
| 3D в публичной витрине; простой кабинет | Наглядность и удобство ежедневных действий | Список карточек работает и без WebGL |
| Telegram и другие интеграции после основного пути | Два дня и один backend-разработчик | Не блокируют основной web-сценарий |
| Учебные точки и условная геометрия | Нет подтверждённого партнёрства и внутренних планов | Демо явно подписано |

Для технических деталей использовать [архитектуру и API](team5/02_ARCHITECTURE_API.md). Для приоритетов — [продуктовое ТЗ](team5/00_PRODUCT_TZ.md).

## Frontend — 2026-10-15, feature/seller-dashboard (до слияния)

- Единый web bootstrap в `apps/web`: React 19 / Vite / React Router / TanStack Query. Для сцены потребуется React Three Fiber 9; интеграция и зависимости ждут public-web.
- Locale кода `kk`, подпись переключателя KZ. Деньги форматируются из целых тиынов.
- По прямому согласию капитана/пользователя принят только backend 193f6e5. Live bindings /me и GET/POST customers используют generated schemas и runtime validation. Публичная Supabase-конфигурация задана локально; серверный env/PostgreSQL ещё ожидаются. Demo остаётся отдельным read-only режимом без автоматической подмены live-ошибок.
- BusinessMembership не содержит is_demo: frontend не выводит флаг из UUID/slug/name. balance_minor показывается из CustomerResponse без расчётов. Создание клиента разрешается отдельно от недоступного изменения заявки. Не подключать отсутствующие inquiries/catalog.
- Контекст продолжения и проверки хранятся в `SELLER_FRONTEND_HANDOFF.md`; интерфейсы для соседних модулей — `SELLER_FRONTEND_INTEGRATION.md`.
- Polaris применяется как UX-референс собственной React/CSS дизайн-системы; палитра Qadam и общие exports сохранены. Shopify API/Auth/App Bridge и новые Polaris зависимости не добавляются. Причины, адаптивность и screenshots — `SELLER_DESIGN_NOTES.md`.
- По новому разрешению капитана OpenAPI 0.3.0 взят отдельно из `2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c` и generated.ts обновлён воспроизводимо. Backend-код остаётся 193f6e5; вся AI-ветка, миграции, финансовая логика и AI UI не включаются. Не перезаписывать согласованный JSON экспортом старого локального Python. Остальные contract files не требуются: schemas прежние, `$ref` внутренние. Источник и ограничение multipart XOR генератора записаны в seller handoff.

## Уточнения первого локального этапа — 2026-10-15

## Seller design — 2026-10-16

По новому запросу кабинет использует актуальный визуальный стиль публичной витрины `feature/public-storefront` @8818e8b: Manrope, paper/green/lime и ступенчатый знак qadam. Общие semantic tokens вынесены в shared/tokens.css, aliases прежнего UI сохранены. Старое красное оформление этапа B заменено этим решением. Чужой CSS/модули не импортируются; код витрины не объединяется. Шрифты размещены локально с OFL, для Kazakh glyphs есть Noto fallback. Polaris остаётся UX-референсом собственных React-компонентов. См. SELLER_DESIGN_NOTES.md и handoff; API/Auth/финансовая логика не менялись.

## Ручной backend — 2026-10-15, `backend/ledger-auth`

- Лимит одной денежной суммы: 100 млн ₸ (`10_000_000_000` тиынов). Запросы используют JSON-целые, запрещены дополнительные поля баланса/времени. Схемы и примеры: `apps/api/app/schemas`, `packages/contracts`.
- JWT проверяется по HTTPS JWKS проекта библиотекой PyJWT: только ES256/RS256, обязательны подпись, issuer, audience, exp/iat, UUID subject и роль authenticated. Synthetic seed subjects и publishable key не заменяют реальных пользователей. Seed привязывает владельцев лишь после проверки их access token и совпадения subject; секреты остаются в `.env`.
- Для MVP денежные записи сериализуются по строке business; погашение/отмена дополнительно блокируют исходную продажу. Порядок: membership FOR SHARE → business FOR UPDATE → исходная sale FOR UPDATE → расчёты/INSERT. Это делает балансы клиента и идемпотентность согласованными при простом READ COMMITTED. Другие точки не блокируются этой строкой.
- Идемпотентность в пределах точки хранит хэш нормализованного действия/тела и исходный JSON-ответ в одной транзакции с операцией. Повтор возвращает тот же ответ, включая исторический снимок остатков; актуальные остатки читать отдельным GET.
- Журнал защищён от UPDATE/DELETE триггером; исправления доступны через идемпотентную отмену. Новые таблицы и составные tenant FK — миграция `0002_ledger`; бизнес-схема `qadam` закрыта для anon/authenticated.
- В этапе ledger-auth `draft_id != null` возвращал 422 `DRAFT_NOT_SUPPORTED`; поддержка добавлена отдельным следующим этапом ниже. Проверки конкуренции/отката выполняются в отдельной PostgreSQL `*_test`, не на Supabase demo; live smoke оставляет явно учебные операции в demo-журнале.

## AI-черновики — 2026-10-15, `backend/ai-drafts`

- Ручной этап опубликован в [PR #4](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/4), без merge. AI-ветка основана на его head `193f6e5`, поэтому зависит от PR журнала.
- Gemini вызывается серверным HTTP-адаптером `generateContent` с JSON Schema, без SDK/tool calls/доступа к БД. `AI_API_KEY` и точный `AI_MODEL` только в серверном окружении. Выбор модели проверяется живым запросом; недоступность означает 503/504 и ручной fallback. Живые результаты отделяются от детерминированных тестов с заглушкой.
- `0003_drafts` добавляет приватные черновики с автором, точкой, JSON ответа и TTL 30 минут. Внутреннее имя автора `created_by` согласовано с журналом. Подтверждение добавляет блокировку draft между business и sale; денежные формулы не изменены. Membership перепроверяется после AI-вызова; во время внешнего запроса DB lock/connection не удерживается.
- Повтор исходного idempotency key не блокируется истёкшим/потреблённым draft; автор/точка проверяются даже при повторе. Новый ключ для потреблённого draft — 409 `DRAFT_USED`, истёкший — 409 `DRAFT_EXPIRED`, чужой — 404. Конечные поля продавца валидируются существующим журналом; потребление и запись атомарны.
- Формат multipart сохранён; текст до 4000 символов, аудио до 8 MiB/30 секунд. PyAV проверяет/преобразует WAV, WebM, Ogg, MP3, M4A/MP4, FLAC в WAV в памяти; временный upload закрывается после запроса. Неподдерживаемое/повреждённое аудио не передаётся провайдеру.
- AI извлекает только имена/суммы, неизвестные значения остаются null с вопросами. Backend добавляет до 20 кандидатов текущей точки, не выполняет нечёткое объединение имён; выбор открытой продажи обязателен при любом погашении. Живое распознавание текста/речи не гарантирует правильность каждого будущего ввода, подтверждение продавца остаётся обязательным.

## 2026-10-16: sixth role, mobile livestock

apps/mobile belongs to the Flutter participant. Sole backend remains apps/api, web remains apps/web. Livestock owner is the verified Supabase JWT subject, independent of shop memberships; existing ledger authorization is unchanged. Livestock never creates ledger entries. Today uses Asia/Almaty server date; price statistics exclude demo data and use asking prices, not transactions or AI. Photo publication requires private Storage and server-side decoding/re-encoding without EXIF. Proposed contract: packages/contracts/LIVESTOCK_API.md. Shared Supabase must not be migrated in this task.

## Seller design integration — 2026-10-16

В отдельной feature/seller-design-integration от integration/team-mvp:3d009dc переносится только визуальный delta готового seller a77f1a02. Канонические backend/OpenAPI0.4/runtime/API/modules и feature-модули других участников сохраняются. Общая Qadam палитра/Manrope определяются в shared/tokens.css, совместимые semantic aliases обслуживают существующий UI; public .ex получает CSS token bridge без переписывания витрины. Финансовые значения не подставляются в Demo, чужая денежная логика не меняется. Review выполняется отдельным Draft PR в integration/team-mvp, без merge в этой задаче. Детали, собственные проверки и ограничения — SELLER_FRONTEND_HANDOFF.md и handoffs/seller-web.md.

## 2026-10-16: review общей версии и QA-контракт

В integration/local-combined-check включены существующие PR #11 (seller design integration) и #12 (seller regression), не создаётся параллельный редизайн. Единственный API остаётся apps/api версии 0.5.0; денежные правила не меняются. Поколение Auth защищает callbacks старой сессии A после A→B→A. Page.next_cursor закреплён как UUID/null, как request cursor; CustomerCreate и frontend считают Unicode code points. Схемы/примеры обновлены, generated.ts регенерирован без смены TypeScript string-представления UUID. Общая Supabase остаётся 0003; 0004/Storage требуют отдельного разрешения. [Приёмка и зависимости PR](COMBINED_ACCEPTANCE.md).


## 2026-10-16 — подключённая среда и аналитика точки

Капитан сообщил о завершённом отдельном setup: qadam-demo 0004_livestock и private Storage. Повторный setup/seed не нужен; readonly-проверка ревизии и настоящий HTTP подтвердили подключение. Server service key остаётся только в игнорируемом env. Для удалённого Flutter готовится временный HTTPS к одному FastAPI, без открытия PostgreSQL; запуск туннеля отдельным действием, не деплой.

Согласован MVP аналитики: 7/30 дней Asia/Almaty включая неполное сегодня, карточки и графики рассчитывает backend из журнала с membership. Продажи/количество/средний чек — один набор действующих продаж периода, отмена ретроспективно исключает исходную продажу; поступления — движения в даты регистрации, включая отрицательные отмены и погашения старых долгов. Текущий долг — все даты. HALF_UP до тиына, пустой средний null. Один snapshot для карточек/графиков. `/summary` не меняется; полное определение и примеры в ANALYTICS_API. Контракт опубликован первым (2089e44), затем реализация; UI остаётся frontend.

## 2026-10-16 — рынок и «Цена от» в Мал базаре

Для совместимости API 0.6.1 добавляет nullable market с нормализованным market_key; новый mobile UI требует конкретный рынок, legacy записи остаются непривязанными. Это самоописание продавца, не проверенный реестр площадок. Фильтрация рынка используется вместе с locality. Минимум сегодняшней цены предложения доступен при sample_count>=1, медиана при >=5; demo исключены из обоих. Нужна 0005_livestock_market до запуска новой версии; общая БД пока не мигрирована.


## 2026-10-16 — разрешённая 0005 и тестовый HTTPS

После первоначального решения оставить0004 капитан отдельно явно разрешил0005. Backup qadam восстановлен в отдельной локальной БД с совпадением всех таблиц; затем добавочная миграция применена на общей среде, данные/RLS сохранены, API переключён0.6.1. Временный Cloudflare-туннель направлен только на FastAPI8018, JWT/Storage неизменны. Существующий FlutterPR15 принимает новые optional response-поля; UI рынка и минимума делает mobile-участник. Положительный minimum проверен на test PostgreSQL, живые demo исключаются и дают null. Постоянный frontend предлагается на Vercel, backend отдельным Web Service:8MiB upload не проходит через Vercel Functions4.5MB. Постоянный деплой/тарифы не запускались.

## 2026-10-16: Seller Analytics frontend

Капитан подтвердил combined как единственную базу Analytics. Начальная2089e44 содержала только согласованный Markdown контракт; после публикации API0.6.0/cd655e9 неопубликованная frontend-ветка безопасно обновлена до58d4eb4 без merge PR14. В существующий SellerLayout добавлен /seller/analytics, без нового приложения/дизайн-системы. Live использует опубликованные OpenAPI/generated, общий Bearer-клиент и runtime validation; отдельный явный Demo — синтетический adapter без HTTP/записей/автоматического fallback. Query scope включает сессию, разрешённую точку и период; prefix совпадает с существующей инвалидацией денежных mutations. Backend и финансовые формулы frontend-задачей не изменяются. Детали/ограничения PR14 и собственные проверки — [Seller Analytics handoff](SELLER_ANALYTICS_HANDOFF.md).

## 2026-10-16 — Analytics интегрируется поверх PR17

По уточнению капитана общая база новой ветки — актуальный PR17ca51bbf/API0.6.1, затем обычный merge Seller Analytics PR16ce68f01. Не начинать заново от58d4eb4 и не откатывать market/minimum/контракты Flutter.0005 уже применена; повторного setup нет. Проверка frontend выполняется на отдельных портах, работающие8018/5188/cloudflared сохраняются. Новый Draft направляется в ветку PR17 с явной зависимостью отPR13; ветки друзей, main и базы существующих PR не меняются. [Результаты](ANALYTICS_061_INTEGRATION.md).

## 2026-10-16 — восстановленная среда остаётся на API0.6.1

После остановки процессов восстановлен подтверждённый FastAPI4f67e2c изca51bbf. Read-only ревизия0005 и отсутствие customer recovery таблицы запрещают считать0006 развёрнутой; PR22 остаётся отдельно. Для voice выбран точныйPR23/a1e5252 поверх актуальногоmain1324885, merge7f511dd в отдельнойпроверочнойветке. После последнихправок выполнены полныеfrontend и microphoneпроверки. НовыеHTTPSадреса иточныйCORS опубликованы вVOICE_HTTPS_RESTORED; микрофонпроверен толькоfakedevice, физическаяприёмка остаётсякоманде. Ни main, ни денежныеправила, ни общаясхемаБД не изменены.

## 2026-10-16 — customer POST recovery по решению PR19

Выбран backend-first вариант PR19/99ed2c0. Контракт и синтетические JSON опубликованы отдельно737a559 до реализации. API0.6.2 добавляет необязательный Idempotency-Key у customerPOST и GET customer-creation-result, scope action/business/verified subject/key. Ответ201 и legacy без ключа сохранены. Клиент и исходный response snapshot записываются одной транзакцией, same-key запросы сериализует PostgreSQL advisory lock; membership проверяется до replay/lookup и удерживается FOR SHARE. Другой body —409, отсутствующий видимый receipt —not_observed, что не доказывает отсутствие позднего worker. Нет TTL/переназначения ключей/автоматической очистки. [Точный контракт и ограничения frontend](../packages/contracts/CUSTOMER_RECOVERY_API.md).

Новая0006_customer_requests проверяется только на отдельной testPostgreSQL. Общая Supabase0005 и API0.6.1 остаются работать, новая версия не переключалась. Старый API совместим с добавочной таблицей; downgrade с удалением receipts не является безопасным откатом приложения. Денежные правила, Auth, Analytics и Мал базар не меняются. Seller-участник реализует coordinator/unknown UX после review контракта, включение требует отдельно согласованного rollout.

## 2026-10-16 — безопасный откат customer recovery

Review выявил границу совместимости: прежний API0.6.1 читает схему0006, но игнорирует Idempotency-Key customer POST. После включения recovery простой возврат к старому процессу допускает дубль при позднем повторе. Подготовлен отдельный rollback entrypoint legacy_customer_guard.py: сохранить0006/receipts, временно закрыть все customer POST и recovery lookup ответом503 CUSTOMER_RECOVERY_PAUSED; прочие маршруты передать прежнему API. Frontend сохраняет unknown и исходный ключ, не делает fallback на keyless POST. Обычный API0.6.2 сохраняет legacy POST без ключа. Ни downgrade, ни restore старого backup поверх новых записей не являются штатным откатом. [Проверенный план и ограничения backup](CUSTOMER_RECOVERY_ROLLOUT.md). Применение общей0006 и перезапуск ждут отдельного разрешения/окна; работающая voice-среда не меняется.


## 2026-10-16 — разрешённый rollout customer recovery выполнен

Капитан открыл окно. После нового backup/restore применена0006 и запущен ровно4e983b4/API0.6.2. Frontend и оба туннеля сохранены. Gemini остаётся текущим провайдером, fallback false; наличие OpenAI-кода не включает платные расходы. Внешняя HTTP/браузерная приёмка PASS; frontend recovery подключает Бекзат. [Отчёт](CUSTOMER_RECOVERY_LIVE_ACCEPTANCE.md). Откат только с сохранением0006/receipts и guard customer writes; raw0.6.1/downgrade/старый restore поверх новых записей запрещены. Main/ветки команды/постоянный deploy не менялись.

## 2026-10-16 — проверочная общая web-сборка, без переключения среды

Основа integration/unified-web-062 — работающий4e983b4, а не прежний main. Дизайн24→26→27→29 объединён по ancestry один раз, Auth c2a9402 и PR32 проверены вместе с recovery/диагностикой/OpenAI0.6.2. Новая схема не нужна. По условию капитана fd21874 исключён целиком после воспроизведения нового customer key между picker и страницей при unknown; coordinator исправляет существующий frontend-владелец. Поздний PR31 10d9bba с незавершённым callback/email также не подключён вслепую. [Review и точный состав](UNIFIED_WEB_062_REVIEW.md). Backend/preview/туннели сохранены; публикация Draft PR не является разрешением на merge или переключение. Приёмка с AI-заглушкой не заменяет живой Gemini, вернувший503.

## 2026-10-16 — OpenAI на Render, без новых денежных правил

Капитан разрешил OpenAI-primary и вручную применил Environment. План конфигурации из проверенного адаптера: openai / gpt-6-luna / gpt-transcribe, fallback false, одна попытка, общий25с. Лог STT200 подтверждает OpenAI, не полную приёмку голоса. Gemini request0d2772f8 получил429; OpenAI d53a7f33 остановился после успешногоSTT до наблюдаемого extraction-вызова. Не считать эти инциденты одной причиной. В отдельной ветке добавлена безопасная диагностика transcript validation; никакой попытки принимать пустой текст/придумывать оплату, никаких автоматических денег. Шесть новых hosted probes/черновиков,0денежныхPOST; резерв$1.80/$2, расходы безusage не обнулены. [Доказательства и ограничения](HOSTING_AI_ACCEPTANCE.md). Настройки Auth/Storage/БД не менялись, registration/recovery остаются у текущих владельцев; сообщения участникам только подготовлены капитану.
## 2026-10-16 — пересборка моделей площадок участником №6

По решению капитана три GLB пересобирает роль единого визуального стиля и 3D; автор моделей сохраняет свои исходники и на время пересборки не правит те же файлы, его ветка `assets/venue-models` не меняется. Исходная точка — последняя опубликованная версия `11c4e45`. Правки узнаваемости делаются только по уже задокументированным референсам; `geometry_status`, тексты `reconstruction`, hotspot (id, business_id, business_slug, position) и структура manifest сохраняются, обновляются только измеренные bounds и камера. Перекрывающиеся детали одного материала разносятся по глубине, чтобы не было совпадающих граней. [Отчёт](VISUAL_MODELS.md).

## 2026-10-17 — безопасный Seller Customer Recovery от main

Ветка `fix/seller-customer-recovery-safe` переносит только необходимый frontend recovery из 9a3c868 на main07197be/API0.6.2. Общий coordinator обслуживает CustomerPicker и Customers; каждая форма владеет своим lifecycle. Очистка durable intent выполняется под Web Lock только при совпадении key и body hash и актуальном session epoch/user/business/API scope. Старый K1 не удаляет K2. Между вкладками Web Locks сериализуют короткие операции с маркером; сеть не удерживает lock. При отсутствии Web Locks или недоступном storage создание блокируется, небезопасного fallback нет.

В storage только key/hash, без клиентских полей/JWT. Unknown/not_observed/503/409 сохраняют ключ; повтор POST только явный и с исходным телом/ключом, reload выполняет только GET. Отказ одного повторного POST не доказывает, что более ранняя попытка не сохранилась, поэтому 4xx не удаляет intent. Legacy-маркер без API origin не мигрируется и блокирует новые записи до отдельной сверки. Backend/контракт/финансовые правила не меняются; отдельный Draft PR не выполняет rollout. [Разбор дефекта, проверки и ограничения](SELLER_CUSTOMER_RECOVERY_SAFE.md).

## 2026-10-17 — регистрация #43 на Cloudflare Pages

По прямому поручению капитана основной web origin — `https://qadamx-taraz.pages.dev`.
Единственный callback signup/resend проверочной сборки —
`https://qadamx-taraz.pages.dev/auth/callback`; произвольные env/preview/query
redirects запрещены. Регистрация и переход по письму происходят в одном origin
и браузерном профиле. Существующий Supabase PKCE/AuthProvider и `/me` сохранены.
В Supabase нужно добавить точный URL, сохранив все прежние Vercel/mobile callbacks;
административное применение и настоящая email-приёмка ещё не подтверждены.
Flutter требует отдельного native callback и согласования с mobile-владельцем.
[Проверки, артефакт, границы готовности](REGISTRATION_CLOUDFLARE_HANDOFF.md).

## 2026-10-17 — подготовка RU/KK данных и канонических рынков

По задаче капитана подготовлены два отдельных PR без rollout общей БД/API.
Переводы явные, с fallback к исходной строке; пользовательские названия автоматически
не переводятся, UUID/slug сохраняются. Учебные предложения требуют языкового review
и отдельного обновления данных, а не повторного seed.

Мал базар использует существующие listings и формулы цен. Справочник рынков
изначально пуст; только проверенная запись допускает новую явную связь market_id.
Свободный market/market_key не становится такой связью автоматически. Концепт площадки
не является подтверждением реального места. При отсутствии подходящих данных цены
null, без подстановки соседних рынков.
[Контракт и откат](../packages/contracts/LIVESTOCK_MARKETS_API.md).

## 2026-10-17 — капитан увеличил защитный AI-бюджет до $20

Капитан разрешил увеличить общий защитный бюджет OpenAI текущего проекта Render
с $2 до **$20**; баланс/лимит проекта изменены капитаном вручную. Прежний резерв
**$1.80 сохраняется полностью**, включая неизвестные прошлые расходы. Доступно
до контрольной пробы $18.20. Резерв не равен подтверждённому списанию по billing.

Перед каждым hosted pipeline (аудио STT + extraction либо только текстовое extraction)
записывать **$0.05** в существующий локальный игнорируемый журнал. Прекратить новые
платные вызовы при остатке **$2**; не начинать вызов, если его резерв опустит остаток
ниже $2. Этот запас остаётся на живую защиту. Не освобождать неизвестные расходы.
Автоматические платные повторы/циклы запрещены; fallback не включать, модели,
timeout и Environment Render не менять.

Одна разрешённая текстовая hosted-проба: HTTP 200, 300000/100000 тиын, 4.719 с.
Перед вызовом зарезервировано $0.05: итоговый резерв $1.85, остаток $18.15.
Billing этого запроса неизвестен. Денежного подтверждения нет; история и карточки
аналитики до/после совпадают. [Подробности](handoffs/backend.md#2026-10-17--ai-бюджет-20-и-одна-hosted-текстовая-проба).

## 2026-10-18 — AI-помощник отвечает только по фактам сервера

«Спросите Qadam» делает AI центральной частью кабинета, не трогая денежные правила. Сервер считает все цифры из журнала, модель получает только эти факты и вопрос, ответ отклоняется, если в нём есть число или клиент вне фактов; тогда показывается серверный шаблон с `source=fallback`. Помощник ничего не записывает и не отправляет: напоминание — черновик для копирования. Включается флагом `ASSISTANT_ENABLED`, лимит 20 вопросов на пользователя в сутки. Контракт — `packages/contracts/ASSISTANT_API.md`.

## 2026-10-24 — Дипломное исследовательское расширение (отдельная ветка)

По прямому заданию пользователя добавлены API 0.8.0 и `/seller/research`: прогноз
по журналу, объяснимая оценка открытых долгов, анкета с согласием. Общие изменения
backend/контракта разрешены этим заданием; существующие финансовые команды, Auth,
Voice и приложение Flutter не переписываются. База main:2518b2e содержит историческую
integration/team-mvp:3d009dc; удалённую ветку не воссоздаём и чужие PR не объединяем.

Прогноз использует продажи, известные на закрытие местного дня, без будущих отмен
в признаках прошлого; поэтому история может отличаться от текущей restated-аналитики.
Baseline/alpha/рабочий метод выбираются по validation, итоговый MAE/RMSE — на отдельном
test. Статистические ошибки могут быть дробными в тиынах; денежные суммы остаются
целыми. Без 98/144 полных дней прогноз недоступен. Учебные данные явно обозначены.

Риск — rules-v1, не вероятность и не обученный классификатор: нет due dates/исходов.
Анкета хранится отдельно (0009), с owner+author scope и идемпотентностью по UUID;
она не меняет деньги. Shared migration, retention/withdrawal process, реальные
исследовательские данные и участники требуют отдельной подготовки капитаном.
Научное превосходство ML и завершённое исследование пользователей не заявляются.
Подробнее: docs/diploma-evidence, docs/ml-evaluation-plan.md, docs/user-research-plan.md.

## 2026-10-24 — Stage1 private ID-only assistant validation (local branch)

Implementation `6ac5266abddffa7f1278d403ece55cc3eba457a1` replaces numeric-membership/free-prose validation with scoped
fact identifiers and deterministic RU/KK server rendering. Every model-supplied name,
value,unit,prose field is forbidden;reminder recipient/balance comes from current request.
PublicRequest/Response/action/source enums andfinancial journal stay unchanged. Legacy
validator exists only in offline tests. Valid signed daily journal deltas are retained.
Frozen paired42case comparison passes finite FP0/FN0;not a live LLM accuracy claim.
Not merged/deployed;laterresearchcandidate untouched;realDB/liveAI acceptance pending.

## 2026-10-25 — Stage 7: source-grounded extraction, unchanged money boundary

The existing private sales/repayment extraction now grounds supported RU/KK/mixed
numeric evidence in integer tiyn and requires a spoken customer name form.
Provider paid/debt labels cannot silently replace an explicitly quoted partial receipt.
Unknown payment stays null; ambiguous source fragments request clarification.
Duplicate JSON keys are rejected. This is bounded deterministic validation after the
existing provider/schema checks, not a replacement LLM or learned classifier.

Public contracts, provider configuration/retries, Auth, tenant checks, operation
confirmation/idempotency, ledger, Research and Stage 1 factual assistant remain unchanged.
No AI output writes money automatically. Unsupported grammar is handled conservatively,
including one recorded over-clarification regression rather than a benchmark-specific fix.

Frozen synthetic 100-case comparison: 71→99 full matches, 29 improved and 1 regressed.
These injected-response results do not measure live LLM/ASR performance.
Dataset, raw results, PostgreSQL/browser checks and limitations:
`docs/diploma-evidence/ai-extraction/`. No deployment/shared DB modification.

## 2026-10-25 — Stage 8: freeze before evaluation; preserve negative evidence

Stage 7 is integrated unchanged onto the verified Stage 6 history in a separate
local branch. Stage 8 adds tooling/tests/evidence, not another production parser.
The 120-case constructed holdout and protocol were committed before comparison.
The same exposed Codex author generated it; no blind independence or live provider
accuracy is claimed. Same authored replies produce 75→104 exact matches, with
12 new conservative regressions preserved. Stage 1/7 frozen corpora are unchanged.

The common validator rejects duplicate JSON keys, but the existing OpenAI adapter
may canonicalize them first. A new characterization test records this gap.
Direct-fixture 12/12 rejection must not be promoted to complete adapter protection.
Any fix requires a separately reviewed change and fresh development/validation
evidence; do not relabel the holdout or weaken financial checks to raise its score.

The opt-in live tool defaults to zero-budget dry planning, sequential single attempts,
exact-plan owner approval, private local artifacts and no financial API. No live
request or ASR measurement occurred. Local SQL/Chrome integration is synthetic
acceptance, not production, Supabase or physical-device acceptance.
Evidence and reproducible commands: `docs/diploma-evidence/ai-evaluation-stage8/`.

## 2026-10-25 — Stage 9: inspect raw JSON before normalization

Strict duplicate detection now runs on HTTP bytes and inner extraction text before
OpenAI re-encoding; Gemini/common extraction share the same raw decoder.
Already-parsed objects cannot establish key uniqueness and are refused at this
boundary. Envelope metadata remains supported; extraction extra fields remain
forbidden. Public API and financial confirmation/idempotency rules are unchanged.

Source-supported RU/KK receipt and name grammar repairs all twelve recorded Stage 8
regressions while retaining unknown payment and original-sale clarification.
The frozen corpus is now an exposed regression set, not a new independent holdout:
104→118/120, two remaining failures, zero new regressions. All prior gold stays fixed.
Strict raw transport and local SQL/browser tests are separate evidence from
deterministic fixture metrics; neither measures live provider/ASR accuracy.

Independent annotation/privacy/adjudication templates and a disabled live plan
are prepared only. No participants, consent, WER, actual billing or live accuracy
are invented. New owner approval is required for any paid execution or audio.
Evidence: `docs/diploma-evidence/ai-evaluation-stage9/`.

## 2026-10-25 — Stage 10: preserve integrated source and verify the real local path

Stage 9 already contains main and Stages 6–8; the separate final-candidate
worktree is based on it without duplicate merges. No confirmed integration
defect justified a production rewrite. New code is isolated acceptance tooling
and a guarded offline academic launcher, with real API/SQL and visible synthetic
labels. Source/test/evidence commits are distinguished in the provenance report.

Fresh 42-case gold was frozen before execution. The same exposed author and
eleven aligned semantic families across languages prevent a blind independent
accuracy claim. Known frozen ambiguities remain errors; no gold is retuned.
Financial writes still require explicit confirmation and exact idempotency reuse;
read-only AI/Research actions preserve the journal. Physical/live/staging boundaries
are not inferred from desktop Chrome or local signed JWT tests.

Local demonstration is distinct from staging GO. No automatic push/PR/deployment,
shared migration or paid AI is authorized. Evidence and next acceptance gates:
`docs/diploma-evidence/final-integration/`.

## 2026-10-26 — Stage11 separates local proof from release approval

Review branch starts at verified Stage10 e825dd9a; no production rebuild or merge.
New tooling2073960 rehearses0009 and restores synthetic data into NEW loopback DBs;
destructive downgrade is demonstrated only on the restored copy and is not the
default release rollback. Raw backup files remain local, checksums are evidence.

The current exact Pages callback intentionally blocks registration on arbitrary
staging production origins. Staging requires an approved Auth origin/callback
decision, managed DB/role review, independent human review and bounded liveAI
acceptance; local tests do not satisfy these gates. Feedback collection awaits
assigned retention/withdrawal operations. No production guard was weakened.

The60-case blind packet is unannotated and uses developer-exposed synthetic texts;
it is preparation for human label review, not independent model performance.
Publication, PR100 changes, deploy and paid calls remain prohibited in this stage.
Evidence: `docs/diploma-evidence/stage11-release-readiness/`.

## 2026-10-26 — Stage 12 publishes into the existing repository

The owner cancelled personal-repository migration and authorized publication of
Stage 1–11 into `foxfordkz-cyber/qadamx-taraz`, branch
`integration/qadam-diploma-v1`. Preserve history and authorship. Use one stacked
Draft over Research PR #100 to avoid repeating its eleven commits in the review
diff; do not change #100, merge or deploy. Source is Stage11 `e94d9a71`, containing
Stage10 `e825dd9a`. A verified full local Git backup protects the original sources.

Fresh tests and synthetic local demonstration are separate from live acceptance.
Only test-output isolation and publication/development evidence are added; product
source, contracts and frozen datasets are unchanged. Newly reported npm development
dependency advisories are retained as an unresolved release-review item, without
an unreviewed major upgrade. Local academic demo remains distinct from production
approval. Details: `docs/diploma-evidence/stage12-publication/`.
