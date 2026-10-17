# Influence & Global Top 5 V1

Implemented locally on `codex/ai-race-integrated`; not pushed or deployed.

## Policy and authority

`shared/influence.ts` centrally defines First Contact = 25, Stronger Network = 50,
and independent two-hour cooldowns per permanent company ID and layout.
Compute rewards, troops, training, construction, and combat balance are unchanged.
Players can attack while cooling down. Victories during cooldown show +0 Influence.
Losses, retreats, and idle abandoned battles do not start/reset cooldowns.

Only new battles registered by the authenticated server start action qualify.
The existing server-run fixed-step simulation determines victory; no result flag,
Influence amount, or device timestamp is accepted from the client. Completed
objectives, company binding, map, and combat version are checked at settlement.
Historical and already-running pre-update battles are not backfilled.

Victory time is the authoritative simulation completion time (server deployment
clock plus simulation steps), including offline continuation. The cooldown begins
at that completion time, not when the player eventually reopens the app.
The UI countdown anchors server time to `performance.now()`, so changing the
browser wall clock does not make a raid eligible. The server always decides awards.

## Persistence and concurrency

Additive, transactional CREATE TABLE IF NOT EXISTS migration after existing identity
migration; no rewrite of legacy save JSON or credentials:

- `company_influence`: permanent company ID primary key, accumulated total.
- `influence_cooldowns`: company ID + layout primary key, next eligible server time.
- `influence_battles`: unique server-created battle ID, owner, map, registration and
  settlement timestamps, awarded amount, and cooldown receipt.

Missing totals/cooldowns read as zero. Recovery restores the same permanent ID,
so ranking and cooldowns follow the original company. Reset Progress resets game
progress only; it does not clear earned competitive totals or bypass cooldowns.
No historical Compute rewards are converted into Influence.

GET save refreshes and progression mutations hold BEGIN IMMEDIATE through combat
advancement, score receipt, total/cooldown updates, and save writes. A new raid
settles the previous one before replacing it. A repeated battle receipt cannot
award again, even after the cooldown expires. A simulated SQL failure test verifies
rollback of Compute, Influence, cooldown, receipt, and battle state together.

Leaderboard returns only rank, public company name, Influence, and current-company
highlight; no IDs, credentials, session tokens, recovery verifiers, or private saves.
Named companies (including real zero-score companies) sort by Influence descending,
then normalized unique company name ascending. Unnamed companies keep earned points
but appear in rankings only after choosing a name. There is no production seed data.
The authenticated rankings endpoint uses no-store caching and a 10-second UI poll.

## UI

Original three-medal SVG button below Builders, 52px touch target. The foreground
gold medal paints after the complete rear medals, including their numbers. The
ranking dialog uses a wider, compact layout with safe-area margins and five flatter
rows. Its banner reuses the existing AI Race app icon and title. An original gold
broadcast-star/network emblem appears beside every Influence score, including the
own-rank footer. Top-three medals and current-company highlights are retained.
Attack cards show reward availability/countdowns; victory results show actual awards.

## Local testing

```
npm test
npm run build
npm run test:production
node --import tsx scripts/preview-influence.ts
```

Preview binds 0.0.0.0:3017, uses ignored `data/influence-preview.sqlite`, its own
`airace_influence_preview_session` cookie, and no legacy import paths.
Open http://192.168.1.40:3017/ on the same Wi-Fi. This is a separate test company,
not production or the existing 3015 local save. Start a company, name it, train bots,
and win a raid. Check the medals menu, cooldown after refresh, independent second
raid reward, and +0 result for another victory during cooldown. Local rankings
contain only companies actually created in this isolated database.

A verified SQLite backup of the earlier identity-preview database was made before
editing, using SQLite backup and integrity/row comparisons. No production database,
Railway settings, deployment branch, or unrelated worktree was changed.

## Verification

202 automated tests passed (11 new Influence cases), production build and startup /
restart smoke passed. Isolated browser QA used touch input and silent audio, closed
all contexts/browsers/servers in finally, and removed its disposable database.
Screenshots show isolated QA companies, not invented production leaderboard entries.
Chromium emulation checked 320x568, 375x667, 390x844, 430x932, desktop 1280x800,
Safari-like height changes, overlay bounds, ties, self highlight, availability while
cooling down, device-clock changes, and +0 / +50 result messages.

Physical iPhone Safari and installed HTTPS PWA testing remains pending. Existing
viewport, manifest, splash, Ava, audio, and fullscreen implementation were not changed.
Local HTTP is suitable for Safari layout review, not proof of installed HTTPS PWA behavior.
The system enforces per-company scoring; preventing multiple human-owned companies
or automated play is outside this V1 scope.
