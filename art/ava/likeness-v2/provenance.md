# Ava likeness replacement

Created with the built-in imagegen tool using the approved Ava character sheet supplied by the user. The first generated welcome attempt was discarded. The accepted welcome asset uses a balanced standing stance and functional modest armor; thinking, encouragement and tablet are identity-preserving edits of that same source.

Shared generation prompt: Create one complete transparent full-body Ava sprite based on the approved sheet's small front turnaround. Cream-white slightly faceted armor, navy mechanics, cyan face and circular joints, pink cheeks and triangular chest emblem. Balanced modest torso, proportionate hips and legs, no exaggerated hourglass, relaxed uncrossed legs. Preserve helmet proportions and full-body framing. No text, shadows or background.

Pose prompts: welcome presents an open palm with happy crescent eyes; thinking brings a finger under her chin with attentive oval eyes; encouragement gives a thumbs-up and wink; tablet holds a navy tablet with both hands and happy eyes. All variants preserve the same source character, camera, lighting and body proportions.

The image preview's RGB background is not the delivered background: generated alpha is retained. Composites on opaque green were reviewed for clean cutout edges. `scripts/normalize-ava-likeness.py` performs only proportional resizing, transparent canvas placement and WebP encoding, with no character repainting, stretching or UI adjustments. Its report records the original 640×960 canvas, helmet top 21px, head axis 308.75px and foot baseline approximately 941px.

Existing tutorial pose mappings and presentation CSS remain unchanged. Versioned filenames invalidate previously cached portraits. Legacy source and delivery files remain for historical art verification; no legacy sprite is referenced by the live Ava asset manifest.
