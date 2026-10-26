# Building progression: release design and compatibility

## Authoritative costs and durability

| Building | Upgrade to 2: Compute / time | Upgrade to 3: Compute / time | HP levels 1 / 2 / 3 |
|---|---|---|---|
| hq | 500 / 5m | 1500 / 10m | 216 / 280 / 350 |
| rig | 200 / 2m | 650 / 5m | 108 / 140 / 180 |
| lab | 200 / 2m | 600 / 5m | 108 / 140 / 180 |
| fabricator | 250 / 2m | 700 / 5m | 108 / 140 / 180 |
| hangar | 300 / 2m | 800 / 5m | 108 / 140 / 180 |
| sentinel | 400 / 3m | 1000 / 6m | 420 / 600 / 800 |
| droneStation | 300 / 3m | 800 / 6m | 108 / 140 / 180 |
| wall | 20 / 0m | 45 / 0m | 180 / 270 / 390 |
| computeStorage | 400 / 2m | 900 / 5m | 108 / 140 / 180 |
| researchStorage | 300 / 2m | 750 / 5m | 108 / 140 / 180 |

## Functional progression

- GPU production: 10 / 14 / 18 Compute per minute, multiplied by existing GPU Optimization; buffer 100 / 150 / 200.
- Research Lab: 2 / 2.8 / 3.6 Research per minute; buffer 50 / 75 / 100. Technology projects and durations are independent and unchanged.
- Fabricator: newly purchased training takes 100% / 85% / 70% of existing research-adjusted time. Already purchased queue timestamps remain unchanged.
- Hangar: 20 / 25 / 30 housing; Pulsewheel 1, Breacher 5. One account Hangar, including legacy linked Hangars.
- Sentinel damage 18 / 24 / 30, Target Lock cap 30 / 40 / 50; range and cadence unchanged.
- Drone health 240 / 300 / 360; damage 24 / 30 / 36; station does not multiply drone count.
- Compute Storage adds 1000 / 2500 / 5000 capacity to preserved baseline (normally 1000).
- Research Storage adds 500 / 1250 / 2500 to preserved baseline (normally 500).
- One of each storage; available at HQ1, construction 250 / 150 Compute respectively, 60 seconds.
- HQ2 retains 2 rigs, 2 builders, 2 drones and 100 walls; HQ3 retains those limits and unlocks elite building levels. All other level2/3 upgrades require corresponding HQ.
- Builder Stations remain non-upgradeable: builder count is already an HQ entitlement. No filler mechanic.

## Persistence and upgrade rules

Optional buildingLevels map stores individual slots and wall:<id> keys. Missing fields mean level1. HQ keeps its existing independent field; building jobs persist absolute timestamps. Old troops, coordinates, orientations, IDs, resources, research and training queues are preserved. No automatic player-base rebuild or mass SQL migration.

Normal upgrades occupy one builder and keep existing services at the current level until completion. Production accrual is split at upgrade and research deadlines so offline income cannot get retroactive bonuses. Completion deletes the job exactly once; current capabilities update only then. Fabricator queues retain purchased timestamps. Walls use an explicit instant batch workflow without builder occupancy: only unique selected owned segments are charged, all levels and aggregate affordability validate before mutation.

HTTP receipt IDs, generation checks and expected-level maps prevent duplicate purchases, stale retries and conflicting requests. Same-ID retries return existing receipts. Resource capacity is additive to a captured legacy baseline, never multiplied repeatedly or used to clamp existing balances. Full-cap collection leaves uncollected production intact.

Production startup makes a verified pre-progression-v1 SQLite backup on the existing persistent volume before routes or earlier migrations; integrity, company count and atomic receipt checks fail closed. Existing combat snapshots retain historical version rules.

## Reachability experiment

The checked-in script scripts/progression-economy.ts runs actual advanceFoundation/upgradeBuildings/collectRig rules, starting with 100 Compute and a prebuilt level-one campus with one GPU Rig, no reward income, no bonuses and no second rig. It purchases both storages, HQ2, every building level2, HQ3, and every building level3 including a sample wall. Every price is checked against capacity before purchase.

Recorded: 20 upgrades completed; 12.07 simulated hours of one-minute collection; final Compute cap 6000, Research cap 3000. This is a conservative upgrade affordability check, not a player session-length recommendation or human economy validation. Artifact: output/Progression_Review/economy-validation.json.

## Verification

Core regression coverage includes per-instance/offline production, concurrent upgrade deadlines, stale and duplicate wall selections, level caps, legacy capacities and over-cap balances, housing, retained queues, isolated HTTP same-ID replay and stale requests, and verified backup failure modes. Full-suite/build/visual/deployment results are recorded by the integrated release review.


## Rollback and release verification

This release adds optional save fields; it does not rewrite existing player layouts or restart timers. The first production start takes an integrity-checked pre-progression-v1 backup before any earlier migration code runs. Retain that backup and its receipt on the persistent volume.

Prefer a forward fix or reverting presentation changes while retaining the progression-aware server. Do not simply restore an old database or run an older server against newly upgraded saves: that can discard post-release purchases or interpret level-three ownership incorrectly. For an emergency data rollback, first stop writes, preserve the current database and sidecar files, verify the backup on a separate copy, and reconcile post-release transactions before restoring service. The pre-release backup is recovery insurance, not an automatic rollback that overwrites player activity.

Integrated release checks: 657 automated tests passed, zero failures/skips; production TypeScript/Vite build passed. Existing bundle-size and mixed-import warnings remain. The isolated browser review covers original three-level models, full campuses and upgraded combat on desktop and mobile viewport emulation. Repeated upgrade/construction cycles 24, 48 and 72 remained at 300 geometries, 21 textures and 1,044 scene objects with no remaining completion effects on both viewports. Synthetic campus draw calls increased from 629 at Level 1 to 707 at Level 3; triangles increased from 498,248 to 590,388. These are rendering workload counts, not measured physical-device frame rates.

Reproduce visual checks with scripts/review-progression.mjs and interactive UI checks with scripts/review-progression-ui.ts. Both use isolated fixtures, suppress test audio without changing player preferences, and close test contexts. Local review: output/Progression_Review/visual-review.html. Recorded combat matrix and historical replay verification are detailed in building-progression-combat.md. Physical iPhone testing and human balance validation remain follow-up work.

Interactive UI verification passed at 1280x800, 390x844 and 320x568: upgrade dialogs remain within the viewport, training actions are visible, maximum levels and HQ requirements are represented correctly, both storage construction previews open, and a five-wall batch debits exactly 225 Compute and survives reload. A mobile GPU Level 2 to 3 purchase debits 650 Compute, retains its deadline after reload and completes once after simulated offline time. Browser console errors: zero. Clean screenshots and machine-readable checks are in output/Progression_Review/ui/.

The isolated production startup/restart smoke test also passed, covering frontend asset serving, health checks, secure cookies, persisted purchases and duplicate prevention. Its old fixed placement coordinates were updated to the current grid; the game placement rules were not weakened.
