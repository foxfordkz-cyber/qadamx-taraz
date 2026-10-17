# Qadam bundled fonts

Copied from the accepted web `apps/web/public/fonts` assets at main
1a541efb97ca402fb8165b5841bbbeff03afd4b1. The deployed public font bytes match
these sources on 17 October 2026. Manrope is unchanged. Noto Sans WOFF2 subsets
are decompressed with fontTools to TTF for Flutter; outlines, names, license and
character coverage are retained. Both SIL OFL licenses are included.

Manrope is the primary family. Noto CyrillicExt/Cyrillic provide the Kazakh
fallback. A cmap check covers all 84 upper/lowercase Kazakh Cyrillic letters.
No fonts are downloaded when the app starts. Original source links and hashes
are in apps/web/public/fonts/README.md.

The three inherited subsets do not contain U+20B8 (₸). The mobile bundle adds
the official Noto Sans Latin Extended variable subset as `QadamSymbols`, under
the same included `NotoSans-OFL.txt` license. This avoids relying on an unknown
device/system fallback for monetary values. FontTools cmap checks confirm ₸ in
both the downloaded WOFF2 and decompressed TTF. No outlines or names were edited.

- CSS source, checked 2026-10-17:
  https://fonts.googleapis.com/css2?family=Noto+Sans:wght@200..800&display=swap
- Official subset:
  https://fonts.gstatic.com/s/notosans/v42/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5aDdu2ui.woff2
- Source WOFF2: 167960 bytes; SHA256
  `6d5a79315528df191b9d86f97b0c4272a8b588fcb166773fe6588ac795de0613`.
- Bundled `NotoSans-LatinExt.ttf`: 350264 bytes; SHA256
  `eeaf5f9c8c16e584de34a89ee4469ff3e6c38dfa6dc62c8d72285e50f126245c`.
- Transformation: `TTFont(BytesIO(source)); font.flavor = None; font.save(path)`.
  This is a build-time conversion; there is no runtime network font request.
