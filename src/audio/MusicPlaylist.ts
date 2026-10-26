import type {MusicMode} from './score';
export const PLAYLIST_TRACKS=[
 {name:'Into The Spaceship',url:'/audio/official-playlist/01-into-the-spaceship.m4a',seconds:63.21},
 {name:'Goodbye Sweet Alien',url:'/audio/official-playlist/03-goodbye-sweet-alien.m4a',seconds:72.53},
] as const;
export const CROSSFADE_SECONDS=2.5;
export type PlaylistLoader=(ctx:AudioContext,index:number,signal:AbortSignal)=>Promise<AudioBuffer>;
export const loadPlaylistTrack:PlaylistLoader=async(ctx,index,signal)=>{const track=PLAYLIST_TRACKS[index],response=await fetch(track.url,{signal,cache:'force-cache'});if(!response.ok)throw Error('Soundtrack unavailable');const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(signal.aborted||buffer.duration<track.seconds-.1)throw Error('Incomplete soundtrack');return buffer;};
type Voice={source:AudioBufferSourceNode;gain:GainNode;index:number;start:number;offset:number;end:number};
/** Persistent ordered playlist. Sources/gains are scheduled on the audio clock;
 * timer ticks only retry preload failures. Never more than current + next voices. */
export class MusicPlaylist {
 private buffers=new Map<number,AudioBuffer>();private pending=new Map<number,Promise<AudioBuffer>>();private voices:Voice[]=[];private abort=new AbortController();private running=false;private generation=0;private index=0;private offset=0;private retryAt=0;
 constructor(private ctx:AudioContext,private bus:GainNode,private loader:PlaylistLoader=loadPlaylistTrack){}
 async load(_mode?:MusicMode){return this.buffer(this.index);}
 private buffer(index:number){const cached=this.buffers.get(index);if(cached)return Promise.resolve(cached);const pending=this.pending.get(index);if(pending)return pending;const p=this.loader(this.ctx,index,this.abort.signal).then(b=>{if(this.abort.signal.aborted)throw Error('Disposed');this.buffers.set(index,b);return b;}).finally(()=>this.pending.delete(index));this.pending.set(index,p);return p;}
 has(_mode?:MusicMode){return this.running;}
 start(_mode?:MusicMode){if(this.running||this.abort.signal.aborted||!this.buffers.has(this.index))return;this.running=true;this.generation++;this.queue(this.index,this.ctx.currentTime+.01,this.offset,0);this.tick();}
 private queue(index:number,start:number,offset:number,fade:number){const buffer=this.buffers.get(index)!,source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),end=start+buffer.duration-offset;source.buffer=buffer;source.connect(gain);gain.connect(this.bus);gain.gain.setValueAtTime(fade?0:1,start);if(fade)for(let i=1;i<=32;i++)gain.gain.linearRampToValueAtTime(Math.sin(i/32*Math.PI/2),start+fade*i/32);const v={source,gain,index,start,offset,end};this.voices.push(v);source.onended=()=>{source.disconnect();gain.disconnect();const pos=this.voices.indexOf(v);if(pos<0)return;this.voices.splice(pos,1);if(!this.voices.some(n=>n.index===index))this.buffers.delete(index);if(this.running){if(!this.voices.length){this.index=(index+1)%PLAYLIST_TRACKS.length;this.offset=0;}this.tick();}};source.start(start,offset);source.stop(end);}
 tick(){if(!this.running||this.abort.signal.aborted||this.voices.length>1||this.ctx.currentTime<this.retryAt)return;const current=this.voices[0],index=current?(current.index+1)%PLAYLIST_TRACKS.length:this.index,generation=this.generation;void this.buffer(index).then(()=>{if(!this.running||generation!==this.generation||this.voices.length>1)return;const now=this.ctx.currentTime;if(!current||!this.voices.includes(current)){if(this.voices.length)return;this.queue(index,now+.01,0,0);this.tick();return;}const fade=Math.min(CROSSFADE_SECONDS,(current.end-current.start)/2,this.buffers.get(index)!.duration/2),start=Math.max(now+.01,current.end-fade),overlap=Math.max(0,current.end-start);if(overlap)for(let i=0;i<=32;i++)current.gain.gain.linearRampToValueAtTime(Math.cos(i/32*Math.PI/2),start+overlap*i/32);this.queue(index,start,0,overlap);}).catch(()=>{if(generation===this.generation)this.retryAt=this.ctx.currentTime+3;});}
 stop(_mode?:MusicMode,at=this.ctx.currentTime){this.stopAll(at);}
 stopAll(at=this.ctx.currentTime){if(!this.running)return;this.running=false;this.generation++;const active=this.voices.filter(v=>v.start<=at&&v.end>at).at(-1)??this.voices[0];if(active){this.index=active.index;this.offset=Math.max(0,Math.min(active.source.buffer!.duration-.001,active.offset+at-active.start));}for(const v of this.voices){v.source.stop(at);}this.voices=[];for(const index of this.buffers.keys())if(index!==this.index&&index!==(this.index+1)%PLAYLIST_TRACKS.length)this.buffers.delete(index);}
 dispose(){this.stopAll();this.abort.abort();this.buffers.clear();this.pending.clear();}
}
