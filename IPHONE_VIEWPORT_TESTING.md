# iPhone Safari and standalone viewport fix

Checkpoint: 5954d3b. No gameplay, save, scene, audio or Railway configuration changes. No push or deployment.

## Findings and changes

Confirmed in source: index.html previously had no paint/background rules before its module-loaded styles. Theme colors were changed after paint in a React effect. Layered 0.6/0.7 shell rules ultimately replaced dynamic viewport height with a fixed inset/percentage root, without listening to visualViewport changes. These are app-side sources of launch mismatches and stale sizing; the exact physical iPhone strip has not been reproduced on hardware here.

Critical inline HTML now paints the existing Master Studios #07090c background before JavaScript. A shared CSS variable colors html/body/root/app, and phase changes update it in a layout effect before paint. The existing splash, title gradient, logo, fade animation and HQ art are preserved. The intentional dark Master Studios screen is not a startup flash. No extra strip-covering overlay was added.

There is one shell sizing owner. Browser mode measures the visual viewport (at normal zoom), coalescing resize/scroll, orientation, pageshow and visibility events. Standalone mode uses the full 100dvh CSS viewport, with an innerHeight fallback on older engines. It does not subtract safe areas from the background. Existing safe-area padding protects controls; the studio mark now also respects those insets. Existing ResizeObserver resizes the 3D canvas/camera when its host changes. Rotation hides gameplay without unmounting it or resetting state.

The manifest already uses display standalone, landscape, and matching #07090c launch colors. Apple capable/title/black-translucent metadata and viewport-fit=cover were already present and were retained. No metadata refresh is required for this patch. A previously installed icon can retain older iOS launch snapshots/settings; first force-close and reopen after the update is available. Reinstall only if that stale OS state persists, and first preserve access to progress: an installed app's cookie identifies its save and removal/site-data clearing may lose that identity. Do not clear Safari data as a routine troubleshooting step.

Safari address/navigation bars, iOS status/home indicators, native launch snapshots, and any OS-reserved areas are system-controlled. CSS cannot remove them. This patch fits available browser content and fills permitted standalone regions. Real-device results vary by iOS version. References: https://webkit.org/blog/7929/designing-websites-for-iphone-x/ and https://webkit.org/blog/12669/new-webkit-features-in-safari-15-5/

## Verification

127 automated tests passed, including browser viewport changes, standalone versus browser sizing, fallback/zoom behavior and initial HTML/manifest color consistency. Production build passed. Desktop Chromium iframe layout checks exercised browser sizing and a separate navigator.standalone simulation: 390x664, 390x844, 844x290, 844x390, 932x430. Root/canvas matched viewport dimensions; no document overflow; landscape recovery retained the existing GPU Rig and 55 Compute. The standalone simulation does NOT reproduce WebKit, native Safari chrome, iOS launch snapshots or physical safe-area insets. Those remain physical-device acceptance checks.

## Physical iPhone acceptance checklist

Use the same origin as your existing save. Local test URL on the same Wi-Fi: http://192.168.1.40:3012. This fix is local only until a separately approved push/deployment.

1. Safari: fully reload in portrait. Watch from initial paint through MASTER STUDIOS to title. Expect the deliberate dark splash, then the unchanged blue title; no white flash, edge rectangle or jump. Tap Play: only the rotate prompt should appear.
2. Rotate both landscape directions. Check Company/Builders, Compute, Build, Attack and Settings clear the notch and home indicator. Inspect the entire lower canvas edge. Native Safari controls remain visible as iOS decides.
3. Expand/collapse Safari chrome where the OS permits, switch tabs and return, rotate repeatedly. Check the canvas refits, controls stay reachable, and the page cannot scroll into blank space. The game's non-scrolling canvas need not cause Safari to hide its toolbar.
4. Home Screen: launch the existing icon cold in portrait, then landscape; repeat while already holding landscape. Observe initial paint, splash fade and title edges. Play and rotate: prompt in portrait, same HQ in landscape. The home indicator remains, with background extending behind it wherever iOS allows.
5. Background/resume and force-close/reopen the Home Screen app. Verify no persistent bottom band, clipped controls, or changed GPU ownership/Compute. Open/close Build and Settings; collect available Compute once. Confirm audio still starts after interaction and mute remains remembered.
6. If a strip remains, record iPhone model, iOS version, Safari versus Home Screen, orientation, whether chrome is expanded, and a screenshot/screen recording from cold launch. This distinguishes app content from native inset/launch behavior before further changes.
