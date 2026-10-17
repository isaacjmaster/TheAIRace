# Scrap Bot V1

Local-only feature on codex/ai-race-integrated. Checkpoint: codex/checkpoint-before-scrap-bots. No production database changes or deployment.

## Play
1. Build a GPU Rig first for renewable Compute, collect its output.
2. + Build > Bot Fabricator: 50 Compute, 15 seconds, one shared builder. Placement reserves room for the free adjacent Hangar. Maximum one Fabricator.
3. Tap Fabricator, train one or five Scrap Bots. Each costs 5 Compute and takes 5 seconds sequentially. Completed plus queued plus reserved undeployed raid bots cannot exceed 10.
4. Tap Bots HUD to focus the Hangar, or tap the platform. Ready bots are physically visible.
5. ATTACK > Vault Gate or Crossfire. Tap outer ground to deploy, drag/pinch to inspect. The 90-second timer starts on first deployment.

Deployed bots are consumed even on victory. Undeployed bots return on retreat, timeout, defeat or victory. Active raids resume after refresh. Server time advances training and combat while away. Three objectives award 15 Compute each, maximum 45, subject to existing Compute storage capacity. Walls award none. Reward settlement is idempotent.

## Persistence
Optional fields extend existing foundation JSON; old GPU, Compute and company data remain intact. No schema migration or reset. SQLite transactions and request UUID/payload matching prevent duplicate builds, training and deployment. Reset generations invalidate stale commands. Bots reserved in an active raid still occupy Hangar space.

## Local preview
http://192.168.1.40:3013/ (same Wi-Fi). Desktop: http://localhost:3013/
Server uses GAME_DB_PATH=data/scrap-bot-preview.sqlite, PORT=3013, HOST=0.0.0.0. This is separate test progress, not your original save or Railway database. Keep the server running.

## Verification
142 automated tests passed; npm run build and npm run test:production passed. Tests cover construction, placement overlap, shared builder, GPU collection during construction, sequential queues, capacity, costs, old-save compatibility, SQLite restart, duplicate requests, reset generations, raid reservations, melee range, both maps winning, losses, offline expiry and one-time rewards.
Browser checks covered building/training/Hangar, full capacity, deployed stock deductions, raid refresh, 45-Compute settlement and five returned bots, camera drag without deployment, and 390x664 portrait layout. Browser viewport checks are not physical iPhone Safari testing. Verify tap, pinch, audio and safe-area behavior on your iPhone before release.

## Balance limits
V1 has only Scrap Bots and two reused starter layouts with reduced enemy health/damage. Existing archived raid behavior remains unchanged. Build the GPU Rig before exhausting starting Compute: spending all funds on bots without a producer can leave no renewable income after a loss. No free currency or replacement troops were added. Raid rewards are repeatable, not a finite campaign. No upgrades or extra troop types.
