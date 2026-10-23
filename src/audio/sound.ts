import {HQAmbience,HQ_AUDIO} from './Ambience';
import {INFILTRATION_CUES,type InfiltrationCue} from './infiltrationCues';
import {RecordedMusic,type TrackLoader} from './RecordedMusic';
import {loadApprovedTrack,MUSIC_GAIN} from './tracks';
import { BUILDING_SOUNDS, MUTE_KEY, readMuted, writeMuted, type Cue, type MusicMode } from './score';
export type SoundPlatform={storage?:Pick<Storage,'getItem'|'setItem'>;createContext:()=>AudioContext;silent?:boolean;ambience?:boolean;loadTrack?:TrackLoader;isHidden?:()=>boolean};
/** Explicit opt-in for agent previews; standard automation is silent automatically. */
export function testAudioDisabled(search:string,webdriver=false){return webdriver||new URLSearchParams(search).get('testAudio')==='off';}
function browserPlatform():SoundPlatform {
 let storage:Storage|undefined;try{storage=globalThis.localStorage;}catch{}
 return {storage,isHidden:()=>document.hidden,silent:testAudioDisabled(typeof location==='undefined'?'':location.search,typeof navigator!=='undefined'&&navigator.webdriver===true),createContext:()=>{const C=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;return new C();}};
}
export {voiceEnvelope} from './envelope';
import {voiceEnvelope} from './envelope';
import {MusicSynth} from './musicSynth';
/** Context creation/resume is exclusively initiated by a user gesture. */
export class Soundscape {
 private ambience?:HQAmbience;private ctx?:AudioContext;private master?:GainNode;private hq?:GainNode;private raid?:GainNode;private infiltration?:GainNode;
 private timer?:ReturnType<typeof setInterval>;private synth?:MusicSynth;private music?:RecordedMusic;private playingMode?:MusicMode;private hidden=false;private fadeUntil={hq:0,raid:0,infiltration:0};private mode:MusicMode='hq';
 private audible=false;private epoch=0;private resuming?:AudioContext;private flight?:Promise<boolean>;private quiet?:Promise<void>;
 private effects=new Set<AudioBufferSourceNode>();
 private backgrounded(){return this.hidden||!!this.platform.isHidden?.();}
 private gainRamps=new Map<GainNode,{from:number;to:number;start:number;end:number}>();
 private listeners=new Set<()=>void>();private last=new Map<Cue,number>();private noise?:AudioBuffer;private cipherVoice=0;
 muted:boolean;private platform:SoundPlatform;
 constructor(platform=browserPlatform()){this.platform=platform;this.muted=!!platform.silent||readMuted(platform.storage);}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 getSnapshot=()=>this.muted;
 private ramp(node:GainNode,value:number,seconds=.7){
  const t=this.ctx!.currentTime,previous=this.gainRamps.get(node),fraction=previous&&previous.end>previous.start?Math.max(0,Math.min(1,(t-previous.start)/(previous.end-previous.start))):1;
  const current=previous?previous.from+(previous.to-previous.from)*fraction:node.gain.value;
  // Explicitly anchor the ramp; a bare future linear endpoint can fade from context startup.
  node.gain.cancelScheduledValues(t);node.gain.setValueAtTime(current,t);node.gain.linearRampToValueAtTime(value,t+seconds);
  this.gainRamps.set(node,{from:current,to:value,start:t,end:t+seconds});
 }
 /** A gesture may resume one existing context, but never resurrect stale work. */
 unlock():Promise<boolean>{
  if(this.platform.silent||this.muted||this.backgrounded())return Promise.resolve(false);
  if(this.flight)return this.flight;
  const epoch=this.epoch;
  const attempt=(async()=>{try{
   if(this.quiet)await this.quiet;
   if(epoch!==this.epoch||this.muted||this.backgrounded())return false;
   if(!this.ctx){this.ctx=this.platform.createContext();this.synth=new MusicSynth(this.ctx);this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);this.hq=this.ctx.createGain();this.raid=this.ctx.createGain();this.infiltration=this.ctx.createGain();this.hq.connect(this.master);this.raid.connect(this.master);this.infiltration.connect(this.master);this.hq.gain.value=0;this.raid.gain.value=0;this.infiltration.gain.value=0;this.music=new RecordedMusic(this.ctx,{hq:this.hq,raid:this.raid,infiltration:this.infiltration},this.platform.loadTrack??loadApprovedTrack);
    const ctx=this.ctx;ctx.onstatechange=()=>{if(this.ctx!==ctx||this.resuming===ctx)return;if(ctx.state!=='running'&&this.audible||ctx.state==='running'&&(!this.audible||this.backgrounded()))void this.silence();};
   }
   const ctx=this.ctx;this.resuming=ctx;
   try{await ctx.resume();}finally{if(this.resuming===ctx)this.resuming=undefined;}
   if(this.ctx!==ctx||epoch!==this.epoch||this.platform.silent||this.muted||this.backgrounded()||ctx.state!=='running'){if(this.ctx===ctx){if(this.quiet)await this.quiet;if(this.ctx===ctx)void this.silence();}return false;}
   this.audible=true;this.ramp(this.master!,.22,.08);
   if(this.platform.ambience!==false&&!this.ambience)this.ambience=new HQAmbience(ctx,this.master!);if(this.mode==='hq')this.ambience?.start();
   if(!this.timer)this.timer=setInterval(()=>this.schedule(),100);void this.activate(this.mode);this.schedule();return true;
  }catch{return false;}})();
  this.flight=attempt;void attempt.then(()=>{if(this.flight===attempt)this.flight=undefined;});return attempt;
 }
 /** Fade on the audio clock before stopping sources. JS suspension is only cleanup:
     if iOS freezes timers, scheduled gains and source stops still make the mix silent. */
 private silence(){
  this.audible=false;this.epoch++;if(this.timer)clearInterval(this.timer);this.timer=undefined;
  if(this.quiet)return this.quiet;
  const ctx=this.ctx;if(!ctx)return Promise.resolve();
  const fade=ctx.state==='running'?.025:0,at=ctx.currentTime+(fade?fade+.005:0);
  if(this.master)this.ramp(this.master,0,fade);
  this.ambience?.stop(fade?fade+.005:0);this.synth?.stopAll(at);this.music?.stopAll(at);
  for(const source of this.effects){try{source.stop(at);}catch{}}this.effects.clear();
  this.playingMode=undefined;this.last.clear();this.fadeUntil={hq:0,raid:0,infiltration:0};
  const suspend=async()=>{try{if(ctx.state!=='closed')await ctx.suspend();}catch{}};
  const pending=fade?new Promise<void>(resolve=>setTimeout(()=>void suspend().then(resolve),40)):suspend();
  this.quiet=pending;void pending.then(()=>{if(this.quiet===pending)this.quiet=undefined;});return pending;
 }
 private async activate(mode:MusicMode){
  const ctx=this.ctx,music=this.music;if(!ctx||!music||!this.audible||this.muted||this.backgrounded()||ctx.state!=='running')return;const epoch=this.epoch;
  // Attack scenes are effects-only. Do not download or start a music buffer;
  // fade the outgoing HQ once, even when repeated gestures call activate again.
  if(mode!=='hq'){
   this.ambience?.stop();
   if(this.playingMode){this.fadeUntil[this.playingMode]=ctx.currentTime+1.1;this.ramp(this.hq!,0,1.1);this.ramp(this.raid!,0,1.1);this.ramp(this.infiltration!,0,1.1);this.playingMode=undefined;}
   return;
  }
  try{await music.load(mode);if(this.ctx!==ctx||this.music!==music||epoch!==this.epoch||!this.audible||this.muted||this.backgrounded()||this.mode!==mode||ctx.state!=='running')return;
   if(this.playingMode!==mode||!music.has(mode)){const previous=this.playingMode;music.start(mode);if(previous)this.fadeUntil[previous]=ctx.currentTime+1.1;this.ramp(this.hq!,MUSIC_GAIN*HQ_AUDIO.musicScale,1.1);this.ramp(this.raid!,0,1.1);this.ramp(this.infiltration!,0,1.1);this.playingMode=mode;this.ambience?.start();}
  }catch{/* Missing/unsupported audio never blocks gameplay; a later gesture retries. */}
 }
 setMuted(value:boolean){if(this.platform.silent)return;this.muted=value;writeMuted(this.platform.storage,value);if(value)void this.silence();else void this.unlock();for(const listener of this.listeners)listener();}
 setMode(mode:MusicMode){if(mode===this.mode)return;this.mode=mode;void this.activate(mode);}
 visibility(hidden:boolean){this.hidden=hidden;if(hidden)void this.silence();/* Foreground waits for a fresh gesture; no autoplay or queued cue replay. */}
 private note(...args:Parameters<MusicSynth['note']>){this.synth?.note(...args);}
 private schedule(){
  if(!this.ctx||!this.music||this.ctx.state!=='running'||this.platform.silent||!this.audible||this.backgrounded())return;
  if(!this.muted&&this.mode==='hq')this.ambience?.tick();
  for(const mode of ['hq','raid','infiltration'] as const)if(mode!==this.playingMode&&this.ctx.currentTime>=this.fadeUntil[mode])this.music.stop(mode);
 }
 cue=(cue:Cue)=>{
  if(!this.ctx||this.ctx.state!=='running'||this.platform.silent||this.muted||!this.audible||this.backgrounded())return;const t=this.ctx.currentTime;
  const gap=cue==='cipher-hacking'?.55:cue==='drone-laser'?.14:cue.startsWith('building-')?.16:cue==='laser'||cue==='impact'?.09:cue==='destroy'?.12:.04;if(t-(this.last.get(cue)??-10)<gap)return;this.last.set(cue,t);
  const out=this.master!;
  if(cue in INFILTRATION_CUES){const variation=cue==='cipher-deploy'?[-.5,0,.5,0][this.cipherVoice++%4]:0;for(const voice of INFILTRATION_CUES[cue as InfiltrationCue])this.note(voice.note+variation,t+voice.at,voice.duration,voice.gain,out,voice.type,.004,voice.end+variation);return;}
  if(cue==='hack'){[76,83,88].forEach((n,i)=>this.note(n,t+i*.06,.14,.085,out,'sine',.008));return;}if(cue==='security-alert'){this.note(74,t,.15,.1,out,'triangle',.012);this.note(70,t+.18,.16,.08,out,'triangle',.012);return;}if(cue==='extraction'){[69,76,81,88].forEach((n,i)=>this.note(n,t+i*.08,.4,.11,out,'sine',.012));return;}
  if(cue in BUILDING_SOUNDS){const voice=BUILDING_SOUNDS[cue as keyof typeof BUILDING_SOUNDS];voice.notes.forEach((note,i)=>this.note(note,t+i*voice.gap,voice.duration,.1,out,voice.type,.012));return;}
  if(cue==='clear-tree'){[74,81,86].forEach((n,i)=>this.note(n,t+i*.065,.2,.055,out,'sine',.015));return;}
  if(cue==='clear-scrap'){[50,62,78].forEach((n,i)=>this.note(n,t+i*.07,.16,.065,out,'triangle',.01));return;}
  if(cue==='tap')this.note(81,t,.075,.13,out,'sine',.002,76);
  if(cue==='deploy'){this.note(62,t,.18,.16,out,'triangle',.005);this.note(74,t+.06,.3,.13,out);}
  if(cue==='laser')this.note(94,t,.11,.08,out,'sine',.002,52);
  if(cue==='impact'||cue==='destroy'){
   if(!this.noise){this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*.3,this.ctx.sampleRate);const a=this.noise.getChannelData(0);let seed=37;for(let i=0;i<a.length;i++){seed=(seed*1664525+1013904223)>>>0;a[i]=(seed/4294967296)*2-1;}}
   const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=this.noise;filter.type='lowpass';filter.frequency.value=cue==='destroy'?800:1400;voiceEnvelope(gain.gain,t,.24,cue==='destroy'?.26:.08,.008);source.connect(filter);filter.connect(gain);gain.connect(out);this.effects.add(source);source.start(t);source.stop(t+.26);source.onended=()=>{this.effects.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};
  }
  const notes=cue==='win'?[62,66,69,74,78]:cue==='resources'?[81,86,90]:cue==='upgrade'?[57,62,66,74]:[];
  notes.forEach((n,i)=>this.note(n,t+i*.1,.65,.12,out,'sine',.008));
 };
 dispose(){
  const ctx=this.ctx,music=this.music,ambience=this.ambience,quiet=this.silence();
  if(ctx)ctx.onstatechange=null;
  // Invalidate references immediately; asynchronous unlock/load cannot restart this graph.
  this.ctx=undefined;this.music=undefined;this.ambience=undefined;this.synth=undefined;this.flight=undefined;
  this.master=undefined;this.hq=undefined;this.raid=undefined;this.infiltration=undefined;this.noise=undefined;this.gainRamps.clear();
  void quiet.then(()=>{ambience?.dispose();music?.dispose();try{void ctx?.close().catch(()=>{});}catch{}});
 }

}
export const sound=new Soundscape();
// Module lifetime, not React lifetime: interruptions can arrive before/after a screen mounts.
import {installAudioLifecycle} from './lifecycle';
const removeLifecycle=typeof window!=='undefined'?installAudioLifecycle(sound,window,document):undefined;
if(import.meta.hot)import.meta.hot.dispose(()=>{removeLifecycle?.();sound.dispose();});
export { MUTE_KEY };
