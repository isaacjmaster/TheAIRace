import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initialFoundation,trainTroop,advanceFoundation,armyUsed,availableTroops,buildingReady,moveBuilding,quoteBuildingUpgrade,type FoundationState} from '../shared/foundation';
import {constructionWork} from '../src/art/builderWork';
import {buildArcSpire} from '../shared/cybersecurity';
import {ARC_SPIRE,DISRUPTOR} from '../shared/electronic-catalog';
import {layoutInventory,layoutFingerprint,commitLayout} from '../shared/layout-draft';
import {publicBase,baseVisualState,type PublicCompany} from '../shared/player-base';
import {playerOperation} from '../shared/player-combat';
import {startOwnedOperation,commandOwnedOperation,settleOwnedUnit} from '../shared/infiltration-army';
import {newSquadOperation} from '../shared/squad-infiltration';
import {worldFixture} from './helpers/player-world-fixture';

const epoch=1700000000000;
function ready():FoundationState{const s=initialFoundation();Object.assign(s,{founderHqLevel:3,compute:1000,builders:2,starterStation:'placed',stationLayout:{position:[-5,6],orientation:0},fabricator:{position:[6,-6],hangarPosition:[12,-6],startedAt:0,completesAt:0},landscape:{version:1,epoch:'electronics',sequence:0,nextSpawnAt:epoch+1e12,items:[],pendingCompute:0,legacyRocksRegistered:true}});return s;}
const company:PublicCompany={id:'defender',name:'Defender',hqLevel:3,level:3,influence:15,rank:1,visitable:true};

test('Disruptor training enforces HQ3 and reserves three spaces without expanding existing capacity',()=>{
 const s=ready();s.founderHqLevel=2;assert.throws(()=>trainTroop(s,'disruptor',1,epoch),/Level 3/);assert.equal(s.compute,1000);
 s.founderHqLevel=3;s.bots=7;s.breachers=2;trainTroop(s,'disruptor',1,epoch);assert.equal(armyUsed(s),20);assert.equal(s.compute,985);assert.equal(s.training![0],epoch+30000);assert.throws(()=>trainTroop(s,'pulsewheel',1,epoch),/Hangar full/);
 const loaded=JSON.parse(JSON.stringify(s)) as FoundationState;advanceFoundation(loaded,epoch+30000);advanceFoundation(loaded,epoch+90000);assert.equal(loaded.disruptors,1);assert.equal(loaded.bots,7);assert.equal(loaded.breachers,2);assert.equal(armyUsed(loaded),20);assert.equal(loaded.training!.length,0);
});

test('existing legacy queues stay Pulsewheels and unlocked mixed queues complete once after reload',()=>{
 const s=ready();s.training=[epoch+5000];s.trainingDurations=[5000];trainTroop(s,'disruptor',2,epoch);assert.deepEqual(s.trainingKinds,['pulsewheel','disruptor','disruptor']);assert.deepEqual(s.training,[epoch+5000,epoch+35000,epoch+65000]);
 const loaded=JSON.parse(JSON.stringify(s));advanceFoundation(loaded,epoch+100000);advanceFoundation(loaded,epoch+100000);assert.equal(loaded.bots,1);assert.equal(loaded.disruptors,2);assert.equal(loaded.breachers??0,0);
 const old=ready();advanceFoundation(old,epoch);assert.equal(old.disruptors,undefined);assert.equal(old.arcSpire,undefined);
});

test('captured Disruptor supplies cannot be expanded mid-battle; mixed survivors return exactly once',()=>{
 const s=ready();s.bots=2;s.breachers=1;s.disruptors=1;startOwnedOperation(s,'mixed-electronics','vector-works',epoch,newSquadOperation);assert.equal(s.infiltration!.squad!.undeployedDisruptor,1);
 trainTroop(s,'disruptor',1,epoch);advanceFoundation(s,epoch+30000);assert.equal(s.disruptors,2);assert.equal(s.infiltration!.squad!.undeployedDisruptor,1);
 commandOwnedOperation(s,{action:'deploy',troop:'disruptor',position:[18,0]},epoch+30000);commandOwnedOperation(s,{action:'deploy',troop:'breacher',position:[18,1]},epoch+30000);commandOwnedOperation(s,{action:'deploy',troop:'pulsewheel',position:[18,2]},epoch+30000);
 assert.throws(()=>commandOwnedOperation(s,{action:'deploy',troop:'disruptor',position:[18,0]},epoch+30000),/No Disruptors/);assert.equal(s.disruptors,1);assert.equal(armyUsed(s),13);
 const restored=JSON.parse(JSON.stringify(s)) as FoundationState,o=restored.infiltration!;o.status='extracted';o.squad!.agents.forEach(a=>a.state=a.troop==='breacher'?'lost':'extracted');o.squad!.agents.find(a=>a.troop==='breacher')!.health=0;settleOwnedUnit(restored);settleOwnedUnit(restored);assert.equal(restored.disruptors,2);assert.equal(restored.bots,2);assert.equal(restored.breachers,0);assert.equal(armyUsed(restored),8);
});

