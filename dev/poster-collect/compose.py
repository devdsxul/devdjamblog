"""Build the DEVDJAM poster assets.

Two products:
  1. desktop wall  — irregular paste-up (no grid), 2560x1440, graded dark
  2. window plates — one small collage per window class, 2-3 posters tilted and overlapped

Run after fetch.py has populated the pool:
    python compose.py
"""
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

SRC = Path(__file__).resolve().parent
OUT = Path(r"C:\Users\Administrator\Desktop\devdjamblog\wp-content\themes\devdjam\assets\img\poster-wall")

W, H = 2560, 1440
SEED = 11


def pool():
    return sorted(p for p in SRC.glob("*.jpg"))


def find(pattern):
    """Resolve a pool file by a fragment of its slug (e.g. 'house-1977')."""
    for p in pool():
        if pattern in p.stem:
            return p
    raise FileNotFoundError(f"no poster matching {pattern!r}")


# ---------------------------------------------------------------- desktop wall
def layout_wall(seed=SEED):
    rng = random.Random(seed)
    files = pool()
    rng.shuffle(files)
    picks = files[:160]

    wall = Image.new("RGB", (W, H), (8, 7, 10))
    bands = [404, 386, 412, 378]
    top = -(sum(bands) - H) // 2
    cursor = 0

    for bi, bh in enumerate(bands):
        x = -160.0
        band_y = top + sum(bands[:bi])
        while x < W + 120 and cursor < len(picks) * 2:
            f = picks[cursor % len(picks)]
            cursor += 1
            im = Image.open(f).convert("RGB")
            ar = im.width / im.height
            # Taller than the band on purpose: the overshoot covers the jitter gaps.
            h = bh * rng.uniform(1.06, 1.30)
            w = h * ar
            tile = im.resize((max(1, int(w)), max(1, int(h))), Image.LANCZOS)
            tile = ImageOps.expand(tile, border=2, fill=(4, 4, 6))

            ang = rng.uniform(-4.2, 4.2)
            rot = tile.rotate(ang, resample=Image.BICUBIC, expand=True)
            px = int(x)
            py = int(band_y + rng.uniform(-34, 34))
            wall.paste(rot, (px, py))
            # Paste-up shadow: the next sheet is thrown on top of the previous one.
            shadow = Image.new("RGBA", rot.size, (0, 0, 0, 0))
            shadow.paste((0, 0, 0), (0, 0, rot.width, rot.height))
            mask = rot.convert("L").point(lambda v: int(v * 0.5))
            shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(3)))
            wall.paste(shadow, (px + 4, py + 5), shadow)

            step = w * rng.uniform(0.78, 0.92)
            x += step

    return grade(wall)


def grade(wall):
    wall = ImageEnhance.Color(wall).enhance(0.58)
    wall = ImageEnhance.Contrast(wall).enhance(1.18)
    wall = ImageEnhance.Brightness(wall).enhance(0.40)

    arr = np.asarray(wall).astype(np.float32) / 255.0
    lum = arr @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    shadows = np.clip(1.0 - lum * 2.2, 0.0, 1.0)[..., None]
    mids = np.clip(1.0 - np.abs(lum - 0.45) * 2.6, 0.0, 1.0)[..., None]
    cool = np.array([0.09, 0.13, 0.20], dtype=np.float32)
    warm = np.array([0.55, 0.10, 0.09], dtype=np.float32)
    arr = arr * (1.0 - 0.22 * shadows) + cool * 0.22 * shadows
    arr = arr + warm * 0.10 * mids * (1.0 - arr)
    arr = np.clip(arr, 0.0, 1.0)

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    nx = (xx / W - 0.5) * 2.0
    ny = (yy / H - 0.5) * 2.0
    rad = np.sqrt(nx ** 2 + ny ** 2 * 0.82)
    vig = np.clip(1.0 - 0.62 * np.clip(rad - 0.18, 0, 1) ** 1.5, 0.0, 1.0)[..., None]
    arr = arr * vig

    scan = np.ones((H, 1, 1), dtype=np.float32)
    scan[::3] = 0.93
    arr = arr * scan

    rng = np.random.default_rng(SEED)
    arr = np.clip(arr + rng.normal(0.0, 0.016, (H, W, 1)), 0.0, 1.0)

    out = Image.fromarray((arr * 255).astype(np.uint8), "RGB")
    return out.filter(ImageFilter.GaussianBlur(0.4))


