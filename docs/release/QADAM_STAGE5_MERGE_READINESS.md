# Stage 5 — готовность review и безопасная последовательность merge

Дата проверки: 12.11.2026. Рабочая ветка `ci/qadam-stage5-release-readiness`,
от `review/qadam-stage4-integration:a4b9da868e9f4a7ccbbbd9529834bf1e7885ca19`.
Ни один пункт ниже не является разрешением на merge, deploy или hosted migration.

## Фактический GitHub snapshot

| PR | HEAD | Base | Draft / конфликты | Формальные reviews |
| --- | --- | --- | --- | --- |
| [104](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/104) | `d382e80164fb2ec559db88001ba05d73fc831731` | main | Draft, mergeable | 0 |
| [105](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/105) | `7a5e1b775a5290ba282b78cba708849b3e0dc20a` | fix/qadam-critical-stability | Draft, mergeable | 0 |
| [106](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/106) | `6898faa55a8c9be2c4241da7816b849d311402aa` | feature/qadam-stage2-ai-voice | Draft, mergeable | 0 |
| [107](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/107) | `a4b9da868e9f4a7ccbbbd9529834bf1e7885ca19` | feature/qadam-stage3-business | Draft, mergeable | 0 |

`origin/main = 2518b2e80b8c8ef881063a968645382d61aeb37e`.
`git merge-base --is-ancestor` подтверждает всю цепочку: 4 + 2 + 2 + 2 commits
после main. Все 10 commits сохранены в #107; суммарно изменены 120 файлов.
Новых конфликтов или расхождения веток не обнаружено. История не переписана.

GitHub REST показывает `allow_merge_commit=true`, squash/rebase также разрешены
настройкой, `allow_auto_merge=false`. Наличие squash в настройке **не означает
разрешение владельца** использовать его. Main: `protected=false`, enforcement
required status checks выключен, contexts/checks пусты; список rulesets, включая
наследуемые, пуст. Административные Actions permissions недоступны (403),
прямая branch-protection ручка вернула 404. Нельзя делать вывод об org-wide
Actions policy из отсутствия доступа. Настройки защиты/permissions не менялись.

На исходных HEAD #104–107 имеется Vercel success, но GitHub Actions workflows
и runs до Stage 5 — **0**. В их Git-деревьях нет `.github/workflows/*.yml`.
Это доказанная причина отсутствия тестовых CI jobs; не Draft-статус и не
неподтверждённая гипотеза о выключенном Actions. Утверждение старого handoff,
что Vercel больше не связан с репозиторием, не соответствует новым status events:
владелец должен отдельно проверить текущие hosting integrations до merge.

Источники snapshot: GitHub PR/reviews, repository metadata, branches/main,
rulesets и actions/workflows/runs API; сохранённые локальные ответы — в ignored tmp.
GitHub mergeability — техническая возможность слияния, не review approval.

## Проверка доказательств и границ изменений

Прочитаны сохранённые Stage 4 логи полного backend/frontend, strict microphone,
трёх PostgreSQL browser harnesses и 19 Playwright JSON reports. Результаты
соответствуют [Stage 4 audit](QADAM_STAGE4_INTEGRATION_AUDIT.md):

| Категория | Доказанный локальный результат Stage 4 |
| --- | --- |
| Backend | 482 passed, 0 skipped |
| Frontend | 686 passed, 50 файлов одним запуском, 0 skipped |
| Strict microphone | 35 passed; 27 пересекаются с основным suite, 8 дополнительных |
| Browser | 231 запуск в 19 suites, 217 уникальных file/title/engine сочетаний |
| Настоящий FastAPI/JWT/PostgreSQL через Chrome | ещё 3 сценария; всего 234 browser-запуска |
| Финансы | UI/API/SQL: 4200 / 2200 / 2000 ₸, четыре записи |
| TypeScript/lint/build/contracts/format/Ruff | PASS |

Это **локальные тесты**, не GitHub CI и не production acceptance. Исходные
неуспешные browser-прогоны сохранены; один ранний login timeout не имеет
доказанной первопричины. Физические устройства и реальные AI/Supabase login
не проверялись этими тестами. Логи находятся в соседнем worktree Stage 4;
команды воспроизведения и синтетические скриншоты доступны в его отчёте.

