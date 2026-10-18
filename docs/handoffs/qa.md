# QA handoff — финальный чек-лист капитана, 2026-10-18

Ветка отчёта: `test/ai-assistant-final-acceptance`, base `main`.
Проверенный source: `2ba2c09ea2e5d154c8f9b305614d9da33c462b83`.
Commit отчёта: `efbd146bcb43194a233d30254afdc3e31841d5a6`, push подтверждён,
local/remote HEAD совпали. [Draft PR #90](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/90),
base `main`, head `test/ai-assistant-final-acceptance`. Merge не выполнялся.
Актуальный HEAD ветки (включая эту передачу): `git rev-parse HEAD` после безопасного fetch/pull.

Последнее указание пользователя ограничивает работу проверками и отчётом.
В публикуемом diff только этот handoff, [отчёт](../qa/DEFENSE_QA_20261018.md)
и `docs/qa/defense-20261018/` с доказательствами. Production, Backend, контракты,
финансовая логика и тесты не изменяются этим commit.

## Результаты

- Обязательные исходные Playwright-наборы свежего main: cabinet 10/10,
  assistant 6/6, assistant-qa 13/13; итого **29/29 PASS**, без повторов.
- `npm ci` PASS; Pages smoke после подтверждения выпуска капитаном — 9/9 PASS.
- Production IAB: публичная цепочка, Android release link, Demo, RU/KZ,
  кабинет, помощник, Escape/крестик, основные и дополнительные разделы,
  компактная аналитика, 360/1440 CSS px — проверены. Console error: 0;
  четыре deprecation warnings THREE.Clock.
- Расширенные тесты: пять customer-recovery и один integration mobile-menu
  упали дважды, включая один отдельный повтор каждого. Капитану сообщено.
  Две причины: неучтённые GET summary/operations в fixture и устаревшее ожидание
  ссылки «Мне должны» внутри «Ещё». Исправления не выполнялись.
- Физические Android/Chrome и iPhone/Safari **BLOCKED**. Живые финансовые записи
  **NOT RUN** без учебного входа/разрешения. Живой AI-вопрос оставлен капитану.
- Ранее на том же production source: check:api/typecheck/lint/build и 513 unit/component PASS.
  Ограничения первоначального расширенного прогона полностью перечислены в отчёте.

## Локальные копии и непубликуемые материалы

Все пути ниже от корня рабочей области Codex, содержащего `work/`:

- `work/qadam-final-qa-main-check`: отдельный detached snapshot для финального QA;
  source/test-файлы неизменны. Тесты перезаписали только четыре старых PNG в
  `docs/screenshots/ai-assistant/`; они не публикуются и не удалены.
- `work/qadam-final-qa-main-check/apps/web/test-results/captain-acceptance/`:
  verify-pages, отдельные retry logs и traces. Секреты/live sessions не использовались.
- `work/qadam-ai-assistant-final-acceptance`: ветка отчёта; здесь сохранены восемь
  **не закоммиченных** QA-правок, подготовленных до последнего ограничения scope:
  `apps/web/e2e/assistant-fixtures.ts`, `assistant-qa.acceptance.ts`,
  `assistant-qa.playwright.config.ts`, `assistant-release-surfaces.acceptance.ts`,
  `assistant-release-surfaces.playwright.config.ts`, `assistant.spec.ts`,
  `cabinet-ai-first.spec.ts`, `public-design.spec.ts`.
- Их резервный patch: `work/qa-earlier-test-preparation.patch` (создан через `git diff --binary`).
  Автоматически не применять и не публиковать: это отдельный scope.
- Старый черновик `docs/qa/AI_ASSISTANT_FINAL_ACCEPTANCE.md` и
  `docs/qa/ai-assistant-final/` в этой копии оставлены локально, не входят в PR;
  актуальным считать новый DEFENSE_QA_20261018.
- `work/qa-final-captain-report/`: оригиналы всех снимков production и UI observations.

## Продолжение

1. Прочитать новый отчёт и проверить `git status`, `git fetch origin --prune`, свежий SHA main.
2. Для нового QA использовать отдельный snapshot, не очищать существующие рабочие копии.
3. В `apps/web`: `npm ci`, затем три `npx playwright test -c ...` из отчёта.
   Из корня: `node scripts/verify-pages.mjs`. При падении — один отдельный `-g` retry.
4. Изменения fixtures/селекторов, physical acceptance и live финансовая проверка — отдельные
   задачи/разрешения владельцев. Не менять дизайн для удовлетворения старых тестов.
5. Не выполнять merge, force push, deploy или изменения main в рамках этой QA-задачи.
