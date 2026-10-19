import type {MusicMode} from './score';
export type TrackLoader=(ctx:AudioContext,mode:MusicMode,signal:AbortSignal)=>Promise<AudioBuffer>;
type Playing={source:AudioBufferSourceNode;offset:number;started:number};
/** At most one looping source per mode; only the outgoing crossfade may overlap. */
export class RecordedMusic{
 private buffers=new Map<MusicMode,AudioBuffer>();private pending=new Map<MusicMode,Promise<AudioBuffer>>();private playing=new Map<MusicMode,Playing>();private offsets={hq:0,raid:0,infiltration:0};private abort=new AbortController();
 constructor(private ctx:AudioContext,private buses:Record<MusicMode,GainNode>,private loader:TrackLoader){}
 load(mode:MusicMode):Promise<AudioBuffer>{const cached=this.buffers.get(mode);if(cached)return Promise.resolve(cached);const pending=this.pending.get(mode);if(pending)return pending;const promise=this.loader(this.ctx,mode,this.abort.signal).then(buffer=>{if(this.abort.signal.aborted)throw new Error('Audio disposed');this.buffers.set(mode,buffer);return buffer;}).finally(()=>this.pending.delete(mode));this.pending.set(mode,promise);return promise;}
 has(mode:MusicMode){return this.playing.has(mode);}
 start(mode:MusicMode){if(this.has(mode)||this.abort.signal.aborted)return;const buffer=this.buffers.get(mode);if(!buffer)return;const source=this.ctx.createBufferSource(),offset=this.offsets[mode]%buffer.duration,started=this.ctx.currentTime;source.buffer=buffer;source.loop=true;source.connect(this.buses[mode]);this.playing.set(mode,{source,offset,started});source.start(started,offset);}
 stop(mode:MusicMode){const p=this.playing.get(mode);if(!p)return;this.offsets[mode]=(p.offset+Math.max(0,this.ctx.currentTime-p.started))%p.source.buffer!.duration;this.playing.delete(mode);p.source.stop(this.ctx.currentTime);p.source.disconnect();}
 dispose(){this.abort.abort();for(const mode of ['hq','raid','infiltration'] as const)this.stop(mode);this.buffers.clear();this.pending.clear();}
}
