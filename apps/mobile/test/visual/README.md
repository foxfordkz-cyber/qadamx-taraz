# Actual Flutter visual review

These tests render the application's real Dart widgets with the bundled Manrope
and Kazakh fallback fonts. Every frame includes a visible synthetic-data label.
HTTP uses in-memory `MockClient`; all mutations are rejected. No external inquiry,
financial operation, Supabase login or paid AI request is made.

From `apps/mobile`, with the repository Flutter toolchain:

```powershell
flutter test test/visual/mobile_gallery_test.dart --concurrency=1
flutter test test/visual/mobile_gallery_test.dart --concurrency=1 --dart-define=QADAM_GALLERY=true --update-goldens
```

The second command writes PNGs to `docs/reports/visual-050`. To compare existing
images on the same host/Flutter engine, omit `--update-goldens`. `QADAM_GALLERY_DIR`
can choose another directory under `docs/reports` for a documented before/after
capture. The image name records screen, language, logical width and text scale.

The first three review screens (venues, shop, seller home) cover 320/360/390/412 dp
at 1.0/1.3/2.0. They also cover Kazakh at 390/1.0 and 320/2.0 with long text and
large money values. Remaining gallery screens cover RU 390/1.0 and KZ 320/2.0.
An additional 320×568 case checks inquiry keyboard reachability. No text scaling
is disabled in the application; the harness sets each requested test value.

Limitations: widget-rendered PNGs are not Android emulator/device acceptance.
The venue image is the honest unsupported-WebView fallback in this environment,
not proof that Android WebView, GLB gestures or all marker taps work. The livestock
screen uses an empty fixture; microphone and real photo picking are not tested.
No real customer names, contacts, tokens or credentials are stored in this gallery.

## Native route walkthrough frames

```powershell
flutter test test/visual/native_walkthrough_test.dart --concurrency=1 --dart-define=QADAM_WALKTHROUGH=true --dart-define=QADAM_SOURCE_SHA=<reviewed-full-sha>
```

The test taps real native navigation: venues → venue fallback/list → shop →
inquiry without submission → back → point selection → seller dashboard →
history → analytics → profile. It writes PNG milestones and a timing manifest
outside Git, by default to `work/mobile-parity-output/walkthrough050`.
`QADAM_WALKTHROUGH_DIR` can override that local output directory. Encoding these
frames creates a **synthetic Flutter widget walkthrough**, not an Android device
screen recording. Its visible watermark must stay in the video. No real login,
microphone, GLB interaction, financial action or inquiry submission is claimed.
