# Общая база main / deploy — 2026-10-17

Поручение капитана: проверить опубликованные изменения и совместить готовую версию в main и deploy. Работа выполнена в отдельном checkout `outputs/main-release-20261017`, ветка `integration/main-release-20261017`. Рабочие копии и ветки участников не менялись.

## Состав

- Основа: PR39 `8be10b3`, потомок production Vercel `a8e358f` и диагностики `e699158`.
- Web: принятые дизайн A–D, голос/уточнения, аналитика, три новые модели PR36.
- Backend: API 0.6.2, recovery, OpenAI-адаптер и диагностика; `git diff e699158 -- apps/api` пуст.
- Flutter: merge PR25 `421b2fb`, включая PR15. Добавляет только `apps/mobile` и `docs/handoffs/mobile.md`; конфликтов нет. Не создаёт новый APK и не добавляет нативную CRM: кабинет открывается системным браузером.
- Recovery UI `9a3c868` не включён: [воспроизведённый дефект](MODELS_PRODUCTION_ACCEPTANCE.md). Новый исправленный remote head не обнаружен на момент проверки.
- Регистрация PR31 `10d9bba` не включена: callback/email-приёмка не завершены. Ранние исправления входа сохранены.
- Новые задачи оформления магазина и заявки пока не опубликованы отдельными PR; их наличие не заявляется.

## Проверки

- Web: 265 unit/component PASS, typecheck, lint, check:api, build PASS.
- Runtime `apps/web/src`, `apps/web/public` и `packages/contracts` совпадают с production `a8e358f`; меняются документация, тестовая конфигурация и добавляется mobile.
- Chromium: 24 E2E PASS (45.8 s), Auth/API — заглушки. Для воспроизводимости в основном Playwright-конфиге явно заданы синтетические Supabase URL/key. Первый запуск не имел Chromium нужной версии; после установки обнаружены два отсутствующих тестовых env. Финальный прогон с конфигурацией завершился exit 0. Production Auth-конфигурация не менялась.
- Backend не менялся: полный PostgreSQL-набор повторно не запускался. Ни общей БД, ни миграций, ни платных AI-вызовов в этой интеграции нет.
- Flutter: локальный SDK 3.41.2/Dart 3.11.0; автор использовал 3.47.7/Dart 3.13.5. `flutter pub get --enforce-lockfile` отказался менять 21 зависимость. Lock-файл сохранён. Локальный analyzer/test/APK не объявляются успешными; авторские результаты не считаются повторной приёмкой.
- Физический телефон, микрофон и конкретная recording.webm не проверены.
- Публичные HTTPS проверки перед публикацией: Vercel /login 200, Render health 200, OpenAPI 0.6.2, точный CORS 200. Новый живой login A/B не выполнялся; его предыдущая приёмка описана в MODELS_PRODUCTION_ACCEPTANCE. E2E-скриншоты, перезаписанные текущим запуском, возвращены к исходной галерее.

## Адреса и выпуск

- Frontend: https://qadamx-taraz.vercel.app — Vercel отслеживает `deploy-062`.
- Backend: https://qadamx-taraz.onrender.com/api/v1 — Render auto-deploy выключен, процесс e699158 ранее подтверждён капитаном. Совпадение исходников не является новым независимым подтверждением SHA процесса.
- План: обычный fast-forward main, deploy-062 и deploy/permanent-062 на общий принятый commit. Force push не используется. Vercel push запускает сборку; Render перезапуск не требуется, его код уже совпадает.
- Откат Vercel: предыдущая production-сборка a8e358f. Не откатывать БД и серверную конфигурацию ради frontend.

## Команде

Сохраните свои изменения, затем выполните `git fetch origin` и `git merge origin/main` в своей feature-ветке. Не используйте reset/force push. Перечитайте AGENTS, PROJECT_STATUS и handoff. Старые PR с cherry-picked изменениями не сливайте повторно целиком.

Flutter-разработчику: собирать с `API_BASE_URL=https://qadamx-taraz.onrender.com/api/v1`, `FRONTEND_BASE_URL=https://qadamx-taraz.vercel.app`, прежним Supabase URL и публичным publishable key. Секреты OpenAI/Render/Storage и пароли в APK не включать. Новые адреса не меняют уже установленный APK автоматически. Публичный шаблон: `apps/mobile/config/public.example.json`; заполнение ключа и сборка остаются отдельным шагом.
