import {advanceFoundation,type FoundationState} from './foundation';
import {troopKind,TROOPS} from './troops';
import {catalystCost} from './catalyst-config';
export {catalystCost} from './catalyst-config';
export type CatalystJobKind='construction'|'upgrade'|'research'|'training';
export type CatalystJob={id:string;kind:CatalystJobKind;target:string;label:string;startedAt:number;completesAt:number;cost:number};
const constructionKinds=['rig','rig2','fabricator','hangar','lab','droneStation','sentinel','arcSpire','computeStorage','researchStorage'] as const;
const names:Record<string,string>={hq:'Founder HQ',rig:'GPU Rig',rig2:'GPU Rig',fabricator:'Bot Fabricator',hangar:'Bot Hangar',lab:'Research Lab',droneStation:'Security Drone Station',sentinel:'Sentinel Tower',arcSpire:'Arc Spire',computeStorage:'Compute Storage',researchStorage:'Research Storage'};
const identity=(s:FoundationState,parts:(string|number)[])=>JSON.stringify([s.generation??0,...parts]);
/** Read-only UI/server quote. The server advances and saves ordinary state before quoting. */
export function catalystJobs(s:FoundationState,now:number):CatalystJob[]{
 if(!Number.isFinite(now))throw Error('Invalid server time.');
 const jobs:CatalystJob[]=[];
 const add=(kind:CatalystJobKind,target:string,label:string,timer:{startedAt:number;completesAt:number},key:string|number)=>{
  if(!Number.isFinite(timer.startedAt)||!Number.isFinite(timer.completesAt)||now>=timer.completesAt)return;
  jobs.push({id:identity(s,[kind,target,key,timer.startedAt]),kind,target,label,startedAt:timer.startedAt,completesAt:timer.completesAt,cost:catalystCost(timer.completesAt-now)});
 };
 for(const target of constructionKinds){const timer=s[target];if(timer)add('construction',target,`${names[target]} construction`,timer,timer.startedAt);}
 if(s.hqUpgrade)add('upgrade','hq',`Founder HQ Level ${s.hqUpgrade.targetLevel}`,s.hqUpgrade,s.hqUpgrade.id);
 for(const [target,timer] of Object.entries(s.buildingUpgrades??{}))add('upgrade',target,`${names[target]??'Security Wall'} Level ${timer.targetLevel}`,timer,timer.id);
 if(s.troopResearch){const timer=s.troopResearch;add('research',timer.troop,`${TROOPS[timer.troop].name} Level ${timer.level}`,timer,timer.level);}
 // Only the active front unit is accelerated. Later units retain ordering and duration.
 const index=s.training?.findIndex(time=>time>now)??-1;
 if(index>=0){const time=s.training![index],kind=troopKind(s.trainingKinds?.[index]),key=s.trainingIds?.[index]??`legacy:${s.generation??0}:${time}:${index}:${kind}`;
  const startedAt=time-(s.trainingDurations?.[index]??5000);
  // Identity must not incorporate startedAt: queue acceleration changes it.
  jobs.push({id:identity(s,['training',key]),kind:'training',target:kind,label:`1 ${TROOPS[kind].name} (current training unit)`,startedAt,completesAt:time,cost:catalystCost(time-now)});
 }
 return jobs;
}
/** Caller validates the fresh quote/balance, then atomically saves completion + wallet debit.
 * Ordinary advancement is the only code that grants units/levels, releases builders, or accrues production.
 * A stale/missing exact job is a free no-op; it never selects a different queued unit.
 */
export function completeCatalystJob(s:FoundationState,id:string,now:number):{completed:boolean;cost:number;job?:CatalystJob}{
 if(!Number.isFinite(now))throw Error('Invalid server time.');
 advanceFoundation(s,now);
 const job=catalystJobs(s,now).find(j=>j.id===id);if(!job)return {completed:false,cost:0};
 if(job.kind==='construction'){
  const timer=s[job.target as typeof constructionKinds[number]]!;timer.completesAt=now;
  if('lastProducedAt' in timer)timer.lastProducedAt=Math.min(timer.lastProducedAt,now);
 }else if(job.kind==='upgrade'){
  const timer=job.target==='hq'?s.hqUpgrade!:s.buildingUpgrades![job.target];timer.completesAt=now;
 }else if(job.kind==='research')s.troopResearch!.completesAt=now;
 else{
  const savedTime=s.training![0]-now;s.training=s.training!.map(time=>time-savedTime);
 }
 advanceFoundation(s,now);
 return {completed:true,cost:job.cost,job};
}
