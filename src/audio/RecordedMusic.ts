import type {MusicMode} from './score';
export type TrackLoader=(ctx:AudioContext,mode:MusicMode,signal:AbortSignal)=>Promise<AudioBuffer>;
const regions=new WeakMap<AudioBuffer,{start:number;end:number}>();
/** Guards keep decoder/resampler edges outside the actual musical loop. */
export function defineMusicLoop(buffer:AudioBuffer,start:number,end:number){if(start<0||end<=start||end>buffer.duration)throw Error('Invalid music loop');regions.set(buffer,{start,end});return buffer;}
export const musicLoop=(buffer:AudioBuffer)=>regions.get(buffer)??{start:0,end:buffer.duration};
type Playing={source:AudioBufferSourceNode;offset:number;started:number};
/** At most one looping source per mode; only the outgoing crossfade may overlap. */
export class RecordedMusic{
 private buffers=new Map<MusicMode,AudioBuffer>();private pending=new Map<MusicMode,Promise<AudioBuffer>>();private playing=new Map<MusicMode,Playing>();private offsets={hq:0,raid:0,infiltration:0};private abort=new AbortController();
 constructor(private ctx:AudioContext,private buses:Record<MusicMode,GainNode>,private loader:TrackLoader){}
 load(mode:MusicMode):Promise<AudioBuffer>{const cached=this.buffers.get(mode);if(cached)return Promise.resolve(cached);const pending=this.pending.get(mode);if(pending)return pending;const promise=this.loader(this.ctx,mode,this.abort.signal).then(buffer=>{if(this.abort.signal.aborted)throw new Error('Audio disposed');this.buffers.set(mode,buffer);return buffer;}).finally(()=>this.pending.delete(mode));this.pending.set(mode,promise);return promise;}
 has(mode:MusicMode){return this.playing.has(mode);}
 start(mode:MusicMode){if(this.has(mode)||this.abort.signal.aborted)return;const buffer=this.buffers.get(mode);if(!buffer)return;const region=musicLoop(buffer),source=this.ctx.createBufferSource(),offset=this.offsets[mode]%(region.end-region.start),started=this.ctx.currentTime;source.buffer=buffer;source.loop=true;source.loopStart=region.start;source.loopEnd=region.end;source.connect(this.buses[mode]);this.playing.set(mode,{source,offset,started});source.start(started,region.start+offset);}
 stop(mode:MusicMode){const p=this.playing.get(mode);if(!p)return;const region=musicLoop(p.source.buffer!);this.offsets[mode]=(p.offset+Math.max(0,this.ctx.currentTime-p.started))%(region.end-region.start);this.playing.delete(mode);p.source.stop(this.ctx.currentTime);p.source.disconnect();}
 dispose(){this.abort.abort();for(const mode of ['hq','raid','infiltration'] as const)this.stop(mode);this.buffers.clear();this.pending.clear();}
}
