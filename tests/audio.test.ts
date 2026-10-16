import test from 'node:test';
import assert from 'node:assert/strict';
import { Soundscape } from '../src/audio/sound';
import { frequency, MUTE_KEY, readMuted, writeMuted, type Cue } from '../src/audio/score';
class Param {
 value=0;ramps:number[]=[];
 setValueAtTime(v:number){this.value=v;return this;}
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
