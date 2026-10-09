"""Publish approved imagegen output without changing the original generation files."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "output/imagegen/classroom-commands-v1"
DESTINATION = ROOT / "assets/scenarios"
NAMES = ("classroom-commands", "command-stand-up", "command-sit-down", "command-raise-hands")

for name in NAMES:
    source = SOURCE / f"{name}-v1.png"
    destination = DESTINATION / source.name
    with Image.open(source) as image:
        if image.format != "PNG" or image.width != image.height:
            raise ValueError(f"Expected a square PNG: {source}")
        rgba = image.convert("RGBA")
        background = Image.new("RGBA", rgba.size, "white")
        background.alpha_composite(rgba)
        background.convert("RGB").save(destination, optimize=True)
        print(f"{destination.name}: {image.width}x{image.height} RGB PNG")
