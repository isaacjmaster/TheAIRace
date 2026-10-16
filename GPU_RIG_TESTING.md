# GPU Rig update — local testing

Implemented in codex/ai-race-integrated. Checkpoint: 774868e. Pre-update SQLite backup: data/backups/pre-gpu-rig.sqlite. Existing foundation saves extend in place; older game tables are untouched.

Only one GPU Rig can exist, including construction. A single owned rig object and transactional API enforce this independently of the interface. Request IDs prevent retry charges/rewards; reset generations reject delayed pre-reset requests. Reset removes ownership and restores 100 Compute and 0/1 Built.

Tuning: GPU_RIG in shared/foundation.ts (50 Compute, 15 seconds, 5 Compute/minute, 25 storage). Placement validates the footprint against garage, reserved builder area, trees/rocks, road, lamps, and bounds. Move GPU Rig is free after construction; it retains stored Compute and timing. Production is server-timed and internal, including while offline. Collection transfers whole units only, retaining fractions and overflow when the player is full.

Validation: all 124 automated tests passed; production TypeScript/Vite build passed. Browser check at 844x390: 100 starting Compute, valid/invalid preview, purchase to 50, builder busy, disabled 1/1 shop during construction, completion and builder return, manual collection to 51, free move, portrait gate and landscape recovery. API tests cover concurrent buys, retries, reloads, storage cap, double collection, invalid placement, reset and new purchase.

Local: http://localhost:3012
Same-Wi-Fi iPhone: http://192.168.1.40:3012

On iPhone, use landscape, choose + Build, Place GPU Rig, position the preview, Confirm. Pan camera switches drag from positioning to camera movement; pinch zoom remains available. After 15 seconds the rig completes. After about 12 more seconds its first Compute becomes collectible. Tap its icon or model. Reopen Build to verify 1/1 Built and use Move GPU Rig. Reload to verify persistence. Physical Safari/PWA touch, safe areas and audio still require an actual iPhone check; desktop-sized frames cannot certify those.
