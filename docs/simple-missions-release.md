# Simplified missions and production UI

## Player flow

Open Infiltrate, browse Lumen Labs / Vector Works, enter the campus and deploy one owned Scrap Bot. Deploy Scrap Bot uses the default entrance; tapping clear entrance-side ground can place the bot elsewhere along the front perimeter. No pre-mission utility selection, manual target buttons, tactical orders or extraction button remain.

The server selects the nearest reachable unhacked asset, routes around the saved building/wall solids, and runs the existing timed hack. The bot continues automatically and returns when targets are exhausted, or when nearby defenses threaten already collected loot. Compute/Research are banked only on a successful return. Interception, abort after deployment and timeout still lose the deployed bot and unbanked loot. Cancelling before deployment returns the reserved bot. Influence values, cooldowns, inventory accounting and reserve overflow rules remain unchanged.

Probe and Jammer are removed from new mission state, simulation and the strict public command schema. Only deploy and abandon are accepted. Old tool/manual orders cannot be forged through stale clients. The one-time tutorial now teaches deploying, automatic resource hacking and enemy drones in three short messages. Its final world-projected arrow tracks the actual drone. Layout-aware framing puts the campus beside Ava in landscape and above her in portrait so the highlighted object cannot disappear under the speech bubble.

## Compatibility

New operations carry automationVersion 1. Active older operations adopt automatic control on their next authoritative advance: permanent operation ID, target snapshot, ownership reservation, original timestamps, completed hacks and carried loot are retained. A currently valid hack keeps its partial progress. Retired tool effects are discarded. Historical settled results and receipts are not rewritten. There is no destructive database schema migration, account reset or production test mutation.

## UI and world

Build now has a stable header/tab area and an independently scrolling catalog with min-height:0; overflowing category tabs scroll horizontally. Robotics can contain all three structures without shrinking the category controls out of view. Switching categories resets catalog scroll only.

Fabricator has a smaller angular Scrap Bot icon (tap to queue one), two gray locked question-mark slots and one Train Maximum button. Maximum uses current Compute, total housing including queued/reserved units, and the existing 10-bot cap. Sequential timing, costs and authoritative ownership remain unchanged.

Enemy previews use the actual scene with explicit preview framing and no fictitious HUD reservations; images use contain rather than crop. Gameplay uses the HQ's camera-plane drag basis. Enemy lighting now shares lightCampus / neutral tone mapping and CampusLawn's small procedural relief map, with cream paving, darker streets, planter beds and streetlights. Existing buildings, their footprints and enemy security routes are preserved. Static decoration is batched. Rendering is capped at DPR 2 and a 3-million-pixel budget. No new runtime physics, paid services or volumetric effects.

## Validation and review

All 352 automated tests and the production build pass, plus the isolated production-startup/persistence smoke test. Tests cover autonomous targets, navigation, deterministic offline/restart advance, retired-command rejection, reservations, single settlement, recovery, storage overflow, failures, cooldowns and queue capacity. Preview-camera tests include complete structures in the 360x220 card.

Chrome checks: 390x844 portrait, 844x390 landscape, 1440x900 desktop and 900x700 narrow desktop. Real UI tests exercise pinned tabs, icon/maximum training, both previews, tutorial targeting, rightward drag, zoom, automatic hacking/return, cancellation, refresh and troop/resource counts. WebKit checks cover 390x844, 844x390 and 320x568, including checking that the drone target remains outside Ava's dialogue. These are desktop-host browser tests, not physical iPhone/PWA testing or device performance benchmarks. The existing large-chunk build warning remains.

Run `node --import tsx scripts/preview-simple-missions.ts` and open `http://192.168.1.40:3057/simple-preview/hq?testAudio=off` on the same Wi-Fi. `/simple-preview/lumen?testAudio=off` and `/simple-preview/vector?tutorial=done&testAudio=off` create isolated mission fixtures. Preview data lives only in data/simple-missions-preview.sqlite and preview routes are never registered in production.
