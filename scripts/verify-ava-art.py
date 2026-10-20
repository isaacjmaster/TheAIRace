"""Validate the actual delivered alpha and dimensions; no image editing."""
from pathlib import Path
from PIL import Image
import json
report = {}
for pose in ("welcome", "tablet", "encourage", "thinking"):
    path = Path("public/characters/ava") / f"{pose}-v4.webp"
    with Image.open(path) as image:
        assert image.mode == "RGBA"
        alpha = image.getchannel("A")
        assert alpha.getextrema() == (0, 255)
        assert all(alpha.getpixel(p) == 0 for p in ((0,0),(image.width-1,0),(0,image.height-1),(image.width-1,image.height-1)))
        histogram = alpha.histogram()
        assert histogram[0] > image.width * image.height * .25
        assert sum(histogram[250:]) > image.width * image.height * .2
        report[pose] = {"size": image.size, "bytes": path.stat().st_size, "clear_pixels": histogram[0], "near_opaque_pixels": sum(histogram[250:])}
Path("data/ava-redesign-media").mkdir(parents=True, exist_ok=True)
Path("data/ava-redesign-media/alpha-validation.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
