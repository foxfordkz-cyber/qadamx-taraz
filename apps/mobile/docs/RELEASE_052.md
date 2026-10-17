# Qadam 0.5.2+11 — исправления review #68

Продолжение [PR #60](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/60)
и существующей `feature/mobile-native-parity`.
Сохранены Главная / Площадки / Кабинет / Профиль и действующая нативная CRM.
Мал базар открывает существующую ленту из раздела площадок; это не новая площадка API.

## Конкретный APK

Source: **`79a29b9341b03e4ac3ffc58ebf6a06b00374d2f4`**.
Версия **0.5.2**, versionCode **11**, package **kz.qadam.qadam_mobile**.
Flutter **3.47.7**, Dart **3.13.5**, Android API24+, target36, ARM32/ARM64/x86_64.

[Скачать APK](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.5.2-review68.1/qadam-0.5.2-79a29b9-internal.apk) — **28 667 431 bytes / 27.34 MiB**.
SHA256: **`3ff67b9b916c061ab2b8a0b110c29fd4ab15fdc95d36e1643beddc91d1a334d6`**.
Прежний сертификат SHA256:
`9bd5b1febe523295d33cfb13ce1233834c5b09ae79729668067af993b245160f`.
Внутренняя Android Debug подпись; не подпись публикации в магазине приложений.
[Аудит APK](reports/mobile-052-apk-audit.json): ZIP CRC, v2/v3, zipalign16KiB,
ELF LOAD>=16KiB, 7/7 принятых asset hashes PASS; четыре публичных параметра совпали.
Известные credential patterns и приватные конфигурационные файлы не найдены.
Статический scan не гарантирует отсутствие любого возможного секрета.
[Публикация проверена](reports/mobile-052-release-verification.json): GitHub digest и
полное повторное публичное скачивание всех28 667 431байт совпали с локальным SHA256.

API: `https://qadamx-taraz.onrender.com/api/v1`.
Frontend: **`https://qadamx-taraz.pages.dev`**, обновлён в публичной конфигурации сборки.
Supabase: `https://pdjjdqgoitnkpgkbqjtp.supabase.co`, прежний publishable key.
Только четыре разрешённых публичных параметра; учётные данные и серверные ключи не включаются.

## Что нового именно после 0.5.1

- Графики: зелёная линия продаж и янтарная пунктирная линия поступлений; легенда рисуется
  геометрией, поэтому не зависит от отсутствующих символов шрифта.
- Заявка: получатель, обязательные поля, читаемые интервалы, короткая KZ-подпись контакта,
  единое заметное сообщение ошибки. При неизвестном результате повторяет прежний запрос.
- Публичные экраны и CRM используют общий компонент read-error, сохраняя отдельные
  сообщения об истёкшей сессии и смене точки.
- Список магазинов сортируется по номеру manifest; неизвестные точки остаются в конце.
  Все девять соответствий ID/slug/business_id сохранены.
- Учебные метки отделены от категорий янтарным оформлением; рамка 3D/fallback и
  явная подпись «Условная схема, не карта». Локальный renderer получил фон сайта;
  GLB, manifest, камеры и чужие web/3D-файлы не изменены.
- Длинные KZ-названия магазина/точки и приветствие помещают целое слово на строке.
  Системный text scaling сохранён. Основные кнопки магазина/заявки используют lime сайта.

Main `86ca9af15017b163a9e47335c68eee46ac2fafde` получен merge
`28c9b0aa57d31b10640cecb083fd2934bdbe0a34` только в мобильную ветку.
Production/Preview не переключались. Отдельные коммиты исправлений:
`9a7e9ed` графики; `8dbb622` форма/ошибки; `d82d668` площадки;
`b67a20e` крупный KZ; `fa69adb` основные действия; `79a29b9` версия/ссылки.

## Проверка review #68

«Исправлено» означает код и указанные доказательства, **не принятие Абзалом или телефоном**.

| P2 | Решение | Доказательство |
|---|---|---|
| #2 учебные бейджи | warning/soft/line из токенов сайта, в том числе Мал базар | [магазин](reports/visual-052/shop-ru-390-x1.0.png), [Мал базар](reports/visual-052/market-ru-390-x1.0.png) |
| #3 порядок точек | Стабильная сортировка по проверенному manifest, неподтверждённые — в конце | `point_order_test.dart`: все9, обратный порядок API, mismatch и неизвестные |
| #4 условная схема | scene-sky, рамка/radius20, warning-подпись; один3D либо poster | [fallback](reports/visual-052/venue-ru-390-x1.0.png); физический WebView не проверен |
| #5 легенда | Canvas-образцы сплошной/пунктирной линии вместо Unicode | Pixel-test цветов и1/3сегментов; [график](reports/visual-052/analytics-ru-390-x1.0-daily.png) |
| #6 цвета | Продажи green, поступления chart-amber `#b36d20` | Тот же pixel-test и рендер, signed/null сохранены |
| #7 заявка | Получатель, required*, отступы, Notice(error), явный retry | [форма](reports/visual-052/inquiry-ru-390-x1.0.png); widget503→retry с равным исходным телом |
| #8 ошибки | Общий ReadError→Notice, retry и auth-specific сообщения | [галерея](reports/visual-052/README.md), CRM failed-read без ложных нулей |
| #9 KZ320×2 | Размер только заголовка адаптируется к длине слова; body/scaler не ограничены | [магазин](reports/visual-052/shop-kk-320-x2.0-long.png), [кабинет](reports/visual-052/dashboard-kk-320-x2.0-long.png); тест реального RenderParagraph |

## Сайт → Flutter → API → доказательства

Сравнение с **опубликованным pages.dev**, а не предположение о deploy из main.
Просмотрен публичный путь главная→Кайкармет→food-магазин→каталог/форма без отправки.
JS `index-cqB5t7QT.js`, CSS `index-lZdhYnpt.css`; [доказательство ресурсов/токенов](reports/mobile-052-site.json).
SHA процесса хостинга независимо не подтверждён. Закрытый Vercel Preview не считается принятой версией.

Во всех строках ниже **физический телефон: не проверено**. «В APK» — наличие реализации;
mock/widget-тесты не доказывают живые операции.

| Сайт → Flutter | API / зависимость | В коде / APK0.5.2 | Поведение / оформление | Доказательство |
|---|---|---|---|---|
| Главная / площадки → PublicHome | GET venues | Да / да |4раздела, Мал базар внутри площадок, палитра/шрифт Qadam | Flutter RU/KZ320/360/390/412,1/1.3/2; предыдущий эмулятор0.5.1 |
| Площадка → VenuePage | GET businesses с venue/query/category | Да / да | Поиск, категории, стабильные номера, Back сохраняет контекст | Публичные widget-тесты; все9join/order |
| 3D → VenueViewer | Локальный manifest/GLB | Да / да | WebView только сцена; marker26/hit48, управление, timeout/fallback | Widget fallback; живые жесты/9маркеров не приняты |
| Магазин / каталог → PublicShopPage | GET shop по slug | Да / да | Нативная шапка, номер, каталог/null-цена, CTA | Галерея и widget-путь; фото/контакты API отсутствуют |
| Заявка → InquiryForm | POST inquiry, client_request_id; публичного lookup нет | Да / да | Явная отправка, тот же ID/body при retry, draft сохранён | Unit/widget unknown→422/restart/retry, двойное нажатие, account change; живой отправки в этой версии нет |
| Вход / профиль / точка → Supabase SDK + BusinessAccess | SDK session/refresh + GET me | Да / да | Вход/выход, zero-membership/email, выбор своей точки | Автотесты A/B/epoch/late-response; реальный A/B в этом APK не проверен |
| Регистрация / confirmation / resend / reset | PR43: URI приняты mobile, allowlist/handler/email ещё не готовы | Нет / нет | Невключённая зависимость, без фиктивной регистрации | [Согласование URI и gates](AUTH_CALLBACK_HANDOFF.md) |
| Главная продавца → CrmDashboard | GET server summary | Да / да | Основное действие, серверные4KPI, группы действий | Synthetic галерея/failed-read tests |
| Продажа / AI / голос → CrmEntryPage/OperationForm | Действующие draft/operation API | Да / да | Preview/edit/confirm, pause/import/playback, явная отправка | Synthetic tests cancellation/late response/unknown paid; микрофон и платныйAI не проверялись |
| Клиенты → CustomersPage | GET/POST customers + recovery; PATCH отсутствует | Да / да, редактирования нет | Поиск/create/серверный баланс; неизвестный ответ восстанавливается | Recovery/изоляция в полном наборе |
| Долги / история → LedgerPage | Operations/payments/reverse, customer IDs capability gate | Да / да | Серверные суммы, вторичная отмена, пакетные имена | Gate/100IDs/mismatch/epoch tests; живые деньги не запускались |
| Итог дня / аналитика → DailySummaryPage/AnalyticsPage | Summary/analytics7/30 | Да / да | Графики, таблица, signed receipts/nullaverage, user dates | Pixel/layout/модельные тесты, галерея |
| Входящие / каталог продавца | GET/PATCH inquiries; каталог только GET | Да / да | Разрешённые статусы; неработающих product edit/create кнопок нет | Код/синтетические тесты; методы товаров — backend-зависимость |
| Мал базар → прежние native screens | Livestock API, multipart через FastAPI | Да / да | Лента/фото/формы/статусы/фильтры/статистика | Прежние сценарии сохранены, полный regression; физические фото/публикация не приняты |

## Проверки и ограничения

- `flutter analyze --no-pub`: **0 issues**.
- `flutter test --no-pub --concurrency=1`: **231 PASS / 1 opt-in skipped**.
- Галерея: **76 widget-сценариев, 82 PNG**; входит в общий набор, не суммировать дважды.
  [До/после и экраны](reports/visual-052/README.md). Просмотрены отдельно форма, магазин,
  график, схема и KZ320×2 с длинным именем.
- Физическая приёмка **не выполнена**: перед запуском эмулятора ADB устройств не обнаружил.
  На прежнем изолированном Android SDK AVD (Android7/API24/x86_64) прошло
  обновление0.5.1+10→0.5.2+11 через install-r без удаления/очистки.
  Запуск, серверная публичная главная и перезапуск PASS.
  [Протокол](reports/mobile-052-emulator.json), [снимки](reports/android-052/README.md).
  Магазин/форма/3D в новом APK отдельно не повторялись; прежний прогон0.5.1
  не переименовывается в приёмку0.5.2. Реальный A/B, камера/микрофон и сохранение
  настоящих session/pending при обновлении не проверены.
- Не было живых финансовых действий, платныхAI, внешних заявок, смены memberships
  или конфигурации общего Auth. Пароли/JWT/ключи не переносились через URL.

Конкретные оставшиеся условия: владелец PR43/капитан — фиксация общего контракта,
exact allowlist и живое письмо; mobile — реализация native handler/screens после
согласования; @ab0ka — [повторное визуальное review запрошено](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/60#issuecomment-6236426229);
backend — customer PATCH, product POST/PATCH, поля фото/контактов магазина и фото товаров.
Пакетный customer lookup не угадывает поддержку по версии0.6.2: проверяет capability
и отбрасывает незапрошенные ID; при ошибке не подставляет первую страницу клиентов.

Пользовательский инцидент «ошибка пакета» **открыт**: нет модели телефона,
Android и точного кода Package Manager. Не предлагать удаление приложения первым шагом.
Реальные сессия/pending при обновлении и физический микрофон не приняты.
Старый recording.webm не искали; его инцидент не закрыт.


## Новое согласование Auth после сборки

Владелец43 предложил точные URI; mobile [принял их](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/43#issuecomment-6236483616).
[Мобильная часть договора](AUTH_CALLBACK_HANDOFF.md). В APK0.5.2 нового callback
ещё нет; allowlist и настоящий возврат не подтверждены. Source/checksum APK не изменились.
Автоматический Vercel check сообщил free deployment rate limit; вручную web не разворачивали,
хостинг/тарифы не меняли. Это отдельный check, не ошибка Flutter-сборки.
