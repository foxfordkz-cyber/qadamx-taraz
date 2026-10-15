# Передача работы seller-web

Обновлено: 2026-10-15. Ветка `feature/seller-dashboard`. Независимая frontend-часть готова к review; backend/Supabase и модули участников 2/4 ожидаются. Не слито в main, публичного деплоя нет.

Полная передача с архитектурой, API, известными ограничениями, этапами и командами: [SELLER_FRONTEND_HANDOFF.md](../SELLER_FRONTEND_HANDOFF.md).

Интерфейсы для коллег: [SELLER_FRONTEND_INTEGRATION.md](../SELLER_FRONTEND_INTEGRATION.md). `apps/web/src/app/modules.ts` подключает переданные страницы. Общие exports: shared/ui, shared/i18n, app/runtime, features/seller. Деньги — целые тиыны.

Реализовано: единое приложение, router/layout, RU/KZ, UI-kit, auth provider и транспорт, заявки/клиенты/каталог, CustomerPicker и хуки. Demo Mode только для чтения с явным banner; реальные writes пока отключены до подтверждения schemas.

Проверено: build/typecheck/lint; 36 unit/component tests; 5 Chromium E2E; ширины 360/768/1440, диалог/фокус, demo traffic/logout. Скриншоты в docs/screenshots. Живая авторизация, БД и финансовые сценарии не проверены.

Следующий шаг: получить OpenAPI/URL/CORS и публичную конфигурацию Supabase, заполнить response bindings по реальным ответам, затем интегрировать переданные модули. Backend и чужие модули не менялись. Работать только в feature-ветке, не force push, не merge в main.
