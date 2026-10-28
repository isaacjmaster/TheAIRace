import test from 'node:test';
import assert from 'node:assert/strict';
import {newSquadOperation,commandSquad,advanceSquad,type SquadAgent} from '../shared/squad-infiltration';
import {advanceEmp,advanceArcSpires,initializeElectronics,weaponDisabled} from '../shared/electronic-combat';
import {advanceSentinels} from '../shared/sentinel-combat';
import {ARC_SPIRE,DISRUPTOR} from '../shared/electronic-catalog';
import {SENTINEL} from '../shared/sentinel-catalog';
import {beginReplayRecording,takeReplayFrames,captureReplayFrame,replayOperationAt} from '../shared/pvp-replay';
import {troopCombat} from '../shared/combat-balance';
import type {TroopKind} from '../shared/troops';
import type {Vec} from '../shared/infiltration';
function arena(){const o=newSquadOperation('electronics','lumen-labs',1000);o.status='active';o.startedAt=1000;o.target.defenses=[];o.drones=[];o.target.sentinels=[];o.target.arcSpires=[];o.target.walls=[];o.target.campusBounds={minX:-30,maxX:30,minZ:-30,maxZ:30};o.target.assets=[{id:'tower',kind:'station',name:'Tower',position:[0,0],size:[4,4],access:[0,2.85],hackSeconds:1000,maxHealth:9000,compute:0,research:0}];o.squad!.undeployed=0;o.squad!.undeployedBreacher=0;o.squad!.undeployedDisruptor=0;initializeElectronics(o);return o;}
function add(o:ReturnType<typeof arena>,id:string,kind:TroopKind,position:Vec):SquadAgent{const a:SquadAgent={id,troop:kind,position,path:[],mode:'idle',hack:0,yaw:0,health:troopCombat(o,kind).health,state:'active',unitStatus:'reserved',work:0,cargo:{compute:0,research:0,intel:false}};o.squad!.agents.push(a);return a;}
function activate(o:ReturnType<typeof arena>,a:SquadAgent){advanceEmp(o,a);o.lastTick+=200;advanceEmp(o,a);}
function sentinel(o:ReturnType<typeof arena>){o.target.sentinels=[{...SENTINEL,id:'tower',position:[0,0]}];}
function arc(o:ReturnType<typeof arena>){o.target.arcSpires=[{...ARC_SPIRE,id:'tower',position:[0,0]}];}
test('explicit initial statistics preserve distinct troop and defense roles',()=>{const o=arena();assert.equal(troopCombat(o,'disruptor').damage,2.25);assert.equal(DISRUPTOR.health,54);assert.equal(DISRUPTOR.housing,3);assert.ok(ARC_SPIRE.damage/ARC_SPIRE.intervalMs<SENTINEL.damage/SENTINEL.intervalMs);assert.equal(troopCombat(o,'pulsewheel').damage,9);assert.equal(troopCombat(o,'breacher').health,480);});
test('EMP is single-target, cannot extend active suppression, and immunity is shared across Disruptors',()=>{
 const o=arena();sentinel(o);const a=add(o,'support-a','disruptor',[5,0]),b=add(o,'support-b','disruptor',[5,1]);activate(o,a);assert.deepEqual(o.electronic!.statuses.tower,{disabledUntil:2700,immuneUntil:7200});
 o.lastTick=2000;advanceEmp(o,b);assert.equal(b.lastEmpAt,undefined);assert.equal(o.electronic!.statuses.tower.disabledUntil,2700);
 o.lastTick=2700;assert.equal(weaponDisabled(o,'tower'),false);advanceEmp(o,b);assert.equal(b.lastEmpAt,undefined);
 o.lastTick=7199;advanceEmp(o,b);assert.equal(b.lastEmpAt,undefined);o.lastTick=7200;activate(o,b);assert.equal(b.lastEmpAt,7400);assert.equal(o.electronic!.statuses.tower.disabledUntil,8900);
});
test('multiple Disruptors cover separate defenses without wasting EMP on protected targets',()=>{
 const o=arena();sentinel(o);o.target.defenses=[{id:'drone',route:[[5,2],[5,3]],radius:10,patrolSpeed:1,pursuitSpeed:2,warningSeconds:0,aerial:true}];o.drones=[{id:'drone',position:[5,2],segment:1,alert:0,lost:0,mode:'patrol',health:240}];const a=add(o,'a','disruptor',[5,0]),b=add(o,'b','disruptor',[5,0]);activate(o,a);activate(o,b);assert.deepEqual(Object.keys(o.electronic!.statuses).sort(),['drone','tower']);assert.equal(o.events.filter(e=>e.type==='emp').length,2);
});
test('EMP cooldown persists after its previous target dies; source death does not retain disable',()=>{
 const o=arena();sentinel(o);const a=add(o,'a','disruptor',[5,0]);activate(o,a);o.hacked.push('tower');o.target.sentinels!.push({...SENTINEL,id:'other',position:[6,3]});o.target.assets.push({...o.target.assets[0],id:'other',position:[6,3],size:[1,1]});o.lastTick=2000;advanceEmp(o,a);assert.equal(o.electronic!.statuses.other,undefined);a.state='lost';o.lastTick=2700;assert.equal(weaponDisabled(o,'tower'),false);advanceEmp(o,a);assert.equal(o.electronic!.statuses.other,undefined);
});
test('Sentinel holds Target Lock while jammed and recovers without accumulated burst shots',()=>{
 const o=arena();sentinel(o);const a=add(o,'a','disruptor',[5,0]),tank=add(o,'tank','breacher',[4.5,0]);o.sentinels=[{id:'tower',yaw:0,targetId:tank.id,acquiredAt:0,lastShotAt:0,lockShots:2}];activate(o,a);a.state='lost';
 for(o.lastTick=1300;o.lastTick<2700;o.lastTick+=100)advanceSentinels(o);assert.equal(tank.health,480);assert.equal(o.sentinels[0].lockShots,2);
 for(;o.lastTick<=4000;o.lastTick+=100)advanceSentinels(o);assert.equal(o.events.filter(e=>e.type==='sentinel-shot').length,1);assert.equal(tank.health,458);assert.equal(o.sentinels[0].lockShots,3);
});
test('ordinary Disruptor shots deal only configured damage and remain active after EMP',()=>{
 const o=arena();sentinel(o);const a=add(o,'a','disruptor',[5,0]);advanceSquad(o,2000);assert.equal(a.mode,'hacking');assert.equal(a.lastEmpAt,1300);assert.ok(Math.abs(o.squad!.progress.tower*9-2.25)<1e-8);assert.equal(o.events.filter(e=>e.type==='cipher-shot').length,1);
});
test('ground EMP cannot cross enemy walls or solid structures',()=>{
 const o=arena();sentinel(o);const a=add(o,'a','disruptor',[5,0]);o.target.walls=[{id:'wall',x:3,z:0,w:1,d:8}];advanceEmp(o,a);assert.equal(a.lastEmpAt,undefined);o.target.walls=[];o.target.assets.push({...o.target.assets[0],id:'blocker',position:[3,0],size:[1,4]});advanceEmp(o,a);assert.equal(a.lastEmpAt,undefined);o.target.assets.pop();activate(o,a);assert.equal(a.lastEmpAt,1200);
});
test('a jammed drone maintains its identity and flight but cannot fire',()=>{
 const o=arena();o.target.defenses=[{id:'drone',route:[[5,2],[5,3]],radius:10,patrolSpeed:1,pursuitSpeed:2,warningSeconds:0,aerial:true}];o.drones=[{id:'drone',position:[5,2],segment:1,alert:0,lost:0,mode:'patrol',health:240}];const a=add(o,'a','disruptor',[5,0]);advanceSquad(o,2400);assert.equal(o.drones[0].id,'drone');assert.equal(o.drones[0].mode,'attacking');assert.equal(o.drones[0].targetAgentId,'a');assert.equal(a.health,54);assert.equal(o.events.filter(e=>e.type==='laser').length,0);assert.equal(o.events.filter(e=>e.type==='emp').length,1);
});
test('Arc Spire hits at most three distinct attackers in nearest deterministic chain order',()=>{
 const o=arena();arc(o);add(o,'a','pulsewheel',[5,0]);add(o,'b','pulsewheel',[7,0]);add(o,'c','pulsewheel',[9,0]);add(o,'d','pulsewheel',[11,0]);advanceArcSpires(o);o.lastTick=1500;advanceArcSpires(o);assert.deepEqual(o.arcSpires![0].chain!.map(h=>h.id),['a','b','c']);assert.deepEqual(o.squad!.agents.map(a=>a.health),[49,51.2,53.4,60]);assert.equal(o.events.filter(e=>e.type==='arc-discharge').length,1);
});
test('Arc jumps can leave primary range but never exceed jump range or repeat a unit',()=>{
 const o=arena();arc(o);add(o,'a','pulsewheel',[9,0]);add(o,'b','pulsewheel',[11,0]);add(o,'c','pulsewheel',[14,0]);advanceArcSpires(o);o.lastTick=1500;advanceArcSpires(o);assert.deepEqual(o.arcSpires![0].chain!.map(h=>h.id),['a','b']);assert.equal(o.squad!.agents[2].health,60);
});
test('Arc tie-breaking is stable by ID, and isolated Breacher takes one hit',()=>{
 const o=arena();arc(o);add(o,'tank','breacher',[5,0]);advanceArcSpires(o);o.lastTick=1500;advanceArcSpires(o);assert.equal(o.arcSpires![0].chain!.length,1);assert.equal(o.squad!.agents[0].health,469);
 const t=arena();arc(t);add(t,'primary','pulsewheel',[5,0]);add(t,'z','pulsewheel',[7,1]);add(t,'a','pulsewheel',[7,-1]);advanceArcSpires(t);t.lastTick=1500;advanceArcSpires(t);assert.deepEqual(t.arcSpires![0].chain!.map(h=>h.id),['primary','a','z']);
});
test('elevated Arc attacks cross walls but not solid structures and never hit defender drones',()=>{
 const o=arena();arc(o);add(o,'a','pulsewheel',[5,0]);o.target.walls=[{id:'wall',x:3,z:0,w:1,d:8}];o.drones=[{id:'friend',position:[5,1],segment:1,alert:0,lost:0,mode:'patrol',health:240}];advanceArcSpires(o);o.lastTick=1500;advanceArcSpires(o);assert.equal(o.squad!.agents[0].health,49);assert.equal(o.drones[0].health,240);
 const t=arena();arc(t);add(t,'a','pulsewheel',[5,0]);t.target.assets.push({...t.target.assets[0],id:'blocker',position:[3,0],size:[1,4]});advanceArcSpires(t);t.lastTick=1500;advanceArcSpires(t);assert.equal(t.arcSpires![0].lastShotAt,undefined);
});
test('jammed or destroyed Arc Spires stop firing and expired suppression recovers normally',()=>{
 const o=arena();arc(o);const a=add(o,'a','disruptor',[5,0]);activate(o,a);advanceArcSpires(o);o.lastTick=2400;advanceArcSpires(o);assert.equal(o.arcSpires![0].chain,undefined);a.state='lost';const tank=add(o,'tank','breacher',[5,0]);o.lastTick=2800;advanceArcSpires(o);o.lastTick=3800;advanceArcSpires(o);assert.equal(tank.health,469);o.hacked.push('tower');o.lastTick=10000;advanceArcSpires(o);assert.equal(tank.health,469);
});
test('electronic snapshots and replay frames preserve status clocks and exact chain results',()=>{
 const o=arena();arc(o);o.pvp={attackerId:'attacker',defenderId:'defender'};add(o,'a','pulsewheel',[5,0]);add(o,'b','pulsewheel',[7,0]);const initial=structuredClone(o);beginReplayRecording(o);advanceArcSpires(o);o.lastTick=1500;advanceArcSpires(o);captureReplayFrame(o);const final=structuredClone(o),frames=takeReplayFrames(o);const replay={version:1 as const,initial,final,frames,attacker:'A',defender:'B',finishedAt:1500};assert.deepEqual(replayOperationAt(replay,1500).arcSpires,o.arcSpires);assert.deepEqual(replayOperationAt(replay,1500).electronic,o.electronic);
});
test('old snapshots never receive electronic state or new abilities',()=>{
 const o=arena();delete o.squad!.abilityVersion;delete o.electronic;arc(o);const a=add(o,'a','disruptor',[5,0]);advanceEmp(o,a);advanceArcSpires(o);initializeElectronics(o);assert.equal(o.electronic,undefined);assert.equal(o.arcSpires,undefined);assert.equal(a.lastEmpAt,undefined);o.squad!.undeployedDisruptor=1;assert.throws(()=>commandSquad(o,{action:'deploy',troop:'disruptor',position:o.target.entry},1000),/new operation/);
});
test('EMP visibly charges before activation and cancels a lost firing line without consuming cooldown',()=>{
 const o=arena();sentinel(o);const a=add(o,'support','disruptor',[5,0]);advanceEmp(o,a);assert.equal(a.empChargeAt,1000);assert.equal(a.empPendingTargetId,'tower');assert.equal(a.lastEmpAt,undefined);o.lastTick=1100;advanceEmp(o,a);assert.equal(a.lastEmpAt,undefined);o.target.walls=[{id:'wall',x:3,z:0,w:1,d:8}];o.lastTick=1200;advanceEmp(o,a);assert.equal(a.empPendingTargetId,undefined);assert.equal(a.lastEmpAt,undefined);o.target.walls=[];advanceEmp(o,a);o.lastTick=1400;advanceEmp(o,a);assert.equal(a.lastEmpAt,1400);assert.equal(a.empPendingTargetId,undefined);
});
test('suppression never fabricates firing timestamps or replays prior chain effects',()=>{
 const o=arena();arc(o);const a=add(o,'support','disruptor',[5,0]);o.arcSpires=[{id:'tower',lastShotAt:500,chain:[{id:a.id,position:[5,0],damage:11}]}];activate(o,a);advanceArcSpires(o);assert.equal(o.arcSpires[0].lastShotAt,500);assert.equal(o.arcSpires[0].resumeFireAt,3150);o.target.arcSpires=[];sentinel(o);o.sentinels=[{id:'tower',yaw:0,lockShots:2,lastShotAt:500}];advanceSentinels(o);assert.equal(o.sentinels[0].lastShotAt,500);assert.equal(o.sentinels[0].lockShots,2);
});
