# Mobile · единое приложение Qadam · API 0.6.1

## Qadam 0.2.0 — отдельный этап оболочки, 2026-10-16

Ветка `feature/mobile-qadam-shell` от `1a93469`, база нового Draft PR —
`feature/mobile-livestock-api`. PR #15 и APK 0.1.1 не изменяются. Меняются только
`apps/mobile` и эта передача. Backend, web, миграции и main не менялись.

Согласованный объём к сдаче **17 октября 23:59 UTC+5**: «Мой бизнес / Мал базар /
Профиль», membership из `/me`, активная точка и системный браузер с HTTPS-кабинетом.
Время защиты неизвестно. Полная нативная CRM к этому дедлайну не обещается.

Сделано:
- Общая нижняя навигация; прежние Сегодня / Цены / Мои сохранены внутри Мал базара.
- `data/account_api.dart`: Bearer от общего Supabase SDK, GET `/api/v1/me`,
  проверка владельца/формата, безопасные ошибки, запрет redirect с Bearer.
- `business_access.dart`: только память текущей сессии, сброс на logout/смене
  аккаунта, отбрасывание поздних ответов включая A → B → A. Выбранная точка
  сохраняется при обновлении лишь пока она есть в новом ответе сервера.
- Пустой membership показан отдельно от сетевой ошибки. Livestock не зависит
  от магазина. Никаких новых write-маршрутов, клиентских балансов и продаж.
- `frontend_links.dart`: `LaunchMode.externalApplication`, фиксированные пути
  `/seller` и `/` от конфигурации. Нет WebView, JS, JWT или business ID в ссылке.
  Сессия и выбор точки браузера независимы; повторный вход явно объяснён.
