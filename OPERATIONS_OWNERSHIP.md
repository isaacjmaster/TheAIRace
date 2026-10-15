# Operations 0.2 integration boundaries

- Shared contracts: `shared/operation.ts`; `ExpeditionRun.operation` is optional. Legacy outings remain recoverable without resetting cargo or saves.
- Simulation agent owns `src/game/operation.ts`, `tests/operation.test.ts`, and necessary dispatch/schema additions in `src/game/expedition.ts`.
- Backend agent owns `server/expedition-api.ts` and operation API tests. Preserve transactions, revisions, deduplication, anonymous sessions, and existing upgrade economics.
- Visual agent owns `src/ui/Operation.tsx`, `src/ui/operation.css`. Parent integrates App, navigation, and the rewards dialog. Previous `Expedition` source remains available, but all outings now open in the simplified interface.
- Parent owns App, HQ entry point, shared types, documentation, integration QA.

`Operation` is a seeded world plus server-authoritative one-second simulation ticks. `launch` starts a new autonomous operation; `sync` advances from server time; `order` sets Gather/Scout/Hold/Return plus optional resource focus and safe/bold risk; `pause` freezes simulation. Orders can be reviewed while paused. No client supplies elapsed time, rewards, coordinates, or RNG seed. Existing `depart` commands keep legacy behavior for compatibility. No paid planner is invoked.

UI props: `{state:ExpeditionState,busy:boolean,onCommand:(cmd:ExpeditionCommand)=>Promise<ExpeditionState|null>,muted:boolean,clockOffset?:number}`. Parent performs polling while an operation is running; UI renders snapshots and issues orders. On tab hiding, pause; maximum catch-up is bounded by the engine. Engine export `applyOperationCommand(state,input,now):ExpeditionState`, `advanceOperation(state,now):ExpeditionState`, `operationCommandSchema`.

Simplification pass: optional `Operation.destination` preserves old saves. `launch` optionally accepts a validated destination; `destination` selects/resumes automatic gathering and can adopt old outings without resetting balances. `headHome` resumes safe return in one command. Explicit destination outings pause after each recovery for Continue versus Return. Old low-level order commands remain validated for compatibility but are hidden in the UI. New engine tests: `tests/destination.test.ts`; API tests: `server/destination-api.test.ts`.
