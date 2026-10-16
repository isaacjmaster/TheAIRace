import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRaid, deploy, tick, type Kind } from '../raid/engine';
import { summarizeRaid } from '../raid/outcome';
import { replayRaid } from './raid-replay';
import type { RaidRun, Transcript } from '../shared/raid';
import { applyCommand, createInitialState } from '../src/game';
function assault(run:RaidRun){
 const s=createRaid(run.layout,run.squad,run.power),log:Transcript={steps:0,deployments:[],retreat:false};
 const orders:[number,Kind,number][]=[[0,'tank',11],[10,'tank',10],[60,'breaker',11],[70,'breaker',10],[80,'scout',6],[90,'scout',7]];
 for(let i=0;i<1801&&!s.ended;i++){
  for(const [step,kind,y] of orders)if(i===step){const x=kind==='tank'?21:23;const point={x:run.layout===0?x:26-x,y};assert.ok(deploy(s,kind,point));log.deployments.push({step,kind,point});}
  tick(s);log.steps++;
 }
 assert.deepEqual(replayRaid(run,log),summarizeRaid(s));return log;
}
test('replay rejects unfinished raids, excess troops, unordered logs and post-combat steps',()=>{
 const run:RaidRun={id:randomUUID(),layout:0,squad:{scout:2,tank:2,breaker:2},power:1};
 assert.throws(()=>replayRaid(run,{steps:1,deployments:[],retreat:false}));
 assert.throws(()=>replayRaid(run,{steps:2,retreat:true,deployments:[{step:1,kind:'tank',point:{x:21,y:11}},{step:0,kind:'tank',point:{x:21,y:11}}]}));
 assert.throws(()=>replayRaid(run,{steps:0,retreat:true,deployments:Array.from({length:3},()=>({step:0,kind:'tank' as const,point:{x:21,y:11}}))}));
 const log=assault(run);assert.throws(()=>replayRaid(run,{...log,steps:log.steps+1}));
});
test('agent training requires compute and changes deployed health and damage',()=>{
 assert.throws(()=>applyCommand(createInitialState(),{type:'agent-upgrade'}));
 let state={...createInitialState(),raidCompute:360};
 state=applyCommand(state,{type:'agent-upgrade'}) as typeof state;assert.equal(state.raidCompute,300);
 const plain=createRaid(),trained=createRaid(0,undefined,1.15);
 deploy(plain,'breaker',{x:21,y:11});deploy(trained,'breaker',{x:21,y:11});assert.ok(trained.units[0].hp>plain.units[0].hp);
 plain.units[0].x=trained.units[0].x=17; plain.units[0].y=trained.units[0].y=12; tick(plain);tick(trained);assert.ok(trained.damage.breaker>plain.damage.breaker);
});
test('Garage → Raid → persisted rewards → hardware/agent upgrades → Raid; duplicate and cross-session claims',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'airace-integrated-'));process.env.GAME_DB_PATH=join(folder,'game.sqlite');
 const {app,closeDatabase}=await import('./index');const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const addr=server.address();assert.ok(addr&&typeof addr!=='string');const base=`http://127.0.0.1:${addr.port}`;let cookie='';
 async function call(path:string,body?:unknown,ownCookie=cookie){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{cookie:ownCookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie')!.split(';')[0];return {status:r.status,data:await r.json() as any};}
 try{
  let state=(await call('/api/game')).data.state;const owner=cookie;assert.ok(cookie.startsWith('airace_integrated_session='));
  const run=(await call('/api/raid/start',{layout:0})).data.run as RaidRun;
  assert.deepEqual((await call('/api/raid/start',{layout:1})).data.run,run);
  assert.equal((await call('/api/raid/claim',{id:run.id,log:{steps:0,deployments:[],retreat:false}})).status,400);
  const log=assault(run);const expected=replayRaid(run,log);assert.equal(expected.victory,true);
  const claim={id:run.id,log};const result=await call('/api/raid/claim',claim);assert.equal(result.status,200);state=result.data.state;
  assert.equal(state.credits,520);assert.equal(state.raidCompute,200);
  const duplicates=await Promise.all([call('/api/raid/claim',claim),call('/api/raid/claim',claim)]);for(const r of duplicates)assert.deepEqual(r.data.state,state);
  const stranger=await call('/api/raid/claim',claim,'');assert.equal(stranger.status,400);cookie=owner;
  for(const type of ['upgrade','agent-upgrade']){const r=await call('/api/command',{revision:state.revision,requestId:randomUUID(),command:{type}});assert.equal(r.status,200);state=r.data.state;}
  assert.equal(state.credits,430);assert.equal(state.raidCompute,140);assert.equal(state.hardwareLevel,1);assert.equal(state.agentLevel,1);
  const next=(await call('/api/raid/start',{layout:0})).data.run as RaidRun;assert.notEqual(next.id,run.id);assert.equal(next.layout,1);assert.deepEqual(next.squad,{scout:3,tank:3,breaker:3});assert.equal(next.power,1.15);
  const midRaidTraining=await call('/api/command',{revision:state.revision,requestId:randomUUID(),command:{type:'agent-upgrade'}});assert.equal(midRaidTraining.status,200);assert.equal(midRaidTraining.data.state.agentLevel,2);assert.deepEqual((await call('/api/raid/start',{layout:0})).data.run,next);
  const second=await call('/api/raid/claim',{id:next.id,log:assault(next)});assert.equal(second.status,200);state=second.data.state;
  assert.deepEqual((await call('/api/game')).data.state,state);
  const {DatabaseSync}=await import('node:sqlite');const reopened=new DatabaseSync(process.env.GAME_DB_PATH);assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM raids WHERE outcome IS NOT NULL').get()!.n,2);reopened.close();
  const replay=await call('/api/raid/claim',claim);assert.deepEqual(replay.data.state,state);
 }finally{await new Promise<void>(r=>server.close(()=>r()));closeDatabase();rmSync(folder,{recursive:true,force:true});}
});
