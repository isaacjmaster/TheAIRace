import type {FoundationState} from './foundation';
import {clearingJobs} from './landscape';
export const BUILDER_KINDS=['hq','rig','rig2','fabricator','hangar','lab','droneStation','sentinel','arcSpire','computeStorage','researchStorage'] as const;
type Job={builderIndex?:number;completesAt:number};
/** Stable slots are persisted on work records; return travel never owns a slot. */
export function builderAssignments(s:FoundationState,now:number){
 const jobs:{kind:typeof BUILDER_KINDS[number]|'clearing';job:Job;builderIndex?:number}[]=[];
 for(const kind of BUILDER_KINDS){const job=(s.buildingUpgrades?.[kind]??(kind==='hq'?s.hqUpgrade:s[kind])) as Job|undefined;if(job&&now<job.completesAt)jobs.push({kind,job,builderIndex:job.builderIndex});}
 for(const job of clearingJobs(s))if(now<job.clearedAt)jobs.push({kind:'clearing',job,builderIndex:job.builderIndex});
 const used=new Set<number>();for(const entry of jobs){const i=entry.builderIndex;if(i!==undefined&&Number.isInteger(i)&&i>=0&&i<s.builders&&!used.has(i))used.add(i);else entry.builderIndex=undefined;}
 for(const entry of jobs)if(entry.builderIndex===undefined){const i=Array.from({length:s.builders},(_,i)=>i).find(i=>!used.has(i));if(i!==undefined){entry.builderIndex=i;used.add(i);}}
 return jobs;
}
export function reconcileBuilderAssignments(s:FoundationState,now:number){for(const entry of builderAssignments(s,now))if(entry.builderIndex!==undefined)entry.job.builderIndex=entry.builderIndex;}
