import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import express from 'express';import {randomUUID} from 'node:crypto';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {initialFoundation,advanceFoundation,trainScrap,collectRig,GPU_RIG,type FoundationState} from '../shared/foundation';
import {TECHNOLOGY_IDS,purchaseTechnology,technologyLevel,productionPerMinute,trainingMilliseconds} from '../shared/technology';
import {registerFoundation} from '../server/foundation-api';import {identityHeaders,saveIdForCookie} from './helpers/identity';
import {startOwnedOperation,commandOwnedOperation} from '../shared/infiltration-army';import {newSquadOperation,advanceSquad} from '../shared/squad-infiltration';
import {loadingProgress,CAMPUS_LOADING_MS,CAMPUS_FADE_MS} from '../src/ui/loadingTiming';
const ready=(now=100000):FoundationState=>({...initialFoundation(),research:500,lab:{position:[12,-6],orientation:0,startedAt:0,completesAt:0,lastProducedAt:now,stored:0}});

test('three technologies each cost 50/125/250, cap at three, and preserve legacy data',()=>{
 for(const id of TECHNOLOGY_IDS){const s=ready();const old=JSON.stringify(s);assert.equal(technologyLevel(s,id),0);assert.equal(JSON.stringify(s),old);
 for(let level=0;level<3;level++){purchaseTechnology(s,id,level,100000);assert.equal(technologyLevel(s,id),level+1);assert.equal(s.research,[450,325,75][level]);}
 assert.throws(()=>purchaseTechnology(s,id,2,100000),/MAX LEVEL/);assert.equal(s.research,75);for(const other of TECHNOLOGY_IDS.filter(t=>t!==id))assert.equal(technologyLevel(s,other),0);
 }
 const s=ready();delete s.lab;assert.throws(()=>purchaseTechnology(s,'gpuOptimization',0,100000),/Finish/);s.lab=ready().lab;s.lab!.completesAt=100001;assert.throws(()=>purchaseTechnology(s,'gpuOptimization',0,100000),/Finish/);s.lab!.completesAt=0;s.research=49;assert.throws(()=>purchaseTechnology(s,'gpuOptimization',0,100000),/50 Research/);assert.equal(s.research,49);
});
test('GPU bonus uses baseline rates and accrues pre-upgrade time at its original rate; each rig holds 250',()=>{
 for(let level=0;level<=3;level++){const s=ready(0);s.technologies={gpuOptimization:level};s.rig={position:[6,0],startedAt:0,completesAt:0,lastProducedAt:0,stored:0};s.rig2={...s.rig,position:[12,0]};advanceFoundation(s,60000);assert.equal(s.rig.stored,10+level);assert.equal(s.rig2.stored,10+level);assert.equal(productionPerMinute(s),10+level);advanceFoundation(s,1e8);assert.equal(s.rig.stored,250);assert.equal(s.rig2.stored,250);assert.equal(GPU_RIG.storage,250);assert.equal(collectRig(s,1e8),250);assert.equal(s.rig.stored,0);assert.equal(s.rig2.stored,250);assert.equal(s.capacity,1000);}
 const s=ready(0);s.rig={position:[6,0],startedAt:0,completesAt:0,lastProducedAt:0,stored:0};advanceFoundation(s,60000);purchaseTechnology(s,'gpuOptimization',0,60000);advanceFoundation(s,120000);assert.equal(s.rig.stored,21);
});
test('training improvements only affect new sequential orders, retaining active deadlines and exact unit counts',()=>{
 const s=ready();s.fabricator={position:[6,0],startedAt:0,completesAt:0,hangarPosition:[12,0],separateHangar:true};s.hangar={position:[12,0],startedAt:0,completesAt:0};s.training=[105000,110000];s.bots=0;
 purchaseTechnology(s,'trainingEfficiency',0,102000);assert.deepEqual(s.training,[105000,110000]);trainScrap(s,2,102000);assert.deepEqual(s.training,[105000,110000,114500,119000]);assert.deepEqual(s.trainingDurations,[5000,5000,4500,4500]);advanceFoundation(s,105000);assert.equal(s.bots,1);assert.equal(s.trainingDurations![0],5000);advanceFoundation(s,119000);advanceFoundation(s,119000);assert.equal(s.bots,4);assert.deepEqual(s.training,[]);
 for(let level=0;level<=3;level++){s.technologies={trainingEfficiency:level};assert.equal(trainingMilliseconds(s),5000-level*500);}
});
test('Cipher Engineering increases actual drone damage and snapshots it per mission',()=>{
 for(let level=0;level<=3;level++){const s=ready();s.bots=1;s.technologies={cipherEngineering:level};startOwnedOperation(s,'damage-'+level,'lumen-labs',100000,newSquadOperation);const o=s.infiltration!;assert.equal(o.cipherDamageMultiplier,1+level/10);s.technologies.cipherEngineering=3;assert.equal(o.cipherDamageMultiplier,1+level/10);
 o.target.walls=[];o.target.assets=[{id:'far',kind:'gpu',name:'GPU',position:[10,-7],size:[2,2],access:[10,-5],hackSeconds:100,compute:1,research:0}];o.target.defenses=o.target.defenses.slice(0,1);o.target.defenses[0].route=[[0,0],[.1,0]];o.drones=o.drones.slice(0,1);o.drones[0].position=[0,0];commandOwnedOperation(s,{action:'deploy',position:o.target.entry},100000);const a=o.squad!.agents[0];a.position=[0,3];a.path=[];a.droneTarget=o.drones[0].id;a.nextPlanAt=1e9;const before=o.drones[0].health!;advanceSquad(o,100100);assert.ok(Math.abs((before-o.drones[0].health!)-9*(1+level/10))<1e-8);
 }
});
test('API validates eligibility/identity and serializes duplicate and concurrent upgrades across persistent reloads',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'airace-technology-')),path=join(folder,'test.sqlite');let db=new DatabaseSync(path);let app=express();app.use(express.json());registerFoundation(app,db,{clock:()=>100000});let server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));let url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try{const fresh=await fetch(url+'/api/foundation'),cookie=fresh.headers.get('set-cookie')!.split(';')[0];const save=saveIdForCookie(db,cookie),headers=identityHeaders(db,cookie);const post=(body:unknown,h:Record<string,string>=headers)=>fetch(url+'/api/foundation/bots',{method:'POST',headers:h,body:JSON.stringify(body)});const command=(expectedLevel:number,requestId=randomUUID())=>({generation:0,requestId,command:{action:'upgrade-technology',technology:'gpuOptimization',expectedLevel}});
 assert.equal((await post(command(0),{'content-type':'application/json'})).status,401);assert.equal((await post(command(0))).status,400);
 db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(ready()),save);
 const requestId=randomUUID(),same=await Promise.all([post(command(0,requestId)),post(command(0,requestId))]);assert.ok(same.every(r=>r.status===200));let s=(await(await fetch(url+'/api/foundation',{headers})).json()).state;assert.equal(s.research,450);assert.equal(s.technologies.gpuOptimization,1);
 const competing=await Promise.all([post(command(1)),post(command(1))]);assert.deepEqual(competing.map(r=>r.status).sort(),[200,400]);assert.equal((await post(command(2))).status,200);assert.equal((await post(command(2))).status,400);
 await new Promise<void>(r=>server.close(()=>r()));db.close();db=new DatabaseSync(path);app=express();app.use(express.json());registerFoundation(app,db,{clock:()=>100000});server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;s=(await(await fetch(url+'/api/foundation',{headers})).json()).state;assert.equal(s.technologies.gpuOptimization,3);assert.equal(s.research,75);assert.equal(s.compute,100);assert.equal(s.lab.position[0],12);
 }finally{await new Promise<void>(r=>server.close(()=>r()));db.close();rmSync(folder,{recursive:true,force:true});}
});
test('loading timing is linear at 2.65 seconds, caps before readiness and uses Ascent’s 350ms fade',()=>{assert.equal(CAMPUS_LOADING_MS,2650);assert.equal(CAMPUS_FADE_MS,350);assert.equal(loadingProgress(1325,true),.5);assert.equal(loadingProgress(2650,false),.94);assert.equal(loadingProgress(9000,false),.94);assert.equal(loadingProgress(2650,true),1);});
