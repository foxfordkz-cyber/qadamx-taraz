# Seller web — Mobile Microphone Acceptance Preparation

2026-10-16. Ветка `test/mobile-microphone-acceptance`, отдельный worktree `work/qadam-microphone-acceptance`, base `integration/local-combined-check:58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76`. Fetch/prune, HEAD и связанные Draft PR проверены. Новые HTTPS/Analytics ветки изучены без merge; voice/ledger source в них совпадает с базой.

Этап 1: [анализ, owner scope, HTTPS/device evidence и acceptance matrix](../MOBILE_MICROPHONE_ACCEPTANCE.md). SDK adb перечислил 0 устройств/эмуляторов; HTTPS API read-only health200/OpenAPI0.6.1, HTTPS frontend preview не предоставлен. **Физический Android Blocked.** Production voice/ledger/AI, Backend/контракт, деньги и PR #19 не меняются. Владелец voice — участник №4, автор PR #7 `sarsenbaevaaidana07`; в [Draft PR #20](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/20) запрошены согласование scope и GitHub review. Явного подтверждения source-изменений ещё нет.

Этап 2: три новых `src/test/microphone-*` файла, commit `86c98813dfbb9bb7b128b205cc00bafc218194fa`, push и remote/local совпали. Targeted: 22 обычных passed + 5 expected failures; strict diagnostic exit 1 с пятью воспроизведёнными дефектами. Полный unit/component: 164 обычных + 5 expected failures (Vitest summary169, 14 файлов). Typecheck/lint/build/check:api/format:check — PASS. Seller/integration E2E 13/13 и existing QA21/21 passed (8 пересекаются). Прежние screenshot-writer suites не запускались. Все команды/границы в отчёте. Анализ — commit `513c527d891f64d78bc4c22c8dfb15cd65d4c7eb`.

Этап 3 завершён: новые `e2e/microphone.acceptance.ts` и `microphone.playwright.config.ts`, actual-CDP fake-device guard, отдельные synthetic capture/deny проекты. **11 passed +2 явно skipped UI gaps**, native 30s/Stop/MIME/multipart и synthetic NotAllowedError. Opt-in strict playback/cancel: exit1,2 реальных отказа из-за отсутствующих controls. Это не прошедшая Android acceptance; реальные prompts/устройство/HTTPS frontend/живой audio-AI не проверены. Никаких saved audio/trace/video; только metadata в игнорируемом test-results/task outputs. После финальных fixture-правок повторены typecheck/lint/format:check. Production/старые tests/контракты/деньги сохранены.

Следом: review участника №4 и отдельное согласование production fixes; затем физическое устройство + HTTPS preview для Android matrix. Точный HEAD — `git log -1 --format=%H`. Новому Codex продолжать только эту ветку, перечитать owner review и отчёт; не переносить успех desktop automation на Android. Ниже сохранена историческая передача дизайна.

