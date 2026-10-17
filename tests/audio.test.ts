import test from 'node:test';
import assert from 'node:assert/strict';
import { Soundscape,testAudioDisabled,voiceEnvelope } from '../src/audio/sound';
import { frequency, MUTE_KEY, readMuted, writeMuted, type Cue } from '../src/audio/score';
class Param {
 value=1;ramps:number[]=[];beforeFirstEvent?:number;
 setValueAtTime(v:number){this.beforeFirstEvent??=this.value;this.value=v;return this;}
 linearRampToValueAtTime(v:number){this.ramps.push(v);this.value=v;return this;}
 exponentialRampToValueAtTime(v:number){this.ramps.push(v);this.value=v;return this;}
 cancelScheduledValues(){return this;}
}
class Node {
 gain=new Param();frequency=new Param();type='sine';buffer:unknown;onended?:()=>void;starts=0;disconnected=false;
 connect(){return this;}disconnect(){this.disconnected=true;}start(){this.starts++;}stop(){}
}
class Context {
 currentTime=0;state='suspended';destination=new Node();sampleRate=44100;gains:Node[]=[];sources:Node[]=[];resumes=0;suspends=0;
 createGain(){const n=new Node();this.gains.push(n);return n;}
 createOscillator(){const n=new Node();this.sources.push(n);return n;}
 createBufferSource(){const n=new Node();this.sources.push(n);return n;}
 createBiquadFilter(){return new Node();}
 createBuffer(_channels:number,length:number){return {getChannelData:()=>new Float32Array(length)};}
 async resume(){this.state='running';this.resumes++;}async suspend(){this.state='suspended';this.suspends++;}async close(){this.state='closed';}
}
function harness(saved?:string){let created=0;const data=new Map<string,string>(saved?[[MUTE_KEY,saved]]:[]),ctx=new Context();const storage={getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>{data.set(k,v);}};const platform={storage,createContext:()=>{created++;return ctx as unknown as AudioContext;}};return {sound:new Soundscape(platform),platform,data,ctx,created:()=>created};}
test('audio never creates a context before interaction and remembered mute prevents autoplay',async()=>{
 const h=harness('true');assert.equal(h.sound.muted,true);h.sound.setMode('raid');h.sound.cue('win');assert.equal(h.created(),0);await h.sound.unlock();assert.equal(h.created(),0);
 h.sound.setMuted(false);await h.sound.unlock();assert.equal(h.created(),1);assert.equal(h.ctx.state,'running');assert.equal(h.data.get(MUTE_KEY),'false');h.sound.dispose();
});
test('music crossfades gently, all effects produce bounded voices, and mute silences every bus',async()=>{
 const h=harness();try{await h.sound.unlock();assert.equal(h.ctx.gains[0].gain.value,.22);assert.ok(h.ctx.sources.length>0);h.sound.setMode('raid');assert.equal(h.ctx.gains[1].gain.value,0);assert.equal(h.ctx.gains[2].gain.value,.5);
 for(const cue of ['tap','deploy','laser','impact','destroy','win','resources','upgrade'] as Cue[]){h.ctx.currentTime++;const before=h.ctx.sources.length;h.sound.cue(cue);assert.ok(h.ctx.sources.length>before,cue);}
 const before=h.ctx.sources.length;h.sound.cue('laser');h.sound.cue('laser');assert.equal(h.ctx.sources.length,before+1,'rapid fire is rate limited');
 h.sound.setMuted(true);assert.equal(h.ctx.gains[0].gain.value,0);const mutedCount=h.ctx.sources.length;h.sound.cue('win');assert.equal(h.ctx.sources.length,mutedCount);assert.equal(new Soundscape(h.platform).muted,true);
 h.sound.setMuted(false);await h.sound.unlock();assert.equal(h.ctx.gains[0].gain.value,.22);
 }finally{h.sound.dispose();}
});
test('backgrounding suspends audio; returning waits for an interaction to resume on Safari',async()=>{
 const h=harness();try{await h.sound.unlock();h.sound.visibility(true);assert.equal(h.ctx.state,'suspended');const resumes=h.ctx.resumes;h.sound.visibility(false);assert.equal(h.ctx.resumes,resumes);await h.sound.unlock();assert.equal(h.ctx.resumes,resumes+1);}finally{h.sound.dispose();}
});
test('blocked storage and unavailable audio do not break the game',async()=>{
 const storage={getItem:()=>{throw new Error('denied');},setItem:()=>{throw new Error('denied');}};
 assert.equal(readMuted(storage),false);assert.doesNotThrow(()=>writeMuted(storage,true));
 const audio=new Soundscape({storage,createContext:()=>{throw new Error('unsupported');}});await assert.doesNotReject(()=>audio.unlock());assert.doesNotThrow(()=>audio.cue('deploy'));audio.dispose();assert.equal(frequency(69),440);
});

import {musicStep} from '../src/audio/score';
test('adventure score loops with rests, pitched range and bounded eighth-note timing',()=>{
 let rests=0;
 for(let step=0;step<64;step++){
  const hq=musicStep(step,'hq'),raid=musicStep(step,'raid');
  assert.deepEqual(hq,musicStep(step+64,'hq'));
  assert.ok(hq.seconds>.25&&hq.seconds<.28);assert.ok(raid.seconds<hq.seconds);
  for(const n of [hq.pluck,hq.bass,hq.melody,...hq.chord])if(n!==null)assert.ok(Number.isFinite(n)&&n>=24&&n<=84);
  if(hq.melody===null)rests++;
 }
 assert.ok(rests>=12,'phrasing leaves breathing room');
});
test('music scheduler bounds every percussion voice and avoids catch-up bursts after interruptions',async()=>{
 const h=harness();try{
  await h.sound.unlock();
  for(let i=1;i<=80;i++){h.ctx.currentTime=i*.27;(h.sound as any).schedule();}
  assert.ok(h.ctx.sources.length<1200,'mobile voice creation remains bounded');
  for(const source of h.ctx.sources){assert.equal(typeof source.onended,'function');source.onended!();assert.equal(source.disconnected,true);}
  const before=h.ctx.sources.length;h.ctx.currentTime+=60;(h.sound as any).schedule();assert.ok(h.ctx.sources.length-before<40,'no missed-minute playback burst');
 }finally{h.sound.dispose();}
});

