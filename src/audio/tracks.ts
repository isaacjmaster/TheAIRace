import type {MusicMode} from './score';
/** Approved lossless masters. PCM fallback protects browsers with missing FLAC decoders. */
export const APPROVED_TRACKS={
  "hq": {
    "flac": "/audio/hq-campus-aa9fc1f29160.flac",
    "wav": "/audio/hq-campus-aa9fc1f29160.wav",
    "sha256Wav": "aa9fc1f29160c00df2989c495f95efd62ec81e0ef5084c7c1c14015e0823119c",
    "frames": 1920000,
    "sampleRate": 48000,
    "seconds": 40.0,
    "compressedBytes": 1977798
},
  "raid": {
    "flac": "/audio/raid-approved-ab2683c155eb.flac",
    "wav": "/audio/raid-approved-ab2683c155eb.wav",
    "sha256Wav": "ab2683c155eb64b92f7f38274f76158577d2f745b6ff85f067eb5b6e06895db8",
    "frames": 1536000,
    "sampleRate": 48000,
    "seconds": 32,
    "compressedBytes": 1618826
  }
} as const;
export const MUSIC_GAIN=2; // Through the unchanged .22 master: quiet .44 playback gain.
export async function loadApprovedTrack(ctx:AudioContext,mode:MusicMode,signal:AbortSignal){
 const track=APPROVED_TRACKS[mode];let last:unknown;
 for(const url of [track.flac,track.wav]){try{const response=await fetch(url,{signal,cache:'force-cache'});if(!response.ok)throw new Error('Music unavailable');const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(signal.aborted)throw new Error('Music canceled');if(Math.abs(buffer.duration-track.seconds)>2/ctx.sampleRate)throw new Error('Incomplete music decode');return buffer;}catch(e){last=e;if(signal.aborted)throw e;}}
 throw last;
}
