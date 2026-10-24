import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import * as THREE from 'three';
import {initialFoundation,advanceFoundation,buildingLayout,buildingReady,footprint,moveBuilding,validFoundationPosition} from '../shared/foundation';
import {buildSentinel,validWallPosition} from '../shared/cybersecurity';import {validDecorationPosition} from '../shared/decorations';import {landscapeRoute} from '../shared/landscape';
import {SENTINEL} from '../shared/sentinel-catalog';import {advanceSentinels} from '../shared/sentinel-combat';import {publicBase,baseVisualState,type PublicCompany} from '../shared/player-base';import {playerOperation} from '../shared/player-combat';import {commandOperation,advanceOperation} from '../shared/infiltration';import {TACTICAL_BALANCE} from '../shared/tactical-infiltration';import {settleOwnedUnit} from '../shared/infiltration-army';
import {WorldKit} from '../src/art/world';import {sentinelModel,animateSentinel,SentinelPulse} from '../src/art/SentinelTower';import {constructionWork} from '../src/art/builderWork';import {worldFixture} from './helpers/player-world-fixture';
const epoch=1700000000000;
function ready(){const s=initialFoundation();s.founderHqLevel=2;s.starterStation='placed';s.stationLayout={position:[-5,6],orientation:0};s.builders=2;s.compute=900;s.bots=7;s.research=123;s.landscape={version:1,epoch:'sentinel',sequence:0,nextSpawnAt:epoch+1e12,items:[],pendingCompute:0};return s;}
const company:PublicCompany={id:'defender',name:'Defender',hqLevel:2,level:2,influence:15,rank:1,visitable:true};
function battle(count=1){const s=ready();s.hqLayout={position:[-12,-12],orientation:0};s.stationLayout={position:[-12,0],orientation:0};s.sentinel={position:[0,0],orientation:0,startedAt:0,completesAt:0};const o=playerOperation('battle',publicBase(s,'defender',epoch)!,company,'attacker',epoch);for(let i=0;i<count;i++)commandOperation(o,{action:'deploy',position:o.target.entry},epoch);o.squad!.agents.forEach((a,i)=>{a.position=[i*.8,5];a.path=[];a.target=undefined;a.droneTarget=undefined;a.mode='idle';a.nextPlanAt=epoch+1e8;});return o;}
test('Sentinel enforces HQ2, funds, one ownership, builder, bounds and original deadline',()=>{
 for(const kind of ['hq','funds','builder','bounds'] as const){const s=ready();if(kind==='hq')s.founderHqLevel=1;if(kind==='funds')s.compute=299;if(kind==='builder')s.buildersBusy=2;const before=s.compute;assert.throws(()=>buildSentinel(s,kind==='bounds'?[100,0]:[9,9],epoch));assert.equal(s.compute,before);assert.equal(s.sentinel,undefined);}
 const s=ready(),old=structuredClone(s);buildSentinel(s,[9,9],epoch,1);assert.equal(s.compute,600);assert.equal(s.sentinel!.completesAt,epoch+90000);assert.equal(s.buildersBusy,1);assert.ok(constructionWork(s,epoch+1000)?.positions.length);assert.equal(buildingReady(s,'sentinel',epoch+89999),false);assert.throws(()=>buildSentinel(s,[16,9],epoch),/1\/1/);assert.throws(()=>moveBuilding(s,'sentinel',[16,9],0,epoch),/construction/);
 const saved=JSON.parse(JSON.stringify(s));advanceFoundation(saved,epoch+90000);assert.equal(saved.buildersBusy,0);moveBuilding(saved,'sentinel',[16,9],3,epoch+90000);assert.equal(saved.compute,600);assert.equal(saved.sentinel.completesAt,epoch+90000);assert.equal(saved.bots,old.bots);assert.equal(saved.research,old.research);
 const base=publicBase(saved,'defender',epoch+90000)!;assert.deepEqual(baseVisualState(base).sentinel?.position,[16,9]);assert.ok(base.buildings.find(b=>b.id==='sentinel')?.complete);
});
test('old saves and active old attacks gain no free turret or defense; unfinished towers cannot fire',()=>{
 const s=ready(),before=JSON.stringify(s);assert.equal(buildingLayout(s,'sentinel'),undefined);const base=publicBase(s,'defender',epoch)!;assert.equal(playerOperation('old',base,company,'attacker',epoch).target.sentinels,undefined);assert.equal(JSON.stringify(s),before);
 buildSentinel(s,[9,9],epoch);const o=playerOperation('new',publicBase(s,'defender',epoch+1)!,company,'attacker',epoch+1);assert.equal(o.target.sentinels,undefined);assert.equal(o.target.assets.find(a=>a.id==='sentinel')?.maxHealth,240);
});
test('Target Lock ramps 18/20/22/24/26, caps and resets on range, occlusion and target changes',()=>{
 const o=battle(),bot=o.squad!.agents[0];bot.health=1000;advanceSentinels(o);o.lastTick+=400;advanceSentinels(o);assert.equal(bot.health,1000);o.lastTick+=100;
 const damage:number[]=[];for(let i=0;i<8;i++){advanceSentinels(o);damage.push(o.sentinels![0].shotDamage!);o.lastTick+=1300;}assert.deepEqual(damage,[18,20,22,24,26,28,30,30]);assert.equal(SENTINEL.damage*3+SENTINEL.lockStep*3,TACTICAL_BALANCE.botHealth);
 bot.position=[0,13];advanceSentinels(o);assert.equal(o.sentinels![0].lockShots,0);assert.equal(o.sentinels![0].targetId,undefined);bot.position=[0,5];advanceSentinels(o);o.lastTick+=500;advanceSentinels(o);assert.equal(o.sentinels![0].shotDamage,18);
 o.target.walls=[{id:'cover',x:0,z:3,w:8,d:.5}];o.lastTick+=2000;const health=bot.health;advanceSentinels(o);assert.equal(bot.health,health);assert.equal(o.sentinels![0].targetId,undefined);
 o.target.walls=[];o.target.assets.push({id:'cover-building',kind:'gpu',position:[0,3],size:[3,1],name:'Cover',compute:0,research:0});advanceSentinels(o);assert.equal(o.sentinels![0].targetId,undefined);
});
test('dead/extracted bots are ignored, tower retargets, destroyed towers and ended battles stop',()=>{
 const o=battle(3),[a,b,c]=o.squad!.agents;c.state='extracted';a.health=18;advanceSentinels(o);o.lastTick+=500;advanceSentinels(o);assert.equal(a.state,'lost');assert.deepEqual(a.cargo,{compute:0,research:0,intel:false});o.lastTick+=100;advanceSentinels(o);assert.equal(o.sentinels![0].targetId,b.id);assert.equal(o.sentinels![0].lockShots,0);
 o.hacked.push('sentinel');o.lastTick+=5000;advanceSentinels(o);assert.equal(b.health,60);assert.equal(c.health,60);assert.equal(o.sentinels![0].targetId,undefined);
 const done=battle();done.status='extracted';advanceSentinels(done);assert.equal(done.sentinels,undefined);const friendly=battle();friendly.pvp=undefined;advanceSentinels(friendly);assert.ok(friendly.sentinels?.length);
});
test('fixed-step combat persists identically across reconnect/offline; losses settle once',()=>{
 const o=battle(2);advanceOperation(o,epoch+700);const resumed=JSON.parse(JSON.stringify(o));advanceOperation(o,epoch+10000);for(let t=epoch+800;t<=epoch+10000;t+=100)advanceOperation(resumed,t);assert.deepEqual(JSON.parse(JSON.stringify(o)),JSON.parse(JSON.stringify(resumed)));assert.equal(o.status,'caught');assert.equal(o.squad!.agents.filter(a=>a.state==='lost').length,2);
 const s=ready();s.bots=0;s.infiltration=o;settleOwnedUnit(s);settleOwnedUnit(s);assert.equal(s.bots,0);
});
test('former road and lamp sites accept buildings, walls, decorations and worker paths',()=>{
 const s=ready();for(const p of [[9,9],[-16,7],[13,7],[-16,11]] as [number,number][]){assert.equal(validFoundationPosition(s,p,'sentinel'),null,JSON.stringify(p));assert.equal(validWallPosition(s,p,0),null);assert.equal(validDecorationPosition(s,'flowers',p,0,undefined,false),null);}assert.match(validFoundationPosition(s,[25,11],'sentinel')!,/rocks/);assert.ok(landscapeRoute(s,[9,12],[9,6],1.1).length);
});
test('turret geometry stays inside its collision envelope at every yaw; resources release',()=>{
 const k=new WorldKit('campus'),g=sentinelModel(k),pulse=new SentinelPulse();try{for(let i=0;i<16;i++){animateSentinel(g,{id:'sentinel',yaw:i*Math.PI/8,lockShots:4,targetId:'bot'},1000,1);g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g,true);assert.ok(Math.max(Math.abs(b.min.x),Math.abs(b.max.x),Math.abs(b.min.z),Math.abs(b.max.z))<=2.01,JSON.stringify(b));assert.ok(b.min.y>=-.01);}
 let meshes=0;g.traverse(n=>{if(n instanceof THREE.Mesh)meshes++;});assert.ok(meshes<35);const l=buildingLayout({...ready(),sentinel:{position:[9,9],startedAt:0,completesAt:0}},'sentinel')!;assert.deepEqual(footprint('sentinel',l),{x:9,z:9,w:4,d:4});
 }finally{pulse.dispose();k.dispose();}
});
test('server rejects spoofed deadlines, deduplicates purchases, persists restart and free movement',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'sentinel-test-')),path=join(dir,'game.sqlite');let f=await worldFixture(path,epoch);try{const p=await f.fresh('SentinelOwner');const s=ready();f.save(p,s);const command={action:'build-sentinel',position:[9,9],orientation:0};assert.equal((await f.command(p,{...command,completesAt:0})).status,400);const id=randomUUID();assert.equal((await f.command(p,command,id)).status,200);assert.equal((await f.command(p,command,id)).status,200);assert.equal((await f.command(p,command)).status,400);assert.equal(f.read(p).compute,600);const before=f.read(p);await f.close();f=await worldFixture(path,epoch+45000);assert.deepEqual((await f.get(p)).data.state.sentinel,before.sentinel);f.setTime(epoch+90000);assert.equal((await f.get(p)).data.state.buildersBusy,0);assert.equal((await f.command(p,{action:'move',building:'sentinel',position:[16,9],orientation:2})).status,200);assert.equal(f.read(p).compute,600);assert.equal(f.read(p).bots,7);assert.equal(f.read(p).research,123);assert.deepEqual(f.read(p).sentinel?.position,[16,9]);}finally{await f.close();rmSync(dir,{recursive:true,force:true});}
});
test('actual PvP endpoint captures the tower, applies damage offline and leaves the defender untouched',async()=>{
 const f=await worldFixture();try{const attacker=await f.fresh('SentinelAttack'),defender=await f.fresh('SentinelDefense'),s=ready();s.sentinel={position:[9,9],orientation:0,startedAt:0,completesAt:0};f.save(defender,s);
 const scout=(await f.search(attacker)).data.scout,start=await f.command(attacker,{action:'pvp-start',scoutId:scout.id});assert.equal(start.status,200);const o=start.data.state.infiltration;assert.equal(o.target.sentinels[0].damage,18);
 const defenderBefore=JSON.stringify(f.read(defender));assert.equal((await f.command(attacker,{action:'infiltration-command',operationId:o.id,intent:{action:'deploy',position:[9,14]}})).status,200);assert.equal(f.read(attacker).bots,9);
 f.setTime(f.time()+10000);const after=(await f.get(attacker)).data.state.infiltration;assert.ok(after.events.some((e:{type:string})=>e.type==='sentinel-shot'));assert.equal(after.squad.agents[0].state,'lost');assert.equal(JSON.stringify(f.read(defender)),defenderBefore);assert.equal(f.read(attacker).bots,9);
 }finally{await f.close();}
});
