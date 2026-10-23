import test from 'node:test';
import assert from 'node:assert/strict';
import { Soundscape,testAudioDisabled,voiceEnvelope } from '../src/audio/sound';
import { frequency, MUTE_KEY, readMuted, writeMuted, type Cue } from '../src/audio/score';
class Param {
 events:{kind:string;value:number;time:number}[]=[];value=1;ramps:number[]=[];beforeFirstEvent?:number;
 setValueAtTime(v:number,time=0){this.events.push({kind:'set',value:v,time});this.beforeFirstEvent??=this.value;this.value=v;return this;}
 linearRampToValueAtTime(v:number,time=0){this.events.push({kind:'linear',value:v,time});this.ramps.push(v);this.value=v;return this;}
 exponentialRampToValueAtTime(v:number){this.ramps.push(v);this.value=v;return this;}
 cancelScheduledValues(){return this;}
}
class Node {
 gain=new Param();frequency=new Param();type='sine';buffer:unknown;onended?:()=>void;starts=0;stops=0;stopTimes:number[]=[];loop=false;offsets:number[]=[];disconnected=false;
 connect(){return this;}disconnect(){this.disconnected=true;}start(_time=0,offset=0){this.starts++;this.offsets.push(offset);}stop(at=0){this.stops++;this.stopTimes.push(at);}
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
function harness(saved?:string){let created=0;const data=new Map<string,string>(saved?[[MUTE_KEY,saved]]:[]),ctx=new Context();const storage={getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>{data.set(k,v);}};const platform={storage,ambience:false,loadTrack:async(_ctx:AudioContext,mode:string)=>({duration:mode==='hq'?34.28570833333333:32} as AudioBuffer),createContext:()=>{created++;return ctx as unknown as AudioContext;}};return {sound:new Soundscape(platform),platform,data,ctx,created:()=>created};}
async function ready(audio:Soundscape){await audio.unlock();await (audio as any).activate((audio as any).mode);}

test('audio never creates a context before interaction and remembered mute prevents autoplay',async()=>{
 const h=harness('true');assert.equal(h.sound.muted,true);h.sound.setMode('raid');h.sound.cue('win');assert.equal(h.created(),0);await ready(h.sound);assert.equal(h.created(),0);
 h.sound.setMuted(false);await ready(h.sound);assert.equal(h.created(),1);assert.equal(h.ctx.state,'running');assert.equal(h.data.get(MUTE_KEY),'false');h.sound.dispose();
});
test('music crossfades gently, all effects produce bounded voices, and mute silences every bus',async()=>{
 const h=harness();try{await ready(h.sound);assert.equal(h.ctx.gains[0].gain.value,.22);assert.ok(h.ctx.sources.length>0);h.sound.setMode('raid');await (h.sound as any).activate('raid');assert.equal(h.ctx.gains[1].gain.value,0);assert.equal(h.ctx.gains[2].gain.value,0);
 for(const cue of ['tap','deploy','laser','impact','destroy','win','resources','upgrade'] as Cue[]){h.ctx.currentTime++;const before=h.ctx.sources.length;h.sound.cue(cue);assert.ok(h.ctx.sources.length>before,cue);}
 const before=h.ctx.sources.length;h.sound.cue('laser');h.sound.cue('laser');assert.equal(h.ctx.sources.length,before+1,'rapid fire is rate limited');
 h.sound.setMuted(true);assert.equal(h.ctx.gains[0].gain.value,0);const mutedCount=h.ctx.sources.length;h.sound.cue('win');assert.equal(h.ctx.sources.length,mutedCount);assert.equal(new Soundscape(h.platform).muted,true);
 h.sound.setMuted(false);await ready(h.sound);assert.equal(h.ctx.gains[0].gain.value,.22);
 }finally{h.sound.dispose();}
});
test('backgrounding suspends audio; returning waits for an interaction to resume on Safari',async()=>{
 const h=harness();try{await ready(h.sound);h.sound.visibility(true);await (h.sound as any).quiet;assert.equal(h.ctx.state,'suspended');const resumes=h.ctx.resumes;h.sound.visibility(false);assert.equal(h.ctx.resumes,resumes);await ready(h.sound);assert.equal(h.ctx.resumes,resumes+1);}finally{h.sound.dispose();}
});
test('blocked storage and unavailable audio do not break the game',async()=>{
 const storage={getItem:()=>{throw new Error('denied');},setItem:()=>{throw new Error('denied');}};
 assert.equal(readMuted(storage),false);assert.doesNotThrow(()=>writeMuted(storage,true));
 const audio=new Soundscape({storage,createContext:()=>{throw new Error('unsupported');}});await assert.doesNotReject(()=>audio.unlock());assert.doesNotThrow(()=>audio.cue('deploy'));audio.dispose();assert.equal(frequency(69),440);
});

import {musicStep} from '../src/audio/score';
test('archived procedural adventure score loops with rests, pitched range and bounded eighth-note timing',()=>{
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
test('recorded music uses one source per mode without catch-up bursts or allocations on repeated unlock',async()=>{
 const h=harness();try{await ready(h.sound);const count=h.ctx.sources.length;for(let i=1;i<=80;i++){h.ctx.currentTime=i*.27;await ready(h.sound);(h.sound as any).schedule();}assert.equal(h.ctx.sources.length,count);assert.equal(h.ctx.sources.filter(n=>n.loop).length,1);h.ctx.currentTime+=600;(h.sound as any).schedule();assert.equal(h.ctx.sources.length,count);}finally{h.sound.dispose();}
});

test('test audio policy is explicit and normal player URLs keep audio enabled',()=>{
 assert.equal(testAudioDisabled(''),false);assert.equal(testAudioDisabled('?testAudio=off'),true);assert.equal(testAudioDisabled('?testAudio=off&other=1'),true);assert.equal(testAudioDisabled('?testAudio=on'),false);assert.equal(testAudioDisabled('',true),true);assert.equal(testAudioDisabled('?testAudio=on',true),true);
});
test('silent previews block every cue and unmute without altering either saved preference',async()=>{
 for(const saved of ['false','true']){const h=harness(saved),audio=new Soundscape({...h.platform,silent:true});
 try{assert.equal(audio.getSnapshot(),true);audio.setMuted(false);audio.setMuted(true);audio.setMode('raid');await ready(audio);for(const cue of ['tap','deploy','laser','impact','destroy','win','resources','upgrade'] as Cue[])audio.cue(cue);assert.equal(h.created(),0);assert.equal(h.data.get(MUTE_KEY),saved);assert.equal(new Soundscape(h.platform).muted,saved==='true');}finally{audio.dispose();h.sound.dispose();}}
});
test('disposing a preview during pending resume cannot start its music scheduler',async()=>{
 const h=harness();let resume!:()=>void;h.ctx.resume=()=>new Promise<void>(resolve=>{resume=()=>{h.ctx.state='running';resolve();};});
 const pending=h.sound.unlock();h.sound.dispose();resume();await pending;await new Promise(r=>setImmediate(r));assert.equal(h.ctx.sources.length,0);assert.equal((h.sound as any).timer,undefined);h.sound.dispose();
});

test('explicit disposal fades then closes playback and a normal player can resume with effects after returning',async()=>{
 const h=harness();try{await ready(h.sound);h.ctx.currentTime=50;h.sound.cue('tap');h.sound.dispose();await (h.sound as any).quiet;assert.equal(h.ctx.state,'closed');assert.equal((h.sound as any).timer,undefined);h.ctx.currentTime=0;await ready(h.sound);const before=h.ctx.sources.length;h.sound.cue('tap');assert.ok(h.ctx.sources.length>before);assert.equal(h.data.get(MUTE_KEY),undefined);}finally{h.sound.dispose();}
});

test('every synthesized voice starts from silent initialization and ends at exact silence',async()=>{
 const h=harness();try{
  await ready(h.sound);for(const cue of ['tap','deploy','laser','impact','destroy','win','resources','upgrade'] as Cue[]){h.ctx.currentTime++;h.sound.cue(cue);}
  for(const voice of h.ctx.gains.slice(4)){
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
test('building interactions have six distinct quiet original cues and obey mute/test policies',async()=>{
 assert.equal(new Set(Object.values(BUILDING_SOUNDS).map(p=>JSON.stringify(p))).size,6);
 const h=harness();try{await ready(h.sound);for(const cue of Object.keys(BUILDING_SOUNDS) as (keyof typeof BUILDING_SOUNDS)[]){h.ctx.currentTime++;const before=h.ctx.sources.length;h.sound.cue(cue);assert.equal(h.ctx.sources.length-before,BUILDING_SOUNDS[cue].notes.length);h.sound.cue(cue);assert.equal(h.ctx.sources.length-before,BUILDING_SOUNDS[cue].notes.length);}
 h.sound.setMuted(true);const count=h.ctx.sources.length;for(const cue of Object.keys(BUILDING_SOUNDS) as Cue[])h.sound.cue(cue);assert.equal(h.ctx.sources.length,count);
 }finally{h.sound.dispose();}
 const silent=new Soundscape({...h.platform,silent:true});try{await silent.unlock();const count=h.ctx.sources.length;for(const cue of Object.keys(BUILDING_SOUNDS) as Cue[])silent.cue(cue);assert.equal(h.ctx.sources.length,count);}finally{silent.dispose();}
});

import {MUSIC_LOOP_STEPS,RAID_CHORDS,CHORDS,musicModeFor} from '../src/audio/score';
test('archived procedural combat is an independent sixteen-bar composition, with different harmony, melody and syncopation',()=>{assert.notDeepEqual(RAID_CHORDS,CHORDS);let bass=0,kicks=0;const raidMelody=[];for(let step=0;step<MUSIC_LOOP_STEPS.raid;step++){const score=musicStep(step,'raid');assert.deepEqual(score,musicStep(step+MUSIC_LOOP_STEPS.raid,'raid'));assert.ok(score.seconds>.11&&score.seconds<.12);assert.ok([score.bass,score.melody,score.arp,...score.chord].every(n=>n===null||n>=24&&n<=96));if(score.bass!==null)bass++;if(score.kick)kicks++;raidMelody.push(score.melody);}assert.equal(bass,96);assert.equal(kicks,64);assert.notDeepEqual(raidMelody.slice(0,64),Array.from({length:64},(_,i)=>musicStep(i,'hq').melody));});
test('raid music is limited to open active battles; results, base, selection and menu restore HQ',()=>{for(const phase of ['splash','menu','game'])for(const panel of [null,'attack','settings','raid'])for(const settled of [false,true])assert.equal(musicModeFor(phase,panel,{settled}),phase==='game'&&panel==='raid'&&!settled?'raid':'hq');assert.equal(musicModeFor('game','raid',null),'hq');});
test('HQ fades out for effects-only attacks, keeps its position and resumes without duplicates',async()=>{
 const h=harness();try{await ready(h.sound);const s=h.sound as any;h.ctx.currentTime=5;h.sound.setMode('raid');await s.activate('raid');assert.equal(h.ctx.sources.filter(n=>n.loop).length,1);const deadline=s.fadeUntil.hq;
 for(let i=0;i<8;i++){h.ctx.currentTime=5+i*.1;await ready(h.sound);}assert.equal(s.fadeUntil.hq,deadline,'repeated gestures must not postpone the fade');
 h.ctx.currentTime=7;s.schedule();assert.equal(h.ctx.sources[0].stops,1);h.ctx.currentTime=9;h.sound.setMode('hq');await s.activate('hq');assert.equal(h.ctx.sources.length,2);assert.ok(h.ctx.sources[1].offsets[0]>=7);h.sound.dispose();await (h.sound as any).quiet;for(const n of h.ctx.sources)n.onended?.();assert.ok(h.ctx.sources.every(n=>n.disconnected));assert.equal(s.timer,undefined);assert.equal(h.ctx.state,'closed');}finally{h.sound.dispose();}
});

test('crossfades anchor at transition time and rapid reversals preserve the current interpolated gain',async()=>{const h=harness();try{await ready(h.sound);h.ctx.currentTime=8;h.sound.setMode('raid');await (h.sound as any).activate('raid');assert.deepEqual(h.ctx.gains[1].gain.events.slice(-2),[{kind:'set',value:1.2,time:8},{kind:'linear',value:0,time:9.1}]);assert.deepEqual(h.ctx.gains[2].gain.events.slice(-2),[{kind:'set',value:0,time:8},{kind:'linear',value:0,time:9.1}]);h.ctx.currentTime=8.55;h.sound.setMode('hq');await (h.sound as any).activate('hq');const anchored=h.ctx.gains[1].gain.events.at(-2)!;assert.equal(anchored.time,8.55);assert.ok(Math.abs(anchored.value-.6)<1e-9);h.sound.dispose();assert.equal((h.sound as any).gainRamps.size,0);}finally{h.sound.dispose();}});


test('late asset loads cannot start a disposed, hidden or wrong-mode track',async()=>{
 for(const action of ['dispose','hidden','mode'] as const){const h=harness();const ready=new Map<string,(b:AudioBuffer)=>void>();const audio=new Soundscape({...h.platform,loadTrack:(_ctx,mode)=>new Promise(r=>ready.set(mode,r))});try{const pending=audio.unlock();await Promise.resolve();if(action==='dispose')audio.dispose();if(action==='hidden')audio.visibility(true);if(action==='mode')audio.setMode('raid');ready.get('hq')!({duration:34.2857} as AudioBuffer);await pending;await new Promise(r=>setImmediate(r));assert.equal(h.ctx.sources.length,0);}finally{audio.dispose();h.sound.dispose();}}
});

test('music loading failures retry on interaction while effects remain usable',async()=>{
 const h=harness();let attempts=0;const audio=new Soundscape({...h.platform,loadTrack:async()=>{attempts++;throw Error('offline');}});try{await ready(audio);audio.cue('tap');assert.equal(h.ctx.sources.length,1);await ready(audio);assert.equal(attempts,2);assert.equal(h.ctx.sources.length,1);}finally{audio.dispose();h.sound.dispose();}
});

test('six minutes of HQ playback, repeated mode updates, mute and suspension never duplicate the loop or write test preferences',async()=>{const h=harness();try{await ready(h.sound);const count=h.ctx.sources.length;for(let t=0;t<=360;t++){h.ctx.currentTime=t;h.sound.setMode('hq');(h.sound as any).schedule();}assert.equal(h.ctx.sources.length,count);h.sound.visibility(true);await (h.sound as any).quiet;assert.equal(h.ctx.state,'suspended');await h.sound.unlock();assert.equal(h.ctx.sources.length,count);h.sound.visibility(false);await ready(h.sound);assert.equal(h.ctx.sources.length,count+1);assert.equal(h.ctx.sources.filter(n=>n.loop&&n.stops===0).length,1);h.sound.setMuted(true);h.sound.setMode('raid');await (h.sound as any).activate('raid');assert.equal(h.ctx.sources.length,count+1);assert.equal(h.data.get(MUTE_KEY),'true');h.sound.setMuted(false);await ready(h.sound);assert.equal(h.created(),1);assert.ok(h.ctx.sources.length<=count+1);}finally{h.sound.dispose();assert.ok(h.ctx.sources.every(s=>s.stops===1));}});

test('infiltration fades HQ to silence while keeping effects and shared mute/visibility policy',async()=>{const h=harness();try{await ready(h.sound);h.sound.setMode('infiltration');await (h.sound as any).activate('infiltration');assert.equal(h.ctx.gains[1].gain.value,0);assert.equal(h.ctx.gains[2].gain.value,0);assert.equal(h.ctx.gains[3].gain.value,0);for(const cue of ['hack','security-alert','extraction','building-lab'] as Cue[]){h.ctx.currentTime++;const count=h.ctx.sources.length;h.sound.cue(cue);assert.ok(h.ctx.sources.length>count);}h.sound.visibility(true);await (h.sound as any).quiet;assert.equal(h.ctx.state,'suspended');h.sound.visibility(false);await ready(h.sound);h.sound.setMode('hq');await (h.sound as any).activate('hq');h.ctx.currentTime+=2;(h.sound as any).schedule();assert.equal(h.ctx.gains[3].gain.value,0);h.sound.setMuted(true);const count=h.ctx.sources.length;h.sound.cue('hack');assert.equal(h.ctx.sources.length,count);}finally{h.sound.dispose();}});

test('Cipher deployment, repeating hacking and defense laser respect mute, hidden state and automated silence',async()=>{const cues=['cipher-deploy','cipher-hacking','cipher-shot','drone-laser'] as const;const h=harness();try{await ready(h.sound);for(const cue of cues){h.ctx.currentTime++;const before=h.ctx.sources.length;h.sound.cue(cue);assert.equal(h.ctx.sources.length,before+3);}h.ctx.currentTime++;let before=h.ctx.sources.length;h.sound.cue('cipher-hacking');h.sound.cue('cipher-hacking');assert.equal(h.ctx.sources.length,before+3);h.sound.setMuted(true);before=h.ctx.sources.length;for(const cue of cues)h.sound.cue(cue);assert.equal(h.ctx.sources.length,before);h.sound.visibility(true);for(const cue of cues)h.sound.cue(cue);assert.equal(h.ctx.sources.length,before);const silent=new Soundscape({...h.platform,silent:true});try{await ready(silent);for(const cue of cues)silent.cue(cue);assert.equal(h.ctx.sources.length,before);}finally{silent.dispose();}}finally{h.sound.dispose();}});


test('cold-start attack, unmute and resume never load music; returning HQ loads only HQ',async()=>{
 for(const mode of ['infiltration','raid'] as const){const h=harness(),loads:string[]=[];
 const audio=new Soundscape({...h.platform,loadTrack:async(_ctx,mode)=>{loads.push(mode);return {duration:30} as AudioBuffer;}});
 try{audio.setMode(mode);await ready(audio);assert.deepEqual(loads,[]);assert.equal(h.ctx.sources.length,0);
 audio.cue('cipher-deploy');assert.equal(h.ctx.sources.length,3);audio.setMuted(true);audio.setMuted(false);await ready(audio);
 audio.visibility(true);audio.visibility(false);await ready(audio);assert.deepEqual(loads,[]);
 audio.setMode('hq');await ready(audio);assert.deepEqual(loads,['hq']);assert.equal(h.ctx.sources.filter(n=>n.loop).length,1);
 }finally{audio.dispose();h.sound.dispose();}}
});

test('searching, mission results and reconnect within the infiltration panel remain effects-only',()=>{
 for(const raid of [null,{settled:false},{settled:true}])assert.equal(musicModeFor('game','infiltration',raid),'infiltration');
 assert.equal(musicModeFor('game',null,null),'hq');assert.equal(musicModeFor('menu',null,null),'hq');
});

import {installAudioLifecycle} from '../src/audio/lifecycle';
test('background fade gates the full mix before stopping all active and future effect voices',async()=>{
 const h=harness();try{await ready(h.sound);h.ctx.currentTime=3;h.sound.cue('win');h.sound.cue('destroy');const sources=[...h.ctx.sources],writes=[...h.data];h.sound.visibility(true);
 assert.equal((h.sound as any).timer,undefined);assert.equal(h.ctx.gains[0].gain.events.at(-1)!.value,0);assert.equal(h.ctx.gains[0].gain.events.at(-1)!.time,3.025);
 assert.ok(sources.every(n=>Math.abs(n.stopTimes.at(-1)!-3.03)<1e-9));assert.ok(sources.every(n=>!n.disconnected),'sources disconnect on ended, after the fade');
 const count=h.ctx.sources.length;for(const cue of ['tap','win','destroy','cipher-deploy'] as Cue[])h.sound.cue(cue);assert.equal(await h.sound.unlock(),false);assert.equal(h.ctx.sources.length,count);assert.deepEqual([...h.data],writes);
 await (h.sound as any).quiet;assert.equal(h.ctx.state,'suspended');h.sound.visibility(false);assert.equal(h.ctx.resumes,1);h.ctx.currentTime=3.04;assert.equal(await h.sound.unlock(),true);assert.equal(h.created(),1);assert.equal(h.ctx.sources.filter(n=>n.loop&&n.stops===0).length,1);
 }finally{h.sound.dispose();}
});
test('hiding before the first interaction and hidden unmute never create or resume an AudioContext',async()=>{
 const h=harness();h.sound.visibility(true);h.sound.setMuted(true);h.sound.setMuted(false);assert.equal(await h.sound.unlock(),false);assert.equal(h.created(),0);h.sound.visibility(false);assert.equal(h.created(),0);assert.equal(await h.sound.unlock(),true);h.sound.dispose();
});
test('pending resume cannot play a stale tap after a hidden-visible round trip',async()=>{
 const h=harness();let finish!:()=>void;h.ctx.resume=()=>new Promise<void>(r=>{finish=()=>{h.ctx.state='running';r();};});
 try{const pending=h.sound.unlock();h.sound.visibility(true);h.sound.visibility(false);finish();assert.equal(await pending,false);assert.equal(h.ctx.sources.length,0);assert.equal((h.sound as any).timer,undefined);await (h.sound as any).quiet;assert.equal(h.ctx.state,'suspended');}finally{h.sound.dispose();}
});
test('late track decode stays canceled after hidden-visible even if a fresh interaction resumes effects',async()=>{
 const h=harness();let finish!:(b:AudioBuffer)=>void;h.platform.loadTrack=()=>new Promise<AudioBuffer>(r=>{finish=r;});const audio=new Soundscape(h.platform);
 try{await audio.unlock();audio.visibility(true);audio.visibility(false);h.ctx.currentTime=.04;await audio.unlock();finish({duration:20} as AudioBuffer);await new Promise(r=>setImmediate(r));assert.equal(h.ctx.sources.filter(n=>n.loop&&n.stops===0).length,1);assert.equal(h.created(),1);assert.equal((audio as any).playingMode,'hq');}finally{audio.dispose();}
});
test('concurrent gestures retry resume without multiplying music or contexts',async()=>{
 const h=harness();try{const all=await Promise.all(Array.from({length:15},()=>h.sound.unlock()));assert.ok(all.every(Boolean));assert.equal(h.ctx.resumes,15);assert.equal(h.created(),1);
 for(let i=0;i<8;i++){h.sound.visibility(true);h.sound.visibility(true);h.sound.visibility(false);h.ctx.currentTime+=.05;await Promise.all([h.sound.unlock(),h.sound.unlock()]);await (h.sound as any).activate('hq');assert.equal(h.ctx.sources.filter(n=>n.loop&&n.stops===0).length,1);assert.equal(h.created(),1);}
 }finally{h.sound.dispose();}
});
test('iOS interrupted and unexpected suspended contexts quiesce until a fresh gesture',async()=>{
 for(const state of ['interrupted','suspended']){const h=harness();try{await ready(h.sound);h.ctx.state=state;(h.ctx as any).onstatechange();await (h.sound as any).quiet;const count=h.ctx.sources.length;h.sound.cue('tap');assert.equal(h.ctx.sources.length,count);assert.equal(h.ctx.gains[0].gain.value,0);assert.equal(h.ctx.resumes,1);h.ctx.currentTime+=.05;await ready(h.sound);assert.equal(h.created(),1);assert.equal(h.ctx.resumes,2);}finally{h.sound.dispose();}}
});
test('visibility, pagehide/pageshow and freeze/resume share one non-destructive lifecycle policy',async()=>{
 const h=harness(),win=new EventTarget(),doc=Object.assign(new EventTarget(),{hidden:false}),remove=installAudioLifecycle(h.sound,win,doc);
 try{await ready(h.sound);for(const event of ['visibilitychange','pagehide','freeze']){doc.hidden=true;(event==='pagehide'?win:doc).dispatchEvent(new Event(event));await (h.sound as any).quiet;assert.equal(h.ctx.state,'suspended');assert.equal(h.created(),1);doc.hidden=false;win.dispatchEvent(new Event('pageshow'));doc.dispatchEvent(new Event('resume'));assert.equal(h.ctx.state,'suspended');h.ctx.currentTime+=.05;await ready(h.sound);assert.equal(h.created(),1);}
 remove();win.dispatchEvent(new Event('pagehide'));assert.equal(h.ctx.state,'running');}finally{remove();h.sound.dispose();}
});


test('a pending unsupported pointerdown resume cannot swallow a supported click resume',async()=>{
 const h=harness();let gesture=false;const pending:(()=>void)[]=[];
 h.ctx.resume=()=>{h.ctx.resumes++;return new Promise<void>(resolve=>{pending.push(resolve);if(gesture){h.ctx.state='running';pending.splice(0).forEach(done=>done());}});};
 try{const early=h.sound.unlock();assert.equal(h.ctx.resumes,1);gesture=true;const clicked=h.sound.unlock();assert.equal(h.ctx.resumes,2,'resume called synchronously in supported gesture');assert.equal(await clicked,true);await early;await (h.sound as any).activate('hq');h.sound.cue('tap');assert.ok(h.ctx.sources.some(n=>n.loop));assert.ok(h.ctx.sources.some(n=>!n.loop));assert.equal(h.created(),1);}finally{h.sound.dispose();}
});
test('foreground gesture during fade resumes synchronously and delayed cleanup cannot suspend it',async()=>{
 const h=harness();try{await ready(h.sound);h.sound.visibility(true);h.sound.visibility(false);const before=h.ctx.resumes,pending=h.sound.unlock();assert.equal(h.ctx.resumes,before+1);assert.equal(await pending,true);await (h.sound as any).quiet;assert.equal(h.ctx.state,'running');h.ctx.currentTime+=1;const voices=h.ctx.sources.length;h.sound.cue('tap');assert.ok(h.ctx.sources.length>voices);assert.equal(h.created(),1);}finally{h.sound.dispose();}
});
