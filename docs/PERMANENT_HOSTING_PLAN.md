# Постоянное размещение — предложение, не выполненный деплой

Архитектура: `apps/web` как Vite SPA на Vercel; основной `apps/api` как долгоживущий FastAPI Web Service на Render; существующие Supabase PostgreSQL/Auth/private Storage. Клиенты обращаются **прямо к HTTPS FastAPI**, включая фото/аудио. Серверные ключи только в настройках backend. Тарифы/создание сервисов/деплой требуют отдельного согласования; здесь ничего не создано.

## Vercel: только frontend

Root Directory `apps/web`, preset Vite, install `npm ci`, build `npm run build`, Output `dist`. Сохранять SPA fallback на index.html для router и доступ к статическим GLB/WebP; проверить reload вложенных маршрутов после deploy. [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

Публичные build env: VITE_API_BASE_URL=`https://<backend-host>/api/v1`, VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY. Серверный env запрещён в VITE_ и сборке. API не размещать в Vercel Functions и upload не проводить через функцию-посредник: лимит request/response **4.5MB** меньше наших **8MiB** фото плюс multipart overhead. [Vercel Functions limits](https://vercel.com/docs/functions/limitations). Увеличение лимита в FastAPI не исправляет отказ до него. Прямой upload в Supabase из Flutter также не вводим: он обошёл бы текущую обработку изображений и контракт private Storage.

## Render: основной FastAPI

Предлагаемый Web Service: Root `apps/api`, Python3.12, build `uv sync --locked --no-dev`, start `uv run --no-sync uvicorn app.main:app --host 0.0.0.0 --port $PORT --no-access-log`, health `/api/v1/health`. Render выдаёт HTTPS onrender.com и поддерживает FastAPI; использовать PORT сервиса. Auto-deploy выключить до согласованной последовательности миграций. [Web Services](https://render.com/docs/web-services), [deploy commands](https://render.com/docs/deploys).

Секреты отдельно: DATABASE_URL, STORAGE_SERVICE_KEY, AI_API_KEY; остальные server env по apps/api/.env.example, включая bucket, demo mode, Supabase issuer/audience и модель. ALLOWED_ORIGINS — точный production origin Vercel; preview origins добавлять явно, без wildcard. Выбрать регион возле существующей БД, проверить DNS/TLS и нужный Supabase connection endpoint из Render. Не копировать demo пароли или JWT в настройки сервиса.

Временная файловая система допустима для обработки/спулинга upload: итоговые фото в private Storage, журнал/идемпотентность в PostgreSQL. Не сохранять постоянные файлы внутри контейнера. Free Render засыпает после15 минут отсутствия входящих запросов; cold start несовместим с обещанием постоянно быстрого ответа. Для гарантированного режима потребуется отдельно согласовать подходящий тариф; платный сервис здесь не подключён. [Free limitations](https://render.com/docs/free).

Web Service выбран как кандидат, позволяющий сохранить серверную загрузку и обработку, а не как уже проверенная production-среда. **Точный предел body/timeout выбранного ingress и объём памяти нужно подтвердить и протестировать перед приёмкой**, документация Web Services сама по себе не доказывает прохождение8MiB. Если собственный reverse proxy — body limit не меньше8MiB+64KiB для фото и учесть отдельный лимит audio, таймаут дольше обработки. Декодирование до20Мп требует памяти сверх размера файла, concurrent uploads нужно проверить нагрузочно. Не обещать успех Render на основании успешного текущего Quick Tunnel.

## Порядок будущего подключения

1. После review согласовать commits, зависимости PR и бюджет. Без автоматического merge. Сверить ревизию общей БД: после принятого rollout сейчас **0006_customer_requests**, API **0.6.2 / 4e983b4**; не повторять seed/0006. Backup/restore и permissions перед будущими миграциями. Миграции выполняет один администратор до переключения приложения, не каждый worker. Откат customer recovery — только подготовленный guard, не обычный0.6.1, игнорирующий Idempotency-Key.
2. Настроить backend env и закрыто проверить health/Auth/JWKS/Storage. Прогнать PNG/JPEG около8MiB и превышение→413, audio в текущих пределах, повтор, чужой404 и сохранение журналов после рестарта. Реальные учебные записи не очищать автоматически.
3. Подключить web к прямому backend URL, точный CORS; проверить browser login/reload/logout/ledger/AI и public inquiry. Сверить Supabase URL/redirect-настройки для используемых Auth flows.
4. Передать Flutter стабильный API_BASE_URL, обновить public.local.json и пересобрать. До смены origin разрешить незавершённые операции на старом адресе. Проверить с физического устройства, а не только с сервера.
5. Только после приёмки отключать тестовый туннель. Настроить мониторинг, backup и уборку приватных непривязанных фото отдельной эксплуатационной процедурой.

Сейчас выполнены только подготовка плана и HTTP-проверка временного туннеля. Vercel/Render не подключались, домены не покупались, платные услуги не включались.

## Дополнение: единая проверочная web-сборка

Кандидат **b899902**, [review](UNIFIED_WEB_062_REVIEW.md), ещё не развёрнут. Постоянный хостинг готовится отдельно от переключения preview. Перед переносом Supabase Auth согласовать с автором PR31 точный `/auth/callback`, PKCE и production SiteURL/redirect allowlist; текущая регистрация ещё не имеет принятого callback. Не использовать wildcard для любых preview-доменов. Для подтверждения email проверить реальную доставку, срок/повтор ссылки и другой браузер. Без этого не объявлять регистрацию готовой.

Текущий AI — Gemini/gemini-3.6-flash, fallback off. Выбор OpenAI и его серверные OPENAI_API_KEY/model-настройки — отдельное решение; секреты не копировать в Vercel public env. Перенос customer recovery требует сохранения pending key/body и согласованной смены API origin; исключённый frontend fd21874 сначала должен получить исправление общего coordinator. Стабильный URL не обещается до отдельного деплоя/приёмки.
