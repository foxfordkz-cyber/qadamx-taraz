"""Convert the actual Blender renders to WebP and optionally package the handoff.

Run after build_venues.py with Python 3.11+ and Pillow. Never substitutes a mock
image for the rendered model. Sources and the public bundle are separate archives.
"""
import argparse
import json
import shutil
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "apps/web/public"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--renders", type=Path, default=ROOT / "tmp/asset-renders")
    parser.add_argument("--output", type=Path, help="User-facing output directory; omitted: only WebP conversion")
    parser.add_argument("--font", type=Path, help="Optional TrueType font supporting Cyrillic")
    args = parser.parse_args()
    venues = json.loads((PUBLIC / "venue-assets.json").read_text(encoding="utf-8"))["venues"]
    for venue in venues:
        slug = venue["slug"]
        source = args.renders / f"{slug}.png"
        with Image.open(source) as picture:
            assert picture.size == (1024, 768), f"Unexpected preview size: {source}"
            target = PUBLIC / f"previews/{slug}.webp"
            picture.convert("RGB").save(target, quality=86, method=6)
            assert target.stat().st_size <= 200_000
    if args.output is None:
        return
    args.output.mkdir(parents=True, exist_ok=True)
    report_path = ROOT / "assets/venues/validation.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["ok"], "Validate final assets before packaging"
    # Contact sheet is laid out from the same three renders that back the WebP files.
    font_path = args.font or Path("C:/Windows/Fonts/segoeui.ttf")
    if not font_path.exists():
        parser.error("Supply --font with a Cyrillic-capable TrueType font for the contact sheet")
    font = lambda size: ImageFont.truetype(str(font_path), size)
    board = Image.new("RGB", (1800, 1000), "#ffffff")
    draw = ImageDraw.Draw(board)
    draw.text((60, 40), "Qadam", font=font(30), fill="#0f0f0d")
    draw.text((60, 104), "Три площадки. Один визуальный язык.", font=font(52), fill="#0f0f0d")
    draw.text((62, 184), "Тараз · По открытым фотографиям · Размеры оценочные", font=font(24), fill="#6b6a63")
    captions = ["Стрельчатые арки и кирпич", "Синий фасад и крытые ряды", "Ворота с конями и навесы"]
    for i, venue in enumerate(venues):
        x, y = 60 + i * 565, 274
        draw.rounded_rectangle((x, y, x + 550, 853), radius=22, fill="#f6f5f2")
        with Image.open(args.renders / f"{venue['slug']}.png") as im:
            im = im.convert("RGB").resize((550, 413), Image.Resampling.LANCZOS)
            board.paste(im, (x, y + 18))
        draw.text((x + 24, y + 452), venue["name"], font=font(34), fill="#0f0f0d")
        draw.text((x + 24, y + 508), captions[i], font=font(22), fill="#4a4943")
        shutil.copy2(PUBLIC / f"previews/{venue['slug']}.webp", args.output / f"{venue['slug']}.webp")
    draw.rounded_rectangle((60, 910, 76, 926), radius=4, fill="#e4f222")
    draw.text((92, 902), "Условный масштаб и размещение. Не схема маршрута к реальному продавцу.", font=font(22), fill="#6b6a63")
    board.save(args.output / "qadam-venues.png", optimize=True)
    with ZipFile(args.output / "qadam-web-assets.zip", "w", ZIP_DEFLATED) as bundle:
        for pattern in ("models/*.glb", "previews/*.webp", "venue-assets.json", "asset-sources.md"):
            for path in sorted(PUBLIC.glob(pattern)):
                bundle.write(path, path.relative_to(PUBLIC))
    with ZipFile(args.output / "qadam-blender-sources.zip", "w", ZIP_DEFLATED) as bundle:
        paths = list((ROOT / "assets/venues").rglob("*"))
        paths += list((ROOT / "tools/assets").glob("*.py"))
        paths += list((ROOT / "tools/assets").glob("*.html"))
        paths += list((ROOT / "tools/assets").glob("*.cjs"))
        paths += [ROOT / "docs/handoffs/assets-3d.md", PUBLIC / "asset-sources.md", ROOT / "packages/contracts/demo-seed.json", ROOT / "docs/team5/fixtures/venue-assets.example.json"]
        for path in sorted(set(paths)):
            if path.is_file() and path.suffix not in (".blend1", ".blend2", ".pyc"):
                bundle.write(path, path.relative_to(ROOT))
    print(json.dumps({path.name: path.stat().st_size for path in args.output.iterdir() if path.is_file()}, indent=2))


if __name__ == "__main__":
    main()
