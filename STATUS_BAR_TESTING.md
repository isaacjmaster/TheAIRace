# Status bar phase test — candidate, not device-verified

The splash section was black while initial HTML, body/root paint, the phase background function, and manifest launch background were sky blue. The candidate makes initial page paint and manifest launch background #07090c, uses black for the splash phase, and restores #b5eafa for menu/game. The page background fade follows the existing 78%–100% interval of the two-second splash. The logo and its animation are untouched. Reduced motion skips the page animation.

Apple status-bar-style remains default; viewport-fit=cover, relative dvh root sizing, light color scheme, safe-area controls, manifest ID/start URL and all game code remain unchanged. theme-color follows the phase only as a browser hint. It is NOT relied upon as an iOS standalone status-bar control. Manifest theme_color stays blue for normal game appearance; background_color is a launch hint, not a runtime color API.

Apple documents default status style as placing web content below the status bar. black-translucent permits content beneath it, but changes the layout contract and glyph appearance; dynamic switching is not a documented dependable web API. The known-good installation used default. We intentionally do not switch it or claim status glyph contrast/painting is solved. If the OS retains a fixed status color or dark indicators on black, this candidate does not meet acceptance and must not ship. On such versions a fully black splash plus unchanged blue menu status appearance may not be achievable with the current supported status style. A permanently translucent style would need a separate fresh-install experiment and may compromise contrast on blue or regress the bottom edge.

References:
- https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html
- https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- https://bugs.webkit.org/show_bug.cgi?id=236445

## Isolated physical test

Build: node scripts/build-status-bar-test.mjs
Server: node --import tsx scripts/serve-status-bar-test.ts (127.0.0.1:5186)
Use the temporary HTTPS tunnel URL supplied in chat. Add it as a NEW Home Screen app named Status Bar Test; do not remove the production or previous working test installation, clear cookies, or Reset Progress. A separate origin and data/status-bar-test/isolated-test.sqlite keep progress isolated. The previous data/display-test build is not overwritten.

1. Add the HTTPS page to Home Screen from Safari. Launch the NEW icon, not the Safari tab. Record the launch with iOS screen recording if possible.
2. During Master Studios: check the top area is black and time, signal and battery remain legible.
3. During fade: check top and content change together, then become the existing light blue with readable indicators.
4. Enter HQ: check the entire bottom edge/home indicator, pan/zoom, rotate and return, and close/reopen. No blue/black bottom strip or scrolling should appear.
5. After the intro, open Display diagnostics and Copy Report. Confirm mode=standalone. Send that report and describe the status icons/edge behavior; DOM reports cannot measure pixels painted by iOS itself. If needed send a recording.
6. Also open the test in Safari as a separate comparison; its native toolbar is expected.

Do not delete/reinstall the production icon. New installations can receive a different anonymous save session. The test has its own disposable progress and is not a production migration.

No physical iPhone result has been collected yet. Desktop/render checks cannot certify the OS status bar. No GitHub push or Railway deployment is authorized by this test.

## Physical result — October 16, 2026
The user confirmed the isolated HTTPS Home Screen test displayed the intro fully black and approved publishing the matching application changes. Earlier candidate/unverified notes above describe the pre-test state. Preserve this test build as the verified reference; diagnostics and the test entry remain development-only.
