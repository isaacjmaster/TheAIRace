# Current prototype: Minimalist Foundation

See [FOUNDATION_TESTING.md](FOUNDATION_TESTING.md) for changes, save isolation, validation and iPhone instructions. Earlier release notes below are historical.

# The AI Race — Integrated Prototype 0.5

Landscape HQ, unified 3D raids, and original procedural audio. See [V05_TESTING.md](V05_TESTING.md) for the current launch instructions, checkpoint, save compatibility, audio details, and desktop/iPhone tests.

The notes below describe previous milestones.

# The AI Race — Garage + Raid Integration

This checkout is the isolated `codex/ai-race-integrated` prototype. Start with [INTEGRATION.md](INTEGRATION.md) for launch commands, desktop/iPhone testing, save isolation, upgrade effects, and verification results.

The following notes describe the original garage milestones and are retained as historical documentation. Operations and its recovery economy are replaced in the integrated interface by ATTACK and raid rewards.

# The AI Race — first playable prototype

A portrait-first browser game set in a tiny AI startup garage in 2028. One agent, three repeatable contracts, two hardware upgrades, deterministic game rules, and persistent local saves.

## Launch on your computer

Requires Node.js 24 (tested with 24.21) and npm. In PowerShell:

```powershell
cd path\to\TheAIRace
npm.cmd install
npm.cmd run build
npm.cmd start
```

Open http://localhost:3001. Leave the terminal running; Ctrl+C stops it. Dependencies are already installed in this checkout. No deployment is needed.

