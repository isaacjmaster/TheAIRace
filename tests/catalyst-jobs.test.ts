import test from 'node:test';
import assert from 'node:assert/strict';
import {initialFoundation,advanceFoundation,trainTroop,armyUsed,type FoundationState} from '../shared/foundation';
import {catalystCost,catalystJobs,completeCatalystJob} from '../shared/catalyst-jobs';
import {CATALYSTS} from '../shared/catalyst-config';
import {troopLevel,type TroopKind} from '../shared/troops';
const now=100000;
const ready=():FoundationState=>({...initialFoundation(),generation:7,compute:1000,founderHqLevel:3,fabricator:{position:[0,0],hangarPosition:[6,0],startedAt:0,completesAt:0},hangar:{position:[6,0],startedAt:0,completesAt:0}});
test('central pricing rounds upward only for unfinished work',()=>{
 assert.equal(CATALYSTS.startingBalance,100);
 for(const [ms,cost] of [[-1,0],[0,0],[1,1],[149999,1],[150000,1],[150001,2],[300000,2],[1800000,12]])assert.equal(catalystCost(ms),cost);
 assert.throws(()=>catalystCost(NaN));assert.throws(()=>catalystCost(Infinity));
});
test('quotes are pure, deterministic and exclude elapsed tasks',()=>{
 const s=ready();s.training=[now+1000,now+11000];s.trainingKinds=['breacher','pulsewheel'];s.trainingDurations=[30000,10000];
 const before=JSON.stringify(s),a=catalystJobs(s,now),b=catalystJobs(JSON.parse(before),now);
 assert.equal(JSON.stringify(s),before);assert.deepEqual(a,b);assert.equal(a.length,1);assert.equal(a[0].target,'breacher');
 assert.deepEqual(catalystJobs(ready(),now),[]);assert.throws(()=>completeCatalystJob(s,a[0].id,NaN));assert.equal(JSON.stringify(s),before);
});
test('each timed construction completes through ordinary lifecycle and frees its builder',()=>{
 for(const target of ['rig','rig2','fabricator','hangar','lab','droneStation','sentinel','arcSpire','computeStorage','researchStorage'] as const){
  const s=ready();s[target]={position:[0,0],hangarPosition:[6,0],startedAt:now-1000,completesAt:now+300000,lastProducedAt:now+300000,stored:0};
  advanceFoundation(s,now);const job=catalystJobs(s,now).find(j=>j.target===target)!;assert.ok(job,target);assert.equal(s.buildersBusy,1);
  const result=completeCatalystJob(s,job.id,now);assert.equal(result.completed,true);assert.equal(result.cost,2);assert.equal(s[target]!.completesAt,now);assert.equal(s.buildersBusy,0);
  assert.deepEqual(completeCatalystJob(s,job.id,now),{completed:false,cost:0});
  if(target==='rig'||target==='lab'){assert.equal(s[target]!.stored,0);advanceFoundation(s,now+60000);assert.ok(s[target]!.stored>0,'production starts at accelerated completion');}
 }
});
test('building and HQ upgrades preserve levels, notices and idempotence',()=>{
 const s=ready();s.buildingUpgrades={hangar:{id:'hangar-upgrade',startedAt:now-1,completesAt:now+300001,targetLevel:2}};s.hqUpgrade={id:'hq-upgrade',startedAt:now-1,completesAt:now+400000,targetLevel:4};
 const jobs=catalystJobs(s,now);assert.equal(jobs.length,2);
 for(const job of jobs)assert.equal(completeCatalystJob(s,job.id,now).completed,true);
 assert.equal(s.buildingLevels!.hangar,2);assert.equal(s.founderHqLevel,4);assert.equal(s.hqNotification!.id,'hq-upgrade');assert.equal(s.completedUpgradeNotices!.length,1);assert.equal(s.buildersBusy,0);
 for(const job of jobs)assert.equal(completeCatalystJob(s,job.id,now).cost,0);
 assert.equal(s.completedUpgradeNotices!.length,1);
});
test('all troop research completes using normal level and completion notification',()=>{
 for(const kind of ['pulsewheel','breacher','disruptor'] as TroopKind[]){const s=ready();s.troopResearch={troop:kind,level:2,startedAt:now-10,completesAt:now+150001};
 const job=catalystJobs(s,now)[0];assert.equal(job.kind,'research');assert.equal(completeCatalystJob(s,job.id,now).cost,2);assert.equal(troopLevel(s,kind),2);assert.equal(s.completedTroopResearch!.troop,kind);assert.equal(s.troopResearch,undefined);assert.equal(completeCatalystJob(s,job.id,now).completed,false);}
});
test('mixed training accelerates exactly one unit and shifts remaining deadlines without changing duration, ownership or housing',()=>{
 const s=ready();trainTroop(s,'breacher',1,now);trainTroop(s,'pulsewheel',2,now);const count=armyUsed(s),compute=s.compute,deadlines=[...s.training!],durations=[...s.trainingDurations!],ids=[...s.trainingIds!];
 const job=catalystJobs(s,now+1000)[0];const saved=deadlines[0]-(now+1000);assert.equal(completeCatalystJob(s,job.id,now+1000).completed,true);
 assert.equal(s.breachers,1);assert.equal(s.bots,0);assert.equal(s.compute,compute);assert.equal(armyUsed(s),count);assert.deepEqual(s.training,deadlines.slice(1).map(t=>t-saved));assert.deepEqual(s.trainingDurations,durations.slice(1));assert.deepEqual(s.trainingIds,ids.slice(1));
 assert.equal(completeCatalystJob(s,job.id,now+1000).completed,false);assert.equal(s.bots,0);
 advanceFoundation(s,s.training![0]);assert.equal(s.bots,1);assert.equal(s.training!.length,1);
});
test('expired training quote cannot finish next unit, including after offline queue drain',()=>{
 const s=ready();s.training=[now+1000,now+11000];s.trainingKinds=['pulsewheel','breacher'];s.trainingDurations=[1000,10000];const old=catalystJobs(s,now)[0];
 assert.deepEqual(completeCatalystJob(s,old.id,now+1000),{completed:false,cost:0});assert.equal(s.bots,1);assert.equal(s.breachers,undefined);assert.deepEqual(s.training,[now+11000]);
 const next=catalystJobs(s,now+1000)[0];assert.notEqual(next.id,old.id);assert.equal(completeCatalystJob(s,next.id,now+2000).completed,true);assert.equal(s.breachers,1);
});
test('stored training identity survives deadline shifts and new queues cannot reuse completed IDs',()=>{
 const s=ready();trainTroop(s,'pulsewheel',2,now);const first=catalystJobs(s,now)[0];const secondId=s.trainingIds![1];completeCatalystJob(s,first.id,now+1);assert.equal(s.trainingIds![0],secondId);const second=catalystJobs(s,now+1)[0];completeCatalystJob(s,second.id,now+2);
 trainTroop(s,'pulsewheel',1,now+2);const third=catalystJobs(s,now+2)[0];assert.notEqual(third.id,first.id);assert.notEqual(third.id,second.id);assert.equal(completeCatalystJob(s,first.id,now+2).completed,false);
 const clone=JSON.parse(JSON.stringify(s));assert.equal(catalystJobs(clone,now+2)[0].id,third.id);clone.generation++;assert.notEqual(catalystJobs(clone,now+2)[0].id,third.id);
});
test('naturally finished upgrades and invalid identities cost nothing',()=>{
 const s=ready();s.buildingUpgrades={hangar:{id:'one',startedAt:0,completesAt:now+1,targetLevel:2}};const old=catalystJobs(s,now)[0];assert.equal(completeCatalystJob(s,old.id,now+1).cost,0);assert.equal(s.buildingLevels!.hangar,2);
 s.buildingUpgrades.hangar={id:'two',startedAt:now+1,completesAt:now+10000,targetLevel:3};assert.equal(completeCatalystJob(s,old.id,now+2).completed,false);assert.equal(s.buildingUpgrades.hangar.targetLevel,3);assert.equal(completeCatalystJob(s,'forged',now+2).cost,0);
});

