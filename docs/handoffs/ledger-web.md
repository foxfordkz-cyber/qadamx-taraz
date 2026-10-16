# Передача работы голосового учёта

## Передача PR #32 для интеграции с API 0.6.2 — 2026-10-16

**Статус: подготовлены точные патчи и проверка совместимости в отдельной локальной копии. Это не обновление HTTPS, не готовая общая сборка и не merge main.** Production-реализация остаётся `713f00f0450ddc1f0e6d10727270ef8e9f3602bb`; текущая передача добавляет только документацию и файлы патчей. Новых функций нет. Сведения о старых адресах/версиях ниже — история, а не подтверждение текущего deployment.

### Точные базы и состав

Remote heads проверены через GitHub API: `main` = `13248851fd2b2a502aff211a506f71e85c2b0ab1`, `fix/ai-draft-flow` = `713f00f0450ddc1f0e6d10727270ef8e9f3602bb`, `integration/openai-recovery-062` = `4e983b42a2a0466d2fc07e4de09becf87a8ef7d5`. Полный `git fetch origin` был прерван после зависания; отдельный `ls-remote` завершился ошибкой DNS. Нужный объект `4e983b4` получен отдельным fetch, сравнение сделано по его содержимому, а не по устаревшему remote-tracking ref.

| Назначение | Точная ссылка |
|---|---|
| PR реализации | [Draft PR #32](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/32), ветка `fix/ai-draft-flow` |
| База именно PR #32 | `649bbb303471abe79dd08d61f76bce52ee10e266` — сохранённый PR #23, включая recorder/playback/cancel |
| Production commit | [713f00f](https://github.com/foxfordkz-cyber/qadamx-taraz/commit/713f00f0450ddc1f0e6d10727270ef8e9f3602bb) |
| Полный исходный diff | [649bbb3…713f00f](https://github.com/foxfordkz-cyber/qadamx-taraz/compare/649bbb303471abe79dd08d61f76bce52ee10e266...713f00f0450ddc1f0e6d10727270ef8e9f3602bb) — 14 файлов, +586/−22 |
| Backend, поверх которого переносить | [4e983b4](https://github.com/foxfordkz-cyber/qadamx-taraz/commit/4e983b42a2a0466d2fc07e4de09becf87a8ef7d5), API **0.6.2**, recovery + диагностика + OpenAI |

Готовые артефакты находятся в [docs/patches/pr32](../patches/pr32); точные базы, размеры и SHA-256 записаны в [manifest.json](../patches/pr32/manifest.json). Первые два патча — неизменённые `git diff --binary --full-index 649bbb3 713f00f` по соответствующему каталогу.

| Патч | Содержимое и применение |
|---|---|
| [frontend.patch](../patches/pr32/frontend.patch) | Только 7 файлов `apps/web` из PR #32, +511/−17; требует recorder-адаптацию PR #23 |
| [backend.patch](../patches/pr32/backend.patch) | Только 4 файла `apps/api` из PR #32, +42/−4; production меняется лишь в `app/services/ai.py` на 10 добавленных строк |
| [voice-prerequisite-pr23.patch](../patches/pr32/voice-prerequisite-pr23.patch) | Только frontend prerequisite: точный diff `1324885 → 649bbb3`, 15 файлов. Нужен **только если PR #23 ещё отсутствует** в выбранной frontend-базе |
| [openai-quota-test-062.patch](../patches/pr32/openai-quota-test-062.patch) | Адаптация одного существующего теста API 0.6.2 к новому коду 429; production не меняет |
| [contract-notes-062.patch](../patches/pr32/contract-notes-062.patch) | Два пояснения контракта из PR #32 перенесены поверх документов `4e983b4`; сохранены OpenAI-разделы и версия 0.6.2, уточнено влияние на оба провайдера |

Точный frontend delta от базы PR #32:

| Путь внутри `apps/web/src` | +/− | Результат |
|---|---|---|
| `features/voice/AnalysisError.tsx` | +37/−0 | Локализованные quota/network/timeout/audio/invalid-response; безопасный request ID |
| `features/voice/AudioInput.tsx` | +3/−2 | Нормализация MIME файла перед существующей проверкой |
| `features/voice/Sale.tsx` | +145/−14 | Явное уточнение, RU/KZ/auto, блокировка старого draft, долг и ручная проверка |
| `features/voice/audioContract.ts` | +30/−0 | Общие 4000 символов, MIME-подсказки только разрешённых расширений |
| `features/voice/draftInput.ts` | +11/−0 | Проверка полного уточнения по Unicode code points |
| `features/voice/i18n.ts` | +52/−0 | Тексты RU/KZ |
| `test/voice-adaptation.test.tsx` | +233/−1 | 19 сценариев с заглушками: деньги, уточнение, отмена, late responses, MIME и ошибки |

Точный backend delta от базы PR #32:

| Путь внутри `apps/api` | +/− | Результат |
|---|---|---|
| `app/services/ai.py` | +10/−0 | Четыре строки правила уточнения в `SYSTEM_PROMPT`; шесть строк обработки `HTTPStatusError` |
| `scripts/smoke_ai.py` | +5/−4 | Необязательный `--fixtures`, прежний default; это по-прежнему **Gemini-only** скрипт |
| `tests/fixtures/ai_voice_flow.json` | +13/−0 | 8 синтетических RU/KZ/mixed примеров, включая уточнения и две продажи |
| `tests/test_ai.py` | +14/−0 | 429/503, один вызов, безопасный ответ без provider body |

Остальные три файла исходного PR: собственный `docs/handoffs/ledger-web.md`, `docs/team5/02_ARCHITECTURE_API.md`, `packages/contracts/AI_INTEGRATION.md`. Из ветки **не переносить целиком** `apps/api`, корневой `backend`, OpenAPI/generated, зависимости или env. Shared router, Auth, выбор точки, API-клиент, `useWrite`, Analytics и общие стили не входят в PR #32.

### Как сохранить API 0.6.2

В `4e983b4` функция `extract()` уже создаёт request-scoped provider и diagnostic context; основная логика вынесена в `_extract()`. Патч успешно накладывается на новую `_extract()`, сохраняя общий deadline, late-response/cancellation guards, `max_attempts` и отсутствие повторного fallback. Переносить нужно именно добавления, а не старый файл `ai.py`.

Не заменять `ai_provider.py`, `openai_provider.py`, `ai_diagnostics.py`, `ai_request.py`, `draft_routes.py`, `customers.py`, router/models/schemas/config, миграцию `0006_customer_requests.py`, rollout/guard scripts и тесты recovery. Не откатывать `packages/contracts/openapi.json`, customer-recovery contract/examples и `apps/web/src/shared/api/generated.ts` к версии моей ветки. Настройки `AI_PROVIDER`, OpenAI и fallback остаются у владельца backend.

`OpenAIProvider` импортирует общий `SYSTEM_PROMPT`, поэтому правило уточнений действует и на него. Ошибка HTTP 429 от обоих провайдеров проходит через общий `_extract()` и становится **HTTP 503 / `AI_QUOTA_EXCEEDED`**. В исходном тесте OpenAI 0.6.2 ожидается `AI_UNAVAILABLE` для всех статусов: это воспроизведённое расхождение контракта, не потеря OpenAI. Подготовленный test patch меняет ожидание только для 429 и дополнительно проверяет HTTP 503; проверки одного вызова и отсутствия утечки остаются. Правило «на 429 не делать fallback» не меняется.

Порядок для интеграционного агента на его отдельной проверочной ветке после получения свежих heads:

1. Сохранить выбранную общую базу, включая backend `4e983b4` или более свежий совместимый head. Если backend продвинулся, повторить проверку контекстов патча.
2. Проверить наличие PR #23 в frontend. В самом `4e983b4` его нет: из web относительно `1324885` изменён только `shared/api/generated.ts`. В существующей HTTPS voice-сборке PR #23 мог быть включён отдельно; это нужно проверить по commit, а не применять prerequisite дважды.
3. На базе без PR #23 сначала `git apply --check <path>/voice-prerequisite-pr23.patch`, затем `git apply <path>/voice-prerequisite-pr23.patch`. На уже адаптированном frontend этот шаг пропустить.
4. Для каждого из `frontend.patch`, `backend.patch`, `openai-quota-test-062.patch`, `contract-notes-062.patch` последовательно выполнить `git apply --check <path>/<file>` и `git apply <path>/<file>`. При конфликте сравнить изменения вручную, сохранить обе нужные части.
5. Выполнить проверки ниже, зафиксировать **новый точный integration commit** и только после отдельного rollout проверять HTTPS. Main и ветки других участников не менять.

### Контракт и настройки

Новых endpoint, полей, миграций, зависимостей или env-переменных PR #32 не добавляет. Итоговая версия остаётся **API 0.6.2**. `ErrorResponse.error.code` уже строка, поэтому добавление `AI_QUOTA_EXCEEDED` не меняет OpenAPI/generated. Пример безопасного ответа HTTP 503:

```json
{"error":{"code":"AI_QUOTA_EXCEEDED","message":"AI quota exceeded; retry later","fields":{}},"request_id":"<request-id>"}
```

Уточнение: прежний `POST /api/v1/businesses/{id}/drafts`, multipart только `text` и `locale=ru|kk|auto`. Текст = исходная расшифровка + `\nНақтылау / Уточнение: ` + исправление; весь текст 1–4000 Unicode code points. Это создаёт новый AI draft, а не денежную операцию и не изменение прежней продажи. Валидация схемы/доказательств и проверка человеком обязательны; prompt не гарантирует правильность суммы.

Лимиты аудио побайтово совпадают с backend `4e983b4`: до **8 MiB**, до **30 секунд**, MIME WAV/MP3/Ogg/Opus/WebM/MP4/M4A/FLAC из общего контракта. AAC не добавлен. Исправление отсутствующего MIME по расширению — подсказка транспорту; фактический контейнер и длительность проверяет сервер. Серверный общий AI deadline 25 секунд, клиентский 30 секунд; их не увеличивать для маскировки ошибки.

| Сторона | Необходимые существующие настройки |
|---|---|
| Web | `VITE_API_BASE_URL` с `/api/v1`; `VITE_SUPABASE_URL`; только публичный `VITE_SUPABASE_PUBLISHABLE_KEY`. После изменения пересобрать frontend |
| Общий backend | Сохранить `DATABASE_URL`, Supabase/JWT, storage и точные `ALLOWED_ORIGINS`. Для телефона origin должен соответствовать HTTPS frontend; localhost доступен только на том же устройстве |
| Gemini, если выбран владельцем | `AI_PROVIDER=gemini`, серверные `AI_API_KEY` и `AI_MODEL` |
| OpenAI, если выбран владельцем | `AI_PROVIDER=openai`, серверные `OPENAI_API_KEY`, `OPENAI_MODEL`; для аудио также `OPENAI_TRANSCRIPTION_MODEL` |
| Fallback | Сохранить решение владельца. По умолчанию `AI_FALLBACK_OPENAI=false`; `AI_PRIMARY_TIMEOUT_SECONDS` относится к уже существующему ограниченному fallback. PR #32 не включает его и не меняет модель |

Секреты только на сервере. Не копировать `.env` из старого проекта/ZIP в проверочную сборку; не публиковать ключи, пользовательское аудио или транскрипции. Наличие кода миграции 0006 в commit не подтверждает её применение в конкретной БД; rollout/recovery — ответственность общего backend, без сброса/повторного seed.

Запуск после сборки интеграционным агентом (из соответствующего каталога):

```powershell
# apps/api, Python 3.12, уже настроенный общий backend
uv sync --frozen
uv run uvicorn app.main:app --host 127.0.0.1 --port 8020

# apps/web, существующий общий API и публичный Supabase config
npm ci
npm run dev -- --host 127.0.0.1 --port 5194 --strictPort
```

Порты — примеры для отдельной локальной проверки; заранее согласовать CORS для выбранного origin. Работающие API/frontend/туннели этими командами не заменять. Production frontend: `npm run build`; HTTPS публикует интеграционный/backend агент после приёмки.

### Фактические проверки этой передачи

В отдельную временную папку экспортированы файлы **4e983b4**, без `.env`, БД и запуска сервера. Применялись только опубликованные выше патчи. Рабочее дерево production и общая инсталляция не изменены.

- `frontend.patch --check` непосредственно на `4e983b4` ожидаемо не проходит: отсутствует prerequisite PR #23. После frontend prerequisite оба patch check/apply проходят. Все 17 итоговых изменённых frontend-файлов совпали с реализацией `713f00f` после нормализации CRLF/LF.
- `backend.patch`, test adaptation и contract notes проходят `git apply --check` и применяются поверх `4e983b4`. В экспортированной базе 161 из 168 прежних файлов остались побайтово прежними; оставшиеся 7 — ожидаемые существующие файлы из патчей. В частности, customer recovery, OpenAI provider/selection, диагностика, миграции, OpenAPI и generated сохранены.
- `pytest tests/test_ai.py tests/test_audio.py tests/test_ai_diagnostics.py tests/test_openai.py -q`: **до** адаптации ожидания OpenAI — **1 failed, 73 passed, 17 skipped**, единственная ошибка `test_provider_failure_no_retry_or_leak[429]`; **после** test patch — **74 passed, 17 skipped**. Все AI/HTTP ответы в этом прогоне — заглушки; пропуски требуют отдельной PostgreSQL. Использован существующий Python 3.12 venv, это не новая установка окружения из target lock.
- `python -m app.export_contracts --check` — PASS на API 0.6.2; Ruff check/format четырёх затронутых Python-файлов — PASS. Есть прежнее предупреждение Starlette/TestClient о httpx.
- Нового запуска всего frontend, полного PostgreSQL suite, живого Gemini/OpenAI, денежного HTTP-сценария или физического телефона в этой передаче нет. Применимость патча и отдельные тесты не заменяют общую приёмку.

Исторические результаты **713f00f** (не новый прогон API 0.6.2): frontend **253/253**, strict lifecycle **35/35**, Chromium fake-microphone E2E **18/18**, build/typecheck/lint/format/API check PASS; backend **35 passed, 13 skipped**. Эти наборы пересекаются — числа не суммировать. На настоящем **Gemini gemini-3.5-flash-lite** provider-only прошли **8/8 синтетических текстовых примеров**. Синтетическое RU TTS-аудио сначала дало `AI_TIMEOUT`, отдельная повторная попытка прошла. Это не реальный микрофон и не совместная HTTP/Auth/DB проверка. Новый общий prompt с настоящим OpenAI ещё **не проверен**; результаты backend-агента до этого изменения не доказывают его качество после переноса.

### Уточнения и защита от старых сумм: приёмка общей сборки

| Действие | Ожидаемое поведение | Имеющаяся проверка / что ещё нужно |
|---|---|---|
| RU «Продал на 3000, получил 1000», KZ и mixed из fixture | Draft: `total_minor=300000`, `received_minor=100000`; долг 2000 ₸; без клиента нельзя подтвердить; до явного Confirm нет POST `/operations` | Component stubs и живой Gemini text PASS на 713f00f; повторить через общий HTTP и выбранного провайдера |
| Уточнить до 3500/2000 | Только новый POST `/drafts` с исходным текстом и уточнением; успешный ответ меняет суммы на 350000/200000 и сбрасывает выбор клиента; до Confirm денег нет | Component stub, Gemini RU/KZ PASS; OpenAI с новым prompt ещё проверить |
| После успешного разбора изменить исходный текст/аудио | Старый draft и уточнение сброшены; старый transcript не затирает новый текст; видимые прежние суммы не подтверждаются автоматически | Regression в `voice-adaptation.test.tsx`; повторить в общей UI |
| Отменить уточнение или получить timeout/ошибку; затем приходит поздний ответ | Проверенные поля остаются, но Confirm старого draft блокируется; late callback не возвращает draft. Только успешный новый анализ или явная ручная проверка снимают блокировку | Component stubs PASS; старый запрос также не должен затирать более новый ответ |
| Выбрать «Ручной ввод» после сбоя | Явное решение продавца, `draft_id=null`; проверить суммы и клиента; деньги только после отдельного Confirm | Component stubs PASS; нет фиктивного AI-результата или подстановки неизвестной оплаты в 0 |
| Двойной Confirm / потеря ответа на денежной записи | Один активный запрос; при неизвестном результате существующий `useWrite` повторяет прежний key/body, а не новый ключ/изменённые суммы | 713f00f unit/regression с заглушками; живая идемпотентность и recovery нужны в общей сборке |
| Смена аккаунта/точки или уход со страницы | Предыдущий контекст размонтирован, запрос отменён, поздний результат не применён; draft не подтверждается в другом контексте | Сохранён общий scope/Auth и прежняя lifecycle-защита; повторить в общей UI |
| Неизвестная оплата / две самостоятельные продажи | `received_minor=null` / `kind=unknown`, ручное уточнение; не создавать произвольную сумму или объединённую продажу | Gemini fixture PASS; проверить на выбранном OpenAI/Gemini |
| HTTP 429 / сеть / 25-секундный timeout | Понятное RU/KZ сообщение, конечное loading, сохранённый ввод, ручной путь; quota не запускает fallback/retry | Unit/stub проверки; провайдер и реальные сетевые условия отдельно |

Ввод самого уточнения ещё не равен его отправке: пользователь явно нажимает «Уточнить и пересчитать черновик». Во время запроса, после его отмены/ошибки и после замены источника действует блокировка старых сумм. Браузерная отмена гарантирует игнорирование позднего ответа в UI, **не гарантирует остановку уже начавшейся обработки/списания квоты на сервере**.

Команды интеграционной проверки из `apps/web`:

```powershell
npm run test
npx vitest run --config vitest.microphone.config.ts
npx playwright test --config e2e/microphone.playwright.config.ts
npm run check:api
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Из `apps/api` — указанный выше целевой pytest, затем полный `uv run pytest -q` **только с отдельной пустой test PostgreSQL** по правилам `tests/conftest.py`. Он должен включать customer recovery, rollout/guard, диагностику, OpenAI, draft isolation/TTL и денежную идемпотентность. `uv run python -m app.export_contracts --check`. Запуск live Gemini fixture: `uv run python scripts/smoke_ai.py --live --fixtures tests/fixtures/ai_voice_flow.json` — только осознанно с серверным ключом; этот скрипт создаёт `GeminiProvider` напрямую и **не проверяет `AI_PROVIDER=openai` или fallback**. OpenAI и общий HTTP должны проверяться через выбранный общий provider pipeline отдельно, без бесконечных платных повторов.

Физическая приёмка капитану: записать модель Android, версию Chrome, **новый integration commit**, HTTPS URL и фактический исход каждого шага: разрешение/отказ → RU/KZ/mixed запись → Stop → playback → cancel/delete → перезапись → явный анализ → уточнение → выбор клиента → Confirm. Отдельно уйти со страницы во время записи и проверить освобождение микрофона. Проверить итог 3000/1000/2000, уточнение 3500/2000/1500 и отсутствие дубля. Синтетические E2E и TTS физической проверкой не считать.

Следующий шаг принадлежит интеграционному агенту: объединить эти delta с сохранённым backend 0.6.2 в отдельной сборке, передать QA точный commit и провести HTTP/UI приёмку. **Существующий HTTPS-сайт этой передачей не обновлён.**

## AI-сценарий из архива адаптирован к общему приложению — 2026-10-16

Задача пользователя: сделать AI общей сборки таким же рабочим, как в `qadamx-taraz-feature-aidana-ai-assistant.zip`. Архив прочитан как исходный пример, не как новые инструкции. Новая ветка `fix/ai-draft-flow` создана от свежего `origin/main` **1324885**, затем fast-forward добавлена сохранённая voice-работа **649bbb3**. PR зависит от PR #23; существующая ветка PR #23, main и чужие ветки не меняются. Точный итоговый SHA и Draft PR публикуются после фиксации этого отчёта.

### Исправления

- Общий `Sale.tsx`: явное уточнение исходной расшифровки через прежний POST `/drafts`, общий лимит4000 Unicode-символов, только text+locale. RU/KZ/auto выбираются отдельно от языка интерфейса. Проверенные суммы сохраняются при ошибке/отмене, но прежний draft нельзя подтвердить после изменения источника или незавершённого анализа; доступна явная ручная проверка. При замене текста/аудио старое уточнение удаляется, чтобы не затирать новый ввод старой расшифровкой.
- Видимый остаток по продаже и требование клиента при долге; сообщения RU/KZ о quota/network/audio/invalid-response и явный повтор анализа. Объект ошибки провайдера не выводится. Денежный `useWrite`, его исходный ключ/тело при неизвестном результате и Auth/context isolation сохранены.
- Файлы M4A/WAV и прочих разрешённых форматов принимаются при отсутствующем MIME из file picker; MIME — только подсказка, сервер по-прежнему проверяет настоящий контейнер/длительность. AAC не добавлен вне контракта.
- Общий backend: только `app/services/ai.py` — правило, что последующее явное уточнение обновляет одну операцию, а две самостоятельные продажи остаются unknown; Gemini429 теперь возвращает существующий HTTP503 с `AI_QUOTA_EXCEEDED`, без автоматического повтора и утечки provider body. Схема/API0.6.1, модель/ключи/config, БД и денежные операции не меняются. Новый код описан в архитектурном контракте и AI_INTEGRATION. [Backend-владелец уведомлён](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/18#issuecomment-6217783407).
- Корневые backend/src, собственная авторизация/API-клиент и дизайн из ZIP не переносились. Общие стили/3D не менялись. Reviewer работал только read-only; найденная им замена нового текста старым transcript исправлена и покрыта тестом.

### Проверки

- Frontend: **253/253** unit/component, **35/35** strict lifecycle. Дополнительные сценарии проверяют RU/KZ/mixed→3000/1000→выбор клиента→один POST при двойном подтверждении, уточнение3500/2000 без денежного POST, отмену/устаревший ответ, лимит4000, ошибки и MIME.
- Chromium microphone E2E **18/18** (fake device + синтетические Auth/API, widths360/390/768/1440), build/TypeScript, lint, format, generated API check — PASS. Предупреждение большого3Dchunk унаследовано; зависимости/lock не менялись.
- Backend: `pytest tests/test_ai.py tests/test_audio.py -q` — **35 passed, 13 skipped**. Skipped требуют отдельную PostgreSQL; общую БД для тестов не подключали. Ruff и `python -m app.export_contracts --check` — PASS. Установлено локальное игнорируемое окружение из существующего `uv.lock`/Python3.12; новый сервер не запускался.
- Настоящий Gemini, модель **gemini-3.5-flash-lite**, через общий `GeminiProvider/extract` с уже имеющимся локальным серверным ключом только в памяти процесса: до prompt-исправления5/6 PASS, уточнение3000/1000→3500/2000 вернуло unknown. После исправления **8/8**: RU, KZ, mixed, уточнениеRU, неизвестная оплата(null), погашениеKZ, уточнениеKZ, две отдельные продажи(unknown). Это provider-only, не live HTTP/Auth/DB сценарий общей инсталляции.
- Синтетическое RU-аудио5,81с через настоящий `normalize_audio` и Gemini: первая попытка **AI_TIMEOUT**, один отдельный повтор **PASS**, sale300000/received100000. Это TTS, не голос пользователя и не физический Android; аудио лежит только в игнорируемом tmp и не публикуется. Успех повтора не является гарантией отсутствия timeout.
- Воспроизводимые текстовые случаи: `apps/api/tests/fixtures/ai_voice_flow.json`. Из настроенного `apps/api`: `python scripts/smoke_ai.py --live --fixtures tests/fixtures/ai_voice_flow.json`. Это явно платный/квотный вызов Gemini без PostgreSQL; только при настроенном серверных AI_API_KEY/AI_MODEL. Секреты не помещать в frontend.

### Подключение и оставшаяся приёмка

Общий HTTPS API из опубликованной frontend-сборки: `https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1`. Проверены health200 и OpenAPI0.6.1. Local origin5193 получает CORS400, документированный **http://127.0.0.1:5188** получает корректный preflight200. Публичный конфиг подключён только в игнорируемом `apps/web/.env.local`; новый UI запущен на5188 с прежним Supabase Auth. Пароли/ключи сервера не копируются. Это адрес только данного ПК.

Историческая рекомендация обновления заменена точным порядком интеграции API 0.6.2 в начале этого handoff: переносить только delta, не весь `apps/api` из этой ветки. `https://negotiations-exist-newman-ohio.trycloudflare.com/login` сам этой работой не обновлялся. Смена модели или ключа на сервере не выполнялась; живой provider прогон выше не доказывает состояние credentials его инсталляции. После deployment: физический Android checklist ниже, вход учебным аккаунтом и HTTP полный денежный сценарий3000/1000/2000 с прежней идемпотентностью. Ни физический телефон, ни запись в общую БД в этом этапе не заявляются.

## Синхронизация с main и координация оформления — 2026-10-16

Текущая voice-реализация сохранена в собственной ветке `fix/voice-playback-lifecycle`, implementation commit **a1e5252478eec61d85607b41557ff584b52cfe17**. Незакоммиченных production-изменений перед синхронизацией не было; локальный публичный `.env.local` игнорируется Git и не публикуется.

Полный `git fetch origin` остановлен из-за зависания/медленной загрузки посторонних веток; нужный main успешно получен командой `git fetch origin refs/heads/main:refs/remotes/origin/main`. Затем `git merge origin/main` → **Already up to date**: main **13248851fd2b2a502aff211a506f71e85c2b0ab1** уже является предком voice-ветки. Конфликтов нет, код не изменился, новые merge/reset/force-коммиты не создавались. AGENTS.md и актуальные handoff перечитаны. Контракты и generated API совпадают с main; `npm run check:api` — PASS. Прежние функциональные результаты ниже не выдаются за новый прогон.

По поручению капитана шестой участник ведёт общие стили и 3D, Айдана и seller-фронтендер — функциональность; изменения общих компонентов согласуются через владельца оформления. [Решение и уведомления](../DECISIONS.md) зафиксированы. Новые задачи начинаются от свежего main; текущая адаптация продолжается в PR #23. Flutter и customer recovery остаются отдельными этапами. Main и чужие ветки не менялись.

## Адаптация voice в общую интеграцию — 2026-10-16

Ветка `fix/voice-playback-lifecycle` от свежего PR #18: **13248851fd2b2a502aff211a506f71e85c2b0ab1**, API **0.6.1**. [Draft PR #23](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/23), первый опубликованный implementation commit **8dc6f895e3eead0de954c3374a6d4cc50d432588**. Последующий commit этой передачи исправляет стабильность accessible name текстового поля и разметку сообщения об ошибке; его точный SHA указан в PR и комментариях QA. Исходный standalone AI/voice commit: **880d7137f39648f0bbce355369ee3e755d981f02**; он не является реализацией в `apps/web` и не переносится целиком.

### Реализовано в минимальном переносе

- Единственный production-исполнитель — владелец voice. Разделение с автором PR #20 уже подтверждено в [комментарии](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/20#issuecomment-6215571848); PR #21 `63802e663582bc4cb30eaf4744407288b5386a3c` предоставляет тесты/review. Дополнительный reviewer текущей задачи меняет только тесты.
- `apps/web/src/features/voice/AudioInput.tsx` + `recorder.ts`: запись → Stop → файл. Cancel во время разрешения/записи/паузы/ожидания onstop; отдельная сессия на каждую попытку, поздние события не возвращают удалённую запись и не затрагивают новую. Tracks/таймеры/обработчики освобождаются при stop, cancel, ошибке, disabled и unmount. Потеря track отбрасывает частичную запись. Пауза/продолжение появляются только при наличии методов; стандартный микрофон работает без выбора устройства. При отсутствии MIME probe проверяется формат стандартного recorder.
- `AudioPreview.tsx`: native audio controls плюс явные RU/KZ Play/Pause/Delete, повторное прослушивание. Удаление/замена/unmount останавливают playback и освобождают Object URL. После удаления можно записать снова. Текст сохраняется при записи, выборе аудио и отмене.
- `Sale.tsx`: только явный Prepare отправляет multipart; Stop/таймер/Play/Delete/Cancel ничего не отправляют. Общий API принимает прежние audio XOR text + locale. Никакого автоматического Stop→analyse.
- Отмена анализа передаёт AbortSignal общему API и инвалидирует текущую попытку; поздний ответ игнорируется. Локальный timeout 30 секунд освобождает UI даже при зависшем транспорте; серверный AI deadline остаётся 25 секунд. UI не обещает остановку обработки на сервере.
- Контекст формы привязан к общим `auth.scope` и `business.id`. Прежний черновик не переносится между аккаунтами/точками. Общий `useWrite` не изменён: подтверждение, ключ/тело неоднозначного запроса и инвалидация аналитики сохранены.
- `audioContract.ts` повторяет согласованные ограничения API 0.6.1: 8 MiB, 30 секунд, allowlist MIME из `apps/api/app/services/audio.py`; сервер по-прежнему проверяет действительную длительность и контейнер. Нового backend, собственного API-клиента/Auth, изменения router или generated.ts нет.

### Фактические проверки текущего apps/web

- Строгий PR21 gate: `npx vitest run --config vitest.microphone.config.ts` — **35/35 passed**, включая все 13 прежних failures. Assertions сохранены. Пять исправленных `.fails` переведены в обычные тесты.
- `npm test -- --no-file-parallelism` — **242/242 passed**. Включает 8 дополнительных pause/default-recorder/cancelled-analysis/late-response/timeout/context-isolation тестов. Отдельные 8 lifecycle cases входят в strict gate, а не default discovery.
- `npm run lint`, `npm run check:api`, `npm run build` (включая tsc), `npm run format:check` — PASS. После последних изменений повторно прошли strict35, дополнительные8, lint и build. Сохранены прежние empty-auth/large-3D warnings; зависимости не обновлялись.
- `npx playwright test --config e2e/microphone.playwright.config.ts` — **18/18 passed** на установленном Chromium156/build1248: настоящий браузерный MediaRecorder с fake device, native playback, RU/KZ, запрет разрешения, multipart, двойной Prepare, stop/unmount/URL cleanup; ширины360/390/768/1440. Первая попытка была заблокирована отсутствующим runtime; первый запущенный прогон дал12pass/6fail, после исправления доступного имени textarea и отдельного вывода общего/детального сообщения повторный полный прогон дал18pass.
- Одно унаследованное E2E-ожидание очистки ручного текста после записи согласовано с reviewer и изменено на сохранение текста. Это сохраняет ввод пользователя; проверки audio XOR text, отсутствия отправки до Prepare и денежных записей не ослаблены. Все остальные E2E assertions сохранены.
- `CI=1 npx playwright test seller.spec.ts integration-design.spec.ts --trace off` — **13/13 passed** на общей интеграции с синтетическими API/Auth. Проверка проходила до финального изменения только accessible label/error markup; shared money/Auth/router не менялись.
- Все новые результаты выше используют синтетические media/API/Auth boundaries. Настоящий Gemini, Supabase и PostgreSQL на этой адаптации ещё не проверены. Тесты не публикуют аудио, trace/video/HAR или секреты.

### Что означали прежние 81 тест и live Gemini

Для старого root commit **880d713**: `npm test` — **42** (API/ledger/voice + 12 React DOM), `.venv/Scripts/python.exe -m pytest backend -q` — **39**. Это отдельный старый React/SQLite/cookie backend, а не доказательство совместимости apps/web или API 0.6.1.

По зафиксированному `VERIFICATION.md` старой ветки настоящий Gemini проверялся через `backend.check_flow`: KZ-текст и отдельно RU синтетическое аудио → черновик без операции → 3000/1000 → повтор тем же ключом → доплата500, итоги3000/1500/1500 во временной SQLite. Отдельно прошли EN синтетическое аудио3000/1000 и RU уточнение3000/1000→3500/2000. Это не физическая речь, не Android и не live-приёмка общего backend. 503/timeout/невалидный JSON/сеть/микрофонные гонки в старых автоматических тестах проверялись заглушками. Эти исторические live-проверки в текущем переносе не перезапускались.

### Запуск и передача QA

1. Checkout ветки/точного commit из Draft PR. Из `apps/web`: `npm ci`.
2. Использовать общий `.env.local`: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Приватные ключи/DB credentials сюда не входят. Схема API не изменена, миграции не требуются.
3. `npm run dev -- --port 5193 --strictPort` или `npm run build` и согласованный HTTPS preview backend-агента. Localhost доступен только на компьютере, где запущен сервер. Рабочие чужие API8018/web5188/5191/HTTPS не перезапускались.
4. `npx vitest run --config vitest.microphone.config.ts`; `npm test -- --no-file-parallelism`; `npx playwright install chromium`; `npx playwright test --config e2e/microphone.playwright.config.ts`.
5. Нативный E2E использует только Chromium fake device и синтетические Auth/API, отдельный localhost4191. Не заменяет физическую проверку.

### Короткий checklist капитану: физический Android/Chrome

Нужен HTTPS preview, пересобранный именно из переданного implementation commit; старый preview PR18 не содержит этих исправлений. Записать модель телефона, Android/Chrome версии, commit и результаты:

1. Разрешить микрофон → записать RU, KZ и смешанную «Продал на3000, получил1000» → Stop → прослушать/пауза/повтор → явный Prepare.
2. Отказать в разрешении; проверить понятное RU/KZ сообщение, файл/текст/ручной ввод. Отменить до выдачи разрешения, затем разрешить: запись не начинается.
3. Cancel во время записи и Stop→Cancel; удалить готовую запись; записать заново; уйти на другую страницу. Индикатор микрофона должен погаснуть, старая запись не должна вернуться.
4. Проверить pause/resume при поддержке браузером. Смена вкладки/фон/блокировка/потеря устройства: отсутствие утечки микрофона и зависшего loading.
5. AI: черновик3000/1000, выбрать клиента при долге, до Confirm операции нет. Уточнить текст и повторить Prepare: только черновик. Confirm →3000 продажа/1000 оплата/2000 долг. При потерянном ответе использовать штатный retry с прежним ключом, проверить отсутствие дубля.
6. Cancel анализа и поздний ответ; сменить точку/аккаунт: прежний черновик не появляется в новом контексте. Проверить offline, timeout и квотную ошибку, не создавать искусственно лишние платные запросы.

Физического устройства в текущей проверке нет. Реальная RU/KZ-запись, физическое разрешение/отказ и живой Gemini в общем приложении не заявляются. Main и ветки других участников не меняются; PR остаётся Draft.

---

Ниже сохранена исходная история планирования.

Роль: ledger-web. Начальный статус: запланировано, реализация не подтверждена. Последнее обновление: 2026-10-15.

## Сделано

Подготовлены [ТЗ учёта](../team5/06_TEAM_LEDGER_FRONTEND.md) и [20 языковых сценариев](../team5/fixtures/ai_cases.json). Сценарии ещё не пройдены.

## Файлы и интерфейсы

Зона: `features/voice`, `features/ledger`, `features/summary` внутри единого `apps/web/src`.

## Проверки

Микрофон, AI, сохранение и денежный сценарий 3 000 / 1 000 / 500 ещё не проверены в приложении.

## Зависимости и ограничения

Каркас/клиенты — seller-web; разбор, журнал и суммы — backend. Браузер не пишет деньги напрямую в БД.

## Следующий шаг

Ручная форма, карточка подтверждения, состояния и контракт интеграции. Затем микрофон и живое сохранение.

## Перед завершением

Записать ветку, сделанное, проверенные сценарии и ошибки, следующий шаг и ссылку PR после создания.
