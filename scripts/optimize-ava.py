"""Build Retina-sized Ava sprites from approved transparent masters (Pillow)."""
from pathlib import Path
from PIL import Image
import json
root = Path(__file__).resolve().parents[1]
output = root / "public/characters/ava"
output.mkdir(parents=True, exist_ok=True)
metadata = {}
for pose in ("welcome", "tablet", "encourage", "thinking"):
    source = root / "art/ava" / f"{pose}-master.png"
    target = output / f"{pose}-v4.webp"
    with Image.open(source) as image:
        image.thumbnail((640, 640), Image.Resampling.LANCZOS)
        image.save(target, quality=90, method=6, exact=True)
        metadata[pose] = {"width": image.width, "height": image.height, "bytes": target.stat().st_size}
    print(f"{pose}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes")
(root / "art/ava/delivery.json").write_text(json.dumps(metadata, indent=2) + "\n")
