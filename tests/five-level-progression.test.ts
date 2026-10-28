import test from 'node:test';
import assert from 'node:assert/strict';
import {initialFoundation,advanceFoundation,upgradeBuildings,upgradeFounderHQ,quoteBuildingUpgrade,trainTroop,armyUsed,builderBusyAt,type FoundationState} from '../shared/foundation';
import {buildingLevel,buildingStats,UPGRADE_COSTS,UPGRADE_TIMES,requiredHqLevel,reconcileStorage,type BuildingLevel} from '../shared/building-levels';
import {founderHqLevel,founderBuilderCapacity,founderDroneCapacity,gpuRigCapacity,wallCapacity} from '../shared/founder-hq';
import {publicBase,baseVisualState} from '../shared/player-base';
import {playerOperation} from '../shared/player-combat';
import {advanceArcSpires} from '../shared/electronic-combat';
import {replayOperationAt,type BattleReplay} from '../shared/pvp-replay';
import {baseFixture} from '../scripts/combat-balance-scenarios';
const job=(position:[number,number])=>({position,startedAt:0,completesAt:0});
function ready():FoundationState{return {...initialFoundation(),founderHqLevel:3,starterStation:'placed',builders:2,compute:6000,capacity:6000,research:120,researchCapacity:3000,storageBaseline:{compute:1000,research:500},stationLayout:{position:[-5,6],orientation:0},buildingLevels:{rig:3,lab:3,computeStorage:3,researchStorage:3,hangar:3,fabricator:3},computeStorage:job([20,-10]),researchStorage:job([20,-15]),rig:{...job([15,15]),lastProducedAt:0,stored:0},lab:{...job([15,-15]),lastProducedAt:0,stored:0},fabricator:{...job([-15,15]),separateHangar:true,hangarPosition:[-15,-15]},hangar:{...job([-15,-15]),size:'compound'},arcSpire:job([6,10]),landscape:{version:1,epoch:'five-level-test',sequence:0,nextSpawnAt:1e12,items:[],pendingCompute:0,legacyRocksRegistered:true}};}
test('legal HQ3 to HQ5 storage-first path is affordable and preserves positions and builder entitlement',()=>{
 const s=ready(),position=structuredClone(s.rig!.position);let now=0;
 for(const target of [4,5] as const){const cost=UPGRADE_COSTS.hq[target-2];assert.ok(cost<=s.capacity);s.compute=s.capacity;upgradeFounderHQ(s,now,'hq-'+target);assert.equal(s.hqUpgrade!.targetLevel,target);assert.equal(founderHqLevel(s),target-1);now=s.hqUpgrade!.completesAt;advanceFoundation(s,now);assert.equal(founderHqLevel(s),target);assert.equal(builderBusyAt(s,now),0);assert.equal(founderBuilderCapacity(s),2);assert.equal(founderDroneCapacity(s),2);assert.equal(gpuRigCapacity(s),2);
  for(const id of ['computeStorage','researchStorage','rig','lab','fabricator','hangar']){s.compute=s.capacity;const q=quoteBuildingUpgrade(s,id,now);assert.equal(q.nextLevel,target);assert.ok(q.cost<=s.capacity);upgradeBuildings(s,[id],{[id]:target-1},now,id+'-'+target);now+=q.durationMs;advanceFoundation(s,now);assert.equal(buildingLevel(s,id),target);}
 }
 assert.equal(s.capacity,13000);assert.equal(s.researchCapacity,6500);assert.deepEqual(s.rig!.position,position);assert.equal(wallCapacity(s),200);assert.throws(()=>upgradeFounderHQ(s,now,'six'),/Level 5/);assert.equal(quoteBuildingUpgrade(s,'rig',now).next,undefined);
});
test('every cost fits previous-tier storage and every building gate is reachable without a circular requirement',()=>{
 for(const [kind,costs]of Object.entries(UPGRADE_COSTS))for(let to=2;to<=5;to++){assert.ok(costs[to-2]<=1000+buildingStats('computeStorage',to-1).capacity,kind+':'+to);assert.ok(requiredHqLevel(kind as any,to)<=5);assert.ok(UPGRADE_TIMES[kind as keyof typeof UPGRADE_TIMES][to-2]>=0);}
 for(const level of [1,2,3,4,5])assert.equal(requiredHqLevel('arcSpire',level),Math.max(3,level));
});
test('missing Arc tiers upgrade on HQ3, then require HQ4 and HQ5; same instance and historical snapshot survive',()=>{
 const s=ready();let now=0;for(const target of [2,3] as const){s.compute=6000;upgradeBuildings(s,['arcSpire'],{arcSpire:target-1},now,'arc-'+target);now+=UPGRADE_TIMES.arcSpire[target-2];advanceFoundation(s,now);assert.equal(buildingLevel(s,'arcSpire'),target);}
 assert.match(quoteBuildingUpgrade(s,'arcSpire',now).reason!,/HQ Level 4/);assert.deepEqual(s.arcSpire!.position,[6,10]);
 const base=publicBase(s,'defender',now)!,o=playerOperation('frozen',base,{id:'defender',name:'D',level:3,hqLevel:3,influence:0,rank:null,visitable:true},'a',now);assert.equal(o.target.arcSpires![0].damage,17);s.buildingLevels!.arcSpire=5;assert.equal(o.target.arcSpires![0].damage,17);assert.equal(o.target.assets.find(a=>a.id==='arcSpire')!.maxHealth,510);
 const replay:BattleReplay={version:1,initial:structuredClone(o),final:structuredClone(o),frames:[],attacker:'a',defender:'d',finishedAt:now};assert.equal(replayOperationAt(replay,now).target.arcSpires![0].damage,17);
});
test('new production rates begin exactly at completion and completion notices persist without duplication',()=>{
 const s=ready();s.founderHqLevel=4;upgradeBuildings(s,['rig'],{rig:3},0,'gpu4');const end=UPGRADE_TIMES.rig[2];advanceFoundation(s,end+60000);assert.equal(s.rig!.stored,18*end/60000+24);assert.equal(s.completedUpgradeNotices!.length,1);assert.equal(s.completedUpgradeNotices![0].completedAt,end);assert.equal(s.completedUpgradeNotices![0].level,4);assert.equal(builderBusyAt(s,end),0);
 const loaded=JSON.parse(JSON.stringify(s));loaded.completedUpgradeNotices[0].acknowledged=true;advanceFoundation(loaded,end+60000);assert.equal(loaded.completedUpgradeNotices.length,1);assert.equal(loaded.completedUpgradeNotices[0].acknowledged,true);
});
test('housing counts troop spaces, new Fabricator speed retains its benefit without retired research, old paid jobs retain deadlines',()=>{
 const s=ready();s.founderHqLevel=5;s.buildingLevels!.hangar=5;s.buildingLevels!.fabricator=4;s.technologies={trainingEfficiency:3,cipherEngineering:3,gpuOptimization:3};s.bots=10;s.breachers=5;s.disruptors=3;assert.equal(armyUsed(s),44);trainTroop(s,'disruptor',2,0);assert.equal(armyUsed(s),50);assert.equal(s.trainingDurations![0],18000);assert.throws(()=>trainTroop(s,'pulsewheel',1,0),/Hangar full/);const ends=[...s.training!];s.buildingLevels!.fabricator=5;advanceFoundation(s,1);assert.deepEqual(s.training,ends);assert.equal(s.technologies,undefined);assert.deepEqual(s.researchMigration!.retired,{trainingEfficiency:3,cipherEngineering:3,gpuOptimization:3});assert.equal(s.troopLevels!.pulsewheel,3);
});
test('140 mixed wall selections quote and debit each next level atomically without spending a builder',()=>{
 const s=ready();s.founderHqLevel=5;s.compute=30000;s.walls=Array.from({length:140},(_,i)=>({id:'wall-'+i,position:[20,20] as [number,number],orientation:0}));s.buildingLevels={};const ids=s.walls.map(w=>'wall:'+w.id),expected:Record<string,number>={};let total=0;for(let i=0;i<140;i++){const level=(i%4+1) as BuildingLevel;s.buildingLevels[ids[i]]=level;expected[ids[i]]=level;total+=UPGRADE_COSTS.wall[level-1];}const before=s.compute;upgradeBuildings(s,ids,expected,0,'row');assert.equal(before-s.compute,total);assert.equal(builderBusyAt(s,0),0);for(const id of ids)assert.equal(buildingLevel(s,id),expected[id]+1);assert.throws(()=>upgradeBuildings(s,ids,expected,0,'stale'),/changed/);assert.equal(s.compute,before-total);assert.equal(s.walls.length,140);
});
test('all five Arc tiers retain exactly three diminishing hits and no additional mechanics',()=>{
 for(const level of [1,2,3,4,5] as const){const base=baseFixture('pvp-open');base.buildings.push({id:'arcSpire',position:[0,10],orientation:0,level,complete:true});const o=playerOperation('arc',base,{id:'d',name:'D',level:1,hqLevel:level,influence:0,rank:null,visitable:true},'a',0);o.status='active';o.startedAt=0;o.target.assets=[];o.target.walls=[];o.squad!.agents=[0,1,2,3].map(i=>({id:'a'+i,troop:'breacher',position:[i*.7,14],yaw:0,path:[],state:'active',mode:'idle',health:1000,cargo:{compute:0,research:0,intel:false}} as any));o.lastTick=100;advanceArcSpires(o);o.lastTick=1000;advanceArcSpires(o);const chain=o.arcSpires![0].chain!;assert.equal(chain.length,3);assert.deepEqual(chain.map(h=>h.damage),[1,.8,.6].map(m=>m*buildingStats('arcSpire',level).arcDamage));assert.equal(o.squad!.agents[3].health,1000);}
});

