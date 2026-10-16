import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { createInitialState } from '../src/game';
import { ensureCampus, advanceCampus, constructionJobs, builderCount, startUpgrade, moveBuilding, clearObstacle, type BuildingId } from '../shared/progression';
import { DEFAULT_POSITIONS, OBSTACLES, validatePlacement } from '../shared/campus-layout';
import { registerProgression } from '../server/progression-api';
const epoch=1_700_000_000_000;
function company(hq=4){const s=createInitialState();s.credits=1000;s.raidCompute=1000;ensureCampus(s,epoch).hq=hq;return s;}
test('0.8 construction and default lots migrate without losing progress or balances',()=>{
 const s=company();delete s.campus!.constructions;delete s.campus!.positions;delete s.campus!.clearedObstacles;
 s.campus!.construction={id:'old',building:'compute',level:1,startedAt:epoch,completesAt:epoch+15000};
 const c=ensureCampus(s,epoch);assert.equal(constructionJobs(c).length,1);assert.equal(c.construction!.id,'old');assert.deepEqual(c.positions,DEFAULT_POSITIONS);
 for(const id of Object.keys(DEFAULT_POSITIONS) as BuildingId[])assert.equal(validatePlacement(c,id,DEFAULT_POSITIONS[id]),null,id);
 advanceCampus(s,epoch+75000);assert.equal(c.buildings.compute,1);assert.equal(s.raidCompute,1008);assert.equal(s.credits,1000);assert.equal(c.construction,null);
});
test('builder unlocks permit distinct parallel jobs and reject same-building overlap',()=>{
 const s=company();assert.equal(builderCount(s.campus!),2);startUpgrade(s,'compute',epoch,'compute');startUpgrade(s,'revenue',epoch,'revenue');
 assert.throws(()=>startUpgrade(s,'training',epoch),/Builder Bots/);assert.throws(()=>startUpgrade(s,'compute',epoch),/already under construction/);
 s.campus!.hq=7;assert.equal(builderCount(s.campus!),3);startUpgrade(s,'training',epoch,'training');assert.equal(constructionJobs(s.campus!).length,3);
 const money=s.credits;advanceCampus(s,epoch+75000);assert.equal(constructionJobs(s.campus!).length,0);assert.equal(s.campus!.buildings.training,1);assert.equal(s.credits,money+12);
 const once=JSON.stringify(s);advanceCampus(s,epoch+75000);assert.equal(JSON.stringify(s),once);
});
test('offline income splits at each builder completion and survives serialization',()=>{
 const s=company();startUpgrade(s,'revenue',epoch,'revenue');startUpgrade(s,'gpu',epoch+10000,'gpu');
 const balance=s.credits;const restored=JSON.parse(JSON.stringify(s));advanceCampus(restored,epoch+85000);
 // revenue at 15s: 10s at 12/min, then 60s at 14/min after GPU at25s.
 assert.equal(restored.credits,balance+16);assert.equal(restored.campus.buildings.gpu,1);assert.equal(restored.campus.construction,null);
});
test('grid placement rejects bounds, overlap, reserved future lots, obstacles and active construction',()=>{
 const s=company();const c=s.campus!;
 assert.match(validatePlacement(c,'compute',[99,0])!,/inside/);assert.match(validatePlacement(c,'compute',[8.1,-5])!,/grid/);
 assert.match(validatePlacement(c,'compute',DEFAULT_POSITIONS.research)!,/reserved/);assert.match(validatePlacement(c,'compute',[-18,-9])!,/Clear/);
 moveBuilding(s,'compute',[8,-6],epoch);assert.deepEqual(c.positions!.compute,[8,-6]);assert.deepEqual(JSON.parse(JSON.stringify(s)).campus.positions.compute,[8,-6]);
 startUpgrade(s,'compute',epoch);assert.throws(()=>moveBuilding(s,'compute',[8,-5],epoch),/finish construction/);
 const locked=company(1);assert.throws(()=>moveBuilding(locked,'research',[17,4],epoch),/Unlock/);
});
test('clearing opens buildable space once and charges exact resource costs',()=>{
 const s=company();const o=OBSTACLES[0];clearObstacle(s,o.id,epoch);assert.equal(s.credits,1000-o.cost.credits+o.reward.credits);assert.equal(s.raidCompute,1000-o.cost.compute+o.reward.compute);
 moveBuilding(s,'compute',o.position,epoch);assert.deepEqual(s.campus!.positions!.compute,o.position);assert.throws(()=>clearObstacle(s,o.id,epoch),/already/);
 s.credits=0;assert.throws(()=>clearObstacle(s,OBSTACLES[1].id,epoch),/resources/);assert.ok(!s.campus!.clearedObstacles!.includes(OBSTACLES[1].id));
});
test('placement and clearing API persist idempotency and reject changed payload across restart',async()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE sessions(id TEXT PRIMARY KEY,state TEXT NOT NULL); CREATE TABLE campus_commands(session TEXT,id TEXT,building TEXT,PRIMARY KEY(session,id))');
 const state=company();db.prepare('INSERT INTO sessions VALUES (?,?)').run('p',JSON.stringify(state));
 const read=()=>JSON.parse(db.prepare('SELECT state FROM sessions').get()!.state as string);
 const serve=async()=>{const app=express();app.use(express.json());registerProgression(app,db,()=>({id:'p',state:read()}));const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));return server;};
 let server=await serve();let url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const post=async(action:string,body:unknown)=>{const r=await fetch(url+'/api/campus/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const close=()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
 try{
  const requestId=randomUUID(),body={obstacleId:OBSTACLES[0].id,requestId};const first=await post('clear',body);assert.equal(first.status,200);const cash=first.data.state.credits;
  await close();server=await serve();url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  assert.equal((await post('clear',body)).data.state.credits,cash);assert.equal((await post('clear',{...body,obstacleId:OBSTACLES[1].id})).status,400);
  assert.equal((await post('move',{building:'compute',position:[8,-6],requestId})).status,400);
  const moveId=randomUUID(),move={building:'compute',position:OBSTACLES[0].position,requestId:moveId};assert.equal((await post('move',move)).status,200);assert.equal((await post('move',move)).status,200);
  assert.equal((await post('move',{...move,position:[8,-6]})).status,400);assert.equal((await post('move',{...move,requestId:randomUUID(),position:[8.5,-6]})).status,400);
  assert.deepEqual(read().campus.positions.compute,OBSTACLES[0].position);assert.equal(read().credits,cash);
  const upgradeId=randomUUID();assert.equal((await post('upgrade',{building:'revenue',expectedLevel:0,requestId:upgradeId})).status,200);assert.equal((await post('upgrade',{building:'revenue',expectedLevel:1,requestId:upgradeId})).status,400);
 }finally{await close();db.close();}
});