# ---------------------------------------------------------------- window plates
PLATES = {
    "win-visitors":    {"size": (480, 640),  "titles": ["suspiria", "tenebrae"],                        "seed": 3},
    "win-player":      {"size": (440, 720),  "titles": ["re-animator", "street-trash"],                 "seed": 5},
    "win-content":     {"size": (960, 640),  "titles": ["tetsuo", "nekromantik", "eraserhead"],         "seed": 7},
    "win-calendar":    {"size": (640, 512),  "titles": ["blood-and-black-lace", "the-cat-o-nine"],      "seed": 9},
    "win-study-group": {"size": (480, 640),  "titles": ["house-1977", "phenomena"],                     "seed": 11},
}

OFFSETS = [(0.0, 0.0), (-0.20, -0.11), (0.21, 0.12), (-0.14, 0.16)]


def make_plate(name, spec):
    rng = random.Random(spec["seed"])
    pw, ph = spec["size"]
    base = Image.new("RGB", (pw, ph), (12, 10, 13))

    for i, pattern in enumerate(spec["titles"]):
        im = Image.open(find(pattern)).convert("RGB")
        scale = 0.78 if i == 0 else rng.uniform(0.52, 0.66)
        h = int(ph * scale)
        w = int(h * im.width / im.height)
        tile = im.resize((max(1, w), max(1, h)), Image.LANCZOS)
        tile = ImageOps.expand(tile, border=2, fill=(7, 6, 8))
        # Veil baked in + a light defocus: behind semi-transparent panels this reads as a
        # tint rather than legible artwork, which is what keeps body text readable.
        tile = Image.blend(tile, Image.new("RGB", tile.size, (255, 255, 255)), 0.20)
        tile = ImageEnhance.Contrast(tile).enhance(0.88)
        tile = ImageEnhance.Color(tile).enhance(0.92)
        tile = tile.filter(ImageFilter.GaussianBlur(0.7))

        ang = rng.uniform(-6.5, 6.5) if i else rng.uniform(-4.0, 4.0)
        rot = tile.rotate(ang, resample=Image.BICUBIC, expand=True).convert("RGBA")

        ox, oy = OFFSETS[i % len(OFFSETS)]
        cx = pw * (0.5 + ox) + rng.uniform(-10, 10)
        cy = ph * (0.5 + oy) + rng.uniform(-10, 10)
        x = int(cx - rot.width / 2)
        y = int(cy - rot.height / 2)

        shadow = Image.new("RGBA", rot.size, (0, 0, 0, 0))
        shadow.paste((0, 0, 0), (0, 0, rot.width, rot.height))
        shadow.putalpha(rot.split()[3].point(lambda v: int(v * 0.55)).filter(ImageFilter.GaussianBlur(3)))
        base.paste(shadow, (x + 3, y + 4), shadow)
        base.paste(rot, (x, y), rot)

    arr = np.asarray(base).astype(np.float32) / 255.0
    rng2 = np.random.default_rng(spec["seed"])
    arr = np.clip(arr + rng2.normal(0.0, 0.012, (ph, pw, 1)), 0.0, 1.0)
    return Image.fromarray((arr * 255).astype(np.uint8), "RGB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    wall = layout_wall()
    wall_path = OUT / "giallo-wall.jpg"
    wall.save(wall_path, quality=80, optimize=True, progressive=True)
    print(f"desktop  {wall_path.name}  {wall.size[0]}x{wall.size[1]}  {wall_path.stat().st_size/1024:.0f} KB")

    total = wall_path.stat().st_size
    for name, spec in PLATES.items():
        plate = make_plate(name, spec)
        path = OUT / f"{name}.jpg"
        plate.save(path, quality=82, optimize=True, progressive=True)
        total += path.stat().st_size
        print(f"plate    {path.name}  {plate.size[0]}x{plate.size[1]}  {path.stat().st_size/1024:.0f} KB")

    print(f"total    {total/1024:.0f} KB")


if __name__ == "__main__":
    main()
