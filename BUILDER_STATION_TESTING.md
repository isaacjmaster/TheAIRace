# Builder Station, rotation and catalog

Local development only. Checkpoint before this update: codex/checkpoint-before-builder-station. No GitHub push, Railway deployment, production DB operation or volume change.

## Builder Station
One free permanent worker dock appears beside Founder HQ at (-1, 4.8), entirely within the work area already protected by every previous placement validator. No new save field, purchase, migration, capacity increase or relocation of player structures is needed. Existing and new players receive the same station. Idle builder rests on its pad, travels to the construction footprint, retains the construction animation and returns on completion. Tap the station for its Level 1 label and working/recharging status.

## Rotation
GPU Rig, Bot Fabricator and Bot Hangar support 0/90/180/270 degrees. Founder HQ and the worker dock remain anchored landmarks. Rotate in placement before Confirm; GPU Move retains its current orientation. The Fabricator purchase preview rotates the bundled Hangar around it too; after construction each can rotate independently in place without moving its neighbor.

Tap a completed rig for Rotate, or use the Fabricator/Hangar panel. Rotation is free and preserves construction timestamps, stored Compute, production cursor, training queue and army. Rotating a building under construction is disabled. Other completed structures may rotate while the builder works elsewhere.

Optional orientation fields extend existing JSON saves, defaulting to zero. No DB schema changes. Server-authoritative rectangle validation checks swapped width/depth, campus boundaries, road, protected Founder/work areas, scenery and one-unit building clearance. Existing unrotated rules remain equivalent. Absolute orientations and existing UUID/generation transactions prevent a retry rotating twice; invalid actions roll back. Refresh and SQLite process restart retain orientation.

## Build menu
All / Resources / Robotics tabs reflect the actual two-item catalog. Actual in-game GPU and Fabricator geometry is rendered once into cached PNG thumbnails; temporary renderers are disposed, with no extra ongoing animation. Hangar is advertised as included, never sold independently. Builder Station and Founder HQ are not purchase cards. Costs, 15-second timers, one-building limits and builder requirements remain unchanged. GPU Move is still available.

## Checks
147 automated tests passed, including five new tests for four rotated pairs, mixed rectangular collision, preserving production/training, station bounds and ray selection, SQLite restart, duplicate rotation requests and invalid API values. Production build and production smoke passed. Existing economy, bot combat, raid and save tests pass.

Desktop browser checks: legacy player retained 45 Compute and five bots while receiving the station; builder left for a rotated GPU construction, worked at the site, returned after Fabricator completion; GPU orientation 90 survived refresh and rotated to 180 without changing the 16 Compute balance or builder count. All category contents and real thumbnails verified.

390x700 portrait browser checks: readable cards and tabs; four comfortable placement actions; rotated Fabricator/Hangar pair correctly rejected trees at 90, Founder area at 180 and an existing GPU at 270, then accepted zero. Physical iPhone touch, pinch, safe-area and installed PWA behavior still require device testing; no viewport/PWA configuration changed.

## Preview
Same Wi-Fi: http://192.168.1.40:3013/
Desktop: http://localhost:3013/
Preview server: PORT=3013, HOST=0.0.0.0, GAME_DB_PATH=data/scrap-bot-preview.sqlite. This separate preview save does not replace original local or production progress. Stop and relaunch with these settings if the desktop restarts.

Test on iPhone: open HQ, tap Builder Station; open Build and switch tabs; place/rotate a building, confirm and observe builder; tap a completed building and Rotate, then reload and verify its orientation and resources. Rotated footprint errors should leave the building and balance unchanged. Check GPU collection, Fabricator training, Hangar counts and raids as usual.
