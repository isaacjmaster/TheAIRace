# The AI Race 0.5 — landscape identity

## Checkpoints and scope

Working branch: `codex/ai-race-integrated`. Safe checkpoint before this overhaul: `19609ca` (parent integration: `18d2ca6`). The original garage, latest isolated raids, Project Pixel, and all other worktrees were left unchanged. Project Pixel's `LaunchShell.tsx`, `launch.ts`, and `launch.css` were inspected only as a reference for the two-second MASTER STUDIOS fade. No Pixel code or assets were changed.

## What changed

- Navigation is HQ, ATTACK, UPGRADES. Mission selection, contracts tutorial, Credits, story screens, Rankings and Operations are no longer imported into the active interface. Their historical sources remain in Git. If a pre-0.5 save has a running contract, a compact one-time collection control preserves those earned credits and releases the existing hardware-upgrade lock; it cannot start new missions.
- The HQ is now a true Three.js cutaway garage on a spacious landscaped campus. It retains the original laptop, warm window, garage door, mint AI agent, desk/chair/lamp, plants, GPU workbench, server racks, and training rig progression. Empty eastern foundations and paths leave visual room for future expansion without adding new gameplay.
- HQ and raids share `src/art/world.ts`: palette, roughness, metalness, soft daylight, shadows, tone mapping, pixel-ratio cap, and rounded low-poly geometry. The original SVG garage remains an accessible graphics-failure fallback. Camera controls support clamped, gently eased drag/pinch/zoom and a reset button.
- The interface uses a shared cream/mint/slate/gold palette, rounded controls, troop icons, typography, and touch spacing. Portrait remains usable with a rotation hint, while the manifest prefers landscape. The game never forces screen orientation in Safari.
- Startup shows MASTER STUDIOS with a two-second fade (150 ms under reduced motion), then a clean title/PLAY menu. The 3D module preloads during the splash. The raid module preloads once the game opens. UI fades are reduced-motion aware.
- “Small Signals” is an original procedural score authored for this game. HQ uses a soft pentatonic-style melody, sustained chords and quiet bass. Raids retain the harmonic language with a tighter pulse and restrained percussion. Music buses crossfade over 1.1 seconds. There are no external recordings, samples, copied melodies, downloads, or audio licensing dependencies.
- Sound cues cover taps, deployment, laser shots, impacts, destruction, victory, resource collection, and upgrades. Combat cues come from actual engine effects and are deduplicated/rate-limited. All sound passes through the same low-volume master bus.

## Saves and progression

No save schema, cookie, database path, raid rewards, deterministic replay, troop stats, engine rules, upgrade prices, layout selection, or resource fields changed in 0.5. The default save remains `data/integrated-game.sqlite` with cookie `airace_integrated_session`; pending completions retain `airace-integrated-pending-raid-v1`. No original save is migrated or overwritten.

Hardware still costs 90 then 220 credits and yields 6 → 9 → 12 troops. Agent training still costs 60/120/180 compute, with +15%/+30%/+45% health and damage. Both enemy layouts and win/loss conditions remain intact. The server still replays deployments and banks each run once in a transaction. Existing 0.4 saves open directly in the new HQ with their same company state.

An unfinished raid still restarts from its original server snapshot after a reload. Already banked rewards persist; pending completion records retry through ATTACK. This behavior is unchanged from the integration prototype.

## Audio behavior

The browser creates/resumes AudioContext only on an explicit interaction. PLAY begins the music if sound is enabled. Sound on/off is always accessible from the menu, HQ and raid; preference is stored as `airace-audio-muted-v1`. Reloading with mute saved does not create an audio context. When the document backgrounds, audio suspends; tap a control or battlefield after returning to resume, as required by some iPhone Safari/PWA sessions. Storage or Web Audio failure does not block gameplay.

The score and all effects are synthesized locally with sine/triangle oscillators, filtered generated noise, and bounded envelopes. Audio uses no paid services or API calls. Physical-device listening remains necessary for device volume/speaker quality and iOS-specific interruption behavior.

## Start locally

From PowerShell:

```powershell
cd C:\Users\socce\.codex\worktrees\ai-race-integrated\TheAIRace
npm.cmd test
npm.cmd run build
$env:PORT = '3012'
npm.cmd start
```

