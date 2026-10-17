# 17 октября 2026 — Qadam 0.4.0, нативные публичные сценарии и расширение CRM

Отдельный [Draft PR #60](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/60),
ветка `feature/mobile-native-parity`. Сохранена предыдущая CRM8e7e475 и merge
origin/main1a541efb97ca402fb8165b5841bbbeff03afd4b1; повторный fetch перед передачей
подтвердил тот же main. Production, backend, БД, Supabase settings не изменялись.

**Source приложения: `62cc9a552ee468ab6c3c29b1e3dafbf72e85ebcb`.**
Flutter3.47.7 / Dart3.13.5, JDK21, AndroidSDK36. Версия **0.4.0+8**.
[Скачать APK](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.4.0-native.1/qadam-0.4.0-62cc9a5-internal.apk)
— **27731371 bytes** (26,45 MiB). SHA256:
`7aa48df10815168aaaf9ba1a208423c17b5782b77e9924cc42a07388719e15db`.
Package `kz.qadam.qadam_mobile`, minSdk24, targetSdk36, ARM32/ARM64/x86_64.
Внутренняя debug-подпись, тот же сертификат0.1.1/0.2.2/0.3.0/0.3.1.
Версия8 больше прежней7. Физическое обновление и сохранение данных **не проверены**.

Постоянные адреса в APK:
- API `https://qadamx-taraz.onrender.com/api/v1` (read-only OpenAPI0.6.2).
- Frontend `https://qadamx-taraz.vercel.app` — только публичная конфигурация;
  кабинет, магазины и формы работают во Flutter.
- Прежний SupabaseURL/publishable key; APK содержит только разрешённые публичные
  параметры. Пароли/серверные ключи в сборку не добавлялись и не приводятся здесь.

Сделано: нативные площадки/поиск/категории/магазины/каталог/заявки; encrypted inquiry
replay с прежним ID/body; неизменённые GLB/manifest с проверкой9hotspot→магазин,
локальным WebGL внутри ограниченного WebView и независимым poster/list. Продолжена
имеющаяся CRM: reverse с подтверждением и отдельным pending исходной операции,
итог серверного дня/дата, импорт аудио, пауза/resume/прерывание. Мал базар сохранён.

[Полная таблица сайт → экран → статус, включая точный состав0.3.1](../../apps/mobile/docs/SITE_PARITY.md).
[Граница3D/WebView](../../apps/mobile/docs/VENUE_VIEWER.md).
[Статический аудит APK](../../apps/mobile/docs/reports/mobile-040-apk-audit.json).
[Живые публичные GET](../../apps/mobile/docs/reports/mobile-040-public-readonly.json).
[Физический чек-лист команды](../../apps/mobile/docs/PARITY_ANDROID_ACCEPTANCE.md).

Проверки: analyze0issues;111unit/widget PASS; после последнего уточнения аудио ещё
13CRM/audio/widget PASS. Build release PASS(620,8с). ZIP CRC, apksigner v2/v3,
zipalign16k, ELF LOAD>=16KiB PASS;7asset hashes внутри APK совпадают. Сканирование
не обнаружило private config/credential patterns/старые trycloudflareURL. Это
статическая проверка, не доказательство live Auth или работы на конкретном Android.
Read-only HTTP: health200/OpenAPI0.6.2, фильтры3/3, соответствия9/9. Desktop renderer
3/3,320×340, выбор маркера; widget RU/KZ320px/textScale2/клавиатура/Back PASS.

**Ограничения:** ADB0устройств; физическая установка/обновление, камера/микрофон/
кодеки/AndroidWebView, A/B этого APK, перезапуск на телефоне и смена суток не выполнены.
Видео физической приёмки нет. Скриншот0.3.0 остаётся FAIL, причина неизвестна;
не удалять приложение/данные как первый способ исправления. Callback/allowlist/reset
ожидают [владельца Auth](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/43#issuecomment-6233319221),
регистрация/confirmation/resend/reset не включены, реального письма/возврата не было.
Текущий API не предоставляет фото/контакты магазина, фото/CRUD товара и изменения
клиентов; они не имитируются. Mac/Xcode нет, iOS binary не собран.

Живые финансовые операции и платные AI-пробы не запускались. Старый recording.webm
не искали, инцидент остаётся открытым. PR60 и прежние PR не сливались, приложение
не опубликовано в магазинах. Следующий шаг — выполнить физический чек-лист на
выделенном Android, затем решить перечисленные Auth/API-зависимости.

Воспроизведение из apps/mobile: `flutter pub get`, `flutter analyze --no-pub`,
`flutter test --no-pub`, `./tool/build_android.ps1 -PublicConfig config/public.local.json -Release`.
Конфигурация — только4публичных поля из README, файл ignored. Для3D: в
`tool/venue_viewer` выполнить `npm ci --ignore-scripts`, `npm run build`.
Для публичной read-only проверки: `python tool/verify_public_readonly.py`.

---

# 17 октября 2026 — APK 0.3.1, расследование отказа установки 0.3.0

Пользователь прислал скриншот Android: установка `qadam-0.3.0-434f791-internal.apk`
завершилась сообщением «App not installed as package appears to be invalid».
Это **FAIL установки на физическом устройстве**, а не выполненная приёмка функций.
Модель, версия Android и точный код Package Manager неизвестны; подключённого USB-устройства нет.

Проверены исходный APK и GitHub asset: размер 57263712 bytes и SHA256 совпадают;
ZIP CRC, apksigner v2, zipalign `-c -P 16 4` проходят. Все ELF LOAD в ARM64/x86_64
выровнены минимум на 16 KiB. Сертификат совпадает также с 0.1.1/45cabcb со скриншота;
старый versionCode=2, новый=6. Это не доказывает целостность файла на телефоне
или отсутствие иной установленной версии. Причина отказа пока **не установлена**.

Кандидат 0.3.1+7 сохраняет applicationId, сертификат и runtime-код. Использует
сжатые native-библиотеки с извлечением при установке (`useLegacyPackaging=true`)
и подписи v1/v2/v3. Это совместимый альтернативный способ упаковки по
[Android docs](https://developer.android.com/guide/practices/page-sizes#update-packaging),
а не доказанное исправление причины на телефоне. APK собран; статические проверки перечислены ниже. Успешная установка 0.3.1 на телефоне пока не подтверждена.
Не удалять установленный Qadam, не очищать его данные и не обходить ограничения установщика.
Backend, финансовая логика, API-конфигурация и production deploy не менялись.

## Кандидат APK 0.3.1+7

[Скачать 0.3.1](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.3.1-install.1/qadam-0.3.1-10f8c5a-internal.apk).
Source commit: **10f8c5aa8e374708fb2e4307c4dfb5f9198911d8**.
Файл **25837095 bytes** (24,6 MiB); SHA256:
**d616cabd26c7b02e6f4bd3b50e0fae9df184ff76d8cbc50de84e0ddb909f1f8e**.
Package `kz.qadam.qadam_mobile`, versionCode=7, minSdk=24, targetSdk=36.
Публичные постоянные Render/Vercel URL и прежний Supabase config сохранены.

- `tool/build_android.ps1 ... -Release`: PASS, assembleRelease 323,6с.
- `apksigner verify`: v2/v3 PASS; v1 отдельно проверена с override диапазона SDK23
  (это проверка подписи JAR, не поддержка установки на Android6). Сертификат прежний.
- ZIP CRC и zipalign `-c -P 16 4`: PASS. Все 12 native `.so` сжаты;
  `extractNativeLibs=true`, ELF LOAD >=16KiB; ARM32/ARM64/x86_64 сохранены.
- [Аудит APK](../../apps/mobile/docs/reports/mobile-031-apk-audit.json): public config
  найден, private configuration/server key patterns/trycloudflare — 0.
- Dart runtime и зависимости не менялись; прежние 95 unit/widget тестов и анализатор
  относятся к 0.3.0. Повторный полный mock-прогон не выдаётся за проверку установки.
- `tool/check_android_install.ps1`: PowerShell parse PASS; неправильная checksum
  и отсутствие ADB-устройства корректно останавливают установку. Положительный
  сценарий команды ещё не проверен. Скрипт не читает logcat/данные приложения/токены,
  не выводит serial/IMEI и не удаляет данные; сохраняет код `INSTALL_FAILED_...`.
- Эмулятор не дал результата установки: существующий образ API29 имеет только x86,
  запуск упёрся в память ПК, Package Manager не был готов. Загрузка подходящего
  API36/x86_64 не завершилась за ограниченное окно. Созданный тестовый AVD удалён;
  успешная эмуляторная/физическая установка **не заявляется**.

[Команда диагностики и чек-лист](../../apps/mobile/docs/NATIVE_ANDROID_ACCEPTANCE.md).
Следующее доказательство — установка 0.3.1 на устройстве пользователя либо точный
код отказа через ADB. Отказ 0.3.0 остаётся открытым, пока этого доказательства нет.
Draft PR #53 сохранён; main/backend/БД/production deploy/платный AI не менялись.

## Предыдущая передача: Qadam Business, native CRM 0.3.0+6

Текущая передача — Draft PR #53 (`feature/mobile-native-ai`, base `main`), после Draft #45/#50.
Код начат от `8ee78ae58e529e3e32c11082a425576b558b0f9e`; свежий main `ad63a00`
не содержит конфликтующих изменений mobile/контрактов. Main не сливался и не менялся нами.

## APK и конфигурация

Source commit APK: **434f791ea8725ec05844915947391ed57030cb55**.
Версия **0.3.0+6**, package `kz.qadam.qadam_mobile`, min Android 7.0 (API24).
Внутренний release-код с debug-подписью для командной установки, не для магазина.
[Скачать APK 0.3.0+6](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.3.0-native.1/qadam-0.3.0-434f791-internal.apk) — `qadam-0.3.0-434f791-internal.apk`, **57263712 bytes** (54,6 MiB).
SHA256: **80b26e9547d3747373b63eac978257862323e8a09548df4dd7b63268aa5b9309**. Подпись v2 проверена и совпадает с 0.2.2; формат/версия прочитаны из APK.
[Статический аудит APK](../../apps/mobile/docs/reports/mobile-030-apk-audit.json): постоянные URL и прежний public config найдены,
приватных файлов, credential-pattern совпадений и trycloudflare URL — 0. Это не проверка входа на устройстве.

- API: `https://qadamx-taraz.onrender.com/api/v1`.
- Кабинет: `https://qadamx-taraz.vercel.app` (отдельная браузерная сессия).
- Supabase: прежний проект; прежний publishable key берётся только из ignored public config.
  Значение ключа, пароли и токены в отчёт не включены. SDK обслуживает refresh/session.
- Допустимые параметры: API_BASE_URL, FRONTEND_BASE_URL, SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY. Server keys/паролей/AI keys в конфигурации нет.

## Реализовано нативно

| Возможность | Состояние кода | Физическая приёмка |
|---|---|---|
| Общая оболочка, RU/KZ, Supabase, выбор своей точки | Сохранено | Не выполнена |
| Главная: серверные продажи, поступления, общий долг, заявки | Добавлено; error/loading не становятся нулями | Не выполнена |
| Клиенты, поиск/пагинация, создание/recovery | Добавлено | Не выполнена |
| Ручная продажа, доплата, долги и история | Добавлено; подтверждение отдельно от предпросмотра | Не выполнена |
| AI-текст и голос, редактируемый черновик | Добавлено; клиент/продажа выбираются явно | Не выполнена; paid probe не запускался |
| Запись/стоп/прослушивание/отмена/удаление | Добавлено; стоп не отправляет аудио | Не выполнена |
| Аналитика 7/30, по дням/часам | Добавлено; signed receipts, null average, долг за всё время | Не выполнена |
| Заявки и опубликованные статусы | Добавлено через существующий PATCH | Не выполнена |
| Публичный каталог | Добавлен просмотр; запись не поддерживается общим API | Не выполнена |
| Мал базар: фото/лента/фильтры/статистика/статусы | Сохранено | Не выполнена |

Браузерный кабинет остаётся доступен как прежний путь до приёмки нативной замены.
Регистрация/параллельная авторизация не добавлены. Тема Qadam сохранена.

## Устойчивость и проверки

- Отправляемое действие защищённо сохраняется **до POST** с API/account/business/action.
  Неизвестный ответ сохраняет исходные URL/body/key. Другой аккаунт его не повторяет.
- Customer recovery `not_observed` не означает отказ. CAS не позволяет позднему K1
  очистить/заменить K2. Смена A→B→A отсекает старые ответы по epoch.
- Данные ответа операции сверяются с суммой, клиентом и типом подтверждённого запроса.
  Восстановленный receipt также проверяется до сообщения об успехе.
- Деньги — только int тиыны; unknown received остаётся null/пустым полем, не нулём.
- AI multipart содержит ровно text или audio. HTTP-клиент задаёт boundary; запрос только
  через backend и отдельную кнопку. Нет автоматического paid retry. Смена ввода/аккаунта,
  отмена и уход со страницы не позволяют старому ответу стать текущим черновиком.
- WAV PCM16, mono 16kHz: проверяются фактические RIFF-данные, размер <=8MiB и <=30с.
  Таймер останавливает запись на 29с; пауза не предлагается. Локальный файл удаляется
  при отмене/выходе; старые файлы после сбоя чистятся в выделенном private cache.
- `flutter analyze --no-pub`: **No issues found**. `flutter test --no-pub`: **95 PASS**,
  включая 20 новых CRM unit/widget. HTTP, микрофон и ответы AI в этих тестах подменены.
  Нет утверждения о живом AI, реальном микрофоне или финансовой записи по этим тестам.
- Flutter 3.47.7 / Dart 3.13.5; существующие зависимости не обновлялись. Добавлены только
  закреплённые record 7.1.2, audioplayers 6.8.1 и прямая зависимость http_parser4.1.2.
- `adb devices -l`: список пуст. Android-модель/версия не предоставлены. Установки,
  A/B на телефоне, камеры/микрофона/refresh/network-return и смены суток не было.
- Mac/Xcode отсутствует. iOS-проект и RU/KZ permission strings обновлены; IPA/подпись/
  микрофон/камера/Keychain на iPhone не проверены. Новые платные услуги не подключались.

## Запуск и передача

Из `apps/mobile`: `flutter pub get`, `flutter analyze`, `flutter test`.
В ignored `config/public.local.json` оставить только четыре разрешённых публичных поля.
`./tool/build_android.ps1 -PublicConfig config/public.local.json -Release` создаёт
`build/app/outputs/flutter-apk/app-release.apk`. Пароли вводятся отдельно в приложении.

Следующий шаг: пройти [короткий чек-лист Android](../../apps/mobile/docs/NATIVE_ANDROID_ACCEPTANCE.md)
и заполнить фактические результаты/модель/Android. Пока устройства нет, физическая приёмка
остаётся **НЕ ВЫПОЛНЕНА**. Видео живого сценария не снято и не подменено mock-видео.
Не очищать данные приложения при неизвестном результате. Конфликт ключа или неразрешимый
pending требует проверки команды; интерфейс не предлагает опасный обход новым ключом.
Обычная ещё не отправленная форма хранится в памяти открытого экрана; durable recovery
покрывает отправленное действие. После холодного запуска точку выбирают заново.

Render/backend/БД/миграции не менялись, платных AI-запросов в этой работе не было.
GitHub может автоматически собирать Vercel previews при push; вручную deployment не запускался.
Последний ранее подтверждённый командой Render Live — e699158b5238285fb02c85bc5d92c45a3cc4ca84,
а не новый результат проверки процесса. Deployment ID по-прежнему не предоставлен.
[Опубликованный review/handoff Render с полным SHA](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/ce9e25090566dbb668a2ab378ee23cddde51b51e/docs/RENDER_DIAGNOSTIC_REVIEW_20261017.md).
Старый recording.webm больше не искали; инцидент остаётся открытым без исходных данных.

---

Ниже — история предыдущих передач, её APK/проверки не относятся автоматически к 0.3.0.

# Mobile · единое приложение Qadam · API 0.6.2

## 2026-10-17 — постоянный APK и начало нативной CRM от актуального main

Новая работа начата от **8ee78ae58e529e3e32c11082a425576b558b0f9e**, проверены PR15/25
и remote mobile/recovery heads. Существующее приложение не переписывается.
[Матрица функций и этапы](../../apps/mobile/docs/NATIVE_CRM_PLAN.md).

[APK 0.2.2+5](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.2.2-hosted.1/qadam-0.2.2-96ef1c4-debug.apk),
source **96ef1c42ba341dc9fcdc6539d9ee499ab797c178**, **167895465 bytes**,
SHA256 **6b34d1f7abd01bea036fb02a2d1898f8905dd18b9e0d6d9577a88138b79bcf8f**.
GitHub asset digest совпадает; постоянные Render/Vercel URL проверены в APK,
7 config tests и подпись PASS. [Чек-лист](../../apps/mobile/docs/ANDROID_TEAM_HANDOFF.md).
Android не подключён: все физические шаги НЕ ВЫПОЛНЕНЫ. Сейчас CRM — браузерная;
нативны оболочка/Auth/выбор точки/Мал базар. С компьютера OpenAPI0.6.2 совпал с контрактом,
Vercel login200; это не авторизованная или Android-приёмка. Paid AI calls — 0.

## Передача участнику с Android — 2026-10-16

Подготовлена [инструкция участнику и протокол шести шагов](../../apps/mobile/docs/ANDROID_TEAM_HANDOFF.md):
установка → A/точка/кабинет → выход/B → фото и публикация под B → рынок/Сегодня/Продано
→ перезапуск с восстановлением сессии и данных. Включены прямая ссылка на APK,
commit/SHA256, поля модели/Android/времени/сети и результаты каждого шага.
Все шесть результатов **НЕ ПРОВЕРЕНЫ**: ADB снова не обнаружил устройство,
результаты от участника ещё не поступили. Модель и версия Android не выдумываются.
Инструкция готова к пересылке; отправка конкретному участнику не заявляется.

APK остаётся **0.2.1+4 / 4cc2f528f3e6cd45960b6c3be111a537c66d7e82**,
GitHub SHA256/размер сверены с передачей. Новых функций, сборки, живых HTTP-прогонов
или записей в API в этом этапе нет. Браузерная сессия отделена от Flutter;
приватные данные A не должны появляться под B, публичные объявления доступны всем.
Выбор точки после холодного запуска выполняется заново по текущему дизайну.
Пароли в передаче отсутствуют. PR #25 остаётся Draft.

## Окно завершено; следующий этап — Android, 2026-10-16

Пользователь разрешил возобновить живые запросы и подтвердил backend
**4e983b42a2a0466d2fc07e4de09becf87a8ef7d5 / API 0.6.2**. Адреса API и frontend,
Supabase URL и publishable key прежние. Rollout общей 0006 подтверждён передачей
backend `docs/customer-recovery-rollout-062:1ba7d40`; это не миграция, выполненная mobile.
В документах самого code commit 4e983b4 остались исторические адреса/ожидание окна;
используются последние адреса пользователя, старый конфиг не возвращается.

**21:38 UTC+5, только три анонимных GET с Windows ПК:** health200,
OpenAPI200/version0.6.2, frontend `/login`200. Девять используемых mobile маршрутов
и десять схем совпадают между контрактом 0737439, контрактом 4e983b4 и живым OpenAPI.
Recovery теперь присутствует в OpenAPI; Flutter этот маршрут не вызывает.
[Безопасный JSON проверки](../../apps/mobile/docs/reports/mobile-021-api062-readiness.json).

Полный законченный HTTP-прогон A/B **не повторялся**. Новых авторизаций,
публикаций, фото или статусных изменений в этой проверке нет. Прежние 55 HTTP /131
проверка остаются результатом API 0.6.1, не новой приёмкой 0.6.2 или Android.

**Android BLOCKED: `adb devices -l` снова пуст.** Установка, вход, выбор точки,
открытие системного браузера, публикация с камерой/галереей, «Есть сегодня»,
«Продано»/«Снять», восстановление сессии и видео на устройстве не выполнялись.
Фактическая смена суток по-прежнему не проверена.

Текущий APK **0.2.1+4**, source **4cc2f528f3e6cd45960b6c3be111a537c66d7e82**,
остаётся установочным кандидатом: URL и используемый контракт не изменились,
**пересборка не требуется и не выполнялась**. [Скачать APK](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.2.1-shell.1/qadam-0.2.1-4cc2f52-debug.apk).

Следующий шаг при появлении Android с разрешённой USB-отладкой — установить этот
APK и выполнить [приоритетные шаги](../../apps/mobile/docs/QADAM_SHELL_ACCEPTANCE.md),
затем полный [livestock checklist](../../apps/mobile/docs/ANDROID_ACCEPTANCE.md).
Пароли вводятся на устройстве; удалённый временный файл не восстанавливался.
PR #25/#15 остаются Draft. Main, backend, миграции и web этой задачей не меняются.

Ниже сохранена история: прежняя пауза снята сообщением пользователя, а результаты
0.6.1 не переносятся автоматически на новую версию сервера.

## Живая приёмка A/B завершена; окно обновления backend — 2026-10-16

**19:25:41–19:28:00 UTC+5: 55 HTTP-ответов / 131 проверка PASS с Windows ПК.**
Вход A/B, `/me`, HTTP refresh A, upload/replay, приватные/публичные фото,
публикация/replay без дубля, edit, confirm_today, sell, withdraw, фильтры
вида/места/рынка и demo-статистика count0/min=null/median=null прошли на API 0.6.1.
B получает 404 на все изменения записи A и private-фото. Sold исчезает из public,
остаётся у A; sold confirm_today — 409. Оба logout scope=local завершились 204.

Источник APK по-прежнему **4cc2f528f3e6cd45960b6c3be111a537c66d7e82**, версия 0.2.1+4;
исходники/публичный конфиг/сам APK в этой приёмке не менялись, пересборки не было.
Backend4f67e2c/API 0.6.1, контракт 0737439. Код API/схема/Recovery0006 не менялись.
Созданы два явно учебных объявления и одно безличное фото через FastAPI:
`673d28d5-78ba-469e-8d40-79de3a3db786` завершено sold,
`9cfb0665-8ab2-4c27-88c2-7ff3a39ddead` — withdrawn. Активных тестовых предложений
не осталось. Все 13 сохранённых намерений получили ответ, **pending=0**.
Пароли в Git/APK/отчёт не включались; временный файл с ними **удалён**.

[Полный протокол и ограничения](../../apps/mobile/docs/LIVE_HTTP_ACCEPTANCE_021.md),
[JSON проверок](../../apps/mobile/docs/reports/mobile-021-authorized-http.json).
Проверялся отдельный HTTP-клиент, не Flutter SDK/устройство. Android отсутствует,
APK не устанавливался, видео не записано; камера, реальная потеря сети,
session restore в приложении и фактическая смена суток **не проверены**.
Положительный minimum и отсутствие побочной записи денежного журнала отдельно
не аудировались. Учебные объявления исключены из статистики; null не заменяется 0.

По запросу пользователя живые проверки **приостановлены** до сигнала после
обновления backend 0.6.2. [Mobile сообщил «окно открыто» в PR #22](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/22#issuecomment-6217708616).
Все подагенты этого чата завершены; готовность других участников отдельно
не подтверждена. Во время паузы только документация/Git, новых API-запросов нет.
Результаты 0.6.1 не выдаются за приёмку 0.6.2. PR #25/#15 остаются Draft.

Ниже — результаты предыдущих этапов с их временем; прежнее ожидание паролей
закрыто этой HTTP-приёмкой, физическая приёмка остаётся невыполненной.

## Qadam 0.2.1 — восстановленные адреса, 2026-10-16

По поручению пользователя обновлены **оба** build-time параметра в игнорируемом
`apps/mobile/config/public.local.json`. Supabase URL и publishable key сохранены
без изменений. Версия повышена до **0.2.1+4** для различения APK с разными адресами.
Логика приложения не менялась; backend, миграции и web не изменялись.

```text
API_BASE_URL=https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1
FRONTEND_BASE_URL=https://negotiations-exist-newman-ohio.trycloudflare.com
SUPABASE_URL=https://pdjjdqgoitnkpgkbqjtp.supabase.co
```

В `FRONTEND_BASE_URL` передаётся origin без `/login`. Кнопка кабинета открывает
`/seller` в системном браузере; сайт направляет неавторизованного пользователя на
`/login`. Витрина — `/`. Токены и пароли не передаются через URL.
Supabase publishable key — прежний публичный ключ капитана, не серверный секрет.
Адреса остаются временными, зависят от процессов/сети ПК команды.

Повторно прочитаны изменившиеся README/PROJECT_STATUS/DECISIONS, актуальные
FLUTTER_CONNECTION, VOICE_HTTPS_RESTORED и backend handoff на
**0737439915c17e8d8f20cddcbe9e75bebede9b46**. AGENTS, team mobile и контракты
не изменились. Подтверждённые пользователем и документацией версии:
backend **4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5**, API **0.6.1**,
frontend **7f511ddc8f3dc0a6fc1550566b9ead9abbfb98ce**.
Это сведения команды о процессе; git hash из HTTP не выводится.
**Recovery/0006 не включены**, общая Supabase не изменялась. Клиент новых
recovery-маршрутов не вызывает; в живом OpenAPI они отсутствуют.

### Новые проверки с компьютера — отдельно от Android

**16 октября 2026, 18:50 UTC+5:**
- 6 read-only HTTP: health200, OpenAPI200/0.6.1 со совпадающим `/me`, anonymous
  `/me`401; frontend `/login`, `/seller`, `/` — 200. Прежний HTTP530 по старым
  туннелям не переносится на эти новые адреса.
- 10 запросов Dart public probe с production DTO-валидатором — **PASS**:
  лента (1 явно demo-объявление), карточка, фильтр вида/места/рынка, пустой чужой
  рынок, статистика `sample_count=0 / min=null / median=null`, JPEG1934798байт,
  private-photo без Bearer401 и «Мои» без Bearer401. Нулевой минимум не подставлялся.
- `flutter test --no-pub test/config_test.dart test/ios_build_config_test.dart`
  — **7/7 PASS**. Это конфигурационные fixtures, не живой вход.
- `dart run tool/build_ios.dart config/public.local.json validate` — PASS,
  iOS build не выполнялся. Полные 75 тестов оболочки — результат предыдущего
  исходного commit f9651a3; в этом изменении UI/transport не менялись.

`adb devices -l` снова пуст: физический Android не подключён. Закрытая инструкция
с паролями A/B пока не передана/не указана; запрошен путь к локальному файлу, без
публикации паролей в чате/Git. Поэтому **живой вход A/B, публикация/Есть сегодня/
Продано, права владельцев, Android и видео пока НЕ проверены**. GET401 не является
проверкой изоляции A/B. Реальный HTTP с компьютера не считается установкой APK.
Фактическая смена суток не проверялась, часы БД не менялись.

### APK 0.2.1

- Исходный commit: **4cc2f528f3e6cd45960b6c3be111a537c66d7e82**.
- `tool/build_android.ps1 -PublicConfig config/public.local.json`: exit0,
  assembleDebug45.3сек. Pub разрешил прежние lock-версии; сообщения о трёх
  более новых несовместимых пакетах не являются обновлением зависимостей.
- `qadam-0.2.1-4cc2f52-debug.apk`: **167895469 bytes**, 0.2.1+4,
  package `kz.qadam.qadam_mobile`, Android7+/minSdk24/target36,
  ABI ARM32/ARM64/x86_64, debug-подпись.
- SHA256: `3b94829b6618eebc6aff56fd7cd2166b003ede7ef926677821e9bc061335f993`.
- apksigner verify v2 и zipalign16KiB — PASS. Статический ZIP/pattern audit:
  553entries, приватных config/env и совпадений с форматами серверных ключей нет.
  Пароли/серверные ключи не подавались в build inputs.
- Проверено содержимое compiled kernel: **все четыре публичных значения есть,
  оба прежних hostname отсутствуют**. Supabase URL/key сохранены прежними.
- [APK для скачивания](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.2.1-shell.1/qadam-0.2.1-4cc2f52-debug.apk)
  и [предварительный выпуск mobile-v0.2.1-shell.1](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/tag/mobile-v0.2.1-shell.1).
  Выпуск содержит SHA256, статический audit, два новых HTTP-отчёта и сценарий Android.
  Старые APK сохранены, но содержат старые URL и не заменяют эту сборку.

PR #25 остаётся Draft, база и PR #15 не меняются. Последующий docs commit не
изменяет исходный commit APK. Установка на устройство не выполнялась.
[Сценарий Android](../../apps/mobile/docs/QADAM_SHELL_ACCEPTANCE.md) обновлён.
Старый pending при смене API origin не удаляется и не отправляется на новый URL;
неизвестный результат восстанавливается с командой по прежнему ключу/телу.

Ниже — архив 0.2.0 и 0.1.1. Старые адреса и блокер530 относятся к прежним сборкам.

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
# Нативная CRM — этап 2, 17 октября 2026

База: main `8ee78ae58e529e3e32c11082a425576b558b0f9e`; продолжение после передачи APK 0.2.2.
В `apps/mobile/lib/crm` добавлены главная из server summary, клиенты с поиском и пагинацией,
создание клиента/recovery, ручная продажа и доплата, долги, история и просмотр заявок.
Сохранены три раздела, RU/KZ, общая тема, Supabase Auth, Мал базар и браузерный кабинет.

CRM write-intent записывается до POST в защищённое хранилище; область API/account/business/action.
Повтор отправляет исходные body/key/URL; неизвестный результат не очищается. `not_observed`
не является отказом. CAS защищает новый K2 от позднего K1, epoch — смену A→B→A.
Предпросмотр не выполняет запись; требуется отдельное подтверждение. Деньги только Dart int.

Проверки на компьютере: `flutter test --no-pub` — **84 PASS**, включая 9 новых CRM unit/widget.
Это mocked HTTP, не живое подтверждение финансовой операции. Анализатор проверяется перед commit.
Физическое устройство отсутствует. Android login A/B, камера, cold start, сеть/возврат и установку
новой нативной версии пока не проверяли. AI/аналитика — следующий отдельный этап.
Backend, миграции, main, Render не изменены; paid AI не вызывался.

---
