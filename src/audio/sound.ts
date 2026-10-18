import {RecordedMusic,type TrackLoader} from './RecordedMusic';
import {loadApprovedTrack,MUSIC_GAIN} from './tracks';
import { BUILDING_SOUNDS, MUTE_KEY, readMuted, writeMuted, type Cue, type MusicMode } from './score';
export type SoundPlatform={storage?:Pick<Storage,'getItem'|'setItem'>;createContext:()=>AudioContext;silent?:boolean;loadTrack?:TrackLoader};
/** Explicit opt-in for agent previews; standard automation is silent automatically. */
export function testAudioDisabled(search:string,webdriver=false){return webdriver||new URLSearchParams(search).get('testAudio')==='off';}
function browserPlatform():SoundPlatform {
 let storage:Storage|undefined;try{storage=globalThis.localStorage;}catch{}
 return {storage,silent:testAudioDisabled(typeof location==='undefined'?'':location.search,typeof navigator!=='undefined'&&navigator.webdriver===true),createContext:()=>{const C=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;return new C();}};
}
export {voiceEnvelope} from './envelope';
import {voiceEnvelope} from './envelope';
import {MusicSynth} from './musicSynth';
/** Context creation/resume is exclusively initiated by a user gesture. */
export class Soundscape {
 private ctx?:AudioContext;private master?:GainNode;private hq?:GainNode;private raid?:GainNode;
 private timer?:ReturnType<typeof setInterval>;private synth?:MusicSynth;private music?:RecordedMusic;private playingMode?:MusicMode;private hidden=false;private fadeUntil={hq:0,raid:0};private mode:MusicMode='hq';
 private gainRamps=new Map<GainNode,{from:number;to:number;start:number;end:number}>();
 private listeners=new Set<()=>void>();private last=new Map<Cue,number>();private noise?:AudioBuffer;
 muted:boolean;private platform:SoundPlatform;
 constructor(platform=browserPlatform()){this.platform=platform;this.muted=!!platform.silent||readMuted(platform.storage);}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 getSnapshot=()=>this.muted;
 private ramp(node:GainNode,value:number,seconds=.7){
  const t=this.ctx!.currentTime,previous=this.gainRamps.get(node),fraction=previous?Math.max(0,Math.min(1,(t-previous.start)/(previous.end-previous.start))):1;
  const current=previous?previous.from+(previous.to-previous.from)*fraction:node.gain.value;
  // Explicitly anchor the ramp; a bare future linear endpoint can fade from context startup.
  node.gain.cancelScheduledValues(t);node.gain.setValueAtTime(current,t);node.gain.linearRampToValueAtTime(value,t+seconds);
  this.gainRamps.set(node,{from:current,to:value,start:t,end:t+seconds});
 }
 async unlock(){
  if(this.platform.silent||this.muted)return;
  try{
   if(!this.ctx){this.ctx=this.platform.createContext();this.synth=new MusicSynth(this.ctx);this.master=this.ctx.createGain();this.master.gain.value=.22;this.master.connect(this.ctx.destination);this.hq=this.ctx.createGain();this.raid=this.ctx.createGain();this.hq.connect(this.master);this.raid.connect(this.master);this.hq.gain.value=0;this.raid.gain.value=0;this.music=new RecordedMusic(this.ctx,{hq:this.hq,raid:this.raid},this.platform.loadTrack??loadApprovedTrack);}
   const ctx=this.ctx;await ctx.resume();
   if(this.ctx!==ctx||this.platform.silent||this.muted||this.hidden)return;
   if(!this.timer)this.timer=setInterval(()=>this.schedule(),100);void this.activate(this.mode);this.schedule();
  }catch{/* Audio unsupported/interrupted: the game remains playable. */}
 }
 private async activate(mode:MusicMode){
  const ctx=this.ctx,music=this.music;if(!ctx||!music||this.muted||this.hidden||ctx.state!=='running')return;
  try{await music.load(mode);if(this.ctx!==ctx||this.music!==music||this.muted||this.hidden||this.mode!==mode||ctx.state!=='running')return;
   if(this.playingMode!==mode||!music.has(mode)){const previous=this.playingMode;music.start(mode);if(previous)this.fadeUntil[previous]=ctx.currentTime+1.1;this.ramp(this.hq!,mode==='hq'?MUSIC_GAIN:0,1.1);this.ramp(this.raid!,mode==='raid'?MUSIC_GAIN:0,1.1);this.playingMode=mode;}
   // HQ is needed first; warm the attack buffer after it becomes audible.
   if(mode==='hq')void music.load('raid').catch(()=>{});
  }catch{/* Missing/unsupported audio never blocks gameplay; a later gesture retries. */}
 }
 setMuted(value:boolean){if(this.platform.silent)return;this.muted=value;writeMuted(this.platform.storage,value);if(this.master)this.ramp(this.master,value?0:.22,.1);if(!value)void this.unlock();for(const listener of this.listeners)listener();}
 setMode(mode:MusicMode){if(mode===this.mode)return;this.mode=mode;void this.activate(mode);}
 visibility(hidden:boolean){this.hidden=hidden;if(hidden){if(this.timer)clearInterval(this.timer);this.timer=undefined;void this.ctx?.suspend().catch(()=>{});}/* Safari resumes on the next explicit interaction. */}
 private note(...args:Parameters<MusicSynth['note']>){this.synth?.note(...args);}
 private schedule(){
  if(!this.ctx||!this.music||this.ctx.state!=='running'||this.platform.silent||this.hidden)return;
  for(const mode of ['hq','raid'] as const)if(mode!==this.playingMode&&this.ctx.currentTime>=this.fadeUntil[mode])this.music.stop(mode);
 }
 cue=(cue:Cue)=>{
  if(!this.ctx||this.ctx.state!=='running'||this.platform.silent||this.muted)return;const t=this.ctx.currentTime;
  const gap=cue.startsWith('building-')?.16:cue==='laser'||cue==='impact'?.09:cue==='destroy'?.12:.04;if(t-(this.last.get(cue)??-10)<gap)return;this.last.set(cue,t);
  const out=this.master!;
  if(cue in BUILDING_SOUNDS){const voice=BUILDING_SOUNDS[cue as keyof typeof BUILDING_SOUNDS];voice.notes.forEach((note,i)=>this.note(note,t+i*voice.gap,voice.duration,.1,out,voice.type,.012));return;}
  if(cue==='clear-tree'){[74,81,86].forEach((n,i)=>this.note(n,t+i*.065,.2,.055,out,'sine',.015));return;}
  if(cue==='clear-scrap'){[50,62,78].forEach((n,i)=>this.note(n,t+i*.07,.16,.065,out,'triangle',.01));return;}
  if(cue==='tap')this.note(81,t,.075,.13,out,'sine',.002,76);
  if(cue==='deploy'){this.note(62,t,.18,.16,out,'triangle',.005);this.note(74,t+.06,.3,.13,out);}
  if(cue==='laser')this.note(94,t,.11,.08,out,'sine',.002,52);
  if(cue==='impact'||cue==='destroy'){
   if(!this.noise){this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*.3,this.ctx.sampleRate);const a=this.noise.getChannelData(0);let seed=37;for(let i=0;i<a.length;i++){seed=(seed*1664525+1013904223)>>>0;a[i]=(seed/4294967296)*2-1;}}
   const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=this.noise;filter.type='lowpass';filter.frequency.value=cue==='destroy'?800:1400;voiceEnvelope(gain.gain,t,.24,cue==='destroy'?.26:.08,.008);source.connect(filter);filter.connect(gain);gain.connect(out);source.start(t);source.stop(t+.26);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  const notes=cue==='win'?[62,66,69,74,78]:cue==='resources'?[81,86,90]:cue==='upgrade'?[57,62,66,74]:[];
  notes.forEach((n,i)=>this.note(n,t+i*.1,.65,.12,out,'sine',.008));
 };
 dispose(){if(this.timer)clearInterval(this.timer);this.timer=undefined;this.music?.dispose();void this.ctx?.close().catch(()=>{});this.music=undefined;this.playingMode=undefined;this.ctx=undefined;this.synth=undefined;this.fadeUntil={hq:0,raid:0};this.gainRamps.clear();this.master=undefined;this.hq=undefined;this.raid=undefined;this.noise=undefined;this.last.clear();}
}
export const sound=new Soundscape();
// Closing/navigating a preview stops all scheduled sound, including a pending unlock.
if(typeof window!=='undefined')window.addEventListener('pagehide',()=>sound.dispose());
if(import.meta.hot)import.meta.hot.dispose(()=>sound.dispose());
export { MUTE_KEY };
