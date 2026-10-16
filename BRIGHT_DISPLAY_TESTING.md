# Bright display update — local verification

## Findings and changes

Maze Sprint was inspected read-only at `C:/Users/socce/Documents/MazeSprint` (main 9d32763) and its integration export. Its HTML uses viewport-fit=cover, its page paints light cyan immediately, and its canvas uses 100vh followed by 100dvh. UI padding handles safe areas separately from the world. It does not use visualViewport offsets or standalone detection. The inspected HTML has no manifest link or Apple standalone metadata, so this comparison does not certify installed-PWA behavior.

The AI Race had a higher-specificity :root navy background overriding its shared HTML background. It also forced a dark color scheme, changed page colors between startup phases, and sized/offset the root using JavaScript visualViewport measurements. These were application-controlled sources of contrasting paint and potentially unpainted space. The root now uses CSS dynamic viewport height like Maze Sprint, with an innerHeight fallback only for older engines. The existing ResizeObserver resizes the 3D renderer. Safe-area padding remains on controls, not the canvas.

Initial HTML, HTML/body/root, manifest and theme metadata now share sky blue #b5eafa. Splash, menu and scene loading use the same base. Light color-scheme replaces forced dark browser styling. Apple status-bar-style is default for the light interface; iOS may reserve a native status-bar region rather than place content under it. No concealing overlay was added.

Materials and UI now use mint terrain, sky/cyan hardware, cream surfaces and gold accents. Geometry, camera interaction, gameplay, economy, database schema, saves, music and Railway configuration are unchanged.

## What iOS still controls

The supplied AI Race screenshot shows Safari's native back/forward, address and menu toolbar. Its surrounding area is browser UI, outside the web viewport. CSS cannot remove it or guarantee its color. Background, color-scheme and theme metadata are supported hints; iOS version and browser appearance settings determine the final chrome. A Home Screen launch removes Safari's toolbar, but still retains system status/home-indicator behavior. The standalone bottom strip was not reproduced on a physical device here, so the changes fix identified application causes without claiming every OS-owned region is removable.

References: https://webkit.org/blog/7929/designing-websites-for-iphone-x/ and https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html

## Verification

- Automated suite: 128 passed.
- Production build and production smoke test passed, including persistent save restart and GPU limit checks.
- Desktop browser simulation: 320x568, 390x664, 390x844 and 844x390; root/canvas track viewport changes, no app document overflow, HTML/body both rgb(181,234,250).
- Simulated 47px top/34px bottom safe areas preserve control visibility while the canvas fills its bounds.
- Standalone navigator flag tested with the same sizing path. This does not emulate iOS WebKit, native toolbars or real Home Screen installation.
- Small-screen HQ, title and Build dialog visually inspected. No production or local player database was reset.

## Physical iPhone checks

Open http://192.168.1.40:3012 on the same Wi-Fi while the local server is running.

1. In Safari, cold-load and reload: check initial paint, studio fade, title and HQ. Check for abrupt bands inside the webpage, separately from native browser chrome.
2. Change toolbar visibility where Safari permits, rotate and return to portrait, background/reopen Safari, and verify controls remain accessible and the world resizes without scrolling.
3. Launch from Home Screen, fully close/reopen, and check the bottom home-indicator region during splash, menu and HQ. Pan/zoom and open/close Build and Settings.
4. Verify your existing Compute and GPU Rig state remain intact; collect from an existing rig as usual.
5. Installed metadata can remain cached. First fully close/reopen the PWA. If old launch/status styling persists, a newly added Home Screen shortcut may be needed. Do not clear website data/cookies or Reset Progress: the anonymous save is associated with a session cookie, and a fresh standalone installation may receive a different session. Keep the existing installation until save continuity is confirmed.

This update is local only; GitHub and Railway remain on the previously published portrait release.
