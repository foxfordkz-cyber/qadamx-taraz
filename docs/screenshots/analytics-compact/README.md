# Аналитика: мобильная компоновка после PR55

До — неизменённый `main` **1a541efb97ca402fb8165b5841bbbeff03afd4b1**.
После — `fix/analytics-mobile-compact` от той же базы. Chromium, реальное
приложение, явно обозначенный Demo со снимком 16.10.2026; живого API и записей нет.
Снимки сняты одним сценарием, с одинаковыми данными, шрифтом и высотой viewport:
1000 px для 1440/768, 844 px для 390/360. Это высота всего документа, не viewport.

| Состояние | До, px | После, px | До | После |
|---|---:|---:|---|---|
| RU 1440, 7 дней | 2567 | 2567 | [PNG](before/ru-1440-7.png) | [PNG](after/ru-1440-7.png) |
| RU 768, 7 дней | 3055 | 3055 | [PNG](before/ru-768-7.png) | [PNG](after/ru-768-7.png) |
| RU 390, 7 дней | 3729 | 3589 | [PNG](before/ru-390-7.png) | [PNG](after/ru-390-7.png) |
| RU 360, 7 дней | 3857 | 3687 | [PNG](before/ru-360-7.png) | [PNG](after/ru-360-7.png) |
| RU 390, пустой период | 4091 | 2313 | [PNG](before/ru-390-empty.png) | [PNG](after/ru-390-empty.png) |
| KZ 1440, 7 дней | 2567 | 2567 | [PNG](before/kz-1440-7.png) | [PNG](after/kz-1440-7.png) |
| KZ 768, 7 дней | 3070 | 3070 | [PNG](before/kz-768-7.png) | [PNG](after/kz-768-7.png) |
| KZ 390, 7 дней | 3824 | 3684 | [PNG](before/kz-390-7.png) | [PNG](after/kz-390-7.png) |
| KZ 360, 7 дней | 3926 | 3774 | [PNG](before/kz-360-7.png) | [PNG](after/kz-360-7.png) |
| KZ 390, пустой период | 4232 | 2386 | [PNG](before/kz-390-empty.png) | [PNG](after/kz-390-empty.png) |

Машинные замеры: [до](before/measurements.json), [после](after/measurements.json).
Горизонтального переполнения страницы нет. Фиксированная нижняя навигация на
full-page PNG остаётся у границы первого viewport и может перекрыть участок
длинного снимка; при обычной прокрутке она закреплена у нижнего края экрана.

В `apps/web`:

```powershell
$env:QADAM_COMPACT_SHOTS='./test-results/analytics-compact-shots'
npm.cmd run test:e2e -- --config e2e/analytics.playwright.config.ts analytics-compact.spec.ts --grep 'capture compact' --trace off
```

Для повторения «до» применить только файл screenshot-теста к отдельной чистой
копии 1a541ef; production source этой копии не менять. Обычный прогон пишет в
игнорируемый `test-results`, а не перезаписывает галерею. Физический телефон
не проверялся. [Результат и проверки](../../handoffs/seller-analytics.md).