test('stale completed HQ jobs never downgrade a newer saved level or replay unlock notices',()=>{const s=ready();s.founderHqLevel=5;s.hqUpgrade={id:'old-hq2',targetLevel:2,startedAt:0,completesAt:100};s.hqNotification={id:'hq5',acknowledged:true};advanceFoundation(s,1000);assert.equal(s.founderHqLevel,5);assert.deepEqual(s.hqNotification,{id:'hq5',acknowledged:true});assert.equal(s.builders,2);});

test('existing early economy and combat tiers, technology caps, and non-upgradeable huts are unchanged',()=>{
 for(const [i,level]of ([1,2,3] as const).entries()){assert.equal(buildingStats('rig',level).productionPerMinute,[10,14,18][i]);assert.equal(buildingStats('lab',level).productionPerMinute,[2,2.8,3.6][i]);assert.equal(buildingStats('sentinel',level).sentinelDamage,[18,24,30][i]);assert.equal(buildingStats('sentinel',level).maxHealth,[420,600,800][i]);assert.equal(buildingStats('droneStation',level).droneDamage,[24,30,36][i]);assert.equal(buildingStats('wall',level).maxHealth,[180,270,390][i]);assert.equal(buildingStats('hangar',level).housing,[20,25,30][i]);assert.equal(wallCapacity({founderHqLevel:level}),[100,100,120][i]);}
 assert.deepEqual(UPGRADE_COSTS.hq.slice(0,2),[500,1500]);assert.deepEqual(UPGRADE_TIMES.hq.slice(0,2),[300000,600000]);const s=ready();s.founderHqLevel=5;const q=quoteBuildingUpgrade(s,'station',0);assert.equal(q.nextLevel,undefined);assert.match(q.reason!,/additional levels are not needed/);assert.throws(()=>upgradeBuildings(s,['station'],{station:1},0,'hut'),/additional levels/);
});
