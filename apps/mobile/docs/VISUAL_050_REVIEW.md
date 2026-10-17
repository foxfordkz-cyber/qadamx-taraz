# Qadam Mobile 0.5.0 — визуальная приёмка, 17 октября 2026

Это продолжение существующей Flutter CRM в Draft PR60, а не новый каркас.
В рамках мобильной работы backend, Render, Vercel, Supabase, memberships, БД,
web и принятые GLB не изменялись.

## Выпуск 0.5.0+9

[Скачать APK](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.5.0-visual.1/qadam-0.5.0-7b3a8ba-internal.apk) — **28335925 bytes (27.02 MiB)**.
Source приложения: `7b3a8bad757b13e0dc37d35d703e6a53cd4d9940`.
SHA256: `14f3f145ba68202611b7d0745bef8297a023fe7d23ec8bd5697688f3d9e3eccf`.
Package `kz.qadam.qadam_mobile`, versionCode **9**, minSdk24, targetSdk36,
ARM32/ARM64/x86_64. Прежний внутренний Android Debug сертификат:
`9bd5b1febe523295d33cfb13ce1233834c5b09ae79729668067af993b245160f`; v2/v3 PASS, это не store signing.
[Полный статический аудит APK](reports/mobile-050-apk-audit.json).

В сборке постоянные Render/Vercel URL и прежняя публичная Supabase-конфигурация.
Проверены четыре разрешённых значения; сканирование известных credential patterns,
private-role JWT, приватных файлов и старых tunnel URL не выявило совпадений.
Это статический аудит, не абсолютная гарантия отсутствия любого секрета.
Пароли и серверные ключи в APK не добавлялись.

**Новая физическая приёмка и запуск этого APK на эмуляторе не выполнены.**
ADB: 0 устройств. Package/certificate совпадают с 0.4.0, versionCode9 > 8;
обновление с сохранением данных требует телефона. Не удалять приложение для обхода ошибки.

## Проверки и галерея

- Analyzer: **0 issues**, 32.1с.
- Полный `flutter test --no-pub --concurrency=1`: **209 PASS, 1 skipped**, 74с.
  Пропущен только opt-in walkthrough, который отдельно выполнен — **1/1 PASS**.
  62 gallery cases входят в 209, не прибавляются повторно.
- IDs/runtime/Ledger: отдельно **32/32 PASS** — batching, лишние ID, capability errors,
  account/business/API isolation, поздние ответы, пагинация и повтор чтения.
- Build release: PASS, 134.4с. ZIP CRC, v2/v3, zipalign16KiB, ELF LOAD>=16KiB — PASS.
  7/7 хешей GLB/manifest/previews в APK совпадают с принятыми ассетами.
- [68 кадров после](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/7b3a8bad757b13e0dc37d35d703e6a53cd4d9940/apps/mobile/docs/reports/visual-050/README.md) и [18 кадров до](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/7b3a8bad757b13e0dc37d35d703e6a53cd4d9940/apps/mobile/docs/reports/visual-040-before/README.md).
  Первые три экрана: 320/360/390/412dp × text scale1/1.3/2; RU/KZ, длинные названия,
  большие суммы, короткий экран, клавиатура, loading/empty/error/retry.
- «До» — реконструкция из точного source0.4.0; 166 исходных файлов сверены с Git blobs.
  Это host-рендеры, не оригинальные скриншоты капитана.
- [Видео нативного маршрута](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.5.0-visual.1/qadam-050-flutter-synthetic-walkthrough.mp4): 35.97с, 390×740, монтаж12 контрольных кадров
  настоящей Flutter widget-навигации с синтетическим API. **Это не запись Android.**
  Нет реального входа, отправки заявки, денежных операций, камеры/микрофона или3D-жестов.
  UI source галереи/видео: `0c3f4a55ec0a137f5b0c2fdd9a8cca3b905c0e05`,
  отдельно от APK source. Позднейшие изменения: тесты/лицензии/отчёты и production ids gate.
- Остаточные замечания при320dp/text2.0: длинная шапка магазина уводит CTA ниже
  первого экрана; ₸ может переноситься отдельно; «Площадки» переносится внутри слова.
  Overflow не обнаружен. Прокрутка и читаемость требуют физической оценки.

[Чек-лист Android](PARITY_ANDROID_ACCEPTANCE.md). Видео и synthetic screenshots
не закрывают физическую приёмку. Полное визуальное/функциональное соответствие не заявляется.

## Зафиксированная база

- Исходная мобильная ветка: e48b54d2f2949519157d6907c001e66f1c020fb2.
- APK0.4.0+8: source62cc9a552ee468ab6c3c29b1e3dafbf72e85ebcb,
  SHA2567aa48df10815168aaaf9ba1a208423c17b5782b77e9924cc42a07388719e15db.
- origin/main после fetch:1a541efb97ca402fb8165b5841bbbeff03afd4b1.
  Уже включён в нашу ветку; работа была чистой, чужие изменения сохранены.
- Flutter3.47.7 / Dart3.13.5; AndroidSDK36 / JDK21.
- API https://qadamx-taraz.onrender.com/api/v1 — anonymous GET health200,
  OpenAPI0.6.2, 17.10.2026 13:20 UTC.
