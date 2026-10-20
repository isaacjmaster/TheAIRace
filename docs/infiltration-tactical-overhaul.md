# Infiltration tactical overhaul — local review

Branch: codex/infiltration-tactical-overhaul. Not pushed or deployed.

## Environment and camera

InfiltrationDistrict now composes the actual TechnologyDistrict renderer used by the Founder HQ. An optional campus-size argument selects a compact rival neighborhood; existing HQ defaults and layouts are unchanged. Shared assets include CampusLawn color fields/relief, warm CampusFinish lighting/materials, ten district building variants, streets, sidewalks, planters, parked cars and adaptive ambient traffic. A continuous planted curb and tree/rock belt finishes the neighborhood. No infiltration fog or gradient mask is used.

The compound remains in the existing 42 x 34 arena, with the broad outer deployment lawn and existing protected layouts. Stronger default framing emphasizes the campus. Camera limits derive from the projected arena and viewport: twelve units across the short dimension at close inspection; the far view keeps projected ground corners inside the finished 220-unit lawn even at full pan. Maximum pan is 15 x 11 units around the center. Orthographic camera distance and clipping planes now scale with the visible footprint; this fixes the near-plane ground clipping that caused the blue band on tall portrait views. No overlay conceals the issue.

## New-mission balance

| Setting | Value |
| --- | --- |
| Cipher Bot health | 60 |
| Wrist weapon | 9 damage, 4.6-unit range, 1-second cooldown |
| Drone engagement acquisition | 6.4 units for bots |
| Target lock / retarget threshold | 900 ms; alternate threat must be 30% closer |
| Security Drone health | 100 |
| Drone laser | 22 damage, 5.8-unit firing range, 1.25-second cooldown |
| Drone detection | 6.8 units; 650 ms reaction before first shot |
| Solo hacking | GPU 12 seconds; Research Lab 16; Data Core 22 |
| Group work contributions | 1 + 0.65 + 0.40 + 0.25 + 0.15; maximum five workers per asset |

All values are in shared/tactical-infiltration.ts. Buildings remain intact. Bot training prices, inventory, mission duration, rewards and the player's HQ economy are unchanged. Existing wall-breach/opening behavior remains.

Bots choose nearby eligible technology or visible drones, use a stable lock and distance threshold, raise a compact wrist weapon and fire cyan pulses. Shared work stations use two rows to reduce overlapping robots. Shared hacking progresses in authoritative fixed ticks and survives interruptions; dead workers stop contributing. Drones acquire targets, move only if a firing position is required, hover while firing, and resume patrol when no visible target remains. Both weapon types require range and unobstructed 2D line of sight through the existing solid geometry. Disabled drones stop immediately and remain as inactive ground models. Compact health bars appear only on damaged active units. No building damage was added.

## Completion and partial outcomes

Completing the final required hack ends the mission in that exact server tick, freezes the timer and stops combat. All still-active bots are returned through the existing idempotent unit settlement. Pending Compute/Research and Influence use the existing transactional mission receipt and storage-reserve rules. No final extraction walk is required. Retreat, interception and timeout forfeit unbanked pending loot and active units under existing abandonment/failure semantics; completed hack history and partial work remain in that mission snapshot for validation, not reusable rewards.

## Persistence and compatibility

New squad snapshots include rules: tactical-v1, per-drone health/acquisition clocks, per-bot weapon/target state and existing per-asset progress. Old active snapshots without this flag continue the prior simulation and balance. No destructive SQLite migration or account rewrite is needed. Mission audit logs record the rule version and validated survivor/disabled-drone outcome. Permanent identities, recovery credentials, balances, XP, buildings, decorations, security ownership and Influence records remain unchanged. Tests use independent temporary SQLite databases; local previews use data/tactical-preview.sqlite. No production player or Railway volume was accessed or modified.

## Validation

- 379 automated tests passed, including legacy snapshot replay, tactical combat, collision/line of sight, hover stability, target hysteresis, diminishing work, interruption, immediate completion, survivor settlement, recovery after SQLite restart, concurrent result polling and camera ray/terrain coverage.
- Production build passed; existing large-bundle advisory remains.
- Isolated production smoke passed: startup, static assets, API, cookies, nested database path, process restart and duplicate purchase rejection.
- Chrome and WebKit: 390x844 portrait, 844x390 landscape, 1440x900 desktop. Close/far zoom limits, natural pan, broad deployment, refresh persistence and retreat checked; contexts closed in finally blocks.
- Controlled encounters: one bot versus one drone lost its bot without disabling the drone; three versus one disabled the drone with no bot lost; five versus two disabled both with one bot lost. Ten-bot compound simulations completed Lumen with nine survivors and Vector with seven. These controlled cases establish initial tuning, not a claim of finished gameplay balance.
- Actual final desktop browser run with serial placements: Vector completed in 24.5 seconds, both drones disabled, six survivors, 60 Compute / 40 Research / 50 Influence credited exactly once. Stationary drone fire, wrist pulses, group hacking and immediate completion captured. Representative final frame: 542 draw calls / 159,808 triangles; no claim of physical-iPhone FPS or battery performance.
- Final 390x844 touchscreen browser mission also completed with six survivors, both drones disabled and the same verified rewards; wrist fire, hover fire and group hacking were observed. Representative frame: 574 draw calls / 160,424 triangles.
- Physical iPhone Safari, installed PWA and native desktop-shell testing were not performed. Browser emulation and WebKit checks cannot fully reproduce those devices.

## Local review

After `npm run build`, start `node --import tsx scripts/preview-tactical.ts`.

Same-Wi-Fi URL: http://192.168.1.40:3061/simple-preview/vector?tutorial=done&testAudio=off
Lumen: /simple-preview/lumen?tutorial=done&testAudio=off
Every fixture route creates an isolated test company. Agent previews are silent; manually remove testAudio=off to listen without altering saved mute preferences for tests.

Screenshots and recordings: data/tactical-media/. Includes before/after environment, portrait zoom extremes, wrist weapon close-up, Cipher firing, hovering drone fire, group hacking and immediate result. No push or deployment until approval.
