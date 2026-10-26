# Building-level combat validation

New PvP operations use version 4. Building durability, wall durability, Sentinel damage and drone station bonuses are captured from server-owned persisted levels. Client presentation does not determine damage. Historical version 2 and 3 rules remain frozen; handcrafted missions remain version 3 with their existing difficulty.

## Final defensive configuration

| Statistic | Level 1 | Level 2 | Level 3 |
|---|---:|---:|---:|
| Sentinel HP | 420 | 600 | 800 |
| Sentinel starting damage | 18 | 24 | 30 |
| Target Lock cap | 30 | 40 | 50 |
| Drone HP | 240 | 300 | 360 |
| Drone damage | 24 | 30 | 36 |
| Wall HP | 180 | 270 | 390 |
| HQ HP | 216 | 280 | 350 |
| Ordinary building HP | 108 | 140 | 180 |
| Army housing | 20 | 25 | 30 |

Sentinel range 12, cadence 1250 ms, warmup 450 ms and lock increment 2 are unchanged. Drone detection, movement, cadence and guard assignments are unchanged. Upgrading a station does not add drones. Existing research multiplier is applied after troop base damage, once. Breacher still deals 120 wall damage per strike: 2, 3 and 4 strikes to destroy an undamaged wall at levels 1, 2 and 3 respectively.

## Recorded simulation comparison

`scripts/building-progression-combat.ts` executes the real fixed-step simulation, with synthetic bases and no database/network. 162 cases: three building levels, three legal fixture layouts, six deployment scripts, and all-Pulsewheel / two-Breacher / four-Breacher armies. Housing is 20/25/30, no research bonus. The level-one stress fixture includes a Sentinel and second rig normally unavailable at HQ1; it is a conservative defense stress comparison, not a legal HQ1 progression claim. Levels 2/3 use legal HQ2/3 layouts. The initial candidate had Sentinel HP420/510/620, damage18/21/24, cap30/35/40 and drone HP240/285/330, damage24/27/30. Only upgraded defense values changed between the paired runs.

These are reproducible scripts, not human win rates or independent statistical samples; all-light frontal/heavy-first/light-first scripts intentionally duplicate orders.

| Level | Candidate tokens 0/1/2/3 | Final tokens 0/1/2/3 | Candidate mean destruction | Final mean destruction |
|---|---|---|---:|---:|
| 1 | 0/1/1/52 | 0/1/1/52 | 98.5% | 98.5% |
| 2 | 4/1/6/43 | 9/2/2/41 | 88.4% | 82.0% |
| 3 | 5/3/2/44 | 13/0/4/37 | 87.0% | 77.1% |

## Strategic observations

At level 3, the clear-fire-lane base defeats a frontal 30-Pulsewheel swarm (0 tokens). The 20-Pulsewheel/2-Breacher army can achieve 3 tokens frontally or with Breachers first, but earns 0 when Breachers arrive after exposed Pulsewheels. The 10-Pulsewheel/4-Breacher army gets 2 tokens frontally, 3 with Breachers first, and 0 with Pulsewheels first. The level-three fortified base defeats every scattered script tested. Open base layouts remain easy for coherent full armies. Thus upgrades improve defense without making complete victories impossible.

The strong frontal/swarm performance against some ordinary compact bases remains a limitation: a single tower without a clear firing lane cannot substitute for a good defensive layout. Further human playtesting should cover attack costs, resource progression mismatch and creative bases; this matrix does not establish universal composition parity.

## Compatibility and regression evidence

Twelve stored version-three and twelve stored version-two authoritative trajectories replayed with zero hash mismatches (24 total). Existing version-two regression tests remain unchanged. Automated coverage checks captured level HP/damage, storage targets, mixed-level walls, public visual round trips, actual Sentinel capped fire over walls, actual drone damage, replay isolation, fixed-step checkpointing, mission strategic results, server restart, rewards and defender save immutability.

Artifacts: `output/Building_Progression/combat-baseline.json`, `output/Building_Progression/combat-results.json`, `output/Combat_Balance/progression-v3-compatibility-replay.json`, `output/Combat_Balance/progression-v2-compatibility-replay.json`. No physical iPhone or live human-player balance testing was performed.

## Expanded Hangar armies across all five handcrafted missions

An additional 135 authoritative scripts cover Hangar capacity 20/25/30, all-Pulsewheel / two-Breacher / four-Breacher compositions, and frontal / Breacher-first (5.5-second support delay) / split-side deployments across every mission. No stats, layouts or mission rewards changed. No research bonus is applied. Hangar level is distinct from HQ level: a level-one Hangar can belong to an HQ2 company with Breacher access. All 135 scripts deployed their complete permitted army. Results are scripted examples, not estimated player win rates; pure-army frontal and heavy-first orders duplicate one another.

Each cell shows three-token results out of nine scripts, followed by average destruction.

| Mission | 20 housing | 25 housing | 30 housing |
|---|---:|---:|---:|
| lumen-labs | 9/9; 100.0% | 9/9; 100.0% | 9/9; 100.0% |
| vector-works | 9/9; 100.0% | 9/9; 100.0% | 9/9; 100.0% |
| prism-systems | 6/9; 90.7% | 8/9; 98.1% | 9/9; 100.0% |
| orbit-research | 5/9; 72.1% | 8/9; 96.2% | 9/9; 100.0% |
| apex-compute | 2/9; 62.4% | 6/9; 93.0% | 9/9; 100.0% |

The stronger late-game armies predictably outgrow early missions. All tested 30-housing scripts cleared all five missions, including Apex; this expansion does not preserve Apex as endgame difficulty for a fully upgraded Hangar. That is an explicit content-progression limitation, rather than grounds to retroactively make the introductory ladder harder for existing 20-space armies. Future higher-tier missions or optional difficulty tiers would provide a better progression target.

Apex still distinguishes strategies at 25 housing: 5 Pulsewheels + 4 Breachers reached 87%/two tokens frontally but 100%/three tokens with Breachers first. Split-side 25-Pulsewheel deployment reached 75%/two tokens, while its frontal deployment cleared the base. At 20 housing, Apex recorded only two three-token outcomes out of nine scripts, both balanced armies.

All runs terminated naturally: 116 successful extractions and 19 army eliminations, zero timeouts or incomplete deployment sequences. A conservative idle/moving-still diagnostic reached 26.9 seconds in one Prism script; this includes units waiting behind the existing worker-per-target limit and is not proof of a navigation failure. No battle became permanently stuck or timed out. No reliability defect requiring combat changes was identified.

Reproduction: `scripts/building-progression-missions.ts`. Exact orders and outcomes: `output/Building_Progression/mission-results.json`.
