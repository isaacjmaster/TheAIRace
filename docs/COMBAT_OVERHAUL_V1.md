# Combat & Raid Overhaul V1

Local-only update on the integrated branch, based on deployed identity/recovery changes. Checkpoint: `checkpoint/pre-combat-overhaul-v1`. No GitHub push, Railway deployment, production database access, or unrelated project changes.

## Audit

The live starter rules gave Scrap Bot 110 HP and 18 damage every 0.8s (22.5 DPS). Each map had one turret: 8 damage every 1.2s, range 5, 160 HP. A full-health bot needed 14 turret shots to die. Core/vault/walls had 300/120/40 HP. Both maps were essentially mirrored layouts with a large blind side. A single bot won from the east and south on Raid 1; groups of three cleared all four approaches without casualties. Defenses did target, deal real damage, and stop firing when destroyed; their deliberately weakened starter override and limited coverage caused the imbalance, rather than a missing damage/death implementation.

Pathfinding selects the cheapest reachable objective using movement plus wall-breach time, replans on cell edges, and avoids occupied structures. Scrap Bot has no target preference, ranged weapon, armor, or ability. Range is 0.85; attacks must reach melee distance. Combat runs fixed 50ms server steps with a 90s limit. Full destruction wins; all units dead with empty reserves loses; undeployed reserves prevent early elimination and return at settlement. Deployed survivors and casualties are both consumed. Before deployment the timer is idle. Once started, offline time advances the same simulation.

## Tuning

| Property | Before | New raids |
|---|---:|---:|
| Scrap Bot HP |110|62|
| Damage / strike |18|9|
| Interval |0.8s|1s|
| DPS |22.5|9|
| Movement |1.25 cells/s|1.15 cells/s|
| Melee range |0.85|0.85|
| Turret HP |160|180|
| First Contact turret |8 / 1.2s / range 5|16 / 0.85s / range 6|
| Stronger Network turret |8 / 1.2s / range 5|20 / 0.85s / range 6.5|

First Contact keeps the open north gate at (9,5), places the tower at (9,7), and moves the vault to (15,11). A compact north approach lets a group remove the tower early. Stronger Network uses existing laser towers at (10,8) and (16,10), with overlapping coverage. Core/vault/wall health stays 300/120/40 on both maps. The second raid adds coverage and target-order risk, not universal health inflation.

## Repeatable simulations

Run `node --import tsx scripts/simulate-scrap.ts`. Each row uses the real deterministic engine, no database or outcome scripting. North=(9,2), east=(23,9), south=(17,16), west=(3,9). Spacing 0 deploys the group together; spacing 2 staggers each bot by two seconds. Surviving deployed bots are still consumed by the existing army rule. Defense numbers are building IDs; values are effective HP removed, not nominal overkill. Loss destruction measures whole destroyed objectives, so 0% can still include damage to buildings/walls.

| Map / bots / approach / spacing | Before win / alive / destroyed / seconds | After win / alive / destroyed / seconds | Defense damage after |
|---|---|---|---|
| First Contact / 1 / north / 0s | loss / 0 / 67% / 29.15 | loss / 0 / 0% / 2.6 | 2: 62 |
| First Contact / 1 / east / 0s | win / 1 / 100% / 40.95 | loss / 0 / 0% / 14.55 | 2: 62 |
| First Contact / 1 / south / 0s | win / 1 / 100% / 39.85 | loss / 0 / 33% / 28.7 | 2: 62 |
| First Contact / 1 / west / 0s | loss / 0 / 67% / 33.25 | loss / 0 / 0% / 4.45 | 2: 62 |
| First Contact / 3 / north / 0s | win / 3 / 100% / 21.45 | loss / 0 / 0% / 9.4 | 2: 186 |
| First Contact / 3 / east / 0s | win / 3 / 100% / 22.5 | loss / 0 / 0% / 18.3 | 2: 186 |
| First Contact / 3 / south / 0s | win / 3 / 100% / 21.4 | loss / 0 / 33% / 23.45 | 2: 186 |
| First Contact / 3 / west / 0s | win / 3 / 100% / 23.95 | loss / 0 / 0% / 11.25 | 2: 186 |
| First Contact / 5 / north / 0s | win / 5 / 100% / 18.25 | win / 3 / 100% / 33.85 | 2: 172 |
| First Contact / 5 / east / 0s | win / 5 / 100% / 19.3 | loss / 0 / 67% / 33.95 | 2: 310 |
| First Contact / 5 / south / 0s | win / 5 / 100% / 18.2 | loss / 0 / 67% / 27.25 | 2: 310 |
| First Contact / 5 / west / 0s | win / 5 / 100% / 20.75 | win / 2 / 100% / 45.6 | 2: 234 |
| First Contact / 10 / north / 0s | win / 10 / 100% / 15.1 | win / 9 / 100% / 19.85 | 2: 110 |
| First Contact / 10 / east / 0s | win / 10 / 100% / 16.1 | win / 7 / 100% / 24.9 | 2: 234 |
| First Contact / 10 / south / 0s | win / 10 / 100% / 15 | win / 8 / 100% / 21.75 | 2: 220 |
| First Contact / 10 / west / 0s | win / 10 / 100% / 17.55 | win / 9 / 100% / 22.6 | 2: 142 |
| Stronger Network / 5 / north / 0s | win / 5 / 100% / 20.15 | loss / 0 / 0% / 16.2 | 2: 310 |
| Stronger Network / 5 / east / 0s | win / 5 / 100% / 20.75 | loss / 0 / 25% / 15.05 | 2: 82, 42: 228 |
| Stronger Network / 5 / south / 0s | win / 5 / 100% / 20.05 | loss / 0 / 50% / 31.1 | 2: 62, 42: 248 |
| Stronger Network / 5 / west / 0s | win / 5 / 100% / 19.3 | loss / 0 / 25% / 17.9 | 2: 246, 42: 64 |
| Stronger Network / 10 / north / 0s | win / 10 / 100% / 16.95 | win / 4 / 100% / 28.1 | 2: 182, 42: 390 |
| Stronger Network / 10 / east / 0s | win / 10 / 100% / 17.55 | loss / 0 / 75% / 31.3 | 2: 432, 42: 188 |
| Stronger Network / 10 / south / 0s | win / 10 / 100% / 16.85 | win / 3 / 100% / 26.05 | 2: 270, 42: 164 |
| Stronger Network / 10 / west / 0s | win / 10 / 100% / 16.1 | win / 1 / 100% / 32.9 | 2: 162, 42: 416 |
| First Contact / 10 / north / 2s | win / 10 / 100% / 22.05 | win / 5 / 100% / 36.9 | 2: 342 |
| Stronger Network / 10 / east / 2s | win / 10 / 100% / 24.7 | loss / 0 / 25% / 27.85 | 2: 128, 42: 492 |

