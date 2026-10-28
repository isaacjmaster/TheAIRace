import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import * as THREE from 'three';
import {initialFoundation,type FoundationState} from '../shared/foundation';
import {prepareBuildingUpdate,replacementLayout} from '../shared/building-update';
import {prepareWallRebuild} from '../shared/wall-rebuild';
import {migrateWallRebuild} from '../server/wall-rebuild';
import {wallCapacity} from '../shared/founder-hq';
import {layoutFingerprint,layoutInventory,layoutPlacementReason,commitLayout,type LayoutPlacement} from '../shared/layout-draft';
import {buyWall} from '../shared/cybersecurity';
import {SecurityWalls} from '../src/art/SecurityWalls';
function legacy(count:number){const s=initialFoundation();delete s.wallRebuild;prepareBuildingUpdate(s);s.landscape={items:[],legacyRocksRegistered:true} as any;s.compute=777;s.research=91;s.walls=Array.from({length:count},(_,i)=>({id:'owned-'+i,position:[-25.5+i%20,15.5+Math.floor(i/20)] as [number,number],orientation:0 as const}));s.buildingLevels=Object.fromEntries(s.walls.map((w,i)=>['wall:'+w.id,(i%5+1)])) as any;return s;}
test('wall capacities advance to 200 and retain explicit grandfathered allowances',()=>{assert.deepEqual([1,2,3,4,5].map(founderHqLevel=>wallCapacity({founderHqLevel})),[100,100,120,160,200]);assert.equal(wallCapacity({founderHqLevel:1,wallAllowance:240}),240);assert.equal(wallCapacity({founderHqLevel:5,wallAllowance:140}),200);});
test('wall rebuild snapshots every account and preserves exact identities, levels and investments once',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE foundation_saves(id TEXT PRIMARY KEY,state TEXT NOT NULL)');
 try{const before=new Map<string,FoundationState>();for(const n of [0,50,90,150,200,220]){const s=legacy(n);before.set(String(n),structuredClone(s));db.prepare('INSERT INTO foundation_saves VALUES(?,?)').run(String(n),JSON.stringify(s));}
 assert.deepEqual(migrateWallRebuild(db,100),{total:6,affected:5,walls:710});assert.deepEqual(migrateWallRebuild(db,200),{total:0,affected:0,walls:0});
 for(const [id,original] of before){const s=JSON.parse(String(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(id)!.state)) as FoundationState;assert.deepEqual(s.wallRebuild!.inventory,original.walls);assert.deepEqual(s.buildingLevels,original.buildingLevels);assert.equal(s.compute,777);assert.equal(s.research,91);assert.equal(s.walls!.length,0);assert.equal(!!s.buildingUpdate?.pending,Number(id)>0);assert.ok(wallCapacity(s)>=Number(id));assert.deepEqual(JSON.parse(String(db.prepare('SELECT state FROM wall_rebuild_v1_snapshots WHERE save_id=?').get(id)!.state)),original);if(Number(id))assert.throws(()=>buyWall(s,[30.5,20.5],0,'extra'),/replacement/);}
 }finally{db.close();}
});
test('wall migration transaction rolls back all accounts when an inventory is ambiguous',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE foundation_saves(id TEXT PRIMARY KEY,state TEXT NOT NULL)');try{const a=legacy(2),b=legacy(2);b.walls![1].id=b.walls![0].id;const rows=[JSON.stringify(a),JSON.stringify(b)];rows.forEach((s,i)=>db.prepare('INSERT INTO foundation_saves VALUES(?,?)').run(String(i),s));assert.throws(()=>migrateWallRebuild(db,10),/duplicate/);assert.deepEqual(db.prepare('SELECT state FROM foundation_saves ORDER BY id').all().map(r=>r.state),rows);assert.equal(db.prepare('SELECT COUNT(*) n FROM wall_rebuild_v1_snapshots').get()!.n,0);}finally{db.close();}
});
test('replacement layout is atomic, retains mixed levels, clears inventory and cannot award again',()=>{
 const s=legacy(200);s.founderHqLevel=5;const owned=structuredClone(s.walls),levels=structuredClone(s.buildingLevels);prepareWallRebuild(s,10);assert.equal(replacementLayout(s).walls!.length,200);
 const items=layoutInventory(s),placed:LayoutPlacement[]=items.filter(i=>i.kind!=='wall').map(i=>({id:i.id,...i.layout}));
 for(const item of items.filter(i=>i.kind==='wall')){let found=false;for(let z=-24.5;z<29&&!found;z++)for(let x=-31.5;x<35&&!found;x++){const p={id:item.id,position:[x,z] as [number,number],orientation:0 as const};if(!layoutPlacementReason(s,placed,p)){placed.push(p);found=true;}}assert.ok(found);}
 const before=structuredClone(s),fingerprint=layoutFingerprint(s);assert.throws(()=>commitLayout(s,fingerprint,placed.slice(1)));assert.deepEqual(s,before);commitLayout(s,fingerprint,placed);assert.equal(s.wallRebuild!.completed,true);assert.equal(s.wallRebuild!.inventory.length,0);assert.equal(s.buildingUpdate!.pending,false);assert.deepEqual(s.walls!.map(w=>w.id),owned!.map(w=>w.id));assert.deepEqual(s.buildingLevels,levels);assert.equal(s.compute,777);assert.equal(prepareWallRebuild(s,99),false);assert.throws(()=>buyWall(s,[30.5,25.5],0,'extra'),/limit/);
});
test('mixed wall straight lines, junctions and 200-cell perimeters stay inside one-tile envelopes',()=>{
 const configurations=[[[0,0]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[0,1]],[[0,0],[1,0],[-1,0],[0,1],[0,-1]],Array.from({length:200},(_,i)=>[i%50,Math.floor(i/50)])];
 for(const cells of configurations){const walls=cells.map(([x,z],i)=>({id:'w'+i,x,z,w:1,d:1,level:(i%5+1) as 1|2|3|4|5})),view=new SecurityWalls(walls);try{const b=new THREE.Box3().setFromObject(view.group);assert.ok(b.min.x>=Math.min(...cells.map(c=>c[0]))-.501&&b.max.x<=Math.max(...cells.map(c=>c[0]))+.501);assert.ok(b.min.z>=Math.min(...cells.map(c=>c[1]))-.501&&b.max.z<=Math.max(...cells.map(c=>c[1]))+.501);assert.ok(b.max.y<2.0,'decorative crystal finials remain bounded above unchanged barrier bodies');}finally{view.dispose();}}
});
