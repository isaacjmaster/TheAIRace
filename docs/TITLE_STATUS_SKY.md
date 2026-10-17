# Ava title status-bar sky match (local only)

## Evidence and approach

The title phase still used HQ blue `#b5eafa` in `SCREEN_BACKGROUNDS`, the title
container fallback, and the final studio page-paint keyframe. The new illustration
has a substantially different sky. Sampling the portrait WebP's upper 50 pixels
between x=75 and x=865 yields RGB (88,187,253), or `#58bbfd`. This confirms an
app-side mismatch; the actual native status region must still be checked on iPhone.

The app retains `viewport-fit=cover`, default Apple status-bar style, light color
scheme, standalone manifest, portrait orientation and the existing viewport sizing.
Apple documents default mode as normal status-bar appearance with page content
below the status bar. Changing to black-translucent changes the layout contract and
is deliberately avoided after the previous bottom-strip/legibility fixes.

The safe fallback is to match the phase-aware real page paint to the artwork, rather
than assume dynamic theme-color can control an installed iOS status bar. A standard
theme-color update remains supplementary, as before. Status glyph styling remains
under iOS control; no runtime status-bar-style switch or simulated system UI is added.

## Changes

- Title only: `SCREEN_BACKGROUNDS.menu = #58bbfd`; studio stays `#07090c`, HQ stays
  `#b5eafa`. html/body/root/app continue to share the existing page background variable.
- `--title-sky-color` synchronizes the title's fallback and the studio page-paint
  fade endpoint, eliminating the old HQ-blue transition endpoint.
- Standalone portrait only: a small gradient inside the artwork's top edge blends
  the sampled page color into the unchanged image. Its height uses the larger of
  24px and the top safe-area inset. This is an artwork-edge treatment, not a fixed
  status-bar cover or viewport spacer. No bottom layer, height correction, viewport
  offset, forced scroll, crop adjustment or artwork replacement is introduced.
- Manifest/theme defaults remain HQ blue; manifest launch background remains black.
  Identity, manifest ID/start URL, icons, Apple metadata and production config unchanged.

## Verification

203 automated tests passed, including a new phase-cycle regression test. Production
build and isolated startup/restart smoke passed. Silent Chromium checks at iPhone
portrait sizes (320x568, 375x667, 390x844, 430x932, 390x650), landscape 844x390 and
desktop 1024x768, 1440x900, 1920x1080, 800x600 checked:
- Actual root layers black at intro, RGB(88,187,253) at menu and RGB(181,234,250) in HQ.
- Title artwork starts at y=0 and covers the full available app height.
- No document overflow or button clipping; Play, return, recovery and animation work.
- Reduced-motion mode and existing icon response checks still pass.

Chromium did not support overriding display-mode:standalone via its emulation API;
therefore these results do NOT verify the standalone-only gradient or native iOS
status bar. Physical HTTPS Home Screen testing remains required. Browsers/contexts
and disposable QA databases/servers were cleaned up. No push or Railway deployment.

## Isolated physical review

A frozen frontend snapshot and separate test database/cookie are prepared at
http://192.168.1.40:3018/ (same Wi-Fi). The installed test name is AI Race Sky Test,
with separate manifest identity. No production or earlier local save is imported.
LAN HTTP checks Safari layout only; it is not proof of true installed PWA behavior.
Temporary public HTTPS exposure requires user approval before the tunnel is started.

For an approved HTTPS test:
1. Open the test URL in iPhone Safari, then Share -> Add to Home Screen. Keep the
   production app installed. Launch AI Race Sky Test from its own icon.
2. Fully close/reopen the test app. Check black Master Studios intro (including top),
   then illustrated title: the native upper region should blend into its sky without
   the old pale strip, while clock/signal/battery stay readable.
3. Tap Play: HQ must return to its existing pale-blue top region. Use Settings ->
   Main Menu to check the reverse transition. Repeat after background/resume.
4. Inspect the home-indicator area on every screen for any new bottom strip; check
   controls remain safely inset. Do not clear browser data or reset a real company.
5. If the top stays pale, report a screenshot, iOS version, whether it was a fresh
   test installation and whether the intro/HQ colors matched. Do not claim resolution
   from a browser-mode screenshot or attempt another viewport workaround blindly.

References:
- Apple status-bar layout semantics: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html
- A version-specific WebKit report illustrates why theme-color alone is insufficient,
  but is not assumed to describe this user's iOS version:
  https://bugs.webkit.org/show_bug.cgi?id=305546
