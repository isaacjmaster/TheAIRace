# Local Safari selection fix

Scope: frontend interaction protection only. No gameplay, visuals, layout, save,
identity, backend/database, PWA metadata, or viewport changes. No push/deployment.

## Finding and implementation

HQ and raids already had `touch-action: none` on their world surfaces, but HUD,
labels, buttons, and modal text retained normal browser selection behavior. Canvas
gesture rules do not disable selection on adjacent HTML elements.

- `game-interaction.css` scopes standard and WebKit user-selection disabling and
  `-webkit-touch-callout: none` to `.foundation-app` and non-editable descendants.
- Explicit `user-select: text`, WebKit text selection, default callouts and native
  touch behavior for input/textarea/select, contenteditable descendants and an
  intentional `[data-native-text]` opt-out. Read-only recovery textareas are included.
- Images/SVGs cannot start native image drags. No assets are changed.
- App-level `touch-action: manipulation` permits scrolling and pinch zoom while
  discouraging accidental double-tap zoom. Existing canvas `touch-action: none`
  remains intact for custom game pan/pinch/deployment gestures. No viewport or
  user-scalable restriction was introduced; system accessibility stays available.
- `installGameInteractionGuard` attaches only three app-local event listeners:
  contextmenu, selectstart, dragstart. Native-text targets are exempt. Listeners
  are removed on unmount. No touch, pointer, keyboard, focus, clipboard or scroll
  handlers are blocked, and no document-wide listeners/selection clearing are used.

Sources: [Apple Safari CSS reference](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariCSSRef/Articles/StandardCSSProperties.html),
[WebKit touch-action guidance](https://webkit.org/blog/5610/more-responsive-tapping-on-ios/).
CSS is the primary iOS safeguard; event cancellation is supplementary. Browser/OS
accessibility behaviors cannot be guaranteed from desktop emulation.

## Automated verification

202 existing automated tests, production build, production startup/restart smoke
passed. Browser checks used disposable databases and silent `?testAudio=off` contexts
with finally cleanup of all contexts, browsers, servers and temporary databases.

Chromium touch emulation at 390x844 and mouse input at 1280x800 checked:
- Non-editable HUD, canvas, buttons, labels, build images, Ava portrait and raid
  header have user-select:none and cancel selection/contextmenu/native drag events.
- A 900ms terrain hold leaves no selected document text.
- Actual Ava naming, typing, selecting, copying and pasting a company name.
- Read-only recovery-code selection, Copy Code via Clipboard API on secure loopback,
  pasting into the recovery textarea, and native selection/contextmenu exemptions.
- Contenteditable child and outside-game document exemptions.
- Touch camera pan, moving/rotating Founder HQ, Build and leaderboard scrollability, menus,
  actual touch troop deployment, and desktop menu/form interactions.
- Separate full building expansion browser check: second GPU construction and
  placement, separate Fabricator/Hangar, both Compute collection buttons, training,
  refresh persistence and independent GPU rotation.

These are browser-emulation results, not a physical iPhone Safari verification.

## Physical iPhone review

Open **http://192.168.1.40:3017/** in Safari on the same Wi-Fi; reload once to get the
latest build. This is the isolated Influence preview, using its own database and
cookie, not the public Railway company or the earlier 3015 local save.

1. Enter HQ. Hold terrain/buildings, Company/Builders/Compute, all HUD buttons,
   building labels, catalog images and ranking rows. Expect no native selection UI.
2. Pan and pinch the world, arrange/rotate/place a building, open/scroll menus, and
   deploy a bot at the raid perimeter. Normal buttons and intended scrolling work.
3. On a fresh preview company, advance Ava to naming and test editing/selection.
   In Settings -> Company / Recovery generate a test code, select/copy it, then
   paste into Recover another company. Do not switch companies merely to test paste.
   LAN HTTP may lack the Clipboard API; the existing Copy Code fallback asks you to
   hold the read-only code field to copy it. That field must retain native callouts.
4. Check portrait Safari with browser controls expanded/collapsed. No fullscreen
   sizing or manifest changes were made. Installed HTTPS PWA testing remains pending
   until this local fix is approved for an HTTPS test/release; HTTP is not proof of
   true iPhone standalone behavior.

Never reset or migrate a production company for these checks. Recovery codes from
this preview refer to this preview database only.
