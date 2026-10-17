# Landscape obstacles V1 (local only)

## Preview

Run `npm run build`, then `node --import tsx scripts/preview-obstacles.ts`.
Open http://192.168.1.40:3019/ on the same Wi-Fi (desktop: http://localhost:3019/).
The launcher uses `data/obstacles-preview.sqlite`, a separate cookie, and no legacy imports. Existing previews and production progress are untouched. Agent previews must append `?testAudio=off`.

## Rules

`shared/landscape.ts` centrally configures four starting obstacles (two trees, two scrap piles where space permits), eight maximum, one spawn attempt every three hours, six seconds of work, travel speed eight world units/second, and rewards of two Compute per tree / three per scrap pile. Clearing is free. The existing single builder remains occupied for outbound travel, work, and return.

Initial positions are safety-checked against the player's current base. If occupied, alternative positions are tried. No forced overlaps. Regeneration catches up with at most one obstacle on return after a long absence, then schedules the next attempt three hours later; there are no large catch-up batches. At the cap or without safe space, that attempt is skipped.

A completed task banks its Compute reward atomically. Space available in storage is credited immediately; the remainder is persisted and automatically credited after Compute is spent. A visible message explains saved cleanup Compute. No reward is discarded, and no manual reward-claim endpoint exists.

## Persistence / migration

An optional versioned `landscape` object is added to existing `foundation_saves.state` JSON on the first authenticated transaction. It contains unique epoch/sequence obstacle IDs, obstacle positions/kinds/variants, server spawn timestamp, clearing route/timestamps/settlement flag, last completion, and pending Compute. No SQL columns or identity/recovery tables change. Old save JSON remains untouched until that company's authenticated read. Reset Progress intentionally starts a fresh landscape epoch on the next read.

Clearing uses the existing strict `/api/foundation/bots` command schema, expected company ID, reset generation, transaction, and request UUID receipts. The client cannot submit time, rewards, positions, or completion. Stale obstacle IDs cannot target replacements, even at the same position. Completion and regeneration are lazy server-time advances performed inside the existing SQLite write transaction. Reopening the app resolves work completed while closed.

Spawning respects rotated occupied/reserved footprints, station/building entrances, rocks, lamps, ground fixtures, boundaries, the road, existing obstacles, active builder routes, and tutorial starter plots. A bounded grid search verifies access from the station to every owned building before accepting a spawn. Placement validation rejects obstacles with a Clear-first message; normal placement retains its existing invalid/red preview. While cleanup is active, layout edits wait for the bot to return so its saved route stays valid.

## Physical iPhone checks (not yet verified on device)

1. Open the LAN preview, PLAY, and optionally Skip Tutorial. This is an isolated company, not your production company.
2. Pan/pinch to find a removable tree or scrap pile. Decorative trees outside the fence and permanent rocks do not offer Clear.
3. Tap a tree: confirm the name, reward, and Clear button fit comfortably. Tap empty ground to dismiss; selecting another building/obstacle replaces the panel.
4. Clear: watch the same Builder Bot leave its station, work, then return. Availability should be 0/1 throughout and 1/1 afterward.
5. While busy, attempt another clear/build. Refresh during work, reopen PLAY, and verify completion/reward only once.
6. Repeat for scrap. Check the short sound and particles with sound enabled, then muted.
7. Enter Move mode and try placing a building on an obstacle: it must show the Clear-first reason and disallow Save. Confirm normal panning, placement, rotation, training, and raids still work.
8. Leave for three hours and return: at most one new obstacle appears, with a maximum of eight. Existing structures and roads remain clear.
9. Confirm no new scrolling or safe-area clipping in Safari and your installed PWA. HTTP LAN is sufficient for Safari interaction checks but does not prove HTTPS standalone installation behavior.

## Verification recorded

- 211 automated tests passed, including eight new isolated landscape tests.
- Silent Chromium touch emulation at 390x844; UI resize checks at 320x568, 390x650, 430x932, 1024x768, 1440x900.
- Real UI pointer/touch raycasts selected and cleared a tree and a scrap pile. Correct rewards, return trip, refresh, and maximum population checked.
- Maximum-population sample: 396 draw calls / 39,592 triangles for the empty HQ with eight obstacles (not a physical iPhone frame-rate guarantee).
- Additional regeneration stress check: 100 random isolated company landscapes reached the cap without placement failures.
- Automated contexts/browsers closed in finally; test audio preferences were not modified.
- Physical iPhone Safari/PWA behavior and audible sound quality still require human device testing.
