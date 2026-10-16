import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { createInitialState } from '../src/game';
import type { GameState } from '../shared/contracts';
import type { RaidRun, Transcript } from '../shared/raid';
import { ensureCampus, campusEffects } from '../shared/progression';
import { registerProgression } from '../server/progression-api';
import { registerRaids } from '../server/raid-api';
import { createRaid, deploy, tick, rewards, type Kind } from '../raid/engine';

async function fixture(hq=7) {
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE sessions(id TEXT PRIMARY KEY,state TEXT NOT NULL)');
 const state=createInitialState();state.credits=10000;state.raidCompute=10000;ensureCampus(state);state.campus!.hq=hq;state.campus!.buildings.training=Math.min(hq,5);state.campus!.buildings.research=hq>=7?3:0;state.campus!.buildings.defense=hq>=5?2:0;
 db.prepare('INSERT INTO sessions VALUES (?,?)').run('player',JSON.stringify(state));
 const read=():GameState=>JSON.parse(db.prepare('SELECT state FROM sessions WHERE id=?').get('player')!.state as string);
 const save=(s:GameState)=>db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify(s),'player');
 const app=express();app.use(express.json());const session=()=>({id:'player',state:read()});registerProgression(app,db,session);registerRaids(app,db,session);
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const port=(server.address() as {port:number}).port;
 const call=async(path:string,body?:unknown)=>{const response=await fetch(`http://127.0.0.1:${port}${path}`,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
 return {db,read,save,call,close:async()=>{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));db.close();}};
}
function battle(run:RaidRun,partial=false):Transcript {
 const s=createRaid(run.layout,run.squad,run.power,run.healthPower);const log:Transcript={deployments:[],steps:0,retreat:false};
 for(const kind of ['tank','breaker','scout','striker','medic','disruptor'] as Kind[])for(let i=0;i<(run.squad[kind]||0);i++){const point={x:23,y:7+i};assert.equal(deploy(s,kind,point),true);log.deployments.push({step:0,kind,point});}
 for(let i=0;i<1801&&!s.ended;i++){tick(s);log.steps++;if(partial&&!s.ended&&(rewards(s).credits>0||rewards(s).compute>0)){log.retreat=true;return log;}}
 assert.equal(s.reason,'Network cleared');return log;
}

test('expansion APIs reject locked bases and snapshot six agents with independent damage and armor',async()=>{const f=await fixture();try {
 assert.equal((await f.call('/api/raid/start',{layout:7})).status,400);
 const r=await f.call('/api/raid/start',{layout:0});assert.equal(r.status,200);const run=r.data.run as RaidRun;assert.deepEqual(Object.keys(run.squad).sort(),['breaker','disruptor','medic','scout','striker','tank']);assert.equal(Object.values(run.squad).reduce((a,b)=>a+b,0),24);
 const e=campusEffects(f.read());assert.equal(run.power,e.damageMultiplier);assert.equal(run.healthPower,e.healthMultiplier);assert.notEqual(run.power,run.healthPower);
 const altered=f.read();altered.campus!.buildings.training=7;f.save(altered);assert.deepEqual((await f.call('/api/raid/start',{layout:1})).data.run,run);
}finally{await f.close();}});

test('real victorious transcripts bank once, persist wins and diminish repeat rewards',async()=>{const f=await fixture();try {
 const run=(await f.call('/api/raid/start',{layout:0})).data.run as RaidRun;const before=f.read();const log=battle(run);const a=await f.call('/api/raid/claim',{id:run.id,log});assert.equal(a.status,200);assert.equal(a.data.outcome.victory,true);assert.equal(a.data.state.credits,before.credits+a.data.outcome.rewards.credits);assert.equal(a.data.state.campus.raidWins['0'],1);
 const b=await f.call('/api/raid/claim',{id:run.id,log});assert.deepEqual(b.data,a.data);assert.deepEqual(f.read(),a.data.state);
 const next=(await f.call('/api/raid/start',{layout:0})).data.run as RaidRun;assert.ok(next.rewardMultiplier!<run.rewardMultiplier!);const c=await f.call('/api/raid/claim',{id:next.id,log:battle(next)});assert.equal(c.status,200);assert.ok(c.data.outcome.rewards.credits<a.data.outcome.rewards.credits);assert.equal(c.data.state.campus.raidWins['0'],2);
}finally{await f.close();}});

test('partial retreat cannot repeatedly farm a network at full reward multiplier',async()=>{const f=await fixture();try {
 const run=(await f.call('/api/raid/start',{layout:0})).data.run as RaidRun;const log=battle(run,true);assert.equal(log.retreat,true);const a=await f.call('/api/raid/claim',{id:run.id,log});assert.equal(a.status,200);assert.equal(a.data.outcome.victory,false);assert.ok(a.data.outcome.rewards.credits+a.data.outcome.rewards.compute>0);assert.equal(a.data.state.campus.raidWins['0']||0,0);
 const next=(await f.call('/api/raid/start',{layout:0})).data.run as RaidRun;assert.ok(next.rewardMultiplier!<run.rewardMultiplier!,'any positive payout must diminish subsequent farming');
 const empty=await f.call('/api/raid/claim',{id:next.id,log:{steps:0,deployments:[],retreat:true}});assert.equal(empty.status,200);const third=(await f.call('/api/raid/start',{layout:0})).data.run as RaidRun;assert.equal(third.rewardMultiplier,next.rewardMultiplier,'empty retreats must not consume payout tier');
}finally{await f.close();}});

test('timed upgrades persist, stale purchase is rejected, and production snapshots advance revisions',async()=>{const f=await fixture(2);try {
 const id=randomUUID();const a=await f.call('/api/campus/upgrade',{building:'revenue',requestId:id,expectedLevel:0});assert.equal(a.status,200);assert.equal(a.data.state.campus.buildings.revenue,0);
 const retry=await f.call('/api/campus/upgrade',{building:'revenue',requestId:id,expectedLevel:0});assert.equal(retry.data.state.credits,a.data.state.credits);
 const pending=f.read();pending.campus!.construction!.startedAt=Date.now()-61000;pending.campus!.construction!.completesAt=Date.now()-60000;pending.campus!.constructions=[pending.campus!.construction!];pending.campus!.lastAccruedAt=Date.now()-62000;pending.credits=100;f.save(pending);
 const completed=await f.call('/api/campus');assert.equal(completed.data.state.campus.buildings.revenue,1);assert.equal(completed.data.state.campus.construction,null);assert.ok(completed.data.state.credits>=112);assert.ok(completed.data.state.revision>pending.revision);
 assert.equal((await f.call('/api/campus/upgrade',{building:'revenue',requestId:randomUUID(),expectedLevel:0})).status,400);
 const earlier=f.read();earlier.campus!.lastAccruedAt=Date.now()-60000;f.save(earlier);const networks=await f.call('/api/raid/networks');assert.ok(networks.data.state.credits>earlier.credits);assert.ok(networks.data.state.revision>earlier.revision,'network production must version persisted change');assert.deepEqual(f.read(),networks.data.state);
}finally{await f.close();}});
