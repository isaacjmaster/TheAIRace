"""Register generated Ava art on the existing canvas; never alter UI geometry.

Only proportional resize, transparent canvas placement and WebP encoding occur.
The source alpha is preserved. Source helmet centers are measured from the sheet.
"""
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parents[1]
source_dir = root / 'art/ava/likeness-v2'
report = {}
for pose in ('welcome', 'thinking', 'encourage', 'tablet'):
    with Image.open(source_dir / f'{pose}.png') as image:
        bounds = image.getchannel('A').point(lambda a: 255 if a > 230 else 0).getbbox()
        scale = 920 / (bounds[3] - bounds[1])
        resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
        # Common head center and head/feet baseline match the original delivery.
        x, y = round(308.75 - 451 * scale), round(21 - bounds[1] * scale)
        canvas = Image.new('RGBA', (640, 960))
        canvas.paste(resized, (x, y))
        target = root / 'public/characters/ava' / f'{pose}-full-v2.webp'
        canvas.save(target, quality=90, method=6, exact=True)
        delivered = canvas.getchannel('A').point(lambda a: 255 if a > 230 else 0).getbbox()
        report[pose] = {'width': 640, 'height': 960, 'bytes': target.stat().st_size,
                        'bodyBounds': delivered, 'sourceBodyBounds': bounds,
                        'headCenterX': round(451 * scale + x, 2), 'scale': scale, 'offset': [x,y]}
        # A neutral backing makes accidental opaque halos obvious in review.
        preview = Image.new('RGBA', canvas.size, '#c4d8be')
        preview.alpha_composite(canvas)
        review = root / 'output/Wall_Ava/art'
        review.mkdir(parents=True, exist_ok=True)
        preview.convert('RGB').save(review / f'{pose}.jpg', quality=94)
(source_dir / 'delivery.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
