# Spatial refinement validation

Baseline: client source frozen at `78e0b36`. Review: `output/Spatial_Review/index.html` (local generated artifact, not shipped game content).

## Automated verification

- Full relevant suite: **825 tests passed**, plus production build and production smoke checks (integrator run).
- Isolated full-app editor, desktop 1440x900 and phone viewport 390x844: **200 real wall placements** each; 180 used consecutive Place actions. Verified exact adjacent coordinates, all five wall levels, partial save of 60 walls with 140 retained, reload draft recovery, cancel/keep-editing, simulated HTTP 503 retaining the draft, retry, final save and completed entitlement state. No page errors.
- Building editor on both viewports: rotate GPU Rig 90 degrees; cancel preserves saved position/rotation; move from `[4.5,-10.5]` to `[5.5,-11.5]`; save and reload preserves both position and rotation.
- Connected three-wall row on both viewports: drag preview, save, reload; each saved segment matches the displayed first-segment preview anchor and relative offsets.
- All tests used in-memory databases. All game URLs used `testAudio=off`. Browser contexts, browsers and servers closed in `finally` blocks.

## Visual evidence

Actual game screenshots compare the same synthetic campus, camera angle and zoom before and after: Levels 1, 3 and 5; dense 200-wall campus; mixed Level 1-5 campus; construction-grid views; normal phone gameplay. Separate actual SecurityWalls rendering covers all five approved designs, nine symmetrical compartments with connected extensions, mixed-level joins, and 200-wall stress layouts. The dedicated wall camera was moved farther back to avoid near-plane clipping in the capture harness.

## Measurements

A synthetic CPU benchmark of one segment-level change in a 200-wall Level 5 layout used eight iterations, discarding two warmups:

| Method | Six recorded samples (ms) | Median |
|---|---|---|
| Full rebuild | 143.504, 144.175, 146.270, 149.346, 159.059, 199.864 | 147.808 ms |
| Local update | 22.684, 23.339, 23.831, 23.885, 25.952, 28.615 | 23.858 ms |

The synthetic CPU median decreased about **84%**. Wall rendering temporarily used 67 draw calls while editing versus 8 after normal-view compaction. This is a CPU/update and draw-submission comparison, not mobile FPS.

Full-campus draw-call/triangle and headless frame-interval samples are retained in `output/Spatial_Review/before/checks.json` and `after/checks.json`. Headless frame intervals were mostly 13.3 ms; scheduler-paced samples are not evidence of physical-device performance gains.

## Limits

No physical iPhone testing, human playtesting or production-player mutation was performed by these review suites. Phone checks emulate viewport/pointer capability in desktop Edge; they do not establish native Safari touch or device GPU performance. Synthetic bases exercise the placement/rendering architecture without claiming to reproduce a particular player's saved base. Production deployment verification is handled separately by the integrator.

## Reproduction

- `npx tsx scripts/review-spatial-campus.ts` (set `REVIEW_BASELINE=1` after extracting baseline src/shared/raid/index.html to `output/Spatial_Review/baseline` for before captures).
- `node scripts/review-spatial-walls.mjs` (`--before` uses the frozen renderer).
- `npx tsx scripts/review-spatial-editor.ts`
- `npx tsx scripts/review-spatial-building-editor.ts`
- `python scripts/review-spatial-report.py`
