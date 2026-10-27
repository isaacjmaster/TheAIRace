import assert from 'node:assert/strict';
import test from 'node:test';
import {findPath,segmentClear,findPathToAny} from '../shared/navigation';

test('exhausted navigation components reject sealed crossings but retain same-side routes',()=>{
 const bounds={minX:-8,maxX:8,minZ:-8,maxZ:8};
 const walls=[{x:0,z:0,w:1,d:16},{x:-4,z:0,w:1,d:5}];
 assert.deepEqual(findPath([-7,0],[6,0],walls,bounds),[]);
 for(const from of [[-6,-4],[-2,4]] as [number,number][]){
  assert.deepEqual(findPath(from,[6,3],walls,bounds),[]);
  assert.deepEqual(findPath([6,3],from,walls,bounds),[]);
 }
 const path=findPath([-7,0],[-2,0],walls,bounds);
 assert.ok(path.length>2);
 for(let i=1;i<path.length;i++)assert.ok(segmentClear(path[i-1],path[i],walls,bounds,.35));
 assert.deepEqual(findPath([-7,0],[-2,0],walls,bounds),path);
});

test('wall breaches and clearance changes invalidate disconnected-component results',()=>{
 const bounds={minX:-6,maxX:6,minZ:-6,maxZ:6},walls=[{x:0,z:0,w:1,d:12}];
 assert.deepEqual(findPath([-4,0],[4,0],walls,bounds),[]);
 walls[0].d=10;
 assert.ok(findPath([-4,0],[4,0],walls,bounds).length);
 assert.deepEqual(findPath([-4,0],[4,0],walls,bounds,1),[]);
 assert.ok(findPath([-4,0],[4,0],walls,bounds,.2).length);
 walls.length=0;
 assert.deepEqual(findPath([-4,0],[4,0],walls,bounds),[[-4,0],[4,0]]);
});


test('multi-goal firing search finds a reachable surface without crossing walls and is deterministic',()=>{
 const bounds={minX:-12,maxX:12,minZ:-12,maxZ:12},walls=[{x:0,z:0,w:1,d:24}],from:[number,number]=[-6,0],goals=[{point:[6,0] as [number,number],penalty:0},{point:[-3,4] as [number,number],penalty:.4}];
 const path=findPathToAny(from,goals,walls,bounds,.65);assert.deepEqual(path.at(-1),[-3,4]);for(let i=1;i<path.length;i++)assert.ok(segmentClear(path[i-1],path[i],walls,bounds,.65));assert.deepEqual(findPathToAny(from,goals,walls,bounds,.65),path);
 assert.deepEqual(findPathToAny(from,goals.slice(0,1),walls,bounds,.65),[]);
});
