# Combat balance results — Breacher and mixed armies

This is a deterministic, offline comparison of the existing authoritative combat implementation. It does not access player accounts, alter databases, measure renderer FPS, or estimate real-player win rates. The final candidate gives Breacher a tank/breach role, retains Pulsewheel anti-air and mobility, fixes wall navigation, and makes advanced mission outcomes depend more on army composition and deployment.

## Scope and reproducibility

The main comparison contains 396 workloads over all five missions and six synthetic legal PvP layouts: open, average, fortified, compartments, spread, and concentrated drone coverage. Each army consumes 20 housing: 20P, 15P+1B, 10P+2B, 5P+3B, or 4B. P means Pulsewheel; B means Breacher. PvP fixtures have identical nine-building rosters, one Sentinel, two drones, and at most 100 walls. Open and average layouts deliberately have poor drone coverage; the separate clear-fire-lane diagnostic relocates defenses without exceeding ownership limits.

The fixed seed is 729381, plus 101 per scenario index. Commands, initial target snapshots, balance profiles, source hashes, trajectory hashes, and individual results are recorded in the JSON artifacts. Simulations advance the actual shared server rules at 100 ms steps. Strategies are coherent frontal deployment, heavy-first with 5.5-second support delay, light-first, west-side attack, and east/west split. Frontal is **not** a random or careless attack. Pure-army frontal/heavy-first/light-first commands coincide; the 396 raw workloads contain **231 unique HQ2 deployment scripts**, not 396 independent trials.

The early tier is an HQ1/no-research Pulsewheel army deliberately attacking HQ2 defender fixtures, a progression-mismatch stress comparison. The HQ2 tier has no research. The researched tier applies Pulsewheel Engineering 3 (+30%) to selected armies. Separate final-only diagnostics add 110 cases: seeded chaotic arrivals across four edges over 0–15 seconds and heavy-first with two-second support. They are not included in the paired baseline denominator.

## Changed rules and values

| Item | Frozen baseline | Final new-operation profile |
|---|---:|---:|
| Breacher HP | 320 | 480 |
| Breacher wall hit | 60 | 120 (60 × 2) |
| Wall HP | 72 | 180 |
| Pulsewheel wall DPS, before research | 18 | 9 |
| Security Drone HP | 160 | 240 |
| Sentinel HP | 300 | 420 |
| Apex drones | 2 | 3 |
| Pulsewheel building approach | Close approach despite 4.6 range | Reachable firing positions within 4.6, respecting walls and other buildings |
| NPC light attack work | Fixed work rate; Sentinel effectively 20 HP/s per full-rate worker | Actual 9 DPS × Engineering × diminishing worker contribution; building HP stays independent |
| Square wall approach | Orientation shortcut could select blocked side | Reachable boundary approach on all sides |
| Drone acquisition | Could repeatedly pursue beyond home coverage | Acquisition and retained pursuit obey the home leash |

Unchanged: Pulsewheel 60 HP, 9 damage/1 second, speed 2.8, range 4.6; Breacher 60 structure damage/1.8 seconds, speed 1.5, melee range 1.3 and 300 ms initial wind-up; drone 24 damage/1 second and existing weapon/detection ranges; Sentinel 18–30 Target Lock damage, range 12, PvP interval 1.25 seconds, and mission interval 2 seconds. Breacher still prefers defenses and cannot hit aircraft. Existing drones remain active when their station is hacked.

Housing remains 20 total, Pulsewheel costs one housing/5 Compute/10 seconds, and Breacher costs five housing/40 Compute/30 seconds with HQ2 unlock. No account, resource, training, progression, reward, or saved-layout migration was performed. New operations use version 3. Existing version-2 snapshots retain frozen stats and their old targeting/navigation behavior.

## Verified causes and interpretation

* **Wall navigation failure:** adjacent 1×1 panels could make the chosen approach unreachable. Entire armies repeatedly replanned without damaging anything. These zero-damage timeouts are bugs, not balanced defensive victories.
* **Swarm anti-air advantage:** all light troops can attack a drone; a 20-Pulsewheel volley is 180 damage against baseline 160 HP. Buildings have five work slots, but drone damage is not capped by that limit. Five Pulsewheels also had 300 aggregate HP versus baseline Breacher 320, higher total DPS, faster movement, range, and anti-air. This explains why a five-housing heavy needed a meaningful durability and wall-specialist advantage.
* **NPC damage inconsistency:** Sentinel 300 HP/15 work seconds made a full-rate light worker deal 20 effective DPS instead of its declared 9. Five worker contributions sum to 2.45, not five. Normalization decouples target HP from damage and applies Engineering consistently.
* **Ranged occlusion defect:** the initial range implementation checked walls but could fire through another building. The final candidate excludes only the target from solid-geometry checks. This mandatory correction is included in all final measurements below.
* **Layout and sequencing matter:** clear-fire-lane tower shots were measured, not assumed. A full swarm can still overwhelm a legal single-tower base. A coordinated heavy-first mixed army can survive situations where scattered deployment loses. Additional AoE, forced target caps, or damage escalation were not introduced merely to force equal outcome counts.

