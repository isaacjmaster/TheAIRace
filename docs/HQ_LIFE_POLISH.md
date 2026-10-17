# HQ life and feedback polish

Local-only update; checkpoint `checkpoint/pre-hq-life-polish`. No push, Railway deployment, production database access, save migration, or unrelated project changes.

## Presentation changes

- Hangar retains its existing footprint and clean canopy. Added rear charging rails, a small docking console and restrained status lights. Ten named docking bays hold stable reusable bot models instead of rebuilding all geometry on every count update.
- An observed server-confirmed training completion produces a small walking Scrap Bot at the Fabricator platform. It exits, follows a lightweight grid route around building footprints/trees/rocks, and docks into its destination bay. Multiple completions are staggered by 0.35s; walking speed is 3.2 world units/s. The corresponding docked model appears on arrival. Movement/rotation rebuilds clear cosmetic journeys safely.
- Stored bots have tiny bay-local bobs (0.014 units), shifts (0.035 units), gentle turns and occasional arm movement. They never wander into neighbouring bays.
- GPU fan blades now belong to three proper rotor groups. They rotate while producing, with a quiet cyan activity pulse. Storage-full and construction states use slow idle fans and dim light. Reduced-motion mode keeps fan and bot motion still.
- Founder HQ, GPU Rig, Bot Fabricator, Bot Hangar and Builder Station each have a distinct short original synthesized interaction cue. HQ uses a soft two-note chime; GPU a quick electronic pattern; Fabricator a low mechanical pattern; Hangar a docking sequence; Station a small tool-like chirp. All reuse the existing zero-tail voice envelopes, master gain, gesture unlock, mute preference and automated-preview suppression. No borrowed recordings, external audio calls, or soundtrack changes.

## Integrity and edge cases

Everything is presentation-only. The server still completes training at its original time, charges the same costs, and makes the trained army available immediately. Walking does not introduce a second inventory, delay troop availability, mutate saves, or gate Attack. The Hangar's visual occupancy catches up as the walk finishes; existing panel counts remain authoritative throughout. New bots are never counted twice.

First load, scene recreation and offline/background catch-up populate already-trained bots directly. Repeated polls do not replay arrivals; returned raid reserves do not masquerade as newly trained bots. Reset generations, count decreases, moved buildings and scene disposal discard cosmetic walks safely. If a doorway is obstructed or no presentation route is found, the bot settles directly instead of crossing through another structure. Reduced-motion users also receive immediate visual docking. This fallback affects no saved resources or bots.

Geometry/materials are cached through WorldKit; arrival meshes share them and are removed on completion. Active and stored bots together stay within the ten-slot Hangar. Scene disposal removes the visibility listener, walkers and GPU resources. No new continuous sound, server timer, API endpoint or persistent field is added.

## Verification

186 automated tests passed. TypeScript/Vite production build and isolated production startup/restart persistence smoke passed. Targeted checks cover observed completion vs. repeated polling, multiple completions, refresh/offline/reset handling, all four rotations, obstructed doors, bounded idle motion, fan active/idle/reduced-motion states, five distinct cue patterns, rate limiting, mute and silent automation.

Silent Chrome touch emulation at 390x844 verified three normally timed training completions: three visible walks, five total bots from two initial bots, exact 15 Compute cost, and no queued work left. Rotated Fabricator/Hangar, refresh during a walk, two further normal training completions, exact seven-bot inventory and 25 total Compute spent also passed. Full GPU storage switched to the calmer visual state. 320x568 and 1280x800 resizing had no horizontal overflow or runtime errors. Real scene clicks selected all five expected buildings and opened their existing labels/panels. Browser contexts and browsers closed in finally blocks, including failures. Automated runs remained silent and did not change audio preferences.

Physical iPhone Safari/PWA playback, perceived sound quality and sustained device performance remain for user review. Source checks confirm no changes to gameplay/shared progression, backend/database/identity/recovery, fullscreen metadata/CSS, Master Studios, or Railway configuration.

## Local review

Preview: http://192.168.1.40:3015/ (desktop http://localhost:3015/). The existing local preview database and cookie namespace are retained. No progress was reset. Pan/zoom toward the Fabricator and Hangar, train a few bots, watch the walk and idle motions, then tap each building with sound enabled. Check the GPU while producing and again when its own storage reaches 25. Reload during training and verify the same inventory and queue. Use your existing local company; no clearing cookies or reinstall is required. Production remains unchanged until approval.
