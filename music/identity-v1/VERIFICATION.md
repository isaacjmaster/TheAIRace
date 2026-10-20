# Soundtrack verification — 20 October 2026

Release update: the owner approved both tracks after listening and authorized full deployment. The original edition is now the default; `?music=current` retains the previous music for comparison. The checks below document the original candidate verification and still apply to the unchanged recordings. The complete 389-test suite, build and isolated production smoke passed again after changing the default.

- `npm test`: **389 passed, 0 failed**. Includes existing audio unlock, mute preference, mode transitions, suspension, source cleanup and resume tests; new coverage for opt-in loading, codec fallback, cancellation, asset integrity, preserved originals, arrangement metadata and guarded-loop resume.
- `npm run build`: passed. Existing large Three.js chunk warning remains; no new runtime dependencies.
- `npm run test:production`: passed against isolated temporary SQLite data, including persistence through process restart. Production player data was not used.
- `python music/identity-v1/verify_audio.py`: both shipped PCM files passed exact guard-copy checks, source hash/frame checks, nonclipping peaks, negligible DC, small loop joins and mono fold-down energy.
- Chrome offline AudioContext at **44,100 and 48,000 Hz**: FLAC/WAV decoded identically; two successive musical periods matched sample-for-sample. Maximum join delta **0.000310** on full-scale ±1 audio. Eight-second renders combining each track at the game music gain with actual deployment, hacking, laser and Cipher shot effects peaked below **0.215**, leaving headroom. Numerical headroom does not prove subjective audibility/balance.
- A/B review page in Chrome and Windows WebKit at 390×844 and 1440×900: buttons, automated silence, responsive layout and no JavaScript errors. No localStorage access or autoplay. All browser contexts closed after checks.
- Opt-in game in Chrome and Windows WebKit at **390×844, 844×390, 1440×900**, with isolated fixture companies and `testAudio=off`: world views, zoom/pan, four valid deployments per layout, refresh/restored mission and retreat passed without JavaScript errors. These silent checks verify gameplay compatibility, not listening quality.
- Every previously shipped audio asset retained its original SHA-256 (`preserved-assets.json`). Existing music preference and default selection remain unchanged. No economy, player identity, database migration or gameplay code changed.

## Reproduce browser checks

Build and start `node --import tsx scripts/preview-music-identity.ts` (local port 3063, dedicated `data/music-preview.sqlite`). Install/use Playwright and browser binaries in your development environment. Run `node --import tsx music/identity-v1/verify-browser.ts`; if Playwright is provided by another runtime, set `PLAYWRIGHT_REQUIRE_BASE` to a JavaScript/package file in that runtime. `MUSIC_REVIEW_BASE` optionally changes the preview origin. The checker always uses `testAudio=off` and renders loop tests offline without opening hardware audio. Evidence is saved under ignored `data/music-media`.

For human listening open `/music-review.html` normally, tap a track, use **Hear loop join**, and compare with **Current HQ / Current Infiltration**. The opt-in game link retains normal saved mute behavior. Do not use the silent automation URL for a listening review.

## Independent verification limits

No physical iPhone, installed PWA, human 15–30-minute repeated listening session or professional audio-engineer mastering review was performed. Windows WebKit lacks `OfflineAudioContext` in this installation; its layout checks pass but its audio codec/loop behavior was not verified. The supplied YouTube reference could not be opened and was not heard. These are fully arranged original sampled-instrument prototypes for listening review, not a claim of finished professional soundtrack quality.

The owner subsequently approved the tracks after listening. The default-selection change retains all previous assets for rollback; saved audio preferences and progression remain unchanged.
