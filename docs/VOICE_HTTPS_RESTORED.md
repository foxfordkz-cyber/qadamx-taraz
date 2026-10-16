# Восстановленная общая среда: voice PR #23 и API 0.6.1

Проверено 2026-10-16, 18:40 Asia/Qyzylorda. Ветка `integration/voice-preview-061`; исходник production-сборки **7f511ddc8f3dc0a6fc1550566b9ead9abbfb98ce**. Последующий commit документации не изменяет эту сборку.

## Подключение команды

| Назначение | Проверенный адрес / commit |
|---|---|
| HTTPS frontend, вход | [https://negotiations-exist-newman-ohio.trycloudflare.com/login](https://negotiations-exist-newman-ohio.trycloudflare.com/login) |
| Запись / прослушивание / отмена | [https://negotiations-exist-newman-ohio.trycloudflare.com/seller/sale](https://negotiations-exist-newman-ohio.trycloudflare.com/seller/sale) |
| Аналитика | [https://negotiations-exist-newman-ohio.trycloudflare.com/seller/analytics](https://negotiations-exist-newman-ohio.trycloudflare.com/seller/analytics) |
| API_BASE_URL для Flutter | `https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1` |
| Health | [https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1/health](https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1/health) |
| OpenAPI 0.6.1 | [https://thorough-readings-riverside-suggesting.trycloudflare.com/openapi.json](https://thorough-readings-riverside-suggesting.trycloudflare.com/openapi.json) |
| Swagger | [https://thorough-readings-riverside-suggesting.trycloudflare.com/docs](https://thorough-readings-riverside-suggesting.trycloudflare.com/docs) |
| FastAPI: проверенный код | `4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5` |
| FastAPI: запущенный checkout | `ca51bbf9bcf1a5e5379b7b8ced147e4114e01434` (после кода — только README) |
| Frontend: исходник сборки | `7f511ddc8f3dc0a6fc1550566b9ead9abbfb98ce` |
| Локальный просмотр капитана | http://127.0.0.1:5191 — та же production-сборка |

Оба HTTPS-адреса **новые**: прежние kelkoo-student-skiing-universal и crucial-funky-marion-barcelona остановлены. В логах оба старых cloudflared завершились по сигналу около18:04, а API/preview не слушали порты. Причина отправки сигнала по этим логам не установлена. Перед восстановлением проверены процессы и занятость портов, чужие процессы не останавливались.

Quick Tunnels бесплатные и временные: нужны включённый ПК капитана, его доступ к сети, FastAPI, preview и оба cloudflared. Фиксированного срока и SLA нет; выключение/сон ПК прекращает доступ. После повторного запуска туннеля адрес может измениться. Не использовать как постоянный production URL. Доступ проверен через внешний HTTPS с ПК капитана; телефон и сеть Flutter-разработчика должны пройти отдельную проверку.

Flutter меняет только публичный конфиг, сохраняя суффикс `/api/v1`:

```json
{
  "API_BASE_URL": "https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1",
  "SUPABASE_URL": "https://pdjjdqgoitnkpgkbqjtp.supabase.co",
  "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_w17k2VDn1gf_Jr8hoXhGeQ_-T9NRnfz"
}
```

Для web используются VITE_API_BASE_URL, VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY с теми же публичными значениями. Телефон не обращается к localhost. Учебные аккаунты выдаёт капитан через закрытый канал; паролей/JWT/server keys в инструкции нет. Если до смены URL оставался неизвестный результат записи, сначала восстановить его прежним ключом и телом; новый hostname не разрешает новую денежную попытку с новым ключом.

## Состав и сохранённые ограничения

Remote main на момент проверки — **13248851fd2b2a502aff211a506f71e85c2b0ab1**. Создана отдельная ветка, обычный merge точного head PR #23 **a1e5252478eec61d85607b41557ff584b52cfe17**: родители merge — main1324885 и a1e5252. Последний commit включает финальные accessible label/error markup исправления. Полные проверки ниже выполнены **после них**, на merge7f511dd.

Сохранены единые router, Auth, выбор business, общий API-клиент, Analytics, API0.6.1, market/minimum и денежные правила. `apps/api`, `packages/contracts`, app/shared не изменились относительно main. Старого корневого backend/frontend нет. Более новые экспериментальные ветки mobile/visual/voice автоматически не переносились.

Supabase проверена **read-only**: `0005_livestock_market`, таблицы `customer_creation_requests` нет. PR #22/e441401 остаётся отдельным Draft, rollout0006 не выполнен. API восстановлен из подтверждённого checkout, не из customer recovery. Никаких миграций, seed, очистки БД, новых клиентов/операций/объявлений или настроек Storage в этом восстановлении нет. JWT и private Storage сохранены.

## Результаты проверок

- Полный `npm test -- --no-file-parallelism`: **242/242**, отдельный `vitest run --config vitest.microphone.config.ts`: **35/35** (частично пересекается с полным набором).
- `typecheck`, `lint`, `check:api`, `build`, `format:check`: PASS. Прежнее предупреждение большого3D chunk остаётся. Проверочный build без env имеет пустой auth chunk; отдельная публикуемая production-сборка с публичным env содержит работающий Auth.
- `playwright test --config e2e/microphone.playwright.config.ts`: **18/18**. Настоящий Chromium MediaRecorder/playback с fake device, синтетические Auth/API: запись/остановка/autostop, permission denial, MIME, multipart только после Prepare, playback/pause/delete/cancel, RU/KZ, cleanup,360/390/768/1440px. Это не физический микрофон.
- `playwright test --config e2e/analytics.playwright.config.ts`: **24/24**, QA config: **21/21** (наборы пересекаются). Demo/mock HTTP, изолированные порты4181/4175, не общая Supabase. Сгенерированные Demo PNG сохранены только локально; версия изображений в Git восстановлена после теста, новые артефакты не включены.
- **Живые браузерные зависимости:** production HTTPS frontend на390px → настоящий Supabase login A/B → `/me` с6/3 своими точками → Analytics → deep link → logout/guard; чужая Analytics404. CORS возвращает точный frontend origin. Все API-запросы браузера идут на внешний HTTPS, **0localhost requests,0изменяющих API requests**, без Demo fallback. Credentials/trace/HAR/live screenshots не сохранялись.
- **Медиа в production UI, синтетический источник:** secure context true, нативный Record→Stop дал12000байт и ended tracks; UI playback/pause/delete и отдельный Cancel прошли, ручной текст сохранён. Аудио оставалось в памяти Chromium, без отправки Gemini или записи на диск.
- **Настоящий внешний HTTP:** health200, OpenAPI0.6.1, frontend/login200, anonymous `/me`401, разрешённые CORS preflight200 с Authorization/Content-Type/Idempotency-Key, посторонний origin400 без allow-origin. Это проверки с ПК капитана, не внешний телефон.

Backend pytest не повторялся: серверный код не менялся; прежние тесты не объявляются новым прогоном. Живой Gemini, физический микрофон/ОС permissions/качество речи, новый денежный цикл и Flutter device в этом этапе не проверены. Следующий шаг — физическая приёмка телефона по checklist ledger-web в PR #23; учётные данные получить приватно.

## Процессы и безопасное восстановление

API listener9272 / launcher20736 на127.0.0.1:8018, API cloudflared25616. Production preview5192/PID23856, локальный5191/PID28892, frontend cloudflared11412. PID действительны только на момент отчёта: перед любым повторным запуском проверить владельца и listener, не создавать дубли.

CORS runtime: точный `https://negotiations-exist-newman-ohio.trycloudflare.com`, локальные origins127.0.0.1:5188/5191/5192. Wildcard не включён. Серверный env взят из существующего игнорируемого apps/api/.env, не перезаписан. Ревизия проверена до старта. API слушает толькоloopback, PostgreSQL не открыт.

Игнорируемые локальные state/logs: `tmp/voice-restore-state.json`, `tmp/voice-restore-*.log`, `tmp/current-api-pid.txt`, `tmp/api-runtime-overrides.json`; совместимые state-файлы frontend-https-state/qadam-tunnel обновлены, старые сохранены с pre-restore префиксом. Сборка — `tmp/voice-preview-build-7f511dd/dist`. Не публиковать серверный env/логи с неизвестным содержимым. Для повторного восстановления сначала инспекция процессов/логов и ревизии; скрипты запуска намеренно запрещают дубли при существующем state.

Main и ветки друзей не менялись, merge PR и постоянный деплой не выполнялись. Пользовательская ветка main локально не переключалась; использован только read-only remote ref как база.
