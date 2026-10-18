# Raid revision V2 — Breach Protocol

The player approved HQ V1 and requested a more distinct, strategic attack track. The approved HQ WAV and AAC masters are locked by SHA-256 in `approved-hq.json`; rendering/testing verifies they are unchanged. V1 sources and audio remain available.

## What changed

- New independent melody and E-minor harmony; no quotation or transposition of the HQ hook.
- 120 BPM, 16 bars, 32 seconds. A measured, syncopated attack pulse rather than simply a faster HQ arrangement.
- Lower synth-brass command phrases, short gated chord strikes, forward sub-bass and a restrained pulse ostinato. No HQ piano/Rhodes or sustained pad arrangement.
- Tom-driven phrase endings, tighter drums, alternating kick patterns and a two-bar tactical breakdown before the main phrase returns.
- Mastered to the same approximately -18 LUFS as the approved HQ. Periodic tail processing and continuous envelopes preserve looping without a fade-to-silence gap.

## Review

http://192.168.1.40:3031/?revision=raid-v2

HQ plays the exact approved V1 master; Raid plays `raid-candidate-v2.wav`. WAV buffers loop sample-accurately. AAC downloads are smaller listening copies. No autoplay; stop/background cleanup and automated-test muting are preserved.

## Sources and limitations

Original score and synth/percussion design. Recorded snare source is the same pinned VSCO 2 Community Edition CC0 library documented in V1; no new samples, licensing obligations, paid services or game dependencies. Offline mixing utilities are reused from V1, but its score, arrangement and HQ masters are not modified. Credits remain on the listening page.

Four revision tests cover approved-HQ hashes, independent melody/palette, continuous source envelopes and 32-second master loudness/boundary/headroom. Muted browser tests verify exclusive playback, mobile controls, cleanup and two sample-exact decoded loop cycles. These are engineering checks, not a subjective listening-quality claim or physical iPhone listening verification.

Render: `python music/candidates/v2/raid_render.py`; test: `python music/candidates/v2/test_raid.py`. Optional first renderer argument exports the resulting audio to another folder. Source dependencies/samples are described in V1.

This is a review candidate only. The game soundtrack remains unchanged. No push, deployment or integration is included.