test('Arc Spire uses the existing builder, preserves completion and exposes no unimplemented upgrade',()=>{
 for(const condition of ['hq','funds','busy','bounds'] as const){const s=ready();if(condition==='hq')s.founderHqLevel=2;if(condition==='funds')s.compute=449;if(condition==='busy')s.buildersBusy=2;const before=s.compute;
  // Real jobs, not a forged busy count, hold both existing builder slots.
  if(condition==='busy'){s.rig={position:[-15,12],startedAt:epoch,completesAt:epoch+10000,lastProducedAt:epoch,stored:0};s.lab={position:[-15,-12],startedAt:epoch,completesAt:epoch+10000,lastProducedAt:epoch,stored:0};}
  assert.throws(()=>buildArcSpire(s,condition==='bounds'?[100,0]:[9,9],epoch));assert.equal(s.compute,before);assert.equal(s.arcSpire,undefined);
 }
 const s=ready();buildArcSpire(s,[9,9],epoch,1);assert.equal(s.compute,550);assert.equal(s.buildersBusy,1);assert.ok(constructionWork(s,epoch+1000)?.routes[0].length);assert.equal(s.arcSpire!.completesAt,epoch+120000);assert.equal(buildingReady(s,'arcSpire',epoch+119999),false);assert.throws(()=>buildArcSpire(s,[16,9],epoch),/1\/1/);assert.throws(()=>moveBuilding(s,'arcSpire',[16,9],0,epoch),/construction/);
 const loaded=JSON.parse(JSON.stringify(s)) as FoundationState;advanceFoundation(loaded,epoch+120000);moveBuilding(loaded,'arcSpire',[16,9],2,epoch+120000);assert.equal(loaded.buildersBusy,0);assert.equal(loaded.compute,550);assert.equal(loaded.arcSpire!.completesAt,epoch+120000);assert.equal(quoteBuildingUpgrade(loaded,'arcSpire',epoch+120000).nextLevel,2);assert.equal(quoteBuildingUpgrade(loaded,'arcSpire',epoch+120000).requiredHq,3);
});

test('Arc Spire remains owned through layout inventory, atomic moves and public/PvP snapshots',()=>{
 const s=ready();buildArcSpire(s,[9,9],epoch);advanceFoundation(s,epoch+120000);const inventory=layoutInventory(s),arc=inventory.find(i=>i.id==='arcSpire')!;assert.equal(arc.name,'Arc Spire');
 const positions=inventory.map(i=>({id:i.id,...i.layout}));assert.throws(()=>commitLayout(s,layoutFingerprint(s),positions.filter(p=>p.id!=='arcSpire')),/every owned/);assert.deepEqual(s.arcSpire!.position,[9,9]);
 positions.find(p=>p.id==='arcSpire')!.position=[16,9];commitLayout(s,layoutFingerprint(s),positions);assert.deepEqual(s.arcSpire!.position,[16,9]);
 const base=publicBase(s,'defender',epoch+120000)!;assert.deepEqual(baseVisualState(base).arcSpire!.position,[16,9]);const op=playerOperation('arc-pvp',base,company,'attacker',epoch+120000);assert.equal(op.squad!.abilityVersion,1);assert.equal(op.target.arcSpires!.length,1);assert.equal(op.target.arcSpires![0].damage,ARC_SPIRE.damage);assert.equal(op.target.assets.find(a=>a.id==='arcSpire')!.maxHealth,336);assert.deepEqual(op.target.assets.find(a=>a.id==='arcSpire')!.size,[4,4]);
 const underConstruction=playerOperation('pending',publicBase(s,'defender',epoch+1)!,company,'attacker',epoch+1);assert.equal(underConstruction.target.arcSpires,undefined);
 const attacker=ready();attacker.disruptors=1;startOwnedOperation(attacker,'pvp-disruptor','defender',epoch,()=>op);commandOwnedOperation(attacker,{action:'deploy',troop:'disruptor',position:op.target.entry},epoch+120000);assert.equal(availableTroops(attacker,'disruptor'),0);assert.equal(op.squad!.agents[0].troop,'disruptor');assert.equal(op.squad!.agents[0].health,DISRUPTOR.health);
});

test('server purchases and Disruptor training are retry-safe and survive an actual database restart',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'electronic-inventory-')),path=join(directory,'game.sqlite');let f=await worldFixture(path,epoch);
 try{const p=await f.fresh('ElectronicOwner');f.save(p,ready());const id=randomUUID(),purchase={action:'build-arc-spire',position:[9,9],orientation:0};assert.equal((await f.command(p,{...purchase,completesAt:0})).status,400);assert.equal((await f.command(p,purchase,id)).status,200);assert.equal((await f.command(p,purchase,id)).status,200);assert.equal((await f.command(p,purchase)).status,400);const training=randomUUID();assert.equal((await f.command(p,{action:'train',troop:'disruptor',count:2},training)).status,200);assert.equal((await f.command(p,{action:'train',troop:'disruptor',count:2},training)).status,200);assert.equal(f.read(p).compute,520);
  const pending=f.read(p);await f.close();f=await worldFixture(path,epoch+1000);const restarted=(await f.get(p)).data.state;assert.deepEqual(restarted.arcSpire,pending.arcSpire);assert.deepEqual(restarted.training,pending.training);f.setTime(epoch+120000);const complete=(await f.get(p)).data.state;assert.equal(complete.disruptors,2);assert.equal(complete.compute,520);assert.equal(complete.buildersBusy,0);assert.equal((await f.get(p)).data.state.disruptors,2);
  assert.equal((await f.command(p,{action:'move',building:'arcSpire',position:[16,9],orientation:2})).status,200);assert.deepEqual(f.read(p).arcSpire!.position,[16,9]);assert.equal(f.read(p).compute,520);
 }finally{await f.close();rmSync(directory,{recursive:true,force:true});}
});
