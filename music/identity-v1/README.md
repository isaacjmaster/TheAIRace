# Original musical identity — listening candidates v1

Status: fully arranged sampled-instrument prototypes, awaiting musical listening approval. The normal game keeps its existing soundtrack. `/music-review.html` provides level-matched A/B playback and loop-join controls; `/?music=identity-v1` opts into these tracks for that URL only. No saved preference or company data changes. `/?music=current` restores the current edition. Do not promote these to the default without approval.

## Composition

- **First Light, Future Plans:** 80 seconds, 32 bars, 96 BPM, A major. Marimba/piano lead, harp answers, pizzicato strings, cello bass, quiet original synth reinforcement and tactile percussion. A/A′/B/A″ form: the middle passage thins the texture and changes lead before a fuller return.
- **A Clever Way In:** 64 seconds, 32 bars, 120 BPM, F-sharp minor. Distinct syncopated phrases, dominant tension, pizzicato punctuation and a rounded electronic reed, with a sparse contrasting middle passage. No military march or dance-floor beat.
- Shared signature: **E–A–B–C♯ / G♯–B–F♯**, with different rhythm and harmonic context. `score.py` contains the authored note phrases and chord voicings; JSON contains every note/percussion event; MIDI contains editable pitched/percussion tracks and tempo.

The linked YouTube reference could not be loaded in this environment. No reference audio was downloaded, transcribed or used. These compositions follow the written atmosphere brief; no claim is made to have listened to that reference.

## Instruments and tools

Recorded single notes: VSCO 2 Community Edition piano, marimba, harp, pizzicato violin and cello, pinned to commit `440300901dfe9275fd84e0b7763af1f8443ae62e`. Official license: CC0, https://versilian-studios.com/vsco-community/ . Both manifests record exact source URLs and SHA-256 checksums; license text remains in `music/candidates/v1/VSCO-CC0-LICENSE.txt`. No precomposed musical loops, commercial recordings, or copied game melodies are used.

Offline Python/NumPy/SciPy sample rendering; original soft synth voices, percussion and room impulse response; pyloudnorm loudness measurement; imageio-ffmpeg FLAC/AAC encoding. Existing v1 instrument helper code is reused, not its score. These tools are development-only and add no runtime dependencies.

## Reproduce and edit

From repository root, with Python and NumPy/SciPy installed:

```powershell
python -m pip install --target data/music-tools --no-deps pyloudnorm imageio-ffmpeg
python music/identity-v1/fetch_sources.py
python music/identity-v1/render.py
```

`data/music-identity-v1` receives stereo 48 kHz float lossless masters, editable JSON, MIDI and measurements. The renderer writes 32 kHz stereo 16-bit FLAC/WAV runtime exports and 160 kb/s AAC listening previews into `public/audio/identity-v1`. Raw samples, tools, intermediate stems and large masters stay outside the shipped build. Retain the local lossless masters; they can also be regenerated. Copy edited score JSON/MIDI into this directory and update `src/audio/identityTracks.ts` hashes/metadata when approving a rerender. Render output is deterministic with the pinned source files and tool versions, subject to numerical library differences.

## Loop and mix

Both mixes target **−20 LUFS**. Measured true peaks: HQ **−4.33 dBTP**, infiltration **−7.97 dBTP**. Bass is filtered below 35 Hz, with restrained stereo placement and quiet percussion. Exact measurements and source checksums are recorded here.

Room/delay tails wrap circularly through the composition, without a fade to silence. FLAC/WAV files contain one second of copied audio before and after the musical period, so browser decoder/resampler boundary artifacts remain outside the loop. **Use HQ loopStart=1, loopEnd=81; infiltration loopStart=1, loopEnd=65.** Encoded lengths are therefore 82/66 seconds; actual music is 80/64 seconds. AAC downloads are ordinary 80/64-second listening previews, not the game's gapless-loop transport.

The existing AudioContext, music buses, fades, resume offsets, mute preference, gesture unlock and suspension handling are retained. At most one source per mode runs; outgoing music may overlap only during the existing crossfade. No SFX assets or synthesis definitions changed. In-game preview music stays below existing effects. Production balance still needs real listening on phone speakers/headphones.

## Validation and limits

See `VERIFICATION.md` for results. Automated offline rendering verifies exact consecutive periods, codec equivalence, seam amplitude and SFX mix headroom. This cannot establish musical enjoyment, convincing timbre or professional mastering. A human 15–30-minute listening session, physical iPhone Safari/PWA check and potentially a musician's articulation/mixing pass remain necessary before default replacement. For a higher production ceiling, import the MIDI/score into a DAW with richer round-robin/multivelocity orchestral libraries, retain the original motif, and remix/re-master with a composer/audio engineer.
