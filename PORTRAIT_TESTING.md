# Portrait V1 local preview

Landscape checkpoint: 456d75e. Deployment branch remains at 95f4c0b. This update is local only; no GitHub push or Railway deployment.

The active FoundationApp now opens HQ directly in portrait, without requesting landscape or rendering a rotation gate. The manifest prefers portrait. Browsers that do not enforce orientation still have a usable landscape fallback, rather than blocking play. Existing installed Home Screen apps may retain the former manifest preference; test in Safari first and reopen the installed app. Re-adding an icon may refresh metadata but can change cookie-based save access, so do not clear site data or remove an existing installation casually.

The minimal campus has a dedicated portrait camera frame (24–28 world units wide), a more isometric angle, broader campus pan bounds and 0.65–2x zoom. No geometry or building content changed. Entering placement focuses the rig preview so it cannot start offscreen after earlier exploration. Portrait HUD stacks Company/Builders at top-left, uses a narrower Compute card at top-right, and retains bottom corner actions. Placement uses a two-row bottom panel with large Pan/Cancel/Confirm targets. The title keeps the studio introduction, artwork, music and PLAY flow with portrait spacing.

The current game intentionally has no troops: Attack remains the Networks offline dialog, now sized for portrait. Archived raid code, engine, pathfinding and win conditions are untouched; no old units were reintroduced. Save schemas, API behavior, resources, single-rig limit and Railway configuration are unchanged.

## Validation

- 129 automated tests pass, including portrait camera bounds, no active orientation gate, manifest preference and existing economy/construction/collection/retry/save tests.
- Production TypeScript/Vite build passes; production smoke verifies GPU ownership and balance across server restart and rejects duplicate purchases.
- Desktop Chromium frame checks: 320x568, 390x664, 390x844, 430x740, and landscape/portrait transitions. No document overflow; canvas follows frame dimensions.
- Simulated top 47px and bottom 34px safe areas leave controls inside the visible frame. This is CSS simulation, not actual WebKit safe-area behavior.
- Isolated browser test database data/portrait-ui-validation.sqlite: 100 Compute → build at 50 → Builder busy/completes → manual collection to 52 → reload preserves ownership and balance. Pan mode moved the camera without buying/placing. Existing local integrated-game.sqlite was not reset or replaced.
- Real iPhone touch/pinch, Safari native chrome animations, physical safe areas, audio and Home Screen installation still require device testing. Mouse drag checks are not multitouch hardware tests.

## Try it on iPhone

Same Wi-Fi: http://192.168.1.40:3012 (desktop http://localhost:3012).

1. Open in portrait and tap PLAY. HQ should open immediately without a rotation prompt.
2. Pan and pinch around the campus; inspect the garage and existing GPU Rig. Check HUD/buttons with Safari chrome expanded and collapsed.
3. If no rig is owned, Build → Place GPU Rig → drag/tap on valid terrain → Confirm. Use Pan camera to move the view separately. Wait 15 seconds plus roughly 12 seconds for the first Compute, then tap the rig/icon to collect. If a rig already exists, use Move GPU Rig; do not reset existing progress just to test.
4. Open Attack, return to HQ, open Settings, and close it. Check title via Main Menu, mute preference and normal user-interaction audio.
5. Background/reopen and reload. Verify the same rig, Compute and builder state. Check both Safari and the existing Home Screen icon, including orientation changes.
