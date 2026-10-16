# Qadam Business — Seller design integration handoff

Обновлено 2026-10-16. Эта передача относится к **feature/seller-design-integration**, созданной в отдельном worktree от integration/team-mvp, а не к старой seller-dashboard. Последний проверенный исходный HEAD интеграции: **3d009dc86c93debcab05dedda530b7d1fe62a304**. Источник дизайна: **a77f1a02b240dbf9e8c627937a5cb6445d92fb51**. Репозиторий: https://github.com/foxfordkz-cyber/qadamx-taraz.

## Реализовано

- Ограниченный перенос готового дизайна: локальные Manrope/Noto fallback, токены, Qadam logo, typography, focus/contrast, cards/buttons/forms/dialogs, dashboard, customers, inquiries, catalog. Shopify dependencies/Auth/App Bridge не добавлены.
- Мобильная навигация с доступом ко всем разделам, выбором точки и logout; закрытие по выбору, Escape и переходам browser history с возвратом фокуса. Исправлено повторное открытие диалога при Forward.
- Каталог фильтрует уже полученные товары локально по имени/наличию; граница загруженных данных и read-only явно обозначены. Сетевые параметры не придуманы.
- Финансовые формы наследуют общий UI. До 1100 px они одноколоночные; desktop сохраняет 2 формы/4 KPI. В Demo поясняющее пустое состояние вместо фиктивных долгов, нулей и успешных записей.
- Публичные модули получают общую палитру и Manrope через CSS bridge `.ex`; их layout, формы, роуты, 3D/fallback и семантические предупреждения сохранены.
- Воспроизводимый формат на Windows: web/.gitattributes задаёт LF для JS/MJS/HTML, дополняя существующие правила TS/TSX/CSS.

## Архитектура и сохранённые части

Один apps/web React/TypeScript/Vite с существующими Router, Supabase AuthProvider, TanStack Query, runtime/BusinessProvider и CustomerPicker. app/modules.ts подключает реальные Sale/Debts/History/Summary и Explore/Venue/Shop. Эти точки интеграции не заменены старыми файлами. Identity/business scope, cache cleanup и money-pending beforeunload guard сохранены.

Backend, контракты **0.4.0**, generated.ts, bindings/gateway/API client, seller queries, финансовые/голосовые/публичные feature-модули, package/lock и 3D assets не менялись. Деньги считает сервер. Повтор неизвестного результата сохраняет исходные body и Idempotency-Key. AI делает только черновик, запись требует подтверждения продавца. Детерминированные unit-тесты этих правил сохранены.

Маршруты: /login; /seller; /seller/customers; /seller/inquiries; /seller/catalog; /seller/sale; /seller/debts; /seller/history; /seller/summary; /; /venues/:slug; /shops/:slug.

Существующий API (без префикса /api/v1): GET /me; GET/POST /businesses/{id}/customers; GET/POST /businesses/{id}/operations (вид sale/repayment в body); POST /businesses/{id}/operations/{operation_id}/reverse; GET /businesses/{id}/summary; POST /businesses/{id}/drafts; GET /venues, /businesses и /businesses/{slug}; GET/POST /businesses/{id}/inquiries и PATCH /businesses/{id}/inquiries/{inquiry_id}. Точные схемы остаются в packages/contracts/openapi.json. Наличие клиента не доказывает живое выполнение этих запросов в данной сессии.

## Изменённые файлы

Production: apps/web/src/app/{layout,pages}.tsx; src/features/seller/{Catalog,Customers,Inquiries}.tsx; src/main.tsx; src/shared/{tokens.css,styles.css,merchant.css}; src/shared/ui/{Brand,Icon}.tsx; src/shared/i18n/{ru,kk}.ts; public/fonts/\* (font files + OFL + источники); index.html (theme-color); .gitattributes.

