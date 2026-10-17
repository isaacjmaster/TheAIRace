# Ava icon and cinematic title screen

## Assets and scope

Built-in image-generation tool used (not API/CLI fallback). The current
`public/characters/ava/welcome-v2.png` was the strict identity reference, while the
user-approved icon/title examples supplied composition, lighting and color direction.
No tutorial portraits or poses were replaced. Ava retains her asymmetrical swept
white head shell, black visor, magenta eyes/smile, cyan ear rings/collar/chest badge.

Final project assets:
- `public/icons/ava-icon-1024.png`: full-resolution icon preview/source export.
- `public/icons/ava-icon-32.png`: small browser icon.
- `public/icons/ava-icon-180.png`: Apple Home Screen icon.
- `public/icons/ava-icon-192.png`: PWA/browser icon.
- `public/icons/ava-icon-512.png`: opaque PWA/adaptive icon (`any maskable`).
- `public/art/title/ava-city-portrait.webp`: 941x1672, approximately 127 KB.
- `public/art/title/ava-city-desktop.webp`: 1672x941, approximately 147 KB.

PNG icon sizes are exported from the generated square using Lanczos resampling;
RGB exports are opaque, with no pre-rounded corners. Essential face features remain
central for platform masks. Old icon assets stay recoverable and are no longer
referenced by the main HTML/manifest. New asset URLs avoid reusing old icon caches.

The existing manifest ID, start URL, scope, orientation, display mode, theme/background
colors, Apple standalone metadata, viewport and safe-area/fullscreen setup are unchanged.
Both manifest icons and the Apple touch-icon link now point at Ava, plus a 32px favicon.

`TitleArtwork` uses a responsive picture, choosing only the appropriate optimized art
for portrait/landscape. Title, Play, audio and recovery controls are live accessible
HTML with their existing handlers. Two lightweight SVG road-light paths and a slow
ambient opacity pulse add motion; reduced-motion disables animation. No WebGL,
external fonts, video, paid API calls, game state, or extra explanatory text were added.
The black Master Studios introduction, audio engine, Play/recovery flow, game/save
systems, databases, HQ and combat artwork are unchanged.

## Verification and deployment

202 development tests passed; production build and startup/restart smoke passed.
Isolated silent browser checks passed on 320x568, 375x667, 390x844, 430x932, 390x650,
844x390, 1024x768, 1440x900, 1920x1080 and 800x600. Checks included control bounds,
no document overflow, source selection, moving road lights, reduced-motion, Play to
HQ and return, recovery entry, visible audio control and unchanged mute preference
in silent test mode. Existing audio unit tests cover normal production behavior.
Every actual manifest icon URL returned PNG, with dimensions matching declarations;
Apple touch-icon link was checked. Browser contexts and disposable DB/server cleaned
up in finally. Release tests/build/smoke are run again before the approved GitHub push.

Physical iPhone installed-icon refresh and native PWA painting are not verified by
Chromium. If an existing iPhone installation retains its old icon, save its recovery
code before removing/re-adding it; never clear browser storage or reset progress just
to update an icon. The app's permanent identity and recovery system are unchanged.

References:
- Apple Home Screen icon configuration: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
- Adaptive icon safe zone: https://web.dev/articles/maskable-icon

## Final generation prompts

### App icon (identity reference first, approved icon composition second)

Create a production app icon, square 1024x1024, for The AI Race. Image 1 is the strict character identity reference: this is the real current Ava in the game. Preserve her exact recognizable sweeping asymmetrical glossy white bob-shaped head shell, black face visor, warm smiling magenta eyes and small magenta smile, cyan circular ear modules, cyan collar and small cyan triangular chest badge. Do NOT replace her with the antenna robot in Image 2. Image 2 is composition/color/premium icon polish inspiration ONLY. Ava is friendly and cute with modest proportions. Close-up head and shoulders, slightly tilted, small friendly thumbs-up tucked near one lower corner. Large clear face, readable at 48px. Luminous mint/cyan/sky-blue background with two elegant curved luminous circuit-road arcs, glossy white ceramic with soft warm highlights, polished stylized 3D render. Clean premium soft-tech mobile game identity. No words, letters, badges or UI. Full-bleed opaque square background, no rounded-square inset, no external margins or baked corner mask. Keep essential face within central 65% for adaptive icon cropping. This asset will be used as the actual PWA/Apple app icon.

### Portrait art (identity reference first, approved title composition second)

Use case: identity-preserve / stylized-concept. Create a portrait 9:16 mobile game title-screen BACKGROUND ART for The AI Race, without any UI or text. Image 1 is the STRICT current Ava character identity reference: preserve the same sweeping asymmetrical white bob-shaped ceramic head shell (not antenna horns), black face visor, bright magenta smiling eyes and small magenta smile, circular cyan ear discs, cyan collar, small cyan triangular chest badge, slender modest straight-hipped friendly robot body. Do not sexualize or exaggerate curves. Image 2 is the approved COMPOSITION, city, lighting and racing-road mood reference only; replace its different antenna character with real Ava from Image1. A polished cinematic soft-tech AI city in sky blue, luminous cyan, mint, warm off-white. Ava joyfully glides/runs toward the viewer, one open welcoming hand, dynamic elegant pose, head at roughly 31% image height; her whole hero silhouette stays in upper 57% of image and fits portrait comfortably, no limbs crossing the bottom UI space. Soft focus distant ivory futuristic startup towers, huge graceful elevated circuit road curving behind her; cyan and subtle pink lane lights flow in sweeping S-curves toward bottom foreground. Warm sun rim light, cool glowing roads, inviting optimism, premium stylized 3D game art. Lower 40% has a beautifully lit but QUIET uncluttered road gradient suitable for a navy two-line title and gold Play button added in HTML. Keep lowest 15% a calm cyan/blue road foreground. No lettering, no logo, no buttons, no sound icon, no watermark, no border. Clear composition, restrained atmosphere, not noisy.

### Desktop art (identity reference first, generated portrait art second)

Create a landscape 16:9 production desktop title-screen background art for The AI Race. Image1 strictly defines real Ava: asymmetrical swept white bob-like head shell, black visor, warm magenta eyes/smile, cyan ear rings/collar, cyan triangular chest badge, modest slender robot proportions. Image2 is the approved portrait art to match in scene, color, rendering and atmosphere. Recompose naturally for a WIDE desktop frame; do not stretch the portrait. Ava joyfully gliding/running toward viewer with open welcoming hand, occupying the RIGHT half, head near x73% y32%, whole body remains between x52% and95%, and y10%to83%. LEFT 45% is spacious clean luminous sky-blue/cream atmospheric negative space for a live dark navy title and gold Play button. Sweeping softly glowing cyan circuit roads curve through foreground from bottom-left toward right into distant ivory futuristic city, tiny pink road-light accents. Tower silhouettes and soft distant arch behind Ava, warm sunshine, premium stylized 3D, gentle depth and optimism. Maintain Ava's established actual in-game identity, not antenna robot. No text, no logo, no buttons, no music icon, no overlay panels, no watermark. Elegant polished soft-tech art, no clutter or busy high-contrast detail in left UI space.