- Frontend https://qadamx-taraz.vercel.app. Production отдаёт
  index-BMQXppQw.js (SHA25611406049face7e5d4f4ba8fcd572ced032f6a7dcda6d9a971fa78856657e8ada)
  и index-C2MiuQKe.css (SHA256072f151771498fe29e09c962434ad941f8bb5fa74039fc47844b60654c900ba4).
  Их токены и 3 файла шрифтов совпали с принятой локальной базой.
- GitHub Vercel status main успешен, deployment DvMb7zzTZjWX418eKdJLYVUCTjDf.
  Management API403, preview защищён входом. **Точный SHA текущего production
  alias независимо не установлен**; main не выдан за runtime SHA.
- PR58/62 Абзала — предложения/Preview, не production-эталон.

## Переданное капитаном доказательство 0.4.0

Независимый Android-эмулятор1080×2400,density420,font_scale1.0:
площадки→Кайкармет→локальная3D→список→Демо Кайкармет food→каталог/форма,
также после перезапуска. Это предоставленный результат, не наш новый прогон.
Заявка не отправлялась, вход/CRM/деньги/микрофон не проверялись.
Сбой SystemUI/GooglePlay не квалифицирован как доказанный дефект Qadam.
Указанные PNG не найдены в доступных вложениях; не выдаём реконструкцию за них.
Состав0.3.1 и прежних выпусков сохранён в SITE_PARITY.md.

## Тема и границы компонентов

Токены из apps/web/src/shared/tokens.css: green#164C3E,lime#D7F36A,
paper#F5F3EB,ink#172A26,surface#FFFEFA,line#E1E2D8,muted#58685F.
Bundled Manrope + три Noto fallback; SIL OFL включены, 84 RU/KZ буквы
проверены cmap. Noto WOFF2 декодированы в TTF, сетевой загрузки шрифтов нет.
Шкала12/14/16/22/28, spacing4/8/12/16/24, края16, tap>=48.
System text scaling сохранён. Цвета задаются общей темой.
Четыре раздела показаны Бизнес/Мал базар/Площадки/Профиль; внутренние IDs0/1/3/2
сохранены. Вложенные маршруты читают текущий locale, имеют переключатель языка.

