# Ava V1 — local scripted onboarding

## Assets
Uses the existing approved cuter V2 portrait, copied unchanged from art/concepts/ava/ava-portrait-v2.png to public/characters/ava/portrait.png. The matching V2 full-body concept and V1 concepts are preserved. No character redesign or generation was performed for this feature.

## Flow
PLAY enters HQ with Ava for new foundation sessions only. Short opening dialogue introduces 2028, Founder HQ and Compute. World markers and HUD outlines guide the player to the existing Build menu, GPU Rig card and placement controls. Real server state advances construction; actual positive manual collection advances the final introduction. No resources, rewards, costs, timers or placement rules are changed. Existing drag, pinch and layout editing controls remain intact. Ava is hidden during other building/settings/raid panels and layout editing, then resumes.

Skip Tutorial is always available on the card. Settings → Replay Ava Tutorial restarts dialogue without changing the company. Existing rigs skip purchase and proceed to completion/collection. Busy builders, insufficient Compute and full resource storage get explanatory guidance plus a skip/replay path; the tutorial never locks controls or invents resources.

## Save compatibility
The additive SQLite table foundation_ava holds tutorial status, step, independent revision and collection observation. A row is created only alongside a genuinely new foundation session, after an explicit progress reset, or an explicit replay. Existing foundation_saves rows without an Ava row are legacy players, even if untouched or Level 1. They are not automatically enrolled. No old save JSON or database files are migrated or overwritten.

Tutorial commands use expected revisions and reset generations; stale retries cannot double-advance dialogue. Build/collect continue through the existing authoritative, idempotent action API. Tutorial completion grants no reward. Offline construction completion is observed on the next state fetch. A positive collection is recorded in the same transaction as the existing collection action. Reset intentionally restarts onboarding for the newly reset foundation.

## Local preview
Preview runs on http://192.168.1.40:3014/ with GAME_DB_PATH=data/ava-preview.sqlite. Production and older local databases are untouched. Use a **Private Safari tab** for a fresh isolated player; cookies on the same LAN hostname can otherwise be shared across local ports. Do not clear production cookies or reset a live player. Returning preview players can use Settings → Replay Ava Tutorial. For another genuinely fresh run, close all private tabs and open a new private session.

Tap PLAY, advance the introduction, open Build, choose GPU Rig, position and Confirm. Wait the normal 15 seconds for construction, Continue, then wait for at least 1 Compute (normally 12 seconds after completion) and tap the rig or its badge. Refresh during dialogue/construction and verify the exact step resumes after PLAY. Skip then reopen; verify it stays skipped. Replay with a built rig; verify no purchase is required or charged.

## Verification
159 automated tests passed, including Ava action-gating, legacy save classification, skip/replay, stale retries, offline completion, low funds/busy/full-storage guidance and positive collection; GPU Rig, rotation, layout, bots, combat and audio regressions pass. Production build and production restart/persistence smoke pass.

Muted Chrome touch emulation completed the real fresh-player build/collect loop, reload, skip/replay, 320×568, 390×844, 430×932 and Safari-like height resizing. Automated browser contexts are closed in finally blocks. Screenshots are saved separately in the task artifact folder.

Physical iPhone Safari and installed-PWA safe-area/fullscreen verification remains necessary. Existing viewport, manifest, splash/status-bar configuration and Railway configuration are unchanged. No voice, chatbot, paid API, quest system, automatic rewards, pushes or deployments are included.
