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


### Local UI / founder-idle refinement review

Decoration thumbnails use projected full model/base bounds with consistent 15% framing margins. Other building thumbnails retain their previous framing. The Fabricator shows a level badge, Scrap Bot portrait, capacity, five-second duration and exact Train 1 / Train 5 actions; active queue progress and cancellation remain available without the former quantity controls or explanatory text. Compute costs, sequential training, housing and save authority are unchanged.

The HQ workspace uses a shared hinged laptop with a separate keyboard, articulated hand targets behind its screen, occasional two-second typing bursts and one slow coffee pickup/sip/replace sequence per 36 seconds. Tiny pooled steam puffs appear intermittently while the mug rests; reduced motion returns everything to a still seated pose. Both HQ levels use this workspace; exterior footprints, upgrade rules and saved state are unchanged. Desktop fine-pointer HQ zoom limits are 0.58–1.65 versus the previous 0.65–2.0. Coarse-pointer/mobile limits remain 0.65–2.0, in both orientations.

After `npm run build`, `npm run preview:refinements` serves an isolated company/database/cookie at `http://192.168.1.40:3044/refinements-preview` on the same Wi-Fi. It includes completed bot buildings and 650 Compute for checking the two training buttons. Coffee sipping occurs around 28–33 seconds into the visible idle cycle. Captures under ignored `data/refinements-media/` use actual game models; close-up interior renders use a review camera. Physical iPhone Safari/PWA testing remains a device review step. No push or deployment is authorized for this refinement until the owner approves.


### Seated founder refinement (local review)

Both HQ interiors now use an explicit chair, separate lap, bent trouser legs and planted shoes. The torso sits behind the shortened desktop rather than intersecting it. Arms remain connected at the shoulders with elbows above the wood and hands behind the laptop lid; the 36-second idle cycle and coffee/steam behavior are retained. Swept hair has a longer fringe, side pieces and back. These are client-only model/pose changes, with no save fields, prices, timing, progression or exterior-footprint changes.

Full-cycle tests check hand/screen and forearm/desk clearance, coffee return, reduced motion and normal-camera rays to the legs and hair in both HQ levels. `data/seated-founder-media/` contains captures from the actual HeadquartersScene at its normal camera and existing closer gameplay zoom; the interior close-up captures use the review camera. Continue using the isolated `/refinements-preview` on port 3044 for owner review. Nothing is pushed or deployed without approval.


## Operation Infiltration — local vertical slice

Feature branch: `codex/operation-infiltration`. Original raids and the complete pre-overhaul tree are retained at `codex/pre-infiltration-checkpoint` (`dc4974d`). The live Railway release branch is untouched. No production database or volume is opened by this work. Verified SQLite `VACUUM INTO` development backups are under ignored `data/backups/pre-infiltration-*`; integrity checks returned `ok`.

### Architecture and compatibility

