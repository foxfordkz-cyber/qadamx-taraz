# Аудит remote-веток — 17 октября 2026

Получены все 96 remote heads. У 71 head является предком проверяемой интеграции. Это проверка Git-истории, не утверждение о deployment или повторном тестировании всех исторических PR.

Для остальных сверены subject и patch-equivalence (`git cherry`). Исторические варианты не сливаются вслепую поверх принятых замен. Новые активные исключения разобраны в [отчёте интеграции](TEAM_FINAL_INTEGRATION_20261017.md).

| Ветка | Зафиксированный SHA | Состояние |
|---|---|---|
| `origin` | `86ca9af15017b163a9e47335c68eee46ac2fafde` | Head включён в интеграцию |
| `assets/venue-models` | `11c4e459732b946d95960dcefbe3b58d43ddba40` | Старые модели заменены более новой принятой пересборкой |
| `backend/ai-drafts` | `2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c` | Head включён в интеграцию |
| `backend/ai-runtime-diagnostics` | `33cb37a23e5ae1cbde4f43b34d5ecd2629ad32ac` | Head включён в интеграцию |
| `backend/bootstrap-api` | `0a78ae06b3a46dbaf379ab1d07dacc74ff7ff6ed` | Head включён в интеграцию |
| `backend/canonical-markets` | `07ec11b3dc07c16ae004212c7f2d8d7548a09703` | Head включён в интеграцию |
| `backend/customer-ids` | `735145e15d13b7b7bc7022dc79dff2700fb65116` | Head включён в интеграцию |
| `backend/customer-post-recovery` | `acce3fd1ac83324cf55a4809d80847e53c950d18` | Head включён в интеграцию |
| `backend/integration-readiness` | `95f6087bc85c1a0763101088e6660c70cc4afa75` | Head включён в интеграцию |
| `backend/ledger-auth` | `193f6e527d716549d759d805dc4b86db1d9e059e` | Head включён в интеграцию |
| `backend/livestock` | `4c82fc3f1fb6aa8b9633f4a7b14b5e8632e5dd0e` | Head включён в интеграцию |
| `backend/openai-drafts` | `cba6b321be8ca27cce9ad8afd93b07c4539c6c60` | Head включён в интеграцию |
| `backend/public-localization` | `f2b662f964de133d20faf2d5d5afd8d797ac5ecf` | Head включён в интеграцию |
| `deploy-062` | `86ca9af15017b163a9e47335c68eee46ac2fafde` | Head включён в интеграцию |
| `deploy/permanent-062` | `86ca9af15017b163a9e47335c68eee46ac2fafde` | Head включён в интеграцию |
| `docs/customer-recovery-rollout-062` | `1ba7d406a5c0045de1633bb54bc67c26ae515d88` | Head включён в интеграцию |
| `docs/demo-names-ru-kz` | `6e8fc5d56c1daafbedb306df320e32dd3134f623` | Head включён в интеграцию |
| `docs/team-context` | `f548d272e87e5da910a779b44788cbff330ae71f` | Head включён в интеграцию |
| `feature/aidana-ai-assistant` | `880d7137f39648f0bbce355369ee3e755d981f02` | Старое ответвление AI UI; принята объединённая voice-реализация |
| `feature/apk-link-050` | `a468dd99237a32161eda22b4adff9bdb0a0fdae4` | Отложено: ссылка 0.5.0, требуется итоговый APK/телефон |
| `feature/cabinet-catalog-polish` | `d010f5e9d6bc85995ded9201f7817a3debd4ca37` | Head включён в интеграцию |
| `feature/fullstack-ready` | `d7acc9c7e7c265c637bedc220ab65423039695f4` | Head включён в интеграцию |
| `feature/home-venue-showcase` | `94d173478f2612ceb03d1bc7d44a1b7d03f999f7` | Head включён в интеграцию |
| `feature/livestock-price-sources` | `93525baddba583f85e7644f01e09e956496d45b3` | Отложено: источники и незапущенные Flutter проверки |
| `feature/mal-bazar-concept` | `9b18843edf7f5204bff0ce2776f488f4ddd9e26e` | Head включён в интеграцию |
| `feature/mobile-demo-price-fixtures` | `3b2d272b9dacdaa82d365f6434b537555daeb1c7` | Отложено: текст и незапущенные Flutter проверки |
| `feature/mobile-hosted-acceptance` | `cbb4d0c3ad71d661d3b9c1391443caf7daa0340c` | Head включён в интеграцию |
| `feature/mobile-livestock-api` | `1a93469f26a93fb12b7adb7158a1800009f0d257` | Head включён в интеграцию |
| `feature/mobile-native-ai` | `8e7e47528d8e8a722caa16a56b2131eb57e1fc39` | Head включён в интеграцию |
| `feature/mobile-native-crm` | `7fe9f73ee16e41f810b35f56ab7953741a60da62` | Head включён в интеграцию |
| `feature/mobile-native-parity` | `9a7e9ed135cda3730486aa24890d9e7885b811e8` | Head включён в интеграцию |
| `feature/mobile-qadam-shell` | `284cb77a21cb106442bd124ac03fe13e36211bfa` | Старое mobile направление; продолжение в PR60 |
| `feature/public-inquiry-accessibility` | `a3eff47a2f710463a00b5bb010045a91277e8ecf` | Head включён в интеграцию |
| `feature/public-inquiry-form` | `0f809e1c8e6368975bebe36aa2481a5c621ce4f0` | Старый storefront/inquiry; принят выборочный перенос и PR71 |
| `feature/public-polish` | `674e5d7f9678745902fba632e7f03c71618fc5a3` | Head включён в интеграцию |
| `feature/public-storefront` | `8818e8b73ecc2e2dd2f517f18796782b10d1872f` | Старый storefront; принят общий вариант с PR52/71 |
| `feature/sale-debts-polish` | `7d84cb6e63d02aa9ef4ad215d67284155bb0d012` | Head включён в интеграцию |
| `feature/seller-analytics` | `ce68f01e3fe4a6b9898fd68be8e3ef2e4c467ad1` | Head включён в интеграцию |
| `feature/seller-analytics-readability` | `3064294957625d39325bc0fdec4e9576c6e799fe` | Head включён в интеграцию |
| `feature/seller-dashboard` | `a77f1a02b240dbf9e8c627937a5cb6445d92fb51` | Head включён в интеграцию |
| `feature/seller-design-integration` | `c9e099e2ce2b0d5c25552542f72b9b369f5d7b5b` | Head включён в интеграцию |
| `feature/seller-registration-onboarding` | `6f808677c067cc00fb6b6b9eb26384f68c3d1e38` | Старая регистрация; продолжение в PR43 |
| `feature/shop-page-polish` | `565e17d451b28e5f1b301c8b69e617fa412c094c` | Head включён в интеграцию |
| `feature/unified-visual-3d` | `e5ef1de390309630654698f4c2d3981bebdffd35` | Head включён в интеграцию |
| `feature/unified-visual-3d-b` | `d91e3a5e1250bc23fc5de9408483352a622e6d3f` | Head включён в интеграцию |
| `feature/unified-visual-3d-c` | `1c8756dd2e0ea4e1e6f8206b3ffe8bc72be5635c` | Head включён в интеграцию |
| `feature/unified-visual-3d-d` | `3765ddbef123bc5c52bee243e403d15c527b7f26` | Head включён в интеграцию |
| `feature/unified-visual-3d-models` | `996a1b49187bbcad570ca566f7330e7eb12ba8a0` | Модели перенесены ранее как a568563; повторный merge не нужен |
| `feature/voice-playback-cancel` | `ae98f263b69cf06466ecc0ddca54f547c7cafb2b` | Историческое ответвление/отчёт; основной результат перенесён ранее, head отдельно |
| `fix/ai-draft-flow` | `7c19a22406cb529881789aa72b64a3a95e3f6892` | Историческое ответвление/отчёт; основной результат перенесён ранее, head отдельно |
| `fix/analytics-mobile-compact` | `8da93dc48ff998230212be4f31c32944a173f53b` | Head включён в интеграцию |
| `fix/customer-post-unknown-result` | `99ed2c03c8c4d75987ad5e41119055c2bb5142c6` | Историческое ответвление/отчёт; основной результат перенесён ранее, head отдельно |
| `fix/ios-controls-recording` | `9902a7f56ba16528aaa41ad96894142113e6d48e` | Head включён в интеграцию |
| `fix/ledger-customer-ids-gated` | `559b4d0e36d60e8cadda46118f8dad1f057c2cab` | Head включён в интеграцию |
| `fix/ledger-customer-names-history` | `ae593c15408b05b2d32342900c3ed018739d1565` | Head включён в интеграцию |
| `fix/seller-auth-unicode` | `28960f21e13c9c38077bf68b7bb5449eb9aa824d` | Историческое ответвление/отчёт; основной результат перенесён ранее, head отдельно |
| `fix/seller-cabinet-reliability` | `9a3c8687e59d70fa5d4fdbb99695af538a068791` | Отклонён старый recovery; заменён PR42 |
| `fix/seller-customer-recovery-safe` | `2058b914fc084ac1237ac805ce053d6ac9c8ddac` | Head включён в интеграцию |
| `fix/seller-sidebar-scroll` | `29b1b65f177e42729f34f7505be69b3725907e2c` | Head включён в интеграцию |
| `fix/voice-playback-lifecycle` | `649bbb303471abe79dd08d61f76bce52ee10e266` | Head включён в интеграцию |
| `frontend/aidana-public-showcase` | `7d23500a6e45e71ad19725c322b6bfb1ba243bf0` | Старая витрина; приняты последующие общий UI/модели |
| `frontend/public-inquiry-safe` | `721da4ea1140086c21fd093219497862eee57836` | Альтернативная старая заявка; принята общая реализация |
| `integration/abzal-public-catalog` | `7248bab0fd395c76b48a96549d1ae8a95454eddc` | Историческое ответвление/отчёт; основной результат перенесён ранее, head отдельно |
| `integration/customer-ids-history` | `8f1764d37db9464bcd760be8a29c3b4eb93b96c4` | Head включён в интеграцию |
| `integration/latest-visible-release` | `abaee73901db39f54c838a5af3be83ed7d48f068` | Историческое ответвление/отчёт; основной результат перенесён ранее, head отдельно |
| `integration/livestock-https` | `ca51bbf9bcf1a5e5379b7b8ced147e4114e01434` | Head включён в интеграцию |
| `integration/local-combined-check` | `58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76` | Head включён в интеграцию |
| `integration/main-release-20261017` | `07197bec0a8ac331714eea3036f3af6eac939e7e` | Head включён в интеграцию |
| `integration/models-render-062` | `5118fd1e8afdaa87bb0da2abdac5a5b83b389be5` | Head включён в интеграцию |
| `integration/openai-recovery-062` | `4e983b42a2a0466d2fc07e4de09becf87a8ef7d5` | Head включён в интеграцию |
| `integration/public-inquiry-release` | `b2bafd01a0a40b307ff9ebd9a351ef2ccdc74da3` | Историческое ответвление/отчёт; основной результат перенесён ранее, head отдельно |
| `integration/recovery-polish-062` | `beb0fe17f399685607766844412fe810e4ab620e` | Историческое ответвление/отчёт; основной результат перенесён ранее, head отдельно |
| `integration/seller-analytics-061` | `13248851fd2b2a502aff211a506f71e85c2b0ab1` | Head включён в интеграцию |
| `integration/seller-registration-deploy-review` | `6ce3d29bf16d33f57b1d9dbf5c0bf1c4fcce7464` | Отложено: Cloudflare callback и живая приёмка |
| `integration/team-mobile` | `f240b278f292e40f8033db6526fd0161e035cd96` | Head включён в интеграцию |
| `integration/team-mvp` | `3d009dc86c93debcab05dedda530b7d1fe62a304` | Head включён в интеграцию |
| `integration/team-update-20261017` | `9845b91b64d388c54312d2a8a75000218c7774af` | Head включён в интеграцию |
| `integration/unified-web-062` | `cacf57af242c632f31f3e292d22d0c3078fe46da` | Head включён в интеграцию |
| `integration/voice-preview-061` | `0737439915c17e8d8f20cddcbe9e75bebede9b46` | Head включён в интеграцию |
| `main` | `86ca9af15017b163a9e47335c68eee46ac2fafde` | Head включён в интеграцию |
| `pr58-review` | `94d173478f2612ceb03d1bc7d44a1b7d03f999f7` | Head включён в интеграцию |
| `pr59-review` | `88a80da09661d7efb8b053c1cde11563408a73d7` | Head включён в интеграцию |
| `pr62-review` | `9b18843edf7f5204bff0ce2776f488f4ddd9e26e` | Head включён в интеграцию |
| `review-pr3` | `9b4156122e22f12839f9f69384cb79a43e90c730` | Head включён в интеграцию |
| `review-pr4` | `193f6e527d716549d759d805dc4b86db1d9e059e` | Head включён в интеграцию |
| `review-pr5` | `2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c` | Head включён в интеграцию |
| `review/cloudflare-acceptance` | `ef78aa0e9f19f1675927c866e2dc51d6eef3e43e` | Head включён в интеграцию |
| `review/flutter-050-visual` | `31e9327e531aa2d248167d3deb1396c5951afa9f` | Head включён в интеграцию |
| `review/flutter-051-recheck` | `3fddae40f3cbf1503e4853c130f909352630ee3b` | Head включён в интеграцию |
| `review/hosting-acceptance-062` | `6ab0c11093aa20656e600342b589b02fc8a6c959` | Head включён в интеграцию |
| `review/models-production-062` | `8be10b3cba7b320fbf1e57d78cd8f501312761da` | Head включён в интеграцию |
| `review/render-diagnostic-20261017` | `ce9e25090566dbb668a2ab378ee23cddde51b51e` | Историческое ответвление/отчёт; основной результат перенесён ранее, head отдельно |
| `test/mobile-microphone-acceptance` | `39a730e63e43bb8487ed2f9afb1ead7762737314` | Историческое ответвление/отчёт; основной результат перенесён ранее, head отдельно |
| `test/seller-regression` | `abee31fd5a1be2c2be06e3132fe7f42c90adac5d` | Head включён в интеграцию |
| `test/voice-acceptance-analytics-cards` | `88a80da09661d7efb8b053c1cde11563408a73d7` | Head включён в интеграцию |
| `test/voice-integration-acceptance` | `5591e057b4e137bd3e1d7137d607d3e1b8331825` | Историческое ответвление/отчёт; основной результат перенесён ранее, head отдельно |
