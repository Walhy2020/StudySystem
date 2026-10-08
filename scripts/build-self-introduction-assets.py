"""Crop approved theme art for singular objects in the self-introduction scene.

No API calls; coordinates match src/theme-overview.js. Never overwrite sources.
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "flower": ("assets/themes/items/classic-items-2-scene-v1.png", (500, 25, 1000, 480)),
    "pencil": ("assets/themes/classroom/classroom-things-scene-v1.png", (75, 110, 414, 474)),
}

if __name__ == "__main__":
    for name, (source, box) in SOURCES.items():
        tile = Image.open(ROOT / source).convert("RGB").crop(box)
        card = Image.new("RGB", (640, 640), "#fffdf7")
        art = ImageOps.contain(tile, (600, 600), Image.Resampling.LANCZOS)
        card.paste(art, ((640 - art.width) // 2, (640 - art.height) // 2))
        target = ROOT / "assets/scenarios" / f"self-intro-{name}-v1.png"
        card.save(target, optimize=True)
        print(f"{target.name}: 640x640 RGB, source {source}, crop {box}")
