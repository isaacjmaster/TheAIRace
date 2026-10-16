# Mounting raids in the company app

The standalone launcher is `main.tsx`; it owns the DOM root and global page reset. `RaidScreen.tsx` is the reusable action screen. Its CSS is scoped to `.raid-game`, and it does not fetch company state, read saves, or grant persistent rewards. `level.ts` supplies shared map bounds/layouts; `engine.ts` owns deterministic combat; `scene.ts` renders it; `outcome.ts` produces the immutable result.

```tsx
import { RaidScreen } from './raid/RaidScreen';

<RaidScreen
  initialLayout={0}
  squad={{ scout: 2, tank: 2, breaker: 2 }}
  onComplete={outcome => showRaidDebrief(outcome)}
  onExit={() => navigateToGarage()}
/>
```

`initialLayout` selects either local opponent. `squad` accepts 1–12 total agents and is copied into a new raid. `onComplete` fires once per completed raid, including defeat, timeout, or retreat, and receives a frozen snapshot containing layout, victory/reason, elapsed time, destruction, compute/credit rewards, damage by troop type, and agents lost. Retry creates a fresh raid and permits a fresh completion callback. `onExit` adds a Return to base button to the debrief. Unmounting disposes the WebGL renderer, geometry, textures, observers, and animation loop.

The next clean integration step is a host app route from Garage → Raid → Debrief → Garage. Let the host own company state, the chosen squad, and the raid run ID. Add one authoritative reward-claim command keyed by that run ID so a retry, refresh, or duplicate callback cannot grant the same reward twice. Validate/replay the deterministic deployment log server-side before banking rewards; do not trust arbitrary browser totals. Then show the updated balances and existing upgrade purchases in the garage. Keep existing saves and migration rules intact.

This prototype only prepares that boundary. It does not integrate or modify the existing garage experiment, implement reward persistence, or launch its API server.

## Integrated host additions

The integrated checkout passes `integrated` and a server-issued `power` multiplier, and receives `(outcome, transcript)` from `onComplete`. The transcript contains successful deployments and fixed simulation step counts. Integrated mode hides local retry/map resets; new runs are issued by `/api/raid/start`, and `/api/raid/claim` validates/replays the transcript and banks the result once. The host enables Return to base after banking. Standalone defaults retain the original retry and layout buttons. See `../INTEGRATION.md` for save isolation and testing.