- Существующее оформление Flutter перенесено в `ui/qadam_theme.dart`:
  цвета, типографические стили, интервалы, карточки/поля/кнопки/навигация.
  Сохранены RU/KZ, системный шрифт, масштаб текста. Проверены свежие handoff,
  PR #18 и SELLER_DESIGN_NOTES. Позже появился PR #24 / visual-3d handoff на
  e5ef1de: это web/3D, apps/mobile не затрагивается. Координация отправлена
  [в PR #24](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/24#issuecomment-6216379655).
  По указанию пользователя текущая Flutter-тема сохранена, новый дизайн не вводился.
- Публичный опциональный `FRONTEND_BASE_URL` разрешён новой задачей; только HTTPS
  origin без пути/query/fragment/userinfo. Остальные три поля прежние.
  Отсутствие web URL не ломает livestock. Build guards отклоняют лишние поля.

Прочитаны AGENTS/team mobile, актуальные OpenAPI/examples, livestock, архитектура
ledger, AI_INTEGRATION, ANALYTICS_API и передачи команды на
`origin/integration/seller-analytics-061` **13248851fd2b2a502aff211a506f71e85c2b0ab1**.
Backend handoff подтверждает процесс с кодом
**4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5** (checkout ca51bbf, отличия — docs).
Это подтверждение команды; HTTP OpenAPI не доказывает git hash процесса.
Frontend preview — код **5ab11b146778698f54164057974fc81c397192dc**; не путать с API.
PR #19 / `backend/customer-post-recovery` **737a559** сначала публиковал проект
контракта 0.6.2. Новый fetch получил **e441401** с реализацией и отдельными тестами
backend; handoff прямо указывает, что общая живая среда остаётся 0.6.1, rollout
0006 ещё не выполнен. Новые customer recovery маршруты здесь не вызываются.
Remote main передвинут командой на 1324885; эта задача main/ветки участников не меняла.

Публичные URL этой сборки (временные):
```text
API_BASE_URL=https://kelkoo-student-skiing-universal.trycloudflare.com/api/v1
SUPABASE_URL=https://pdjjdqgoitnkpgkbqjtp.supabase.co
FRONTEND_BASE_URL=https://crucial-funky-marion-barcelona.trycloudflare.com
```
SUPABASE_PUBLISHABLE_KEY — переданный капитаном publishable key, не серверный.
Локальный JSON игнорируется Git, не включается отдельным APK asset; пароли/серверные
ключи в сборку не передавались. После изменения временных адресов нужна пересборка.

Проверки исходников: `flutter analyze --no-pub` — без замечаний;
`flutter test --no-pub --reporter expanded` — **75/75 PASS** (64 прежних + 11 новых).
Синтетические HTTP/widget fixtures: membership, выбор/отзыв точки, logout/relogin,
поздний A → B → A, пустые точки с доступным livestock, RU/KZ 320px/увеличенный текст,
ошибки API/запуска браузера и URL без auth. Это не живая авторизованная приёмка.
`dart run tool/build_ios.dart config/public.local.json validate` — PASS;
iOS/Xcode/IPA не собирались (Mac отсутствует).

Первичная живая read-only HTTP-проверка с компьютера: health 200, OpenAPI **0.6.1** 200, `/me`
без авторизации 401, web `/login`, `/seller`, `/` 200. Совпадение схемы `/me`
с закреплённым контрактом подтверждено. Получение HTML не является проверкой
полного кабинета или открытия браузера на Android. Авторизованные A/B и физический
Android по-прежнему не проверены: пароли ожидаются закрытым каналом, устройства нет.
Публикация/камера/Есть сегодня/Продано/изоляция/смена суток и живое видео — не приняты.

**Повторная проверка 2026-10-16 13:14:48 UTC / 18:14:48 UTC+5:** все шесть
GET к API health/OpenAPI/me и web login/seller/root вернули **Cloudflare 530**.
На момент этой проверки Live недоступен. Запрос восстановления/актуальных URL
передан [backend/капитану в PR #18](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/18#issuecomment-6216322681).
Сборка содержит последние согласованные адреса; отсутствие туннеля не маскируется
demo-данными. Если origin изменится, нужен новый публичный конфиг и пересборка.

### APK 0.2.0 и Draft PR

**Код APK: f9651a336124b1cfb950d78a3eaacc6916415f2d**, версия **0.2.0+3**,
тот же package `kz.qadam.qadam_mobile`, имя Qadam, minSdk24/target36,
ABI ARM32/ARM64/x86_64, debug-подпись для внутренней установки.
`tool/build_android.ps1 -PublicConfig config/public.local.json` — exit 0.
Сборка ~179 секунд, прежнее предупреждение SDK XML v4/v3, без ошибки.
Файл `qadam-0.2.0-f9651a3-debug.apk`: **167895449 bytes (160.1 MiB)**.
SHA256: `d6147da5ced13c8d91f2cf49399e5be8a7b826ae6ec8f72af377149a22a3b4a9`.
apksigner verify v2 и zipalign 16 KiB — PASS. ZIP:553 entries, приватных
config/env файлов нет; сканер server-key/service-role/private-key/DB credential
форматов не нашёл совпадений. Все **четыре публичных значения** найдены в compiled
kernel, без вывода значений в отчёт сканера. Пароли и серверные ключи не подавались
в build inputs. Отсутствие совпадений не заменяет проверку исходного конфига.

[Draft PR #25](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/25), база
feature/mobile-livestock-api. PR #15 остаётся Draft с head1a93469; старый релиз
mobile-v0.1.1-test.1 сохранён. Новый APK передаётся отдельным предварительным
выпуском [mobile-v0.2.0-shell.1](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/tag/mobile-v0.2.0-shell.1).
Это не публикация в магазине и не завершённая приёмка.

Три [снимка UI](../../apps/mobile/docs/screenshots/qadam-shell) просмотрены:
RU Мал базар/Мой бизнес, KZ Профиль, 390×844. Жёлтая надпись на снимках явно
обозначает компьютерный fixture. QA-render использовал Segoe UI из Windows только
для снимков; приложение сохраняет системную Material типографику, шрифт не добавлен
в bundle. Это не скриншоты Android и не живые данные. QA harness находится в
игнорируемом build/qa_preview_test.dart; визуальные fixtures исходят из tests/support.
Повторный `adb devices -l` — пусто. Установка APK и живое видео не выполнялись.
[Физическая приёмка оболочки](../../apps/mobile/docs/QADAM_SHELL_ACCEPTANCE.md),
[полная прежняя приёмка livestock](../../apps/mobile/docs/ANDROID_ACCEPTANCE.md).

Оценка дальнейших **отдельно согласуемых** этапов для одного разработчика:
- A: клиенты/поиск/история/дневная сводка — 2–3 рабочих дня после приёмки оболочки.
- B: ручные продажи/доплаты/восстановление — ещё 3–5 дней, после утверждения и
  живой реализации customer POST recovery, с тестами атомарности/идемпотентности.
- C: AI текст/уточнение/подтверждение/аналитика — ещё 3–5 дней; голос и физическая
  Android-приёмка записи/playback/cancel/release mic — дополнительно 2–3 дня.
Оценки зависят от доступного API/аккаунтов/устройства; не обещание реализации до
17 октября. Продажа 3000/получено1000/доплата500 должна дать долг1500 и продажи3000;
эту денежную логику оставляем backend и web до отдельного нативного этапа.

Ниже — история предыдущего этапа 0.1.1 и iOS, её старые статусы не заменяют
сводку 0.2.0 выше.

# Mobile · Мал базар · Android / подготовка iOS · API 0.6.1

## Версии и границы изменений

- Ветка: `feature/mobile-livestock-api`.
- Commit переданного Android APK: `45cabcb6174810bff7bb96ee0d3184abc253e978`.
- Commit подготовки iOS: `9d2dcbdfdd360012187cb43e6c0c3f295ccd4ed0` (подробнее ниже).
- [Draft PR #15](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/15), base `backend/livestock`; PR не сливался, main не менялся.
- Контракт и инструкция прочитаны на [ca51bbf](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/ca51bbf/docs/FLUTTER_CONNECTION.md), включая LIVESTOCK_API, OpenAPI, JSON-примеры и актуальные инструкции команды.
- Backend-код, подтверждённый отчётом команды: `4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5`.
- **Точный commit текущего серверного процесса пока не подтверждён.**
  OpenAPI действительно отвечает версией 0.6.1, но это не доказывает hash процесса.
  [Запрос backend](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/17#issuecomment-6214954810).
  Commit общей web-сборки 5ab11b1 не использовался как commit API.
- Изменены только `apps/mobile` и этот handoff. Backend, миграции, общая web-сборка и БД не изменялись. Никаких merge, деплоя, платных услуг или публикации в магазинах.

## Реализовано

Лента сегодняшних объявлений, фильтры/карточка, Supabase SDK вход/session/refresh/logout,
камера/галерея, до трёх фото через FastAPI multipart `file`, форма, предпросмотр,
явная публикация, свои объявления, редактирование, confirm_today/sell/withdraw.
Нет отдельной авторизации, memberships для livestock или synthetic fallback.
Владелец определяется сервером по JWT; дата — сервером. Цена — Dart int в тиынах
за голову. Публикация не создаёт запись денежного журнала.

API 0.6.1: отдельное обязательное поле рынка, сохранение в черновике, предпросмотре
и JSON запроса; рынок в карточке/деталях. При отсутствующем/null market — «Рынок
не указан». Фильтр рынка передаётся вместе с населённым пунктом в feed/mine/prices.
Новый фильтр сбрасывает cursor/список; ещё не применённый ввод не меняет pagination.
Рынок — самоописание продавца, подтверждённый реестр не выдуман.

Минимум берётся только из `min_price_per_head_minor` сервера, не из первой страницы.
Null → **«Нет данных»**. Поле отсутствует в старом API → сообщение об отсутствии
поддержки. Минимум при count 1–4 не скрывается из-за insufficient_data медианы.
Показываются рынок, вид, дата/период, количество, цена за голову и подпись о цене
предложения. Учебные объявления помечаются и исключаются сервером из статистики.
Интерфейс RU/KZ.

Изменяющие запросы сохраняют аккаунт, URL, точный JSON/фото и UUID Idempotency-Key
до сети. Явный retry сохраняет исходное тело и ключ; legacy pending без market
не дополняется новым полем, явный null также сохраняется. Receipt хранится до
применения UI. A→B→A и ответы после выхода защищены поколением сессии. Фото для
повтора — AES-GCM снимок в private app folder, ключ в secure storage. Сессией
и refresh управляет Supabase SDK. Токены/пароли не логируются. Неизвестное
статусное действие не может быть принято редактором за успешную публикацию.

## Публичная конфигурация и запуск

Игнорируемый `apps/mobile/config/public.local.json` содержит ровно:
`API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
Значения получены от капитана/инструкции подключения. Файл не коммитится.

API_BASE_URL: https://kelkoo-student-skiing-universal.trycloudflare.com/api/v1

SUPABASE_URL: https://pdjjdqgoitnkpgkbqjtp.supabase.co

Публичный ключ передан, используется при сборке; серверных ключей, паролей,
DATABASE_URL, service_role или Gemini key в конфигурации нет.
Учебные данные входят отдельно в форму входа. Получены email-логины:
`owner-a@example.test` и `owner-b@example.test`. Пароли ожидаются отдельно через
закрытый канал; в приложение, Git, build inputs и отчёт они не добавляются.
Авторизованные запросы A/B пока не выполнялись.

```powershell
cd apps/mobile
flutter pub get
flutter analyze --no-pub
flutter test --no-pub --reporter expanded
dart run tool/check_public_api.dart config/public.local.json ../../../mobile-live-public.json
./tool/build_android.ps1 -PublicConfig config/public.local.json
flutter run --dart-define-from-file=config/public.local.json
```

Туннель временный: ПК капитана, FastAPI и cloudflared должны работать.
При ошибке приложение показывает ошибку соединения, не demo-замену.
После смены API origin старый pending блокируется до восстановления прежнего
подключения/результата командой; новый ключ не создаётся для того же намерения.

## Фактические проверки 2026-10-16

- `flutter analyze --no-pub`: **No issues found**.
- `flutter test --no-pub --reporter expanded`: **59/59 passed**.
- `dart format lib test tool`: 20 файлов, после форматирования 0 изменений.
- Тесты используют явно синтетические fixtures и SDK/HTTP-подстановки.
  Проверены durable retry/receipt, A/B isolation, refresh, деньги, encrypted
  фото, multipart, old/new optional DTO, сохранение market, legacy payload,
  minimum null/positive/unsupported, pagination рынка в feed и mine, RU/KZ,
  320 px, увеличенный текст и клавиатура. Это не живая Android-приёмка.

**Живые read-only GET с компьютера Flutter-разработчика**:
2026-10-16 16:53 Asia/Qyzylorda, отдельный Dart probe с production DTO-валидатором,
без подставных HTTP ответов, паролей и изменений сервера. Все 10 запросов прошли:

| Проверка | Реальный результат |
|---|---|
| health | 200, status ok |
| OpenAPI | 200, версия 0.6.1 |
| Публичная лента | 200, одна явно учебная запись |
| Карточка этой записи | 200 |
| Фильтр species + locality + market | 200, запись найдена |
| Другой рынок | 200, пустой список |
| Статистика учебного рынка | 200, count 0, minimum null, median null |
| Публичное фото | 200 JPEG, 1 934 798 байт |
| Приватное фото без входа | 401 |
| Мои объявления без входа | 401 |

Ненулевой минимум проверен только автоматическими fixtures, поскольку в живой
выборке demo исключены. Реальные объявления ради положительной статистики не
создавались. GET private 401 не является проверкой прав владельцев A/B.

Повторный прогон с компьютера **2026-10-16 12:26 UTC / 17:26 Asia/Qyzylorda**:
тот же публичный probe, **10/10 PASS**, API 0.6.1, одна demo-запись,
JPEG 1 934 798 байт, статистика count=0/minimum=null/median=null.
Это новое подтверждение доступности туннеля с компьютера, не входа A/B,
не запуска APK и не доступности с Android. Отчёт передаётся как
`mobile-live-public-api061-followup.json`.

## APK

По отдельному разрешению пользователя APK опубликован в **предварительном
выпуске GitHub**, чтобы команда могла скачать файл с другого компьютера/телефона:
[скачать APK 0.1.1](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.1.1-test.1/qadam-mobile-45cabcb-api061-debug.apk).
[Выпуск mobile-v0.1.1-test.1](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/tag/mobile-v0.1.1-test.1)
содержит APK, SHA256SUMS, сценарий Android и последний публичный HTTP-отчёт.
Tag указывает на commit приложения 45cabcb; это не готовность к приёмке и не
публикация в магазине. **PR #15 сохранён Draft**, main не менялся.
GitHub сообщает для загруженного APK тот же SHA256 и размер, что и локальная сборка.

Собран с `config/public.local.json`: `flutter build apk --debug`, exit 0.
**Все три переданных публичных значения найдены в compiled kernel APK**;
это новая сборка с подключением, в отличие от прежнего APK с пустым конфигом.

- Файл: `qadam-mobile-45cabcb-api061-debug.apk`, **167870725 bytes (160.1 MiB)**.
- Package: `kz.qadam.qadam_mobile`, version **0.1.1+2**, minSdk **24** (Android 7.0+),
  target/compileSdk **36**, ABI ARM32/ARM64/x86_64.
- SHA256: `e9eb36995eaecc6c1e8b755369076f95adf07ddefa51e0639d29fcaebb80afb7`.
- `apksigner verify`: PASS, debug-подпись v2; `zipalign -P 16 -c 4`: PASS.
- ZIP: 553 entries, приватных env/config-файлов нет, сканер известных форматов
  серверных ключей не нашёл совпадений. Пароли/серверные ключи в build inputs
  не передавались. Локальный JSON не входит в APK отдельным asset.
- SHA256 копии для передачи совпадает с результатом сборки. Код приложения
  соответствует commit выше; следующие commits handoff не меняют APK.
- Flutter 3.47.7 stable / Dart 3.13.5, JDK 21.0.9, SDK 36, build-tools 36.0.0,
  NDK 28.2.13676358, Gradle 9.3.1, AGP 9.1.0. На машине 8 GiB RAM;
  в изолированном GRADLE_USER_HOME задано `org.gradle.workers.max=2`.
- APK предназначен для внутренней установки, не для магазинов.

```powershell
adb install -r qadam-mobile-45cabcb-api061-debug.apk
```

Команда установки не выполнялась: физического Android нет. Сборка и статические
проверки APK не доказывают успешный запуск на телефоне.

## Устройство и незавершённая живая приёмка

Пользователь подтвердил, что **сейчас телефона нет**. `adb devices -l` не
обнаружил Android. Установка APK на физическое устройство не выполнялась.
Имеющийся AVD Pixel_4 — Android 29 x86 (32 bit), неподдерживаемый Flutter 3.47;
он не запускался. Другой эмулятор в этой задаче не создавался.

| Проверка | Статус |
|---|---|
| Доступность HTTPS с телефона | Не проверено: телефона нет |
| Вход A/B, восстановление сессии, выход | Не проверено: email получены, пароли ожидаются закрытым каналом; Android отсутствует |
| Камера/галерея → фото → публикация → мои | Не проверено на устройстве/с живой авторизацией |
| Есть сегодня, редактирование, снятие | Не проверено с живой авторизацией |
| Продано → исчезновение из public → остаётся в mine | Не проверено с живой авторизацией |
| B не редактирует A, private-фото владельца | Не проверено с живой авторизацией |
| Повтор без дубля при потере сети | Автотесты пройдены; живой сценарий не проверен |
| Рынок/фильтры и minimum null | Реальный HTTP + widget-тесты; телефон не проверен |
| RU/KZ, маленький экран, клавиатура | Widget-тесты; физическое устройство не проверено |
| Отказ камеры, Android process-death recovery | Не проверено на устройстве |
| Фактическая смена суток | **Не проверено**, часы БД не менялись |
| Видео живого Android-сценария | Не записано: нет устройства; пароли ожидаются закрытым каналом |

Для завершения: получить пароли учебных A/B через согласованный закрытый канал,
выполнить HTTP-проверки с компьютера; затем установить APK на Android и пройти
[сценарий физической приёмки](../../apps/mobile/docs/ANDROID_ACCEPTANCE.md).
В сценарии указаны шаги, ожидаемые результаты, отдельная матрица A/B HTTP,
условия проверки минимума, протокол устройства и план видео 60–90 секунд.
Приёмка на устройстве пока не выполнена. Подтвердить commit серверного процесса
у backend. **PR #15 остаётся Draft до приёмки**, merge/main не меняются.

## iPhone: подготовка 2026-10-16

По запросу пользователя в ту же feature-ветку добавлен iOS runner. Пользователь
подтвердил: **iPhone есть, Mac пока нет**. Поэтому подготовка исходников выполнена,
но native build, подпись и установка на iPhone **не выполнены**, IPA **не создан**.

Исходники iOS: commit `9d2dcbdfdd360012187cb43e6c0c3f295ccd4ed0`.
Папка `apps/mobile/ios`: шаблон Flutter 3.47.7, Xcode workspace/project,
AppDelegate/SceneDelegate, SwiftPM и стандартный CocoaPods fallback; deployment
target iOS 15.0, device family iPhone, bundle ID `kz.qadam.qadamMobile`.
Версия 0.1.1+2 берётся из pubspec. Иконка пока стандартная техническая Flutter.

Камера и фотобиблиотека имеют usage descriptions RU/KZ, подключённые к Resources.
Микрофон/геолокация и ATS-исключения не добавлялись. Keychain entitlement связан
только с этим bundle. Для сессии, черновиков и pending используется единая политика
unlocked_this_device без iCloud sync. Авторизация/API/Storage те же: новой серверной
реализации и новых маршрутов нет. Полные метаданные фото не запрашиваются.
После прерванного iOS picker форма восстанавливается без Android-only
retrieveLostData; предлагается повторный выбор фото.

`tool/build_ios.dart`: validate / prepare / simulator / device / run. Пропускает
в сборку только 3 разрешённых непустых публичных поля и HTTPS. Значения не
логируются; server keys, пароли и лишние поля отклоняются. Локальная Team ID
конфигурация и сертификаты/IPA исключены из Git. Неподписанный device `.app`
не считается установочным IPA.

Проверки подготовки на Windows:

| Проверка | Результат |
|---|---|
| Flutter analyzer | Без замечаний |
| Общие Dart/widget-тесты | **64/64 PASS**, синтетические fixtures |
| Новые iOS widget-сценарии | Прерванный picker, отказ камеры, отмена сохраняют форму и не публикуют запись; это mock платформенного канала, не работа камеры iPhone |
| Ограничения iOS build config | Автотесты разрешённых полей, public key, HTTPS и запрещённых URL прошли |
| Публичный конфиг `validate` | PASS без вывода значений |
| Попытка `device` на Windows | Ожидаемый код 69: требуется Mac/Xcode, артефакт не создан |
| Структура native-проекта | OpenStep parser 2.0.3: 65 объектов/ссылки; 5 plist/entitlements, 7 XML, RU/KZ ресурсы, 2 asset manifest — PASS |
| Xcode compile, Simulator, подпись | **Не выполнялись: Mac отсутствует** |
| Реальные Keychain, камера/HEIC, сессия, сеть, публикация на iPhone | **Не проверены** |

Команды Mac, настройка собственной Team, прямая установка и сценарий физической
приёмки: [IOS_SETUP.md](../../apps/mobile/docs/IOS_SETUP.md). Платные услуги,
TestFlight/App Store и облачная сборка не подключались. Android APK в опубликованном
выпуске остаётся сборкой 45cabcb; новые изменения исходников в тот файл не подменялись.
Следующий шаг: Mac с Xcode, локальная подпись и выполнение сценария на iPhone.
