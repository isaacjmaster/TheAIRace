import { musicStep, MUTE_KEY, frequency, readMuted, writeMuted, type Cue, type MusicMode } from './score';
export type SoundPlatform={storage?:Pick<Storage,'getItem'|'setItem'>;createContext:()=>AudioContext;silent?:boolean};
/** Explicit opt-in for agent previews; standard automation is silent automatically. */
export function testAudioDisabled(search:string,webdriver=false){return webdriver||new URLSearchParams(search).get('testAudio')==='off';}
function browserPlatform():SoundPlatform {
 let storage:Storage|undefined;try{storage=globalThis.localStorage;}catch{}
 return {storage,silent:testAudioDisabled(typeof location==='undefined'?'':location.search,typeof navigator!=='undefined'&&navigator.webdriver===true),createContext:()=>{const C=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;return new C();}};
}
/** Context creation/resume is exclusively initiated by a user gesture. */
export class Soundscape {
 private ctx?:AudioContext;private master?:GainNode;private hq?:GainNode;private raid?:GainNode;
 private timer?:ReturnType<typeof setInterval>;private next=0;private step=0;private mode:MusicMode='hq';
 private listeners=new Set<()=>void>();private last=new Map<Cue,number>();private noise?:AudioBuffer;
 muted:boolean;private platform:SoundPlatform;
 constructor(platform=browserPlatform()){this.platform=platform;this.muted=!!platform.silent||readMuted(platform.storage);}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 getSnapshot=()=>this.muted;
 private ramp(node:GainNode,value:number,seconds=.7){const t=this.ctx!.currentTime;node.gain.cancelScheduledValues(t);node.gain.setValueAtTime(node.gain.value,t);node.gain.linearRampToValueAtTime(value,t+seconds);}
 async unlock(){
  if(this.platform.silent||this.muted)return;
  try{
   if(!this.ctx){this.ctx=this.platform.createContext();this.master=this.ctx.createGain();this.master.gain.value=.22;this.master.connect(this.ctx.destination);this.hq=this.ctx.createGain();this.raid=this.ctx.createGain();this.hq.connect(this.master);this.raid.connect(this.master);this.hq.gain.value=this.mode==='hq'?.55:0;this.raid.gain.value=this.mode==='raid'?.5:0;}
   const ctx=this.ctx;await ctx.resume();
   if(this.ctx!==ctx||this.platform.silent||this.muted)return;
   if(!this.timer){this.next=this.ctx.currentTime+.04;this.timer=setInterval(()=>this.schedule(),100);this.schedule();}
  }catch{/* Audio unsupported/interrupted: the game remains playable. */}
 }
 setMuted(value:boolean){if(this.platform.silent)return;this.muted=value;writeMuted(this.platform.storage,value);if(this.master)this.ramp(this.master,value?0:.22,.1);if(value){if(this.timer)clearInterval(this.timer);this.timer=undefined;}for(const listener of this.listeners)listener();}
 setMode(mode:MusicMode){this.mode=mode;if(this.hq&&this.raid){this.ramp(this.hq,mode==='hq'?.55:0,1.1);this.ramp(this.raid,mode==='raid'?.5:0,1.1);}}
 visibility(hidden:boolean){if(hidden){if(this.timer)clearInterval(this.timer);this.timer=undefined;void this.ctx?.suspend().catch(()=>{});}/* Safari resumes on the next explicit interaction. */}
 private note(midi:number,time:number,duration:number,volume:number,bus:AudioNode,type:OscillatorType='sine',attack=.015,slide?:number){
  const ctx=this.ctx!,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency(midi),time);if(slide!==undefined)osc.frequency.exponentialRampToValueAtTime(frequency(slide),time+duration);
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+attack);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(gain);gain.connect(bus);osc.start(time);osc.stop(time+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
 /** Short synthesized drum strokes; shared deterministic noise, never external samples. */
 private drum(time:number,bus:AudioNode,hat:boolean,volume:number){
  const ctx=this.ctx!;
  if(!this.noise){this.noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.3),ctx.sampleRate);const a=this.noise.getChannelData(0);let seed=37;for(let i=0;i<a.length;i++){seed=(seed*1664525+1013904223)>>>0;a[i]=seed/2147483648-1;}}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),duration=hat?.045:.11;
  source.buffer=this.noise;filter.type=hat?'highpass':'bandpass';filter.frequency.value=hat?6500:1800;
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.003);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  source.connect(filter);filter.connect(gain);gain.connect(bus);source.start(time);source.stop(time+duration+.01);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 private schedule(){
  if(!this.ctx||this.ctx.state!=='running'||this.platform.silent||this.muted)return;
  if(this.next<this.ctx.currentTime)this.next=this.ctx.currentTime+.02;
  while(this.next<this.ctx.currentTime+.3){
   const score=musicStep(this.step++,this.mode),t=this.next;
   // Both arrangements share a score so changing modes crossfades without restarting.
   for(const [bus,combat] of [[this.hq!,false],[this.raid!,true]] as const){
    this.note(score.pluck,t,.15,combat?.035:.05,bus,'triangle',.004);
    if(score.bass!==null)this.note(score.bass,t,.28,combat?.13:.10,bus,'triangle',.008);
    if(score.melody!==null){
     const duration=score.seconds*(score.beat===0?1.65:.85);
     this.note(score.melody,t,duration,.065,bus,'triangle',.025);
     this.note(score.melody-12,t,duration,.025,bus,'sine',.035);
    }
    if(score.beat===0||score.beat===4)for(const n of score.chord.slice(1))this.note(n,t,.17,.018,bus,'triangle',.012);
    if(score.kick)this.note(43,t,.16,combat?.12:.075,bus,'sine',.004,26);
    if(score.snare)this.drum(t,bus,false,combat?.045:.025);
    if(score.hat)this.drum(t,bus,true,combat?.018:.009);
    if(combat&&score.beat===7)this.note(score.chord[0],t,.12,.06,bus,'triangle',.004);
   }
   this.next+=score.seconds;
  }
 }
 cue=(cue:Cue)=>{
  if(!this.ctx||this.ctx.state!=='running'||this.platform.silent||this.muted)return;const t=this.ctx.currentTime;
  const gap=cue==='laser'||cue==='impact'?.09:cue==='destroy'?.12:.04;if(t-(this.last.get(cue)??-10)<gap)return;this.last.set(cue,t);
  const out=this.master!;
  if(cue==='tap')this.note(81,t,.075,.13,out,'sine',.002,76);
  if(cue==='deploy'){this.note(62,t,.18,.16,out,'triangle',.005);this.note(74,t+.06,.3,.13,out);}
  if(cue==='laser')this.note(94,t,.11,.08,out,'sine',.002,52);
  if(cue==='impact'||cue==='destroy'){
   if(!this.noise){this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*.3,this.ctx.sampleRate);const a=this.noise.getChannelData(0);let seed=37;for(let i=0;i<a.length;i++){seed=(seed*1664525+1013904223)>>>0;a[i]=(seed/4294967296)*2-1;}}
   const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=this.noise;filter.type='lowpass';filter.frequency.value=cue==='destroy'?800:1400;gain.gain.setValueAtTime(cue==='destroy'?.26:.08,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.24);source.connect(filter);filter.connect(gain);gain.connect(out);source.start(t);source.stop(t+.26);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  const notes=cue==='win'?[62,66,69,74,78]:cue==='resources'?[81,86,90]:cue==='upgrade'?[57,62,66,74]:[];
  notes.forEach((n,i)=>this.note(n,t+i*.1,.65,.12,out,'sine',.008));
 };
 dispose(){if(this.timer)clearInterval(this.timer);this.timer=undefined;void this.ctx?.close().catch(()=>{});this.ctx=undefined;this.master=undefined;this.hq=undefined;this.raid=undefined;this.noise=undefined;this.last.clear();}
}
export const sound=new Soundscape();
// Closing/navigating a preview stops all scheduled sound, including a pending unlock.
if(typeof window!=='undefined')window.addEventListener('pagehide',()=>sound.dispose());
if(import.meta.hot)import.meta.hot.dispose(()=>sound.dispose());
export { MUTE_KEY };
