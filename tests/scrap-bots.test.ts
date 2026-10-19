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
import {registerFoundation} from '../server/foundation-api';
import {buildRig,collectRig,advanceFoundation,trainScrap,armyUsed,startBotRaid,deployScrap,retreatBots,validFoundationPosition,type FoundationState} from '../shared/foundation';
import {distance,STATS,STEP,tick} from '../raid/engine';
const epoch=1700000000000;
const position:[number,number]=[6,-6];
function ready(){const s=initialFoundation();s.compute=500;buildFabricator(s,position,epoch);advanceFoundation(s,epoch+15000);return s;}
test('Fabricator grants one Hangar, reserves both footprints, and shares the one builder',()=>{
 const s=initialFoundation();buildRig(s,[6,0],epoch);assert.throws(()=>buildFabricator(s,position,epoch),/busy/);advanceFoundation(s,epoch+15000);buildFabricator(s,position,epoch+15000);assert.equal(s.compute,0);assert.equal(s.buildersBusy,1);assert.ok(s.fabricator);assert.deepEqual(s.fabricator.hangarPosition,[12,-6]);assert.throws(()=>buildFabricator(s,[16,0],epoch+15000),/1\/1/);
 assert.ok(validFoundationPosition(s,[12,-6],'rig'));assert.ok(validFoundationPosition(s,[6,-6],'rig'));assert.equal(validFoundationPosition(s,[16,0],'rig'),null);
 assert.throws(()=>trainScrap(s,1,epoch+16000),/Finish/);advanceFoundation(s,epoch+30000);assert.equal(s.buildersBusy,0);
 // A completed GPU keeps producing and can be collected while the Fabricator builds.
 const t=initialFoundation();t.compute=200;buildRig(t,[6,0],epoch);buildFabricator(t,position,epoch+75000);assert.equal(collectRig(t,epoch+75000),10);
});
test('training is sequential, charges once, includes queued capacity, and survives clock rollback and offline time',()=>{
 const s=ready();trainScrap(s,5,epoch+15000);trainScrap(s,5,epoch+15000);assert.equal(s.compute,400);assert.equal(armyUsed(s),10);assert.throws(()=>trainScrap(s,1,epoch+15000),/full/);assert.equal(s.training!.at(-1),epoch+65000);
 advanceFoundation(s,epoch+19999);assert.equal(s.bots,0);advanceFoundation(s,epoch+20000);assert.equal(s.bots,1);assert.equal(s.training!.length,9);advanceFoundation(s,epoch);assert.equal(s.bots,1);
 const restored=JSON.parse(JSON.stringify(s));advanceFoundation(restored,epoch+3600000);advanceFoundation(restored,epoch+7200000);assert.equal(restored.bots,10);assert.deepEqual(restored.training,[]);assert.equal(restored.compute,400);
 assert.throws(()=>trainScrap(ready(),0,epoch+20000));const poor=ready();poor.compute=4;assert.throws(()=>trainScrap(poor,1,epoch+20000),/5 Compute/);
});
test('raid stock is reserved, deployments consume trained bots, and undeployed bots return exactly once',()=>{
 const s=ready();trainScrap(s,5,epoch+15000);advanceFoundation(s,epoch+40000);startBotRaid(s,randomUUID(),0,epoch+40000);const id=s.botRaid!.id;assert.equal(s.bots,0);assert.equal(armyUsed(s),5);assert.throws(()=>startBotRaid(s,randomUUID(),0,epoch+40000),/Resume/);
 assert.throws(()=>deployScrap(s,id,{x:13,y:9},epoch+40000),/outer|outside/);assert.equal(s.botRaid!.simulation.stock.scrap,5);deployScrap(s,id,{x:9,y:2},epoch+40000);assert.equal(s.botRaid!.simulation.stock.scrap,4);assert.equal(armyUsed(s),4);
 trainScrap(s,5,epoch+40000);assert.equal(armyUsed(s),9);retreatBots(s,id,epoch+41000);assert.equal(s.bots,4);retreatBots(s,id,epoch+42000);assert.equal(s.bots,4);advanceFoundation(s,epoch+100000);assert.equal(s.bots,9);assert.equal(armyUsed(s),9);
});
test('both starter layouts are winnable with ten trained melee Scrap Bots and settle once after offline continuation',()=>{
 for(const layout of [0,1]){const s=ready();trainScrap(s,10,epoch+15000);advanceFoundation(s,epoch+65000);startBotRaid(s,randomUUID(),layout,epoch+65000);const id=s.botRaid!.id;
 for(let i=0;i<10;i++)deployScrap(s,id,{x:9,y:2},epoch+65000);assert.throws(()=>deployScrap(s,id,{x:9,y:2},epoch+65000));
 const r=s.botRaid!.simulation;let meleeHits=0;for(let step=0;step<1801&&!r.ended;step++){tick(r);for(const e of r.effects.filter(e=>e.source>=100&&e.ttl>.29)){const u=r.units.find(u=>u.id===e.source)!;assert.equal(u.kind,'scrap');assert.ok(distance(e.from,e.to)<=STATS.scrap.range+.01);meleeHits++;}}
 assert.equal(r.reason,'Network cleared');assert.ok(meleeHits>0);const compute=s.compute;advanceFoundation(s,epoch+200000);assert.equal(s.compute,compute+45);assert.equal(s.bots,0);advanceFoundation(s,epoch+300000);assert.equal(s.compute,compute+45);
 }
});
test('legacy JSON balances and rig survive additive training fields',()=>{
 const s=initialFoundation();buildRig(s,[6,0],epoch);advanceFoundation(s,epoch+75000);const rig=structuredClone(s.rig);s.compute=321;buildFabricator(s,position,epoch+75000);assert.equal(s.compute,271);assert.deepEqual(s.rig,rig);assert.equal(s.level,1);assert.equal(s.companyName,'Garage Intelligence');
});
test('SQLite restart, concurrent requests and action retries never duplicate buildings, troops or consumed stock',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'airace-bots-')),path=join(dir,'test.sqlite');let db=new DatabaseSync(path);let server:ReturnType<express.Express['listen']>;
 async function boot(){const app=express();app.use(express.json());registerFoundation(app,db,{legacyRaids:true});server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));return `http://127.0.0.1:${(server.address() as {port:number}).port}`;}
 const stop=()=>new Promise<void>(r=>server.close(()=>{db.close();r();}));let url=await boot();
 try{const first=await fetch(url+'/api/foundation');const cookie=first.headers.get('set-cookie')!.split(';')[0],id=saveIdForCookie(db,cookie);
 const read=()=>JSON.parse(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(id)!.state as string) as FoundationState;
 const post=async(body:unknown)=>{const r=await fetch(url+'/api/foundation/bots',{method:'POST',headers:identityHeaders(db,cookie),body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const action=(command:unknown)=>({requestId:randomUUID(),generation:0,command});
 await placeTestStation(url+'/api/foundation',identityHeaders(db,cookie));const build=action({action:'build',position});assert.equal((await post(build)).status,200);assert.equal((await post(build)).status,200);assert.equal(read().compute,50);assert.equal((await post(action({action:'build',position}))).status,400);
 const s=read();s.fabricator!.completesAt=Date.now()-1000;db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s),id);
 const hangar=action({action:'build-hangar',position:[12,-6]});assert.equal((await post(hangar)).status,200);const h=read();h.hangar!.completesAt=Date.now()-1000;db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(h),id);
 const train=action({action:'train',count:5});const attempts=await Promise.all([post(train),post(train)]);assert.ok(attempts.every(r=>r.status===200));assert.equal(read().compute,25);assert.equal(read().training!.length,5);
 assert.equal((await post({...train,command:{action:'train',count:1}})).status,400);
 const waiting=read();waiting.training=waiting.training!.map(()=>Date.now()-1000);db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(waiting),id);
 await stop();db=new DatabaseSync(path);url=await boot();const loaded=await(await fetch(url+'/api/foundation',{headers:{cookie}})).json();assert.equal(loaded.state.bots,5);assert.equal(loaded.state.compute,25);
 const start=action({action:'start',layout:0});assert.equal((await post(start)).status,200);assert.equal((await post(start)).status,200);const raidId=read().botRaid!.id;
 const deployment=action({action:'deploy',raidId,position:{x:9,y:2}});assert.equal((await post(deployment)).status,200);assert.equal((await post(deployment)).status,200);assert.equal(read().botRaid!.simulation.stock.scrap,4);assert.equal(read().botRaid!.simulation.units.length,1);
 const retreat=action({action:'retreat',raidId});await post(retreat);await post(retreat);assert.equal(read().bots,4);
 const reset=await fetch(url+'/api/foundation/reset',{method:'POST',headers:identityHeaders(db,cookie),body:JSON.stringify({confirm:'RESET FOUNDATION',revision:read().revision})});assert.equal(reset.status,200);assert.equal((await post(train)).status,400);assert.equal(read().fabricator,undefined);assert.equal(read().bots,undefined);
 }finally{await stop();rmSync(dir,{recursive:true,force:true});}
});

