# Minimalist Foundation Reset

## Active foundation

The app now opens a separate, intentionally minimal game: Garage Intelligence, Level 1; one laptop; one tiny AI character; one visible Builder Bot; and 100 Compute with a displayed capacity of 1,000. There is no passive production, spending loop, garage upgrade, secondary facility, reserved secondary lot, troop selection or playable raid in this foundation.

The HQ reuses the original 3D garage, navy/cyan landscape, trees, rocks, paths, lighting and Builder Bot. Camera drag/pinch and wheel zoom remain. Secondary equipment/debris scenery and the delivery station are hidden. Buildings, placement, clearing and construction implementations remain recoverable in source and Git; their active interactions are parked while this foundation is designed one building at a time.

The four corner UI elements are level/name/1/1 Builders, Compute storage, ATTACK and SETTINGS. Attack displays a non-playable placeholder. Settings contains Reset Progress and Main Menu, plus a close control. Reset requires an explicit irreversible-action confirmation; Cancel receives initial focus. Main Menu preserves progress. Sound/music and the original studio/title remain; mute is on the title screen to keep the requested gameplay HUD and two-option Settings menu minimal.

## Preservation

Pre-reset checkpoint: `99ce202`. Original 0.9 release: `d9bf66a`.

Consistent database backup: `data/backups/pre-foundation.sqlite`.

Foundation data uses a new `foundation_saves` table and `airace_foundation_session` cookie. Older session, economy, construction, raid and reward records are not migrated, overwritten or deleted. Reset replaces only the current foundation row. Revision checks reject stale/double reset submissions. A foundation session cannot access retired gameplay APIs through old links or stale tabs. Other projects/worktrees were not modified; nothing was pushed or deployed.

## Verification

- Full suite: 117 tests passed, zero failed.
- After adding the stale-tab API guard: all 3 focused foundation tests passed again.
- Final integrated production build passed; retained standalone raid build passed.
- Tests verify the exact initial state, isolated cookies/table, confirmation requirement, stale revision rejection, durable reset, separate-player saves, blocked legacy raid access, and untouched legacy/unrelated records.
- Browser checks at 844x390 landscape and 390x844 portrait: uncluttered four-corner HUD, one garage and builder, no secondary lots or troops, Attack placeholder, Settings, reset warning/cancellation, Main Menu return, stable 100 Compute, and portrait rotation gate. Reset execution was tested against an isolated test database; the live browser check canceled it.
- Existing large Three.js bundle warning remains. Physical iPhone Safari/Home Screen safe areas, touch/audio behavior and sustained GPU performance require real-device testing.

## Local play

Desktop: http://localhost:3012

iPhone on the same Wi-Fi: http://192.168.1.40:3012

Keep the computer awake and server running. Launch Safari or the existing Home Screen shortcut, press PLAY, and hold landscape. Pan/pinch the world; inspect ATTACK; use SETTINGS to return to Main Menu. Reset Progress affects only this foundation after its confirmation. To mute, use the sound control on the title screen.

Restart from the integrated worktree:

```powershell
npm.cmd run build
$env:PORT='3012'
npm.cmd start
```

## HQ Simplification Patch

The active HUD now shows a fixed Company label with the saved level, plus a separate bordered Builder Bot box. Availability is total builders minus occupied builders (`buildersBusy`, defaulting to zero for older foundation saves). No saved company name is overwritten or editable in the active interface. The mint AI character is removed from the HQ scene; Builder Bot models, work animation and construction code remain unchanged. Compute, camera, terrain, audio, menus and orientation behavior remain unchanged.

Validation: 10 focused tests passed (dynamic HUD rendering, save/reset isolation and construction/placement regressions); production build passed. Browser inspection at 844x390 confirmed the two compact boxes, unchanged Compute and corner buttons, no mint character and one visible Builder Bot. Physical iPhone touch/performance still requires device testing. The minimalist foundation still has no active construction purchase flow; this patch does not introduce one.
