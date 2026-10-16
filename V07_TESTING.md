# Mobile patch 0.7

Checkpoint: b86fc33. No models, environments, palette, economy, audio, save schema, server or raid mechanics changed.

## Changes and diagnosis
- App.tsx removes only the title period, switches page/theme background to the current screen, and keeps the same game session mounted behind an inert, hidden portrait gate. No playable portrait HQ or raid is exposed. Rotating back reveals the same navigation and battle. Raid time continues normally while the rotation prompt is displayed.
- mobile.ts detects portrait viewports up to 1024 CSS pixels wide (phones/tablets and narrow desktop windows). PLAY attempts landscape locking only when the function exists; rejection is harmless. The existing manifest already prefers landscape. Safari does not need to support locking for the prompt to work.
- identity.css gives the fixed root a single inset-based viewport size and lets child screens inherit it, replacing competing fixed-inset / 100dvh height constraints. Page backgrounds now match the current screen rather than staying black behind every screen. No bottom overlay, arbitrary pixel extension or subtraction of home-indicator space was added. Safe-area offsets still protect the controls.
- Existing viewport-fit=cover, standalone manifest, apple-mobile-web-app-capable and black-translucent status-bar metadata are appropriate and retained.

The reported iPhone Home Screen strip could not be reproduced on physical hardware here. The conflicting page sizing and persistent black backing are identified page-side contributors, not a proven diagnosis of that particular device. iOS may also retain launch metadata/snapshots or reserve system UI space outside the webpage. Web content cannot paint outside the viewport iOS grants it or remove the system home indicator.

References: https://webkit.org/blog/7929/designing-websites-for-iphone-x/ and https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock

## Verification
- 75 regression tests passed; production build passed. A focused orientation test covers missing API, rejected lock and successful landscape request. Existing Three.js bundle-size warning remains.
- Browser viewport simulation at 390x844 and 844x390: title has no period; portrait PLAY shows only rotation prompt and sound; landscape reveals existing HQ. Active raid deployed one Tank, rotated portrait and back, and retained three Tanks plus the continuing timer. Returning after retreat preserved 809 credits / 186 compute.
- Actual iPhone Safari/PWA safe-area values, home-indicator/browser chrome, device rotation and OS viewport behavior require physical verification. This was browser-driven viewport simulation, not an iOS device emulator.

## Local iPhone check
The local server was restarted on port 3012 with the same save database. Desktop: http://localhost:3012. iPhone on the same Wi-Fi: http://192.168.1.40:3012.

1. Fully close and reopen the Home Screen app, then reload to fetch current assets. Do not clear website data or uninstall the app as a first step; preserve its save.
2. Check the splash and title at top/bottom edges in both orientations. The title should read THE AI RACE.
3. Tap PLAY in portrait: only the rotation prompt should appear. Turn off Portrait Orientation Lock if needed, then rotate landscape. Check notch/home-indicator clearance around controls.
4. Start a raid, deploy a troop, turn portrait then landscape. Confirm the same raid, stock and timer continue. Repeat while viewing Upgrades; selection should persist.
5. Compare Safari versus Home Screen launch. If a strip persists only in Home Screen mode, record iPhone model, iOS version and a screenshot: that is needed to distinguish cached launch metadata/system-reserved space from a remaining WebKit viewport issue.

No public deployment, push or paid API calls. Pixel and other worktrees untouched.
