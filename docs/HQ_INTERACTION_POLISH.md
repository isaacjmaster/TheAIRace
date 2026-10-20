# HQ interaction cleanup — 20 October 2026

## Changes

- GPU Rig collection uses only the existing blue chip, a transparent 48-pixel tap target and a restrained four-pixel float (disabled for reduced motion). Accessible labels still identify the rig and available amount, but no amount, card, border or FULL label is drawn. Research collection is unchanged. Existing per-frame projection follows camera, zoom and moved building coordinates; each rig keeps a separate indicator.
- Dismissing Ava during construction/first-production waits now renders nothing, rather than a replacement reminder card. Actual server-reported stored Compute of at least one reopens her short collection instruction and the projected GPU Rig arrow. The Explore timer changes presentation only; real collection still advances the persisted tutorial. Skip remains in visible dialogue. Reloading with Compute ready shows the collection instruction even if the previous waiting message was dismissed.
- Clearing reserves the builder only through `clearedAt`, not the later `completesAt` return-arrival timestamp. Timestamp-derived HUD availability uses the same active-job criteria between server polls. Every new request still advances/validates state in the existing atomic server transaction. A completed obstacle pays once before another assignment can replace its cosmetic travel record.
- A new clearing assignment can start from the previous return journey's current route position. New jobs optionally save a `returnRoute` to the station; old jobs retain their original route and deadlines. Rendered clearing/construction handoffs route from the currently visible bot, never reset it to the station, and use existing obstacle/wall-aware navigation. No client-supplied position or completion time is trusted.
- Trees, boulders and scrap now all use **15 seconds of clearing work**, plus existing travel. Rewards, spawning and building timers are unchanged. Already-active jobs, including old 30-second scrap jobs, keep their saved timestamps.
- Normal HQ used the shared sky-colored distance fog, which tinted distant upper-screen streets/terrain cyan. The gameplay HQ now opts out of that fog. Sunlight, warm materials, shadows, district geometry and continuous ground remain. Home screen, infiltration renderer and separate new-company cloud cinematic are untouched.

## Compatibility

No SQL migration or account rewrite. `returnRoute` is an optional field in existing clearing-job JSON, with old-route fallback. Permanent IDs, recovery credentials, currencies, progression, buildings, training and security remain intact. The approved original soundtrack commits remain included in this branch.

## Verification

- Full suite: **395 tests passed, zero failed**; production build passed with the existing large-chunk warning.
- Disposable-database production smoke passed: startup/health/assets, cookies, persistence through restart and duplicate purchase rejection.
- Tests cover exact 15-second work, existing 30-second deadlines, immediate availability, clearing-to-clearing and clearing-to-construction handoff, duplicate assignment rejection, exactly-once rewards, and two simultaneous tabs racing for a just-freed builder (one succeeds, one is rejected).
- Render-level test confirms a returning builder keeps its current world position when taking a construction assignment and follows a valid route on the next frame.
- Silent Chrome and Windows WebKit: **390×844, 844×390, 1440×900**. Verified icon-only styling, collection, projection while panning/zooming, fog disabled, Ava fully hidden without a reminder, reappearance at actual readiness, projected arrow movement, refresh restoration, collection advancement and skip.
- Actual isolated HQ demonstration: two independently collectible rigs; a builder finishes one job, becomes available before arriving home, and accepts another job during the return. Sampled world positions confirm no station teleport. Screenshots and motion evidence are under ignored `data/hq-polish-media`.
- No physical iPhone or installed PWA was tested; these are browser viewport/WebKit checks. All previews were silent via `testAudio=off`, used isolated databases and closed their browser contexts in `finally`.

## Local review

`npm run build`, then `node --import tsx scripts/preview-hq-polish.ts`. Port **3064**, database `data/hq-polish-preview.sqlite`, cookie `airace_hq_polish`; production data is never used. On an iPhone on the same Wi-Fi, open `http://192.168.1.40:3064/` while this computer/server remains running. This separate test save includes the approved music by default. Agent-driven previews must append `?testAudio=off`.

Fixture routes `/simple-preview/hq`, `/simple-preview/wait`, `/simple-preview/ready`, `/simple-preview/fresh` create isolated test companies and always redirect with `testAudio=off`; `hq?two=true` supplies two completed rigs. These local-only fixture endpoints never ship in the production server.

For repeatable browser checks, run `node --import tsx scripts/verify-hq-polish.ts` and `node --import tsx scripts/verify-hq-builder.ts` with Playwright/browser binaries available in the development environment. `PLAYWRIGHT_REQUIRE_BASE` can point at the package file of a bundled runtime providing Playwright. `HQ_POLISH_URL` changes the local preview origin. Generated evidence stays outside the shipped build.
