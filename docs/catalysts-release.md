# Catalysts: currency and instant completion

## Economy and scope
- Canonical account wallet and append-only event ledger are separate from ordinary game progress.
- One opening grant of 100 for accounts without a prior balance. Existing valid balances, including zero, are preserved. Reset Progress and recovery retain the same wallet; repeated startup does not grant again.
- Catalysts cannot be produced, stored in buildings, or stolen in PvP. No purchase/payment implementation is enabled. The shop says Coming Soon.
- Construction, building/HQ upgrades, troop research and the current training unit can be finished. Training advances exactly one troop, shifts later deadlines by the time saved, and preserves order, durations and housing. Obstacle clearing is not included in this release because it has distinct travel/work/return phases.

## Pricing
Server remaining time determines `max(1, ceil(remainingSeconds / 150))`; completed jobs cost zero. The approved confirmation is a maximum: elapsed time can lower the debit, never increase it.

| Remaining | Catalysts |
|---|---:|
| 30 seconds | 1 |
| 2 minutes | 1 |
| 5 minutes | 2 |
| 10 minutes | 4 |
| 30 minutes | 12 |
| 1 hour | 24 |

Configuration: shared/catalyst-config.ts. Job enumeration/completion: shared/catalyst-jobs.ts. Wallet and audit: server/catalysts.ts.

## Integrity
Quotes and commands require the existing account authentication. Finish commands use the existing request receipt, generation check and immediate SQLite transaction. Balance debit, lifecycle completion, rewards and audit/save writes commit together or roll back. Stable training IDs keep stale quotes from finishing the next troop. The UI cannot supply balances or override price calculations. Invalid legacy balances stop migration for reconciliation.

A verified SQLite snapshot is created on the persistent volume before Catalyst migration. Existing game-save JSON is not rewritten by the opening-wallet migration. The wallet is mirrored into ordinary responses and normal saves afterward.

## Validation
- Full regression suite: 778 tests passed, zero failed.
- 21 focused Catalyst lifecycle/API/backup tests cover pricing boundaries, every eligible construction type, upgrades, all troop research types, mixed training, expired/stale jobs, duplicate requests, concurrent spend, insufficient funds, forged input, authentication/ownership, reset/recovery, save rollback and backup integrity.
- Real isolated full-game browser interactions at 390x844 and 1440x900: opening 100, shop, cancel without debit, construction, building upgrade, research, single-troop completion, reload persistence, insufficient funds to Coming Soon. Four completions leave 91. No browser errors or horizontal overflow.
- Phone dimensions are desktop browser emulation, not physical iPhone validation.
- Production build and startup smoke test are required before pushing. Existing large-bundle warning remains unrelated to this change.
- Tests use in-memory or temporary databases, silent testAudio=off URLs, and close browser contexts. Production accounts are not used for spending tests.

## Visual review
Optimized transparent Golden Crystal assets at 24–256px are in public/icons. The reusable component is CatalystIcon. 48px WebP is 1.6KB; 256px is 12.6KB.
Run `node --import tsx scripts/review-catalysts.ts` to reproduce the local browser review. Screenshots/check records are written to output/Catalysts. The HUD balance opens active timers; + opens the shop. Each confirmation explicitly identifies scope and price.