Drone HP 240 alone did not solve swarm dominance; it hurt low-light armies more. Sentinel durability and tank durability, followed by a third Apex drone, produced clearer strategic separation. The experiments do not establish an optimum balance for all player skill levels or future layouts.

## Controlled iterations

All candidate artifacts are preserved under `output/Combat_Balance/`.

| Label | Isolated change / finding |
|---|---|
| `baseline`, `baseline-expanded` | 198 core and 396 expanded original workloads; frozen source and exact commands retained |
| `reliability-core` | Square-wall routing and drone home leash; zero-damage timeouts removed without changing stats |
| `ranged-core` | Actual Pulsewheel structure firing range; mixed success improved slightly |
| `wall-core` | Wall 180 HP, Pulsewheel wall DPS 9, Breacher wall multiplier 2 |
| `npc-normalized-core` | NPC work converted to real damage; Engineering enabled consistently |
| `drone240-core` | Drone HP 240 alone; full swarm still cleared all core missions/PvP, mixed armies took more pressure |
| `tank480-core` | Breacher HP 480; mixed viability recovered, heavy-only still failed Apex |
| `sentinel420-core` | Sentinel HP 420; Orbit frontal swarm fell to two tokens while 10P+2B stayed viable |
| `apex-drone3` | Third Apex drone; coherent frontal 20P earned two tokens, west-side 20P cleared, mixed heavy-first cleared, scattered split could fail |
| `final-occlusion-expanded` | Final 396 cases, including corrected building occlusion |
| `final-occlusion-planning` | Final-only 110 scattered/quick-support diagnostic cases |
| `final-occlusion-fire-lanes` | Final-only 25 legal clear-fire-lane layout cases |

## Deduplicated HQ2 outcomes

Counts below are three-token completions among unique fixed deployment scripts, **not player win rates**. Baseline PvP failures include navigation bugs; the increase after fixing them must not be presented as purely a balance change.

| Army | Missions before → final | Synthetic PvP before → final |
|---|---|---|
| 20P + 0B | 15/15 (100%) → 12/15 (80%) | 15/18 (83%) → 18/18 (100%) |
| 15P + 1B | 25/25 (100%) → 22/25 (88%) | 21/30 (70%) → 30/30 (100%) |
| 10P + 2B | 23/25 (92%) → 24/25 (96%) | 18/30 (60%) → 29/30 (97%) |
| 5P + 3B | 17/25 (68%) → 17/25 (68%) | 12/30 (40%) → 20/30 (67%) |
| 0P + 4B | 5/15 (33%) → 7/15 (47%) | 5/18 (28%) → 8/18 (44%) |

## Representative final cases

All rows below are HQ2/no research. Damage received and allocated outgoing damage are shown as P/B. Incoming health loss is measured exactly; outgoing values proportionally allocate observed shared progress on simultaneous-hit ticks and are not exact per-unit hit attribution. The full HTML review contains every scenario, tier, composition and strategy.

| Scenario / deployment | Army P/B | Tokens | Destroyed | HQ hacked | Surviving P/B | Received P/B | Allocated outgoing P/B | Seconds |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| orbit-research / frontal | 20/0 | 2 | 66% | Yes | 0/0 | 1200/0 | 1702/0 | 45.8 |
| apex-compute / frontal | 20/0 | 2 | 75% | Yes | 0/0 | 1200/0 | 2228/0 | 48.7 |
| apex-compute / sides | 20/0 | 3 | 100% | Yes | 8/0 | 814/0 | 2570/0 | 56.9 |
| apex-compute / split | 20/0 | 0 | 25% | No | 0/0 | 1200/0 | 1536/0 | 36.8 |
| apex-compute / heavy-first | 10/2 | 3 | 100% | Yes | 3/1 | 468/708 | 1625/835 | 53.9 |
| apex-compute / heavy-first | 5/3 | 3 | 100% | Yes | 5/2 | 24/1032 | 1177/1105 | 51.6 |
| apex-compute / light-first | 5/3 | 0 | 12% | No | 0/0 | 300/1440 | 197/763 | 41.1 |
| apex-compute / frontal | 0/4 | 2 | 50% | Yes | 0/0 | 0/1920 | 0/1296 | 54.4 |
| pvp-fortified / heavy-first | 10/2 | 3 | 100% | Yes | 9/2 | 60/714 | 1224/1370 | 31.7 |
| pvp-spread / frontal | 10/2 | 2 | 77% | Yes | 0/0 | 600/960 | 1062/552 | 45.9 |
| pvp-drone-coverage / heavy-first | 10/2 | 3 | 100% | Yes | 9/2 | 60/602 | 1215/1392 | 28.6 |

## Additional planning and coverage diagnostics

These final-only cases have no historical paired baseline and are not added to the 396-case denominator.

| Diagnostic family | Chaotic three-token completions | Two-second support three-token completions |
|---|---:|---:|
| Five missions × five armies | 10/25 | 21/25 |
| Six legal PvP layouts × five armies | 15/30 | 27/30 |

