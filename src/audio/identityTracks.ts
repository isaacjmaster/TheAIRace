/** Approved original sampled soundtrack. Guards are excluded from the musical loop. */
export const IDENTITY_TRACKS={
  "hq": {
    "seconds": 80.0,
    "encodedSeconds": 82.0,
    "loopStart": 1,
    "loopEnd": 81.0,
    "sampleRate": 32000,
    "frames": 2624000,
    "sha256Wav": "d1028d8bda6fffc035fcfc2d088518e01a41e875e62ea35449cd53de456dd1f9",
    "flac": "/audio/identity-v1/hq.flac",
    "wav": "/audio/identity-v1/hq.wav",
    "compressedBytes": 3340516
  },
  "infiltration": {
    "seconds": 64.0,
    "encodedSeconds": 66.0,
    "loopStart": 1,
    "loopEnd": 65.0,
    "sampleRate": 32000,
    "frames": 2112000,
    "sha256Wav": "b8974f3cb383e2e69a3b33a09e205537bfbcdbb32f8e34299c7a92e2fba1f725",
    "flac": "/audio/identity-v1/infiltration.flac",
    "wav": "/audio/identity-v1/infiltration.wav",
    "compressedBytes": 3039660
  }
} as const;
/** Approved soundtrack is the default; retain an explicit legacy comparison/rollback URL. */
export const identityMusicRequested=(search:string)=>new URLSearchParams(search).get('music')!=='current';