Проверки: src/test/screens.test.tsx (три перенесённые UX-проверки); e2e/{helpers,seller,screenshots,integration-design,public-design}.ts/spec.ts; playwright.config.ts (локальный test-only API URL для перехваченных public fixtures). Новые tests не заменяют независимую ветку QA test/seller-regression.

Документация: docs/handoffs/seller-web.md, этот handoff, SELLER_DESIGN_NOTES.md, отдельное описание нового PR, docs/screenshots/team-mvp-design/\*.png. Общие README/PROJECT_STATUS/TEAM_INTEGRATION и чужие handoff сохранены, не заменены устаревшей seller-версией.

## Запуск и проверки

Из корня новой рабочей копии:

```powershell
git branch --show-current
git status --short
git fetch origin integration/team-mvp
# После первой публикации новой feature-ветки:
git fetch origin feature/seller-design-integration
git pull --ff-only origin feature/seller-design-integration
cd apps/web
npm ci
# Для live создать игнорируемый .env.local из .env.example.
# VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY.
npm run dev -- --port 5173 --strictPort
```

Открыть http://127.0.0.1:5173/login. Demo включается явно и живёт только в памяти. Ошибка live не переводит в Demo. Для API после безопасного получения серверного env: из apps/api `uv sync --locked`, затем `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`. Полные инструкции капитана — TEAM_INTEGRATION.md. Не запускать seed/migrations/очищающие тесты на общей Supabase.

Из apps/web:

