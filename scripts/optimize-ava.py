"""Derive mobile delivery portraits from the unchanged Ava PNG masters (Pillow)."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / "public/characters/ava"
for pose in ("welcome", "point", "build"):
    source = root / f"{pose}-v2.png"
    target = root / f"{pose}-v3.webp"
    with Image.open(source) as image:
        image.resize((512, 768), Image.Resampling.LANCZOS).save(
            target, quality=90, method=6, exact=True
        )
    print(f"{source.name}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes")
