# Approved soundtrack integration

The live game uses the approved HQ V1, **After Hours, First Ideas** (34.2857 s), and Raid V2, **Breach Protocol** (32 s). HQ remains unchanged from the approved listening master. Raid has its own tactical electronic composition, rhythm, harmony and instrumentation.

The versioned public/audio files are original approved stereo PCM masters, packaged losslessly as FLAC with unchanged WAV fallbacks. The loader validates decoded duration and falls back if FLAC decoding fails or is incomplete. Only a needed fallback is downloaded. Both files are cached in memory per audio context. Source provenance, CC0 instrument license and rendering scripts live in music/candidates; redistribution credits accompany the public files.

Playback starts after a user gesture, retains the existing mute preference and automated-preview mute, and crossfades over 1.1 seconds between HQ and active raids. Each mode has at most one looping source; the outgoing source stops after its fade and its position is remembered. Hidden pages suspend audio, require interaction to resume, and disposal aborts pending loads and closes the context. Sound effects and their existing volume are unchanged. Failed audio requests never block gameplay.

Verification: hash checks against approved masters; codec fallback and abort tests; transport tests for repeated gestures, rapid mode changes, mute, visibility, disposal and loading races; offline transition rendering and loop-boundary measurements. Chrome decoded FLAC and WAV to identical samples. Windows Playwright WebKit does not expose OfflineAudioContext, so it cannot verify Safari audio decoding. Actual iPhone playback remains a physical-device check.

On iPhone Safari and installed PWA: tap PLAY, listen to HQ; enter either raid, check the distinct soundtrack and fade; leave the raid, check HQ returns; mute/unmute, background/return with a tap, then close/reopen. Confirm no clicks, gaps, duplicate music or lost preference. No gameplay, save schema, database, PWA layout or production-volume changes are part of this update.