test('idle raids preserve reservation; offline defeat and expiry return only unspent bots and never repay deployed troops',()=>{
 const s=ready();trainScrap(s,5,epoch+15000);advanceFoundation(s,epoch+40000);startBotRaid(s,randomUUID(),0,epoch+40000);const id=s.botRaid!.id;
 advanceFoundation(s,epoch+86400000);assert.equal(s.botRaid!.simulation.time,0);assert.equal(s.botRaid!.simulation.stock.scrap,5);
 deployScrap(s,id,{x:25,y:17},epoch+86400000);const restored=JSON.parse(JSON.stringify(s));advanceFoundation(restored,epoch+86400000+91000);assert.equal(restored.botRaid.settled,true);assert.equal(restored.bots,4);const paid=restored.compute;advanceFoundation(restored,epoch+86400000+100000);assert.equal(restored.bots,4);assert.equal(restored.compute,paid);
 const defeat=ready();defeat.bots=1;startBotRaid(defeat,randomUUID(),0,epoch+40000);deployScrap(defeat,defeat.botRaid!.id,{x:25,y:17},epoch+40000);defeat.botRaid!.simulation.units[0].hp=0;advanceFoundation(defeat,epoch+40100);assert.equal(defeat.botRaid!.simulation.reason,'Squad eliminated');assert.equal(defeat.bots,0);
});
