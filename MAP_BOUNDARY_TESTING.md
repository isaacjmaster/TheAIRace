# Map boundary — local visual preview

## Preview

Build: `npm run build`.
Start: `node --import tsx scripts/preview-boundary.ts`.
Desktop: http://localhost:3020/
iPhone on the same Wi-Fi: http://192.168.1.40:3020/

The launcher uses its own `data/boundary-preview.sqlite` and cookie, with no legacy save imports. Existing previews and production saves are untouched. Agent previews must append `?testAudio=off`.

## Implementation

- A continuous, watertight faceted rock rim starts outside the playable campus: minimum inner bounds x [-28,32], z [-23,28]. All gameplay bounds, fences, trees, roads and placements remain unchanged.
- Five irregular terrace/cliff strips and 64 shared-geometry instanced boulders create restrained shape/color variation. Peaks stay below four world units and remain outside the active area.
- A procedural 256px tileable cloud texture is sampled twice on a world-space annular mesh. The mesh has a real central hole; it is not a fullscreen overlay. Opacity increases beyond the rocks and color blends into the existing sky. Slow UV drift stops with reduced motion.
- The old outer terrain triangles end underneath the rock rim. All original terrain vertices/heights/colors are retained, and only outer indices are removed. Archived/nonminimal scenes keep the original unbounded terrain path.
- Maximum zoom-out exposed the orthographic near clipping plane. Pulling the eye back along the same viewing direction preserves exact x/y projection, scale, angle and pan controls. Fog distances shift by the same amount so existing atmospheric appearance is retained. Near/far plane settings remain conventional.
- Decoration opts out of raycasting and never joins building/obstacle hit lists. No collision rules, save fields, database code, economy, combat, UI or audio change.
- All geometry, materials, texture and instance resources are disposed when leaving HQ.

## Performance

Boundary budget: three rendering objects/draw calls, approximately 3,300 triangles, one small reusable cloud texture, no extra shadow passes, particles, volumetrics or offscreen render targets. Terrain clipping also removes unused outer triangles. Only a time uniform updates each frame.

Silent Chromium sample at 390x844: 285 scene draw calls / 26,987 triangles at the initial HQ; corner view 189 calls / 18,355 triangles. Desktop 1440x900: 252 calls / 26,455 triangles; corner view 237 calls / 23,339 triangles. These are rendering-work samples, not a physical iPhone frame-rate guarantee.

## Verification

- 216 automated tests passed, including five new boundary tests: closed strips, playable-area exclusion, cloud coverage, input isolation, reduced-motion/resource disposal, identical original terrain data, and identical orthographic framing/fog depth.
- Production build and production startup/persistence smoke passed.
- Silent browser previews checked northwest, northeast, southeast and southwest corners at minimum zoom on 390x844 mobile and 1440x900 desktop.
- Additional sizes: 320x568, 390x650, 430x932, 1024x768, 1920x1080. No document overflow or WebGL/runtime errors.
- Settings, leaderboard and replayed Ava overlays verified above the scene.
- Temporary browser contexts and server closed in finally. The separate user preview remains running.

## Physical iPhone review

Open the LAN preview, enter PLAY and optionally Skip Tutorial. Pinch out and drag to each fence corner. Look for gaps, abrupt sky/terrain boundaries, obscured buildings and touch issues. Confirm Build, Attack, Move, Settings, leaderboard and obstacle selection still respond. Review slow cloud drift, then repeat with Reduce Motion enabled. Check Safari and the installed HTTPS app after a future approved deployment; HTTP LAN emulation cannot certify standalone iOS rendering or device frame rate.

No push or Railway deployment is part of this update.
