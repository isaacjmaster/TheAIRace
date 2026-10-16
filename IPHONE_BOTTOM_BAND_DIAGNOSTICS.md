# Bottom-band investigation — awaiting physical iPhone evidence

No layout fix is claimed or applied. Checkpoint: d764b69; baseline release: 20af739.

## Exact active hierarchy

- html/body: 100% height, zero margin, overflow hidden, sky-blue background.
- #root: relative; 100vh fallback, legacy innerHeight fallback, then 100dvh; no padding; overflow hidden.
- .race-app.foundation-app: absolute inset 0, height 100%, no padding.
- .studio-splash and .race-menu: absolute inset 0, height auto. Their safe-area padding protects content, not their backgrounds.
- .game-session: absolute inset 0, height 100%.
- .foundation-home and .foundation-world: absolute inset 0, no safe-area padding.
- canvas: block, width/height 100%; Three.js ResizeObserver reads host.clientWidth/clientHeight, updates drawing buffer and camera. No separate bottom canvas margin.
- HUD buttons use safe-area bottom offsets, not whole-scene padding. Audio uses fixed positioning; it does not size the shell.
- All startup/page base colors are #b5eafa. Title gradient and rendered terrain differ from that base, so exposed root/body or native sampled background could look like a solid band. Color alone cannot identify its owner.

The whole visual chain can be short if WebKit's dvh is short. Conversely, a complete DOM viewport can still sit above native UI. Neither is established on this iPhone yet.

## Maze Sprint reference (read-only)

Inspected Documents/MazeSprint/apps/web/index.html, src/styles.css and src/ui/styles.css. Same viewport-fit=cover. Its canvas is a direct body child with 100vh followed by 100dvh; HTML/body are 100% high with overflow hidden. Its absolute UI overlay uses dynamic height and safe-area padding. No manifest link, standalone detection, or Apple standalone metadata appears in the inspected HTML. AI Race explicitly declares standalone mode and Apple status-bar-style=default and adds a root/absolute shell hierarchy. Thus the screenshots do not prove both games run in the same iOS mode. Maze Sprint was not modified.

## Relevant WebKit evidence, not a device diagnosis

- https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/ defines small, large and dynamic viewport units. svh is not necessarily the currently available height; vh/lvh can exceed Safari's viewport when browser chrome is expanded.
- https://bugs.webkit.org/show_bug.cgi?id=254868 reports installed apps with viewport-fit=cover where svh, fill-available and visualViewport dimensions exclude safe areas; reports also distinguish absolute and fixed positioning. This does not establish which values are wrong on this device.
- https://bugs.webkit.org/show_bug.cgi?id=236445 reports Home Screen safe-area differences from Safari.
- https://bugs.webkit.org/show_bug.cgi?id=301994 reports version-dependent Home Screen status-bar restrictions; some reports describe native regions unreachable by DOM. This is primarily a top/status-bar issue and must not be assumed to explain this bottom band.

Do not blindly add safe-area height or screen.height to dvh: this may create overflow, cover controls or paint beneath actual Safari chrome. visualViewport also changes with keyboard and zoom. A physical-screen minus viewport difference alone is not a CSS gap.

## Local diagnostic page

http://192.168.1.40:5173/diagnostics (same Wi-Fi; computer/server must remain running).

Only Vite development mode loads the diagnostic module. The normal / URL has no panel. Production excludes the module and dev manifest route; production asset hashes remain identical to release 20af739. No upload endpoint, storage reads, cookies, URLs, names or save fields are included in reports. Only geometry, computed CSS, mode and parsed iOS version are collected. At most 24 snapshots remain in memory; reloading clears them. Invisible, out-of-flow probes measure vh/svh/lvh/dvh/100% and fixed-inset independently without resizing the game. The small top diagnostic panel is an inspector, not a bottom-band cover.

Snapshots include startup, phase/viewport changes and manual captures. Copy uses the Clipboard API where available, with selection/copy fallback for local HTTP. The read-only text box supports manual Copy if iOS blocks programmatic copying.

## Physical-device procedure

1. Open the local diagnostic URL in Safari. Wait for title, open Display diagnostics, tap Capture band visible if present and Copy report. Paste it into the chat labeled Safari title. Hide the panel for a screenshot that includes the entire device screen and band.
2. Tap PLAY, repeat in HQ. Change toolbar visibility if possible, rotate back to portrait and background/resume; capture again if the band changes. Do not reset progress.
3. From that diagnostic URL use Share → Add to Home Screen. Name the separate shortcut AI Race Display Test. Keep the existing live installation. The local dev manifest uses /diagnostics as start_url so the panel survives Home Screen launches.
4. Launch the new shortcut. Verify the panel says standalone. If it says browser or the diagnostics button is missing, report that; do not treat this as a standalone test. Capture title and HQ again, especially after fully closing and reopening the test app.
5. Send the reports and matching screenshots, plus iOS version if the report cannot detect it. Do not clear website data or remove the live app. The local test is a separate origin from Railway and may show different existing progress; production progress is not imported or reset.

Local HTTP installations may behave differently on some iOS versions. If the local shortcut cannot enter standalone or does not reproduce the live symptom, a separately approved HTTPS diagnostic deployment may be needed; none has been created.

## Decision criteria after measurements

- Root bottom below inner/visual viewport bottom: compare dvh probe with fixed-inset/100% probes to test a root-sizing cause.
- Root fills viewport but a child/canvas ends early: identify first diverging ancestor; fix that element's sizing.
- Canvas fills viewport and edge hit tests include it: compare screenshot band boundaries; consider canvas content or region outside the web layer, not extra div padding by default.
- Native region: confirm against actual screenshot, mode, offsets, iOS version and independent probes. Screen dimensions alone cannot assign all missing space to the bottom.

## Validation completed

130 tests passed; production build and smoke test passed (including persistent GPU purchase and duplicate prevention). Desktop browser capture/copy and local HTTP fallback verified. At 1280x720, HQ root and canvas both measure 720px with zero gaps and canvas at y=719. This is not physical Safari/PWA certification. No gameplay, database, palette, control layout, music, production metadata, Railway settings, or unrelated worktree changes.

Restart the diagnostic server from this worktree in PowerShell with:

    $env:AI_RACE_DEV_API='http://127.0.0.1:3012'
    npx vite --host 0.0.0.0 --port 5173 --strictPort

The existing backend must remain on port 3012 with its original database. Do not start a second backend against a different database for comparison.
