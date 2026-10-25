# Combat presentation update

Weapon presentation consumes existing shot timestamps, target positions, work progress, health and shutdown events. It never applies damage or changes a battle result. Pulsewheel uses cyan digital bolts from its existing facial emitter; drones use faster blue-white darts from the underside emitter; Sentinel keeps its elevated green trajectory with stronger recoil and energy proportional to the actual captured Target Lock damage bonus.

The projectile pool contains 20 Pulsewheel and 12 drone slots, each with five instanced impact fragments. Each tower retains one reusable pulse. There are no additional dynamic lights or destruction physics. Localized building hit feedback isolates at most three illuminated materials per structure. Existing type-specific shutdowns remain, including disabled materials, Sentinel droop and GPU fan coast-down. Timers and retargeting are independent of effect completion.

Original procedural sound buffers distinguish charging, firing, impacts, robotic failure and system shutdown. Buffers are cached, simultaneous combat sources are capped at 12, repeated cues are rate-limited and shutdown sounds can replace the oldest voice. Mute, backgrounding and disposal stop active sources; test previews remain silent without changing player preferences. Health values update immediately; the pale trailing strip indicates recently lost HP only.

Replace Walls is now an action inside the own-campus arrangement toolbar. It requires a pending, acknowledged entitlement and a ready, unobstructed base-management view. It is absent during loading, unrelated menus, missions, PvP, scouting, visits and replays. The layout editor displays remaining unplaced replacement walls. Existing atomic save, cancellation and saved entitlements are unchanged.

## Verification artifacts

`output/Combat_Presentation_Review` contains before/after clips, screenshots, raw performance samples, wall UI checks and an offline sound reel. Measurements use a local headless Edge renderer harness with fixed simulation ticks, five handcrafted missions and an isolated player-base fixture. They exclude network latency and React HUD work. Mobile captures emulate a 390×844 touch viewport; no physical iPhone FPS claim is made.

Automated previews always use `testAudio=off`, isolated save data, and closed browser contexts. Production account records are not modified by verification.

## Measured results

565 automated tests pass, including audio voice limits/mute cleanup, shot retargeting, bounded effects, wall UI contexts and navigation invalidation; production build passes with the existing bundle-size advisory.

Five-mission browser results were essentially unchanged at the host's approximately 75 FPS pacing limit. Mean draw calls increased by about 1.5. Small CPU differences between runs are noise, not a claimed rendering speedup.

The enclosed player-base fixture exposed repeated exhaustive failed path searches. The existing bounded, geometry-keyed navigation cache now also retains fully explored disconnected components. Successful A* order is unchanged; wall breaches or clearance changes invalidate cached connectivity. Pure Node simulation took 47,531 ms before and 641 ms after, with worst tick 2,044 ms before and 106 ms after. Complete state hashes at every 100 ms tick matched baseline for that fixture and all five missions. Browser midbattle worst frame fell from 4,869 ms to 14.9 ms desktop and 4,962 ms to 16.3 ms mobile viewport in the sampled scenario. This is not a universal FPS guarantee: cold route searches can still hitch, and no physical iPhone was measured.

The reproducible comparison entry point is `scripts/check-combat-equivalence.ts`; pass `before` and the frozen baseline source directory, or `after`. Raw results and hashes are included in the visual review folder.
