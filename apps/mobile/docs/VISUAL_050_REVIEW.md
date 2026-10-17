# Qadam Mobile 0.5.0 — визуальная приёмка, 17 октября 2026

Это продолжение существующей Flutter CRM в Draft PR60, а не новый каркас.
Backend, Render, Vercel, Supabase, memberships, БД, web и GLB не изменялись.

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
Bundled Manrope + два Noto fallback; SIL OFL включены, 84 RU/KZ буквы
проверены cmap. Noto WOFF2 декодированы в TTF, сетевой загрузки шрифтов нет.
Шкала12/14/16/22/28, spacing4/8/12/16/24, края16, tap>=48.
System text scaling сохранён. Цвета задаются общей темой.
Четыре раздела показаны Бизнес/Мал базар/Площадки/Профиль; внутренние IDs0/1/3/2
сохранены. Вложенные маршруты читают текущий locale, имеют переключатель языка.

[Запрос согласования Абзалу @ab0ka](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/60#issuecomment-6234348740).
Ожидается его ответ по первым трём экранам; согласование не объявляется полученным.

## Матрица: production-сценарий → Flutter

В таблице «код» не означает живую приёмку. Новый APK и результаты сборки
фиксируются отдельно после проверки артефакта. Все финансовые/AI/mock данные
визуальной галереи явно синтетические.

| Сайт → Flutter | Поведение / оформление | Код | APK0.4.0 | Новая проверка | Зависимость |
|---|---|---|---|---|---|
| Главная → PublicHome | Нативные площадки, компактная карточка/Manrope/demo badge | Есть | Функция есть, старый визуал | Flutter renders; baseline emulator от капитана | Ответ Абзала |
| Площадка → VenuePage | Поиск только в площадке, chips, номера точек, сохранение маршрута/фильтра | Есть | Есть, старый визуал | Публичные GET и9mapping; Flutter layout | Android жесты |
| Сцена → VenueViewer | Один блок3D/poster,26px marker/48hit, явный режим управления, fallback/list | Есть | Есть, старые48px/duplicateposter | Код/renderer; widget показывает fallback | AndroidWebView/все9тапов |
| Магазин → PublicShopPage | Один заголовок, категория, площадка/номер, CTA, компактный каталог | Есть | Есть, старый визуал | Flutter renders с синтетикой | Фото/контакты отсутствуют вAPI |
| Заявка → InquiryForm | Постоянные подписи, контактная подсказка, явная отправка, warningBack | Есть | Есть, старый визуал | Transport/widget; новой живой отправки нет | Публичного lookup нет |
| Главная продавца → CrmDashboard | Серверные4KPI, responsive tiles, выбранная точка | Есть | Показатели есть, текстовый вид | Flutter synthetic renders | Настоящий вход наAndroid |
| Продажа/голос → CrmEntryPage/OperationForm | Запись/пауза/import/play, AI draft, редактирование/явныйconfirm | Есть | Есть | Сохранённые race/recovery tests, visual | Физический микрофон, отдельный AI бюджет |
| Клиенты → CustomersPage | Список/поиск/create/recovery, server balance | Есть | Есть | Mock recovery regression | PATCH клиента отсутствует |
| Долги → LedgerPage | Баланс сохраняется даже без имени, оплата через preview | Есть | Есть | Mock/visual | Живые финансы отдельно |
| История → LedgerPage/ReverseOperationPage | Тип/даты/суммы, вторичная отмена с подтверждением | Есть | Есть | Mock recovery+visual | ids rollout |
| Итог дня → DailySummaryPage | Дата, сегодня, server sums/negative, понятный формат | Есть | Есть, старый визуал | Widget/visual | Нет новыхAPI |
| Аналитика → AnalyticsPage | 6KPI, signed charts день/час, выбор и таблица,7/30 | Есть | Данные есть, графиков нет | Synthetic negative/null fixtures | Живая приватная приёмка |
| Заявки продавцу → InquiriesPage | Контакт/статус/разрешённый PATCH | Есть | Есть | Mock/visual, без новой внешней отправки | Нет новыхAPI |
| Каталог продавца → CatalogPage | Чтение, nullable price, честный no-photo | Есть | Есть | Mock/visual | POST/PATCH/фото товара отсутствуют |
| Auth → Профиль/BusinessAccess | Login/logout/SDK refresh, selectedpoint/zero membership | Есть | Есть | Автоматическая изоляция | Android A/B |
| Signup/confirmation/resend/reset | Не включены без mobile callback | Нет | Нет | Не проверены | ВладелецPR43 |
| Мал базар → текущие native screens | Лента/фото/form/edit/status/stats, общая тема | Есть | Есть | Сохранённые tests+visual | Androidcamera/permissions/daychange |

**Физический телефон: ни одна строка не проверена новым прогоном.**
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
| Backend, PR61 | customers?ids repeatedUUID, max100, Page,next_cursor:null | Candidate f6b3a9a94d8bf1c982344c05e0203dcb5bc6b8b5; неrollout. В liveOpenAPI13:12UTC ids отсутствует. Flutterметод+scoped resolver+tests готовы, production gate=false. Не маскируем capabilityerror первойстраницей. |
| Auth PR43 @bekzatwr / @sarsenbaevaaidana07 | Mobile redirect/deep link, allowlist, email confirmation, reset | Ответ на запрос mobilecallback не получен. Не создаёмURI и не меняемSupabase. Нет реального письма/возврата. |
| Backend | BusinessPublic фото/контакты; CatalogItem фото; product POST/PATCH; customer PATCH | В принятом контракте отсутствуют; только честное чтение/placeholder, без вымышленных контактов или успеха |
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