Сравнение main → #107: migrations, models, основные денежные schemas и backend
JWT verifier не изменены. AST сравнение ledger показывает изменение только
`history`; sale/repayment/reversal arithmetic, locks и commit rules прежние.
Stage 3 добавляет серверные read projections, а Stage 4 — проверку версии API.
**Frontend Auth recovery намеренно изменён Stage 1**: timeout, session recovery,
callback error UX и восстановление разрешённой точки. Нельзя описывать весь
стек как «Auth вообще не менялся»; backend JWT/Membership не ослаблены.

Один Alembic head: `0008_canonical_markets`. Research и migrations 0009/0010
из других дипломных веток сюда не входят. Нет оснований переносить их в релиз.
Проверка добавленных строк main → #107 не нашла кандидатов private keys,
provider/PAT/JWT secrets или DSN с паролем по указанным паттернам; это не
криптографическое доказательство отсутствия любых секретов во всей истории.
Текущий CI использует только явно синтетический пароль ephemeral PostgreSQL.

## Review каждого PR

| PR | Предмет обязательного review | Готов к merge сейчас? |
| --- | --- | --- |
| 104 | Auth recovery/session boundaries, выбор точки, нейтральный 429 и Retry-After; намеренные frontend Auth изменения | **Нет:** Draft, нет approvals/разрешения и требуемого CI на его merge-result |
| 105 | Денежные цитаты/strict JSON, fact-bindings-v1, labelled fallback, volatile voice state; backend и ledger-web owners | **Нет:** сначала 104; review и CI после retarget; live AI качество не доказано |
| 106 | Полные customer/period projections, возраст долга не просрочка, CSV/print, API 0.8.0; backend/ledger владельцы | **Нет:** сначала 105; CI и согласованный выпуск совместимой пары; Research claim требует уточнения |
| 107 | Version header/CORS, fail-closed RU/KZ, Vitest major upgrade, оставшиеся 7 moderate dev findings | **Нет:** сначала 106; security/owner review и CI на актуальном merge-result |

Описания PR уже содержат изменения, зависимости, SHA, локальные результаты и
ограничения. Stage 5 review notes сохраняют прежние результаты как исторические,
не приписывают новые результаты старым HEAD. В #106 ошибочное «Research preserved»
уточняется: Research отсутствует в проверяемом стеке. Bases/Draft/история не меняются.

## Новый минимальный CI

Отдельный переносимый CI commit: `eb5d8702e521165134f7666aa760b27d25431eaa`.
Только `.github/workflows/qadam-ci.yml` и `scripts/ci/verify_junit.py`.

- Ubuntu 24.04, Python 3.12, uv 0.13.7, Node 24, locked installations.
- Backend job: PostgreSQL 17 service, отдельная пустая `qadam_ci_test`, настоящий
  pytest с upgrade/check/downgrade fixture, Ruff и backend OpenAPI check.
- Frontend job: весь unit/component suite, strict microphone, TypeScript, lint,
  полный format, build, generated API check. Никаких selective reruns.
- JUnit guard отклоняет отсутствие/пустоту report, failure/error/skip. Потеря
  PostgreSQL не превращается в зелёный skipped job.
- Только `contents: read`, pinned action SHAs, `persist-credentials: false`,
  GitHub-hosted runners, никакого `pull_request_target`, secrets или deploy.
- Два короткоживущих test artifacts, 7 дней: JUnit и tested/head/base SHA.
  На PR тестируется merge-result; на push — точный head. Не смешивать эти SHA.
- Draft не исключён. Нет base/path filters у pull_request. `edited` включает
  retarget; push разрешён для main и собственной CI-ветки. Manual dispatch не
  заменяет missing PR checks и требует доступности workflow на default branch.
- Browser/physical/live-provider suite в минимальный CI **не входит**; это
  отдельный staging gate, а не молча пропущенные unit tests.

Нужные required job names после одобрения владельца:
`Backend / PostgreSQL / contracts` и `Frontend / tests / build / contracts`.
Пока они не настроены как обязательные; Vercel не заменяет ни один из них.
Локально actionlint 1.7.12 PASS (Windows без shellcheck/pyflakes), Ruff PASS;
JUnit guard прошёл 8 положительных/отрицательных проверок командной строки.

Правила: [PR events и merge-result](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows),
[изолированный PostgreSQL service](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers).

## Как включить CI до merge #104 без переписывания PR

