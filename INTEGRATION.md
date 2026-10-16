# Garage + Raid integration

## Source snapshots and preservation

- Garage: `8930aa7` (main, original “Build The AI Race prototype”). Original checkout: `C:/Users/socce/Documents/TheAIRace`.
- Latest raids: `78363d2` on `codex/ai-race-raids`, following the 3D overhaul `d720eaf`. Source checkout: `C:/Users/socce/.codex/worktrees/e33a/TheAIRace`.
- Integration: `codex/ai-race-integrated`, based on the garage snapshot, in `C:/Users/socce/.codex/worktrees/ai-race-integrated/TheAIRace`.
- Both source worktrees were clean and remain unmodified. Their commits and saves are preserved. Project Pixel and the startup-tycoon worktree were not edited. Pixel had pre-existing uncommitted work; it was left alone.

The existing `Garage.tsx`, garage/headquarters styling, company API, hardware prices, purchase validation, and installation feedback are reused. The original laptop → desk/workstation → GPU workbench/server rack art stages remain. The old rig art now represents agent training. RaidScreen, Three.js scene, landscape HUD, automatic combat, troops, gestures, two maps, and reward rules come from the latest raid prototype. Raid engine changes are limited to optional host-supplied health/damage power; standalone defaults are unchanged.

## Launch locally

Requires Node 24 and npm. From PowerShell:

```powershell
cd C:\Users\socce\.codex\worktrees\ai-race-integrated\TheAIRace
npm.cmd ci
npm.cmd test
npm.cmd run build
$env:PORT = '3012'
npm.cmd start
```

The production prototype is running at http://localhost:3012. Keep its process running. Ctrl+C stops a terminal-launched instance. Port 3012 keeps this separate from original prototype servers. No push or public deployment is performed. AI interpretation is forced to local demo mode; no live API requests are made. No new account, payment, PvP, or service is involved.

For development, run the API with PORT=3012 and Vite with `npm.cmd exec vite -- --host 0.0.0.0`; configure the proxy to port 3012 (or run the API at the existing development proxy default 3001 if that port is free).

## Progression

1. PLAY opens the existing title/story flow and then the garage. The old contract tutorial is dismissed for this integrated flow. Missions remain available as an optional source of credits.
2. ATTACK opens the 3D raid across the full viewport. The garage retains its portrait composition. Rotate the phone manually for raids; the manifest allows either orientation. Safari orientation locking is not required.
3. Choose Scout, Tank, or Breaker and tap the mint perimeter outside the walls. Combat is automatic. Drag to pan; pinch or use +/− to zoom. The countdown begins after the first deployment and pauses while the document is hidden.
4. Destroy the Compute Vault for compute, the Core for additional credits, and all three objectives for victory. Partial raids also pay for destroyed objectives. Retreat before deployment banks zero and safely returns to the garage.
5. The completion screen displays credits and compute. Return to base becomes available after the server banks the result. Failed requests expose Retry and retain the pending completion record across reloads when browser storage is available.
6. Existing hardware upgrades cost 90/220 credits and change the existing garage art. They increase the raid squad from 2 to 3 to 4 of each troop (6/9/12 total). Original contract capacity and speed benefits remain, explicitly labeled as contract benefits.
7. Agent training costs 60, 120, then 180 banked compute, giving +15%, +30%, then +45% health and damage to every troop. The training rig appears using the existing rig artwork. Training levels cap at three purchases.
8. Vault Gate and Crossfire alternate after each banked run. Each new run snapshots company upgrades; purchasing in another tab affects future runs rather than altering an existing battle.

Banked compute is a consumable raid reward, separate from the garage's existing reusable contract capacity. Both credits and banked compute are visible in the status strip and Inventory. Operations/Neon Salvage and its recovery purchase are absent from the integrated navigation; their source and regression tests remain for preservation.

## Save isolation and reward integrity

- Default integrated database: `data/integrated-game.sqlite`, plus its SQLite WAL/SHM files.
- Cookie: `airace_integrated_session`, separate from the original `airace_session`.
- Pending completion storage: `airace-integrated-pending-raid-v1`; original standalone raid storage is not read or overwritten.
- Original `data/game.sqlite` is not copied, migrated, or opened by default. Integration begins with a fresh company. Different browsers/devices have separate companies. Back up the integrated data directory with the server stopped. Do not point GAME_DB_PATH at an original prototype database; that override is provided for isolated tests.
- The server stores a run ID and immutable squad/power snapshot before combat. It validates the deployment transcript and replays the shared deterministic engine. Browser reward totals are never accepted.
- Banking the result, credit/compute additions, and company revision update happen in one SQLite transaction. Repeated callbacks, simultaneous retries, refresh after a lost response, and revisiting old claims cannot pay twice. Claims are scoped to their company session.
- A refresh during unfinished combat restarts the same unclaimed run with its original snapshot; partial battlefield progress is not saved. A completed pending claim retries on the next ATTACK. Already banked progress persists normally. Clearing cookies/storage can detach the company and pending transcript; use a private browser for fresh-save tests rather than clearing existing saves.

## Desktop walkthrough

Open http://localhost:3012, PLAY, and skip/read the introduction. Inspect Inventory, then ATTACK. For Vault Gate, deploy Tanks on the east perimeter near the Laser, then Breakers behind them and Scouts farther north. Deploy all six agents. The test strategy wins in roughly 42 simulation seconds; tapping different positions/times can produce partial rewards or defeat.

Return to base, buy the 90-credit Neon workstation, and verify the desk/chair/computer/plant appear. Train once for 60 compute and verify the rig appears. ATTACK again: Crossfire should show three of each troop. Refresh after returning; balances, hardware, training, and art should persist. Retry a completed claim/refresh the result: the wallet must not grow twice. Retreat from an untouched raid should grant zero.

Automated API tests also exercise the full loop, rejected unfinished/forged deployment records, duplicate/concurrent claims, cross-session ownership, save persistence, immutable run snapshots, and upgrade effects.

## iPhone walkthrough

1. Connect iPhone and computer to the same trusted Wi-Fi. Leave the local server running.
2. In Safari open http://192.168.1.40:3012 (the computer's Wi-Fi address during this session). If it changes, run `ipconfig` and use the Wi-Fi IPv4 address with port 3012.
3. If prompted by Windows Firewall, allow Node only on Private networks. Do not port-forward the server. Guest Wi-Fi may isolate devices.
4. Hold the phone portrait for the garage and rotate landscape after ATTACK. Disable the phone's portrait orientation lock. Check safe areas, troop counts, result scrolling, pan/pinch, and return-to-garage controls.
5. Complete the same rewards → hardware → training → next-raid loop. Switch apps briefly during combat, then resume and check it remains playable. Reload after banking and confirm unchanged balances.
6. Add to Home Screen is optional. Its browser session can differ from Safari. The manifest allows either orientation; no forced device rotation or offline service worker is added.

Actual iPhone Safari hardware testing remains a user playtest; desktop checks do not substitute for it.

## Verification

- Full suite: 70 passing tests (`npm.cmd test`), including three new integration tests and the existing 18 raid tests.
- Integrated production build: `npm.cmd run build`.
- Standalone raid production build: `npm.cmd run raid:build`.
- Browser playtest: original garage → 3D combat → partial rewards (99 credits / 146 compute) → return → workstation purchase → training purchase → Crossfire with 3 agents of each kind. Existing garage art evolved and the training rig appeared.
- Both builds succeed. Vite reports a large Three.js raid chunk warning; the raid is lazy-loaded so initial garage loading does not load the 3D renderer. This prototype still requires WebGL and a running local server.
