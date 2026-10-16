# Временный HTTPS frontend для проверки на телефоне

Проверено 2026-10-16,17:28 Asia/Almaty. Это production-сборка текущей проверенной интеграции PR18, обслуживаемая локальным preview через отдельный бесплатный Quick Tunnel. Постоянный hosting/deploy не выполнялся.

## Адреса и точные commits

| Назначение | Адрес / commit |
|---|---|
| Frontend, вход с телефона | **[https://crucial-funky-marion-barcelona.trycloudflare.com/login](https://crucial-funky-marion-barcelona.trycloudflare.com/login)** |
| Запись после входа | [/seller/sale](https://crucial-funky-marion-barcelona.trycloudflare.com/seller/sale) |
| Аналитика | [/seller/analytics](https://crucial-funky-marion-barcelona.trycloudflare.com/seller/analytics) |
| API_BASE_URL | `https://kelkoo-student-skiing-universal.trycloudflare.com/api/v1` |
| API health / OpenAPI | [health](https://kelkoo-student-skiing-universal.trycloudflare.com/api/v1/health), [OpenAPI](https://kelkoo-student-skiing-universal.trycloudflare.com/openapi.json), версия **0.6.1** |
| Frontend исходник сборки | **`5ab11b146778698f54164057974fc81c397192dc`**, PR18/integration/seller-analytics-061; source merge94e2b7a |
| Запущенный код FastAPI | **`4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5`** |
| Checkout FastAPI | `ca51bbf9bcf1a5e5379b7b8ced147e4114e01434`, integration/livestock-https; после4f67e2c только docs |

Последующий commit с этим отчётом не пересобирает frontend и не меняет исходники приложения. HTML/JS/CSS/модели отдаются из отдельного `tmp/frontend-https-5ab11b1/dist`. Публичный конфиг в JS содержит внешний HTTPS API, а не loopback. Серверные ключи, JWT, пароли, DATABASE_URL не попали в сборку; выполнена проверка dist на настроенные секреты.

API-адрес для Flutter **не изменился**. Оба HTTPS-адреса временные: требуют включённых ПК, сети, preview, FastAPI и двух cloudflared. Фиксированного срока нет; перезапуск туннеля может сменить hostname. Не зашивать их как production URLs. Доступ с физического устройства/сети разработчика остаётся отдельной проверкой.

## Что включено и что оставлено отдельно

Remote heads и PR проверены перед сборкой. PR18 по-прежнему5ab11b1, PR17ca51bbf. Встроены только уже принятые изменения общей интеграции.

- PR20/test/mobile-microphone-acceptance — **39a730e63e43bb8487ed2f9afb1ead7762737314**. Diff добавляет тесты и отчёт, production AudioInput не меняет. Не объединялся. Его описанные known gaps не закрыты этим preview.
- PR19/fix/customer-post-unknown-result —99ed2c0: отдельное предложение/документация, не включено.
- feature/aidana-ai-assistant —880d7137f39648f0bbce355369ee3e755d981f02: корневые src/backend и прежний каркас, не готовая delta к общему apps/web. Полезные voice-изменения требуют адаптации владельцем; второй backend/router не переносился.
- PR15/mobile —3ac3a1a: отдельная работа mobile, его ветка не менялась.

В текущем UI есть Record/Stop, файл и текст/ручной ввод. **Playback и отдельной отмены записи нет**; countdown и lifecycle gaps изPR20 также не исправлялись в этой задаче. Наличие тестов вPR20 не означает наличие этих функций в production.

## Процессы и CORS

| Процесс | Endpoint | PID на момент проверки |
|---|---|---:|
| Прежний web | http://127.0.0.1:5188 |28500|
| Локальный PR18 dev preview | http://127.0.0.1:5191 |9268|
| Новый production frontend preview | http://127.0.0.1:5192 |33204|
| Новый frontend cloudflared | proxy только5192 |34696|
| FastAPI | http://127.0.0.1:8018 |10208; launcher34292|
| Прежний API cloudflared | proxy только8018 |33900|

5188 и5191 сохранены, новый5192 не заменяет их. Preview привязан к loopback; разрешён только точный внешний frontend hostname через `preview.allowedHosts`, без wildcard. [Vite preview options](https://vite.dev/config/preview-options). Frontend **не проксирует API через5192**: браузер телефона вызывает внешний API напрямую, CORS проверяется браузером.

Backend разрешает ровно:

```json
["http://127.0.0.1:5188", "https://crucial-funky-marion-barcelona.trycloudflare.com"]
```

Предварительно конфигурация проверена отдельным API8019: health/version, anonymous401, нужные origins200, чужойorigin400. После [предупреждения команды](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/18#issuecomment-6215381194) опознанный8018 кратко перезапущен с прежним кодом и новым ALLOWED_ORIGINS. Измеренная последовательность переключения/готовности≈6секунд. Туннель33900 не останавливался. [Восстановление подтверждено команде](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/18#issuecomment-6215495430).

Секретный `apps/api/.env` не изменялся. Новый ALLOWED_ORIGINS передан только в окружение процесса; для восстановления сохранён игнорируемый `tmp/api-runtime-overrides.json`. При ручном перезапуске8018 нужно снова применить эти точные origins: старый launcher с одним5188 не сохраняет новый CORS. При смене frontend hostname обновить whitelist и повторить Auth/CORS-проверку. Не отключать JWT и не использовать `*` ради подключения.

Общая БД только read-only подтверждена0005_livestock_market. Миграций, seed, очистки, настройки Storage или открытия PostgreSQL не было. В этот этап денежных/клиентских/AI записей не создавалось.

## Фактические проверки

**Настоящие HTTP и браузерные зависимости, с ПК капитана:**

- Внешние frontend/login и APIhealth —200; OpenAPI0.6.1; без JWT `/me` —401.
- CORS preflight по внешнему API с новым origin и прежним5188 —200; Authorization, Content-Type, Idempotency-Key разрешены. Чужойorigin отклонён400 без allow-origin.
- Настоящий Chromium, HTTPS frontend, mobile viewport390×844: Supabase loginA/B→/me6/3, analytics, direct SPA deep link/reload с сохранённой сессией, logout, закрытыймаршрут послеlogout, отсутствие точекA уB и foreignAnalytics404.
- Браузерные GET идут прямо на внешний HTTPS API, allow-origin соответствует frontend. **0localhost requests,0изменяющих API requests**, Demo fallback не включался.
- Типы и production build с публичнымenv прошли; Auth chunk непустой. Прежнее предупреждение большого3Dchunk остаётся. HTML/JS используют внешнийAPI, секретов вdist не обнаружено.

**Синтетический browser media smoke, отдельно от физического микрофона:**

- `window.isSecureContext=true`, доступны `getUserMedia` и `MediaRecorder`, поддерживается хотя бы один используемый audio MIME; кнопка «Записать голос» доступна.
- Нативный Chromium MediaRecorder с fake audio device: UI Record→Stop, один непустойclip12966байт, tracks ended, filename появился. Аудио оставалось в памяти тестового браузера, не загружалось вFastAPI/Gemini и не сохранялось на диск.
- Начальные попытки с fake-device и context permissions без fake-UI получили `NotSupportedError` Windows Chromium. Добавлен только запускной `--use-fake-ui-for-media-stream`, как описано в подготовкеPR20; итоговый прогонPASS. Код AudioInput не менялся. Это не доказательство поведения физического permission prompt.
- Playback отсутствует (`audio` element0), cancel не реализован; успешный start/stop не закрывает MIC-01…MIC-07 изPR20. Полный suitePR20 не запускался/не объединялся,30секунд/autostop/ошибки устройства здесь заново не проверялись.

**Не проверено:** физический Android/iOS, реальный микрофон/пользовательское разрешение, качество записи RU/KZ/шум, живой Gemini voice roundtrip, внешний Flutter device и длительная стабильность туннелей. Нет HAR/trace/screenshots/сохранённых auth sessions с реальными данными. Прежние ledger/Analytics результаты PR18 не пересчитываются как новые тесты.

## Передача физической проверки

1. На телефоне открыть внешний frontend URL выше в обычном Chrome/Safari. Не использовать localhost8018/5191/5192 илиHTTP LAN для этой проверки.
2. Получить учебный аккаунт у капитана через закрытый канал, войти, выбрать свою учебную точку из `/me`. Серверные ключи/пароль БД телефону не нужны.
3. Перейти `/seller/sale`, нажать «Записать голос», выдать разрешение микрофона, произнести короткую учебную фразу, нажать «Остановить». Зафиксировать браузер/ОС, результат permission/start/stop, появление имени файла и прекращение системного индикатора захвата.
4. В этой версии прослушивание/cancel не ожидаются. Пока запись идёт, сначала Stop, затем другие действия: известные lifecycle gaps ещё открыты. При отказе разрешения проверить доступность текста/файла/ручного ввода.
5. «Подготовить черновик» — отдельная отправка аудио вAI; денежная запись — отдельное подтверждение продавца. Здесь ни upload, ни подтверждение не выполнялись. Если физический tester проверяет полный цикл, использовать только помеченные учебные данные и отдельно сообщить результат/ошибку429.

При недоступности адреса сначала обратиться к капитану за актуальным URL, не менять неизвестные pending-запросы на новые ключи. Оба туннеля оставлены работать; платные услуги, постоянный deploy, merge и изменения main/веток друзей не выполнялись.
