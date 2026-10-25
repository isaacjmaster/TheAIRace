import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {initialFoundation,placementFootprint,type FoundationState} from '../shared/foundation';
import {snapFootprint,onFootprintGrid,occupiedCells} from '../shared/placement-grid';
import {prepareBuildingUpdate} from '../shared/building-update';
import {migrateBuildingUpdate} from '../server/building-update';
import {backupBeforeBuildingUpdate} from '../server/building-update-backup';
import {layoutInventory,layoutFingerprint,layoutPlacementReason,commitLayout,type LayoutPlacement} from '../shared/layout-draft';
import {buyWall,validWallPosition,moveWallRow,connectedWallRow} from '../shared/cybersecurity';
import {wallFootprint} from '../shared/security-catalog';
test('tile centers, occupied cells and every rotated building footprint share integer edges',()=>{
 for(const kind of ['hq','rig','station','hangar','fabricator','lab','sentinel','droneStation'] as const)for(const orientation of [0,1,2,3] as const){
 const f=placementFootprint(kind,{position:[0,0],orientation,size:'compound'}),p=snapFootprint([3.37,-7.26],f.w,f.d);
 assert.ok(onFootprintGrid(p,f.w,f.d));assert.equal(new Set(occupiedCells(p,f.w,f.d)).size,f.w*f.d);
 assert.deepEqual(snapFootprint(p,f.w,f.d),p);
 }assert.deepEqual(snapFootprint([3.2,4.1],1,1),[3.5,4.5]);
});
test('tile walls join in rows, reject overlaps, and move atomically at no extra charge',()=>{
 const s=initialFoundation();prepareBuildingUpdate(s);s.compute=1000;s.landscape={items:[],legacyRocksRegistered:true} as any;
 for(let i=0;i<3;i++)buyWall(s,[20.5+i,20.5],0,'wall'+i);
 assert.deepEqual(wallFootprint(s.walls![0]),{x:20.5,z:20.5,w:1,d:1});assert.equal(connectedWallRow(s,'wall1').length,3);
 assert.ok(validWallPosition(s,[20.5,20.5],0));assert.ok(validWallPosition(s,[20,20],0));
 const before=structuredClone(s);assert.throws(()=>moveWallRow(s,'wall1',[200.5,200.5]));assert.deepEqual(s,before);
 moveWallRow(s,'wall1',[21.5,21.5]);assert.equal(s.compute,970);assert.equal(s.walls!.length,3);
});
test('0/50/100/150/200-wall migration is backed up, idempotent and preserves progression; replacement commits are atomic',()=>{
 const folder=mkdtempSync(join(tmpdir(),'grid-migration-')),db=new DatabaseSync(join(folder,'save.sqlite'));
 try{db.exec('CREATE TABLE foundation_saves(id TEXT PRIMARY KEY,state TEXT NOT NULL)');
 const originals=new Map<string,string>();
 for(const count of [0,50,100,150,200]){const s=initialFoundation();s.compute=743;s.research=72;s.bots=6;s.landscape={items:[],legacyRocksRegistered:true} as any;s.walls=Array.from({length:count},(_,i)=>({id:'old'+i,position:[10+(i%20),10+Math.floor(i/20)] as [number,number],orientation:0 as const}));const json=JSON.stringify(s);originals.set(String(count),json);db.prepare('INSERT INTO foundation_saves VALUES(?,?)').run(String(count),json);}
 const backup=backupBeforeBuildingUpdate(db)!;assert.ok(backup);const copy=new DatabaseSync(backup,{readOnly:true});assert.equal(copy.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n,5);copy.close();
 assert.deepEqual(migrateBuildingUpdate(db),{total:5,affected:2});assert.deepEqual(migrateBuildingUpdate(db),{total:0,affected:0});
 for(const count of [0,50,100,150,200]){
 const s=JSON.parse(String(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(String(count))!.state)) as FoundationState;
 assert.equal(s.compute,743);assert.equal(s.research,72);assert.equal(s.bots,6);assert.equal(s.walls!.length,count);assert.equal(db.prepare('SELECT state FROM building_update_snapshots WHERE save_id=?').get(String(count))!.state,originals.get(String(count)));
 if(count<=100){assert.deepEqual(s.walls!.map(w=>w.position),JSON.parse(originals.get(String(count))!).walls.map((w:any)=>w.position));continue;}
 assert.equal(s.buildingUpdate!.pending,true);assert.equal(layoutInventory(s).filter(i=>i.kind==='wall').length,100);
 assert.throws(()=>buyWall(s,[30.5,30.5],0,'extra'),/replacement/);
 const placements:LayoutPlacement[]=[];for(const item of layoutInventory(s)){
 let found=false;for(let x=-32;x<36&&!found;x++)for(let z=-25;z<30&&!found;z++){
 const f=item.kind==='wall'?{w:1,d:1}:placementFootprint(item.kind as any,item.layout),p={id:item.id,position:snapFootprint([x,z],f.w,f.d),orientation:item.layout.orientation};
 if(!layoutPlacementReason(s,placements,p)){placements.push(p);found=true;}
 }assert.ok(found,item.id);}
 const before=structuredClone(s),fingerprint=layoutFingerprint(s);assert.throws(()=>commitLayout(s,fingerprint,placements.slice(1)));assert.deepEqual(s,before);
 commitLayout(s,fingerprint,placements);assert.equal(s.walls!.length,100);assert.equal(s.compute,743);assert.equal(s.buildingUpdate!.pending,false);assert.throws(()=>buyWall(s,[30.5,30.5],0,'extra'),/limit/);assert.throws(()=>commitLayout(s,fingerprint,placements),/changed/);
 }
 }finally{db.close();rmSync(folder,{recursive:true,force:true});}
});

import express from 'express';import {registerFoundation} from '../server/foundation-api';import {identityHeaders,saveIdForCookie} from './helpers/identity';import {randomUUID} from 'node:crypto';
test('live grid API agrees with client validation and persists one-time acknowledgment across reload',async()=>{
 const db=new DatabaseSync(':memory:'),app=express();app.use(express.json());registerFoundation(app,db,{buildingGrid:true});const server=app.listen(0);await new Promise<void>(r=>server.on('listening',r));const base='http://127.0.0.1:'+(server.address() as any).port;
 try{const r=await fetch(base+'/api/foundation'),cookie=r.headers.get('set-cookie')!.split(';')[0],first=await r.json(),id=saveIdForCookie(db,cookie);
 const command=async(command:unknown)=>{const r=await fetch(base+'/api/foundation/bots',{method:'POST',headers:identityHeaders(db,cookie),body:JSON.stringify({command,requestId:randomUUID(),generation:0})});return {status:r.status,body:await r.json()};};
 assert.equal(first.state.buildingUpdate.acknowledged,false);
 assert.equal((await command({action:'acknowledge-building-update'})).status,200);
 const state=JSON.parse(String(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(id)!.state));state.landscape.items=[];state.landscape.legacyRocksRegistered=true;db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(state),id);
 assert.equal((await command({action:'establish-station',position:[3.5,5],orientation:0})).status,200);
 assert.equal((await command({action:'buy-wall',position:[20.5,20.5],orientation:0})).status,200);
 assert.equal((await command({action:'buy-wall',position:[21,20],orientation:0})).status,400);
 const loaded=await(await fetch(base+'/api/foundation',{headers:{cookie}})).json();assert.equal(loaded.state.buildingUpdate.acknowledged,true);assert.equal(loaded.state.walls.length,1);
 }finally{await new Promise<void>(r=>server.close(()=>r()));db.close();}
});