- `shared/research.ts` adds Research (capacity 500) and the Lab through optional foundation JSON fields. Legacy data receives 0 Research and capacity 500 on authoritative advancement, preserving all existing balances, buildings, timers, layouts, troops, tutorial records, identities, recovery verifiers and historic Influence. New saves include these defaults. Save format remains backward-compatible version 1; nothing is bulk replaced.
- Research Lab: one at HQ Level 1, 150 Compute, 60 seconds with the existing Builder Bot, 2 Research/minute, 20 internal storage. It shares rotation, movement, obstacle collision, construction routing and placement validation. Collection transfers only available capacity; excess stays in the Lab. Production uses server timestamps and caps while offline. Research has no spending tree yet.
- `shared/infiltration.ts` contains a deterministic 100 ms simulation, versioned target snapshots, defensive patrol configurations, loadouts, grid navigation, hacking and extraction. `operationFromSnapshot` accepts a supplied snapshot independently of the handcrafted target catalog. `shared/security.ts` defines the starter company-defense configuration boundary. HQ drones now require completed player-owned Security Drone Stations; incoming human attacks and defense rewards are future work.
- Lumen Labs is the starter campus (one drone). Vector Works has HQ Level 2, a different GPU/Lab/core arrangement and two drones. Buildings never take damage. The agent reuses the existing Scrap Bot mesh with violet infiltration equipment; it requires a real available Scrap Bot. Starting reserves one bot and its Hangar space; successful extraction returns it, while interception, timeout and abandonment after deployment lose it. Cancelling before deployment returns it. There is no additional Compute entry fee.
- Each operation stores its snapshot, server clock, agent path, hacking progress, carried loot, patrol/detection states, chosen tool and accepted orders. Commands express intent only. The server rejects client reward/success/time fields and derives all outcomes. A 3-minute active-operation limit prevents abandoned agents running indefinitely. Refresh resumes the same operation; going offline does not pause security or safely bank loot. Preparation is untimed.
- Drones show their scan radius, warn for 2–2.2 seconds before pursuit, and intercept at close range. One selected tool per operation: Probe reveals routes for 12 seconds; Jammer disrupts one drone within 7 world units for 6 seconds. The agent can change targets, move to open ground, or extract at any time. Capture, timeout and abandonment forfeit all unbanked loot.
- `server/infiltration.ts` adds `infiltration_results` (unique operation ID, company ID, target ID, outcome, rewards, versioned snapshot/order/event log) and `infiltration_cooldowns` (company/target primary key). Tables are created idempotently; existing raid/Influence tables remain unchanged. Settlement, cooldown, Influence, resource balances and the existing request receipt are committed under the same `BEGIN IMMEDIATE` transaction. Repeat results, concurrent tabs, retries and stale operation IDs cannot produce duplicate rewards. Saved command logs replay deterministically; the bounded order count still permits extraction/abandonment.
- Successful nonempty extraction earns 25/50 Influence with a persistent two-hour cooldown per fictional target/company. Victories during cooldown still bank loot and earn zero Influence. Existing standings are retained; no historic scores are invented. The core terminal offers additional resource loot. Base pools: Lumen GPU 20 Compute, Lab 12 Research, core 10 Compute + 8 Research; Vector doubles these pools. Pools and all timing/security values are configurable. Full storage puts validated loot into a persistent reserve, released when space is available. These are initial review values, not a claim of final balance.
- Original destruction raids remain in their original code paths, save JSON and historical tables. An already active old raid can still be resumed from PLAY/Settings. New destruction-raid starts are rejected by default, including stale clients; archived regression fixtures explicitly opt into the internal `legacyRaids` test/rollback option. The default button and target-selection flow now use INFILTRATE. Do not switch back using an old binary that writes saves without understanding new fields; use the checkpoint for source restoration and review migrations first.

### Controls and presentation

Choose a rival and one tool. Deploy, tap a building or a bottom target button to hack, tap open ground to direct movement, use the tool once, then choose Extract now. Loot is carried until the agent reaches the marked exit. Drag to pan; pinch or use the mouse wheel to zoom. Ava’s final overview/low-resource guidance uses infiltration terminology; tutorial steps and saved progress are unchanged. Failed network orders expose Retry order using the same transactional request ID. Menus/buttons remain accessible touch targets. Cyan scan circles, violet hacking effects, status/progress and explicit carried/banked totals show the operation state. The world view loads lazily so it does not make the title screen load the rival renderer.

The original sample-free 32-second suspenseful electronic loop is `public/audio/infiltration-heist-v1.wav`, reproducible with `python scripts/render-infiltration-score.py`. HQ and approved raid recordings remain unchanged. A third music bus crossfades and stops when leaving; original short hacking, warning and extraction cues share existing mute, autoplay, background suspend, pagehide cleanup and `testAudio=off` behavior. No paid API, copyrighted recording, external service or recurring cost is used.

### Local testing and review