Наличие CI в потомке #107 **не добавляет checks задним числом в #104–107**.
Владелец должен отдельно одобрить bootstrap workflow в main через новый PR,
содержащий только два файла CI commit выше. Не сливать всю Stage 5 ветку в main
ради workflow: она содержит весь стек приложения.

На старом main/#104–106 есть два известных format failures; исправлены они
только в #107. Поэтому bootstrap CI честно покажет их. Перед первым зелёным
merge gate нужен отдельно reviewed format-only backport этих двух правок
(`dashboard-demo.test.tsx`, `whatsapp-components.test.tsx`) в base, либо другой
явно согласованный ремонт. **Не выключать format check и не принимать failing
CI как success.** Stage 5 не выполняет этот backport/merge автоматически.

После принятия CI bootstrap: owner включает два required checks, review approvals
и обновление проверок относительно актуальной base. После изменения main каждый
последующий PR должен получить новое событие/merge-result и полностью зелёный CI.

## Точная последовательность, только после разрешений

0. Owner утверждает CI bootstrap и baseline format-only repair, merge-commit
   policy, обязательные checks и отсутствие автоматического production deploy
   от промежуточного main. Сохраняет текущие artifact SHA/backup/rollback.
1. Review #104 на точном свежем HEAD; необходимые owners оставляют approvals.
   После успешных required checks и отдельного разрешения owner — merge commit #104.
2. Fetch; сравнить main. Вручную retarget #105 на main, сохранить прежние commits,
   проверить новый diff/merge-result и полный CI; затем review/разрешение/merge commit.
3. То же для #106 после #105, с backend 0.8.0 и read-projection review.
4. То же для #107 после #106, с header/client/security review.
5. Отдельно review оставшихся Stage 5 docs/CI изменений. Уже принятый bootstrap
   не должен создавать дубли или неожиданное изменение diff.
6. Сверить ancestry, финальные SHA, OpenAPI и read-only schema revision; только
   затем отдельное разрешение на изолированный staging deploy по плану ниже.

Если base двинулась, появились конфликты, required check неуспешен или ff-only
не проходит — остановиться и показать расхождение. Не rebase/force push/auto-merge,
не squash и не удаление веток. Не сливать #105 в feature-base вместо main.
Одобрение merge не разрешает автоматически deployment или DB migration.

## Остаточные разрешения и готовность

Нужны: captain/repository owner; backend/ledger; frontend/Auth; AI/voice;
security для dev advisories; hosting/Supabase owner; оператор физического устройства.
Ни один approval не заменён этим отчётом или результатом бота.
Review-ready как кандидат: **да**. Merge-ready сейчас: **нет для всех четырёх**.
Staging/production acceptance: **NO-GO**, причины и контрольные сценарии —
[QADAM_STAGE5_STAGING_PLAN.md](QADAM_STAGE5_STAGING_PLAN.md).

## Фактическая публикация и CI Stage 5

[Draft PR #108](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/108):
`ci/qadam-stage5-release-readiness` → `review/qadam-stage4-integration`.
Описания #104–107 дополнены review notes; исходные результаты сохранены,
нет изменения bases/Draft/code/history. В #106 исправлена неточность про Research.
Workflow/script находятся в отдельном CI-only commit для reviewed bootstrap;
следующий commit содержит только документы. Точный final HEAD — в PR и `git rev-parse HEAD`.

Первый настоящий Actions run запущен на CI commit:
[43209502658](https://github.com/foxfordkz-cyber/qadamx-taraz/actions/runs/43209502658).
**SUCCESS**, event `push`, tested HEAD
`eb5d8702e521165134f7666aa760b27d25431eaa`.

| Настоящий GitHub Actions результат Stage 5 | Результат из job logs/JUnit |
| --- | --- |
| Backend + disposable PostgreSQL 17 | **482 passed**, 0 failures/errors/skips; pytest 21.18 с |
| Frontend unit/component | **686 passed**, 0 failures/errors/skips |
| Strict microphone | **35 passed**, 0 failures/errors/skips; пересечение с unit не скрыто |
| Ruff/backend format/OpenAPI | PASS |
| TypeScript/ESLint/full format/generated types/build | PASS |

Проверены завершённые jobs `131153176145` (backend) и `131153175872` (frontend),
включая JUnit guard и upload artifacts. Последующий PR run проверяет merge-result
с base #107; его SHA/статус указывается в описании нового PR. Этот CI успех не
приписывается HEAD #104/#105/#106/#107 и не подтверждает hosted acceptance.
