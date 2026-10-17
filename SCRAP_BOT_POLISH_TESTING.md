# Scrap Bot animation polish

Local isolated preview: `node --import tsx scripts/preview-scrap-polish.ts` (port 3022). This uses its own SQLite file and session cookie, with legacy imports disabled. Production configuration and existing saves are unchanged.

## Review

- Open `http://192.168.1.40:3022/` on the same Wi-Fi. Agent previews must append `?testAudio=off`.
- Open ATTACK: both Level 1 Raid and Level 2 Raid use matching orange cards. Check normal, pressed, disabled and keyboard-focus states.
- With a completed Fabricator and Hangar, train several Scrap Bots. Watch them emerge, follow their route with staggered spacing, approach a bay and settle into idle.
- Pan/zoom to inspect the larger shared robot: cream/gold shell, cyan visor, articulated knees and mechanical feet.
- Refresh during a delivery. The server already owns the completed troop; the refreshed scene shows the correct army without repeating deliveries or charging again.
- Enter either raid and inspect movement, melee attacks and transitions. Combat stats, hitboxes, movement speed and rewards are unchanged.

## Implementation

The shared character rig is scaled by 1.18 visually. Walking phase advances by actual world displacement divided by model scale, rather than elapsed time. Stance feet are anchored in world space; a two-bone leg solver follows the planted position while the body moves. Swing feet lift and land in alternating phases. Body bob and arm counter-swing share that phase. Stopping lowers lifted feet; a settled pose is handed to the existing Hangar representation.

Delivery acceleration, spacing and travel speed are cosmetic. Server training completion, army counts, capacity, costs and saves remain authoritative and unchanged. Refresh/offline catch-up retains existing arrival suppression. Static robot parts share batched geometry; animated joints remain lightweight, with cached math objects.

## Verification

- Development automated suite: 226 passing tests, including world-space foot anchoring, distance-based cadence, stopping/reduced motion, delivery easing and Hangar handoff.
- Production TypeScript/Vite build and production startup/persistence smoke test passed.
- Isolated muted browser test: three normal deliveries, two further completions with refresh mid-delivery, exact troop/Compute counts, raid deployment/retreat, orange cards, disabled state, portrait sizes and desktop. Contexts and browsers closed in finally.
- Before/after comparison: original model 41 draw calls / 4,020 triangles; updated model 37 / 5,424. A populated HQ sample: 550 calls / 64,035 triangles (camera framing includes the decorative perimeter).

Browser checks use Chrome emulation, not physical iPhone Safari. On the phone, verify stepping readability, smoothness, touch controls and safe-area layout in Safari and the installed PWA. No physical-device performance claim is made.