Run `npm run build`, then `npm run preview:infiltration`. On the same Wi-Fi: `http://192.168.1.40:3045/infiltration-preview`. It uses only `data/infiltration-preview.sqlite` and the `airace_infiltration_preview` cookie. The review company has the existing buildings, a ready Research Lab, 650 Compute and 36 Research. This deliberate test seed does not alter normal starting resources. Fresh companies can be tested in another browser without the preview shortcut. Every agent screenshot uses `?testAudio=off`; test browsers close in `finally`.

Automated tests cover production/collection/caps, old saves, normal HQ construction/rotation, legitimate timed hacking, navigation, no destruction, warning/jamming/capture, extraction and loss, duplicate requests, cooldowns, separate companies, recovery, process restart mid-hack, full-storage reserves, transactional failure and deterministic replay. Actual browser-control runs complete Research heists against both rivals using touch controls and timed jammers. Desktop, iPhone-sized portrait and landscape captures are in ignored `data/infiltration-media/`; a screen recording is under its `video/` folder. Physical iPhone Safari/PWA performance and whether the prototype feels fun/balanced still need owner review. No real-player matchmaking, PvP theft, live replay service, Research tree or defense upgrades are implemented.

Final local verification: 316/316 tests passed, TypeScript/Vite production build passed, and the disposable-database production smoke passed (health/assets/API, secure cookie, persisted rig purchase across process restart and duplicate protection). Final browser runs completed Research extraction on both rivals and passed portrait 390×844, landscape 844×390, desktop 1280×900 and narrow 900×720 layouts. Both HUD containers remain separate. Offline order retry was exercised in the touch UI. The rival scene reported 249 draw calls and roughly 62k triangles in desktop Chromium, with a single existing shadow map and no physics/volumetric effects; this is not a physical iPhone benchmark. Automated contexts/browsers were closed. All screenshots and video are silent. No GitHub push, Railway deployment or production data access was performed.


## Infiltration compound polish — local review

Branch: `codex/infiltration-compound-polish`. The pre-polish implementation is preserved at `codex/pre-compound-polish` (`fd8400f`). Verified development backup: `data/backups/pre-compound-infiltration-preview.sqlite` (`PRAGMA integrity_check` returned `ok`). No production database or deployment is touched.

- **Mission browser:** Infiltrate shows one illustrated utility and one company at a time, with previous/next controls. Lumen Labs is the default. Campus thumbnails are cached renders of the actual target models, walls and layout. Compact Influence/difficulty information and one orange launch action replace the stacked text cards. Portrait and short landscape use different responsive arrangements.
- **Security walls:** Cream/navy modular panels with cyan strips enclose both rival campuses; Vector adds an internal research-zone partition. HQ panels sit outside its existing buildable boundary and along the already unbuildable service-road band. Front sections adapt around owned buildings' rotated approaches. No existing building is moved, removed or charged. Walls are fixed security infrastructure, not a new purchasable wall/health/upgrade economy. Render geometry is batched by material, with no per-panel animation.
- **Movement:** `shared/navigation.ts` supplies deterministic eight-direction A*, full-segment clearance checks, a direct open-ground shortcut and line-of-sight waypoint reduction. Agents and presentation-only Fabricator deliveries use it; the Builder Bot shares the same clearance-safe routes. Drone patrol and pursuit paths reserve the complete rotor envelope around buildings and walls. Probe route lines follow these actual navigable paths. New operation snapshots set `navigationVersion:2` and store their walls; already saved snapshots keep their original navigation and defense replay rules.
- **Buildings:** Research Lab window/door frames are separated, and the roof deck clears both cyan accents. Fabricator arms articulate around a staged assembly with the same `.7` campus scale used by walking and stored bots. Training cost/time/count ownership are unchanged. Delivery remains presentation only.
- **Hangar safety:** New Hangars use a 5.6 × 4.2 footprint (previously 4 × 3), 40% wider/deeper with normal-sized bots. Older Hangars expand in place only if validation confirms room. Crowded legacy Hangars retain their compact shell and coordinates; moving them to a valid spacious location persists `size:'expanded'` (or legacy paired `hangarSize`). Rotation, placement, obstacles and navigation share the effective footprint. These are optional JSON additions; no destructive SQL migration or saved-record replacement is needed.

