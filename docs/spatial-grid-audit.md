# Campus spatial audit — 28 October 2026

## Existing authoritative model

`shared/placement-grid.ts` already defines one world-unit tile, origin `(0, 0)`, and integer cell edges. Odd-width footprints therefore have half-integer centers; even-width footprints have integer centers. This is intentional, not an alignment defect. `snapFootprint`, `onFootprintGrid`, and `occupiedCells` share that convention. Quarter-turn rotation swaps width/depth before snapping. Saved positions are world-space X/Z centers plus orientation 0–3.

`shared/foundation-plot.ts` bounds are X −34 to 38 and Z −27 to 32. `shared/foundation.ts:placementFootprint` defines the current construction occupancy:

| Building | Width × depth, orientation 0 |
| --- | --- |
| Founder HQ | 9 × 10 |
| GPU Rigs | 5 × 3 |
| Builder Station / Hut | 3 × 2 |
| Bot Fabricator | 4 × 3 |
| Bot Hangar, compound | 8 × 7 |
| Bot Hangar, older expanded size | 6 × 5 |
| Research Lab | 4 × 3 |
| Compute / Research Storage | 4 × 3 |
| Sentinel Tower / Arc Spire | 4 × 4 |
| Security Drone Station | 3 × 3 |
| Modern Security Wall | 1 × 1 |

All five visual tiers share these footprints. There is no modern global mandatory gap. Rectangle overlap tests allow exact edge adjacency. Obstacles and decorations have separate explicit footprints; placement does not require an arbitrary route to every decoration.

The physical `footprint` function also serves navigation/combat. It intentionally differs from construction occupancy for some structures (notably HQ front access, GPU body and Builder Hut). Replacing all physical bounds with construction bounds would change combat and routing; this update does not do so. The older campus coordinate model and historical building migration remain separate and unchanged.

## Verified defects corrected

1. Ordinary building placement checked existing Builder Huts using their 2.7 × 1.8 physical geometry while the full editor, walls, and decorations checked their 3 × 2 occupied cells. It now uses construction occupancy for modern saves, matching the other validation paths. Legacy rules remain intact.
2. Full-layout validation forced unchanged legacy walls to modern 1 × 1 occupancy and removed their legacy marker when saving. Unchanged saved walls now retain their exact original dimensions, marker, coordinates, rotation, and levels. An explicitly moved legacy wall alone adopts the current one-tile placement rule.
3. Full-layout validation could reject untouched older layouts for existing grid, boundary, obstacle, or pair-overlap conditions. Actual unchanged saved placements are preserved. Changed placements remain subject to current validation, including collisions with unchanged structures. Replacement inventory placeholders are never treated as grandfathered placements. Ownership, stale-draft, duplicate-ID, and partial-replacement checks remain enforced.
4. Both storage families had 3.8-unit-deep foundations inside a three-unit logical depth. Their foundations now measure 3.8 × 2.9, with hardware depth reduced by 14% to keep equipment within the existing cells. Width, height, materials, level identity, capacity, saved positions, and gameplay bounds remain unchanged. Contact decals now use 4 × 3 rather than 4 × 4.

## Geometry audit

Actual Three.js bounds were measured for every building family and all five levels. Before correction, storage was the only family extending beyond its construction rectangle. HQ remained within X ±4.34 and Z −3.35 to 4.35; rigs within X ±2.42 and Z −1.28 to 1.30; the other non-storage families also fit their existing rectangles. The new regression checks all 60 family/tier combinations in all four rotations, excluding decorative ground-contact decals. Static model creation does not include external power cables or runtime projectiles; those are not occupied architecture.

## Save and movement safety

No load-time mutation, coordinate migration, wall migration, account rewrite, or automatic rearrangement is introduced. Full-layout commits validate before changing authoritative ownership. Missing required buildings, unknown/duplicate IDs and stale fingerprints remain rejected. Pending replacements can still be saved partially; unplaced wall ownership and upgrade levels remain stored.

Friendly routing and infiltration continue using their existing physical bounds and deterministic navigation. Navigation geometry cache keys include obstacle/wall geometry, so removed walls change the routing geometry key. Drone guard positions, troops, research, resources, construction jobs, combat values and reward rules are untouched by these fixes.

## Recorded validation

- 18 focused tests passed across spatial legacy preservation, building-grid behavior, partial wall saving/API validation and draft recovery.
- 16 tests passed across model bounds, legacy preservation, building-level hooks and generation-energy lifecycle.
- The bounds regression covers 12 building kinds × five tiers × four rotations.
- Save regressions cover exact legacy wall round-trip through JSON, existing conflicting-layout preservation, atomic rejection of new conflicts and explicit conversion of only a moved legacy wall.

Rendering, editing overlay, terrain and incremental wall-connection validation are recorded separately by the integrated review. Headless tests are not physical iPhone performance measurements.
