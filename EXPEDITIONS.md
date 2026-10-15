# Resource Expeditions — playable slice

This document describes the **legacy tap-to-move outing**, retained for existing in-progress saves. New outings use [Operations 0.2](OPERATIONS.md), accessed through **Operations** navigation.

Open **Explore** from HQ or the bottom navigation. Contracts are still under **Missions**; Pixel can only do one activity at a time. Rankings remains available through Missions.

## Launch locally

Stop any previous server with Ctrl+C, then run in PowerShell:

```powershell
cd path\to\TheAIRace
npm.cmd run build
npm.cmd start
```

Dependencies are already installed in this checkout. For a fresh checkout, run `npm.cmd ci` before building. Open `http://localhost:3001`. On iPhone, use `http://YOUR_COMPUTER_IP:3001` on the same Wi-Fi; leave the computer running. Use `ipconfig` to find the current address. Nothing is deployed or exposed publicly by this workflow.

## Controls and first upgrade

1. In Explore, tap **Deploy Pixel**.
2. Tap a deposit on the map or its resource card. Pixel walks to an adjacent tile; wait for the short movement animation.
3. Tap **Collect** for each recovery. Collection spends battery and fills cargo; it does not continue automatically.
4. For the first upgrade, collect from **Broken drones twice** (6 scrap), then **Battery cache twice** (2 cells).
5. Tap **Home** to walk back to the dock. At the dock, tap **Return to HQ** to bank everything.
6. Open **Upgrades** and install the **Recovery Rig** for 6 scrap + 2 cells. No credits are spent.
7. Your garage gains a recovery station. Next outing has 40 battery and 20 cargo instead of 26/12, and the east gate/GPU vault are unlocked.

Tap open lanes to choose waypoints rather than taking the suggested direct route. The map's expand button opens a larger, scrollable map: drag to pan, tap lanes to move, then **Done** to return to collection controls. Keyboard users can activate map tiles with Enter/Space and close the zoomed map with Escape.

Each normal step costs 1 battery; amber hazard tiles cost 4. Gathering costs 2. Recovering scrap gives 3 units, a cell cache gives 1 cell, and the GPU vault gives 2 GPU components. Deposits have three recoveries per outing and replenish when a new outing begins. Cargo units are the sum of all carried resources.

The charging pad consumes 1 carried cell to restore up to 8 battery, once per outing. This is a decision: recharge for more exploration, or keep the cell for your upgrade. Reserve enough battery to get home; the Home button shows the route cost.

If stranded, **Evacuate** opens a confirmation. It banks half of each carried resource, rounded down. Ordinary return at the dock banks everything. Evacuation is always possible, even at zero battery. Canceling the confirmation changes nothing.

## Saves and validation

Every accepted movement/collection is saved on the server, including in-progress cargo, battery, position, and depleted deposits. Reloading does not lose the outing. Resources become spendable HQ inventory only after a return or evacuation.

Separate SQLite tables hold expedition state and durable request IDs. Existing company state, credits, hardware, contracts, onboarding, and saves are retained without rewriting their format. New expedition metadata starts at zero for old companies. Back up the complete `data/` directory with the server stopped; Git intentionally excludes local saves.

The server validates movement, reachable paths, cooldowns, energy, capacity, deposits, upgrade costs, and activity conflicts. The browser never supplies rewards. Revision checks and durable deduplication prevent retry-based double collection/banking. A lightweight server-clock offset keeps phone cooldown displays aligned with the server.

Future AI planning can propose the existing typed `ExpeditionCommand` actions, checked by the same authoritative engine. This slice uses touch decisions and deterministic pathfinding; it makes no expedition AI requests.

## Scope and limitations

- One fixed 7×7 yard, one resource-funded upgrade, and one gated sector. No combat, multiplayer, paid services, or deployment.
- GPU components can be collected and banked, but do not yet have an additional spending sink.
- Suggested movement uses shortest-step paths; it can cross costly hazards. Waypoints let the player choose a safer route. Energy-aware route planning is a useful next experiment.
- The game needs the local server and network; offline expeditions are not implemented.
- Browser portrait QA passed at 320×568 and 390×844. Physical iPhone Safari/Home Screen performance, sound, and safe-area behavior still need device testing.

Good next playtest questions: Is routing/energy management enjoyable? Does an optional safe-route versus shortcut choice help? Which GPU-funded upgrade would create the best next decision? Consider varied cache layouts only after evaluating this fixed yard.

