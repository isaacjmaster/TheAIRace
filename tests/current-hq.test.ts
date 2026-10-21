import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {IDENTITY_TRACKS,SUPPLIED_V1_TRACKS,identityTrack} from '../src/audio/identityTracks';
test('current HQ is the selected Twoson recording with preserved source and fallback exports',()=>{
 const t=IDENTITY_TRACKS.hq,s=JSON.parse(readFileSync('music/supplied-v2/hq-measurements.json','utf8'));
 assert.equal(identityTrack('hq',''),t);assert.equal(identityTrack('hq','?music=supplied-v1'),SUPPLIED_V1_TRACKS.hq);
 assert.match(s.sourceFilename,/Earthbound Music Twoson/);
 const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
 assert.equal(hash('music/supplied-v2/source/hq.mp3'),s.sourceSha256);
 for(const [name,info] of Object.entries(s.exports) as [string,{sha256:string}][])assert.equal(hash('public/audio/supplied-v2/'+name),info.sha256);
 assert.equal(hash('public'+t.wav),t.sha256Wav);assert.ok(t.compressedBytes<4_000_000);assert.ok(s.truePeakDbTP<-1);
 const wav=readFileSync('public'+t.wav),guard=t.sampleRate*4,n=Math.round(t.seconds*t.sampleRate)*4;
 assert.equal(wav.length,44+t.frames*4);assert.ok(wav.subarray(44,44+guard).equals(wav.subarray(44+n,44+n+guard)));
 assert.ok(wav.subarray(44+guard+n).equals(wav.subarray(44+guard,44+2*guard)));
});