Run `npm run build`, then `npm run preview:compound`. Review on the same Wi-Fi at `http://192.168.1.40:3046/compound-preview?testAudio=off`. This uses only `data/compound-preview.sqlite` and `airace_compound_preview`, seeds a disposable review company, and leaves normal/live identities untouched. The LAN health endpoint was checked successfully. Screenshots and silent browser recordings are in ignored `data/compound-media/`.

Final checks: **328/328 automated tests passed**, TypeScript/Vite production build passed, production smoke passed. Added coverage includes direct diagonal motion, blocked corners, every hack terminal and patrol segment, full-rotor clearance, deterministic replay and old snapshots, safe legacy Hangar expansion, rotated footprints, adaptive HQ entrances, Lab geometry separation and assembly scale/animation. Browser checks passed at 320×568, 390×844, 844×390, 1280×900 and 900×720. Both companies were completed through touch UI with Research hacking, timed Jammer use and extraction. Five bots trained sequentially, visibly walked to the Hangar, and survived refresh without duplicate deliveries. All automated browsers were closed and audio was suppressed through the test flag.

Performance: panels share merged geometry/materials, assembly uses pooled vectors, patrol routes are cached, and no physics or volumetric effects were introduced. The rival scene reported 273 draw calls and ~89k triangles in desktop Chromium. The existing Three.js world chunk still triggers Vite's >500 kB warning. Physical iPhone Safari/PWA rendering and performance remain owner-review items; desktop touch emulation is not proof of those behaviors. Nothing was pushed or deployed.


### Approved production release preparation

The approved Infiltration and compound-polish changes are applied to `codex/railway-deploy`, retaining that branch's existing Fabricator quantity controls and legacy deployment audio behavior. Release-specific verification passed 315 tests, the production build and disposable-database production smoke. The local review branch's 328-test result above remains its own baseline. At the first production boot without `infiltration_results`, `backupBeforeInfiltrationMigration` creates a consistent, permission-restricted SQLite snapshot in the existing database volume's `backups/` folder and verifies its integrity before registering the additive Infiltration tables. Existing companies, credentials, saves and volume configuration are retained. Subsequent boots skip this one-time backup. Snapshot tests cover committed WAL state, untouched source records, additive migration and repeated startup.


## Player-owned cybersecurity, resource introduction and clearing times

`codex/player-cybersecurity` starts from deployed integrated release `ec72f6d`. A SQLite development snapshot under ignored `data/backups/pre-owned-cybersecurity-*` passed integrity verification. No live save or volume is reset.

- New companies have **zero owned walls and zero HQ drones**. The automatic HQ wall generator is removed. Roads, sidewalks, decorative boundaries and neighboring scenery remain. Old free-drone flags no longer grant ownership. Fictional rival defenses remain unchanged.
- **Cybersecurity** joins Resources, Robotics and Decorations; no All tab. **Security Wall: 10 Compute**, instant, no builder. Two-unit panels snap to the existing grid and support endpoint/right-angle joints. Arrange moves/rotates purchased segments free. A configurable 512-segment technical ceiling bounds mobile work rather than housing/progression. Geometry is batched by material.
- Optional `walls:[{id,position,orientation}]` records use existing atomic request receipts. Server checks cover terrain, roads, buildings, entrances, obstacles, decorations, active clearing routes and connectivity. Required building approaches and full-rotor station patrol routes cannot be sealed. Building/decorative placement, obstacle spawning, builders, bot delivery and drones share the same owned-wall geometry. A company's wall ID cannot move another company's structures.
- **Security Drone Station: 200 Compute, 60 seconds, one available Builder Bot, one per company**. Optional `droneStation` records save placement, rotation and authoritative timestamps. Its compact 3 × 3 open pad uses navy/cream materials and cyan landing lights. Existing builder animation and an in-world construction timer are reused. Exactly one drone launches after completion; moving updates its origin, refresh/recovery retains ownership. The HQ drone uses the existing local patrol; incoming human/PvP attacks are not part of the existing game. Rival detection/pursuit remains unchanged.
- Ava's existing resource pages say: “Compute powers our company — we'll use it to build and grow.” Then: “Research is the valuable technology we develop — and what rival companies want to steal. Let's build our first GPU Rig!” No extra page or mandatory Lab step; builder/GPU lessons, skip/replay and saved completion remain intact.
- New jobs clear **trees/boulders in 15 seconds, scrap in 30**, plus existing travel. Rewards, regeneration, decorative plants and builder capacity are unchanged. Panels read configuration and saved timestamps. Already active jobs keep their original `workAt`, `clearedAt` and `completesAt`; deployment cannot extend/restart them.

