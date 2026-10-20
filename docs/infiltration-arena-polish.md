# Infiltration arena polish

Local branch: codex/infiltration-arena-polish.

New missions capture a campus-v2 arena in their saved target snapshot. The playable arena grows from 28 x 20 to 42 x 34 units; compound building and wall centers are spread 20% farther apart. Building models, footprints, unit stats, rewards, mission duration and production remain unchanged. Older active mission snapshots retain their existing bounds and geometry.

A continuous outer deployment lawn replaces tiny placement tiles. Server validation still checks finite coordinates, clearance and a reachable extraction route. Raw fractional ground taps are accepted. Roads, retaining curbs, sidewalks, varied neighboring properties, traffic and a farther city block replace the fog boundary. No infiltration fog, cloud mesh or gradient mask remains.

Cipher Bot now has an angular cowl, split cyan visor, swept side fins, tapered chassis, wrist terminal and twin data cartridges. Existing distance-driven feet, movement, hacking and wall-breach animation use the same rig and gameplay clearance. The unit icon matches the model.

Original three-voice Web Audio cues cover accepted deployment, ongoing hacking and drone fire. Hacking repeats only while live server state has an active hacker; timers are cleared when hacking stops, the mission changes or the view unmounts. Mute, autoplay, hidden-page and testAudio silence guards apply. Laser beams are twice as thick, stay visible 350ms and include muzzle/impact flashes. No external audio assets or licenses are required.

## Validation

- npm test: 370 passed, zero failures.
- npm run build: passed; existing large-chunk advisory remains.
- npm run test:production: passed against isolated temporary data, including process-restart persistence and duplicate purchase rejection.
- Chrome and WebKit at 390x844, 844x390 and 1440x900: broad touch/mouse placement, rejected central placement, multiple agents, refresh persistence and confirmed retreat without extra rewards or troop refunds.
- Full real-time Lumen mission: laser and hacking observed; walls breached; final 30 Compute, 20 Research, 25 Influence and seven returned surviving bots matched authoritative settlement.
- Legacy snapshot replay tests remain, plus new arena reachability/fractional deployment/deterministic offline settlement tests.
- Original cue voice limits, rate limits, mute, hidden-page and development silence tests pass.
- Rendering uses shared static batches, bounded four/eight-vehicle traffic, no volumetric effects and a capped DPR/pixel budget. Representative one-agent browser capture was approximately 351 draw calls / 159k triangles before extra decorative planters. Browser checks do not establish physical-iPhone frame rate, temperature, PWA audio or Safari performance.
- All agent-created browser contexts were closed. No production company, volume or database was modified.

## Local review

Run `node --import tsx scripts/preview-arena.ts` after building. Local isolated SQLite: data/arena-preview.sqlite; port 3060. Open `/simple-preview/lumen?tutorial=done&testAudio=off` or `/simple-preview/vector?tutorial=done&testAudio=off`. Each fixture route makes a separate test company; it never loads a production save.

Screenshots and recorded mission are under ignored data/arena-media/. No push or deployment has been performed for this update.
