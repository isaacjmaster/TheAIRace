# Infiltration troop-card and mission-supply patch

## Changes

The deployment control is now a compact rounded vertical navy/teal card, with a 512x640 transparent portrait rendered directly from the current Cipher Bot Three.js model and a legible count badge. The portrait is 122 KB. Selection, focus, pressed and disabled states remain; the count reaches zero and uses the current mission supply, not all stored troops. Landscape uses a smaller card with the same mobile tap behavior.

The cloned placement model, its translucent materials and its render/update/dispose paths were removed. The shared valid-deployment lawn visualization and server placement validation remain. Confirmed deployments retain their existing spawn ripple and real model.

Maximum zoom-out is capped at .83 of the fitted arena view (previously .95), with a tighter projected-ground safety budget. Close inspection is unchanged. Six varied small neighboring properties, connected road loops, sidewalks and planted edges extend the compact neighborhood. The player's HQ renderer and gameplay are unchanged.

Rival properties have three to four non-interactive details: trees, a rock cluster and a scrap pile, reusing landscapeModel. Read-only placement rejects buildings/walls, objective access and canonical agent/drone routes. These decorations do not enter navigation solids, targeting, clearing, economy or save state. They cannot add loot or block a required gameplay path.

## Server-authoritative mission supply

At mission creation, squad.undeployed captures the legitimate available troop inventory. Unused troops remain in company stock; they are not deducted or treated as deployed. Each accepted deployment decrements stock and the saved mission supply exactly once inside the existing serialized command transaction. Idempotent action receipts prevent double consumption. Extra trained stock cannot inflate an existing mission's original supply. Existing active squad saves missing this field are initialized from their actual remaining stored troops once, without changing any account resources.

Zero live agents only causes defeat when undeployed is also zero. The timer keeps running while unused troops remain, allowing deliberate sequential reinforcement. Victory still resolves immediately on the final hack, regardless of unused supply. Retreat and timeout retain existing forfeit rules; unused troops are never consumed. Survivors return through the existing once-only settlement. No combat stats, hacking rates, costs, caps, rewards or timers were changed.

## Verification

- 384 automated tests passed, zero failures.
- New explicit tests cover ten sequential deployments and defeat only after the tenth loss; multiple lost agents with unused stock; simultaneous serialized requests; duplicate receipts; immediate victory with unused troops; retreat and timeout; active-save backfill; recovery and process restart after a real first bot death; duplicate reward prevention; and decorative placement safety.
- Full production build passed (existing bundle-size advisory remains).
- Isolated production smoke passed, including restart persistence and duplicate purchase rejection.
- Chrome and WebKit at 390x844 portrait, 844x390 landscape, 1440x900 desktop: rectangular portrait loaded, correct count, selection, zero ghost, decorative details, zoom limits, panning, placement, refresh and retreat verified.
- Recorded real browser flow at 390x844: deployed one bot, drone destroyed it naturally, mission remained active with nine unused; refreshed; deployed a second via touchscreen; eight unused remained and were preserved on retreat.
- Agent game previews used testAudio=off and all browser contexts were closed. Test databases are isolated; no production data or unrelated projects were changed.
- No physical iPhone/PWA or native desktop-shell test is claimed.

## Preview and media

Run `npm run build`, then `node --import tsx scripts/preview-card.ts`.
Same-Wi-Fi preview: http://192.168.1.40:3062/simple-preview/vector?tutorial=done&testAudio=off
Isolated first-loss demonstration: /simple-preview/reinforce?tutorial=done&testAudio=off
Data: data/card-preview.sqlite. Every fixture URL creates an isolated test company.
Screenshots and the reinforcement recording are in data/card-media/. The patch is approved for GitHub/Railway release by the task request.
