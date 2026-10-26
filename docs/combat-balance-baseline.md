# Combat balance baseline — read-only audit

Captured 2026-10-25 before balance tuning; repository HEAD `0d25cc936756d2293b4a5187001d0d2023a68175`. No gameplay, catalog, server or account edits were made for this audit. Values below come from the working source and freshly constructed in-memory mission snapshots, not UI copy or visual effects. Paths are repository-relative.

## Current offensive troops

| Property | Pulsewheel | Breacher |
|---|---:|---:|
| Unlock Founder HQ | 1 | 2 |
| Housing | 1 | 5 |
| Compute cost | 5 | 40 |
| Base training time | 10 s | 30 s |
| HP | 60 | 320 |
| Movement units/s | 2.8 | 1.5 |
| Discrete hit damage | 9 | 60 |
| Hit interval | 1,000 ms | 1,800 ms |
| Nominal discrete DPS | 9 | 33.333 |
| HP per housing | 60 | 64 |
| Nominal DPS per housing | 9 | 6.667 |
| Attack reach | 4.6 against drones | 1.3 from structure/wall footprint |
| Acquisition | Drone acquisition 6.4 | Defense-first building ordering |
| Aircraft | Can attack | Cannot attack |

Sources: `shared/troops.ts`, `shared/tactical-infiltration.ts`, `shared/infiltration.ts`, `shared/squad-infiltration.ts`.

**The table's Pulsewheel damage/range is not the NPC building-hacking model.** Current building approach positions place both troop types approximately 0.85 units outside the footprint. Pulsewheel's 4.6 range applies to drone attacks, not ranged attacks against buildings. Breacher adds a 300 ms initial attack preparation via `attackReadyAt`; subsequent strikes also respect its last-shot interval. All simulation steps are 100 ms, so timing is quantized.

Capacity is 20 housing, including ready troops, queued troops and reserved units in an operation. Examples: 20 Pulsewheels, 10 Pulsewheels plus 2 Breachers, or 4 Breachers. The training queue is sequential and mixed; queued troops retain their selected type and duration. Existing unspecified troop IDs mean Pulsewheel. Source: `shared/foundation.ts` (`armyUsed`, training) and `shared/infiltration-army.ts`.

## NPC and PvP building damage are materially different

| Target | NPC solo Pulsewheel work | NPC Breacher effective durability | PvP durability |
|---|---:|---:|---:|
| GPU Rig | 12 work-seconds | 108 equivalent HP | 108 HP |
| Research Lab | 16 work-seconds | 144 equivalent HP | 108 HP |
| Founder HQ | 22 work-seconds | 198 equivalent HP | 216 HP |
| Core terminal | 22 work-seconds | 198 equivalent HP | No standard player terminal |
| Sentinel Tower | 15 work-seconds | Explicit 300 HP | 300 HP |
| Other player buildings / builder huts | Not standard NPC objectives | Not standard NPC objectives | 108 HP |
| Security Wall | 72 HP, separate wall damage | 72 HP | 72 HP |

NPC work and PvP HP must not be conflated. In NPC missions, Pulsewheels add continuous work at per-worker contributions `[1, .65, .4, .25, .15]` per second; five workers total 2.45 work/s. Pulsewheel Engineering does **not** multiply this building work. Breacher adds discrete `60 * hackSeconds / (maxHealth ?? hackSeconds * botDamage)` work per strike. Its contribution is additive and does not use the diminishing Pulsewheel contribution curve. Combined troops still share a maximum five assigned attackers per objective (unit count, not housing).

In PvP, Pulsewheel strikes add `9 * cipherDamageMultiplier` HP damage every second; Breacher adds 60 every 1.8 seconds. No diminishing damage curve applies. In current `playerTarget`, ordinary building HP is calculated from `TACTICAL_BALANCE.botDamage`: HQ `24 * botDamage`, all other non-Sentinel buildings `12 * botDamage`. Changing that damage constant therefore also changes freshly captured defender durability unless explicitly decoupled. HQ building level does not presently change these HP formulas. Incomplete buildings are included as targets; only completed defense buildings generate active defense units.

Walls use continuous `18 * cipherDamageMultiplier` damage/s from each Pulsewheel, but discrete 60 damage from each Breacher. An uninterrupted base Pulsewheel requires 4 seconds of wall work; one Breacher requires two strikes (roughly 2.1 s after arrival, including first preparation; simulation quantization applies). Wall HP is currently invariant across legacy long segments, new 1×1 tiles, and hand-authored NPC segments, despite different physical sizes. Walls do not count toward destruction percentage or Breach Tokens.

Sources: `shared/tactical-infiltration.ts` (`advanceTactical`), `shared/player-combat.ts` (`playerTarget`), `shared/squad-infiltration.ts` (`SQUAD_BALANCE`), `shared/attack-positions.ts`, `shared/breach-rating.ts`.

## Current defensive units

