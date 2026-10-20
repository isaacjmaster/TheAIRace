# Search, squad infiltration, wall breaching and encounter header

## New flow and interface

- INFILTRATE opens a minimal animated scanner, waits 2.4 seconds, then requests a server-selected fictional opponent. The search action and its receipt are independent of the presentation timer. Cancelling before a request creates no mission; cancelling an in-flight successful request abandons the ready mission safely. Zero-bot companies see a compact training empty state. Existing active missions resume.
- The rival username is centered on the entire viewport. Its small muted hashtag remains separate. The old header card/X are gone. A separate accessible Retreat icon respects the top-right safe area. Before deployment it abandons safely without confirmation or troop consumption. Active missions require a compact confirmation; repeated submission is blocked until the server responds.
- Floating building labels and the separate hacking panel are removed. Predicted server work drives small camera-anchored progress bars above the target building or wall. Cipher Bots use a two-arm hacking motion and a data beam; wall work uses a mechanical attack motion.

## Squad authority and balance

- New operations capture a versioned squad snapshot. Searching never deducts inventory. Every accepted deployment deducts exactly one available trained bot in the existing BEGIN IMMEDIATE/action-receipt transaction. Additional placements remain available during the mission until stock is empty or the mission ends. There is no UI hardcoded troop limit; isolated API tests deploy 15 legitimately seeded available units.
- Each bot has a permanent mission-local ID, health, path, cargo and returned/lost reservation status. Hangar capacity includes all deployed reservations. Successful surviving bots are returned once at settlement. Intercepted or still-active retreating bots are lost. Already extracted survivors remain safe on retreat, but abandonment banks no loot or Influence.
- Shared building progress and a single hacked-asset receipt prevent duplicate loot. Cargo belongs to the completing worker and must reach extraction. Lost cargo is discarded. Influence requires actual extracted value and still uses the existing per-target two-hour cooldown and amounts.
- Configurable SQUAD_BALANCE: 42 integrity; drone laser damage 18 with a minimum 750 ms interval, immediate lock-on within clear sight; hacking work takes 2.5× the former solo duration, with up to three cooperating workers. Each worker returns after one completed objective. A single bot can take a small unprotected cache, but cannot clear the whole campus. Ten bots can complete the first compound in the deterministic distributed-deployment test. The second compound is deliberately more dangerous.
- The mission clock remains three minutes and starts only on first placement. A three-second end grace permits reinforcements after the last active bot leaves. Retry scheduling uses elapsed server timestamps, including non-rounded real-world clocks.

## Security-wall breaching

- Cipher Bots compare the normal objective path against direct distance. They use nearby gates. If a solid wall forces more than six units of extra travel, or the objective is fully enclosed, they approach a reachable wall face and attack a modular panel.
- Each panel has 72 mission-local integrity. Each working bot contributes 18 damage/second (four seconds solo). Damage is shared, persistent, and applied on authoritative fixed ticks. Once breached, the matching panel disappears and navigation/laser sight lines use the same opening. Bots then continue to objectives.
- Original target wall descriptors remain intact; a persistent breached-ID list records changes. Only fictional mission snapshots are affected. Purchased HQ walls, player saves and their placement are unchanged.

## Environment and compatibility

- Captured enemy compounds use Level 2 HQ presentation, a Security Drone Station, small walkways/planters, slightly more spacious objective composition and stepped modular defenses. Existing building models are reused.
- Ten varied surrounding properties, a connected neighborhood street loop and adaptive four/eight-car traffic provide city context. The former radial blue material fade is removed. The existing stylized textured cloud-sea technique is reused outside the nearby neighborhood, with distant fog rather than a close flat fade.
- Decorative geometry never joins gameplay hit lists. Cloud animation and traffic pause while hidden. Mobile DPR/pixel-budget caps remain. Units share geometry/material caches; wall meshes rebuild only on a new breach.
- No SQL schema migration, company reset or production volume edit is required. Old active one-agent snapshots retain their original simulation and inventory semantics. Legacy-version API regression fixtures deliberately exercise those saved-operation rules; new integration tests use the actual default squad factory. Both cached legacy start requests and the new search endpoint create balanced squad missions in production.
- Player identity, recovery, buildings, production, resources, XP and leaderboard associations remain unchanged. Targets are still fictional; this is not real-player matchmaking.

## Verification

- 366 automated tests passed, including nine new squad cases: server matching, 15 concurrent deployments, retries, zero bots, mixed survival/loss, cooperative rewards, nearby gates versus remote breaches, fully enclosed targets, immediate laser acquisition, shared progress, recovery/SQLite restart and a real-clock reinforcement regression.
- Production build and isolated production smoke passed. The existing large-bundle advisory remains.
- Chrome: 390×844, 844×390, 1440×900, 900×700. WebKit: 390×844 and 844×390. Verified the actual text bounds are centered, safe ready retreat, active confirmation, automatic search, multi-bot placement, clear world bars/no labels, natural camera pan, refresh during a mission, successful extraction and inventory settlement.
- Additional browser checks passed for in-flight search cancellation, zero-bot empty state, a 16-character rival label and reduced motion.
- Browser screenshots are in ignored data/squad-media. Physical iPhone Safari/PWA testing was not performed; desktop-hosted WebKit is not a substitute. Device performance and balance should receive the next real playtest pass.

Local isolated preview: `node --import tsx scripts/preview-squads.ts` after building; http://localhost:3059/simple-preview/hq?testAudio=off or same-Wi-Fi http://192.168.1.40:3059/simple-preview/hq?testAudio=off . Direct lumen/vector fixtures are also available. Preview data uses data/squad-preview.sqlite and is never included in production routes.
