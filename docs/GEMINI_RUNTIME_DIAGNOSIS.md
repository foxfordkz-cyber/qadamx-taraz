# Gemini: живая диагностика 2026-10-16

Исходный инцидент: `recording.webm`, request_id **6baafba2-a7ab-4471-8b1b-fb95e9cc0229**, UI сообщает «AI временно недоступен». Он **не объявляется исправленным** rollout customer recovery. Старый request_id отсутствует в сохранённом журнале процесса: `--no-access-log`, обработанные AIError/HTTPError не логировались, исходное аудио сервер не сохраняет. Фактическую причину именно этого запроса восстановить задним числом нельзя. Ни 429, ни ошибку аудиофайла без доказательств ему не приписываем.

## Проверенное окружение

Работающий listener **9272**,127.0.0.1:8018: код **4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5**, checkout **ca51bbf9bcf1a5e5379b7b8ced147e4114e01434**, API0.6.1. Прочитано окружение именно этого процесса read-only: AI_API_KEY присутствует, AI_MODEL=`gemini-3.6-flash`, оба совпадают с серверным env. Значение ключа не выводилось и не сохранялось в диагностические артефакты. Параметры запуска передают env в Settings, провайдер инициализируется при создании приложения. Наличие env само по себе не считалось успехом Gemini: ниже настоящие вызовы с этим ключом/моделью.

Remote main **13248851fd2b2a502aff211a506f71e85c2b0ab1**, PR22 **acce3fd1ac83324cf55a4809d80847e53c950d18**. Общая PostgreSQL read-only: **0005_livestock_market**, customer_creation_requests отсутствует. Новые voice/mobile refs обнаружены, в эту задачу не включались. API, voice preview и оба туннеля не перезапускались, env/CORS не менялись.

## Настоящий Gemini и HTTP

Для сравнения использована одна явно учебная фраза о полностью оплаченной продаже3000₸. Аудио синтезировано локальным Microsoft Irina, перекодировано в WebM/Opus,55431байт, примерно6,58с. Это **не запись микрофона телефона**. Проверен production normalize_audio: audio/webm;codecs=opus → mono16kHz WAV210716байт. Аудиобайты и содержимое ответов не логировались; файлы реального клиента не использовались.

| Проба | Текст | Синтетическое WebM |
|---|---|---|
| Тот же адаптер исходного checkout, настройки из процесса9272, настоящий Gemini | provider503/UNAVAILABLE,2500мс; AI_UNAVAILABLE | provider200,3921мс; валидировано sale300000/300000minor |
| Работающий8018 через внешний HTTPS, настоящий Supabase JWT | HTTP503,3656мс; request72eb0349-6ccc-451c-a050-6f204e809d7c | HTTP200,6406мс; request74738e9c-eac5-4883-adc3-4725133a396e |
| Исправленная диагностика на временном loopback8023, тот же env/JWT/Gemini/общаяБД | HTTP200,28891мс; request8a27c45f-7cf7-46f0-a76b-d07ee76ae055 | HTTP503,20265мс; requestd80df26b-ca17-4ae4-9c5c-f7673aaa0da1 |

Последняя аудиопроба теперь имеет точную корреляцию: `audio_decode`32мс без ошибки → `configuration` без ошибки → `provider_http`18562мс/**503**/**HTTPStatusError** → AI_UNAVAILABLE. Валидация JSON до отказа не выполнялась. В последней текстовой пробе provider200/23735мс, validation PASS, draft_save PASS.25с — существующий deadline extraction, не всего HTTP-запроса с авторизацией и сохранением.

Это доказывает непостоянный отказ **Gemini HTTP503** в воспроизведённых запросах; ни отсутствие ключа, ни постоянная несовместимость WebM не подтвердились.503 провайдера не исправлен изменением приложения. Смена модели, увеличение deadline, автоматические транспортные повторы и подключение оплаты не выполнялись. Первоначальный инцидент остаётся без точной ретроспективной причины. Нужна новая попытка реального телефона после включения логов в согласованное окно; бесконечных повторов нет.

Созданы только два **неподтверждённых учебных черновика**:

- fefde9eb-c1e7-4fe8-8152-73a95c6a5452 — синтетическое аудио через действующий внешний API;
- 1ac0a79c-ee55-4e92-8dc5-1887b340116f — текст через временный диагностический HTTP.

Ни один не подтверждался, новых денежных операций от диагностики нет. Read-only count operations до/после каждого HTTP-прогона13→13. Данные автоматически не удалялись, БД не очищалась. Отдельный диагностический8023 остановлен;8018 продолжает работать. Пробы8023 не являются проверкой патча через внешний туннель или с устройства команды.

## Исправление наблюдаемости

Отдельная ветка `backend/ai-runtime-diagnostics` от текущего main/API0.6.1; без customer recovery/0006. Патч не меняет контракт, модель, таймауты, retry policy, денежные правила, JWT или CORS.

- `app/services/ai_diagnostics.py`: context-local request_id, сброс после запроса, logger `uvicorn.error.qadam.ai` доступен штатному uvicorn log sink.
- `app/services/ai.py`: configuration, provider_http, provider_json, validation, extraction; сохраняется числовой статус провайдера до преобразования исключения в безопасный APIError.
- `app/draft_routes.py`: draft_request, audio_decode, draft_save и связь с серверным X-Request-ID.
- Только allowlisted metadata: request_id, stage, provider_status, error_type, error_code, duration_ms. Нет exception message/traceback, URL/headers, JWT/key, customer text, аудио, filename или полного provider response.

`AI_UNAVAILABLE`503 и `AI_TIMEOUT`504 остаются прежними; frontend должен сохранять ручной ввод. Успешный ответ создаёт только30-минутный черновик. В production процесс патч **ещё не загружен**; перезапуск запрещён до отдельного «окно открыто».

## Проверки с заглушками, отдельно от живых

На отдельной PostgreSQL qadam_test: **73PASS** (`test_ai`, `test_ai_diagnostics`, `test_audio`, `test_drafts`, `test_contracts`). После уточнения классификации CancelledError по deadline повторён диагностический набор: **9PASS**, пересечения не суммируются. Новые проверки: HTTP400/429/503, timeout/configuration/invalidJSON, отмена transport по общему deadline, параллельные request_id, реальный route audio error с X-Request-ID. Gemini в этих тестах — явная заглушка;429 встречается только в тесте, не в живой диагностике. Проверено отсутствие ключа/текста/аудио/exception message в новых логах. Ruff check/format и export_contracts --check PASS. Один прежний Starlette/httpx deprecation warning.

## Среда команды и следующий шаг

API: https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1

Frontend: https://negotiations-exist-newman-ohio.trycloudflare.com/login

Оба адреса сохранены; это временные туннели с зависимостью от включённого ПК и процессов. [Точные voice commits и условия](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/0737439/docs/VOICE_HTTPS_RESTORED.md). Живая проба патча предшествовала только уточнению типа CancelledError в логах; успешная обработка и HTTP503-код не менялись.

Капитан разрешил0006/0.6.2 после свежего backup/restore, **начало только после отдельного «окно открыто»**. Пока окно не открыто, нет ни миграции, ни переключения. Перед применением снова проверить heads/ревизию, сохранить данные/CORS/адреса и использовать защитный rollback из PR22. Gemini вести отдельно: диагностический патч требует включения в проверенный серверный commit и согласованного перезапуска; не объявлять сбой провайдера закрытым по результату rollout recovery. Main/voice не менялись, merge/платный тариф/деплой не выполнялись.
