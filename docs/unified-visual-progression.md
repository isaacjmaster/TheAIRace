# Unified visual progression

Nine upgradeable building families now follow the approved HQ/wall technology generations without changing those two approved designs. Builder Stations are not upgradeable and remain unchanged.

| Level | Material and technology direction |
|---|---|
| 1 | Cream startup equipment, gunmetal, restrained orange hardware |
| 2 | Reinforced steel, expanded machinery, cyan indicators |
| 3 | Premium gold alloy, stronger mechanical framing |
| 4 | Pale armor, blue energy containment and charging systems |
| 5 | Graphite armor, gold framing, violet advanced energy |

Sentinel uses a real single hollow barrel, trunnions and rotating pedestal, progressing through gold yokes, blue muzzle clamps and elite violet channels. Its physical emitter, recoil, Target Lock and authoritative shot timing remain intact. Arc Spire retains its electrical identity while gaining progressively stronger coil arrays and containment armor.

GPU Rigs retain all three fans and cable connections while gaining cooling and accelerator machinery. Research Labs progress from reaction cells to containment and interferometer equipment. Compute Storage develops from open racks into protected dual-bank vaults; Research Storage retains purple knowledge cores within stronger containment vessels. Fabricators gain real tool crowns, Hangars gain charging and maintenance infrastructure around a clear yard, and Drone Stations retain open landing space within increasingly advanced support equipment.

## Rendering contracts

TechnologyMaterials centralizes tier materials. GenerationEnergy adds restrained, family-specific shader flow to selected L4/L5 illuminated surfaces. Each instance owns its animation uniforms and cloned materials, which WorldKit disposes. Reduced motion disables flow. No dynamic lights, new particles or full-model per-frame rebuilding are introduced. DamageFeedback retains shader hooks when cloning hit materials; destruction deliberately disables energy on compromised structures.

Campus, infiltration and title rendering share the progression models. Existing thumbnail caches are versioned. Training pulses, resident troops, landing/guard behavior, destruction events and model ports remain connected. Gameplay configuration, costs, training, housing, targeting, footprint dimensions and saved progression are unchanged.

## Validation and review

- 810 automated tests passed; production build and startup/persistence smoke passed.
- All nine five-level lineups captured with the actual renderer; all 18 high-level energy/reduced-motion checks passed.
- Full L1/L3/L5 campuses checked at desktop and iPhone-sized viewports, without browser errors.
- Four real-rule synthetic L4/L5 combat captures: seven Sentinel shots and confirmed Sentinel destruction each; matching outcomes across viewports and zero browser errors.
- Headless Edge campus frame intervals remained 13.3 ms median / 13.4 ms P95 before and after. Desktop L5 draw calls 993 → 990 and triangles 663,014 → 686,494; emulated phone L5 calls 912 → 915 and triangles 642,464 → 663,584. Combat median/P95: 13.3/13.5 ms.

These are refresh-paced local browser measurements, not physical iPhone performance or human playtesting. Fine concept surface wear is simplified; real-time silhouettes and machinery carry the progression. Geometry increases warrant subsequent physical-device profiling.

Run `node scripts/review-unified-progression.mjs --before`, then without `--before`, and `node scripts/report-unified-progression.mjs` for renderer evidence. Full-campus fixtures use `scripts/review-unified-campus.ts`; isolated databases and `testAudio=off` protect player data and audio preferences. Review artifacts are under `output/Unified_Progression/index.html`; approved HQ evidence is under `output/Approved_HQ/index.html`.
