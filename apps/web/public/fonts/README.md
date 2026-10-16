# Qadam UI fonts

Self-hosted to match the public storefront's Manrope typography without a runtime Google Fonts request. The original files are redistributed unchanged under SIL Open Font License 1.1; licenses are included beside them.

- `Manrope-Variable.ttf`, weight200–800,164700bytes: [google/fonts at b31870aff700ab7a1d74fa0c6887d95beb9e0037](https://github.com/google/fonts/blob/b31870aff700ab7a1d74fa0c6887d95beb9e0037/ofl/manrope/Manrope%5Bwght%5D.ttf). SHA256 `3ae11c49db0455a3cc33e37d380f20fdb8c7f8b41dc07625c177e3d87a9d6ae6`. License: `Manrope-OFL.txt`.
- `NotoSans-CyrillicExt.woff2`,70680bytes: [official Google Fonts subset](https://fonts.gstatic.com/s/notosans/v42/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5aPdu2ui.woff2), SHA256 `82ff72b28e6610f2c62de49d0f295c160a157b2718fa814bb6c512ebfdebb31d`.
- `NotoSans-Cyrillic.woff2`,20080bytes: [official Google Fonts subset](https://fonts.gstatic.com/s/notosans/v42/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5ardu2ui.woff2), SHA256 `6ab64433de6077ca5ad31b05420450ce986a616a4ea47b6ad16f3217055dafc3`.

Noto files have variable weight100–900; [source CSS](https://fonts.googleapis.com/css2?family=Noto+Sans:wght@200..800&display=swap). License: `NotoSans-OFL.txt`, [upstream at c92b209a838649c205a1565b5f28c1973e049659](https://github.com/google/fonts/blob/c92b209a838649c205a1565b5f28c1973e049659/ofl/notosans/OFL.txt).

Manrope lacks Әә Ғғ Ққ Ңң Ұұ. FontTools cmap inspection verified these ten glyphs in the two Noto subsets together. `shared/tokens.css` uses the CSS family alias `Qadam Kazakh` only for these codepoints: Cyrillic-ext handles U+0492–0493,049A–049B,04A2–04A3,04D8–04D9; Cyrillic handles U+04B0–04B1. Other text stays Manrope with the standard system fallback chain. Fonts have not been modified or subsetted locally.
