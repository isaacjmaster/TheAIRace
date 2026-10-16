# The AI Race 0.9 — editable campus and expanded compounds

## Release and preservation

All changes are confined to `codex/ai-race-integrated`. Pre-update Git checkpoint: `15cd415` (0.8 implementation: `94280ed`). A consistent SQLite backup is at `data/backups/pre-09.sqlite`. Existing session cookies, resources, upgrades, raid records and credentials are retained. Pixel, Maze Sprint and other worktrees were not modified. Nothing was pushed or deployed.

## What changed

- Richer navy/cyan HQ campus: garage architecture, landscaping, roads, lighting, perimeter details and recognizable animated Builder Bots. The starting laptop remains; facilities appear through progression.
- Every HQ/facility can be repositioned on a one-unit grid. Tap a building, choose Move, drag or tap a location, then Place. Fine-position arrows are available. New facilities use Choose location & build.
- The preview shows a cyan valid footprint or red invalid footprint. Bounds, overlapping lots and obstacles are checked both locally and on the server. All seven lots remain reserved, including locked future lots; placement mode outlines and labels those reservations.
- Eight clearable obstacles: two cedar clusters, two rocks, two debris piles and two abandoned equipment sites. Tap to inspect cost/salvage, then clear. Removal animates and stays saved. Clearing is immediate and does not occupy a Builder Bot.
- One Builder Bot initially, a second at HQ 4 and a third at HQ 7. Each bot supports one simultaneous construction project. Buildings under construction cannot be moved or upgraded again. Bots travel to sites and perform a work animation; scaffolds and contextual timers show progress.
- A visual icon catalog replaces the text-heavy building tabs. Context cards show level, current/next benefit, prerequisites, cost, time and Build/Upgrade/Move controls.
- Six later enemy networks have larger occupied compounds, different partitions, separated resource/support districts and useful service breaches. Existing defenses, agents and automatic combat remain. Roads, utilities, gates, model details, impact rings and collapse effects improve readability. Repeated raid scenery is instanced and effects are bounded.
- Network selection includes short tactical hints. The eight networks, six agents, ten HQ levels, resource production and reward schedule remain consistent with 0.8.

## Save and economy behavior

The additive migration fills missing building positions from the exact 0.8 lot positions and imports a legacy active construction into the new queue. The old `construction` field remains a compatibility alias to the first project; `constructions` stores the full queue. Cleared obstacle IDs persist with the campus.

Placement, clearing and construction are authoritative, transactional server operations. Request IDs survive retries; changing an action payload under an existing ID is rejected. Invalid moves, insufficient funds and duplicate clearing cannot spend or mint resources. Construction uses server elapsed time and offline income splits at every completion; the existing four-hour production cap remains.

New raids store map version 2. Saved runs without a version continue using immutable version 1 layouts and replay correctly. Rewards still require server replay and a single transactional claim. The first two gameplay layouts are unchanged; later version 2 layouts occupy a larger compound inside the existing battlefield/deployment boundary.

## Verification

- `npm.cmd test`: **114 passed, zero failed**.
- `npm.cmd run build`: integrated TypeScript and production build passed.
- `npm.cmd run raid:build`: standalone TypeScript and production build passed.
- `git diff --check`: clean.
- Tests cover legacy migration, parallel builder limits, same-building exclusion, offline income across multiple completions, grid bounds, overlapping/future lots, obstacle collision, clearing costs, persistent idempotency and invalid-action rejection.
- Integration tests replay both an old unversioned raid and a new version 2 Nexus victory, checking exact single rewards. All eight revised networks are winnable at realistic unlock levels and allocated squads. Desktop simulation of a 24-agent Nexus battle took roughly 0.12–0.15 seconds for the whole simulation; this is not an iPhone FPS measurement.
- Browser checks at 844x390 landscape / 390x844 portrait: title, original saved HQ 4, visual catalog, rejected overlap, new placement, existing-building drag/reposition, obstacle tapping/clearing, two concurrent construction projects, rotation gate and reload persistence.
- Live loop on the existing save: clear the western rock, place/build GPU Workstation, upgrade Compute Farm and Revenue Server concurrently, reload, complete Aegis with 16 deployed agents (12 survivors, 36 seconds), bank 1,100 Credits / 440 Compute, return to HQ, then drag and save the existing GPU building. Resources changed only through real game actions and passive production.

## Play locally

Desktop: **http://localhost:3012**

iPhone on the same Wi-Fi: **http://192.168.1.40:3012**

Keep the computer awake and the server running. Use the same origin as your existing save: localhost and the LAN hostname have separate browser session cookies. The LAN address can change when Wi-Fi assigns a new address.

To restart from this worktree:

```powershell
npm.cmd run build
$env:PORT='3012'
npm.cmd start
```

### Physical iPhone checklist

1. Launch from Safari or your existing Home Screen shortcut; press PLAY and rotate to landscape.
2. Tap a building, select Move, drag it, inspect invalid red locations, then confirm a valid position. Reopen and confirm the layout persists.
3. Tap an obstacle and check its cost/salvage before clearing it. Confirm it stays removed after reopening.
4. At HQ 4, start two upgrades on separate buildings; verify both bots and timers. Close and reopen after completion.
5. Enter a new rival network, deploy agents, rotate briefly to portrait and return; verify the rotation gate and preserved battle.
6. Complete the raid, return to HQ and reload. Confirm the reward is awarded once.
7. Check safe-area clearance, pan/pinch, audio after returning from background, mute persistence and sustained frame rate.

## Current limits

One instance of each building category; reserved future lots prevent overlapping future unlocks. No building rotation, road editor or arbitrary additional copies. Builder unlocks are automatic at HQ 4/7; bots are visual workers rather than pathfinding obstacles. Clearing is instant with a short visual animation. No defensive drone mechanic or new troop class was added.

Prototype economy/timers still need longer-term balancing. Physical iPhone Safari/Home Screen touch, audio and sustained graphics performance require real-device testing; desktop viewport checks cannot certify these. Existing large Three.js bundle warnings remain. Audio, splash/title, landscape gate and safe-area policy were preserved.