| Property | Owned PvP Sentinel | NPC Sentinel | Current Security Drone |
|---|---:|---:|---:|
| HP | 300 | 300 | 160 |
| Initial damage | 18 | 18 | 24 |
| Sustained interval | 1,250 ms | 2,000 ms | 1,000 ms |
| Initial acquisition warmup | 450 ms | 900 ms | 400 ms |
| Maximum range | 12 | 12 | 5.8 weapon range |
| Target Lock | +2/hit, capped at 30 | Same | None |
| Acquisition radius | 12 | 12 | 10.2 |
| Pursuit retention range | Stationary | Stationary | 15.3 for aerial units |
| Patrol speed | — | — | PvP 1.1; NPC 1.2 |
| Pursuit speed | — | — | PvP 2.0; NPC 2.1 |

Sources: `shared/sentinel-catalog.ts`, `shared/sentinel-combat.ts`, `shared/tactical-infiltration.ts`, `shared/drone-balance.ts`, `shared/infiltration-bases.ts`, `shared/player-combat.ts`.

Sentinel retains its current eligible target, otherwise chooses nearest then stable ID. Walls are excluded from its line-of-sight blockers; other buildings remain blockers. The tower's own asset is excluded. Losing all eligible targets or acquiring a different target resets Target Lock; the last-shot cooldown is retained. A destroyed tower stops attacking immediately through `o.hacked`. Sequence against one fresh target: 18,20,22,24,26,28,30,30… . Thus exactly three hits kill a 60 HP Pulsewheel. A fresh uninterrupted lock requires 13 hits for a 320 HP Breacher (12 hits total 318). This is hit-count arithmetic, not a measured field survival claim.

Drones retain a valid existing target before nearest visible alternatives. Aerial sight bypasses building/wall line-of-sight, and aerial pursuit uses open-air navigation. Patrol range is 6 around the assigned guard center, with inward waypoint fallbacks; retained pursuit also checks a home leash of route extent plus 15.3. Drones use their own HP and remain present after Drone Station destruction: the combat loop does not couple an existing defender's lifetime to station HP. Base 24 damage requires three hits against Pulsewheel and fourteen against Breacher. Pulsewheel requires eighteen unmodified 9-damage hits to disable a 160 HP drone.

Owned construction constraints: Sentinel costs 300 Compute, takes 90 s, requires HQ2, maximum one; Drone Station costs 200, takes 60 s, maximum one; HQ1 yields one drone, HQ2 two. Walls cost 10 Compute and both current HQ levels allow 100 tiles. These are construction rules, not defensive HP levels. Sources: `shared/security-catalog.ts`, `shared/cybersecurity.ts`, `shared/founder-hq.ts`, `shared/security.ts`.

## Research actually applied

| Research | Levels | Actual effect |
|---|---|---|
| Pulsewheel Engineering | 0–3 | ×1.0/1.1/1.2/1.3 on Pulsewheel drone damage, PvP building damage and wall work; not NPC building work, not Breacher damage |
| Bot Training Efficiency | 0–3 | Pulsewheel 10/9/8/7 s; Breacher 30/27/24/21 s |
| GPU Optimization | 0–3 | Compute production 10/11/12/13 per minute; no direct combat effect |

Upgrade Research costs are 50/125/250; durations are 5/10/15 minutes. No troop HP, speed, range, Sentinel, drone or wall combat research exists in the current catalog. Pulsewheel multiplier is captured on owned operation start. Sources: `shared/technology.ts`, `shared/infiltration-army.ts`.

## Actual current handcrafted mission snapshots

Constructed through `newSquadOperation`, including its post-processing (rather than reading the raw layout alone):

| Mission | Hackable structures | Drones | Sentinel Towers | Wall segments | Compute / Research / Influence reward catalog |
|---|---:|---:|---:|---:|---|
| Lumen Labs | 4 | 1 | 0 | 27 | 30 / 20 / 25 |
| Vector Works | 4 | 2 | 0 | 37 | 50 / 32 / 40 |
| Prism Systems | 6 | 2 | 1 | 48 | 65 / 44 / 55 |
| Orbit Research | 6 | 3 | 1 | 69 | 80 / 56 / 70 |
| Apex Compute | 8 | 2 | 2 | 81 | 100 / 70 / 90 |

All current missions use tactical rules with balance version 2 and aerial drones. Reward allocation is distributed among the raw accessible objectives before HQ access is added; the HQ is an objective but has zero resource reward. NPC Sentinel timing is intentionally slower than owned PvP timing. Sources: `shared/infiltration-bases.ts`, `shared/squad-infiltration.ts`.

## Navigation, targeting, tick order and termination

