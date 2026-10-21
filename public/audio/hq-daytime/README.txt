Founder HQ daytime audio edit

Source: music/supplied-v2/source/hq.mp3 (unchanged user-supplied recording).
This patch edits that recording; it is not a new original composition.

Loop: 57.0175 seconds. Source excerpt 17.9000 through 74.9175 seconds,
with a 600ms correlated linear overlap at the repeat boundary and a 4ms
residual endpoint correction. One-second copied guards support browser decode;
Web Audio loops from 1.0000 to 58.0175. AAC preferred, FLAC/WAV fallbacks.
Source preparation stays at -22 LUFS; HQ mixer gain is now 60% of its prior
setting (HQ_AUDIO.musicScale). Original track and previous assets remain intact.
Comparison: open /?music=supplied-v2 on a user-controlled browser.

Measurements: -8.934 dBTP; boundary correlation 0.8345; 100ms RMS difference
at join +1.57 dB. Exact PCM endpoints match; three consecutive rendered loops
contain no inserted gap. AAC/FLAC decoded successfully at 44.1 and 48 kHz.
These checks do not establish perceptual perfection: no human listening or
physical iPhone/PWA test was performed by the agent. The user should audition
the provided three-loop preview on a phone.

Outdoor ambience: original synthesized filtered air/noise, varied leaf rustles,
and short quiet bird warbles. No downloaded environmental recordings. Bounded
voice counts and varied intervals avoid stacking. Existing master mute, gesture
unlock, hidden-page suspension and scene changes control the layer. Attacks
remain effects-only. Configuration: src/audio/Ambience.ts HQ_AUDIO.

Reproduction: Python with NumPy, SciPy, pyloudnorm and imageio-ffmpeg; execute
music/hq-daytime/prepare.py. Dependencies are development tools, not runtime.
Detailed measurements and browser decode results accompany the source script.
