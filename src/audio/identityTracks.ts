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
export const LEGACY_IDENTITY_TRACKS={
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
export const SUPPLIED_V1_TRACKS={
  "hq": {
    "seconds": 171.91,
    "encodedSeconds": 173.91,
    "loopStart": 1,
    "loopEnd": 172.91,
    "sampleRate": 32000,
    "frames": 5565120,
    "sha256Wav": "b6015782f231a8f78a2f365e94357cd91a07b4153b6a9caf1314d738b7ad16d8",
    "flac": "/audio/supplied-v1/hq.flac",
    "wav": "/audio/supplied-v1/hq.wav",
    "aac": "/audio/supplied-v1/hq.m4a",
    "compressedBytes": 3631447
  },
  "infiltration": {
    "seconds": 118.43,
    "encodedSeconds": 120.43,
    "loopStart": 1,
    "loopEnd": 119.43,
    "sampleRate": 32000,
    "frames": 3853760,
    "sha256Wav": "dd884d0adaf0482983950ab059f4107abc2b7c3d3c3f8edc831844314c8b7e6a",
    "flac": "/audio/supplied-v1/infiltration.flac",
    "wav": "/audio/supplied-v1/infiltration.wav",
    "aac": "/audio/supplied-v1/infiltration.m4a",
    "compressedBytes": 2443479
  }
} as const;
export const IDENTITY_TRACKS={...SUPPLIED_V1_TRACKS,hq:{
  "seconds": 136.97,
  "encodedSeconds": 138.97,
  "loopStart": 1,
  "loopEnd": 137.97,
  "sampleRate": 32000,
  "frames": 4447040,
  "sha256Wav": "eb9c4ba505f82d2d909ef7ad58ecf3dc214097b2bd843fbabf0fb5e89ad2071f",
  "flac": "/audio/supplied-v2/hq.flac",
  "wav": "/audio/supplied-v2/hq.wav",
  "aac": "/audio/supplied-v2/hq.m4a",
  "compressedBytes": 2930656
}} as const;
/** Comparisons never write saved preferences. Attack playback is disabled in Soundscape. */
export const identityMusicRequested=(search:string)=>new URLSearchParams(search).get('music')!=='current';
export function identityTrack(mode:'hq'|'infiltration',search:string){
 const edition=new URLSearchParams(search).get('music');
 if(edition==='supplied-v1')return SUPPLIED_V1_TRACKS[mode];
 if(edition==='identity-v1')return mode==='hq'?PREVIOUS_HQ_TRACK:LEGACY_IDENTITY_TRACKS.infiltration;
 if(mode==='hq'&&edition==='hq-v1')return PREVIOUS_HQ_TRACK;
 if(edition==='previous'||edition==='hq-v2')return LEGACY_IDENTITY_TRACKS[mode];
 return IDENTITY_TRACKS[mode];
}
