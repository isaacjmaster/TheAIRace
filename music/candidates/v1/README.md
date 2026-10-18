# The AI Race — soundtrack candidates V1

Review-only. Existing `src/audio`, live game behavior, mute preferences, saves, assets and deployment configuration are unchanged. No GitHub push, Railway deployment or game integration is part of this pass. Checkpoint: `checkpoint/pre-soundtrack-candidates-20261018`.

## Listen

Local review: http://192.168.1.40:3031/ (same Wi-Fi). Tap HQ or Raid; the buttons are mutually exclusive and stop playback on backgrounding. The page never autoplays. It uses decoded lossless WAV buffers for sample-accurate looping. AAC/M4A download links provide smaller files for convenient listening; the page does not rely on HTML media-element looping or AAC padding behavior.

The current game soundtrack remains installed until the player approves these specific recordings. Do not wire this page into the game's routing, manifest or audio system.

## Current system audit

- `score.ts` specifies the current HQ melody/chords in an eight-bar form at 112 BPM, approximately 17.14 seconds. Raid has a separate sixteen-bar score at 128 BPM, 30 seconds.
- `musicSynth.ts` renders single waveform oscillators with envelopes, limited filters, and short repeated noise-buffer drum hits. HQ articulation, chord rhythm and instrument timbres vary little; most voices are short and centered. The existing raid is a separate composition, but its small sound palette still shares that prototype character.
- `sound.ts` already handles gesture-based unlocking, remembered mute, HQ/raid gain crossfades, independent musical clocks, background suspension, teardown, and development/test silence. Preserve these contracts after approval.
- The first pass does not change the menu's music behavior or sound effects. Existing context/bus limits and regression tests remain intact.

## Original musical identity

HQ: **After Hours, First Ideas**, D major with extended major-nine/minor-nine/13th harmony. 16 bars at 112 BPM, 34.2857 seconds. An explicitly composed rising F#–A–B–E–D–A phrase answers itself, develops in a middle section, then resolves through A back to D. Layered warm synth keys, recorded upright piano, restrained arpeggios, stereo pads, rounded bass and light tactile percussion.

Raid: **Race the Network**, D minor with Dorian color and a dominant turnaround. 16 bars at 128 BPM, 30 seconds. The fingerprint becomes F–A–B–E–D–A with a different syncopated rhythm. Independent harmony, driving bass, filtered layered synth lead, rhythmic arpeggios and stronger percussion distinguish it from HQ. It is neither a tempo-shift nor a pitch-shift of HQ.

The score arrays are hand-authored in `render.py`; randomness is deterministic and confined to sound texture. No borrowed commercial melody, ready-made musical loop, or generated-song service is used.

## Production workflow and sources

These are offline stereo renders, not another runtime Web Audio oscillator score or raw MIDI playback. Instruments use band-limited layered synthesis, recorded piano/percussion, articulation and velocity choices, stereo placement, modest chorus/delay, an original diffuse room response, EQ, light dynamics and final dither. Reverb/delay tails and processing wrap around the musical period rather than fading the whole track to silence. Transient envelopes and rhythmic ducking are continuous to avoid avoidable clicks.

Recorded sources: **VSCO 2 Community Edition**, Versilian Studios / Sam Gossner and Ivy Audio / Simon Dalzell. Official source and license:
- https://versilian-studios.com/vsco-community/
- https://github.com/sgossner/VSCO-2-CE
- `VSCO-CC0-LICENSE.txt` preserves the upstream CC0 1.0 license.
- `sources.json` records the exact upstream commit, URLs, byte sizes and SHA-256 hashes. The mix uses upright piano and snare/tap/brake-drum recordings. A downloaded marimba sample is not used in these candidates.

CC0 permits commercial use, modification and redistribution without mandatory attribution. The upstream README encourages credit; the review page and this document retain it voluntarily. Original composition/synthesis introduces no third-party composition royalty. No paid service or new production dependency is introduced.

Available rendering tools: Python, NumPy, SciPy, pyloudnorm and FFmpeg via imageio-ffmpeg. Installed commercial DAW/sample licenses were not assumed or used. These tools support rendered candidate production, but numerical tests cannot establish that a mix sounds professionally mastered, memorable or pleasant on actual speakers. No human listening approval or physical iPhone listening test has been performed. These remain first-pass candidates for review.

## Measurements and checks

Both stereo masters are 48 kHz / 16-bit WAV and approximately -18 LUFS integrated. AAC listening copies use 160 kbps, approximately 0.71 MB HQ and 0.64 MB Raid. WAV masters are 6.58 MB and 5.76 MB. Measured true peaks are below -4 dBTP (see `measurements.json`).

- Three candidate tests pass: voice/one-shot envelope continuity; duration/loudness/headroom/DC/loop-boundary checks; shared motif with distinct harmony/arrangement.
- All 18 existing game audio tests pass.
- Muted mobile browser checks pass: explicit play only, silent automation, mutually exclusive source, stop/background cleanup, no overflow/runtime errors. Each decoded WAV repeats for two sample-exact OfflineAudioContext cycles, with zero repeat error.
- All agent-created test browsers close in finally; no audio preference is modified.

These tests verify engineering properties, not subjective listening quality or every iPhone codec/device behavior. On your phone, listen through at least three loop boundaries, then compare both at the same volume. Judge the hook, timbre, repetition fatigue, percussion balance and musical turnaround. Approve/revise the compositions before game integration.

## Reproduce locally

From repository root:

```powershell
python -m pip install --target data/music-tools --no-deps pyloudnorm imageio-ffmpeg
python music/candidates/v1/fetch_sources.py
python music/candidates/v1/render.py
Copy-Item music/candidates/v1/review.html data/soundtrack-candidates/review/index.html
python music/candidates/v1/test_render.py
python -m http.server 3031 --bind 0.0.0.0 --directory data/soundtrack-candidates/review
```

NumPy and SciPy are also required. Source WAVs, installed tools, decoded buffers, rendering scratch and candidate masters live under ignored `data/`; no samples or executable tools are added to the application bundle. Use `?testAudio=off` for any automated review-page preview. Approved integration will need a separate browser/mobile crossfade and lifecycle check with the final asset format; it has deliberately not been performed in the current game yet.