No destructive migration/new SQL table is needed: additive optional records live in existing company JSON and use the current identity, generation, transaction and receipt checks. Security purchases/completion do not change Company XP policy.

Verification: **331 tests passed**, production build and production smoke passed. Coverage includes cost/rotation/connections, zero-free-defense compatibility, entrances/rotor clearance, station funding/builder/time/limit, launch/movement, forged deadlines, cross-company IDs, rollback, concurrent retries, offline completion, recovery/restart, Ava and old/new clearing deadlines. Browser tests purchased five connected walls, moved/rotated without charging, built a station on the real 60-second timer, captured one launch and checked refresh. Fresh companies at 390×844, 320×568, 844×390 and 1280×900 had no defenses after refresh and bought walls without builders. Actual tree/scrap/boulder panels showed 15/30/15s, and Ava's two updated pages were captured. All test browsers were silent and closed. Physical Safari/PWA rendering remains owner review; Vite retains its existing >500 kB world-chunk warning.

Run `npm run preview:cybersecurity`; on the same Wi-Fi open `http://192.168.1.40:3052/security-preview?testAudio=off`. Only `data/security-preview.sqlite` and `airace_security_preview` are used. The shortcut opens a prepared test company; for a fresh company use a private window at the root URL without that shortcut. Screenshots/silent launch video are under ignored `data/security-media/`.


### Ava targeting and waiting polish

The HQ rankings button uses an original navy/gold Influence Trophy with a cyan network core. Its existing layout and leaderboard behavior are unchanged.

Ava maps Compute and Research explanations explicitly to their respective HUD icons. Building arrows use the current camera projection on every rendered frame, include the canvas viewport offset, and hide outside the visible view or behind the top HUD. They never clamp to unrelated terrain. A single world arrow serves the GPU Rig and its collection objective.

Construction and first-collection messages offer **Explore** and automatically collapse after a text-length-based reading interval (4–12 seconds). A compact objective retains **Ask Ava** and **Skip Tutorial**. This is presentation only: no local display timer sends progression commands, changes production, or collects resources. The per-company/step/revision reminder preference survives tab refresh in session storage when available. Server construction completion brings Ava back, and only actual collection completes the collection objective. No save schema or tutorial step migration is needed.

Isolated review: `node --import tsx scripts/preview-ava-polish.ts` serves port **3053** using `data/ava-polish-preview.sqlite`. Open `/?testAudio=off` in a private window for a genuinely fresh company, or `/ava-preview/research?testAudio=off`, `/ava-preview/construction?testAudio=off`, or `/ava-preview/ready?testAudio=off` for specific local-only fixtures. These routes create isolated preview companies and are not registered by the production server.

Validation: 334 automated tests, production build and production smoke test passed. A fresh local company completed naming, Builder Station, GPU construction, waiting, collection, and tutorial completion through the actual UI. Browser checks covered projected arrow alignment during panning/zoom, offscreen hiding, Research HUD alignment across live resizing, refresh during both waiting states, Ask Ava, skip, completed-state persistence, and leaderboard opening. Physical iPhone Safari/installed PWA rendering still requires device review.


