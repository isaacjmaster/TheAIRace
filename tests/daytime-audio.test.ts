import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {HQAmbience,HQ_AUDIO} from '../src/audio/Ambience';import {IDENTITY_TRACKS,SUPPLIED_V2_TRACKS,identityTrack} from '../src/audio/identityTracks';
class Param{value=0;setValueAtTime(v:number){this.value=v;}linearRampToValueAtTime(v:number){this.value=v;}exponentialRampToValueAtTime(v:number){this.value=v;}cancelScheduledValues(){}}
class Node{gain=new Param();frequency=new Param();buffer?:AudioBuffer;loop=false;type='';onended?:()=>void;ended=false;starts=0;connect(){return this;}disconnect(){}start(){this.starts++;}stop(){if(!this.ended){this.ended=true;this.onended?.();}}}
class Context{currentTime=0;sampleRate=8000;nodes:Node[]=[];createBuffer(_c:number,n:number){const a=new Float32Array(n);return {getChannelData:()=>a};}createBufferSource(){const n=new Node();this.nodes.push(n);return n;}createBiquadFilter(){return new Node();}createGain(){return new Node();}createOscillator(){return this.createBufferSource();}}
test('HQ music keeps its source backed up, uses a measured repeat edit and reduces the music bus to forty-two percent',()=>{
 const t=IDENTITY_TRACKS.hq,r=JSON.parse(readFileSync('music/hq-daytime/measurements.json','utf8'));assert.equal(HQ_AUDIO.musicScale,.42);assert.equal(t.seconds,57.0175);assert.equal(identityTrack('hq','?music=supplied-v2'),SUPPLIED_V2_TRACKS.hq);
 assert.equal(createHash('sha256').update(readFileSync('music/supplied-v2/source/hq.mp3')).digest('hex'),r.sourceSha256);assert.ok(r.joinCorrelation>.7);assert.equal(r.joins.length,2);assert.ok(r.joins.every((j:{rmsChangeDb:number})=>Math.abs(j.rmsChangeDb)<4));assert.deepEqual(r.seamDelta,[0,0]);
 for(const [name,info]of Object.entries(r.exports) as [string,{sha256:string}][])assert.equal(createHash('sha256').update(readFileSync('public/audio/hq-daytime/'+name)).digest('hex'),info.sha256);
});
test('daytime has one bed, bounded varied details and no duplicate instances on repeated starts or scene changes',()=>{
 const c=new Context(),a=new HQAmbience(c as unknown as BaseAudioContext,new Node() as unknown as AudioNode);a.start();const count=c.nodes.length;for(let i=0;i<30;i++)a.start();assert.equal(c.nodes.length,count);assert.equal(a.active,true);
 const detailTimes:number[]=[];for(let t=0;t<120;t++){c.currentTime=t;const before=c.nodes.length;a.tick();if(c.nodes.length>before)detailTimes.push(t);assert.ok(a.detailVoices<=3);for(const n of c.nodes.filter(n=>!n.loop&&!n.ended))n.stop();}
 assert.ok(detailTimes.length>=4&&detailTimes.length<20);assert.ok(new Set(detailTimes.slice(1).map((t,i)=>t-detailTimes[i])).size>2);
 a.stop();assert.equal(a.active,false);const stopped=c.nodes.length;c.currentTime=1000;a.tick();assert.equal(c.nodes.length,stopped);a.start();a.stop();a.start();assert.equal(c.nodes.filter(n=>n.loop&&!n.ended).length,1);a.dispose();assert.ok(c.nodes.every(n=>n.ended));
});
