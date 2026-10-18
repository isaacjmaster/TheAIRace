# Builder onboarding, construction life and Company XP

## Local phone preview

Run `node --import tsx scripts/preview-builder-xp.ts`, then open `http://192.168.1.40:3023/` on the same Wi-Fi. This launcher uses `data/builder-xp-preview.sqlite`, a separate preview cookie, and no legacy database imports. Use Safari Private Browsing for a genuinely fresh simulated company without touching an existing company's cookies or saves. Agent previews append `?testAudio=off`.

1. PLAY, advance Ava, choose or postpone a company name.
2. The company starts with Founder HQ and 0/0 Builders. Ava introduces a free Builder Station before Compute production.
3. Open Build, select Builder Station, drag/tap a valid position, and Confirm. Setup is immediate, costs zero Compute, and grants one builder exactly once.
4. Continue Ava into the GPU Rig lesson. During its unchanged 15-second construction, watch the Builder Bot move to different sides, face the rig, use its tool and produce small flashes. It returns home after completion.
5. Tap the cyan rank emblem to see Company XP. Finish the normal first collection to continue the existing tutorial.
6. Skipping Ava still leaves the free station available in Build. Existing companies retain their station and builder capacity; replay recognizes an owned station.

## XP values

Central definition: `shared/company-xp.ts`.

- Company Level 1: 0 cumulative XP; Level 2: 100 cumulative XP.
- Completed GPU Rig (each slot), Fabricator or Hangar: 10 XP, once per building slot per company lifetime. Reset/rebuild cannot farm construction XP.
- Completed tree or scrap clearing: 3 XP per unique obstacle.
- Verified Level 1 raid victory: 15 XP; Level 2 victory: 25 XP per new real battle.
- Free starter station: no XP, avoiding repeatable free setup rewards.
- XP above 100 is retained. Level 2 is currently the highest newly defined level; the panel indicates future levels are not defined yet.
- XP does not change Founder HQ structure level, unlocks, Compute or Influence. Existing Influence cooldowns remain independent.

## Persistence and migration

Additive tables `company_xp(company_id PRIMARY KEY, total, floor_level)` and `company_xp_receipts(company_id,event,amount,at, PRIMARY KEY(company_id,event))` reference permanent identities. Startup migration records existing completed actions as zero-XP receipts; it preserves existing level as a floor without inventing XP. Pending work remains eligible after migration. Existing save JSON is not rewritten at startup.

Authoritative advancement, Influence verification, XP receipts/totals and save writes share the existing `BEGIN IMMEDIATE` transaction. Failures roll back all of them. Battle XP requires a registered, server-simulated victory; stale receipts, retries, multiple tabs and replayed results cannot pay twice. Recovery restores the same identity and XP. Reset Progress resets the base and tutorial but retains identity-level XP, Influence and anti-replay receipts.

New saves add `starterStation: unplaced` and zero builders. Absence of this field means a pre-existing implicit station, preserving its original position, orientation and builder capacity. First setup writes `starterStation: placed` and `stationLayout` through the existing idempotent action API. Ava adds optional `builderStep`; original numbered tutorial steps and older progress remain compatible.

Safe Git checkpoint: `checkpoint/pre-builder-xp-20261017`. Verified SQLite backups: ignored `data/backups/builder-xp-20261017/`; SQLite backup API and `PRAGMA quick_check` were used. Production data and deployment configuration were untouched.

## Animation and HUD

Construction uses the existing obstacle route finder with rotated building footprints and a wider builder clearance. It chooses reachable side work sites, caches routes until the job/layout changes, pauses for tool work, and follows a safe return route. If no site is reachable, it waits safely rather than crossing solid geometry. Cosmetic travel never delays authoritative completion or owns a job queue. Scrap Bot models, gait, combat and training remain unchanged.

Compute HUD increases from 185px to 235px wide above 900px viewport width, with proportional bar/icon/type changes; existing mobile rules are unchanged. The level emblem is an original cyan/metallic/gold SVG with a reduced-motion-aware promotion glow.

## Verification

- 235 automated tests passed, including fresh/legacy station ownership, concurrent claims, Ava resume/skip, migrations, XP rollback/retry/restart/reset, 100-XP threshold, verified victories, losses, recovery and blocked work positions.
- Production TypeScript/Vite build and isolated production startup/persistence smoke test passed.
- Muted mobile browser flow tested real naming, station placement, reload before confirmation, activation, GPU construction, XP panel and responsive HUD. Recorded traveling/working/returning phases and 20 distinct sampled builder positions.
- Viewports: 320×568, 390×844, 430×932, 900×700, 901×700 and desktop 1440×900. No HUD overlap or page overflow; automated browsers closed after tests.

These are browser-emulation checks, not physical iPhone Safari/PWA proof. On iPhone, check placement touch controls, safe areas, XP panel readability and animation smoothness. Do not reset a real company to test onboarding; use the isolated preview in Private Browsing.

No push or Railway deployment was performed.
