import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVA_SPRITES} from '../src/ui/avaAssets';

test('every live Ava pose uses the same redesigned, registered transparent delivery',()=>{
 const metadata=JSON.parse(readFileSync('art/ava/likeness-v2/delivery.json','utf8'));
 for(const [pose,url] of Object.entries(AVA_SPRITES)){
  assert.equal(url,`/characters/ava/${pose}-full-v2.webp`);
  const file=readFileSync(`public${url}`),m=metadata[pose];
  assert.equal(file.toString('ascii',0,4),'RIFF');
  assert.equal(file.toString('ascii',8,12),'WEBP');
  assert.equal(1+file.readUIntLE(24,3),640);
  assert.equal(1+file.readUIntLE(27,3),960);
  assert.ok(file[20]&16,'alpha retained');
  assert.ok(file.length<120000,'bounded mobile delivery');
  assert.equal(file.length,m.bytes);
  assert.ok(Math.abs(m.bodyBounds[1]-21)<=1,'original helmet top');
  assert.ok(Math.abs(m.bodyBounds[3]-941)<=1,'original foot baseline');
  assert.ok(Math.abs(m.headCenterX-308.75)<=1,'original face axis');
 }
});
