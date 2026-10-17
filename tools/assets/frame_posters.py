"""Frame web posters after build_venues.py: crop the empty studio sky above the
model and the dark strip of studio floor at the bottom edge. The full width is
kept, so nothing is cut at the sides; the result is between 16:10 and 2:1.

Pixels are only cropped, never repainted: building, signs, floor and the studio
background keep their rendered colours. GLB files are untouched.

    python tools/assets/frame_posters.py            # all venues
    python tools/assets/frame_posters.py --venue mart

Run once per fresh 1024x768 render; framed posters are skipped, so a repeated
run changes nothing.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PREVIEWS = ROOT / "apps/web/public/previews"
RENDER_SIZE = (1024, 768)
ASPECT = 16 / 10  # tallest frame
SKY_MARGIN = 48  # px of sky kept above the tallest part of the model


def first_model_row(img):
    """First row where the model departs from the smooth studio sky."""
    sky = np.median(img[:8], axis=(0, 1))
    differs = np.abs(img - sky).max(axis=2) > 24
    rows = np.where(differs.mean(axis=1) > 0.01)[0]
    return int(rows[0]) if rows.size else 0


def bottom_strip_start(img):
    """Top of a uniform darker floor strip at the bottom edge, if the render has one."""
    row_mean = img.mean(axis=(1, 2))
    row_spread = img.mean(axis=2).std(axis=1)
    y = img.shape[0] - 1
    base = row_mean[y]
    while y > 0 and row_spread[y - 1] < 4 and abs(row_mean[y - 1] - base) < 6:
        y -= 1
    above = row_mean[max(0, y - 12) : y].mean() if y > 0 else base
    return y if above - base > 25 else img.shape[0]


def frame(path):
    image = Image.open(path).convert("RGB")
    if image.size != RENDER_SIZE:
        return f"{path.name}: {image.size[0]}x{image.size[1]} is not a fresh render, skipped"
    img = np.asarray(image, dtype=np.float32)
    width = img.shape[1]
    top = max(0, first_model_row(img) - SKY_MARGIN)
    bottom = bottom_strip_start(img)
    height = min(round(width / ASPECT), bottom - top)
    if width / height > 2:
        return f"{path.name}: less than 2:1 would remain, skipped"
    box = (0, top, width, top + height)
    image.crop(box).save(path, "WEBP", quality=86, method=6)
    return f"{path.name}: crop {box}, {path.stat().st_size} bytes"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--venue", help="Slug of one venue, e.g. mart")
    args = parser.parse_args()
    paths = [PREVIEWS / f"{args.venue}.webp"] if args.venue else sorted(PREVIEWS.glob("*.webp"))
    for path in paths:
        print(frame(path))


if __name__ == "__main__":
    main()