### Local home-screen campus refresh

The menu uses an original angular SVG wordmark and a decorative, independent Level 2 campus showcase. The vignette reuses the actual Founder HQ Level 2, GPU Rig, Builder Station, Research Lab, Security Drone Station, drone, modular wall, and decoration models. Paths, landscaping and a front access opening organize the miniature campus; no saved player layout or ownership is read or changed.

Ambient animation includes GPU fans, the research core, a gently hovering drone, founder idle motion and the menu helper. Rendering is capped at 30 fps; the Retina-quality update uses a 2.5 pixel-ratio ceiling and a 2.4-million-pixel budget for the high-density boost (never below native CSS resolution). Static shadows are cached. Animation stops when the menu is inactive or the page is hidden, and reduced-motion preferences produce a static view. The no-WebGL fallback also depicts the developed campus. Play, recovery, sound controls, studio splash and PWA status-bar backgrounds retain their existing behavior.

Review with the isolated port-3053 preview documented above. Checked 390×844, 320×568, 844×390 and 1440×900 layouts, recovery entry, Play-to-HQ/Ava, context-loss fallback and reduced motion. Browser rendering reported 167 draw calls / 44,812 triangles per normal frame after shadow caching; this is a rendering-work measurement, not a physical-iPhone frame-rate claim. All 334 tests, the production build and isolated production smoke test passed. This visual refresh is local pending review.


## Economy, construction and owned infiltration agents

GPU Rig production is centrally configured at **10 Compute per minute per rig**. Player Compute capacity remains 1,000 and each rig holds 25; collection and existing balances are unchanged. Ava and building information use the shared rate.

Timed construction now uses foundation (0–25%), structure-specific framework (25–60%), incomplete assembly (60–100%) and the finished model at the authoritative deadline. GPU hardware racks, Hangar bays, Lab framing, drone landing structures and HQ roof supports share a reusable presentation system. Foundation HQ upgrades preview the Level 2 architecture within the existing footprint. Completion effects and existing Builder Bot work remain visual; server capabilities, costs, footprints and deadlines are unchanged. Reload restores the stage from saved timestamps. Client presentation advances from server time using a monotonic clock.

Infiltration renders across the entire viewport and frames the campus around measured HUD safe areas. A quiet mission-only district replaces distracting intersections without changing the HQ neighborhood. A cyan selectable staging zone and separate gold extraction marker use the same navigation validation as the server. New target snapshots use a distinct extraction point in the existing clear front-left strip; saved operation snapshots keep their own exit. The larger turquoise HQ button and **INFILTRATE** selector preserve company/utility navigation.

A three-message, skippable Ava introduction highlights deployment, technology assets and extraction using camera-projected world targets. An optional per-company `infiltrationTutorial` completion flag prevents repetition. The active mission clock begins only on deployment.

**Ownership and compatibility:** `shared/infiltration-army.ts` reserves one legitimately trained Scrap Bot under the existing immediate SQLite transaction. The saved operation contains an optional unit record with its operation ID and reserved/returned/lost status. Reserved agents occupy Hangar capacity and cannot be reused. Every command checks the reservation. Extraction returns the bot once; interception, timeout or deployed abandonment consumes it; pre-deployment cancellation returns it. Settlement, loot, Influence and receipts remain atomic. Older live prototype operations without a legitimate reservation are safely closed without retroactively charging any bots or banking unsupported loot. Historical completed results, balances, buildings, training and identities remain intact. These are additive optional fields in the existing versioned save JSON; no table replacement or bulk save rewrite is required.

A verified local SQLite backup was taken before implementation (`data/backups/pre-infiltration-overhaul-1792437503848.sqlite`, integrity check `ok`). Development and browser tests use isolated companies/databases. No production database is opened or edited manually.

