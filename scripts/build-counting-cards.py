"""Compose exact-count cards from existing approved theme artwork; no API calls.

Run from any directory with Python + Pillow. Source crops mirror theme-overview.js.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SIZE = 1254

def build(entry):
    x, y, width, height = entry['crop']
    source = Image.open(ROOT / entry['source']).convert('RGBA')
    tile = source.crop((x, y, x + width, y + height))
    card = Image.new('RGB', (SIZE, SIZE), '#fffdf7')
    draw = ImageDraw.Draw(card)
    font_path = Path('C:/Windows/Fonts/arialbd.ttf')
    font = ImageFont.truetype(str(font_path) if font_path.exists() else 'DejaVuSans-Bold.ttf', 220)
    draw.text((SIZE // 2, 35), str(entry['count']), fill='#e9900c', font=font, anchor='mt', stroke_width=3, stroke_fill='#a85b00')
    count = entry['count']
    columns = 3 if count in (3, 5, 6) else 2
    rows = (count + columns - 1) // columns
    cell = min(350, 860 // rows)
    top = 300 + (860 - rows * cell) // 2
    for index in range(count):
        row, col = divmod(index, columns)
        row_count = min(columns, count - row * columns)
        left = (SIZE - row_count * cell) // 2 + col * cell
        resized = ImageOps.contain(tile, (cell - 24, cell - 24), Image.Resampling.LANCZOS)
        card.paste(resized, (left + (cell - resized.width) // 2, top + row * cell + (cell - resized.height) // 2), resized)
    target = ROOT / 'assets/scenarios' / f"counting-{entry['id']}-v1.png"
    card.save(target, optimize=True)
    print(f"{target.name}: {SIZE}x{SIZE}, {count} copies of {entry['word']}")

if __name__ == '__main__':
    manifest = json.loads((ROOT / 'assets/scenarios/counting-objects-v1.json').read_text(encoding='utf-8'))
    for item in manifest:
        build(item)