For development with automatic reload, use `npm.cmd run dev` and open the Vite URL printed in the terminal (normally http://localhost:5173).

## Play on iPhone

1. Connect the computer and iPhone to the same trusted Wi-Fi.
2. Run the build/start commands above on the computer.
3. Run `ipconfig` and find the active Wi-Fi adapter's IPv4 address.
4. In iPhone Safari open `http://YOUR_COMPUTER_IP:3001` (for example http://192.168.1.25:3001).
5. If Windows Firewall prompts, allow Node on **Private networks**. Do not expose/forward this port to the public internet. Guest Wi-Fi may isolate devices.

The server must stay running on the computer. This is a local HTTP playtest with Home Screen icon and standalone metadata; offline support is a later milestone. Real iPhone Safari testing is still needed even after desktop portrait checks.

## First playtest

Name your company on HQ, open Missions, choose **Tame the inbox**, and select **Precision**. On the starting laptop this allocates 2 execution and 1 verification. Inspect the preview, then deploy. Collect 76 credits after 11 seconds. With the starting 20 credits, purchase the 90-credit workstation. The garage gains a workstation, capacity rises from 3 to 5, and work becomes 20% faster. Try speed versus accuracy and the privacy contract to compare outcomes.

Compute is reusable capacity, not a consumable. Contracts have no credit entry fee and can be repeated, so there is always a way forward.

## Saves

SQLite saves live in `data/game.sqlite` (with possible WAL companion files). A browser cookie identifies your company. Refreshing or restarting the server preserves it. Different browsers/devices have separate companies. Clearing cookies creates a new company; existing saves are not automatically reattached. Stop the server before backing up the complete `data` directory. Keep this directory private and out of Git.

## AI modes

**Demo is the default.** It is a limited local language interpreter, clearly labeled in the game, with no AI service calls. Supported intent includes speed, accuracy, balance, review/double-checking, and privacy filtering. Unsupported or unclear requests ask for clarification. Both providers feed the same validated engine.

The live OpenAI adapter is implemented but has not been enabled or exercised. Preset approach cards do not invoke the provider; only the optional custom instruction interpreter can do so when live mode is explicitly enabled. It needs a funded API project/key, a compatible structured-output model, and explicit approval to incur API usage. Never put keys in frontend files or VITE_ variables.

`.env.example` documents the server-only settings. Copy it to `.env` only when ready; keep `AI_MODE=demo` and `AI_LIVE_ENABLED=false` for free testing. Launch scripts load `.env`. Enabling live requires every guard to be configured: explicit live flags, key, model, daily request limit (1–100), and output token limit (100–1000). Use a dedicated restricted project and provider billing controls as well. Request limits are not a currency budget; model pricing determines spend.

The server reserves the global daily quota in SQLite before each request, including failed calls, sets a 15-second timeout, disables SDK retries, limits input length and output tokens, throttles sessions, and caches repeated interpretations briefly. Quota resets at UTC midnight. Instructions are sent to OpenAI only in explicitly enabled live mode. No user instruction logs are written by the app.

## Validation

```powershell
npm.cmd test
npm.cmd run build
```

Tests cover game progression, invalid actions, resource allocation, duplicate collection, API sessions, stale revisions, deduplicated commands, and provider guards. Test databases are isolated from playtest saves.

## Boundaries

UI/art: `src/ui`, `src/art`; authoritative engine: `src/game`; backend/interpreters: `server`; contracts: `shared`. `OWNERSHIP.md` defines agent responsibilities and interfaces.

No multiplayer, rankings, payments, raids, research trees, alignment-crisis system, hosting, or paid services are enabled. This local prototype has anonymous sessions and is not ready for public internet hosting without authentication and operational hardening.

## V0.2 UI and iPhone icon

The app now uses HQ, Missions, Upgrades, and Rankings navigation. Choose a mission, select Precision/Sprint/Steady, and deploy. Custom AI instructions and manual verification allocation are under Advanced. Precision uses accuracy + review with one verification unit; Sprint uses speed with zero verification; Steady uses balanced with one verification. Remaining compute goes to execution. Privacy missions add the existing privacy check to each preset. These are choices under the unchanged game rules, not changes to the economy. Rankings is a non-functional coming-soon screen.

Official artwork: `public/icons/ai-startup-garage-original.png`; generated PNGs: 180, 192, 512 pixels. `index.html` selects the 180px Apple Touch Icon, and `public/manifest.webmanifest` declares the app name, portrait preference, and standalone display. No service worker, offline cache, or server changes were added.

After changes, stop the old server with Ctrl+C, run `npm.cmd run build`, then `npm.cmd start`. Open the same game address in Safari and reload. Use Share → Add to Home Screen; enable Open as Web App if offered. Keep your old shortcut until the new shortcut shows the new icon and the expected company, then remove the old duplicate. Do not clear Safari website data to refresh the icon: that removes the cookie used to identify your saved company. Safari and Home Screen apps can have separate sessions; all server-side saves remain intact. If the local IP changes, the browser sees a different origin/session. The computer server must remain running; offline play is not included.


## Title screen and larger HQ

Fresh page/app mounts now open the title screen. PLAY enters HQ; CREDITS shows “Created by Master Studios” and Back returns to the title. Launch navigation is React session state only: switching in-game sections or resuming the same running session does not reopen the title, and no save schema/cookie changes are involved. Reloading starts a fresh title flow while loading the same saved company.

The old title/slogan header is removed from gameplay. Credits and sound remain in a compact utility strip. HQ uses a tighter garage art framing, removes old artwork height caps, and compresses resource and agent-status panels. Existing portrait/standalone manifest metadata, app icons, and safe-area insets remain intact. Refresh after rebuilding to view the update.

## Story introduction and Pixel tutorial

New companies now see four player-paced story moments after PLAY. Continue/Back move between moments, and Skip story enters the garage immediately. Pixel then guides the real starter mission, collection, and first workstation upgrade. Highlights point to the existing controls; the guide does not auto-deploy, grant credits, change outcomes, or restrict normal navigation. Skip guide dismisses it permanently for that company. An unfinished guide resumes from actual mission/hardware progress after reloading.

Returning companies go directly to HQ after PLAY. For existing test saves, use **CREDITS → Replay introduction** from the title screen. Replay returns to Credits and changes neither company progress nor tutorial status. To test the entire brand-new flow, use a separate browser profile/private window rather than clearing the existing company cookie.

Onboarding flags live in a separate SQLite `onboarding` table keyed by the existing session. Existing session rows are treated as returning players even if their game revision is zero; only newly created sessions get first-player flags. `/api/onboarding` updates those flags without touching game state, revision, rewards, or resources. No game-save migration is required. The database gains this additive table on server start. Restart the server after updating (`Ctrl+C`, then `npm.cmd start`). Reduced-motion preferences, touch targets, portrait layout, and safe-area spacing are preserved.


## Resource Expeditions milestone

The new **Explore** activity opens Neon Salvage, an interactive isometric recovery yard. Gather scrap and energy cells, return to HQ, and craft the Recovery Rig to increase battery/cargo capacity and unlock GPU recovery. Contracts remain under Missions, with their existing rewards and progression. The four main navigation buttons are HQ, Explore, Missions, and Upgrades; Rankings is linked from Missions.

See [EXPEDITIONS.md](EXPEDITIONS.md) for exact controls, the first-outing walkthrough, safety/energy rules, save compatibility, and known limitations. In brief: collect Broken drones twice and Battery cache twice, walk Home, Return to HQ, then install the rig under Upgrades. No credit grind is required.

The normal database path remains `data/game.sqlite`. Expedition state is saved in separate tables, including in-progress outings, and existing company saves remain compatible. There are no expedition AI calls or new paid services. Restart the server after building so the new API routes are loaded.

## Garage 2.0

HQ now centers on the garage: Level 1 has only a floor laptop and Pixel; Level 2 adds the first desk, chair, desktop, task lighting, and plant; Level 3 adds a GPU workbench, server rack, stronger lighting, and greenery. The earned Recovery Rig appears independently at every stage. Existing hardware levels select the artwork automatically, with no save migration or new upgrade costs.

The permanent agent/status and resource panels are replaced by a compact **Inventory** button. It opens banked resources, compute, assignment, and progress details; carried expedition cargo stays in Explore. HQ, Explore, Missions, and Upgrades remain in the compact bottom navigation. Successful equipment purchases briefly illuminate the garage and show an installation message. Reduced-motion settings are respected. Title, credits, tutorial, expedition mechanics, and backend calculations are unchanged.

## Operations 0.2

**Operations** is the main garage exit. Choose **Safe (scrap)**, **Medium (energy cells)**, or **Dangerous (GPU parts)**, then Start. Pixel moves and gathers automatically. After each recovery, choose Continue, another destination, or Return to HQ. Return banks cargo, shows a clear rewards screen, and connects to the existing visible Recovery Rig upgrade. Command buttons, strategy menus, and instruction panels have been removed from the primary interface.

See [OPERATIONS.md](OPERATIONS.md) for controls, launch commands, simulation rules, save compatibility, and limitations. Existing manual/autonomous outings retain their progress and open in the same simplified interface. HQ art, title/credits, missions, upgrade prices, and inventories are preserved. No paid planner or deployment is enabled.

## First Railway deployment

See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for the private deployment branch, production commands, mandatory SQLite persistent volume, save/session behavior and approval boundary. Do not deploy until approved.

## Current local portrait preview

The active development build is now portrait-first. See [PORTRAIT_TESTING.md](PORTRAIT_TESTING.md) for camera/UI changes and iPhone testing. The landscape deployment branch has not been updated by this work.


## Founder HQ Level 2 (local progression update)

Founder HQ building level is independent of Company XP. `shared/founder-hq.ts` configures the first upgrade: 500 Compute, 300 seconds, one available Builder Bot; GPU capacity is one at HQ Level 1 and two at Level 2. Existing second rigs remain owned, productive and movable. Both HQ models retain the same 9×8 gameplay footprint, with rotation and work-route validation.

Save compatibility uses additive optional fields in the existing SQLite `foundation_saves.state` JSON: `founderHqLevel` and `hqUpgrade` (`id`, `targetLevel`, `startedAt`, `completesAt`). Missing levels read as 1; existing records are not replaced or bulk rewritten. Completed upgrade metadata is retained. The existing authenticated action transaction and request receipts atomically save cost, builder reservation and upgrade; normal server-time advancement completes it after an offline interval. There are no new SQL tables, credentials, Company XP rules or deployment settings. Verified SQLite backups were made before implementation under ignored `data/backups/`.

Run `npm run build`, then `npm run preview:hq` for a separate local preview database, cookie and review company. Open `http://192.168.1.40:3036/hq-upgrade-preview` on the same Wi-Fi, press PLAY, select Founder HQ and Upgrade. This isolated company starts with 650 Compute, a Builder Station and one GPU Rig; the normal five-minute timer applies. Do not use this development script in production. Automated previews append `?testAudio=off` and close their browsers.

Verification: `npm test`, `npm run build`, `npm run test:production`. Upgrade tests use temporary SQLite databases and an injected server clock; browser captures use isolated preview companies with only their test deadlines advanced for completion screenshots. Physical iPhone Safari/PWA rendering still requires device review.


## Technology district environment (local reskin)

`src/art/TechnologyDistrict.ts` supplies decorative roads, sidewalks, crossings, landscaped verges, parking and neighboring low-rise offices for the current Founder HQ and raid scenes. Building models, simulation geometry, cameras, placement validation and persistence are unchanged. HQ property aprons read existing positions and rotations; all new raised scenery stays outside the playable bounds, except the four existing reserved streetlight locations. Scenery has no raycast targets. Static neighborhood pieces are merged by material; changing property aprons use instancing plus one outline batch. No additional lights or server simulation jobs are introduced. Ambient traffic uses the existing scene update loop, pauses while hidden, and stays still with reduced-motion preferences.

The pre-reskin HQ implementation remains in `buildLegacyEnvironment()` and the raid implementation in `legacyEnvironment()`. Append `?landscape=legacy` to compare or revert presentation immediately; remove the parameter to use the district. This switch is read-only and does not touch player state or browser preferences. Existing raid deployment markings are shared unchanged between both styles.

Run `npm run preview:district` after `npm run build`. On the same Wi-Fi, open `http://192.168.1.40:3037/district-preview` for a separate development database/cookie and review company containing the current buildings and ten Scrap Bots for attack testing. The development script refuses production mode. To compare the same preview company, visit `http://192.168.1.40:3037/?landscape=legacy`, then return to `/` for the new district. No live database or Railway configuration is involved.

Verification: `npm test`, `npm run build`, `npm run test:production`; scene captures compare desktop, portrait and landscape rendering, identical ground-picking coordinates and unchanged state after render. Browser flows check raid selection, accepted deployment, panning without deployment and returning to HQ. Physical iPhone GPU/thermal performance remains a device review step.


### Urban-density refinement

The surrounding blocks now contain ten independent decorative silhouettes (`DistrictBuildings.ts`), connected intersections, multiple parking arrangements and predominantly paved commercial parcels. The protected HQ lawn/placement area remains intact. There are 48 background properties around HQ and 36 around raids, with simplified distant facades. The initial suburban renderer is preserved locally at ignored `data/TechnologyDistrict-suburban.ts`; original pre-district scenery remains selectable with `?landscape=legacy`.

`DistrictTraffic.ts` draws all compact cars, sedans, SUVs and delivery vans through one shared instanced mesh. Traffic follows two separate right-hand lanes on constant-speed rounded routes around the protected campus, with eight vehicles at desktop sizes and four on smaller viewports. Routes have no server authority or collision objects. Vehicle animation reuses the existing render clock; hidden pages stop advancing it, reduced-motion mode leaves vehicles stationary, and resumed frames do not fast-forward. Background district geometry does not cast additional shadows.

Tests cover all ten building variants, decorative bounds including vehicle instances, continuous turns and loop seams, constant speed, road containment, visibility/reduced-motion pauses, adaptive vehicle counts, disposal and unchanged picking/state. Browser previews use isolated test companies and close automation contexts on completion. Physical iPhone performance requires device review.


### Visual Founder HQ panel and expanded plot (local review)

The Founder HQ popup uses a prominent title, actual building-level badge and a cached image of the current GPU Rig model for the `+1 GPU Rig` Level 2 reward. Compact Compute/time icons retain the upgrade quote; cost, duration, builder reservation and unlock authority remain unchanged. The Build menu shares the same thumbnail component. The short-height landscape panel uses two columns to keep the action visible.

`shared/foundation-plot.ts` is the foundation-only bounds source: x -34..38, z -27..32 (72×59), expanded from 52×43, about 90% more total plot area. Validation, builder routing, obstacle spawning, exact rectangular placement grids, camera panning limits and decorative district boundaries use it. The central road, existing structures and obstacles stay at their saved coordinates. Initial camera framing/zoom and all raid bounds remain unchanged. No database migration is required. Existing stored clearing routes and layouts are preserved.

Run `npm run preview:plot` after building for an isolated review company at `http://192.168.1.40:3038/hq-plot-preview`, using a separate SQLite file/cookie. The review company starts with 650 Compute and one GPU Rig; normal upgrade prices and times apply. Tests include all four new plot edges, rotated footprints, server purchase/retry/reload, builder work and clearing in expanded areas, and the existing complete upgrade flow at desktop/portrait/landscape sizes. Automated browser accounts are separate from the review company.


### Starting territory and visual upgrade progression (local review)

New landscapes start with 28 clearable obstacles: 12 trees, 10 scrap piles and 6 boulders, up from two trees and two scrap piles. Existing landscape records are not backfilled or reset. Starter construction locations and builder routes remain available; occupied and rotated building footprints are respected. Regeneration remains gradual at one attempt every three hours, now capped at 40 obstacles. Boulders reuse the existing six-second builder clearing action and award four Compute; trees and scrap retain their existing two/three Compute rewards and storage handling. Existing fixed decorative rocks are unchanged. All rewards and clearing completion remain server-authoritative and idempotent. No SQL schema migration is required.

The Founder HQ panel now shows cached renders of the actual Level 1 and Level 2 models with an arrow, a smaller GPU Rig reward thumbnail, and compact 500 Compute / five-minute indicators. Upgrade mechanics are unchanged. The HQ lawn uses deterministic low-frequency green/earth vertex-color fields and a shared 64-pixel bump tile. Its geometry remains flat and non-interactive; raid terrain is unchanged. The expanded 72×59 plot and urban district remain intact.

After building, run `npm run preview:territory` for an isolated database/cookie and review company at `http://192.168.1.40:3040/territory-preview` on the same Wi-Fi. The company starts with 650 Compute, a Builder Station and one GPU Rig; real upgrade costs and timers apply. Automated browser accounts are separate and muted. Verification: 281 automated tests, production build and production smoke checks pass; desktop, portrait and landscape browser flows cover purchase, builder movement, completion, second-rig unlock and persistence. Physical iPhone rendering/performance still requires device review.


### First decorations, placement gestures and campus HQ music

The Build menu now opens Resources (Robotics for Ava's free-builder lesson); Robotics is preserved and Decorations adds Ornamental Tree / Cypress Tree / Flower Garden / Modern Planter at 25 / 35 / 40 / 50 Compute. Cosmetics are immediate, repeatable purchases with no builder, XP, production or bonus. They use optional `decorations` records in the existing save JSON: permanent request-derived UUID, kind, position and orientation. Missing fields remain valid; no SQL schema change or bulk save rewrite is needed. Authenticated atomic action receipts protect purchases, moves and removals against retries, concurrent tabs, stale resets and forged prices. Recovery restores the same company records. Remove requires confirmation and provides no refund; functional buildings have no delete action. Occupancy validation and regeneration respect the decoration footprints and required access. Drag previews use inexpensive footprint checks; server confirmation additionally verifies building access routes.

During placement/Arrange, drag the preview to move it, drag empty terrain to pan, or use right/middle mouse drag to pan. Wheel and two-finger pinch zoom; a pinch cancels manipulation until all fingers lift. Explicit Pan Camera remains available. Nothing is placed or charged until Confirm/Save; Cancel restores the previous layout. The GPU collection badge now shares the exact Compute HUD SVG component.

HQ music is the original 40-second, 96 BPM composition *Small Campus, Big Dreams*: licensed CC0 sampled marimba/piano, soft synthesized pads and restrained percussion. This is an offline authored sampled/synthesized production, with no paid service or runtime synthesis cost. It is not a live musician recording; physical iPhone listening is still required. Source provenance, score, renderer and loudness/loop measurements are under `music/candidates/hq-campus/` and the retained VSCO license. The raid master is byte-for-byte unchanged; existing transition, autoplay, suspension, mute-preference and test-mute behavior remain in use. The previous HQ files are retained for rollback.

Run `npm run preview:decorations` after building: `http://192.168.1.40:3042/decorations-preview` on the same Wi-Fi, with a separate SQLite database/cookie and review company. Automation is muted and closes every browser context. Development SQLite was backed up through SQLite's consistent backup API and integrity-checked before implementation. Production data is never used for local tests.
