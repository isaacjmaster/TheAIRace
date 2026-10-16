import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { createInitialState } from '../src/game';
import { ensureCampus } from '../shared/progression';
import { DEFAULT_POSITIONS, OBSTACLES } from '../shared/campus-layout';
import type { RaidRun, Transcript } from '../shared/raid';
import { registerProgression } from '../server/progression-api';
import { registerRaids } from '../server/raid-api';
import { createRaid, deploy, tick, type Kind } from '../raid/engine';

async function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE sessions(id TEXT PRIMARY KEY,state TEXT NOT NULL)');
 const state=createInitialState();state.credits=10000;state.raidCompute=10000;const c=ensureCampus(state);c.hq=10;c.buildings.training=8;c.buildings.research=5;c.buildings.defense=5;
 db.prepare('INSERT INTO sessions VALUES (?,?)').run('player',JSON.stringify(state));
 const read=()=>JSON.parse(db.prepare('SELECT state FROM sessions WHERE id=?').get('player')!.state as string);
 const save=(s:typeof state)=>db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify(s),'player');
 const app=express();app.use(express.json());const session=()=>({id:'player',state:read()});registerProgression(app,db,session);registerRaids(app,db,session);
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const call=async(path:string,body:unknown)=>{const r=await fetch(url+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 return {db,read,save,call,close:async()=>{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));db.close();}};
}
function battle(run:RaidRun):Transcript{
 const s=createRaid(run.layout,run.squad,run.power,run.healthPower,run.version),log:Transcript={deployments:[],steps:0,retreat:false};
 for(const kind of ['tank','breaker','scout','striker','medic','disruptor'] as Kind[])for(let i=0;i<(run.squad[kind]||0);i++){const point={x:23,y:7+i};assert.ok(deploy(s,kind,point));log.deployments.push({step:0,kind,point});}
 while(!s.ended&&log.steps<1801){tick(s);log.steps++;}assert.equal(s.reason,'Network cleared');return log;
}
test('persisted pre-0.9 unversioned active raid retains original replay and banks once',async()=>{
 const f=await fixture();try{
  const run:RaidRun={id:randomUUID(),layout:5,squad:{scout:4,tank:4,breaker:4,striker:4,medic:4,disruptor:4},power:2.4,healthPower:2.55,rewardMultiplier:.6};
  f.db.prepare('INSERT INTO raids(id,session,run) VALUES (?,?,?)').run(run.id,'player',JSON.stringify(run));
  const resumed=await f.call('/api/raid/start',{layout:7});assert.deepEqual(resumed.data.run,run);assert.equal(resumed.data.run.version,undefined);
  const log=battle(run),before=f.read(),claim=await f.call('/api/raid/claim',{id:run.id,log});assert.equal(claim.status,200);assert.equal(claim.data.outcome.victory,true);assert.equal(claim.data.outcome.rewards.credits,1200);assert.equal(claim.data.outcome.rewards.compute,480);assert.equal(claim.data.state.credits,before.credits+1200);
  const retry=await f.call('/api/raid/claim',{id:run.id,log});assert.deepEqual(retry.data,claim.data);assert.deepEqual(f.read(),claim.data.state);
 }finally{await f.close();}
});
test('new version2 Nexus raid uses chosen map and real transcript rewards exactly once',async()=>{
 const f=await fixture();try{
  const response=await f.call('/api/raid/start',{layout:7});assert.equal(response.status,200);const run=response.data.run as RaidRun;assert.equal(run.version,2);assert.equal(run.layout,7);
  const v2=createRaid(run.layout,run.squad,run.power,run.healthPower,run.version),old=createRaid(run.layout,run.squad,run.power,run.healthPower);assert.notDeepEqual(v2.buildings,old.buildings);
  const before=f.read(),log=battle(run),claim=await f.call('/api/raid/claim',{id:run.id,log});assert.equal(claim.status,200);assert.equal(claim.data.outcome.victory,true);assert.deepEqual(claim.data.outcome.rewards,{credits:3750,compute:1500});assert.equal(claim.data.state.credits,before.credits+3750);assert.equal(claim.data.state.raidCompute,before.raidCompute+1500);assert.equal(claim.data.state.campus.raidWins['7'],1);
  const retry=await f.call('/api/raid/claim',{id:run.id,log});assert.deepEqual(retry.data,claim.data);assert.equal(f.read().campus.raidClaims['7'],1);
 }finally{await f.close();}
});
test('campus APIs reject unknown ids, overlap and unaffordable clearing without state mutation',async()=>{
 const f=await fixture();try{
  const invalid=[['move',{building:'unknown',position:[0,0]}],['move',{building:'compute',position:DEFAULT_POSITIONS.research}],['move',{building:'compute',position:[999,999]}],['clear',{obstacleId:'unknown'}]] as const;
  for(const [action,payload] of invalid){const before=f.read();const r=await f.call('/api/campus/'+action,{...payload,requestId:randomUUID()});assert.equal(r.status,400);assert.deepEqual(f.read(),before);}
  const poor=f.read();poor.credits=0;poor.raidCompute=0;f.save(poor);const r=await f.call('/api/campus/clear',{obstacleId:OBSTACLES[0].id,requestId:randomUUID()});assert.equal(r.status,400);assert.match(r.data.error,/resources/);assert.deepEqual(f.read(),poor);
 }finally{await f.close();}
});

