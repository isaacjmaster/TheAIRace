# HQ layout editing

Local-only update on codex/ai-race-integrated. Checkpoint: codex/checkpoint-before-layout-edit. No push, deployment or production database/volume change.

## Use
The icon-only four-direction arrow sits immediately above Build. Tap it to enter layout editing. Tap any completed Founder HQ, Builder Station, GPU Rig, Fabricator or Hangar. Drag or tap ground to preview a position, Rotate in 90-degree steps, then Save. Cancel restores the saved building without a request. Done or the active arrow exits editing. The normal Build/Attack/Settings controls return afterward. Pan camera and pinch-to-zoom remain available while editing; the Pan camera toggle prevents dragging from moving the preview.

Normal building taps retain labels, resource collection and training panels. There are no normal-mode Rotate actions or GPU Move catalog shortcut. Purchasing a new building still uses the normal initial placement flow, with no rotation action; completed structures are edited through the arrow. Collection badges and training-panel access are suppressed during layout editing to avoid accidental gameplay actions. Construction must finish before its structure can be edited; the permanent station can move while its builder is working.

## Persistence and validation
Optional hqLayout/stationLayout extend existing saves; absent fields retain the original landmark poses. Existing GPU/Fabricator/Hangar fields persist their own positions/orientations. No schema migration, session change, charge, reconstruction or capacity change is involved. Server transactions validate absolute layout commands, request UUIDs and reset generations. Retry cannot apply movement twice. All five types support saved rotation. Fabricator/Hangar move independently after completion.

Editing checks actual landmark footprints, rectangular rotation, campus bounds, road/lights, trees/rocks and neighboring structures. Purchases retain the protected HQ/worker areas, now following moved landmarks. Their old lots become available. The house's off-center foundation is included in rotation validation. Ghosts, selected meshes, labels and the worker's destination follow the saved transforms. Camera default framing follows relocated Founder HQ after reload. The builder returns to the saved station and faces its orientation.

## Verification
156 automated tests passed; production build and production startup/persistence smoke passed. New tests cover movement/rotation of all five types, preserving production timestamps and stored Compute, training queues and army, released/protected landmark lots, invalid/missing/unfinished structures, legacy fractional station anchor, SQLite restart and duplicate/mismatched actions. Existing audio, economy, combat and save tests pass.

Browser tests used ?testAudio=off and an isolated database. Founder HQ and station were moved/rotated with Compute remaining 16 and builder count 1/1. An attempted GPU overlap correctly disabled Save; Cancel restored it. Done restored normal controls; reload retained landmark placement and reset the UI to normal mode. 390x700 portrait viewport checks confirmed icon placement and four editing buttons fit. Physical iPhone gestures and safe areas require device testing; viewport/PWA configuration was unchanged. Agent test tabs were closed afterward.

## Preview
Same Wi-Fi: http://192.168.1.40:3013/
Desktop: http://localhost:3013/
Server: PORT=3013, HOST=0.0.0.0, GAME_DB_PATH=data/scrap-bot-preview.sqlite. This is isolated test progress, not production or the original local save. No player audio preferences were changed. Agent previews append ?testAudio=off.
