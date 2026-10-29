# Infiltration Ranks — October 28, 2026

## Architecture and data safety

The existing `player-world` flow owns PvP operations, authoritative Breach Tokens, Influence cooldowns, replay recording and settlement. Foundation commands already serialize save changes with SQLite `BEGIN IMMEDIATE`. Rating joins that same transaction; it does not implement a second combat engine.

Rating is separate from Influence, Company Level and Founder HQ Level. Existing accounts receive zero through an idempotent additive table initialization. New accounts read zero until a scored event. No historical results are estimated. A verified SQLite backup is required before production migration. Saved buildings, troop inventory, resources, Catalysts and research are unchanged.

`shared/ranking.ts` centralizes thresholds, scoring and the six-hour restriction. `company_infiltration_ratings`, `pvp_rating_cooldowns` and `pvp_rating_events` hold authoritative totals, pair eligibility and an auditable battle-ID receipt. Rank is derived from rating. No client write endpoint exists for rating.

| League | Rating |
|---|---:|
| Prototype | 0–99 |
| Circuit | 100–249 |
| Alloy | 250–499 |
| Prism | 500–899 |
| Quantum | 900–1,399 |
| Singularity | 1,400–2,199 |
| Ascendant | 2,200+ |

Eligible PvP results with 0/1/2/3 authoritative Breach Tokens change rating by −12/+8/+18/+30, clamped at zero. One completed eligible battle against each opponent can change rating per rolling six hours, including losses. Defender rating never changes. Missions and replays cannot award rating. Ready-state cancellation does not consume eligibility; surrender after deployment is settled normally. Existing disconnected-battle advancement runs on subsequent server requests; closing the browser cannot cancel an active battle's outcome.

Scouting discloses rating eligibility. Starting rejects stale eligibility rather than silently changing the advertised rules. One operation per attacker, transaction serialization, and unique battle receipts prevent duplicate or overlapping awards. A thrown settlement error rolls back rating, cooldown and save changes together. Influence remains independently governed by its existing rules.

The separate rating leaderboard orders rating descending, then stable company ID. Opponent discovery adds a soft comparable-HQ/rating preference only for sufficiently large pools, with fallback for small populations. No rank-based combat bonuses or paid rating exist.

## Implemented presentation

Seven transparent 384×384 PNGs in `public/ranks/` faithfully follow the approved bronze, silver, gold, cyan, violet, dark-alloy and white-gold designs. Combined size: 373,609 bytes. HUD uses static badges; expanded displays and promotion use restrained CSS with reduced-motion support. Exact generation prompts are in `rank-badge-provenance.json`.

The compact dark HUD replaces the trophy shortcut. The rank dialog includes current badge, exact rating, amber progress, next requirement, seven selectable badges and leaderboard access. Ascendant has no fictitious next-rank progress. Profiles, scouting, battle history and a separate leaderboard tab display rating without replacing Influence. Actual results retain Breach Token symbols and resource/Influence rewards, adding green/red rating feedback. Promotion sound follows existing mute controls and is deduplicated by battle ID.

## Verification

- Full automated suite: **831 passed, zero failed**.
- TypeScript and production build passed; existing large-chunk advisory remains.
- Production startup/persistence smoke passed.
- Tests cover all boundaries, zero floor, migration/reopen, exact-once concurrent settlement, six-hour pair cooldown, stale-scout rejection, ready cancellation, started surrender, rollback after injected database failure, missions excluded, profile/history/leaderboard and identity recovery regression coverage.
- Actual application browser review passed at 1440×900 and 390×844 with no page errors. HUD, all badges, rank detail, leaderboard and profiles were exercised.
- Actual authoritative synthetic PvP produced three tokens, +30 and Alloy499 → Prism529; surrender produced −12 and Circuit100 → Prototype88. Both results were rendered on desktop and mobile. These are isolated review accounts, not live players.
- Actual badge assets reviewed at 192/64/40/24 pixels; alpha verified for all seven.
- All browser contexts closed; testAudio=off preserved production audio preferences.

Review: `output/Ranking_Review/index.html`. Reproduce with `node --import tsx scripts/review-ranking.ts` (isolated in-memory database).

## Initial progression observations

Applying the configured rule to 100 eligible results from zero:

| Repeating token sequence | Final rating | League |
|---|---:|---|
| 0 | 0 | Prototype |
| 0, 1 | 8 | Prototype |
| 0, 1, 2, 3 | 1,112 | Quantum |
| 0, 2, 3, 3 | 1,662 | Singularity |
| 3 | 3,000 | Ascendant |

These are deterministic score-sequence checks, not evidence of human win rates. Seventy-four eligible perfect victories reach Ascendant from zero. The same opponent cannot supply these in rapid succession. Monitor real-player distribution, opponent availability and alternate-account collusion after launch; the six-hour restriction prevents immediate pair farming but is not an identity-verification system. Physical iPhone performance and human competitive balance were not tested.

## Deployment

Release checks complete; deployment confirmation recorded after Railway activation.
