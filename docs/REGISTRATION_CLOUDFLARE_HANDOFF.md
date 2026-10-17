# PR #43 — регистрация на Cloudflare Pages, 2026-10-17

**Код и проверочная сборка подготовлены; настоящая email-приёмка ещё NOT RUN.**
Продолжается существующий [Draft PR #43](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/43),
ветка `integration/seller-registration-deploy-review`. Второго Auth нет.

## Версии и сохранённая интеграция

- Сохранён исходный незакоммиченный handoff: `ad30329`.
- Получен `origin/main` **86ca9af15017b163a9e47335c68eee46ac2fafde**.
- Обычный merge: **4ed9fd4835900576d72e2870393a9820802f65ab**.
- Проверенный source/build: **67eb828c132d1b3e28752a9624e2c69a9a530f9c**.
- Следующий commit изменяет только документацию/синтетические снимки. Полный
  текущий PR HEAD проверять через GitHub; source SHA внутри архива фиксирован.

Конфликты `.env.example`, RU/KZ и seller handoff разрешены с сохранением Auth,
аналитики, ids и обеих историй передачи. Customer Recovery, финансовый код,
история, новый дизайн, backend и Flutter приняты через merge, не переписаны.
Hosted build сохраняет `VITE_CUSTOMER_IDS_ENABLED=true`, как в принятом main.
Никаких миграций, seed, новых memberships/owner или денежных операций.

Partial clone зависал на загрузке исторических мобильных/QA-артефактов.
Локально включён sparse checkout web/контрактов/документов, что не удаляет
файлы из Git/merge. Проверены все отслеживаемые web public assets в dist.

## Точная конфигурация сборки

| Параметр | Значение |
|---|---|
| Root directory | `apps/web` |
| Install | `npm ci` |
| Build | `npm run build:hosted` |
| Output | `dist` |
| Site / начало регистрации | `https://qadamx-taraz.pages.dev/register` |
| Единственный callback signup/resend | `https://qadamx-taraz.pages.dev/auth/callback` |
| API | `https://qadamx-taraz.onrender.com/api/v1` |
| Supabase Project URL | `https://pdjjdqgoitnkpgkbqjtp.supabase.co` |
| Public key | существующий publishable key этого проекта, в hosting env |
| PKCE | прежний SDK, `flowType: pkce`, `detectSessionInUrl: false` |

`vite.config.ts` подставляет callback из `auth-callback-config.ts`. Ни Vercel
Production/Preview, ни `CF_PAGES_URL`, ни произвольный `VITE_` URL его не меняют.
В production регистрация/resend разрешены только на точном origin основного
сайта. Другая копия предлагает безопасную ссылку на `/register` основного сайта.
Только dev/test допускает loopback; это не настоящий email-сценарий.
В callback сохранены очистка query/hash, single-flight exchange, защита от
позднего ответа другой сессии и проверка `/me`; произвольный `next` не используется.
Pages `_redirects` обслуживает callback/register/seller через SPA; `_headers`
ставит `no-store` и `Referrer-Policy: no-referrer` для callback.

После валидного `/me` без точек показаны email текущей SDK-сессии, объяснение,
«Обновить доступ» / «Қолжетімділікті жаңарту» и выход. Обновление делает только
GET `/me`; серверные ошибки не превращаются в пустое состояние.

## Артефакт для интегратора

`registration43-integration/qadam-pr43-cloudflare-67eb828.zip` — **1 451 274 bytes**,
25 файлов, все 19 отслеживаемых public assets включены. Корень ZIP — содержимое
`dist`, без env, исходных секретов и вложенной оболочки. В browser bundle находится
только штатный publishable key; серверные ключи не использовались.

SHA256: `3ffdd8f227144aff29651bb495ae95ad46e979a9d5bee96ad3299832419030ea`.
`registration-build.json` внутри содержит source SHA, точные публичные адреса,
ids=true и честный `live_email_acceptance: NOT_RUN`. Сборка Node **22.19.0**,
TypeScript/Vite PASS; прежнее предупреждение о крупных JS chunks остаётся.
Этот файл добавлен при упаковке кандидата, не генерируется обычным Vite автоматически.

## Supabase и публикация: действия владельца

В сессии нет подключённого Supabase management или Cloudflare deploy-доступа.
Публичные Auth settings **не показывают Redirect URLs**. Настройки не менялись.
[Капитану передан точный адрес, mobile-разработчик упомянут](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/43#issuecomment-6236287234).

1. В общем Supabase сохранить текущие настройки и **добавить/подтвердить**
   `https://qadamx-taraz.pages.dev/auth/callback` в Redirect URLs. Существующие
   Vercel/mobile callback-адреса сохранить. Wildcards не добавлять.
2. Проверить Site URL `https://qadamx-taraz.pages.dev`, Confirm signup template
   со штатным `ConfirmationURL` и текущие email TTL/SMTP/rate limits.
   Ключи, пароли, verifier и полные ссылки из писем не передавать в PR.
3. Интегратор публикует подготовленный `dist` в **существующий** Pages-проект
   на основном origin в согласованном окне. Архив — кандидат для проверки,
   не доказательство уже выполненного deployment. Preview/hash alias не годится
   для начала регистрации с production callback из-за другого browser storage.
4. Проверить `/registration-build.json` и asset hashes архива, deep routes,
   отсутствие hosting access gate, CORS. Затем выполнить сценарий ниже.

[Supabase redirect documentation](https://supabase.com/docs/guides/auth/redirect-urls)
требует соответствия redirect allowlist; [PKCE documentation](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
описывает необходимость verifier исходного клиента. Административные настройки
не выводятся из успешного HTTP 200 на статическом callback.

## Собственные проверки

| Проверка | Результат |
|---|---|
| TypeScript, lint, check:api, format:check, diff --check | PASS |
| Полный serial Vitest после исправлений | **477/477**, 34 файла |
| Затронутые registration/onboarding/config unit | **55/55** |
| Production Cloudflare bundle, HTTPS origin, SDK/HTTP synthetic | **6/6** |
| Auth/Registration/Callback Chromium | **25/25** |
| Customer Recovery Chromium, reload/two tabs/Web Locks | **5/5** |
| History/ids Chromium | **6/6** |
| Seller/Auth/Customer Chromium | **21/21** |

Синтетические наборы пересекаются; не суммировать как уникальные сценарии.
Исходный полный прогон: 476/477, устаревший текст блокировки Vercel в тесте.
Дополнительная проверка email выявила fixture без email; добавлен явный
синтетический email локально в этом тесте. Проверки запрета signup/resend,
автоматических POST и доступа к чужим точкам сохранены.
Sandbox не позволял esbuild читать родительский каталог: тесты запущены вне
этого ограничения с обнулёнными настоящими Auth/API env. Никаких live POST.

Проверены RU/KZ, 360/390/768/1440, keyboard и отсутствие overflow. Два снимка
просмотрены вручную: [письмо KZ 1440](qa/registration-cloudflare/confirmation-kk-1440.png),
[нет точек KZ 360](qa/registration-cloudflare/empty-kk-360.png). Это **synthetic UI**.

Read-only настоящие HTTP: Cloudflare `/register` и `/auth/callback` 200;
Render OPTIONS `/me` 200 с точным Cloudflare Allow-Origin, anonymous GET 401;
OpenAPI 0.6.2, `ids` присутствует. Supabase email enabled, signup enabled,
autoconfirm false. Это не доказательство allowlist, доставки или сессии.

## Реальная email-приёмка — пока NOT RUN

Пользователь готов открыть браузер/почту. Подключённого к инструментам браузера
в этой сессии нет. Агент не создавал аккаунты и не отправлял реальные письма.
Ранее сообщённый отдельный password login не считается успешным callback.

| Сценарий | Что фиксировать без секретов | Статус |
|---|---|---|
| Новый тестовый email → signup → письмо → исходный browser/profile | время, build SHA, получение письма, только host/path ссылки | NOT RUN |
| Callback → session → `/me` → кабинет без точек | один PKCE exchange 200, `/me` 200 и `businesses: []`, email/объяснение/обновление; не нажимать login | NOT RUN |
| Reload → явное обновление доступа → logout → reload | сессия сохранена до logout, GET-only refresh, после logout нет приватных данных | NOT RUN |
| Повтор ссылки при активной сессии; затем после logout | не менять личность, не повторять exchange автоматически, понятная ошибка при использованном code | NOT RUN |
| Просроченное НЕиспользованное письмо | дождаться текущего provider TTL, не менять TTL общего проекта; безопасная RU/KZ ошибка | NOT RUN |
| Другая browser/profile с новым письмом отдельного теста | отсутствие verifier, понятное RU/KZ действие, отсутствие ложного входа | NOT RUN |
| Resend и последняя ссылка в исходном браузере | только явный resend, тот же точный callback, нейтральные RU/KZ success/rate-limit тексты | NOT RUN |

Сохранять только очищенные host/path, статусы и request ID. Не прикладывать HAR,
JWT, пароль, email URL с query/hash, code/verifier или реальный адрес пользователя.
При проверке другого браузера не считать уже использованное письмо новым
сценарием: нужен свежий signup/resend с verifier в исходном профиле.

## Отдельный Flutter callback

Mobile автор `@bltangenss`, существующий PR #60, подтвердил зависимость в #43.
Предложены **для согласования**, ещё не настроены:
`kz.qadam.mobile://auth/callback` для signup/resend и
`kz.qadam.mobile://auth/recovery` для password recovery.
Ответ владельца ещё не получен. Это не утверждённый production mobile контракт.
Mobile владеет native SDK/PKCE storage, Android intent-filter, iOS URL Types,
холодным/тёплым запуском и PASSWORD_RECOVERY UI; капитан — Supabase allowlist.
Если выбран verified App Link, нужны package/bundle ID, signing fingerprint,
assetlinks.json/AASA и владелец публикации. Web callback не служит мостом токенов
и сам по себе не возвращает в Flutter. Физическая приёмка остаётся отдельной.

PR остаётся Draft до реального email-сценария. Production/main не переключались
этой задачей; готовый кандидат и точные внешние зависимости передаются интегратору.
