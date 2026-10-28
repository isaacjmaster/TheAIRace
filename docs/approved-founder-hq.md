# Approved Founder HQ progression

The October 28 approved reference is implemented as real geometry in `HqArchitecture.ts`, used by the existing Founder HQ constructor in campus, visits, arrangement, previews, infiltration and replay scenes. Saved levels choose the corresponding model; no migration or gameplay configuration changed.

| Level | Architecture |
| --- | --- |
| 1 | Ceramic startup command building, graphite footing, amber entry, low computing vent and cyan mast |
| 2 | Reinforced corner armor, divided industrial facade, raised computing module and additional communications |
| 3 | Gold structural pylons, stepped roof terrace and segmented cyan circular apparatus |
| 4 | Pale armored containment platform, faceted blue hemisphere, satellite dishes and blue communications |
| 5 | Graphite/gold structure, violet circulating containment core and articulated tapered command spire |

The founder's open office, desk, laptop, typing, coffee animation and power connection remain. Infiltration now passes the actual nested HQ model to the founder animation rather than its wrapper, fixing an existing silent animation no-op. Destroyed buildings skip ambient updates.

Static architecture is batched by material. Custom hemisphere/dish geometries use the WorldKit cache and disposal lifecycle. Animated materials are instance-owned; reduced motion resets energy circulation and illumination to a stable state. No dynamic lights or simulation-dependent effects were added.

## Verification

- Full regression suite: 800 passed before final decorative refinement; focused final model checks recorded separately in the review artifacts.
- Production build and isolated production startup/persistence smoke passed.
- Actual renderer review at `output/Approved_HQ/index.html`: baseline and final five-level comparisons, founder closeups, high-level details, silent clips and desktop/phone campus views.
- Single-HQ renderer draw calls, levels 1–5: baseline 86/86/92/91/93; final 82/84/88/92/100. Triangles: final 18,970/22,110/26,842/27,922/29,130 (including review lighting/shadows).
- Measured desktop preview frame pacing remained 13.3 ms median / 13.4 ms p95. These are local automated-browser measurements, not physical iPhone or human-player validation.

## Adaptation limits

The supplied perspective does not define unseen rear geometry. Rear panels are inferred in the same architectural language. Small surface detail is simplified for gameplay scale; the blue dome uses triangular facets rather than the concept's irregular cells. The open founder office is preserved as requested instead of copying the reference's sealed front facade. Logical placement footprint, combat bounds and player progression are unchanged.