Публикация: проверенный browser/tests snapshot `e976bf7465055ae604291c91b3b380e8b3b0b635`, успешный push, local/remote совпали; fetch/prune, pull FF — Already up to date. [PR #20](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/20) open Draft, без конфликтов с base при повторной проверке. Итог — 7 путей: 3 новых `src/test/microphone-*`, 2 новых `e2e/microphone.*`, отчёт и этот handoff. Следующий docs-only commit сохраняет эту передачу без изменения проверенных tests.

Поздний fetch обнаружил `feature/aidana-ai-assistant:b91a9c6db1eceec8e155ecd628f22e700db9b195`: полезные recorder guards и cancel/playback/countdown уже есть, но в старом корневом каркасе от `ced32e7`, не в `apps/web`. Автоматически не объединять; согласовать адаптацию только нужных UI/recorder частей с участником №4. Наши tests эту отдельную реализацию не проверяли. Base `58d4eb4` и PR #19 не изменились.

Для продолжения: в этом worktree `git fetch origin --prune`, проверить ветку/status, `git pull --ff-only origin test/mobile-microphone-acceptance`; при divergence остановиться. Из `apps/web` — точные команды обычных и strict tests в отчёте. Сначала перечитать owner review/обновления базы. Ниже история предыдущего дизайна, не текущие voice results.

# Seller web — передача интегрированного дизайна

2026-10-16. Рабочая ветка **feature/seller-design-integration**, отдельный worktree `../qadam-seller-design`. Base — `origin/integration/team-mvp`, точный исходный HEAD **3d009dc86c93debcab05dedda530b7d1fe62a304** (Draft PR #8). Источник готового дизайна — **a77f1a02b240dbf9e8c627937a5cb6445d92fb51**. Старую feature/seller-dashboard, ветку QA test/seller-regression и чужие PR не изменять.

## Что сделано

Ограниченным diff перенесены Manrope с локальным fallback для казахских букв, Qadam tokens/brand, зелёная палитра, карточки, кнопки, формы, dashboard и мобильное меню. До переноса проверено: затронутые production-файлы не менялись между общей seller-основой b3d0328 и интеграцией 3d009dc. Пакеты, контракты и финансовые модули старой seller-ветки не переносились.

Мобильное меню закрывается после перехода, Escape и browser Back/Forward, возвращает фокус. Поиск клиентов/заявок и локальные фильтры каталога, RU/KZ, CustomerPicker сохранены. В финансовом Demo нет записи и вымышленных итогов: для долгов/истории/summary показано явное пояснение отсутствия серверных данных. До 1100 px финансовые формы располагаются в одну колонку, серверные KPI — в две; на desktop сохраняются две/четыре колонки.

Публичная витрина получает согласованную палитру и Manrope через CSS aliases `.ex`, без изменения её файлов. В `apps/web/.gitattributes` зафиксированы LF для JS/MJS/HTML: исправлена исходная Windows-проблема format:check при core.autocrlf=true.

## Что сохранено из Team MVP

Без изменений: apps/api, OpenAPI 0.4.0 и generated.ts, API/bindings/gateway, auth/runtime/providers/router/modules.ts, queries, features/voice/ledger/summary/explore/inquiry, 3D assets, package/lock. Продажа, погашение, голос/ручной ввод, подтверждение, точное тело и Idempotency-Key при повторе, beforeunload money-pending guard, серверные балансы и итоги остаются кодом интеграции. Summary находится также на экране Sale; Dashboard не получает вымышленных KPI.

Работают все интегрированные маршруты: /login; /seller; /seller/{customers,inquiries,catalog,sale,debts,history,summary}; /; /venues/:slug; /shops/:slug. Live API требует окружения капитана; Demo не заменяет живой сервер. GET/PATCH заявок и каталог через public shop уже есть в 0.4.0 — старые утверждения об отсутствии этих API больше не актуальны.

## Проверки и ограничения

Из apps/web: npm ci; npm run check:api; npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e; npm run format:check. Фактические итоговые результаты фиксируются в [основном handoff](../SELLER_FRONTEND_HANDOFF.md) после завершения прогона. Чужие результаты backend/live не выдаются за собственные.

Новые настоящие screenshots запущенного приложения: [team-mvp-design](../screenshots/team-mvp-design). Seller screenshots — явно read-only Demo, публичные — явно обозначенные API test fixtures. Финансовые операции не имитировались как успешные.

Собственный live acceptance **Blocked**: на 127.0.0.1:8000 connection refused, в новой рабочей копии нет apps/api/.env, apps/web/.env.local и паролей тестовых владельцев. Публичные настройки восстановить из защищённо переданного окружения; секреты/JWT не записывать в документы/Git. Общую БД не мигрировать и не очищать. Физический Android недоступен, выполнена только Chromium browser emulation.

npm audit сообщает 3 унаследованных dev findings в Vitest/@vitest/mocker/Tinypool (1 moderate, 2 critical); audit --omit=dev — 0. Обновление тестового стека требует отдельной задачи; package/lock сохранены. Build сохраняет предупреждение о большом 3D chunk и пустом auth chunk при отсутствии публичной auth-конфигурации. Это не ошибки сборки.

## Продолжение и Git

Не делать merge в main или integration/team-mvp, не использовать force. Новый Draft PR должен иметь base integration/team-mvp, head feature/seller-design-integration, название `feat(seller): integrate merchant redesign into team MVP`. Итоговый commit/push/PR записаны в основном handoff; текущий точный HEAD — `git log -1 --format=%H`.

Следующий шаг: review нового Draft PR капитаном, затем собственная live-приёмка Supabase login, /me, разрешённые точки, customers/create/reload/logout/cache и финансовых/публичных сценариев на согласованных учебных данных. Физический Android и настоящий микрофон проверить отдельно. QA-ветку и PR второго Codex не объединять автоматически.

Полный состав файлов, команды и статус: [SELLER_FRONTEND_HANDOFF](../SELLER_FRONTEND_HANDOFF.md). Визуальные решения: [SELLER_DESIGN_NOTES](../SELLER_DESIGN_NOTES.md). История старых seller-этапов сохранена в Git (b3d0328 / a77f1a0), текущая база — Team MVP.

## Проверено в новой design integration ветке

Финальный прогон: npm ci, check:api, typecheck, lint, build, format:check — passed; **84 unit/component (8 файлов), 14 Chromium E2E**. Ширины360/390/768/1440, 20 новых PNG. История тестового WebGL stub/Windows LF исправлена без изменения production API/финансовых функций. Финальные Git refs/PR и подробные ограничения — в основном handoff. Это новые собственные результаты; live-результаты капитана не включены в эти числа.

## Опубликовано

Проверенный code commit **3faa4b23e6c973836ba1099e7695546ec427eb65**, push успешен и local/remote hash совпал; fetch/pull --ff-only своей ветки — Already up to date. Base повторно проверен:3d009dc86c93debcab05dedda530b7d1fe62a304. Новый **open Draft PR #11**: https://github.com/foxfordkz-cyber/qadamx-taraz/pull/11, base integration/team-mvp. Эта запись отдельным docs commit дополняет проверенный код; актуальный итоговый HEAD — git log -1 --format=%H. Новому Codex продолжать только feature/seller-design-integration. Merge не выполнялся.
