# Verification — 2026-10-15

- `npm.cmd test`: 12 passed, 0 failed. Engine + HTTP integration.
- `npm.cmd run build`: TypeScript and production bundle passed.
- Browser loop at 390px: rename → interpret accuracy/review → execution2/verification1 → 95% quality/11 seconds → collect76 → balance96 → upgrade90 → balance6/compute5/visible workstation → reload preserved all progress.
- 320px browser layout: no horizontal overflow; rendered buttons at least44px tall.
- Desktop centered portrait layout inspected.
- LAN HTTP `http://<computer-lan-ip>:3001`: served successfully and company rename command succeeded, testing UUID fallback outside secure localhost.
- SQLite test used isolated temporary disk database, closed it, reopened a fresh connection, and verified saved state and dedup records.
- Live AI configuration guards tested without calling provider. Real AI quality/latency and real iPhone Safari audio/touch behavior remain unverified.
- No deployment or paid API calls performed.

Browser playtests created Tiny Orbit on localhost and LAN Test Garage on the local IP. Other browsers/devices begin with a fresh company. The temporary preview server was stopped after verification; launch using README commands.

## V0.2 verification — 2026-10-15

- Existing regression suite: all 12 tests pass; no engine, backend, economy, contract, interpreter, or save schema changes.
- Production TypeScript/Vite build succeeds.
- Existing localhost Tiny Orbit save retained name, balance6, workstation level1, compute5, and completed1 on first V0.2 load.
- Fresh browser-origin company: select inbox → Precision → 95%/11s/+76 preview → deploy → visit HQ during work → return and collect → balance96 → install90 workstation → HQ visible progression → reload preserved balance6 and compute5.
- Advanced instruction “Work quickly, do not review.” uses unchanged demo interpreter and yields valid speed projection.
- 320x568: no document or content horizontal overflow; buttons at least44px tall; bottom navigation remains visible at viewport bottom. 390x844 portrait screens visually inspected.
- Original icon, 180px (including versioned Apple URL), 192px, 512px, and manifest URLs return HTTP200. PNG dimensions verified using Pillow.
- Actual iPhone Home Screen icon caching/standalone and real-device safe-area behavior still require device testing. No deployment or paid AI requests.

## Title/HQ follow-up verification — 2026-10-15

- TypeScript/Vite production build passed; all12 existing engine/backend tests passed.
- Browser390x844: new title rendered; CREDITS displayed exact “Created by Master Studios”; Back returned to title; PLAY opened HQ.
- Existing Tiny Orbit company loaded with balance6, level1 workstation, compute5, and its pending mission. No playtest command was submitted against that company.
- HQ→Missions→Upgrades→HQ never displayed PLAY/title. Reload restored title, then PLAY restored same company.
- Browser320x568: title primary/secondary buttons fit without scrolling; no horizontal overflow; HQ/buttons remained at least44px tall; bottom nav anchored at viewport bottom. HQ content can scroll vertically on short phones.
- Larger HQ garage visually inspected at390px and320px; old in-game title/slogan absent; wallet and sound preserved.
- No browser console errors captured. Standalone manifest/Apple tags and safe-area CSS preserved. Physical iPhone Safari/Home Screen resume and safe-area behavior remain for real-device verification.
- No backend/economy/save/interpreter changes, paid calls, or deployment.

## Story/tutorial verification — 2026-10-15

- Production build passes; all15 automated tests pass (12 existing plus onboarding eligibility, guide state selection, and backend migration/persistence).
- Backend test seeds an untouched revision0 legacy save and verifies it remains returning, with unchanged game state. New session onboarding flags survive closing/reopening SQLite. Invalid completion before hardware upgrade and unsupported flag fields are rejected.
- Isolated browser server uses port3002 and data/story-playtest.sqlite, never the normal game save.
- New PLAY → four story moments → Pixel welcome → highlighted inbox mission → Precision95%/11s/76cr → collect96 total → install90 workstation → balance6/compute5 → complete guide.
- Mid-mission reload + PLAY goes directly to saved HQ and resumes the guide without replaying story.
- Completed player reload + PLAY shows neither story nor guide. Credits → Replay introduction works and Close returns to preserved Credits screen.
- Separate new player: Skip story → Skip guide → reload/PLAY persists both choices and opens ordinary HQ.
- 320x568 story and guided mission layouts: no horizontal overflow, bottom controls/nav visible, buttons at least44px high. 390x844 story/full-loop screens inspected. No browser console errors captured.
- Physical iPhone Safari/Home Screen behavior remains for real-device verification. No paid requests, public deployment, or game economy changes.


