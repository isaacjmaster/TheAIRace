# File ownership
- Coordinator: shared/, package.json, config files, tests/, README.md, integration.
- UI agent: src/ui/, src/art/, src/main.tsx, src/styles.css, index.html. Do not edit game/server/shared/config files.
- Mechanics agent: src/game/ only.
- Backend agent: server/ only.
Shared contracts are frozen unless coordinated with parent. No deployment or live paid API calls.

## Mechanics public exports from src/game/index.ts
CONTRACTS: Contract[], HARDWARE: Hardware[], createInitialState(): GameState,
projectContract(state, contractId, plan, allocation): Projection,
applyCommand(state, command, now?: number): GameState.
Throw Error with user-readable message on illegal actions. Engine validates all plans and allocations.

## HTTP API
GET /api/game -> Bootstrap (create cookie session as needed)
POST /api/interpret body InterpretRequest -> InterpretResponse
POST /api/command body CommandRequest -> { state: GameState }
Errors -> {error:string}, HTTP 400/409/429/503. Commands serialized per session, revision checked, requestId deduplicated.
UI polls GET while job active; completion is claimed via command, never rewarded by GET.
Vite proxies /api to localhost:3001. Backend serves built dist for single port production/LAN preview.
