"""Publish approved imagegen outputs and build an ignored QA contact sheet."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "output/imagegen/daily-life"
DEST = ROOT / "assets/scenarios"
NAMES = ["getting-up-v2", "going-to-bed-v2", "having-a-meal-v2", "drinking-water-v2", "putting-toys-away-v2",
         "home-mom-sprite-v3", "home-dad-sprite-v2", "home-grandma-sprite-v2",
         "home-brother-sprite-v1", "home-sister-sprite-v1"]
sheet = Image.new("RGB", (1600, 640), "#e9eff3")
draw = ImageDraw.Draw(sheet)
for index, name in enumerate(NAMES):
    source = SOURCE / f"{name}.png"
    with Image.open(source) as image:
        image.load()
        if "sprite" in name:
            assert image.mode == "RGBA" and image.getchannel("A").getextrema()[0] == 0
            bbox = image.getchannel("A").getbbox()
            image = image.crop((max(0, bbox[0] - 16), max(0, bbox[1] - 16),
                                min(image.width, bbox[2] + 16), min(image.height, bbox[3] + 16)))
        image.save(DEST / f"{name}.png", compress_level=6)
        print(f"{name}: {image.size}, {image.mode}" +
              (f", alpha={image.getchannel('A').getextrema()}" if image.mode == "RGBA" else ""))
        thumb = image.convert("RGBA")
        thumb.thumbnail((304, 282))
        x, y = index % 5 * 320, index // 5 * 320
        sheet.paste(thumb, (x + (320 - thumb.width) // 2, y + 4), thumb)
        draw.text((x + 8, y + 292), name, fill="#152c46")
sheet.save(ROOT / "tmp/daily-life-contact.png")
sheet.crop((0, 320, 1600, 640)).save(DEST / "family-characters-preview-v1.png")
