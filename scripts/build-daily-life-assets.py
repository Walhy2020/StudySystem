"""Publish approved imagegen outputs and build an ignored QA contact sheet."""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "output/imagegen/daily-life"
DEST = ROOT / "assets/scenarios"
parser = argparse.ArgumentParser()
parser.add_argument("--family-only", action="store_true")
args = parser.parse_args()
NAMES = ["getting-up-v2", "going-to-bed-v2", "having-a-meal-v2", "drinking-water-v2", "putting-toys-away-v2",
         "home-mom-sprite-v5", "home-dad-sprite-v4", "home-grandma-sprite-v3",
         "home-brother-sprite-v3", "home-sister-sprite-v3"]
sheet = Image.new("RGB", (1600, 640), "#e9eff3")
draw = ImageDraw.Draw(sheet)
for index, name in enumerate(NAMES):
    source = SOURCE / f"{name}.png"
    publish = not args.family_only or ("sprite" in name and "grandma" not in name)
    if not publish:
        source = DEST / f"{name}.png"
    with Image.open(source) as image:
        image.load()
        if publish and "sprite" in name:
            assert image.mode == "RGBA" and image.getchannel("A").getextrema()[0] == 0
            # Remove generated low-alpha outer haze, while retaining original alpha
            # and antialiasing within3px of the opaque silhouette. No repainting.
            alpha = image.getchannel("A")
            silhouette = alpha.point(lambda value: 255 if value >= 224 else 0)
            assert silhouette.getbbox(), f"No solid character found: {name}"
            edge_support = silhouette.filter(ImageFilter.MaxFilter(7))
            image.putalpha(ImageChops.multiply(alpha, edge_support))
            bbox = image.getchannel("A").getbbox()
            image = image.crop((max(0, bbox[0] - 16), max(0, bbox[1] - 16),
                                min(image.width, bbox[2] + 16), min(image.height, bbox[3] + 16)))
        if publish:
            image.save(DEST / f"{name}.png", compress_level=6)
        print(f"{name}: {image.size}, {image.mode}" +
              (f", alpha={image.getchannel('A').getextrema()}" if image.mode == "RGBA" else ""))
        thumb = image.convert("RGBA")
        thumb.thumbnail((304, 282))
        x, y = index % 5 * 320, index // 5 * 320
        sheet.paste(thumb, (x + (320 - thumb.width) // 2, y + 4), thumb)
        draw.text((x + 8, y + 292), name, fill="#152c46")
sheet.save(ROOT / "tmp/daily-life-contact.png")
sheet.crop((0, 320, 1600, 640)).save(DEST / "family-characters-preview-v3.png")
comparison = Image.new("RGB", (2240, 320), "#e9eff3")
comparison.paste(sheet.crop((0, 320, 1600, 640)), (640, 0))
for index, role in enumerate(["mia", "leo"]):
    with Image.open(DEST / f"{role}-sprite-v1.png") as image:
        thumb = image.convert("RGBA")
        thumb.thumbnail((304, 282))
        comparison.paste(thumb, (index * 320 + (320 - thumb.width) // 2, 4), thumb)
        ImageDraw.Draw(comparison).text((index * 320 + 8, 292), role, fill="#152c46")
comparison.save(ROOT / "tmp/family-style-comparison.png")
