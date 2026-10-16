# The AI Race 0.6 — mobile visual polish

Worktree: `codex/ai-race-integrated`. Pre-change checkpoint: `60508fb`.

## Changes
- `src/art/world.ts`: shared navy/cyan palette, cool laboratory lighting, metallic materials, continuous faceted terrain with surrounding hills. Cached geometry/materials and existing pixel/shadow caps retained.
- `src/art/HeadquartersScene.ts`: removed stacked rectangular island and artificial expansion pads; connected through-road, curbs and driveway, layered surroundings, darker cutaway lab, illuminated structural trim, closer mobile framing. Original laptop, agent, workstation, racks and training progression retained.
- `raid/scene.ts`: same terrain and materials, compound access road and infrastructure; navy courtyard and cyan deployment lanes. Buildings remain distinct: gold resource vault, lavender network core, coral laser defense. Collision, deployment bounds and layouts unchanged.
- `src/ui/App.tsx`, `Headquarters.tsx`, `identity.css`: removed title footer, stage panel, instructions and redundant name/camera icons; compact company/resource HUD, 44px sound/reset/navigation targets, navy upgrade cards. Pinch/drag/wheel preserved; only reset is shown in the HQ camera UI.
- `raid/style.css`, `RaidScreen.tsx`: matching navy controls/results, readable troop selection, separated portrait camera controls and deployment hint.
- `index.html`, `public/manifest.webmanifest`: black startup/theme backgrounds. Fixed full-viewport shell, dynamic viewport height and safe-area offsets prevent page background strips. No orientation-lock API.

## Validation
- 74 automated tests passed: economy, upgrades, save persistence, replay, two raid layouts, paths, deployment gestures, rewards, duplicate/concurrent/cross-session claims, audio gesture gating and persistent mute.
- Integrated and standalone raid production builds passed. Existing Vite warning: Three.js chunk exceeds 500 kB before compression.
- Browser-driven viewport checks at 390 x 844 portrait and 844 x 390 landscape using a local iframe harness: title footer absent, full dark background, HQ/raid navigation accessible, upgrades visible, portrait rotation hint, landscape camera zoom/pan/reset.
- Live loop on existing save: started 309 credits / 166 compute, won Vault Gate with 11 survivors in 26 simulation seconds, received exactly 500 / 200, trained agents for 180 compute, returned to HQ with 809 / 186 and +45% training. Reload retained balances. Crossfire opened with 12 agents; undeployed retreat gave zero rewards. Mute survived reload; unmute remained available.
- Gameplay engine, level rules, server, shared contracts, economy and audio implementation are unchanged. No save migration or credential changes. Original projects/worktrees were not modified. No push or public deployment.

## Test on iPhone
The production server is running at http://localhost:3012. On the same Wi-Fi, open http://192.168.1.40:3012 in Safari. Keep the computer/server running. Reload once to get the new assets.

1. In portrait, check MASTER STUDIOS fade, title, PLAY and sound. Inspect status-bar/home-indicator regions for any light strip.
2. Tap PLAY, disable portrait orientation lock, rotate landscape. Check HUD against notch and home indicator; pan/pinch/reset the HQ.
3. ATTACK, deploy each troop type, finish a raid, return, buy an available upgrade, and reload. Confirm balances and upgraded visual stage persist once.
4. Mute, reopen, and verify silence. Unmute with a tap. Background/return and tap to resume audio if Safari suspends it.
5. Repeat after Add to Home Screen. Local server and Wi-Fi are required; there is no offline service worker.

Browser viewport simulation is not a physical iPhone or Safari/WebKit emulator. Actual touch/pinch, iOS safe-area/browser chrome, speaker quality, PWA lifecycle and device frame rate still require physical testing. No unsupported orientation APIs are used. Desktop remains functional, but the composition is tuned for landscape phones.

To restart locally: run `npm.cmd start` from this worktree with PowerShell `$env:PORT='3012'`. Do not launch another server while port 3012 is already serving.
