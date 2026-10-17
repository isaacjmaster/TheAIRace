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

## Character staging and audio polish
Ava now appears as a large transparent character over the world beside a speech bubble, with no enclosing portrait card. Welcome/encouragement uses an open palm; explanations use a pointing pose. The original approved identity is preserved in both built-in imagegen edit variants (see art/concepts/ava/poses-v1.md for prompts and assets). Pose transitions honor reduced motion. Only the bubble intercepts input; the character and surrounding empty area allow world interaction. Collection guidance is placed low enough to leave the GPU Rig target clear.

The recurring audio defect was reproduced in a silent Chrome OfflineAudioContext render: a future scheduled zero-gain event left newly created voice gains at their default unity value beforehand. Source/event sample rounding exposed isolated high-amplitude startup samples. Initialize voice gains to zero at creation; use attack/decay and an exact-zero release tail. Impact effects get a ramped attack, and music kick/noise attacks are softened. Bus crossfades hold their current automated value where supported. Melody, rhythm, soundtrack identity, volume defaults, autoplay restrictions, saved preferences and automatic development mute remain intact.

Eight-second HQ/raid renders at 44.1 kHz (no speaker output) measured maximum adjacent-sample changes of 0.006798 → 0.001500 for HQ and 0.032418 → 0.004094 for raids. The isolated one-sample startup pulses disappeared, and neither render clipped. These are waveform measurements, not a physical iPhone listening claim. Regression tests verify every voice is silent before its first future event and reaches exact silence before stopping. Listen on a physical iPhone for 30–60 seconds in HQ and during a raid to confirm no other device-specific clicks remain.

Final verification: 162 automated tests, production build, production persistence smoke and silent touch-browser tutorial flow. Mobile checks cover 320/390/430px portrait, viewport height resizing, changed poses, real build/collect, skip/replay and refreshed progress; a desktop screenshot is also captured. Test contexts close afterward. No push or deployment.