- Fixed 100 ms ticks, 180 s duration starting on first deployment. Agent path clearance is 0.65 for **both** troop types, drone clearance 1.15. Breacher's larger rendered silhouette does not enlarge its physical navigation clearance.
- Planning occurs every 500 ms plus immediate invalidation/retarget events. Breacher sorts Sentinel and Drone Station assets ahead of other structures, then distance to access and stable ID. Existing valid targets are retained, so preference is not an unconditional mid-attack override. Breacher never selects drones.
- Pulsewheel can switch to a drone that is attacking, or closer than the current objective's distance threshold; acquisition 6.4, target lock 900 ms, retarget ratio 0.7. Unreachable drone routes retry after 2 seconds.
- Building approaches consider twelve footprint-edge candidates, stand-off 0.85, occupied-slot separation >0.7, and clear wall sight. The planner first accepts any reachable best approach; only if none exists does it evaluate wall breaching. Thus a long valid approach route can bypass the later detour threshold. Fallback breach threshold is direct distance plus 6, with nearest obstructing wall candidates.
- The fallback path block computes a valid route but does not assign it if approach selection failed and no breach was selected; this deserves regression coverage for packed/edge-constrained bases, not a speculative balance-stat fix.
- Breacher validates footprint distance <=1.3 and clear wall ray before building strikes; walls have analogous melee checks. Ordinary Pulsewheel building work uses approach arrival, not its drone weapon range.
- PvP hacked building footprints disappear from navigation/line-of-sight via `squadTarget`; NPC hacked buildings stay solid. Breached walls disappear in both.
- Per tick: attackers move/strike; building destruction/retarget resolves; if all objectives are hacked, extraction completes immediately; otherwise drones act, then Sentinels, then all-dead detection. Simultaneous end-of-battle damage therefore favors objective completion over a later defensive hit within that same tick. This ordering is deterministic and authoritative.
- Battle ends extracted when every accessible hackable structure is hacked, even with live drones remaining. Otherwise all deployed units dead and no undeployed troops ends caught; timeout ends at 180 s. Surviving units are marked extracted on any terminal status, then returned by ownership settlement; lost troops are not returned. Non-extracted terminal statuses clear carried resource loot. Undeployed troops remain in inventory.
- Breach Tokens are independent of status: HQ hacked, at least half structures hacked, and all structures hacked. Walls/drones/scenery are excluded from the denominator. Server reward success uses at least one token for current rated missions/PvP. Consequently a timeout/abandon can still qualify for Influence while non-extracted carried resource loot has been cleared.
- PvP awards +25 with a five-minute per-opponent reward cooldown; zero-token deployed attacks lose up to 10 Influence without going negative. NPC Influence instead uses a two-hour per-mission cooldown; its resource loot is not blocked by that Influence cooldown. No player resource stealing. Existing settlement receipt/idempotency paths must remain intact.

Sources: `shared/tactical-infiltration.ts`, `shared/attack-positions.ts`, `shared/navigation.ts`, `shared/infiltration.ts`, `shared/squad-infiltration.ts`, `shared/infiltration-army.ts`, `shared/breach-rating.ts`, `shared/player-combat.ts`, `server/infiltration.ts`, `server/player-world.ts`.

## Tuning hazards to address explicitly before modifying values

1. **Duplicate stat sources:** `TROOPS.pulsewheel` is UI/catalog-facing, while actual tactical Pulsewheel damage/HP/range come from `TACTICAL_BALANCE`; speed comes from `INFILTRATION.agentSpeed`. Breacher uses `TROOPS.breacher` directly. Editing only the troop catalog can produce misleading UI without matching combat.
2. **NPC/PvP divergence:** current nominal DPS cannot predict NPC Pulsewheel building destruction. Engineering and mixed-force composition behave differently across these modes.
3. **Durability coupling:** adjusting tactical bot damage implicitly changes new PvP structure HP and NPC Breacher equivalent durability on non-Sentinel targets. Decouple or deliberately document before tuning.
4. **Legacy operation behavior:** `balanceVersion:2` selects current tactical constants; other snapshots select legacy drone HP100, damage22, interval1250 ms, warmup650 ms, detection6.8. Legacy non-tactical squad constants (42 HP, 18 laser damage/750 ms, three hackers, 2.5 work multiplier) are a separate path. Do not globally rewrite saved operations under the assumption all use the latest rules.
5. **Snapshot protection is partial:** tower configs and layouts are captured, but tactical version2 constants and Breacher catalog values are still read live by old active operations of that version. A constant change affects those in-progress simulations unless a new balance version or snapshot is introduced.
6. **Defense-first alone is insufficient anti-air counterplay:** Breacher cannot hit aircraft and killing their station does not disable them; all-structure victory can still end before those drones are killed. Evaluate mixed armies and all-heavy armies rather than assuming either is intrinsically safe/broken.
7. **Economy comparisons need housing and sequential time:** four Breachers cost160 and120 s base queue; twenty Pulsewheels cost100 and200 s. Heavy HP/housing is only 6.7% greater, despite individual tankiness being 5.33×. Resource, queue, target priority, NPC contribution curves and attrition all matter.
8. **Visual overlap is not collision:** increased Breacher armor width can overlap adjacent units at existing 0.7 attack-slot separation. Changing movement clearance to solve visual overlap would alter wall traversal and balance, so separate presentation decisions from rules.

No tuning was performed in this baseline stage. Mathematical examples above are analytic, not measured win-rate results.
