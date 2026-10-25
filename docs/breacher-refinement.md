# Breacher visual and training refinement

- Fabricator uses compact troop cards, accessible health/damage/housing/time/Compute icons, one housing row and prominent 44px training actions. Both actions fit at 375×667, 390×844, 430×932 and desktop in all 21 tested states. Small screens and enlarged text retain scrolling.
- Breacher native height is 1.98× Pulsewheel (previously 1.55×). Grounded model, larger combat ring, raised health anchor and lower wall-punch pose preserve the same simulation positions and statistics.
- Typed training completion creates a presentation-only friendly transfer, activating outside the Fabricator and walking slowly through a wider gate-preferring route to the Hangar. Existing friendly-wall fallback remains. Arrival detection ignores initial/reloaded inventory, returns and catch-up. Pulsewheel completion detection no longer mistakes a completed Breacher queue entry for its own.
- Four heavy Hangar residents occupy separate open-floor lanes and alternate rest with short walks. Compound Hangars retain full relative scale; legacy compact Hangars use reduced visual staging to fit without changing their logical footprint. Shared materials/geometries are retained; routing runs on arrivals, not each frame.
- No troop stats, costs, durations, housing, targeting, rewards, server logic or account data changed.

## Validation

595 tests passed and production build passed, with the existing large-bundle warning. Desktop and phone UI checks cover selecting both troops, ready/queued/full housing, Train, Train Maximum, reload and completed inventory. Rendering captures verify transfer walking→docked counts, four reloaded residents without duplicate transfers, model scale, ground alignment, wall and Sentinel attacks. All previews use isolated data and testAudio=off; contexts and servers close afterward.

Visual review: output/Breacher_Refinement/index.html, with before/after screens and movement clips. Reusable capture scripts are scripts/review-breacher-refinement-ui.ts, scripts/review-breacher-refinement-model.mjs, scripts/review-breacher-refinement-combat.mjs and scripts/review-breacher-hq.mjs.

Physical iPhone performance has not been measured. No new FPS improvement is claimed. Heavy units may briefly touch shoulders when converging on existing combat attack positions; no expensive crowd avoidance or gameplay collision changes were introduced.