## Resource Expeditions verification — 2026-10-15

- Final automated regression suite: **26 passed, 0 failed** (15 preserved tests, 8 expedition engine tests, 2 expedition API tests, 1 full application activity-conflict test).
- TypeScript + Vite production build passes. Bundle around114KB gzipped JS plus9KB CSS; no new external runtime assets. Rollup emits harmless upstream Zod annotation warnings; builds complete successfully.
- Engine/API checks: full starter6scrap+2cells→bank→rig→GPU loop; gates, obstacles, routes, hazards, capacity, battery, cooldowns, finite deposits, charger limits, emergency floor-half recovery, malformed requests, client-forged rewards, immutable state, stale revisions, duplicate banking/upgrade protection, database reopen.
- Integration verifies both activity conflicts: contract start during expedition and departure during active contract are rejected. Company/onboarding fields remain unchanged by expedition commands. Existing test saves gain separate zero-valued expedition metadata.
- Browser full playthrough in isolated `data/expedition-playtest.sqlite`, port3003: skipped already-tested story/guide; deployed; moved to drones, collected6scrap; approached cells, collected2; reloaded with cargo intact; walked Home; banked; installed rig; garage recovery station/caption appeared; bank spent without changing20credits.
- Upgraded outing had40battery/20cargo; crossed east gate; collected2GPU and banked them. Real server stop/restart retained rig and bankedGPU.
- Direct zoomed-map tile movement verified. Expanded tile bounds approximately84×46px; horizontal panning stays inside map, with no document overflow.
- Emergency confirmation cancel preserved run; confirming with3scrap banked1scrap while retaining existing2GPU. No duplicate reward or unexpected credit change.
- Charger browser test: collected1cell; moved to charging pad; spentcell for+8battery; pad became disabled after use. Returned normally afterward.
- Portrait320×568: Collect, Recharge, Home and Evacuate controls fit above persistent navigation, HTML action buttons at least44px tall, no horizontal overflow. 390×844 world/HQ/full-loop screens visually inspected. Small maps have explicit zoom/pan and large deposit selector alternatives.
- No browser console errors captured. Actual iPhone Safari/Home Screen sound, performance, panning and safe-area behavior still require physical-device playtesting; offline play is not implemented.
- Main local company database was not used for browser playtesting. No public deployment, Railway changes, paid API calls, payments, or changes outside this project.

## Garage 2.0 verification — 2026-10-15

- Production build passes; all 26 existing automated tests pass. No backend, economy, expedition engine, or save-schema changes in this iteration.
- Isolated port3004 browser fixtures cover starter, legacy Level 2, Level 3, and independent Recovery Rig saves. The company and expedition JSON remained byte-for-byte unchanged after read-only UI checks; the normal player database was not used.
- Portrait390×844: garage scene occupies approximately79% of HQ content. Portrait320×568: approximately74%, without HQ scrolling or horizontal overflow; HTML action targets are at least44px tall and navigation remains visible.
- A separate disposable fixture bought both credit hardware upgrades and the resource rig through the actual API. Credits500→410→190; bank6scrap/2cells→0; compute3→5→7. Installation feedback appeared on successful purchases and expired; reload retained equipment and balances without replaying installation.
- Bare stage contains only laptop and Pixel; intermediate stage introduces furniture/desktop; final stage adds GPU bench/server rack. Combined final hardware plus recovery rig visually inspected at320×568.
- Compact inventory displays the saved resource totals, assignment, and progression; keyboard focus enters the drawer, Escape dismisses it, and focus returns to the opener. Existing title launch and in-session navigation behavior preserved.
- Physical iPhone Safari/Home Screen safe areas, audio, and performance still require real-device playtesting. No paid calls, deployment, or Expedition 2.0 work.

## Operations 0.2 verification — 2026-10-15

