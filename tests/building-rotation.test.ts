import {establishedFoundation as initialFoundation,placeTestStation} from './helpers/established-foundation';
import {buildLegacyFabricator as buildFabricator} from './helpers/legacy-foundation';
import {identityHeaders,saveIdForCookie} from './helpers/identity';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import * as THREE from 'three';
import {registerFoundation} from '../server/foundation-api';
import {buildRig,advanceFoundation,rotateBuilding,moveRig,trainScrap,buildingFootprint,hangarPlacement,validFoundationPosition,BUILDER_STATION_POSITION,type Orientation,type FoundationState} from '../shared/foundation';
import {builderStationModel} from '../src/art/BotBuildings';
import {founderHQ,pickFoundationBuilding} from '../src/art/FounderHQ';
import {WorldKit} from '../src/art/world';
const epoch=1700000000000;
test('all four placement orientations reserve a correctly rotated Fabricator/Hangar pair',()=>{
 for(const q of [0,1,2,3] as Orientation[]){const s=initialFoundation();buildFabricator(s,[16,-6],epoch,q);assert.equal(s.compute,50);assert.equal(s.buildersBusy,1);assert.equal(s.fabricator!.orientation,q);assert.equal(s.fabricator!.hangarOrientation,q);assert.deepEqual(s.fabricator!.hangarPosition,hangarPlacement([16,-6],q));assert.deepEqual(buildingFootprint(q),q%2?[3,4]:[4,3]);assert.ok(validFoundationPosition(s,s.fabricator!.hangarPosition,'rig',q));}
 const s=initialFoundation();assert.throws(()=>buildFabricator(s,[36,-6],epoch,0),/campus/);assert.equal(s.compute,100);assert.equal(s.fabricator,undefined);
});
test('rotation preserves GPU production and training; legacy orientations default to zero and moving retains orientation',()=>{
 const s=initialFoundation();s.compute=500;buildRig(s,[6,0],epoch);delete s.rig!.orientation;advanceFoundation(s,epoch+75000);buildFabricator(s,[16,-6],epoch+75000);advanceFoundation(s,epoch+90000);trainScrap(s,3,epoch+90000);
 const before=structuredClone(s);for(const q of [1,2,3,0] as Orientation[]){rotateBuilding(s,'rig',q,epoch+90000);rotateBuilding(s,'fabricator',q,epoch+90000);rotateBuilding(s,'hangar',q,epoch+90000);}
 assert.equal(s.compute,before.compute);assert.deepEqual(s.training,before.training);assert.equal(s.bots,before.bots);assert.equal(s.rig!.stored,before.rig!.stored);assert.equal(s.rig!.lastProducedAt,before.rig!.lastProducedAt);assert.equal(s.rig!.completesAt,before.rig!.completesAt);assert.equal(s.fabricator!.completesAt,before.fabricator!.completesAt);
 rotateBuilding(s,'rig',1,epoch+90000);moveRig(s,[6,-6],epoch+90000);assert.equal(s.rig!.orientation,1);
});
test('rotated rectangle collision is enforced and failed rotation changes no orientation or economy',()=>{
 const s=initialFoundation();s.compute=200;buildFabricator(s,[12,-6],epoch,1);buildRig(s,[16,-6],epoch+15000,1);advanceFoundation(s,epoch+30000);
 assert.equal(validFoundationPosition(s,[16,-6],'rig',1),null);assert.match(validFoundationPosition(s,[16,-6],'rig',0)!,/space/);
 const before=structuredClone(s);assert.throws(()=>rotateBuilding(s,'rig',0,epoch+30000),/space/);assert.deepEqual(s,before);
 assert.throws(()=>rotateBuilding(s,'fabricator',0,epoch+30000),/space/);assert.equal(s.fabricator!.orientation,1);
 const under=initialFoundation();buildRig(under,[6,0],epoch,2);assert.throws(()=>rotateBuilding(under,'rig',3,epoch+1000),/construction/);assert.equal(under.rig!.orientation,2);
});
test('free station fits the legacy reserved work area, clears Founder HQ and is selectable',()=>{
 const kit=new WorldKit(),hq=new THREE.Group();founderHQ(kit,hq);const station=builderStationModel(kit);station.position.set(BUILDER_STATION_POSITION[0],0,BUILDER_STATION_POSITION[1]);hq.updateMatrixWorld(true);station.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(station),house=new THREE.Box3().setFromObject(hq);assert.ok(bounds.min.x>=-3&&bounds.max.x<=1&&bounds.min.z>=3&&bounds.max.z<=6);assert.ok(bounds.min.z>house.max.z);
 const ray=new THREE.Raycaster(new THREE.Vector3(-1,10,4.8),new THREE.Vector3(0,-1,0));assert.equal(pickFoundationBuilding(ray,hq,undefined,undefined,undefined,station),'station');
 assert.match(validFoundationPosition(initialFoundation(),[-1,5],'rig')!,/Founder HQ|Builder/);assert.deepEqual(initialFoundation().builders,1);kit.dispose();
});
test('SQLite restart persists orientation and retry is absolute/idempotent; invalid API rotation rolls back',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'airace-rotation-')),path=join(dir,'test.sqlite');let db=new DatabaseSync(path),server:ReturnType<express.Express['listen']>;
 async function boot(){const app=express();app.use(express.json());registerFoundation(app,db);server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));return `http://127.0.0.1:${(server.address() as {port:number}).port}`;}
 const stop=()=>new Promise<void>(r=>server.close(()=>{db.close();r();}));let url=await boot();
 try{const first=await fetch(url+'/api/foundation'),cookie=first.headers.get('set-cookie')!.split(';')[0],id=saveIdForCookie(db,cookie);
 const s=initialFoundation();s.compute=400;buildRig(s,[6,0],epoch,3);buildFabricator(s,[16,-6],epoch+15000,2);advanceFoundation(s,epoch+30000);db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s),id);
 const body={requestId:randomUUID(),generation:0,command:{action:'rotate',building:'rig',orientation:1}};
 const post=(value:unknown)=>fetch(url+'/api/foundation/bots',{method:'POST',headers:identityHeaders(db,cookie),body:JSON.stringify(value)});
 const responses=await Promise.all([post(body),post(body)]);assert.ok(responses.every(r=>r.status===200));assert.equal((await responses[1].json()).state.rig.orientation,1);
 assert.equal((await post({...body,command:{...body.command,orientation:2}})).status,400);assert.equal((await post({...body,requestId:randomUUID(),command:{...body.command,orientation:4}})).status,400);
 await stop();db=new DatabaseSync(path);url=await boot();const loaded=await(await fetch(url+'/api/foundation',{headers:{cookie}})).json();assert.equal(loaded.state.rig.orientation,1);assert.equal(loaded.state.fabricator.orientation,2);assert.equal(loaded.state.fabricator.hangarOrientation,2);assert.equal(loaded.state.compute,300);assert.equal(loaded.state.builders,1);
 }finally{await stop();rmSync(dir,{recursive:true,force:true});}
});
