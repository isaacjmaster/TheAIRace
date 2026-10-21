Current HQ soundtrack: supplied Earthbound Music Twoson - TeamMx2.mp3.
Selected explicitly by the owner to replace the earlier HQ recording; the
intermediate Starship Mario selection was cancelled before any implementation.
Original supplied MP3 is retained unchanged in source/hq.mp3. Its original filename
and SHA256 are in hq-measurements.json. No original composition or license ownership
by the coding agent is claimed; source labels do not establish license terms.

Full recording retained, only terminal near-silence trimmed, 60 ms click-prevention
endpoint ramps, -22 LUFS background mix. 32 kHz stereo, AAC first with FLAC/PCM
fallbacks and copied decoder guards. Repeats preserve the recording's own ending;
no claim of a newly composed seamless musical loop or physical iPhone listening.

Attack scenes (infiltration and raid) now play effects only. Soundscape does not
load, prefetch or start attack music. HQ fades out on entry; its source is stopped
after the fade, and its position is kept for the return. Repeated gestures do not
extend the fade. Starting or resuming directly inside an attack never loads music.
Existing deployment, hacking, drone and UI effects and saved mute preference remain.
No gameplay, saves, progression or production account APIs changed.

All previous music assets are preserved. ?music=supplied-v1 compares the immediately
prior HQ selection; attack music remains disabled even on comparison URLs.
Reproduce exports: python music/supplied-v2/prepare.py <Twoson.mp3>
