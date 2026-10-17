# До изменений: Flutter 0.4.0+8

Источник: `62cc9a552ee468ab6c3c29b1e3dafbf72e85ebcb`. Это **новые синтетические host-рендеры старых Flutter-экранов**, а не снимки телефона или предоставленного капитаном эмулятора. Все 166 исходных tracked-файлов совпадают с Git blobs до и после тестов. В production-коде ничего не заменено; добавлены только два файла тестового harness.

18 render-проверок прошли: 12 экранов RU при 390×740dp/text1.0; площадки, магазин и кабинет при 320×740dp/text2.0 RU и KZ с длинными названиями. PNG содержат явную метку синтетических данных. Размеры и SHA256 — в [provenance.json](provenance.json).

Использован исходный Material/Roboto, загруженный из локального Flutter SDK, а не Ahem/Manrope. Только в тестовом host добавлен fallback Noto Sans Latin Extended для символов, в том числе ₸: это явная имитация Android system fallback. Размеры, веса, цвета исходной темы и production-файлы не изменены. Точное растровое отображение шрифта на реальном устройстве может отличаться. На экране площадки проверен настоящий fallback без поддерживаемого WebView, а не работающая 3D-сцена.

| Экран | До, RU390/1.0 | После, RU390/1.0 |
|---|---|---|
| Площадки | [PNG](venues-ru-390-x1.0.png) | [PNG](../visual-050/venues-ru-390-x1.0.png) |
| Площадка / fallback | [PNG](venue-ru-390-x1.0.png) | [PNG](../visual-050/venue-ru-390-x1.0.png) |
| Магазин | [PNG](shop-ru-390-x1.0.png) | [PNG](../visual-050/shop-ru-390-x1.0.png) |
| Заявка | [PNG](inquiry-ru-390-x1.0.png) | [PNG](../visual-050/inquiry-ru-390-x1.0.png) |
| Главная CRM | [PNG](dashboard-ru-390-x1.0.png) | [PNG](../visual-050/dashboard-ru-390-x1.0.png) |
| Продажа | [PNG](sale-ru-390-x1.0.png) | [PNG](../visual-050/sale-ru-390-x1.0.png) |
| Долги | [PNG](debts-ru-390-x1.0.png) | [PNG](../visual-050/debts-ru-390-x1.0.png) |
| История | [PNG](history-ru-390-x1.0.png) | [PNG](../visual-050/history-ru-390-x1.0.png) |
| Аналитика | [PNG](analytics-ru-390-x1.0.png) | [PNG](../visual-050/analytics-ru-390-x1.0.png) |
| Итог дня | [PNG](daily-ru-390-x1.0.png) | [PNG](../visual-050/daily-ru-390-x1.0.png) |
| Мал базар | [PNG](market-ru-390-x1.0.png) | [PNG](../visual-050/market-ru-390-x1.0.png) |
| Профиль | [PNG](profile-ru-390-x1.0.png) | [PNG](../visual-050/profile-ru-390-x1.0.png) |

Для первых трёх экранов также сохранены `*-ru-320-x2.0.png` и `*-kk-320-x2.0-long.png`; соответствующие кадры «после» имеют те же имена в соседней папке visual-050.

## Воспроизведение

1. Экспортировать `git archive 62cc9a552ee468ab6c3c29b1e3dafbf72e85ebcb apps/mobile` в отдельную временную папку. Для побайтового сравнения учитывать автоматическую CRLF-конверсию Git archive на Windows.
2. Скопировать оба файла [harness](harness) в `apps/mobile/test/visual` этой временной копии. Production-исходники, pubspec и тему не менять. Harness добавляет fallback только к теме тестового host.
3. Flutter3.47.7/Dart3.13.5: из `apps/mobile` запустить команду ниже, заменив путь к SDK. Все HTTP-ответы — MockClient; тестовый транспорт запрещает методы кроме GET.

```text
flutter test test/visual/mobile_gallery_test.dart --update-goldens --dart-define=QADAM_GALLERY=true --dart-define=QADAM_BASELINE_FONT_DIR=<flutter-sdk>/bin/cache/artifacts/material_fonts --dart-define=QADAM_BASELINE_SYMBOL_FONT=<current-feature-checkout>/apps/mobile/assets/fonts/NotoSans-LatinExt.ttf
```

Вывод появится в `docs/reports/visual-040-before`. Тесты не используют учебные пароли и не обращаются к общему API.
