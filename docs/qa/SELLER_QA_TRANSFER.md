# Seller QA — перенос и собственная проверка Windows

2026-10-16. Репозиторий: https://github.com/foxfordkz-cyber/qadamx-taraz. Рабочая ветка **test/seller-regression**, отдельный worktree `qadam-seller-qa`. Целевая base для Draft PR — **feature/seller-dashboard**. Merge/force push не выполняются.

## Происхождение и точность переноса

Архив пользователя `qadam-seller-qa (1).zip`, SHA-256 **67015cd7b6effbd50a3f70c6ff101b3c5653766cc4d952ef95b5786118c38835**. До применения прочитаны APPLY_QA.txt, patch, reports и тесты. Проверены SHA-256 всех 10 файлов, patch и bundle по TRANSFER_MANIFEST.json; bundle verify успешен. Архив распакован отдельно от Git, его команды не запускались вслепую.

База точно **a77f1a02b240dbf9e8c627937a5cb6445d92fb51**. Исходный QA HEAD другой среды **6520e0c9dfcbeb5643169db74d596d38961c5636**. Применены оба commit через `git am`, без конфликтов, с сохранением авторства. Пересозданные commits:

- **4232bb589cf17d5bb418a63296b8951b982ab7d7** — test(seller): auth, API and regression coverage.
- **e89fc3c4194f947d36daef483ab1ac0401829aeb** — docs(qa): record regression results and publication blockers.

После git am точный tree **d09036e59ae92a807d64f49ad25dfb70b6c517aa** совпал с ожидаемым, все 10 SHA-256 восстановленных файлов совпали. Commit hashes отличаются от исходных из-за нового committer/date, содержимое совпадает. Данный документ — отдельное дополнение Windows-передачи и не меняет архивные 10 файлов.

## Границы

Архив добавляет только 8 QA/test файлов и 2 docs/qa файла. Нет изменений production, backend, OpenAPI 0.3, generated.ts, app/Auth/runtime, shared/UI, features, package/lock, fonts/screenshots или исходных тестов. Это проверено diff от a77. Feature/seller-design-integration остаётся c9e099e2ce2b0d5c25552542f72b9b369f5d7b5b, feature/seller-dashboard остаётся a77; integration/team-mvp и main не изменялись.

QA snapshot относится к старому seller/API 0.3: Sale и public-модули там ещё placeholder, catalog/inquiries unbound. Не переносить эти tests напрямую в Team MVP/API 0.4 без отдельной адаптации. Этот PR не интегрирует QA в Team MVP и не исправляет production.

## Три сохранённых failing tests

В src/test/qa-known-defects.test.tsx сохранены обычные `it`, без skip/todo/it.fails/only:

1. **QA-001** — поздний 401 первой A-сессии истекает новую A после A→B→A.
2. **QA-002** — response next_cursor не содержит UUID format, в отличие от request cursor и runtime reader. Это contract mismatch, а не доказанный сбой живой UUID-пагинации; изменение схемы согласует капитан.
3. **QA-003** — UTF-16 length отклоняет 200 Unicode code points вне BMP, допустимых CustomerCreate.maxLength.

Исправления не входят в перенос QA. Unit regression gate остаётся красным, как просил пользователь. Команда `npm test -- src/test/qa-known-defects.test.tsx` воспроизводит эти проверки отдельно.

## Собственный прогон

Windows, Node 24.21.0, npm 11.19.0, Vitest 3.2.7, неизменённый package-lock. Из apps/web выполнены npm ci (304 packages) и полный npm test: **127 passed / 3 failed, 130 tests, 10 files, exit 1**. Падают именно QA-001/002/003. Это собственный результат переноса, отдельно от исторического Linux cloud отчёта.

check:api, typecheck, lint, build и targeted QA Prettier check прошли (все exit 0). Полный QA Playwright прогон: **21/21 passed**, 2.2 минуты, exit 0. Chromium доступен в этой Windows-среде; историческая browser-блокировка здесь снята. Исходные screenshot artifacts не менялись. Build завершился с существующим предупреждением empty auth chunk при отсутствии live env. npm ci также сообщил3 унаследованных audit findings в dev-стеке (1 moderate / 2 critical); обновления зависимостей в эту задачу не включены.

Команды из apps/web:

```powershell
npm ci
npm run check:api
npm run typecheck
npm run lint
npm test
npm run build
npx prettier --check 'src/test/qa-*.ts' 'src/test/qa-*.tsx' 'e2e/qa*.ts'
npm run test:e2e -- --config e2e/qa.playwright.config.ts --list
npm run test:e2e -- --config e2e/qa.playwright.config.ts
```

QA Playwright config поднимает новый Vite на порту 4175, reuse false, локальные synthetic Auth/API URL. 21 сценарий = 13 новых QA + 8 прежних; screenshot-writer исключён. Real App/SDK работают с перехваченными ответами; external requests блокируются. Это **не live Backend/Supabase**. Живые JWT/JWKS, persistence/DB/CORS/financial acceptance этим переносом не проверяются. Общая БД не затронута, env/secrets не переносились.

Исторический архивный результат: **127 passed / 3 failed, Chromium E2E blocked, Live Backend not tested**. Он сохранён без переписывания в SELLER_REGRESSION_REPORT.md и SELLER_TEST_MATRIX.md. Новый browser результат следует читать отдельно в этом документе и Draft PR.

## Продолжение

Только test/seller-regression. После первой публикации использовать явные `git fetch origin test/seller-regression`, `git pull --ff-only origin test/seller-regression`, `git push origin test/seller-regression`. Точный HEAD получать `git log -1 --format=%H`; исходный QA snapshot указан выше. Не исправлять production и не скрывать 3 failures в рамках публикации. Капитан/владелец отдельно согласуют fixes и live acceptance. Ссылка и подтверждение публикации фиксируются после успешного push.

## Публикация QA

Первая публикация `git push -u origin test/seller-regression` прошла успешно. Remote HEAD совпал с восстановленным QA snapshot **e89fc3c4194f947d36daef483ab1ac0401829aeb**, tree **d09036e59ae92a807d64f49ad25dfb70b6c517aa**. Перед push повторный fetch подтвердил прежнюю seller base a77 и отсутствие чужой QA-ветки.

Создан **open Draft PR #12**: https://github.com/foxfordkz-cyber/qadamx-taraz/pull/12. Base **feature/seller-dashboard**, head **test/seller-regression**, title `test(seller): auth, API and regression coverage`. Три failing tests сохранены, unit gate не зелёный. Собственный browser blocker снят:21/21 Chromium E2E passed на синтетических Auth/API; исторический blocked-отчёт не переписан. Live Backend not tested.

Этот отдельный transfer report сохраняется дополнительным docs commit поверх точного QA snapshot; актуальный полный HEAD получать `git log -1 --format=%H`. Первые два commit и все10архивных файлов не изменены. При передаче другому аккаунту прочитать этот файл вместе с SELLER_REGRESSION_REPORT.md и SELLER_TEST_MATRIX.md, затем branch/status/fetch/pull --ff-only только test/seller-regression. Не переносить QA snapshot в Team MVP и не исправлять production без отдельной задачи.

После прерывания команды создания PR выполнен read-only поиск: дубля не было, прерванный процесс завершён; последующая попытка создала единственный PR12. Main, integration/team-mvp, feature/seller-design-integration и feature/seller-dashboard не менялись. Merge и force push не выполнялись.
