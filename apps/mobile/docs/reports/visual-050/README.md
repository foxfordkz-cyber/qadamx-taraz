# Qadam 0.5.0 — Flutter visual review

Actual Flutter widgets rendered by `flutter test` with the bundled application
fonts. Every image visibly says **synthetic data**. HTTP responses, account,
customer and financial values are fixtures. No real authentication or writes
occurred. These images are neither emulator screenshots nor phone acceptance.

Rendered on 17 October 2026 with Flutter 3.47.7 / Dart 3.13.5 against application
source `0c3f4a55ec0a137f5b0c2fdd9a8cca3b905c0e05`. Final gallery run: **62/62
passed, 68 PNGs**, including four chart and three public-state frames. The test
harness and this report are published in a following documentation/test commit.

The reproducible harness and commands are in
[test/visual](../../../test/visual/README.md). Image names include language,
logical width and system text scale. Default image height is 740 logical pixels;
the keyboard case is 568. Compare before/after at matching width and scale.

## First three screens, equal width

| Screen | RU 390 dp, scale 1.0 | RU 390 dp, scale 2.0 | Narrow KZ 320 dp, scale 2.0, long text |
|---|---|---|---|
| Venues | [Normal](venues-ru-390-x1.0.png) | [Enlarged](venues-ru-390-x2.0.png) | [Stress](venues-kk-320-x2.0-long.png) |
| Native shop | [Normal](shop-ru-390-x1.0.png) | [Enlarged](shop-ru-390-x2.0.png) | [Stress](shop-kk-320-x2.0-long.png) |
| Seller home | [Normal](dashboard-ru-390-x1.0.png) | [Enlarged](dashboard-ru-390-x2.0.png) | [Stress](dashboard-kk-320-x2.0-long.png) |

The directory also contains these three screens at all combinations of
320/360/390/412 dp and 1.0/1.3/2.0 in Russian, plus Kazakh 390/1.0.

## Other native screens

| Screen | RU 390 dp, scale 1.0 | KZ 320 dp, scale 2.0 |
|---|---|---|
| Venue fallback | [Normal](venue-ru-390-x1.0.png) | [Enlarged](venue-kk-320-x2.0.png) |
| Inquiry, unsent | [Normal](inquiry-ru-390-x1.0.png) | [Enlarged](inquiry-kk-320-x2.0.png) |
| Manual sale, unconfirmed | [Normal](sale-ru-390-x1.0.png) | [Enlarged](sale-kk-320-x2.0.png) |
| Debts | [Normal](debts-ru-390-x1.0.png) | [Enlarged](debts-kk-320-x2.0.png) |
| History | [Normal](history-ru-390-x1.0.png) | [Enlarged](history-kk-320-x2.0.png) |
| Analytics metrics | [Normal](analytics-ru-390-x1.0.png) | [Enlarged](analytics-kk-320-x2.0.png) |
| Daily chart | [Normal](analytics-ru-390-x1.0-daily.png) | [Enlarged](analytics-kk-320-x2.0-daily.png) |
| Hourly chart | [Normal](analytics-ru-390-x1.0-hourly.png) | [Enlarged](analytics-kk-320-x2.0-hourly.png) |
| Day summary | [Normal](daily-ru-390-x1.0.png) | [Enlarged](daily-kk-320-x2.0.png) |
| Livestock empty state | [Normal](market-ru-390-x1.0.png) | [Enlarged](market-kk-320-x2.0.png) |
| Profile | [Normal](profile-ru-390-x1.0.png) | [Enlarged](profile-kk-320-x2.0.png) |

Extra states: [loading](venues-ru-360-x1.3-loading.png),
[empty](venues-ru-360-x1.3-empty.png),
[error before explicit retry](venues-ru-360-x1.3-error.png),
[reachable inquiry button with keyboard inset](inquiry-ru-320-x2.0-keyboard.png).

The venue frames deliberately exercise the real unsupported-platform image
fallback. A working Android WebView/GLB scene, nine real marker taps, physical
microphone, camera, APK update and restored device session remain separate
acceptance tasks. A synthetic screenshot does not close those checks.
