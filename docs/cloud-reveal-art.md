# Stylized organic cloud reveal

The current intro uses three original code-native SVG mist islands (`public/textures/intro/stylized-mist-{1,2,3}.svg`). Rounded irregular silhouettes, cream highlights and pastel cyan shading match the low-poly campus. These are deliberately simple stylized shapes, with no photographic textures or runtime image-generation dependency.

Ten overlapping compositor layers follow independent curved trajectories: upward, diagonal, sideways and downward, with restrained rotation, spreading and thinning. There are no mirrored full-height banks, reveal masks, straight split seams or curtain wipe. Three depth groups progress at different rates over 6.6 seconds. Static SVG shading is reused; only transform and opacity animate. No additional WebGL draw calls, volumetric passes, particles or per-frame noise are introduced.

Existing once-only server claim, new/reset-company gating, interrupted-intro recovery, reduced-motion bypass and hidden Skip during the cloud-only portion are preserved. Founder HQ camera framing and the rest of onboarding remain unchanged.

The older WebP banks below remain available for historical reference/reversion but are no longer loaded by the intro.

---

## Previous asset provenance (retired)

# Cloud reveal assets

The foreground cloud bank was generated using the built-in imagegen tool. Its transparent alpha is preserved in `public/textures/intro/cloud-bank-v1.webp` (1024x1536, WebP quality 90). The original generation output remains under Codex generated_images; the application references only the asset copied into this repository.

The soft mist asset is original procedural density-field artwork at `public/textures/intro/cloud-mist-v1.webp`, reproduced by `python scripts/render-intro-clouds.py` with NumPy/Pillow. Both downloads total 289,054 bytes. Six compositor layers reuse the two textures; only transform and the wisps' final opacity animate. There are no runtime noise fields, WebGL cloud meshes, particles, volumetric passes, external music/assets, or paid runtime APIs.

## Final imagegen prompt

Production game asset, stylized-concept. Create ONE large vertical cloud curtain / bank on a genuinely transparent background, intended as a layered sprite that slides sideways to reveal a clean low-poly isometric technology-campus game. Portrait 2:3 composition. Dense opaque luminous cream-white clouds fill the LEFT TWO THIRDS from top to bottom, extending beyond the top, bottom and left image edges. The RIGHT edge has a rich irregular silhouette of overlapping softly volumetric billows and delicate transparent wisps, fading into the transparent rightmost quarter. Clearly recognizable beautiful puffy clouds with organic lobes, visible density variations, warm sunlight on upper edges and soft cyan/blue-gray undersides. Premium friendly stylized mobile-game 3D art, readable shapes and charming depth. Not realistic storm clouds, no dark storm lighting, no flat outlined circles or cartoon bubbles, no uniform pale fog rectangle, no sky background, no ground, no buildings, no text, no borders. The cloud bank should have detailed but soft billowing surface texture and light/shadow modeling, clearly visible at mobile size. This is a compositing sprite, not a finished screenshot.
