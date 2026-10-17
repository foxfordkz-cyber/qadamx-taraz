# PR43: callback и подготовка совместной приёмки

Продолжена существующая ветка `integration/seller-registration-deploy-review`,
[Draft PR #43](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/43).
Новой ветки регистрации или дублирующего PR нет. База обновлена до принятого
`main:ad63a00` только внутри PR43, merge `36b9c72b123dec0ca6969bbfd71ea42b5a1818e3`.
Main, deploy-ветки, Vercel/Render и настройки Supabase этим продолжением не изменены.

## Реализация

- Один существующий Supabase client/AuthProvider, `flowType: "pkce"`,
  `detectSessionInUrl: false`. Signup и resend используют согласованный
  `https://qadamx-taraz.vercel.app/auth/callback`.
- Публичный маршрут `/auth/callback` захватывает один code в памяти и сразу
  удаляет query/hash из адреса. Произвольный `next`, implicit token и provider
  error description не используются. Одновременный второй callback отклоняется.
- Обмен выполняется один раз на попытку/client, включая StrictMode и remount.
  После неопределённого ответа проверяется SDK session; повторного обмена нет.
  При отсутствии подтверждённой сессии предлагаются вход или явный resend.
- Результат привязан к identity/generation. HTTP-ответ старого обмена отклоняется
  до записи SDK, если тем временем сменился сеанс. Callback не вызывает signOut
  для очистки чужой/новой сессии и не присваивает возвращённую сессию вручную.
- Только проверенный существующим gateway `GET /me` разрешает `/seller`.
  `businesses: []` показывает ожидание подключения, Refresh и Logout. Сеть,
  401/403/404/500 и некорректный 200 не становятся пустым кабинетом или Demo.
- RU/KZ, общие компоненты/токены, focus, status/alert, клавиатура, ссылки-действия
  от 44 px. Скриншоты — синтетические данные, просмотрены после E2E.

Основные файлы: `apps/web/src/app/auth-callback-model.ts`, `auth-callback.tsx`,
`auth.tsx`, `App.tsx`, `src/main.tsx`, общие RU/KZ-словари. Тесты отдельно:
`src/test/auth-callback.test.tsx`, `e2e/auth-callback.acceptance.ts`.
Существующие signup/resend tests теперь проверяют согласованный redirect/PKCE.
Backend, схемы, generated types, зависимости, финансовая логика и Customers.tsx
не менялись относительно полученной базы main.

## Проверки этого продолжения

Все автотесты изолированы: синтетические SDK/HTTP, отдельные серверы с
`reuseExistingServer: false`, блокировка внешних origin в browser fixtures.
В полном Vitest явно обнулены реальные API/Auth env-переменные. Настоящий SDK
используется в Chromium, но ответы Auth и API подставляются тестом.

| Проверка | Результат |
|---|---|
| Полный последовательный Vitest | 400/400 PASS, 26 файлов; 21 новая callback-проверка |
| Auth/Registration/Callback Chromium | 25/25 PASS, включая поздний HTTP-ответ A после входа B |
| Customer Recovery Chromium | 5/5 PASS; Web Locks/две вкладки/reload, синтетический API |
| Customer/Auth/Seller QA Chromium | 21/21 PASS |
| TypeScript, lint, check:api, build, format:check, diff --check | PASS |
| RU/KZ и ширины 360/390/768/1440 | PASS; физический телефон не проверялся |
| Snapshot исходного late-K1 regression | Сохранён без ослабления, входит в полный Vitest |

Команды из `apps/web`: `npm test -- --maxWorkers=1 --no-file-parallelism`,
`npm exec -- playwright test --config e2e/auth-onboarding.playwright.config.ts --trace off`,
`npm exec -- playwright test --config e2e/customer-recovery.playwright.config.ts --trace off`,
`npm exec -- playwright test --config e2e/qa.playwright.config.ts --trace off`,
`npm run typecheck`, `lint`, `check:api`, `build`, `format:check`.
Для изолированного Vitest передаются пустые `VITE_API_BASE_URL`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; на Windows использован
`node:child_process.spawnSync` с явным `env`, чтобы PowerShell не удалил пустые значения.

Сборка дополнительно выполнена с общими Render API/Supabase Project URL и
существующим публичным ключом в игнорируемом `.env.local`. Старый tunnel URL
в исходной локальной конфигурации заменён только в этой новой рабочей копии на
`https://qadamx-taraz.onrender.com/api/v1`. Ключ не добавлен в Git или отчёт.
Осталось прежнее предупреждение о размере 3D chunk. Пакеты не обновлялись.

Первый callback unit-прогон: 17/19 PASS; два теста ошибочно требовали ровно один
GET `/me` при StrictMode. Исправлены ожидания безопасных GET и отдельные Response
в test fixture; требование единственного POST обмена не ослаблялось. Затем
добавлены transport-level stale-response и concurrent-callback проверки.

## Согласование оформления

PR41/7d84cb6 и PR42/2058b91 уже объединены капитаном (merge 539bee6/5ef331a).
В нашей ветке `Customers.tsx` и recovery coordinator побайтово совпадают с
полученным main. Сохранены оформление, скрытие UUID, key+bodyHash compare-and-clear,
Web Locks и session/owner guards. Дополнительных правок файла не делали.
[Абзалу отправлен запрос проверки](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/41#issuecomment-6232597149).
Ответ пока не получен; отсутствие ответа не считается согласованием.

## Настоящий API: факты и незавершённые шаги

Новые собственные read-only проверки: health 200; OpenAPI 200 / **0.6.2**;
описания `/me`, POST/GET customers и GET `customer-creation-result` совпадают с
репозиторием; анонимный `/me` → 401; CORS preflight для постоянного web origin → 200.
Это не доказательство авторизованной изоляции или COMMIT/replay.

Историческая живая приёмка капитана опубликована в
[RECOVERY_POLISH_RELEASE](RECOVERY_POLISH_RELEASE.md): потеря ответа после
настоящего 201, completed lookup, same-key replay без дубля, A/B denial.
Она не выдаётся за новый прогон этого продолжения. Поздний K1/K2 там был
изолированным тестом; новая живая проверка этой гонки ещё нужна.

Капитан разрешил точку A `2c234f1c-2c79-5e3a-ab77-042e3da4dafa` при обязательной
проверке актуального `/me`. Для B — только собственная разрешённая точка.
Подтверждённого файла паролей/действующей сессии нет; капитан готов вводить данные
лично. Подключение браузера в этой сессии не работает: inventory пустой,
Chrome и встроенный браузер вернули `Browser is not available`. Поэтому
авторизованные GET, POST и новая живая приёмка **не выполнялись**.

**Новые учебные записи этого продолжения: 0 клиентов, 0 аккаунтов, 0 писем,
0 финансовых операций.** БД не очищалась, seed/migration не запускались.

## Следующий совместный прогон

1. В доступном браузере капитан входит A. Проверить настоящий `/me` и наличие
   согласованной точки до записи; записать web commit и API version. Если точки
   нет — остановить запись, не подставлять чужой ID.
2. Создать учебный K1 с уникальным синтетическим именем и `contact: null`.
   Перехват сначала получает настоящий 201 после COMMIT, затем удерживает ответ
   только в тестовом браузере. Не ломать production API и не создавать новый ключ.
3. Из второй формы/вкладки выполнить настоящий GET recovery K1: completed с тем
   же UUID. Один явный POST с исходным key/body должен вернуть тот же snapshot;
   серверный список должен содержать ровно один K1.
4. После разрешения K1 начать отдельный учебный K2. Потерять его ответ после
   реального 201; временный отказ lookup — только в тестовом перехвате. Завершить
   старый K1 в первой размонтированной форме. Маркер K2 (key+bodyHash) должен
   сохраниться. Reload — только GET, без нового POST/ключа. Затем разрешить
   настоящий GET K2 и сверить receipt/одну запись K2.
5. Капитан входит B в отдельном контексте. `/me` должен показать только его
   разрешённые точки. GET клиентов и recovery точки A → 404; в собственной точке
   B ключ A не даёт чужого receipt. Данные/успех A не появляются в UI B.
6. Записать точные UUID двух новых учебных клиентов, время, статусы HTTP,
   число записей и SHA проверенной сборки. Не сохранять пароли/JWT/контакты.
   Не удалять receipts или unknown markers ради повторного прогона.

## Email confirmation: оставшийся gate

Callback URL уже согласован; заново выбирать механизм не требуется. Капитан
**не подтвердил фактический allowlist** и предоставит доступный тестовый ящик
отдельно. Общие Auth-настройки мы не меняли. Требуются snapshot текущих Site URL,
точных redirect URLs и email template, затем подтверждение применения владельцем
общего Auth. Wildcard/новый Supabase/demo-memberships не добавляются.

После этого на согласованном origin: одно новое signup → реальное письмо →
confirmation → SDK session → настоящий `/me` с нулём memberships → reload/logout,
а также повторная/истёкшая ссылка и другой браузер. Доставка, реальные TTL и
confirmation на другом устройстве пока **не приняты**. До этого PR43 остаётся Draft.
PKCE требует verifier исходного браузера: [официальный контракт Supabase](https://supabase.com/docs/guides/auth/sessions/pkce-flow).