## Presentation and save integrity

Raid selection shows difficulty and one short tactical hint. The battle HUD updates time, destruction and active bots between authoritative server polls. Reserve count remains server-confirmed. Touch taps deploy; drags/pinches cancel deployment. Pointer hover shows the existing placement marker. A snapped position cannot cross into enemy territory. Request IDs, transaction receipts, reset generations and a client in-flight guard prevent retry duplication. Network errors are visible in the raid footer. Melee swings now respond to actual attack events; damage recoil responds to received hits. Existing beams, health bars, sparks, collapse and robot models remain. Results explicitly show victory/defeat, destruction, survivors, actual paid Compute and consumption rules.

Only newly created starter raids get combatVersion=2. Unversioned saved raids keep their old unit stats, defense override, stored buildings and replay behavior. No rewrite of active saves is performed. New settlement keeps the original 15 Compute per destroyed objective, capped at the original 45 maximum and available storage, credited once. No training prices, queue timing, capacity, GPU production, identity or recovery behavior changes.

New raid JSON includes server-bound permanent companyId and a verified result with map ID, combat version, victory/reason, destruction, survivors, paid reward and prior-completion status. A tiny additive raidRecord holds known won maps and whether history is complete; it survives Reset Progress. Historical saves without full records report unknown (null), never falsely claim an unseen historical map was never completed. No Influence awards, leaderboard, extra database tables, or ranking-farm logic is implemented. Stage 3 must treat unknown history conservatively and define permanent per-achievement awards rather than awarding points for every settlement. Existing repeat raid Compute rewards remain unchanged.

## Verification and local test

181 automated tests pass; TypeScript/Vite production build and isolated production startup/persistence smoke pass. Regressions cover six requested troop-count cases across four deployment edges, staggered deployment, actual turret damage/death, dead defenses, melee range, deterministic replay, legacy raid golden outcomes, snapped territory restrictions, offline settlement, repeated victories and reward ceilings. Existing tests cover SQLite restarts, concurrent/retried commands, troop inventory, reset generations, identity migration, recovery and stale-tab protection. Silent Chrome touch-emulation passed the real Fabricator construction and 50-second ten-bot training queue, both raid selections, touch deployment, drag without deployment, refresh during combat, recovery into the same active raid, victory, exactly one 45-Compute payout, no consumed-bot refund, return to HQ, retraining and real defeat on Stronger Network. Automated browsers were closed in finally blocks, including failed checks. Desktop mouse deployment and an actual five-bot victory also passed. Both map-choice buttons stay entirely inside 320x568, 390x844 and 1280x800 viewports. The desktop test waits for each deployment acknowledgement; intentionally in-flight clicks are ignored by the existing input guard. Screenshots show attack selection, both maps, victory, desktop battle and desktop defeat.

Local preview: `npm run preview:combat`, http://192.168.1.40:3016/. This uses only data/combat-preview.sqlite and a dedicated development cookie. It does not import or reset your regular local or production company. In Private Safari, PLAY > Skip Tutorial > Build Bot Fabricator (50 Compute), confirm placement, wait 15s, train five bots twice (50 Compute total), wait 50s, then ATTACK. Try First Contact with a tight north-gate group. Drag/pinch to inspect; taps alone deploy. On Stronger Network, compare north/west approaches with an eastern rush. Check the results, return to HQ, reload, and ensure no second payout. A new 100-Compute test base without a GPU can use its raid proceeds to train again; skip tutorials only for this combat-focused test.

Physical iPhone Safari/PWA, actual touch latency and sustained device frame rate remain to be confirmed by the user. Browser touch emulation cannot verify those. Manifest, safe-area/fullscreen code, Master Studios splash, Ava, soundtrack and HQ models are unchanged.
