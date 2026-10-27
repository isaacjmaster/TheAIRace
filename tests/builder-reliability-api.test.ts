import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {registerFoundation} from '../server/foundation-api';
import {type FoundationState} from '../shared/foundation';
import {clearingJobs,clearingPosition,LANDSCAPE} from '../shared/landscape';
import {identityHeaders,saveIdForCookie} from './helpers/identity';
async function fixture(path:string,start:number){
 const db=new DatabaseSync(path);let now=start;const app=express();app.use(express.json());registerFoundation(app,db,{clock:()=>now});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/foundation`;
 const get=async(cookie='')=>{const r=await fetch(url,{headers:{cookie}});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};};
 const command=async(cookie:string,command:unknown,requestId=randomUUID())=>{const r=await fetch(url+'/bots',{method:'POST',headers:identityHeaders(db,cookie),body:JSON.stringify({generation:0,requestId,command})});return {status:r.status,data:await r.json()};};
 const save=(cookie:string,s:FoundationState)=>db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s),saveIdForCookie(db,cookie));
 return {db,get,command,save,time:(t:number)=>now=t,close:()=>new Promise<void>(r=>server.close(()=>{db.close();r();}))};
}
test('two entitled builders persist independent clearing assignments and release at work completion with exactly-once rewards',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'airace-builder-reliability-')),path=join(dir,'isolated.sqlite');let f=await fixture(path,100000);
 try{
  const p=await f.get();assert.equal((await f.command(p.cookie,{action:'establish-station',position:[3,5]})).status,200);
  const s=(await f.get(p.cookie)).data.state as FoundationState;s.founderHqLevel=2;s.builders=2;s.compute=100;s.bots=7;s.breachers=2;f.save(p.cookie,s);
  const before=(await f.get(p.cookie)).data.state as FoundationState,obstacles=before.landscape!.items.slice(0,3),request=randomUUID();
  const replies=await Promise.all(obstacles.slice(0,2).map((o,i)=>f.command(p.cookie,{action:'clear-obstacle',obstacleId:o.id},i?randomUUID():request)));
  assert.deepEqual(replies.map(r=>r.status),[200,200]);
  const busy=(await f.get(p.cookie)).data.state as FoundationState,jobs=clearingJobs(busy);assert.equal(jobs.length,2);assert.equal(new Set(jobs.map(j=>j.builderIndex)).size,2);assert.equal(busy.buildersBusy,2);
  assert.equal((await f.command(p.cookie,{action:'clear-obstacle',obstacleId:obstacles[2].id})).status,400);
  assert.equal((await f.command(p.cookie,{action:'clear-obstacle',obstacleId:obstacles[0].id},request)).status,200);
  await f.close();f=await fixture(path,100001);
  const restored=(await f.get(p.cookie)).data.state as FoundationState;assert.deepEqual(clearingJobs(restored),jobs);assert.equal(restored.bots,7);assert.equal(restored.breachers,2);
  const at=Math.max(...jobs.map(j=>j.clearedAt))+1;f.time(at);
  const reads=await Promise.all([f.get(p.cookie),f.get(p.cookie)]),reward=jobs.reduce((n,j)=>n+LANDSCAPE.rewards[j.obstacle.kind],0);
  for(const r of reads){assert.equal(r.data.state.buildersBusy,0);assert.equal(r.data.state.compute,100+reward);assert.equal(r.data.companyXp.total,6);for(const o of obstacles.slice(0,2))assert.ok(!r.data.state.landscape.items.some((x:{id:string})=>x.id===o.id));}
  const previous=clearingJobs(reads[0].data.state).filter(j=>at<j.completesAt);assert.ok(previous.length,'completion releases builder before return ends');
  const next=await f.command(p.cookie,{action:'clear-obstacle',obstacleId:obstacles[2].id});assert.equal(next.status,200);
  const reassigned=clearingJobs(next.data.state).find(j=>j.obstacle.id===obstacles[2].id)!;const returning=previous.find(j=>j.builderIndex===reassigned.builderIndex);assert.ok(returning,'reuse a returning builder');
  assert.deepEqual(reassigned.route[0],clearingPosition(returning!,at),'new travel starts exactly at current return position');
  assert.equal(next.data.state.buildersBusy,1);assert.equal(next.data.state.builders,2);assert.equal(next.data.companyXp.total,6);assert.deepEqual(next.data.state.stationLayout,before.stationLayout);assert.deepEqual(next.data.state.builderHuts,before.builderHuts);
 }finally{await f.close();rmSync(dir,{recursive:true,force:true});}
});
