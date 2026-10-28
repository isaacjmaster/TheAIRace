# Wall replacement reliability and Ava likeness

## Verified causes and fixes

The layout editor disabled saving until every owned item was placed. The server also required the full inventory and cleared all replacements at once. Reopening a pending replacement generated only the stored inventory, losing the placed-wall portion of the editor view. The replacement action was restricted to Move mode. The editor omitted the current building-level visual synchronization.

Replacement layouts now require all buildings/decorations but allow partial wall placement. Saved walls plus pending inventory retain the exact original IDs and levels. Saving 60 of 100 leaves 60 placed and 40 owned in inventory; the next session starts from that saved state. No migration is replayed, and no existing player layout or entitlement is reset.

The own-campus Replace Walls action includes the remaining count and is available directly as well as in Move mode. Build distinguishes owned, placed, and to replace. Rapid Place advances one cardinal tile, retaining the selected level; manual placement establishes direction and blocked tiles stop placement. Drafts persist locally by company and generation, with a fingerprint check before recovery. Cancel confirms discard. Server errors remain visible, failed requests retain the draft, and unresolved requests freeze edits until retried.

The authoritative transaction validates ownership, duplication, collision, bounds and stale fingerprints before applying anything. Existing request receipts make network retries idempotent. A forced database-write failure test verifies that both layout and receipt roll back together.

Pending migrations no longer grant an indefinite PvP shield. The backed-up pre-migration defense is used until the first nonempty replacement save, then the saved defense becomes active while unused walls remain owned. Accounts without a usable snapshot have a bounded 24-hour fallback from the original migration time. Ordinary PvP rewards/progression are unchanged.

## Ava

Welcome, thinking, encouraging and tablet poses use one consistent redesigned master: cream armor, navy joints, cyan face/rings and modest, balanced proportions matching the supplied reference. Four transparent WebP files are 77–93 KB each. The existing 640 × 960 canvas, head alignment and foot baseline are retained. Versioned asset URLs avoid stale image caches.

No Ava CSS, containers, transforms, dialogue copy, tutorial triggers or timing changed. Twelve actual before/after captures at 390 × 844, 375 × 667 and 1440 × 900 have identical character/dialogue boxes and computed presentation styles. The stance and body silhouette intentionally change within that fixed frame.

## Validation

- Full automated suite: 792 passed, zero failures.
- Production build and isolated production startup/persistence smoke passed. Existing bundle-size advisory remains.
- Desktop and 390 × 844 wall workflows: 100 actual Place clicks each, including 80 automatic advances, exact adjacent coordinates, save 60/retain 40, reload/recovery, cancel/keep, injected failed-save retry and final 100-wall completion. Exact IDs and levels 1–5 preserved; no browser errors or horizontal overflow.
- Seven focused server scenarios cover partial/full conservation, invalid/stale requests, HTTP idempotency, PvP snapshot transition, rollback and 306-position parity with ordinary wall clearance.
- Ava browser flow: delayed images, reduced motion, username, Continue, Builder Station/GPU construction, pose changes, collection, completion/reload and skip/reload.
- Four backup tests: verified copy, repeat safety, missing-copy replacement and fail-closed corruption/storage errors.

Review: `output/Wall_Ava/review.html`. Recorded wall checks: `output/WallReliability/checks.json`. Ava measurements and flow results: `output/Wall_Ava/`.

Tests use isolated saves and silent URLs, not production accounts. Phone tests are viewport emulation, not physical iPhone testing. The legacy tutorial fixture's migration notice needed keyboard acknowledgment because it overlapped the tutorial; this does not change the artwork or production tutorial code. Local draft recovery is device-local and cannot restore an unsaved draft from another device or after browser storage is cleared.

## Release safeguard

Production startup creates and verifies a one-time pre-wall-reliability SQLite backup on the existing persistent volume before exposing routes. This adds backup files only; it does not reset or migrate player rows. Deployment follows the existing Railway deploy branch and is verified separately in Railway and through the public health/assets endpoints.
