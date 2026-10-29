import test from 'node:test';
import assert from 'node:assert/strict';
import {initialFoundation,validFoundationPosition} from '../shared/foundation';
import {commitLayout,layoutFingerprint,layoutInventory,layoutRect,layoutPlacementReason,type LayoutPlacement} from '../shared/layout-draft';
import {wallFootprint} from '../shared/security-catalog';

function saved(){const s=initialFoundation();s.buildingUpdate={version:1,acknowledged:true};s.landscape={items:[],legacyRocksRegistered:true} as any;return s;}
const placements=(s:ReturnType<typeof saved>):LayoutPlacement[]=>layoutInventory(s).map(i=>({id:i.id,position:[...i.layout.position],orientation:i.layout.orientation}));

test('ordinary placement respects the same complete Builder Hut cells as the layout editor',()=>{
 const s=saved();s.builderHuts=[{id:'hut',position:[10.6,12],orientation:0}];
 // The new rig begins at x=12: outside physical hut x=11.95, inside its saved logical x=12.1 edge.
 assert.match(validFoundationPosition(s,[14.5,12.5],'rig')??'',/Builder Hut/);
 assert.equal(validFoundationPosition(s,[15.5,12.5],'rig'),null);
});

test('unchanged legacy walls retain exact position, rotation, dimensions and ownership through save/reload',()=>{
 const s=saved();s.walls=[{id:'legacy-horizontal',position:[20,20],orientation:0,legacy:true},{id:'legacy-vertical',position:[24,20],orientation:1,legacy:true}];
 s.buildingLevels={'wall:legacy-horizontal':3,'wall:legacy-vertical':5};s.compute=743;s.research=105;s.bots=3;
 const before=structuredClone(s),p=placements(s);
 for(const item of layoutInventory(s).filter(i=>i.kind==='wall'))assert.deepEqual(layoutRect(item,item.layout),wallFootprint(s.walls.find(w=>w.id===item.id)!));
 commitLayout(s,layoutFingerprint(s),p);
 const loaded=JSON.parse(JSON.stringify(s));assert.deepEqual(loaded.walls,before.walls);assert.deepEqual(loaded.buildingLevels,before.buildingLevels);assert.equal(loaded.compute,743);assert.equal(loaded.research,105);assert.equal(loaded.bots,3);
});

test('legacy conflicting placements remain owned and stationary while new overlaps are rejected',()=>{
 const s=saved();s.rig={position:[-5,-1],orientation:0,startedAt:1,completesAt:2,lastProducedAt:2,stored:17};
 const p=placements(s),original=structuredClone(s.rig);
 commitLayout(s,layoutFingerprint(s),p);assert.deepEqual(s.rig,original);
 const moved=p.map(v=>v.id==='rig'?{...v,position:[-4.5,-.5] as [number,number]}:v);
 assert.match(layoutPlacementReason(s,moved,moved.find(v=>v.id==='rig')!)??'',/space/);
 const before=structuredClone(s);assert.throws(()=>commitLayout(s,layoutFingerprint(s),moved));assert.deepEqual(s,before);
});

test('explicitly moving a legacy wall converts only that wall to a validated one-tile placement',()=>{
 const s=saved();s.walls=[{id:'moved',position:[20,20],orientation:0,legacy:true},{id:'kept',position:[24,20],orientation:1,legacy:true}];
 const p=placements(s).map(v=>v.id==='moved'?{...v,position:[20.5,22.5] as [number,number]}:v);
 commitLayout(s,layoutFingerprint(s),p);assert.equal(s.walls[0].legacy,undefined);assert.deepEqual(wallFootprint(s.walls[0]),{x:20.5,z:22.5,w:1,d:1});assert.equal(s.walls[1].legacy,true);assert.deepEqual(s.walls[1].position,[24,20]);
});
