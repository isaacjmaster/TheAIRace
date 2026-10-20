/** Recorded music; decoder guards are excluded from each musical loop. */
export const PREVIOUS_HQ_TRACK={
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
} as const;
export const IDENTITY_TRACKS={
  "hq": {
    "seconds": 71.11,
    "encodedSeconds": 73.11,
    "loopStart": 1,
    "loopEnd": 72.11,
    "sampleRate": 32000,
    "frames": 2339520,
    "sha256Wav": "53978baa8fbd993ac71335e84e581a86462458b66cf759488e635bb030306e52",
    "flac": "/audio/hq-identity-v2/hq.flac",
    "wav": "/audio/hq-identity-v2/hq.wav",
    "compressedBytes": 2448010
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
/** Default is the latest HQ score; comparisons never write saved preferences. */
export const identityMusicRequested=(search:string)=>new URLSearchParams(search).get('music')!=='current';
export function identityTrack(mode:'hq'|'infiltration',search:string){
 return mode==='hq'&&new URLSearchParams(search).get('music')==='hq-v1'?PREVIOUS_HQ_TRACK:IDENTITY_TRACKS[mode];
}
