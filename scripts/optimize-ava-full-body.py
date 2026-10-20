"""Normalize full-body pose extensions to the unchanged welcome figure's framing.
Only proportional resizing and placement; no character repainting or distortion.
"""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
# Head centers measured against the approved 1024x1536 full-body reference.
reference_head_x=494
reference_top,reference_bottom=34,1505
source_head_x={"thinking":524,"encourage":500,"tablet":528}
report={}
for pose,head_x in source_head_x.items():
    with Image.open(root/"art/ava/full-body-poses"/f"{pose}.png") as image:
        alpha=image.getchannel("A")
        bounds=alpha.point(lambda a:255 if a>230 else 0).getbbox()
        factor=(reference_bottom-reference_top)/(bounds[3]-bounds[1])
        scale=factor*640/1024
        resized=image.resize((round(image.width*scale),round(image.height*scale)),Image.Resampling.LANCZOS)
        x=round(reference_head_x*640/1024-head_x*scale)
        y=round(reference_top*640/1024-bounds[1]*scale)
        canvas=Image.new("RGBA",(640,960));canvas.paste(resized,(x,y))
        target=root/"public/characters/ava"/f"{pose}-full-v1.webp"
        canvas.save(target,quality=90,method=6,exact=True)
        delivered=canvas.getchannel("A").point(lambda a:255 if a>230 else 0).getbbox()
        report[pose]={"width":640,"height":960,"bytes":target.stat().st_size,"sourceBodyBounds":bounds,"bodyBounds":delivered,"scale":scale,"offset":[x,y],"headCenterX":round(head_x*scale+x,2)}
        print(pose,report[pose])
(root/"art/ava/full-body-poses/delivery.json").write_text(json.dumps(report,indent=2)+"\n")
