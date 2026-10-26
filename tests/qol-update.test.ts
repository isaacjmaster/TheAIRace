import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {backupBeforeQualityOfLifeMigration} from '../server/qol-backup';
import {BASE_IDS} from '../shared/infiltration-bases';
import {ensureLandscape,clearObstacle,advanceLandscape} from '../shared/landscape';
import {worldFixture} from './helpers/player-world-fixture';
import {initialFoundation,establishBuilderStation,reconcileBuilderHuts,moveBuilderHut,validBuilderHutPosition} from '../shared/foundation';
import {connectedWallRow,moveWallRow} from '../shared/cybersecurity';
import {replayOperationAt,type BattleReplay} from '../shared/pvp-replay';
import {PVP} from '../shared/player-combat';
import {compoundBotPose} from '../shared/hangar-presentation';
import {newSquadOperation,SQUAD_BALANCE} from '../shared/squad-infiltration';
import {advanceTactical,planTactical} from '../shared/tactical-infiltration';
import {commandOperation} from '../shared/infiltration';

test('wall rows stop at corners and reject a group move atomically',()=>{
 const s=initialFoundation();s.walls=[{id:'a',legacy:true,position:[20,15],orientation:0},{id:'b',legacy:true,position:[22,15],orientation:0},{id:'c',legacy:true,position:[24,15],orientation:0},{id:'turn',legacy:true,position:[25,16],orientation:1}];
 assert.deepEqual(connectedWallRow(s,'b').map(w=>w.id).sort(),['a','b','c']);
 const before=structuredClone(s);assert.throws(()=>moveWallRow(s,'b',[0,0]));assert.deepEqual(s,before);
 moveWallRow(s,'b',[22,20]);assert.deepEqual(s.walls.map(w=>w.position),[[20,20],[22,20],[24,20],[25,16]]);assert.equal(s.compute,before.compute);
});
test('builder hut reconciliation preserves the first hut, entitlement and all existing progression',()=>{
 const s=initialFoundation();s.starterStation='placed';s.stationLayout={position:[12,-12],orientation:1};s.founderHqLevel=2;s.compute=321;s.bots=7;
 const original=structuredClone(s);reconcileBuilderHuts(s);assert.equal(s.builderHuts?.length,1);assert.deepEqual(s.stationLayout,original.stationLayout);assert.equal(s.compute,321);assert.equal(s.bots,7);assert.equal(s.builders,original.builders);
 const hut=s.builderHuts![0];assert.equal(validBuilderHutPosition(s,hut.id,hut.position,hut.orientation),null);
 const saved=JSON.parse(JSON.stringify(s));reconcileBuilderHuts(saved);assert.deepEqual(saved,s);
 assert.throws(()=>moveBuilderHut(s,hut.id,[0,0],0));assert.deepEqual(s,saved);
 moveBuilderHut(s,hut.id,[26,-20],1);assert.equal(s.compute,321);assert.equal(s.builderHuts!.length,1);
});
test('hangar residents pause for seconds, walk naturally and retain body separation',()=>{
 for(let slot=0;slot<8;slot++){let idle=0,moving=0;for(let n=1;n<=160;n++){const a=compoundBotPose(slot,(n-1)/20).position,b=compoundBotPose(slot,n/20).position,d=Math.hypot(a[0]-b[0],a[2]-b[2]);if(d<1e-8)idle++;else moving++;assert.ok(d<=.86/20);}assert.ok(idle>100&&moving>20);}
 for(let t=0;t<120;t+=.1){const p=Array.from({length:8},(_,i)=>compoundBotPose(i,t).position);for(let i=0;i<8;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(p[i][0]-p[j][0],p[i][2]-p[j][2])>.8);}
});
test('historical replay records intermediate frames, is private, read-only and has persistent dismissal and shield',async()=>{
 const f=await worldFixture();try{
 const a=await f.fresh('Replay_Attacker'),d=await f.fresh('Replay_Defender'),scout=(await f.search(a)).data.scout;
 const start=await f.command(a,{action:'pvp-start',scoutId:scout.id});assert.equal(start.status,200);const id=start.data.state.infiltration.id;
 for(let i=0;i<5;i++)assert.equal((await f.command(a,{action:'infiltration-command',operationId:id,intent:{action:'deploy'}})).status,200);
 const historical=f.read(a).infiltration!.target;const changed=f.read(d);changed.hqLayout!.position=[-10,-3];f.save(d,changed);
 f.setTime(f.time()+10000);await f.get(a);f.setTime(f.time()+170000);
 const notice=(await f.get(d,'/pvp/notifications')).data;assert.equal(notice.notification.id,id);
 const result=await f.get(d,'/pvp/replays/'+id);assert.equal(result.status,200);const replay=result.data.replay as BattleReplay;
 assert.deepEqual(replay.initial.target,historical);assert.ok(replay.frames.length>100);assert.ok(replay.frames.some(x=>x.status==='active'&&x.lastTick>replay.frames[0].lastTick+1000));
 assert.equal(replay.final.status,'extracted');assert.equal(replay.final.settlement!.influence,25);
 const mid=replay.frames.find(x=>x.status==='active'&&x.lastTick>replay.frames[0].lastTick+5000)!;assert.deepEqual(replayOperationAt(replay,mid.lastTick).squad,mid.squad);
 assert.deepEqual(replayOperationAt(replay,replay.finishedAt).hacked,replay.final.hacked);
 const beforeA=JSON.stringify(f.read(a)),beforeD=JSON.stringify(f.read(d));await f.get(d,'/pvp/replays/'+id);assert.equal(JSON.stringify(f.read(a)),beforeA);assert.equal(JSON.stringify(f.read(d)),beforeD);
 const stranger=await f.fresh('Replay_Stranger');assert.equal((await f.get(stranger,'/pvp/replays/'+id)).status,404);
 assert.equal((await f.post(stranger,'/pvp/notifications/'+id+'/dismiss',{})).status,404);
 assert.equal((await f.post(d,'/pvp/notifications/'+id+'/dismiss',{})).status,200);assert.equal((await f.get(d,'/pvp/notifications')).data.notification,null);
 assert.equal(notice.shieldUntil,replay.finishedAt+300000);assert.equal(PVP.cooldownMs,5*60*1000);
 f.setTime(notice.shieldUntil-1);const staleScout=f.db.prepare('SELECT id FROM pvp_scouts WHERE attacker_id=?').get(a.id)!;
 assert.equal((await f.command(a,{action:'pvp-start',scoutId:String(staleScout.id)})).status,400);
 f.setTime(notice.shieldUntil);const next=(await f.search(a)).data.scout;assert.ok(next);assert.ok(f.db.prepare('SELECT eligible_at FROM pvp_reward_cooldowns WHERE attacker_id=? AND defender_id=?').get(a.id,d.id)!.eligible_at as number<=f.time());
 f.setTime(f.time()+31*86400000);assert.equal((await f.get(d,'/pvp/replays/'+id)).status,404);assert.equal((await f.get(d,'/pvp/history')).data.defenses[0].replayAvailable,false);
 }finally{await f.close();}
});
test('Research receipt returns only the confirmed collected amount, including a retry',async()=>{
 const f=await worldFixture();try{const p=await f.fresh('Research_Receipt'),s=f.read(p);s.research=498;s.lab={position:[20,15],orientation:0,startedAt:0,completesAt:1,lastProducedAt:f.time(),stored:12};f.save(p,s);const id=randomUUID(),a=await f.command(p,{action:'collect-research'},id),b=await f.command(p,{action:'collect-research'},id);assert.equal(a.status,200);assert.equal(a.data.amount,2);assert.equal(b.data.amount,2);assert.equal(f.read(p).research,500);assert.equal(f.read(p).lab!.stored,10);}finally{await f.close();}
});
test('bots retarget through a reachable face when the saved approach is blocked, with unchanged wall balance',()=>{
 const o=newSquadOperation(randomUUID(),'lumen-labs',1000);o.pvp={attackerId:'a',defenderId:'d'} as typeof o.pvp;
 o.target.walls=[];o.target.defenses=[];o.drones=[];o.sentinels=[];
 o.target.assets=[{id:'first',kind:'gpu',name:'First',position:[-8,0],size:[2,2],access:[-8,2],hackSeconds:1,maxHealth:9,compute:0,research:0},{id:'second',kind:'gpu',name:'Second',position:[0,0],size:[2,2],access:[0,2],hackSeconds:1,maxHealth:9,compute:0,research:0},{id:'blocker',kind:'station',name:'Blocked approach',position:[0,2],size:[2,2],compute:0,research:0}];
 commandOperation(o,{action:'deploy'},1000);const a=o.squad!.agents[0];a.position=[-8,2];a.workPosition=[-8,2];a.path=[];a.target='first';a.mode='hacking';a.nextPlanAt=100000;
 advanceTactical(o,1100);assert.ok(o.hacked.includes('first'));assert.equal(a.target,'second');assert.notDeepEqual(a.workPosition,[0,2]);assert.ok(a.path.length);
 advanceTactical(o,20000);assert.ok(o.hacked.includes('second'));assert.equal(o.status,'extracted');assert.deepEqual([SQUAD_BALANCE.wallHealth,SQUAD_BALANCE.breachDps],[72,18]);
});
test('a ready scout cannot deploy through a shield or into a concurrent attack',async()=>{
 const f=await worldFixture();try{const a=await f.fresh('Shield_A'),b=await f.fresh('Shield_B'),d=await f.fresh('Shield_D');
 const ids=[];for(const p of [a,b]){const scout=(await f.search(p)).data.scout;f.db.prepare('UPDATE pvp_scouts SET defender_id=? WHERE id=?').run(d.id,scout.id);const started=await f.command(p,{action:'pvp-start',scoutId:scout.id});assert.equal(started.status,200);ids.push(started.data.state.infiltration.id);}
 assert.equal((await f.command(a,{action:'infiltration-command',operationId:ids[0],intent:{action:'deploy'}})).status,200);
 assert.equal((await f.command(b,{action:'infiltration-command',operationId:ids[1],intent:{action:'deploy'}})).status,400);assert.equal(f.read(b).bots,10);
 await f.command(a,{action:'infiltration-command',operationId:ids[0],intent:{action:'abandon'}});
 assert.equal((await f.command(b,{action:'infiltration-command',operationId:ids[1],intent:{action:'deploy'}})).status,400);assert.equal(f.read(b).bots,10);
 }finally{await f.close();}
});
test('all five requested mission IDs reach the authoritative simulation unchanged',async()=>{
 const f=await worldFixture();try{const p=await f.fresh('Mission_Choice');for(const targetId of BASE_IDS){const r=await f.command(p,{action:'infiltration-start',targetId});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.state.infiltration.target.id,targetId);await f.command(p,{action:'infiltration-command',operationId:r.data.state.infiltration.id,intent:{action:'abandon'}});}}finally{await f.close();}
});
test('formerly decorative campus rocks stay removed after serialization and repeat reconciliation',()=>{
 const s=initialFoundation();s.starterStation='placed';s.builders=1;ensureLandscape(s,1000,'rocks');const rock=s.landscape!.items.find(x=>x.id==='stone-east')!;assert.ok(rock);clearObstacle(s,rock.id,1000);advanceLandscape(s,s.landscape!.clearing!.clearedAt+1);const saved=JSON.parse(JSON.stringify(s));ensureLandscape(saved,100000,'ignored');assert.ok(!saved.landscape.items.some((x:{id:string})=>x.id===rock.id));assert.ok(saved.landscape.items.some((x:{id:string})=>x.id==='stone-west'));
});
test('crowded extra huts persist unplaced across restart, then place free without duplicate rewards',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'airace-qol-')),path=join(dir,'game.sqlite');let f=await worldFixture(path);try{const p=await f.fresh('Crowded_Huts'),s=f.read(p);s.founderHqLevel=2;s.landscape!.legacyRocksRegistered=true;s.landscape!.items=[{id:'blocked-fixture',kind:'rock',position:[0,0],size:[200,200],variant:0}];f.save(p,s);const first=await f.get(p);assert.equal(first.data.state.builderHuts.length,1);assert.equal(first.data.state.builderHuts[0].unplaced,true);const before=f.read(p),score=first.data.competition.total,time=f.time();await f.close();f=await worldFixture(path,time);const resumed=(await f.get(p)).data.state;assert.deepEqual(resumed.builderHuts,before.builderHuts);assert.deepEqual(resumed.stationLayout,before.stationLayout);resumed.landscape.items=[];f.save(p,resumed);const id=randomUUID(),command={action:'move-builder-hut',id:resumed.builderHuts[0].id,position:[25,-20],orientation:0};for(let n=0;n<2;n++)assert.equal((await f.command(p,command,id)).status,200);const after=(await f.get(p)).data;assert.equal(after.state.builderHuts.length,1);assert.equal(after.state.builderHuts[0].unplaced,false);assert.equal(after.state.compute,before.compute);assert.equal(after.state.bots,before.bots);assert.equal(after.competition.total,score);}finally{await f.close();rmSync(dir,{recursive:true,force:true});}
});
test('first QoL startup creates a verified backup before any schema or player changes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'airace-qol-backup-')),db=new DatabaseSync(join(dir,'game.sqlite'));try{db.exec("CREATE TABLE foundation_saves(id TEXT PRIMARY KEY,state TEXT);INSERT INTO foundation_saves VALUES('keep','{\"compute\":321}')");const before=db.prepare('SELECT * FROM foundation_saves').all(),backup=backupBeforeQualityOfLifeMigration(db)!;assert.ok(existsSync(backup));assert.deepEqual(db.prepare('SELECT * FROM foundation_saves').all(),before);const copy=new DatabaseSync(backup,{readOnly:true});try{assert.deepEqual(copy.prepare('SELECT * FROM foundation_saves').all(),before);}finally{copy.close();}db.exec('CREATE TABLE pvp_replays(id TEXT)');assert.equal(backupBeforeQualityOfLifeMigration(db),null);}finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('restart caps long shields without extending short shields or changing opponent reward cooldowns',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'airace-shields-')),path=join(dir,'game.sqlite');let f=await worldFixture(path);try{const a=await f.fresh('Long_Shield'),b=await f.fresh('Short_Shield'),time=f.time();f.db.prepare('INSERT INTO pvp_shields VALUES(?,?)').run(a.id,time+12*3600000);f.db.prepare('INSERT INTO pvp_shields VALUES(?,?)').run(b.id,time+120000);f.db.prepare('INSERT INTO pvp_reward_cooldowns VALUES(?,?,?)').run(a.id,b.id,time+PVP.cooldownMs);await f.close();f=await worldFixture(path,time);assert.equal(f.db.prepare('SELECT expires_at FROM pvp_shields WHERE company_id=?').get(a.id)!.expires_at,time+300000);assert.equal(f.db.prepare('SELECT expires_at FROM pvp_shields WHERE company_id=?').get(b.id)!.expires_at,time+120000);assert.equal(f.db.prepare('SELECT eligible_at FROM pvp_reward_cooldowns').get()!.eligible_at,time+PVP.cooldownMs);}finally{await f.close();rmSync(dir,{recursive:true,force:true});}
});

test('narrow but valid Builder Hut apron still permits obstacle clearing without moving saved objects',()=>{const s=initialFoundation();ensureLandscape(s,100000,'regression-68');establishBuilderStation(s,[3,5]);const obstacles=structuredClone(s.landscape!.items),station=structuredClone(s.stationLayout);clearObstacle(s,s.landscape!.items[0].id,100000);assert.ok(s.landscape!.clearing!.route.length>1);assert.deepEqual(s.stationLayout,station);assert.deepEqual(s.landscape!.items,obstacles);});
