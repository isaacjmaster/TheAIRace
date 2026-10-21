import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {IDENTITY_TRACKS,LEGACY_IDENTITY_TRACKS,identityTrack} from '../src/audio/identityTracks';
import {loadApprovedTrack} from '../src/audio/tracks';
import {musicLoop} from '../src/audio/RecordedMusic';

test('supplied recordings are defaults and both prior recordings remain available',()=>{
 for(const mode of ['hq','infiltration'] as const){
  assert.equal(identityTrack(mode,''),IDENTITY_TRACKS[mode]);
  assert.equal(identityTrack(mode,'?music=previous'),LEGACY_IDENTITY_TRACKS[mode]);
  const t=IDENTITY_TRACKS[mode],stats=JSON.parse(readFileSync(`music/supplied-v1/${mode}-measurements.json`,'utf8'));
  const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
  assert.equal(hash(`music/supplied-v1/source/${mode}.mp3`),stats.sourceSha256);
  for(const [name,info] of Object.entries(stats.exports) as [string,{sha256:string}][])assert.equal(hash(`public/audio/supplied-v1/${name}`),info.sha256);
  const wav=readFileSync('public'+t.wav),guard=32000*4,n=Math.round(t.seconds*32000)*4;
  assert.equal(wav.length,44+t.frames*4);
  assert.ok(wav.subarray(44,44+guard).equals(wav.subarray(44+n,44+n+guard)));
  assert.ok(wav.subarray(44+guard+n).equals(wav.subarray(44+guard,44+guard*2)));
  assert.ok(stats.truePeakDbTP<-1);assert.ok(t.compressedBytes<4_000_000);
 }
 const hq=JSON.parse(readFileSync('music/supplied-v1/hq-measurements.json','utf8'));
 const attack=JSON.parse(readFileSync('music/supplied-v1/infiltration-measurements.json','utf8'));
 assert.ok(Math.abs(hq.lufs-attack.lufs-4)<.1,'infiltration mixed 4 dB quieter');
});

test('both scenes accept AAC padding, reject truncated decodes and fall back through FLAC to PCM',async()=>{
 const original=globalThis.fetch;
 try{
  for(const mode of ['hq','infiltration'] as const){
   const t=IDENTITY_TRACKS[mode],calls:string[]=[];
   globalThis.fetch=async input=>{calls.push(String(input));return new Response(new Uint8Array([1]));};
   let count=0;
   let ctx={sampleRate:48000,decodeAudioData:async()=>({duration:t.encodedSeconds+.02})} as unknown as AudioContext;
   let b=await loadApprovedTrack(ctx,mode,new AbortController().signal);
   assert.deepEqual(calls,[t.aac]);assert.deepEqual(musicLoop(b),{start:t.loopStart,end:t.loopEnd});
   calls.length=0;
   ctx={sampleRate:48000,decodeAudioData:async()=>{count++;if(count===1)throw Error('AAC unsupported');return {duration:count===2?t.encodedSeconds-1:t.encodedSeconds};}} as unknown as AudioContext;
   b=await loadApprovedTrack(ctx,mode,new AbortController().signal);
   assert.deepEqual(calls,[t.aac,t.flac,t.wav]);assert.deepEqual(musicLoop(b),{start:t.loopStart,end:t.loopEnd});
  }
 }finally{globalThis.fetch=original;}
});
