# Cipher Bot infiltration refresh

## Behavior

- Hangar stock comes from the authoritative foundation state. The deployment badge adds the existing reserved unit only while the mission is ready: ten trained bots display ×10, then ×9 after deployment; survival returns the reserved bot exactly once. Training, housing, and inventory keys are unchanged. The existing one-active-agent-per-operation rule remains; other trained units stay in the Hangar.
- Tap the circular Cipher Bot portrait to select it, then tap a highlighted perimeter tile. All four sides are supported. The server requires navigable, reachable exterior ground; buildings and solid walls remain invalid. The entrance strip remains usable for compatibility.
- Fictional targets display #NovaByte and #GridFox using the shared subtle hashtag styling. Target IDs and existing Influence cooldown associations are unchanged.
- Cipher Bot is the renamed starter troop everywhere player-facing. Shared HQ/Fabricator/Hangar/mission geometry now has a navy helmet, cyan visor, data pack and cleaner armor. Stable `scrap` inventory identifiers remain for save compatibility. No training prices, capacity, or timers changed.
- Automatic nearest-accessible-objective targeting is retained. New missions no longer flee from drones. They hack each reachable asset, then return to the existing extraction position. Existing per-asset rewards and Influence cooldowns are unchanged; finishing more objectives can yield more total loot than the previous early retreat.
- New missions use persistent laser defense version 2: 100 bot integrity, 20 damage per shot, at least 1.25 seconds between shots per drone, existing detection radius and warning interval. Drones continue clearance-safe patrols and require unobstructed sight before firing. Walls and buildings block shots. Intercepted agents lose unextracted cargo and their inventory reservation. These values are centralized in INFILTRATION.
- In-flight snapshots from older versions retain their previous defense behavior and reservation. No SQL schema migration or production data manipulation is needed. New audit logs include the defense version.

## Presentation

- Compact icon-and-count deployment tray; no visible deploy paragraph/button label. Accessible button naming remains.
- Reward-only result summary removes the returned/lost-unit line.
- Rendered movement follows deterministic authoritative prediction with short clearance-safe smoothing. Walking is still displacement-driven; stationary feet settle before the hacking pose. Hacking uses a raised arm, purple ring and data beam; it never damages buildings.
- Compact urban neighborhood replaces parallel street strips: a connected corner street, six varied commercial properties, parking, sidewalks, planters and trees. A lightweight material falloff blends distant scenery into sky in every direction. Scenery is excluded from navigation/picking.
- Four-side deployment tiles use one instanced mesh. Laser meshes reuse geometry, and all animation stops while the document is hidden. Existing Retina DPR/pixel-budget caps remain.

## Verification

- Full suite: 357 tests passed, including inventory/reservation settlement, concurrent retries, zero bots, recovery/restart, all deployment sides, blocked placements, laser timing/cover, old snapshots, and deterministic offline replay.
- Production build passed. Existing bundle-size advisory remains.
- Isolated production smoke passed (secure cookie, database persistence/restart and duplicate purchase protection).
- Chrome: 390×844, 844×390, 1440×900 and 900×700. WebKit: 390×844 and 844×390. Real UI selected a unit, rejected invalid ground, deployed via the perimeter, panned naturally, preserved counts, and handled return/loss. Chrome portrait/desktop completed full successful missions and refresh checks. WebKit included touchscreen taps.
- Dedicated actual Vector mission verifies visible laser fire, walking/hacking, interception, zero banked cargo and nine remaining bots. Screenshots/animation frames are saved under ignored data/cipher-media.
- Desktop-hosted WebKit is not physical iPhone Safari or installed-PWA verification. Physical-device performance remains an owner check.

## Local review

Run `node --import tsx scripts/preview-cipher.ts` after building. Isolated SQLite: data/cipher-preview.sqlite. Local URL: http://localhost:3058/simple-preview/lumen?tutorial=done&testAudio=off . Same-Wi-Fi iPhone: http://192.168.1.40:3058/simple-preview/lumen?tutorial=done&testAudio=off . Use vector instead of lumen for the second rival. No preview fixture routes ship in production.