On Apex, chaotic 20P achieved zero tokens/12% destruction, while coherent frontal 20P achieved two tokens/75% and west-side 20P cleared. Quick support with 10P+2B cleared with 3P+2B surviving; chaotic 10P+2B earned two tokens/75%. Open and poorly covered PvP bases remain forgiving even for scattered armies. Fortified 10P+2B changed from zero tokens under chaotic deployment to three with quick support; the coverage layout showed the same distinction. Spread-layout 10P+2B was an exception: chaotic cleared, quick support achieved two tokens, showing this is not a universally dominant script.

The clear-fire-lane fixture uses station[-7.5,5], drone station[-7.5,9], Sentinel[0,7], guards[-7,7]/[7,7], and 100 walls. Footprints are validated. Against 20P frontal its Sentinel fired 13 shots/258 attempted damage, yet the army cleared with 11 survivors. Against 10P+2B, frontal achieved two tokens/66%, heavy-first three tokens with all units surviving, and light-first zero tokens/33%. Attempted tower damage includes possible overkill and is not actual health removed. This confirms a functioning defense and meaningful deployment decisions; it does not prove a legal single tower should always defeat a full army.

## Performance and compatibility

The matched 198-case reliability-only run reduced aggregate offline simulation wall time from **1072.9 seconds to 82.1 seconds**. The largest verified reason is eliminating repeated impossible wall replanning; old full-duration failed battles inflated the baseline. This is an authoritative-simulation workload measurement, not Three.js rendering time, browser FPS, or physical iPhone performance. Later final totals combine balance, outcome-duration and reliability changes, so they must not all be attributed to optimization.

The expanded frozen baseline had 22 zero-damage timeouts; the final expanded matrix has 0. Its aggregate simulation wall time was 174.34 seconds, combining different balance and battle-duration outcomes. Idle/stall diagnostics also contain legitimate waits for occupied attack positions; they are not automatically bugs. Twelve spaced baseline operations were reproduced exactly with the frozen engine. The final current engine also reproduced all 12 historical version-2 snapshots with exact trajectory hashes and zero mismatches.

## Reproduce and inspect

Use new labels; the harness refuses to overwrite an existing result. No database or browser is involved.

```powershell
npx tsx scripts/combat-balance-matrix.ts --label=my-final --stage=expanded
npx tsx scripts/combat-balance-matrix.ts --label=my-planning --stage=core --tier=hq2 --strategy=chaotic,quick-support
npx tsx scripts/combat-balance-matrix.ts --label=my-fire-lanes --stage=expanded --scenario=pvp-clear-fire-lanes --tier=hq2
npx tsx scripts/combat-balance-matrix.ts --label=my-legacy --replay=output/Combat_Balance/baseline.json --limit=12
npx tsx scripts/combat-balance-compare.ts output/Combat_Balance/baseline-expanded.json output/Combat_Balance/my-final.json
npx tsx scripts/combat-balance-report.ts output/Combat_Balance/my-final.json
```

* [Final detailed/deduplicated review](../output/Combat_Balance/final-occlusion-expanded-report.html)
* [Final raw operations, orders and metrics](../output/Combat_Balance/final-occlusion-expanded.json)
* [Paired baseline comparison](../output/Combat_Balance/final-occlusion-expanded-comparison.json)
* [Deployment-planning review](../output/Combat_Balance/final-occlusion-planning-report.html)
* [Clear-fire-lane review](../output/Combat_Balance/final-occlusion-fire-lanes-report.html)
* [Final legacy replay verification](../output/Combat_Balance/final-occlusion-legacy-replay.json)
* [Frozen baseline review](../output/Combat_Balance/baseline-expanded-report.html)

These output artifacts are local review files and may not be included in a normal source checkout. The scripts regenerate candidates; preserve the frozen baseline directory and JSON files when reproducing the historical comparison.

## Limitations

Synthetic fixtures are legal examples, not a representative sample of the live player population. One deterministic seed and a small set of scripted strategies do not establish statistical win probabilities. Equal housing is not equal training cost. No human playtest, physical iPhone frame-rate test, audio mix judgment, visual animation assessment, or real-player account attack was performed by this simulation harness. No production data was modified. The full application suite, desktop/mobile viewport review and deployment are separate validation work.

## Validation and deployment

Validation completed: all 636 automated tests passed with no skips; TypeScript and the production build passed. Desktop and iPhone-sized viewport checks covered training, mixed Hangar inventory, troop selection, deployment and Apex combat against an isolated fixture database, with no page errors. Screenshots and animation clips are in `output/Combat_Balance_Review/visual-review.html`.

Renderer-only measurements on this Windows host were 72.2–75.1 FPS on desktop and 75.1–75.2 FPS in mobile viewport emulation across early/middle/late samples. These exclude the full HUD/network workload, are not a before/after FPS comparison, and do not establish physical iPhone performance. The simulation CPU improvements reported above are headless measurements, not gameplay FPS.

Release is validated for deployment. Startup verifies a pre-combat-v3 persistent SQLite backup before serving the new release; historical operations retain their original rules. Deployment completion and production health are recorded separately in the release verification artifact after publishing.
