# Approved Security Walls: five-level visual replacement

The October 28 approved reference is implemented through `securityWallModel` and
`SecurityWalls`, shared by campus, visits, infiltration, replay, placement and
model-derived menu thumbnails. No gameplay configuration or save migration changes.
The existing layout-save compatibility hotfix remains included in the branch.

## Art and connection rules

1. Warm composite panels, squared supports, dark footing and low cyan strip.
2. Gray alloy courses, dark reinforced supports and inset cyan indicators.
3. Light armor, substantial gold supports, gold shoulders/feet and cyan channel.
4. Faceted blue infill, pale mounting collars, blue diamonds and cyan channels.
5. Light armor, dark alloy posts, gold framing, violet diamonds and purple channels.

The reference's long spans adapt to the existing one-tile grid. One-tile previews
have compact but deep supports. Connected runs use supports at endpoints, turns,
junctions and every third grid coordinate; half-integer grid coordinates are tested.
Half-panels always retain their owner's level. Barrier body heights remain unchanged;
decorative crystals reach at most 1.984 units at the default 1.2-unit wall height.
These finials do not participate in collision, targeting or defensive abilities.

## Rendering

Geometry is cached in WorldKit and merged by shared material. Each wall batch has
one time uniform; shader sampling of world position offsets the gentle flowing
channel pulse, crystal shimmer and occasional Level 5 channel activity. Reduced
motion disables modulation. There are no dynamic lights or per-wall particles.
Opaque faceted materials avoid layered transparency costs. All resources are owned
and disposed by the existing scene lifecycle.

The game adaptation has simpler surface detail and less glow than the painted
reference. Crystals use opaque shaded facets rather than refraction or bloom.
Connected piers are spaced instead of repeating two large posts on every tile.

## Verification

- Full game suite: 797 passing tests.
- Production build and isolated production startup/persistence smoke passed.
- Desktop and 390 x 844 phone viewport layout flow: 100 placements, 80 auto-advance
  clicks, partial save of 60 walls with 40 retained, reload, cancellation recovery,
  simulated network failure/retry, full completion and exact mixed levels preserved.
- Render regressions: one-tile bounds, all connection shapes, mixed levels,
  half-grid piers, 200-wall material batching, immutable inputs and GPU disposal.
- Browser captures: no page errors; both energy animations change actual pixels;
  reduced motion produces identical images at different timestamps.

Dense 200-wall stress results in headless Edge on the Windows development host:

| Level | Before draw calls | After draw calls | Before triangles | After triangles |
| --- | ---: | ---: | ---: | ---: |
| 4 | 6 | 15 | 191,200 | 426,560 |
| 5 | 8 | 15 | 309,600 | 457,600 |

Counts include render/shadow passes. Median frame interval was 13.3 ms and P95
13.4 ms before and after over 180 measured frames, at desktop and phone viewport
sizes. This refresh-paced host measurement does not establish physical iPhone GPU
performance. Full HQ5 campus with 200 walls measured 13.3/13.4 ms, 905 calls and
640,522 triangles at the phone viewport. Geometry cost increased to provide the
approved detail; material batch count stays independent of wall count.

## Reproducing the review

`node scripts/review-approved-walls.mjs --before` captures the preserved 503f254
baseline. Run without `--before` for current models and silent animation clips.
`npx tsx scripts/review-approved-wall-campus.ts` captures isolated full campuses.
`node scripts/report-approved-walls.mjs` builds `output/Approved_Walls/index.html`.
All game previews include `testAudio=off` and all test contexts close in finally
blocks. Test accounts use in-memory databases; production player records are untouched.
