# Flutter: проверенный backend и тестовый HTTPS

Актуально 2026-10-16. Backend commit **cd655e96ec809bb8857666ad1fffa16e56e6d02a**, API **0.6.0**, ветка `integration/local-combined-check`, [Draft PR #13](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/13) → backend/livestock. Последующий commit этой инструкции меняет только документацию. [OpenAPI на проверенном commit](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/cd655e96ec809bb8857666ad1fffa16e56e6d02a/packages/contracts/openapi.json), [валидируемые JSON-примеры](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/cd655e96ec809bb8857666ad1fffa16e56e6d02a/packages/contracts/examples.json), [LIVESTOCK_API](../packages/contracts/LIVESTOCK_API.md). Существующий контракт Мал базара 0.5.0 сохранён.

## Что уже доступно

На ПК капитана работают web `http://127.0.0.1:5188` и FastAPI `http://127.0.0.1:8018/api/v1`. По настоящему HTTP проверены health, public livestock feed, Supabase login и `/me` A/B, «Мои объявления», upload PNG→JPEG без EXIF, повтор с тем же photo ID, private read владельцем и 404 для другого аккаунта. CORS разрешает точный `http://127.0.0.1:5188`. Подключены общая PostgreSQL **0004_livestock** и настоящий private Storage **livestock-photos**. Не повторять миграцию/setup/seed; серверные ключи уже в игнорируемом env. Фото идут только через API.

**Удалённый разработчик пока не имеет проверенного API_BASE_URL.** Ни 127.0.0.1 капитана, ни 10.0.2.2 на компьютере разработчика не ведут к этому серверу. Ниже подготовлен вариант HTTPS; туннель ещё не запущен, адрес-заглушка не является действующим URL. TestClient и localhost HTTP не заменяют проверку с устройства.

## Сервер у капитана

Рабочая копия: `C:\Users\karab\Documents\Codex\2026-10-15\x20\outputs\team-combined-check`. Основной env: `C:\Users\karab\Documents\Codex\2026-10-15\x20\work\qadamx-taraz\apps\api\.env`.

Сначала проверить существующие процессы и health; второй сервер на тот же порт не запускать. При этой передаче API точечно перезапущен с обновлённым env, web сохранён. Для последующего запуска, только когда 8018 свободен:

```powershell
cd C:\Users\karab\Documents\Codex\2026-10-15\x20\outputs\team-combined-check\apps\api
uv sync --locked
$serverEnv = 'C:\Users\karab\Documents\Codex\2026-10-15\x20\work\qadamx-taraz\apps\api\.env'
$env:ALLOWED_ORIGINS = '["http://127.0.0.1:5188"]'
uv run uvicorn app.main:app --env-file $serverEnv --host 127.0.0.1 --port 8018 --no-access-log
```

Проверки: `http://127.0.0.1:8018/api/v1/health`, `/openapi.json` (info.version 0.6.0), `/docs`. Env загружается при старте; не копировать его во Flutter/web. Для своей отдельной среды разработчик следует README API; доступа к общей БД для запуска Flutter не требуется.

## Временный HTTPS для удалённого Android

Предложение: Cloudflare Quick Tunnel только к `http://127.0.0.1:8018`. Не требует аккаунта или домена. Установить официальный Windows `cloudflared` из [Downloads](https://developers.cloudflare.com/tunnel/downloads/), проверить `cloudflared --version`. В согласованное окно приёмки капитан запускает:

```powershell
cloudflared tunnel --url http://127.0.0.1:8018
```

Команда выдаст `https://<случайное-имя>.trycloudflare.com`. **Адрес временный, меняется при новом запуске, отключается при остановке cloudflared. ПК должен быть включён, подключён к сети и не спать; FastAPI и cloudflared должны работать.** У сервиса нет гарантии доступности, лимит 200 одновременных запросов, SSE не поддерживается. Email-gate `--allowed-mail` рассчитан на интерактивный браузер, не на native Flutter HTTP. [Официальные условия Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

JWT-проверка FastAPI остаётся включённой: закрытые маршруты без Bearer должны давать 401, чужие данные 404. Public API остаётся публичным для знающих адрес. Не включать debug/request-body logging. Туннель направлен только на HTTP-порт 8018: не открывать PostgreSQL/55432/5432, не пробрасывать их в router/firewall. Сервер продолжает слушать loopback, env и ключи через API не выдаются. Платный тариф, постоянный домен и деплой не подключаются. Для окончания окна остановить только cloudflared; просмотр web/API локально сохранится.

До передачи адреса проверить с **компьютера/телефона разработчика**: `GET https://<выданный-host>/api/v1/health` → 200, public `/livestock/listings` → 200, `/livestock/me/listings` без JWT → 401; затем обычный Supabase login и `/me`/«Мои объявления» → 200. Загрузить только явно учебное фото, повторить с теми же байтами и Idempotency-Key, прочитать как владелец; другой аккаунт должен получить 404. Не копировать JWT в команды/логи/отчёт. Записать фактический host, время окна и результаты. Пока это **план приёмки**, не выполненные внешние проверки.

## Публичный конфиг Flutter

В опубликованной `feature/mobile-livestock-api:da6a3a0` используются `apps/mobile/config/public.local.json` и команда `--dart-define-from-file`. Последний remote head — **a2c0aab**: после da6a3a0 изменился только mobile handoff с результатами APK; настройки и код клиента не изменились. Ветка не объединялась автоматически. Создайте игнорируемый public.local.json из её example и замените API_BASE_URL на **фактически выданный и проверенный** host:

```json
{
  "API_BASE_URL": "https://<выданный-host>.trycloudflare.com/api/v1",
  "SUPAhttps://github.com/foxfordkz-cyber/qadamx-taraz/blob/cd655e96ec809bb8857666ad1fffa16e56e6d02a_URL": "https://pdjjdqgoitnkpgkbqjtp.supabase.co",
  "SUPAhttps://github.com/foxfordkz-cyber/qadamx-taraz/blob/cd655e96ec809bb8857666ad1fffa16e56e6d02a_PUBLISHABLE_KEY": "sb_publishable_w17k2VDn1gf_Jr8hoXhGeQ_-T9NRnfz"
}
```

Publishable key публичный и не даёт доступ к закрытым данным без пользовательской сессии. `DATAhttps://github.com/foxfordkz-cyber/qadamx-taraz/blob/cd655e96ec809bb8857666ad1fffa16e56e6d02a_URL`, `STORAGE_SERVICE_KEY`, `AI_API_KEY`, service_role, email/password и JWT в этот файл **не входят**. Supabase URL не заменяет FastAPI URL. Смена адреса туннеля — смена API origin: сначала разрешить неизвестный результат старых pending-запросов, не переотправлять их как новые операции на новом адресе.

```powershell
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter run --dart-define-from-file=config/public.local.json
```

Эти команды — инструкция mobile-участнику, здесь Flutter не запускался. Native Android не требует CORS; Flutter Web потребует отдельный точный origin, wildcard не добавлять. Свой учебный аккаунт разработчик получает лично от капитана по закрытому каналу/менеджеру паролей, вводит через форму Supabase login и меняет временный пароль. Не публиковать общий пароль A/B и не передавать готовые access/refresh tokens. Назначать memberships только явно разрешённых учебных точек; для livestock membership вообще не требуется.

LAN/USB альтернативы применимы только при физическом доступе: `adb reverse tcp:8018 tcp:8018` должен исполняться на ПК с API и подключённым телефоном, тогда телефон использует `http://127.0.0.1:8018/api/v1`. `10.0.2.2` относится только к ПК, где работает emulator. Для удалённого коллеги эти адреса не подходят.

## Аналитика для frontend

[Согласованный контракт](../packages/contracts/ANALYTICS_API.md) и [полные синтетические примеры](../packages/contracts/analytics-examples.json) опубликованы сначала в `2089e44`; реализация — cd655e96ec809bb8857666ad1fffa16e56e6d02a. GET `/businesses/{id}/analytics?days=7|30`, только своя точка из `/me`; шесть карточек, дневные и почасовые графики, Asia/Almaty, сегодняшний день неполный. Отмена исключает исходную продажу из её даты, денежное движение отражается в дату отмены. Средний чек HALF_UP, пустой null, долг по всем датам; `/summary` не менялся. Backend считает всё, UI ожидается от frontend.

generated.ts обновлён из OpenAPI: AnalyticsResponse/Cards/Day/Hour и GET analytics, существующие типы сохранены. Frontend добавляет binding в общий API-клиент и query key с user+business+days, сбрасывает выбранные данные при смене владельца/точки, показывает знак поступлений и null среднего чека. Не строить аналитику суммированием summary и не называть часы регистраций посещаемостью.

## Фактические проверки и ограничения

- 235 backend-тестов PASS, отдельная локальная PostgreSQL qadam_test: реальные SQL/миграции/транзакции; JWT/JWKS, Gemini и Storage в этом наборе синтетические. После UTC-нормализации дополнительно 10/10 analytics PASS. Экспорт контрактов и ruff PASS. Есть предупреждение о deprecated TestClient/httpx.
- 142 web unit/component PASS; check:api, TypeScript, lint, build PASS. Build предупреждает о крупном 3D chunk. UI аналитики не добавлялся.
- Настоящий HTTP8018 с Supabase JWT/PG/Storage: перечисленные выше livestock-проверки и аналитика7/30 A/B, графики=карточки, 401/404/422, no-store — PASS. Журнал остался 11 операций; business9/customer13/inquiry2 без изменений. Дополнительное приватное синтетическое непривязанное фото: 835b4921-6594-5570-8a32-f6bc56c29e47; не удалялось.
- Новый браузерный/Flutter/внешний HTTPS и живой Gemini в этом этапе не выполнялись. Предыдущие браузерные/Gemini результаты остаются в COMBINED_ACCEPTANCE и не считаются повторёнными.
- Удалённый HTTPS ещё нужно запустить в согласованное окно и проверить с устройства. Отдельно остаются эксплуатационная уборка непривязанных фото и приёмка mobile-ветки. Main, ветки коллег и базы PR не менялись; merge/deploy не было.