Validation: **343 automated tests passed**, production build and disposable-database production smoke passed. Tests cover the shared economy, construction thresholds/deadlines, camera framing, valid routes, zero-agent rejection, concurrent reservations, reserved housing, wrong/stale commands, return/loss, restart/recovery, one-time tutorial and old unbacked operations. Browser validation covers a fresh company building GPU/Fabricator/Hangar on real timers, collecting Compute, training a bot, Ava, deployment, hacking, refresh, extraction and cancellation. A second touchscreen run hacked Research using Jammer and a natural drone interception verified loss without rewards. Desktop, portrait, landscape and small-phone layouts were checked; physical iPhone Safari/PWA behavior and sustained device performance still require owner review. The existing Vite world-chunk size warning remains.

Local review: after `npm run build`, run `node --import tsx scripts/preview-overhaul.ts`. Same Wi-Fi: `http://192.168.1.40:3054/?testAudio=off`. `/overhaul-preview/fresh` creates a fresh isolated company; `/overhaul-preview/company`, `/overhaul-preview/lumen` and `/overhaul-preview/vector` create deliberate local review fixtures. `/overhaul-preview/stages?building=hangar&progress=.4` uses a 120-second visual fixture to inspect stages (normal gameplay construction times are unchanged). This script refuses production mode and uses only `data/overhaul-preview.sqlite` and its separate cookie.


## Retina title scene and first-company discovery

The title canvas previously capped device pixel ratio at 1.5, including on 3x Retina displays. The updated renderer uses `titlePixelRatio` on every resize: up to 2.5x, bounded by a 2.4M-pixel high-density budget and a 1x native-resolution floor. At 390x844 the decorative canvas now measures **975x1207** instead of **585x724**, with the same CSS scene size and camera composition. Antialiasing remains enabled, Retina static shadows use 1024 rather than 512, and no upscaled bitmap or render target is involved. The wordmark, assets, controls and layout are unchanged. Existing 30fps animation, hidden-page pause, cached shadows, reduced motion and disposal remain in place.

New companies and deliberate Reset Progress get optional `opening: pending` metadata in their existing `foundation_ava` JSON. After the actual HQ renderer is ready, a revision/generation-checked `begin-opening` request records `shown` before a 5.6-second layered cloud-parting reveal. It does not advance dialogue, alter game state or touch building coordinates. The camera initially frames the actual saved HQ; on short landscape screens it leaves the house beside Ava instead of behind her dialogue, and introductory orientation changes reframe without moving buildings. Reload during the reveal resumes Ava without replaying the cinematic. Recovery consumes any still-pending reveal without animation; old rows without this metadata, established companies, infiltration returns and Replay Ava Tutorial bypass it. Reset starts a fresh generation. No SQL table replacement or bulk migration is required.

`onboardingHud` is the single visibility policy. The reveal and greeting hide all ordinary HUD. The company card appears at the HQ introduction; Builder/Build appear during the existing free Builder Station lesson; Compute appears at its explanation after that lesson; Research follows at its existing explanation. Build and builders remain available during GPU construction/collection. Tutorial completion or skip opens the full HUD. Hidden controls retain layout geometry but use `visibility:hidden` and no pointer events, removing them from normal focus/accessibility. Arrows ignore hidden HUD elements; the Research pointer sits beneath the purple icon, pointing up, to avoid covering Compute. No new mandatory dialogue pages or Research Lab step were added.

The brief cloud cinematic has no controls. Skip appears with Ava afterward and clears pending tutorial menu/placement UI after the server confirms it. Reduced motion bypasses the cinematic. Page suspension and changed motion preference end the cosmetic effect; a failed/timed-out claim releases the fog and leaves Ava's retry/skip guidance available. Existing resource calculations, authoritative construction stages/timers, collection, infiltration ownership and company recovery are unchanged.

Development backup: `data/backups/pre-company-opening-1792441938237.sqlite` was created with SQLite VACUUM INTO and passed integrity check. Tests use isolated data. **347 automated tests passed**, production build and disposable-database production smoke passed. An older wall concurrency test was corrected to allow either independent request to win while still requiring identical retries to share an outcome and exactly one charge/structure.

