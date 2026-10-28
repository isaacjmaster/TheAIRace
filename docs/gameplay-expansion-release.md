# Gameplay expansion release review

## Scope and safeguards

This release adds ten missions, HQ 5 capacity for 200 walls, troop research and visual evolution through Level 3, genuine PvP resource transfers, and a shared infiltration/replay camera. It preserves construction, training, housing, Influence and account ownership. Existing battles retain their captured configuration. The wall and research migrations deliberately change the systems described below.

## Wall capacity and migration

| Founder HQ | 1 | 2 | 3 | 4 | 5 |
|---|---:|---:|---:|---:|---:|
| Walls | 100 | 100 | 120 | 160 | 200 |

Higher earned allowances are grandfathered. Existing placed segments move into a replacement inventory, preserving individual IDs, levels, metadata and active upgrades. Arrange Campus places those owned segments; committing is atomic and verifies the inventory exactly. Matchmaking excludes campuses awaiting replacement. New accounts are marked current and do not repeatedly enter migration.

Synthetic audits: 90 walls (40 L 1/30 L 2/20 L 3), 200 mixed-level walls and 220 grandfathered walls retained exactly. A fourth account had no walls. First pass moved 510 segments; second pass moved 0. Resources and unrelated progression remained intact. Upgrades also completed correctly while their walls were unplaced. Straight walls now span their cell rather than appearing as a row of oversized posts; corners and mixed-level junctions retain one-cell logical footprints.

## Troop progression

| Troop | HP L 1 / L 2 / L 3 | Damage per hit L 1 / L 2 / L 3 | Research for L 2 / L 3 |
|---|---|---|---|
| Pulsewheel | 60 / 72 / 84 | 9 / 11 / 13 | 100 / 300 |
| Breacher | 480 / 576 / 672 | 60 / 72 / 84 | 150 / 400 |
| Disruptor | 54 / 65 / 76 | 2.25 / 2.7 / 3.15 | 200 / 450 |

L 2 requires Lab 2 and 5 minutes; L 3 requires Lab 3 and 10 minutes. One job at a time. Disruptor EMP duration is 1.50/1.65/1.80 seconds;6000 ms cooldown and 4500 ms immunity remain. Training prices/times, housing, attack intervals and movement are preserved. Stat snapshots prevent upgrades changing an ongoing battle. Native model evolution appears in the Lab, training, campus, transfers and combat; the bodies retain their existing scale, articulated pivots and weapon anchors.

GPU Optimization and Training Efficiency are retired: active modifiers and purchases are disabled. Pulsewheel Engineering 1 maps to troop 2; Engineering 2/3 maps to troop 3. Valid paid active Pulsewheel jobs retain deadlines. Non-troop jobs and reliably known historical costs remain in migration audits without invented refunds. All accounts are preflighted before the wall migration; unknown legacy research fails closed for reconciliation.

## Resource raiding

Only server-simulated PvP battles transfer resources. Each resource has a frozen starting budget of at most 10% of the defender's available wallet. Compute belongs to GPU Rigs/Compute Storage; Research belongs to Labs/Research Storage. A storage contributes three shares and a producer one. Authoritative cumulative damage unlocks a proportional integer share, with full destruction unlocking that building's full share.

Settlement further caps each resource to 10% of the defender's current balance and the attacker's free storage. The defender loses exactly what the attacker receives. Untransferred overflow stays with the defender; it is not reserved or destroyed. Defender spending during battle can lower the final amount. The HUD shows earned/available loot; final results and battle history show actual transfers.

No loot for abandoned, invalid, self, replay, mission or pair-cooldown operations. Existing shields and Influence rules remain. Partial theft consumes the existing pair cooldown. Transactions and settlement receipts prevent repeats. The offline sweep now reloads current saves between settlements, fixing a potential reciprocal-raid overwrite.

Recorded server example: attacker 500 ->550 Compute, defender 500 ->450 Compute;50 transferred,0 Research (no Research-bearing building in the fixture). Repeat settlement/history/replay requests changed neither balance. Reciprocal attacks conserved 1000 total Compute. Rollback, caps, partial damage and empty balances are regression-tested.

## Missions and balance

All previews use actual authored layouts and actual level-aware defensive statistics. Every mission has a three-token victory within its intended HQ/housing/research tier. See expanded-mission-balance.md for the complete 266-battle deterministic report and tactical examples. These are scripted simulation outcomes, not human win rates.

| Mission | HQ / troop tier | Walls | 0 / 1 / 2 / 3 tokens | Mean destruction |
|---|---|---:|---|---:|
| 1. Lumen Labs | 1 / 1 | 53 | 0 / 0 / 0 / 14 | 100.00% |
| 2. Vector Works | 1 / 1 | 74 | 0 / 0 / 0 / 14 | 100.00% |
| 3. Prism Systems | 2 / 1 | 95 | 6 / 0 / 2 / 13 | 76.05% |
| 4. Orbit Research | 2 / 2 | 100 | 0 / 0 / 2 / 19 | 98.57% |
| 5. Apex Compute | 3 / 2 | 114 | 0 / 0 / 5 / 23 | 95.11% |
| 6. Helix Dynamics | 3 / 2 | 120 | 1 / 1 / 6 / 20 | 90.50% |
| 7. Nexus Industries | 4 / 3 | 134 | 5 / 1 / 7 / 22 | 84.97% |
| 8. Quantum Forge | 4 / 3 | 146 | 3 / 0 / 8 / 24 | 89.71% |
| 9. Singularity Systems | 5 / 3 | 192 | 5 / 0 / 4 / 26 | 87.66% |
| 10. Zenith Intelligence | 5 / 3 | 200 | 16 / 5 / 8 / 6 | 53.29% |

Zenith frontal 50 Pulsewheels:1 token/75%;29 Pulsewheels+3 Breachers+2 Disruptors:3/100%;10 Breachers:0/25%. The supported army from the eastern middle achieved 0/33%, so composition alone does not guarantee success. Maximum observed idle/moving stall was 500 ms, excluding intended attack pauses.

## Validation and limitations

- Integrated automated suite:757 passed in the final combined run, including the backup tests.
- Production build and isolated production restart/save-persistence smoke passed.
- All 10 mission previews and server launches passed at 1440 x 900 and 390 x 844; previous/next boundaries verified.
- All 12 troop-upgrade purchases/completions passed through the full application at both viewports; reload retained all three elite tiers.
- PvP loot HUD/result views checked at both viewport sizes.
- Old/new replay screenshots and clips show exact camera parameter equality with normal infiltration. Pause/Play/2 x/Exit passed.
- Synthetic 200 wall replay rendering sample: median 13.3 ms, p 9513.4 ms in desktop Edge using desktop and phone dimensions. This is not a before/after performance improvement, a physical iPhone measurement or a device guarantee. The dense scene still has roughly 1166 draw calls in the phone sample; lower-powered device profiling remains important.
- Full-capacity Pulsewheel armies remain effective through missions 1-9. Further human playtesting should assess midgame teaching and composition variety. No live human-player validation was performed.
- Production bundle retains the existing large-chunk warning; this release does not claim a bundle-size optimization.

## Release safety

Production startup creates and integrity-checks a persistent SQLite backup before migrations. Both migrations retain original per-account snapshots and repeat-safe receipts. Synthetic fixtures validate preservation; no production player database was copied into local test artifacts. Railway startup logs must confirm backup/migration completion and the live bundle must match the tested build before release is reported complete.

Visual review: output/Gameplay_Expansion/index.html. Raw matrices, browser checks, migration audits, screenshots and WebM clips are stored alongside it. Deployment verification is recorded in deployment.json after release.
