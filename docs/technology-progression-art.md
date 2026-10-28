# Five-stage technology art

This release replaces the previous lateral material variants with progressively enclosed, reinforced and energy-integrated equipment. It changes visual assets only. Shared rules, server code, account data, economy, housing, construction timers and combat balance are unchanged.

| Level | Construction | Surface treatment |
| --- | --- | --- |
| 1 | Utility mechanisms and composite panels | Matte, modest copper |
| 2 | Industrial housings and complete docking equipment | Satin steel and copper |
| 3 | Chamfered armor, reinforced vaults and precision collars | Forged alloy and selective brass |
| 4 | Insulated equipment, containment and conductive channels | Ceramic, polished metal, functional energy |
| 5 | Integrated focusing assemblies and secure high-density modules | Graphite, platinum framing, faceted composites |

All eleven upgradeable families use the integrated model generators. Builder Huts and troops are unchanged. `TechnologyMaterials` supplies shared per-scene finish recipes and centered chamfered housings. These remain under WorldKit's geometry/material disposal lifecycle. Walls use inexpensive flat inset bands, material batches and unchanged owner-level half connections. No new dynamic lights or real-time reflection/refraction passes.

Sentinel yaw, pitch, recoil and muzzle remain in the original hierarchy; its five emitters retain the same discharge point. Arc retains its emitter anchor and simulation-driven jam/charge animation. GPU fans and cable ports, Fabricator arm/rotor names, assembly ownership and Hangar resident batches remain intact. All mechanical authority remains in the existing simulation.

Review scripts:

- `review-five-tier-art.mjs`: identical production campus lighting/camera/scale, effects-off and phone-scale sheets, connected wall layouts, animated equipment. Optional REVIEW_OUT and REVIEW_PAGE support released-source comparisons.
- `review-visual-rework-campus.ts`: isolated full-application campus captures and frame measurements; optional REVIEW_OUT.
- `review-storage-progression.ts`: isolated real UI upgrades, capacity checks before/after completion and repeated reloads; optional REVIEW_OUT.
- `review-five-tier-combat.ts`: real scene and simulation, desktop/phone captures at Levels 4 and 5.
- `review-technology-arrangement.ts`: desktop/phone rotation, grid snapping, save/reload, level and capacity preservation.
- `report-technology-progression.mjs`: local review gallery, per-adjacent-tier explanations and recorded measurements.

Every game test URL uses testAudio=off. Tests use synthetic accounts and in-memory databases; contexts close in finally blocks.

Validation: 736 automated tests, production build and isolated production persistence smoke pass. Browser measurements and screenshots are saved under output/Technology_Review, which is intentionally excluded from commits. No physical iPhone or independent blind-review claim is made. Conductive glass is represented through opaque facets and surface contrast to keep dense campuses bounded; no expensive optical shader is introduced.

Deployment follows the existing Railway branch and verified startup-backup workflow; this visual release requires no new save migration.