Actual browser walkthrough: new company -> fog -> naming -> Company -> Builder Station -> Compute -> Research -> GPU construction with Ava dismissed -> refresh -> collection -> full HUD. Reset/skip, reveal interruption, offline claim failure, legacy partial onboarding, recovery UI and orientation/viewport changes were checked. Chrome and installed WebKit passed at iPhone dimensions; WebKit also passed with a standalone navigator simulation. This is **not physical iPhone or installed iOS PWA verification**; hardware FPS, thermal/battery behavior and actual system safe-area rendering remain device review. Vite retains its existing >500 kB world-chunk warning.

Local review: after building, `node --import tsx scripts/preview-opening.ts` serves `http://192.168.1.40:3055/?testAudio=off`. `/opening-preview/fresh` creates a genuinely new local company for the reveal; `/opening-preview/company` shows an established review base; `/opening-preview/legacy` demonstrates compatible pre-update partial onboarding. Only `data/opening-preview.sqlite` and its separate cookie are used; the script refuses production mode. All agent-driven browsers are muted and closed in finally blocks.


## Textured cloud reveal and compact reset confirmation

The opening now uses a transparent, shaded cloud-bank sprite and a softer original procedural mist texture. Three paired layers physically translate in opposite directions at different speeds over **5.6 seconds**; the main banks remain opaque as they move, and only the final wisps fade. Billowy contours, warm highlights and blue-gray undersides replace the pale fullscreen fade. Two 1024x1536 WebP downloads total **289,054 bytes**, reused by all six layers. The art preloads during the menu; there is no runtime noise calculation, particle system or volumetric pass. If art cannot load promptly, the nonessential cinematic is bypassed. Art provenance and the final built-in imagegen prompt are in `docs/cloud-reveal-art.md`; the procedural mist can be rebuilt with `scripts/render-intro-clouds.py`.

No Skip Tutorial, gameplay buttons or HUD appear during the cinematic. Ava and her ordinary Skip control appear after it completes. Existing once-per-new-company/reset metadata and revision/generation checks are unchanged. Returning companies, recovery, interrupted reveals, reduced motion and suspension remain safe; none of these replays a full introduction or leaves the interface hidden.

Reset Progress still requires opening Settings and a separate confirmation. The cream **Are you sure?** dialog contains only a muted X and red checkmark, implemented with SVG and accessible Cancel / Reset progress labels. Both targets are at least 64px high; keyboard focus begins on Cancel. During processing both controls and Escape are disabled and the dialog remains visible. Errors use a concise message and permit retry. A client gate prevents double submission. If a response is lost after the server commits, an authoritative GET confirming the incremented generation completes the UI transition without posting another reset.

The server reset handler and all persistence rules are **unchanged**: only the current company's foundation is reset; Company XP, Influence, identity, recovery credentials and other companies remain preserved under the existing rules. No database migration or production-data development operation was required.

Validation: **349 automated tests passed**, production build and disposable-database production smoke passed. Isolated browser checks covered cancellation, delayed double click, backend failure/retry and a committed reset with a lost response. Seeded XP/Influence/recovery and a second company's buildings/bots/balances survived. Chrome and WebKit checks covered mobile portrait, landscape, desktop, 320px screens, actual opposing sprite transforms at full opacity, approximately 5.6 seconds before Ava, no cinematic buttons, correct Skip timing, reset tap targets and fit, refresh, returning companies, reduced motion, suspension and missing textures. WebKit standalone navigator simulation was used; physical iPhone Safari/PWA and native desktop-app testing were not performed. The existing Vite world-chunk warning remains.

Review with the existing isolated `scripts/preview-opening.ts` server: `http://192.168.1.40:3055/opening-preview/fresh?testAudio=off` creates a fresh local cinematic company without resetting a live save. `/opening-preview/company?testAudio=off` creates a local established fixture for Settings/Reset review. Every automated game context is muted and closes in a finally block.
