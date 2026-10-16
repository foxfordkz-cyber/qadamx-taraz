# Mobile · Мал базар · API 0.6.1

## Версии и границы изменений

- Ветка: `feature/mobile-livestock-api`.
- Commit приложения: `45cabcb6174810bff7bb96ee0d3184abc253e978`.
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
