# Inquiry accessibility — isolated browser artifacts

Source branch: `feature/public-inquiry-accessibility`, based on `86ca9af15017b163a9e47335c68eee46ac2fafde`.
Run: `npm exec -- playwright test --config e2e/inquiry-accessibility.playwright.config.ts`.

These screenshots show the actual ShopPage and InquiryForm with synthetic API fixtures on localhost. The catalog is deliberately empty and the shop name deliberately long. RU/KZ interface labels come from the application; the synthetic shop name/description are unchanged data, not translated seed. No production data, seller login or real inquiry is used. All external origins are blocked; traces/videos are disabled.

- `form-ru-1440.png`: desktop, filled form, empty catalog.
- `form-ru-390.png`: mobile viewport, RU.
- `form-kk-360.png`: mobile viewport, KZ.
- `unknown-ru-390.png`: failed response, retained fields and explicit retry.
- `success-ru-390.png`: confirmed synthetic receipt and current recipient.

Desktop Chromium with software WebGL and mobile viewport sizes is not a physical phone or a screen-reader acceptance test. Backend inbox ownership is not simulated as proof of server isolation. See the [handoff](../../../../docs/handoffs/public-inquiry.md) for exact boundaries and verification.