- TypeScript/Vite production build passes. All39 automated tests pass:26 preserved regressions,10 deterministic operation-engine tests,3 operation API tests. Approximately121KB gzipped JavaScript and12KB CSS; no new runtime dependencies.
- Engine audit:50 starter layouts afford the unchanged Recovery Rig within two outings;25 upgraded GPU-focused sorties safely bank GPU. Tests cover deterministic varied/reachable layouts, patrol timing, Safe versus Bold battery loss, scouting discovery, Hold interference, changing orders, pause/resume, bounded catch-up, inactive auto-pause, serialization, and legacy-run compatibility.
- API tests cover server-only elapsed time, forged rewards/seed/time rejection, stale revisions, deduplicated user commands, duplicate safe banking, legacy command bypass rejection, active-contract conflicts, SQLite reopen, and bounded heartbeat history.
- Browser playtest used isolated `data/operations-qa-*.sqlite` on port3005. First Safe/Balanced outing gathered9scrap/3cells, automatically returned to HQ, then installed the6scrap/2cell rig without changing20credits. HQ displayed the earned equipment. Normal player database was never used.
- Portrait390×844 and320×568 inspected. All operation HTML controls at least44px high; no horizontal overflow; navigation and Gather/Scout/Hold/Return/Pause/resource/risk controls fit on the narrow layout.
- Paused snapshot retained battery34/40, cargo1cell, Pixel position, and both patrol positions while orders changed to Scout/GPU/Bold. Resume scanned all5caches. Hold allowed patrol interference; changing to Safe/Gather and later Return respected the battery reserve. Instructions paused the outing. Reload/title/PLAY restored paused Return with12battery/1cell and discovered caches.
- Company JSON and an untouched expedition fixture remained byte-for-byte unchanged during browser playtesting. Previous Git checkpoint `e5764df1e98de2f27a094c3da12b5a09555dfcbd` remains intact.
- Manual Return completed after the reload. A fresh GPU-focused sortie then banked6GPU; reload retained inventory3scrap/6GPU/4cells, rig installed,20credits, and3completed outings. HQ navigation auto-pause verified.
- Legacy saved outing rendered its original controls. Narrow-layout QA found the compatibility notice clipped the Return button; compacted the notice and rechecked Return at y445–489 above navigation y507. Completing that outing opened the autonomous launch screen.
- Physical iPhone Safari/Home Screen performance, audio, and safe areas still need device verification. No paid AI, public deployment, payments, multiple agents, or PvP.

## Simplified Operations verification — 2026-10-15

- Production TypeScript/Vite build passes; all49 automated tests pass (39 preserved regressions,5 destination-engine tests,5 destination-API tests). Bundle approximately115KB gzipped JS/10KB CSS; removing legacy UI imports reduced the client bundle without deleting its source.
- Explicit destination flow runs Safe/Medium/Dangerous through server-validated commands, automatically gathers, then pauses for Continue versus Return after each recovery. Tests cover the full6scrap+2cells→return→rig→GPU loop across25seeds, exact preserved yields/costs, malformed/forged/locked requests, duplicate banking, SQLite reopen, and old manual/autonomous adoption without losing cargo, battery, position, or depleted deposits.
- Additional compatibility check: an empty-battery old save already at the dock banks its full cargo. Outside the dock, existing confirmed half-cargo emergency recovery still applies.
- Browser QA on isolated `data/operations-qa-*.sqlite` at port3005: Safe Start→automatic3scrap→Continue→6scrap→tapMedium→1cell→Continue→2cells→Return→rewards6scrap+2cells→BacktoHQ→installrig. Credit balance remained20; earned rig appeared in garage.
- Portrait320×568 inspected with no horizontal/vertical content overflow, all HTML tap targets at least44px, and Continue/Return fully above navigation. Fixed initial unused map space by making the screen a flex container, enlarged the world, raised card typography, and placed the two decisions side by side. Portrait390×844 inspected with all three unlocked risk/reward choices; choosing Dangerous updated Start before deployment.
- Dangerous automatically gathered2GPU and paused for the next decision. No Gather/Scout/Hold buttons, priority/risk selectors, or instructions panel remain in the primary interface. Moving patrols, pathfinding, old orders, and backend validation remain underneath.
- Returning Dangerous banked2GPU; reload retained the rig,2GPU,20credits, and2completed outings. Old manual fixture loaded3scrap/1cell/19battery, adopted autonomy without immediate balance changes, collected another3scrap, and banked6scrap/1cell. Old paused autonomous fixture returned its full3scrap/1cell in one tap. Old zero-battery fixture at the dock also banked all3scrap/1cell through the visible Return action.
- Company JSON and an untouched save fixture remained unchanged during playtesting. Main player database was not used. Physical iPhone Safari/Home Screen performance/audio/safe areas still require device verification. No paid APIs, payments, deployment, or unrelated-project work.
