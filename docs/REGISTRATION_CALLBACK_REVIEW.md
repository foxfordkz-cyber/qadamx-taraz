# PR43: callback и подготовка совместной приёмки

## Актуальный аудит после получения настоящего письма — 2026-10-17

Капитан получил письмо и после ссылки столкнулся с Vercel Authentication, вошёл
в Vercel через Google, затем отдельно вошёл в Qadam с email/паролем. Это подтверждает
доставку письма и обычный вход в пустой кабинет Preview; **автоматический callback
не принят**. Персональные данные и оригинальные снимки в репозиторий не добавлены.

Повторный анонимный GET `/register` и `/auth/callback` согласованного Preview:
HTTP302 → `vercel.com/sso-api`. Препятствие Vercel наблюдалось до загрузки приложения.
Это не доказывает, сохранился ли code и ключ исходного браузера после входа капитана.
После настройки backend CORS проверен: OPTIONS `/me` →200 с точным Preview origin,
анонимный GET →401 с тем же Allow-Origin. Ранние записи о CORS400 ниже исторические.

На экране ожидания письма теперь заранее объясняется необходимость исходного
браузера/устройства и последнего письма. Только PR43 Preview показывает пояснение
Vercel. Обмен кода, конфигурация Supabase/Vercel, membership и production не менялись.

Изолированный набор расширен до 6 Preview E2E: кроме прежних RU/KZ/360/1440,
проверяет соответствие verifier/challenge и возврат из моделируемой страницы доступа
с кодом/без кода, а также открытие письма в другом браузере и отдельный парольный вход.
Макет страницы доступа не является настоящей приёмкой Vercel SSO. Детали и результаты
— в [handoff](handoffs/seller-web.md).

Следующий живой прогон требует сначала открыть точный Preview в браузере с доступом
Vercel, затем начать новую согласованную тестовую регистрацию и открыть её письмо
в том же браузере/устройстве. Уже подтверждённый аккаунт повторно не регистрировать.
Ограничение исходного браузера описано в [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
поведение доступа — в [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).

Ниже сохранён отчёт предыдущей реализации `70a088c`.

## Продолжение 2026-10-17: отдельный callback согласованного Preview

Капитан разрешил проверку только существующего PR43 в Preview. Production Site URL
и callback сохранены. Капитан подтвердил, что production Site URL и web callback
сохранены в Supabase; это его подтверждение, не наша инспекция Dashboard.

Согласованный Preview callback:
`https://qadamx-taraz-git-integration-seller-registrat-7d21c0-p-it-chers.vercel.app/auth/callback`.

Vite выбирает этот фиксированный адрес **только одновременно** при
`VERCEL_ENV=preview` и
`VERCEL_GIT_COMMIT_REF=integration/seller-registration-deploy-review`.
Production, другие ветки и обычная локальная сборка сохраняют
`https://qadamx-taraz.vercel.app/auth/callback`. URL не строится из query,
`next`, произвольного alias или `VITE_` значения. В Vercel должны быть доступны
System Environment Variables; вручную менять Site URL или production env не нужно.
[Описание системных переменных Vercel](https://vercel.com/docs/environment-variables/system-environment-variables).

Signup и resend используют один выбранный адрес. На другом origin собранное
приложение не отправляет эти запросы: без verifier исходного origin PKCE не завершится.
Для настроенного Preview показана RU/KZ-ссылка на согласованный `/register`.
Если метаданные сборки отсутствуют и выбран production callback на другом origin,
форма сообщает о ненастроенной регистрации и не направляет пользователя на
несуществующую production-регистрацию. Provider также блокирует отправку в обход UI.
Обмен кода, identity guards, проверенный `/me` и пустой кабинет сохранены;
создания membership и перехода в Demo нет.

Изолированные проверки продолжения: полный Vitest **413/413**, обычные Auth E2E
**25/25**, новые Preview E2E **3/3**; TypeScript, lint, check:api, format:check,
локальные production/Preview сборки и diff check. Preview E2E используют настоящую
собранную страницу и SDK на точном HTTPS origin в Chromium, но **все** запросы
перехватываются и обслуживаются локально. Signup/resend → синтетическое открытие
письма → тот же Preview → session → `/me: businesses=[]` → reload/logout,
RU/KZ на 360/1440 px и блокировка другого origin проверены. Это не доставка email.
Логи и PNG — в игнорируемом `apps/web/test-results/`.

Первый локальный Preview запуск не прошёл: сервер слушал localhost/IPv6, а проверка
доступности использовала 127.0.0.1. Исправлен host изолированного сервера.

### Что ещё необходимо для настоящего письма

Последний ответ капитана: настройка **ещё выполняется**. Не считаем следующие
настройки применёнными по одному согласованию URL:

1. Supabase allowlist содержит точный Preview callback выше; остальные URLs и Site URL
   сохранены. Шаблон письма использует Supabase ConfirmationURL и согласованный redirect.
2. Backend разрешил **точный origin без `/auth/callback`** в CORS. Наш read-only OPTIONS
   к `/api/v1/me`: production origin → 200 с Allow-Origin; Preview origin → 400 без
   Allow-Origin. Это конфигурационная зависимость backend, не новый API/контракт.
3. Капитан вошёл в Vercel и открывает **веточную Preview-ссылку**, не уникальный alias
   deployment: анонимный GET Preview направляет на Vercel login. Защиту не отключаем.
4. После публикации проверить нужный SHA/выбранный callback именно в Preview,
   затем выполнить одно signup на предоставленный капитаном тестовый ящик.
   Пароль и подтверждение письма капитан вводит/открывает лично в том же браузере.
   Email, пароль, JWT и URL с кодом не записываются в Git, скриншоты или отчёт.
5. Только после настоящего confirmation проверить SDK session и авторизованный `/me`,
   нулевые memberships, reload/logout; ошибки API не считать пустым кабинетом.

Наша read-only проверка production получила SPA shell 200, но в опубликованном
`/assets/index-BMQXppQw.js` нет `/register` и `/auth/callback`. Поэтому письмо с
production redirect не подтверждало бы сценарий этой Preview-версии.

**Настоящая email-приёмка пока не выполнена. Новых аккаунтов, писем, memberships,
клиентов и денежных операций этого продолжения: 0.** Main, deploy-ветки, production,
Supabase и Render-настройки самостоятельно не менялись. PR43 остаётся Draft.

Ниже сохранён отчёт предыдущего SHA `9227f6f`; его пункты о недоступном ящике и
неподтверждённом production allowlist — историческое состояние.

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
