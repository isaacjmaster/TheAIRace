# The AI Race 0.8 — progression and combat expansion

## Delivered

Ten HQ levels retain the original laptop garage and gradually reveal six fixed facility lots. Tap a building or use UPGRADES for its cost, prerequisites, timer and gameplay benefit. One construction project runs at a time; development timers range from 15 seconds to four minutes.

| Facility | First available | Effect |
| --- | --- | --- |
| Compute Farm | HQ 2 | Passive Compute |
| Revenue Server | HQ 2 | Passive Credits |
| Agent Training Lab | HQ 2 | Agent health, damage and unlocks |
| GPU Workstation | HQ 3 | Production, storage and squad capacity |
| Research Center | HQ 4 | Damage and advanced agents |
| Defense Laboratory | HQ 5 | Agent durability |

Facilities can reach level 10, capped by HQ level. Higher HQ levels increase squad capacity and storage; HQ 4 onward also requires training progression. The navy campus, original garage, touch camera, menu, audio and portrait rotation screen are retained.

Scout, Tank and Breaker are joined by Striker (HQ 3 / Training 2), Medic (HQ 5 / Training 3 / Research 1), and Disruptor (HQ 7 / Training 5 / Research 3). Strikers prioritize cores, Medics heal nearby living allies, and Disruptors temporarily disable defenses. Squads grow to 24 agents.

| Network | HQ required | Maximum first clear Credits / Compute |
| --- | --- | --- |
| Vault Gate | 1 | 500 / 200 |
| Crossfire | 1 | 500 / 200 |
| Twin Array | 3 | 800 / 320 |
| Aegis Network | 4 | 1100 / 440 |
| Longbow Systems | 5 | 1500 / 600 |
| Split Ledger | 6 | 2000 / 800 |
| Relay Foundry | 8 | 2750 / 1100 |
| Nexus Campus | 10 | 3750 / 1500 |

The original two layouts remain intact. Later networks introduce larger occupied compounds, partitions, missile splash damage, shield protection and repair stations. Walls remain path obstacles rather than required objectives. Actual payouts reflect captured objectives, previous paid attempts and over-leveling; the selection screen previews current maximum rewards.

## Save and economy integrity

Checkpoint before expansion: `eaa76b0`. A consistent SQLite backup is retained locally at `data/backups/pre-08.sqlite`; credentials and original save namespace are preserved.

Existing saves gain a versioned campus state without resetting balances. Legacy hardware and training progress migrate into HQ and Training levels. Historical completed raids are imported once for unlock and diminishing-return accounting without paying them again. Existing active raids retain their saved roster and power.

Construction and production use server time. Production splits at upgrade completion, retains fractional resources, and caps offline collection at four hours. Production storage limits do not remove balances earned through raids. Purchases use persistent idempotency keys and expected levels; prerequisites, resources and one active construction slot are validated transactionally. Raid transcripts are replayed on the server, with transactional single reward claims. Paid partial raids also count toward diminishing rewards; empty retreats do not.

## Validation

- `npm.cmd test`: 102 tests passed, zero failed.
- `npm.cmd run build`: passed TypeScript and integrated production build.
- `npm.cmd run raid:build`: passed standalone raid production build.
- `git diff --check`: clean.
- Coverage includes migration, offline accrual, construction completion, stale/double purchases, prerequisites, independent training effects, all six combat behaviors, all eight networks, historical claims and repeated reward protection.
- Browser playtest on the existing save: construct Compute Farm and Revenue Server, win Twin Array with 12 agents, receive 800 Credits / 320 Compute, purchase HQ 4, restart server during construction, reload and observe completion. Passive production continued.
- Separate temporary database: full campus fits 844x390; all six agent controls fit; a 24-agent squad completed Nexus with the 3750 / 1500 payout. The user save was not given synthetic levels or resources.
- Phone-sized 390x844 portrait / 844x390 landscape checks covered the rotation prompt, campus, network selection, construction UI and raid results.
- Deterministic larger-battle tests completed successfully. These CPU measurements are desktop simulation checks, not iPhone frame-rate measurements.

## Local testing

From this worktree in PowerShell:

```powershell
npm.cmd run build
$env:PORT='3012'
npm.cmd start
```

Desktop: http://localhost:3012

Physical iPhone: connect to the same Wi-Fi as this computer, then open **http://192.168.1.40:3012** in Safari. Keep the computer awake and the server running. Use the same hostname/origin as your existing save; localhost and the LAN address have different browser session cookies. The LAN address may change when Wi-Fi assigns a new address.

1. Launch and press PLAY; verify the original audio and remembered mute setting.
2. Hold portrait: the rotation prompt must block gameplay. Rotate to landscape to reveal HQ.
3. Tap a facility, check its prerequisites and cost, construct it, then close and reopen after its timer.
4. Verify resources, production and the new model; pan/zoom without accidentally selecting a building.
5. ATTACK a newly unlocked network, deploy agents, claim once and return to HQ. Reload to confirm balances persist.
6. Upgrade Training/Research and compare agent power in a subsequent raid.
7. Add to Home Screen or launch the existing shortcut and repeat rotation, safe-area and audio checks.

## Limits

This release uses fixed building lots and automatically supplied unlocked squads, not free placement or a separate training queue. There are six agents and eight networks; Drone/Siege agents and defensive drones are deferred. All networks share the existing outer battlefield bounds while their occupied compounds and defenses grow. Prototype timers and economy need longer-term balancing.

Actual iPhone Safari/Home Screen safe areas, touch feel, audio resume and sustained GPU performance require physical-device validation; desktop viewport checks cannot certify those. iOS retains control of rotation and system chrome. Production builds retain the existing large Three.js chunk warning. No public deployment, paid API calls, PvP or unrelated project changes were made.
