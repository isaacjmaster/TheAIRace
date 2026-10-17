import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {registerFoundation} from '../server/foundation-api';
import {initialFoundation,buildRig,buildFabricator,advanceFoundation,trainScrap,moveBuilding,rotateBuilding,buildingLayout,validLayoutPosition,validFoundationPosition,type FoundationState,type RotatableBuilding,type RigPosition,type Orientation} from '../shared/foundation';
const epoch=1700000000000;
function ready(){const s=initialFoundation();s.compute=500;buildRig(s,[6,0],epoch);buildFabricator(s,[16,-6],epoch+15000);advanceFoundation(s,epoch+30000);trainScrap(s,3,epoch+30000);return s;}
test('all five HQ structures move and rotate without charging, rebuilding, losing stored Compute or altering queued bots',()=>{
 const s=ready(),before=structuredClone(s);
 const moves:[RotatableBuilding,RigPosition,Orientation][]=[['hq',[-10,-11],1],['station',[-5,-1],1],['rig',[6,15],2],['fabricator',[12,15],3],['hangar',[18,15],1]];
 for(const [kind,position,orientation] of moves){moveBuilding(s,kind,position,orientation,epoch+30000);assert.deepEqual(buildingLayout(s,kind),{position,orientation});}
 assert.equal(s.compute,before.compute);assert.deepEqual(s.training,before.training);assert.equal(s.bots,before.bots);assert.equal(s.builders,before.builders);assert.equal(s.buildersBusy,0);
 for(const key of ['startedAt','completesAt','lastProducedAt','stored'] as const)assert.equal(s.rig![key],before.rig![key]);assert.equal(s.fabricator!.completesAt,before.fabricator!.completesAt);
 const restored=JSON.parse(JSON.stringify(s));for(const [kind,position,orientation] of moves)assert.deepEqual(buildingLayout(restored,kind),{position,orientation});
});
test('moving landmarks frees their old lots and protects the new footprint on future purchases',()=>{
 const s=initialFoundation();assert.ok(validFoundationPosition(s,[-5,-1],'rig'));moveBuilding(s,'hq',[-10,-11],0,epoch);assert.equal(validFoundationPosition(s,[-5,-1],'rig'),null);assert.ok(validFoundationPosition(s,[-10,-11],'rig'));
 moveBuilding(s,'station',[-5,-1],0,epoch);assert.equal(validFoundationPosition(s,[-1,5],'rig'),null);assert.ok(validFoundationPosition(s,[-5,-1],'rig'));
});
test('layout validation rejects building overlaps, roads, trees, bounds and missing/unfinished structures',()=>{
 const s=ready();for(const position of [[16,-6],[0,9],[24,14],[40,0]] as RigPosition[]){assert.ok(validLayoutPosition(s,position,'rig',1));assert.throws(()=>moveBuilding(s,'rig',position,1,epoch+30000));assert.deepEqual(s.rig!.position,[6,0]);}
 assert.throws(()=>moveBuilding(initialFoundation(),'hangar',[12,-6],0,epoch),/Build/);
 const under=initialFoundation();buildRig(under,[6,0],epoch);assert.throws(()=>moveBuilding(under,'rig',[12,0],0,epoch+1000),/construction/);moveBuilding(under,'station',[-12,4],2,epoch+1000);assert.equal(under.buildersBusy,1);assert.equal(under.rig!.completesAt,epoch+15000);
});
test('unchanged saves keep original landmarks; station rotation accepts the legacy fractional anchor',()=>{
 const s=initialFoundation();assert.deepEqual(buildingLayout(s,'hq'),{position:[-5,-1],orientation:0});assert.deepEqual(buildingLayout(s,'station'),{position:[-1,4.8],orientation:0});assert.equal(s.hqLayout,undefined);assert.equal(s.stationLayout,undefined);
 rotateBuilding(s,'station',2,epoch);assert.deepEqual(s.stationLayout,{position:[-1,4.8],orientation:2});assert.equal(s.compute,100);assert.equal(s.builders,1);
});
test('SQLite restart retains moved landmarks and retries never move twice or reset training',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'airace-layout-')),path=join(dir,'game.sqlite');let db=new DatabaseSync(path),server:ReturnType<express.Express['listen']>;
 async function boot(){const app=express();app.use(express.json());registerFoundation(app,db);server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));return `http://127.0.0.1:${(server.address() as {port:number}).port}`;}
 const stop=()=>new Promise<void>(r=>server.close(()=>{db.close();r();}));let url=await boot();
 try{const first=await fetch(url+'/api/foundation'),cookie=first.headers.get('set-cookie')!.split(';')[0];const post=(body:unknown)=>fetch(url+'/api/foundation/bots',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(body)});
 const input={requestId:randomUUID(),generation:0,command:{action:'move',building:'hq',position:[-10,-11],orientation:1}};
 assert.equal((await post(input)).status,200);assert.equal((await post(input)).status,200);assert.equal((await post({...input,command:{...input.command,position:[-12,-12]}})).status,400);
 const station={requestId:randomUUID(),generation:0,command:{action:'move',building:'station',position:[-5,-1],orientation:2}};assert.equal((await post(station)).status,200);
 assert.equal((await post({...station,requestId:randomUUID(),command:{...station.command,position:[0,9]}})).status,400);
 await stop();db=new DatabaseSync(path);url=await boot();const restored=(await(await fetch(url+'/api/foundation',{headers:{cookie}})).json()).state as FoundationState;
 assert.deepEqual(restored.hqLayout,{position:[-10,-11],orientation:1});assert.deepEqual(restored.stationLayout,{position:[-5,-1],orientation:2});assert.equal(restored.compute,100);assert.equal(restored.builders,1);
 }finally{await stop();rmSync(dir,{recursive:true,force:true});}
});

