# Flutter 0.5.2 — галерея исправлений review #68

Настоящий рендер Flutter, **синтетические данные**. Это не снимки физического
телефона и не доказательство входа/денежных операций. Данные не отправляются в API.
Команда: `flutter test --no-pub test/visual/mobile_gallery_test.dart --concurrency=1 --update-goldens --dart-define=QADAM_GALLERY=true --dart-define=QADAM_GALLERY_DIR=visual-052`.

До: [0.5.1](../visual-051/README.md), [независимый review 0.5.0](../../../../../docs/FLUTTER_050_VISUAL_REVIEW.md).
После: снимки ниже; source сборки указан в [release](../../RELEASE_052.md).

| Экран | Обычный размер | KZ 320dp, масштаб 2.0 |
|---|---|---|
| Главная | [RU 390](home-ru-390-x1.0.png) | [KZ](home-kk-320-x2.0-long.png) |
| Площадки | [RU 390](venues-ru-390-x1.0.png) | [KZ](venues-kk-320-x2.0-long.png) |
| Площадка / fallback | [RU](venue-ru-390-x1.0.png) | [KZ](venue-kk-320-x2.0.png) |
| Магазин | [RU](shop-ru-390-x1.0.png) | [KZ, длинное имя](shop-kk-320-x2.0-long.png) |
| Заявка | [RU](inquiry-ru-390-x1.0.png) | [KZ](inquiry-kk-320-x2.0.png) |
| Главная кабинета | [RU](dashboard-ru-390-x1.0.png) | [KZ, длинное имя](dashboard-kk-320-x2.0-long.png) |
| Продажа | [RU](sale-ru-390-x1.0.png) | [KZ](sale-kk-320-x2.0.png) |
| Долги | [RU](debts-ru-390-x1.0.png) | [KZ](debts-kk-320-x2.0.png) |
| История | [RU](history-ru-390-x1.0.png) | [KZ](history-kk-320-x2.0.png) |
| Аналитика: дни | [RU](analytics-ru-390-x1.0-daily.png) | [KZ](analytics-kk-320-x2.0-daily.png) |
| Аналитика: часы | [RU](analytics-ru-390-x1.0-hourly.png) | [KZ](analytics-kk-320-x2.0-hourly.png) |
| Мал базар | [RU](market-ru-390-x1.0.png) | [KZ](market-kk-320-x2.0.png) |
| Профиль | [RU](profile-ru-390-x1.0.png) | [KZ](profile-kk-320-x2.0.png) |

Публичные состояния loading / empty / error также представлены PNG.
На виджетном хосте нет Android WebView: показан честный fallback. GLB/manifest не изменены.
