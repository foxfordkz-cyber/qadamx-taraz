# Передача работы seller-web

Обновлено: 2026-10-15. Ветка `feature/seller-dashboard`. Независимая frontend-часть готова к review; backend/Supabase и модули участников 2/4 ожидаются. Не слито в main, публичного деплоя нет.

Полная передача с архитектурой, API, известными ограничениями, этапами и командами: [SELLER_FRONTEND_HANDOFF.md](../SELLER_FRONTEND_HANDOFF.md).

Последний commit реализации: `c17efe903aee95385e44dc502b4e40c9d1b05cd3`, push успешен. [Draft PR #3](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/3). Дополнительный commit после реализации фиксирует только документацию PR. Создание через GitHub-плагин вернуло 403; PR успешно создан через существующую аутентификацию Git Credential Manager, без вывода/сохранения credentials.

Интерфейсы для коллег: [SELLER_FRONTEND_INTEGRATION.md](../SELLER_FRONTEND_INTEGRATION.md). `apps/web/src/app/modules.ts` подключает переданные страницы. Общие exports: shared/ui, shared/i18n, app/runtime, features/seller. Деньги — целые тиыны.

Реализовано: единое приложение, router/layout, RU/KZ, UI-kit, auth provider и транспорт, заявки/клиенты/каталог, CustomerPicker и хуки. Demo Mode только для чтения с явным banner; реальные writes пока отключены до подтверждения schemas.

Проверено: build/typecheck/lint; 36 unit/component tests; 5 Chromium E2E; ширины 360/768/1440, диалог/фокус, demo traffic/logout. Скриншоты в docs/screenshots. Живая авторизация, БД и финансовые сценарии не проверены.

Следующий шаг: получить OpenAPI/URL/CORS и публичную конфигурацию Supabase, заполнить response bindings по реальным ответам, затем интегрировать переданные модули. Backend и чужие модули не менялись. Работать только в feature-ветке, не force push, не merge в main.

Продолжение 2026-10-15: feature-ветка синхронизирована; поиск клиентов получил debounce/очистку, заявки — локальный фильтр с учётом загруженных страниц. Typecheck/lint/build, 41 unit/component и 6 Chromium E2E прошли. В main найден backend bootstrap/OpenAPI; согласована интеграция ced32e7 в нашу ветку, следующие шаги и два конфликта документов перечислены в полном handoff. PR #3 остаётся Draft; готовых модулей 2/4 нет.

Main ced32e7 интегрирован по согласию пользователя; два конфликта документации разрешены с сохранением обеих сторон, backend не редактировался. Повторные 41 unit/component + 6 E2E, typecheck/lint/build прошли. Новая backend/ledger-auth (193f6e5, PR #4) анализируется отдельно: merge возможен только после подтверждения капитана согласно последнему уточнению пользователя.
