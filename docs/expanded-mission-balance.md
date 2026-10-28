# Ten-mission expansion: implementation and measured balance

The first five names and total rewards are retained. All ten layouts are authored in `shared/infiltration-bases.ts`; `MISSION_CATALOG` exposes intended HQ, troop tier, difficulty and tactical description. The existing carousel consumes the expanded IDs and renders the actual target snapshot. New missions capture version 4 durability, actual building levels/HP, tower damage/Target Lock caps, Arc damage, and drone health/damage. Saved operations are not rewritten.

Late mobile defenders intentionally use Level 3 drone equipment alongside stronger static weapons. This is represented in their captured level and statistics, not a hidden damage modifier. Mission 7 introduces Level 4 Arc equipment alongside Level 3 infrastructure and HQ 4. Defenses use the standard owned-building firing cadence, no old slower NPC cannon override.

## Final deterministic matrix

266 battles use production `newSquadOperation`, `commandSquad`, `advanceSquad` and actual troop research snapshots. Seven reproducible deployment scripts cover frontal grouping, opposite flanks, rear split, and offset flank approaches with delayed ranged/support deployment. HQ 1 uses 10/20 Pulsewheels; later tiers add mixed, Breacher-only and support compositions within actual 20/25/30/40/50 housing. Research tiers are 1/1/1/2/2/2/3/3/3/3. No account or production database is accessed.

These are deterministic script outcomes, not human win rates or estimates of player skill. Unlike-for-like armies across progression mean completion percentages need not decrease at every row; stronger research/housing is intentionally available at later stages.

| Mission | Intended HQ / troop tier | Housing | Walls | Cases | 0 / 1 / 2 / 3 tokens | Mean destruction |
|---|---|---:|---:|---:|---|---:|
| 1. Lumen Labs | 1 / 1 | 20 | 53 | 14 | 0 / 0 / 0 / 14 | 100.0% |
| 2. Vector Works | 1 / 1 | 20 | 74 | 14 | 0 / 0 / 0 / 14 | 100.0% |
| 3. Prism Systems | 2 / 1 | 25 | 95 | 21 | 6 / 0 / 2 / 13 | 76.05% |
| 4. Orbit Research | 2 / 2 | 25 | 100 | 21 | 0 / 0 / 2 / 19 | 98.57% |
| 5. Apex Compute | 3 / 2 | 30 | 114 | 28 | 0 / 0 / 5 / 23 | 95.11% |
| 6. Helix Dynamics | 3 / 2 | 30 | 120 | 28 | 1 / 1 / 6 / 20 | 90.5% |
| 7. Nexus Industries | 4 / 3 | 40 | 134 | 35 | 5 / 1 / 7 / 22 | 84.97% |
| 8. Quantum Forge | 4 / 3 | 40 | 146 | 35 | 3 / 0 / 8 / 24 | 89.71% |
| 9. Singularity Systems | 5 / 3 | 50 | 192 | 35 | 5 / 0 / 4 / 26 | 87.66% |
| 10. Zenith Intelligence | 5 / 3 | 50 | 200 | 35 | 16 / 5 / 8 / 6 | 53.29% |

## Tactical evidence

Zenith has 200 walls, three Level 5 cannons, three Level 5 Arc Spires and three Level 3 drones. With 50 housing and Level 3 troops:

- 50 Pulsewheels clustered at the front:1 token,75% destruction.
- 29 Pulsewheels +3 Breachers +2 Disruptors at the same front:3 tokens,100% destruction.
- 10 Breachers at the same front:0 tokens,25% destruction.
- 50 Pulsewheels from the southwest or northern flank can achieve 3 tokens; the approach matters.
- The same supported 29/3/2 army from the eastern middle achieves 0 tokens/33%, so mixed composition alone is not a guaranteed win.

Every mission has a recorded complete victory at its intended stage. No sampled active idle/moving stall exceeded 500 ms. This detector excludes intended attacking/wall-breaching pauses; it is not proof against every possible navigation defect.

## Controlled iteration

The common 136 army/strategy cases moved from 117 full clears in the initial candidate to 95 in the final layouts; mean destruction changed from 96.62% to 86.61%. These candidate maps are not the previous live release. All raw intermediate measurements remain in output/Gameplay_Expansion. Verified geometry defects (tower inside a divider, Arc touching a wall) were fixed before adding defensive coverage. Final layouts have no building/wall intersections, valid attack faces, and stage-appropriate wall allowances.

## Limitations and next observations

Full-capacity Pulsewheel armies remain particularly effective through Missions 1-9, and the midgame missions are forgiving once their recommended research and maximum Hangar are obtained. The strongest composition across these scripts is still often Pulsewheel-heavy; this pass does not claim universal composition parity. Breacher-only armies suffer against aerial defenders and long traversal. The elite mission demonstrates a clear heavy/support opportunity, but human playtesting should verify whether the early and middle missions teach that counterplay sufficiently. No live human-player or physical iPhone testing was performed by this harness.

The final matrix records the exact source hash, target templates, orders, survivors, incoming damage by troop type, duration, outcomes and navigation observations. Tests also retain frozen historical pre-expansion snapshots rather than silently regenerating old regression maps from the changed factory. All six historical v 3 Apex outcomes are unchanged.

## Validation

46 focused mission, combat-versioning, historical strategy, tactical persistence and navigation tests passed after integration. New regressions validate all ten launches, actual tier stats, no overlap, legal wall budgets, exact 200 wall elite layout and the composition-sensitive elite result. Full integrated suite/build and browser verification are owned by the parent release workflow.

Artifacts: `output/Gameplay_Expansion/missions-verified.json`, `mission-summary.json`, `mission-tests.log`. Reproduce with `npx tsx scripts/expanded-mission-balance.ts --label=<fresh-label>`; never overwrite prior measurements. The read-only `scripts/check-mission-layouts.ts` lists overlap diagnostics.