```powershell
npm run check:api
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Для дополнительной копии screenshots при E2E задать QADAM_SCREENSHOT_OUTPUT абсолютным путём. Стандартные PNG сохраняются в docs/screenshots/team-mvp-design. Playwright стартует порт 4173 с локальным API URL только для перехвата fixtures; Supabase keys для E2E не требуются. Public test перехватывает API, запрещает все writes/неизвестные запросы и не выдаёт mock receipt за сохранение. Реальный сервер не нужен этим тестам.

Итоговые результаты и публикация добавляются после финального прогона ниже. Не переносить сюда результаты капитана или старой ветки как собственные.

## Live, Demo и обнаруженные ограничения

Собственные live login, /me, customers/create/reload, JWT/CORS, session restore и A/B isolation **Blocked**: HTTP health 127.0.0.1:8000 отказал в соединении. В новом worktree нет серверного .env, публичного .env.local и тестовых паролей. Публичную конфигурацию восстановить локально безопасным способом, серверные секреты запросить через защищённый канал. Ничего из .env/JWT/DB credentials в Git не включено.

Seller screenshots показывают реальный UI с явным Demo banner и read-only fixtures. Финансовые записи/AI/итоги в Demo отключены; debts/history/summary не имеют подставных серверных сумм. Public screenshots помечены как API test fixtures; реальные public API/3D GLB с сервером этим прогоном не подтверждены. Физического Android нет: только Chromium browser emulation 360/390/768/1440, микрофон и реальные touch/устройство требуют отдельной проверки.

npm ci завершился; npm audit сообщил 3 унаследованных dev findings: Vitest/@vitest/mocker/Tinypool (1 moderate, 2 critical); npm audit --omit=dev — 0. Lock/dependencies не изменены, обновление dev стека отдельной задачей. Build предупреждает о большом 3D chunk и пустом auth chunk без локальной Supabase-конфигурации; сборка завершается. Контракты проходят check:api без изменений.

Первый format:check выявил CRLF в JS/MJS/HTML при core.autocrlf=true. Добавлены scoped LF rules; повторный прогон подтверждает результат. Незавершённую работу и финальный Git статус см. ниже.

## Следующий шаг

Review нового Draft PR в integration/team-mvp, затем собственная live-приёмка в доступной среде капитана. Проверить разрешённые точки, create/reload/logout/cache, ручной/голосовой сценарий с подтверждением, погашение/историю/итог и public inquiry→seller; реальные микрофон/Android отдельно. Не менять backend ради дизайна. Не сливать main, integration/team-mvp или независимый QA PR автоматически.

Перед продолжением другим аккаунтом: AGENTS → TEAM_INTEGRATION → этот handoff → git branch/status → адресный fetch и pull --ff-only собственной ветки. Первый полный fetch завис на скачивании большой посторонней истории и был безопасно прерван; адресный fetch integration/team-mvp завершился. Не использовать reset/force.

## Финальные проверки интегрированной ветки — 2026-10-16

Все команды из apps/web выполнены заново в этой рабочей копии:

| Проверка             | Результат                                         |
| -------------------- | ------------------------------------------------- |
| npm ci               | 357 packages installed, lock без изменений        |
| npm run check:api    | Passed, OpenAPI 0.4.0/generated.ts без изменений  |
| npm run typecheck    | Passed                                            |
| npm run lint         | Passed, max-warnings 0                            |
| npm test             | 84 passed, 8 файлов                               |
| npm run build        | Passed, 734 modules; 3D chunk warning описан выше |
| npm run test:e2e     | 14 passed, Chromium, 1 worker, без retries        |
| npm run format:check | Passed после LF fix                               |
| git diff --check     | Passed                                            |

Сохранены unit-проверки auth/cache boundaries, API validation, exact body/key retries и AI timeout/invalid JSON. Browser: все seller routes на 360/390/768/1440 без horizontal overflow, финансовый Demo disabled/no traffic, RU/KZ, CustomerPicker/customer forms, menu Escape/route/Back/Forward/focus, fonts, skip-link, touch targets. Публичные маршруты и WebGL fallback проверены на OpenAPI typed fixtures, полностью перехваченных в браузере; writes и неожиданные запросы отсутствуют. Это не live запросы. Первый промежуточный public test исправлен: stub должен отключать только WebGL, сохраняя 2D canvas; финальный полный прогон прошёл.

20 новых PNG в docs/screenshots/team-mvp-design: desktop1440/mobile390 для dashboard, customers, sale, debts, history, summary, inquiries, catalog; public home/shop имеют api-stub в имени и тексте. Репрезентативные desktop/mobile кадры визуально просмотрены. Старые снимки не обновлялись и не выдавались за новые.

Функциональный код завершён и проверен. Незавершённых frontend-изменений нет; live acceptance, физический Android/микрофон, настоящая GLB-сцена/hotspots с API и обновление dev audit findings остаются отдельными задачами. Публикация подтверждается отдельной записью ниже после успешного push.

## Публикация и точка продолжения

Проверенный UI/code commit: **3faa4b23e6c973836ba1099e7695546ec427eb65**. Ветка **feature/seller-design-integration**, upstream **origin/feature/seller-design-integration**. `git push -u origin feature/seller-design-integration` завершился успешно, remote HEAD совпал. Последующие `git fetch origin integration/team-mvp feature/seller-design-integration` и `git pull --ff-only origin feature/seller-design-integration` прошли: **Already up to date**. Base по повторной проверке остаётся **3d009dc86c93debcab05dedda530b7d1fe62a304**; дополнительная интеграция не потребовалась.

Создан отдельный **open Draft PR #11**: https://github.com/foxfordkz-cyber/qadamx-taraz/pull/11, base integration/team-mvp, head feature/seller-design-integration, title `feat(seller): integrate merchant redesign into team MVP`. Он содержит проверки, ограничения и ссылки на все20PNG. Старые PR #3/#8, main, integration/team-mvp и QA-ветка не менялись; merge/force push не выполнялись.

Эта финальная запись сохраняется отдельным docs commit поверх указанного проверенного code commit. Точный текущий (включая metadata) HEAD всегда получать `git log -1 --format=%H`; `git log -2 --oneline` показывает обе точки. После получения новым аккаунтом повторить branch/status/fetch/pull --ff-only только своей ветки. Незавершённых локальных изменений к передаче не планируется; push документации и совпадение refs проверяются перед финальным отчётом.