The server is currently serving the updated production build at http://localhost:3012. Do not start a second copy on the same port while it is running. No public deployment or GitHub push was performed.

## Desktop test

1. Reload the game. Observe MASTER STUDIOS fade into the clean title; no Credits button. Press PLAY to start audio and enter the HQ.
2. Confirm the saved company's name, credits, compute, hardware stage and training level. Drag the campus, use +/−, and reset its camera. Inspect the laptop/workstation/server stages as earned.
3. Open UPGRADES. Both purchases use the existing shared economy and clearly show their raid benefits. If previous work is pending, collect it from HQ when ready.
4. ATTACK. Deploy Tanks near the defense, Breakers behind them, then Scouts. Check the troop sounds, laser/impact sounds, destruction, music transition and outcome screen.
5. Return after banking, check the exact new balances, buy an upgrade, and enter the next layout. Confirm the larger squad/trained stats, visual progression and stable balances after reload.
6. Mute, reload/reopen, and confirm sound stays off. Unmute with a click, then background/return and tap to resume. Repeat in a raid. Verify mute silences effects and music together.
7. Test at 844 × 390 and 932 × 430 responsive dimensions. Upgrade buttons should remain accessible, HUD controls must not overlap, and the full field must remain playable.

## iPhone Safari / Home Screen test

1. Connect phone and computer to the same trusted Wi-Fi. Keep the local server running. Open http://192.168.1.40:3012 in Safari (use the Wi-Fi IPv4 from `ipconfig` if the address changes).
2. If Windows prompts, allow Node on Private networks. Do not forward the port. Disable portrait orientation lock and turn the phone landscape.
3. Tap PLAY; verify the subtle music starts only after that gesture. Check mute/unmute, headset/device volume, and the transition into raid music. Watch for excessive volume or crackling on real speakers.
4. Pan with one finger, pinch with two, and reset the HQ camera. In raids, confirm a drag/pinch never deploys a troop. Check the notch/home indicator safe areas and all upgrade buttons.
5. Complete HQ → raid → rewards → upgrade → raid. Reload after banking and confirm persistence without duplicate rewards.
6. Lock the phone or switch apps during combat. Return, tap the screen, and confirm audio resumes and combat continues without a burst of queued sounds. Toggle mute, close/reopen Safari and verify it stays muted.
7. Add to Home Screen and repeat. PWA/Safari storage sessions can differ; each session must retain its own mute preference and company. There is no offline service worker: the local server and Wi-Fi are required.

Actual iPhone Safari/PWA execution and listening require a physical device and are not represented by the desktop viewport or mocked Web Audio tests.

## Validation

- `npm.cmd test`: 74 passing tests, including existing economy, save, raid determinism, two layouts, duplicate/concurrent/cross-session claims, and upgrade effects.
- Four new audio tests cover gesture gating, remembered mute, music bus crossfades, every sound cue, rapid-fire rate limits, background suspension/resume, and unavailable storage/audio.
- `npm.cmd run build` and `npm.cmd run raid:build`: successful. Vite warns about the shared Three.js bundle size; it is loaded separately from the menu/UI bundle.
- Desktop browser: existing 0.4 save opened with 29 credits, 86 compute, hardware level 2 and +15% training; 3D campus rendered; no Missions/Operations/Credits in active navigation; mute survived reopening. HQ measured about 190 draw calls / 16k triangles at the workstation stage. Pixel ratio is capped at 1.6, shadows at 1024, and hidden-document rendering pauses.
- Responsive viewport: 844 × 390 landscape HQ and upgrade layout inspected in a local iframe harness. This checks CSS/viewport geometry, not Safari compatibility or actual touch/audio hardware.

- Final live 0.5 loop: Vault Gate victory in 31 simulation seconds, 9 survivors, +500 credits/+200 compute. Banked balances became 529/286; buying the server rack (220 credits) and second training (120 compute) left 309 credits/166 compute, hardware level 3, 12 agents, +30% health/damage. The next raid retained the alternate Crossfire layout.
- GPU lifecycle: both renderers dispose shadow targets and explicitly release their WebGL contexts when unmounted, so repeated HQ/raid transitions do not accumulate active contexts.
