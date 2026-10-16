# Seller web — передача интегрированного дизайна

## 2026-10-16: Voice Playback / Cancel — tests и review для участника №4

Капитан согласовал распределение: **адаптацию AudioInput выполняет участник №4; Codex готовит tests/review**. Владелец уведомлён [в PR #20](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/20#issuecomment-6215571848). Повторное согласование исполнителя не требуется. Production voice-файлы этой веткой не редактируются; ожидается точный commit адаптации в едином apps/web.

Ветка `feature/voice-playback-cancel`, отдельный worktree `work/qadam-voice-playback-cancel`, base `integration/local-combined-check:58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76`.
[Draft PR #21](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/21) → combined; никакого merge.
Источник сравнения владельца — `feature/aidana-ai-assistant:880d7137f39648f0bbce355369ee3e755d981f02`, старый root src/backend, не patch для apps/web. Не объединять автоматически.
Аудит/publish commits `03226ff6f59a6eeae2338c8e5d000657b5400a82` и `652a7d4d8a77286356a210afea4dc78a8ee6d316` уже отправлены; текущий tests/review HEAD см. `git log -1 --format=%H` и описание PR.

Переданы 5 выбранных test/helper/config файлов из #20, 8 новых lifecycle acceptance cases и отдельный строгий Vitest config. Browser playback/cancel теперь обычные тесты без skip; добавлены Play/Pause/replay, Delete/URL cleanup/сохранение текста, RU/KZ и 360/390/768/1440, double Prepare. Полный список 7 тестовых файлов, review и результаты — [VOICE_PLAYBACK_CANCEL](../VOICE_PLAYBACK_CANCEL.md). Два изменённых документа: этот handoff и отчёт. Production, Backend/OpenAPI/generated.ts, финансовая логика, package/lock, PR #19 сохранены.

Из `apps/web`: `npm.cmd ci`, `npm.cmd run check:api`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run format:check` — PASS.
Полный default `npm.cmd test -- --no-file-parallelism`: **164 обычных passed + 5 inherited expected failures** (Vitest показывает169, это не169 исправленных требований).
Строгая команда `npx.cmd vitest run --config vitest.microphone.config.ts`: **22 passed / 13 failed**, exit1 — реальные assertions, не ошибка окружения.
`npx.cmd playwright test --config e2e/microphone.playwright.config.ts`: **12 passed / 6 failed / 0 skipped**, exit1. Failing UI cases: отсутствие preview и Cancel; дальнейшие assertions после отсутствующего UI ещё не подтверждены.
Существующий scoped baseline `CI=1 npm run test:e2e -- seller.spec.ts integration-design.spec.ts`: **13/13**. В PowerShell временно установить CI и восстановить прежнее значение. Полный default/QA browser suite не заявляется пройденным.

Review: Stop→analyse из root Sale нельзя переносить в новый scope; для cleanup playback требуется явная проверка paused+revoke; track ended и generation нужно проверить строгими тестами. Подтверждены в combined: поздний onstop перезаписывает новый захват, двойной Stop начинает второй, error→onstop публикует File, pending permission после выбора fallback файла стартует запись. Это не результат тестирования отдельного root приложения владельца.

Physical Android **Blocked**: свежая adb-проверка — 0 устройств. Последний fetch обнаружил HTTPS frontend в PR18 `13248851fd2b2a502aff211a506f71e85c2b0ab1`; собственные read-only проверки login HTML/API health/CORS preflight дали200. HTTPS-блокер снят, ссылки и предел проверки — в отчёте. Живые Auth/AI/audio не проверялись. Browser fake-device генерирует звук, реальный микрофон/голос не использован; audio/trace/video не публикуются. Остались прежние 3 npm audit findings и build empty-auth/large-3D warnings; зависимости не обновлялись.

Следующий шаг: получить точный commit участника №4, fetch/prune, проверить base/HEAD/PR/instructions и ограниченный diff. Запустить строгие тесты на согласованной адаптации; исправленные inherited .fails превратить в обычные it, сохранив assertions. Пока gate красный, playback/cancel не приняты. Не вносить production-исправления самостоятельно, не выполнять merge или force push.

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
