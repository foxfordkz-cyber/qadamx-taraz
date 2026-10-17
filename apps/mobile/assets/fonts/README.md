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