test('test audio policy is explicit and normal player URLs keep audio enabled',()=>{
 assert.equal(testAudioDisabled(''),false);assert.equal(testAudioDisabled('?testAudio=off'),true);assert.equal(testAudioDisabled('?testAudio=off&other=1'),true);assert.equal(testAudioDisabled('?testAudio=on'),false);assert.equal(testAudioDisabled('',true),true);assert.equal(testAudioDisabled('?testAudio=on',true),true);
});
test('silent previews block every cue and unmute without altering either saved preference',async()=>{
 for(const saved of ['false','true']){const h=harness(saved),audio=new Soundscape({...h.platform,silent:true});
 try{assert.equal(audio.getSnapshot(),true);audio.setMuted(false);audio.setMuted(true);audio.setMode('raid');await audio.unlock();for(const cue of ['tap','deploy','laser','impact','destroy','win','resources','upgrade'] as Cue[])audio.cue(cue);assert.equal(h.created(),0);assert.equal(h.data.get(MUTE_KEY),saved);assert.equal(new Soundscape(h.platform).muted,saved==='true');}finally{audio.dispose();h.sound.dispose();}}
});
test('disposing a preview during pending resume cannot start its music scheduler',async()=>{
 const h=harness();let resume!:()=>void;h.ctx.resume=()=>new Promise<void>(resolve=>{resume=()=>{h.ctx.state='running';resolve();};});
 const pending=h.sound.unlock();h.sound.dispose();resume();await pending;assert.equal(h.ctx.sources.length,0);assert.equal((h.sound as any).timer,undefined);h.sound.dispose();
});

test('page teardown closes playback and a normal player can resume with effects after returning',async()=>{
 const h=harness();try{await h.sound.unlock();h.ctx.currentTime=50;h.sound.cue('tap');h.sound.dispose();assert.equal(h.ctx.state,'closed');assert.equal((h.sound as any).timer,undefined);h.ctx.currentTime=0;await h.sound.unlock();const before=h.ctx.sources.length;h.sound.cue('tap');assert.ok(h.ctx.sources.length>before);assert.equal(h.data.get(MUTE_KEY),undefined);}finally{h.sound.dispose();}
});

test('every synthesized voice starts from silent initialization and ends at exact silence',async()=>{
 const h=harness();try{
  await h.sound.unlock();for(const cue of ['tap','deploy','laser','impact','destroy','win','resources','upgrade'] as Cue[]){h.ctx.currentTime++;h.sound.cue(cue);}
  for(const voice of h.ctx.gains.slice(3)){
   assert.equal(voice.gain.beforeFirstEvent,0,'unity gain must never precede the future attack event');
   assert.equal(voice.gain.value,0,'release must finish at exact zero before stop/disconnect');
   assert.ok(voice.gain.ramps.includes(.0001),'exponential decay has a positive floor');
   assert.equal(voice.gain.ramps.at(-1),0);
  }
 }finally{h.sound.dispose();}
});
test('voice envelope clamps short attacks and schedules a zero tail before the source stops',()=>{
 const events:{kind:string;value:number;time:number}[]=[];
 const p={value:1,setValueAtTime(value:number,time:number){assert.equal(this.value,0);events.push({kind:'set',value,time});},linearRampToValueAtTime(value:number,time:number){events.push({kind:'linear',value,time});},exponentialRampToValueAtTime(value:number,time:number){events.push({kind:'exponential',value,time});}};
 voiceEnvelope(p as unknown as AudioParam,4,.075,.13,.002);
 assert.deepEqual(events.map(e=>e.value),[0,.13,.0001,0]);assert.equal(events[1].time,4.006);assert.equal(events.at(-1)!.time,4.075);
 assert.ok(events.every((e,i)=>i===0||e.time>events[i-1].time));
});


import {BUILDING_SOUNDS} from '../src/audio/score';
test('building interactions have five distinct quiet original cues and obey mute/test policies',async()=>{
 assert.equal(new Set(Object.values(BUILDING_SOUNDS).map(p=>JSON.stringify(p))).size,5);
 const h=harness();try{await h.sound.unlock();for(const cue of Object.keys(BUILDING_SOUNDS) as (keyof typeof BUILDING_SOUNDS)[]){h.ctx.currentTime++;const before=h.ctx.sources.length;h.sound.cue(cue);assert.equal(h.ctx.sources.length-before,BUILDING_SOUNDS[cue].notes.length);h.sound.cue(cue);assert.equal(h.ctx.sources.length-before,BUILDING_SOUNDS[cue].notes.length);}
 h.sound.setMuted(true);const count=h.ctx.sources.length;for(const cue of Object.keys(BUILDING_SOUNDS) as Cue[])h.sound.cue(cue);assert.equal(h.ctx.sources.length,count);
 }finally{h.sound.dispose();}
 const silent=new Soundscape({...h.platform,silent:true});try{await silent.unlock();const count=h.ctx.sources.length;for(const cue of Object.keys(BUILDING_SOUNDS) as Cue[])silent.cue(cue);assert.equal(h.ctx.sources.length,count);}finally{silent.dispose();}
});
