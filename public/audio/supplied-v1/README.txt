Owner-supplied soundtrack release

HQ: Futuristic Technology Music for a Modern World, supplied MP3.
Infiltration: Stellar Odyssey - The Unknown, supplied MP3.
The owner explicitly requested both files as replacements and authorized release.
The two original MP3 files are retained unchanged in source/. Source filenames,
hashes and export measurements are in the corresponding *-measurements.json.
No claim of original composition by the coding agent or independent licensing
verification is made. Source file titles do not establish license terms.

Preparation: 32 kHz stereo, full music retained, near-silent terminal padding
trimmed, 60 ms endpoint ramps, HQ -22 LUFS and infiltration -26 LUFS. Same existing
game bus gain: infiltration is 4 dB below HQ, beneath unchanged effects.
These are full recordings with their own endings, not newly composed seamless
musical loops. Repeats have click-free endpoints. No melodic sections were cut.
1-second copied decoder guards surround the musical region. AAC first (~3.6 MB HQ,
~2.4 MB infiltration), FLAC then identical PCM fallback. Original MP3 decoding is
lossy; WAV/FLAC preserve the prepared decoded samples, not a lossless original.
Mobile decoding retains the current AudioBuffer transport and resume/fade rules.
No physical iPhone listening or independent musical listening test is claimed.

Previous public assets remain unchanged. ?music=previous selects the immediately
previous HQ/infiltration recordings without writing saved audio preferences.
?music=hq-v1 and ?music=current retain their existing older comparison paths.
Mute, gesture unlock, scene transitions, saved preferences and effects unchanged.
No databases, gameplay, saves, buildings, avatars or progression modified.

Reproduce: python music/supplied-v1/prepare.py <HQ.mp3> <INFILTRATION.mp3>
Uses the existing local NumPy/SciPy, pyloudnorm and ffmpeg tool cache.
