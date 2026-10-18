"""Build a contact sheet of every collected poster so the art direction can be judged at a glance."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SRC = Path(__file__).resolve().parent
OUT = SRC / "contact-sheet.jpg"

files = sorted(SRC.glob("*.jpg"))
files = [f for f in files if f.name != OUT.name]

COLS = 10
CELL_W, CELL_H = 150, 230
PAD = 6
LABEL_H = 12

rows = (len(files) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * (CELL_W + PAD) + PAD, rows * (CELL_H + LABEL_H + PAD) + PAD), (18, 18, 20))
draw = ImageDraw.Draw(sheet)

for i, f in enumerate(files):
    try:
        im = Image.open(f).convert("RGB")
    except Exception as exc:  # noqa: BLE001
        print(f"skip {f.name}: {exc}")
        continue
    im.thumbnail((CELL_W, CELL_H), Image.LANCZOS)
    col, row = i % COLS, i // COLS
    x = PAD + col * (CELL_W + PAD)
    y = PAD + row * (CELL_H + LABEL_H + PAD)
    sheet.paste(im, (x, y))
    draw.rectangle([x - 1, y - 1, x + CELL_W, y + CELL_H], outline=(60, 60, 66))
    draw.text((x + 1, y + CELL_H + 1), f.stem[:26], fill=(190, 190, 190))

sheet.save(OUT, quality=88)
print(f"{len(files)} posters -> {OUT} ({sheet.size[0]}x{sheet.size[1]})")
