# Raid music and simplified selection — local review

## Listen / play

Game: http://192.168.1.40:3021/
Audition: http://192.168.1.40:3021/music-preview
Desktop equivalents: http://localhost:3021/ and /music-preview.

The audition page has explicit Play controls for the raid loop, unchanged HQ loop, and a 36-second HQ → Raid → HQ transition demonstration (switches at 8s and 26s). Nothing autoplays. Starting one audition pauses the others; leaving or backgrounding the page pauses playback. Audio byte-range responses support Safari seeking/metadata. Audition does not change saved game audio preferences.

Start locally with `node --import tsx scripts/preview-raid-music.ts` after `npm run build`. This launcher uses `data/raid-music-preview.sqlite`, a separate cookie, and no legacy imports. Production and other preview saves are untouched. This is a fresh test company; the listening page needs no buildings or troops. Screenshots/browser raid checks used separate temporary companies seeded with ten bots.

## Original soundtrack

“Network Overdrive” is a new original sixteen-bar, 30-second loop at 128 BPM, with E-minor harmony, an independent melodic hook, syncopated sixteenth-note bass, a filtered square/pulse lead, rounded saw/sub bass, sine arpeggios, and synthesized electronic drums. HQ retains “Little Company, Big Plans” at 112 BPM, with its original notes, harmony, instruments, mix and main-menu behavior.

All melodies, patterns, synthesis and deterministic noise are generated for this project. No third-party recordings, samples or melodies were integrated; no attribution requirements, paid APIs, streaming assets or recurring music costs are introduced. Production synthesizes locally and downloads no new audio files. The WAVs are ignored local audition artifacts, not game assets.

Each mode has its own musical clock. Entering an open unsettled raid crossfades for 1.1s; completion/return/menu restores HQ. Repeated mode updates do not restart phrases. The outgoing mode stops scheduling after the fade, and its bus reaches zero. Explicit gain anchors avoid unintended long fades and preserve smooth rapid reversals. Original mute key/autoplay gating/test silence policy remain intact. Backgrounding suspends the context; a new gesture resumes it. Page teardown closes it and clears both timelines.

## Selection

“Level 1 Raid” maps to existing layout 0; “Level 2 Raid” maps to layout 1. The original server command path is unchanged. Compact Influence availability/countdowns sit below each card, outside the primary button labels. Ready troop count, unavailable-with-no-bots state and Resume Raid behavior are preserved. No server, reward, cooldown, combat, identity or save schema changes.

## Verification

- 221 automated tests passed, including independent composition/loop, mode lifecycle, retained clocks, bounded sources, mute, Safari-style gesture resume, teardown, explicit fade anchors and rapid reversals.
- Production build and production startup/persistence smoke passed.
- Silent browser UI checks: 390x844 and 1440x900, plus 320x568, 390x650, 430x932, 1024x768 and 1920x1080. Cards remain at least 44px high, within the viewport, with no document overflow/runtime errors.
- Actual button clicks launched layout 0 and layout 1. Returning with undeployed troops retained all ten bots, 100 Compute and zero Influence. Existing full-suite combat/reward/cooldown tests passed.
- Offline Web Audio renders (no speaker output): HQ RMS .002087 / peak .02607; raid RMS .002430 / peak .02356. Raid is +1.32 dB RMS, within 3 dB. Both loop seams measured zero sample jump, and no clipping was observed. Transition render RMS .002277 / peak .02826.
- LAN frontend, health, audition HTML returned 200; all three WAV byte-range requests returned 206 and valid headers.
- All agent-created test browsers/contexts closed; no player mute preference was changed.

Re-render auditions with `node scripts/render-music-preview.mjs`. It uses esbuild and Playwright/Chrome from the local tooling runtime; `PLAYWRIGHT_PACKAGE_BASE` can point to a require base file beside another Playwright installation. Outputs live only in ignored `data/audio-previews/`.

## Physical iPhone review still needed

1. Open the audition page in Safari, tap Play for Network Overdrive and listen through a loop. Compare HQ, then try the transition preview.
2. Open the game, enable sound with the existing control, and listen at HQ. Train bots normally if using a fresh preview company, then open ATTACK and try both levels.
3. Confirm combat music starts on entry; return or finish to restore HQ. Repeated taps, switching views, mute/unmute and lock/unlock should not duplicate audio or restart it unnecessarily.
4. Confirm remembered mute after refresh/reopening. Test under actual iPhone Safari and the existing HTTPS-installed PWA after an approved deployment; desktop emulation and HTTP LAN do not certify iOS device sound quality or standalone behavior.

No push or deployment is included in this update.