[Запрос согласования Абзалу @ab0ka](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/60#issuecomment-6234348740).
[Первые три экрана переданы с normal/large рендерами](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/60#issuecomment-6234529934).
Ожидается ответ; согласование не объявляется полученным.

## Матрица: production-сценарий → Flutter

В таблице «код» и «в APK» не означают живую приёмку. Артефакт зафиксирован выше. Все финансовые/AI/mock данные
визуальной галереи явно синтетические.

| Сайт → Flutter | Поведение / оформление | Код | APK0.4.0 | APK0.5.0 | Новая проверка | Зависимость |
|---|---|---|---|---|---|---|
| Главная → PublicHome | Нативные площадки, компактная карточка/Manrope/demo badge | Есть | Функция есть, старый визуал | Да | Flutter renders; baseline emulator от капитана | Ответ Абзала |
| Площадка → VenuePage | Поиск только в площадке, chips, номера точек, сохранение маршрута/фильтра | Есть | Есть, старый визуал | Да | Публичные GET и9mapping; Flutter layout | Android жесты |
| Сцена → VenueViewer | Один блок3D/poster,26px marker/48hit, явный режим управления, fallback/list | Есть | Есть, старые48px/duplicateposter | Да | Код/renderer; widget показывает fallback | AndroidWebView/все9тапов |
| Магазин → PublicShopPage | Один заголовок, категория, площадка/номер, CTA, компактный каталог | Есть | Есть, старый визуал | Да | Flutter renders с синтетикой | Фото/контакты отсутствуют вAPI |
| Заявка → InquiryForm | Постоянные подписи, контактная подсказка, явная отправка, warningBack | Есть | Есть, старый визуал | Да | Transport/widget; новой живой отправки нет | Публичного lookup нет |
| Главная продавца → CrmDashboard | Серверные4KPI, responsive tiles, выбранная точка | Есть | Показатели есть, текстовый вид | Да | Flutter synthetic renders | Настоящий вход наAndroid |
| Продажа/голос → CrmEntryPage/OperationForm | Запись/пауза/import/play, AI draft, редактирование/явныйconfirm | Есть | Есть | Да | Сохранённые race/recovery tests, visual | Физический микрофон, отдельный AI бюджет |
| Клиенты → CustomersPage | Список/поиск/create/recovery, server balance | Есть | Есть | Да | Mock recovery regression | PATCH клиента отсутствует |
| Долги → LedgerPage | Баланс сохраняется даже без имени, оплата через preview | Есть | Есть | Да | Mock/visual | Живые финансы отдельно |
| История → LedgerPage/ReverseOperationPage | Тип/даты/суммы, вторичная отмена с подтверждением | Есть | Есть | Да | Mock recovery+visual, ids runtime tests | Android runtime |
| Итог дня → DailySummaryPage | Дата, сегодня, server sums/negative, понятный формат | Есть | Есть, старый визуал | Да | Widget/visual | Нет новыхAPI |
| Аналитика → AnalyticsPage | 6KPI, signed charts день/час, выбор и таблица,7/30 | Есть | Данные есть, графиков нет | Да | Synthetic negative/null fixtures | Живая приватная приёмка |
| Заявки продавцу → InquiriesPage | Контакт/статус/разрешённый PATCH | Есть | Есть | Да | Mock/visual, без новой внешней отправки | Нет новыхAPI |
| Каталог продавца → CatalogPage | Чтение, nullable price, честный no-photo | Есть | Есть | Да | Mock/visual | POST/PATCH/фото товара отсутствуют |
| Auth → Профиль/BusinessAccess | Login/logout/SDK refresh, selectedpoint/zero membership | Есть | Есть | Да | Автоматическая изоляция | Android A/B |
| Signup/confirmation/resend/reset | Не включены без mobile callback | Нет | Нет | Нет | Не проверены | ВладелецPR43 |
| Мал базар → текущие native screens | Лента/фото/form/edit/status/stats, общая тема | Есть | Есть | Да | Сохранённые tests+visual | Androidcamera/permissions/daychange |

**Физический телефон: ни одна строка не проверена новым прогоном. Новый APK0.5.0 на эмуляторе также не запускался.**
ADB устройств не обнаруживает; доступный AVDAPI29x86 не запускался при нехватке RAM.
Widget-рендеры не доказывают WebView, микрофон, камеру или установку APK.
Предоставленный эмуляторный прогон относится только к0.4.0.

## Recovery и безопасность

Публичная форма сохраняет прежние validation100/200/2000 Unicode,
client_request_id/body, singleflight, account/business/API/epoch иCAS.
При unknown повтор только явный с исходными данными; initial definitive4xx
и unknown→4xx различаются. Локальный неподтверждённый ввод предупреждает приBack.
Деньги — Dart int тиыны, AI толькочерновик, null оплаты не заменяется0.
Нет автоматического повтора платного запроса; нет новых денежныхPOST в приёмке.

## Конкретные зависимости

| Владелец | Контракт / поле | Состояние / влияние |
|---|---|---|
| Backend, PR61 | customers?ids repeatedUUID, max100, Page,next_cursor:null | Rollout f6b3a9a94d8bf1c982344c05e0203dcb5bc6b8b5 принят по отчёту капитана; свежий anonymous OpenAPI GET13:45:30UTC подтверждает ids. В APK gate=true только для постоянного Render URL; другие API=false. Ответ с незапрошенными ID/неверной схемой отклоняется без fallback первой страницы. [Provenance](reports/mobile-050-customer-ids-rollout.json). SHA из панели капитана, management API нами не проверен, deployment ID неизвестен; A/B PASS взят из upstream отчёта, не нашего Android. |
| Auth PR43 @bekzatwr / @sarsenbaevaaidana07 | Mobile redirect/deep link, allowlist, email confirmation, reset | Ответ на запрос mobilecallback не получен. Не создаёмURI и не меняемSupabase. Нет реального письма/возврата. |
| Backend | PublicBusiness/ShopResponse фото/контакты; CatalogResponse фото; product POST/PATCH; customer PATCH | В принятом контракте отсутствуют; только честное чтение/placeholder, без вымышленных контактов или успеха |
| Абзал @ab0ka | Тема/площадки/магазин/главная | Передано наreview; productionтокены сохранены, моделей/id не меняли |

## Физическая передача

Обновлять поверх0.4.0 с темжеpackage/certificate, не удалять приложение.
Записать модельтелефона, Android, APKhash/source/versionCode, fontscale:

1. Установка -r и запуск; сохранены сессия и существующий pending.
2. A → выбратьточку → нативные клиенты/кабинет → logout → B: данныхAнет.
3. Площадки→фильтр→маркер икарточка→верныймагазин→каталог→форма→Back.
   Заявку отправлять только в отдельно согласованную учебную точку.
4. Все9маркеров; 3Dуправление/сброс/скролл; offlinefallback+обычныйсписок.
5. Малбазар: камера/галерея/отказразрешения→предпросмотр→явная учебнаяпубликация;
   Естьсегодня/Продано/Мои в согласованном сценарии.
6. Микрофон permission/record/pause/background/stop/listen/delete/import.
   Не нажимать платнуюAIотправку без отдельно согласованного бюджета.
7. Перезапуск/потерясети/возврат; шрифт1/1.3/2; keyboard/Back накороткомэкране.
Фактическая смена суток, iPhone и физическийupdate пока не проверены.

IDs rollout больше не blocker; runtime на телефоне ещё не проверен. Старый recording.webm не искали, инцидент остаётся открытым. Платных AI/денежных/внешних inquiry writes не было.

Воспроизведение: из apps/mobile выполнить `flutter pub get`, `flutter analyze --no-pub`, `flutter test --no-pub --concurrency=1`, `./tool/build_android.ps1 -PublicConfig config/public.local.json -Release`. Игнорируемый config содержит только API_BASE_URL, FRONTEND_BASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. [Галерея и walkthrough](../test/visual/README.md).
