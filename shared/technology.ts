import {buildingLevel} from './building-levels';
import {troopLevel,troopStats,TROOPS,type TroopKind,type TroopLevel} from './troops';
import type {FoundationState} from './foundation';
export const TECHNOLOGY_IDS=['gpuOptimization','cipherEngineering','trainingEfficiency'] as const;
export type TechnologyId=typeof TECHNOLOGY_IDS[number];
export type Technologies=Partial<Record<TechnologyId,number>>;
export const TECHNOLOGY_DURATIONS_MS=[5*60*1000,10*60*1000,15*60*1000] as const;
export type TechnologyUpgrade={technology:TechnologyId;level:number;startedAt:number;completesAt:number};
export const TECHNOLOGY_COSTS=[50,125,250] as const;
export const TECHNOLOGIES={
 gpuOptimization:{name:'GPU Optimization',description:'More Compute from every GPU Rig.',effect:'Compute production',icon:'gpu'},
 cipherEngineering:{name:'Pulsewheel Engineering',description:'Stronger Pulsewheel attacks on rival defenses.',effect:'attack damage',icon:'cipher'},
 trainingEfficiency:{name:'Bot Training Efficiency',description:'Train your next troops sooner.',effect:'shorter training',icon:'training'}
} as const;
/** Missing legacy fields mean level zero; legitimate saved levels are preserved. */
export function technologyLevel(s:Pick<FoundationState,'technologies'>,id:TechnologyId){const n=s.technologies?.[id];return Number.isInteger(n)&&n!>=0&&n!<=3?n!:0;}
export const productionPerMinute=(s:Pick<FoundationState,'technologies'>)=>10;
export const trainingMilliseconds=(s:Pick<FoundationState,'technologies'>)=>10000;
export const cipherDamageMultiplier=(s:Pick<FoundationState,'technologies'>)=>1;
/** Caller advances accrual at the old rate, then holds the save/action transaction. */
export function purchaseTechnology(_s:FoundationState,_id:TechnologyId,_expectedLevel:number,_now:number){throw Error('Legacy technologies are retired. Upgrade troops in the Research Lab.');}

/** Server time completes a saved job once. Existing purchased levels remain intact. */
export type TroopResearchJob={troop:TroopKind;level:TroopLevel;startedAt:number;completesAt:number};
export type ResearchMigrationAudit={version:1;at:number;retired:Technologies;knownResearchSpent:number;retiredJob?:TechnologyUpgrade;mappedPulsewheel:TroopLevel;notes:string[]};
export const TROOP_RESEARCH={
 pulsewheel:{2:{cost:100,durationMs:300000,requiredLab:2},3:{cost:300,durationMs:600000,requiredLab:3}},
 breacher:{2:{cost:150,durationMs:300000,requiredLab:2},3:{cost:400,durationMs:600000,requiredLab:3}},
 disruptor:{2:{cost:200,durationMs:300000,requiredLab:2},3:{cost:450,durationMs:600000,requiredLab:3}}
} as const;
/** Idempotent per-account retirement; raw original research is retained in the audit. */
export function reconcileTroopResearch(s:FoundationState,now:number){
 if(s.researchMigration?.version===1){delete s.technologies;delete s.technologyUpgrade;return;}
 const retired={...s.technologies},job=s.technologyUpgrade?{...s.technologyUpgrade}:undefined;
 if(Object.keys(retired).some(id=>!TECHNOLOGY_IDS.includes(id as TechnologyId))||Object.values(retired).some(v=>!Number.isInteger(v)||v!<0||v!>3))throw Error('Legacy research requires manual reconciliation before migration.');
 if(job&&(!TECHNOLOGY_IDS.includes(job.technology)||!Number.isInteger(job.level)||job.level<1||job.level>3||!Number.isFinite(job.startedAt)||!Number.isFinite(job.completesAt)||job.completesAt<job.startedAt))throw Error('Legacy research job requires manual reconciliation before migration.');
 const old=technologyLevel(s,'cipherEngineering'),mapped:TroopLevel=old>=2?3:old===1?2:1;
 s.troopLevels={...s.troopLevels,pulsewheel:Math.max(troopLevel(s,'pulsewheel'),mapped) as TroopLevel};
 let knownResearchSpent=TECHNOLOGY_IDS.reduce((sum,id)=>sum+TECHNOLOGY_COSTS.slice(0,technologyLevel(s,id)).reduce((x,y)=>x+y,0),0);
 const notes:string[]=[];
 if(job){if(Number.isInteger(job.level)&&job.level>=1&&job.level<=3)knownResearchSpent+=TECHNOLOGY_COSTS[job.level-1];else notes.push('Unrecognized legacy job tier retained for manual audit; no refund invented.');
  if(job.technology==='cipherEngineering'&&job.level>=1&&job.level<=3){const next=(job.level>=2?3:2) as TroopLevel;if(next>troopLevel(s,'pulsewheel')&&!s.troopResearch)s.troopResearch={troop:'pulsewheel',level:next,startedAt:job.startedAt,completesAt:job.completesAt};else notes.push('Paid Pulsewheel job subsumed by equivalent or stronger owned troop tier.');}
 }
 s.researchMigration={version:1,at:now,retired,knownResearchSpent,...(job?{retiredJob:job}:{}),mappedPulsewheel:mapped,notes};
 delete s.technologies;delete s.technologyUpgrade;
}
export function purchaseTroopResearch(s:FoundationState,kind:TroopKind,expectedLevel:number,now:number){
 reconcileTroopResearch(s,now);advanceTechnology(s,now);
 if(!s.lab||now<s.lab.completesAt)throw Error('Finish your Research Lab first.');
 if(s.troopResearch)throw Error('Your Research Lab is already researching a troop.');
 const current=troopLevel(s,kind);if(current===3)throw Error('This troop is already at MAX LEVEL.');
 if(expectedLevel!==current)throw Error('Troop level changed. Review the upgrade and try again.');
 const next=(current+1) as 2|3,cfg=TROOP_RESEARCH[kind][next];
 if(buildingLevel(s,'lab')<cfg.requiredLab)throw Error(`Upgrade Research Lab to Level ${cfg.requiredLab}.`);
 if((s.founderHqLevel??1)<TROOPS[kind].unlockHq)throw Error(`Unlock ${TROOPS[kind].name} first.`);
 if((s.research??0)<cfg.cost)throw Error(`You need ${cfg.cost} Research.`);
 s.research=(s.research??0)-cfg.cost;s.troopResearch={troop:kind,level:next,startedAt:now,completesAt:now+cfg.durationMs};
}
export function advanceTechnology(s:FoundationState,now:number){
 const job=s.troopResearch;if(!job||now<job.completesAt)return;
 s.troopLevels={...s.troopLevels,[job.troop]:Math.max(troopLevel(s,job.troop),job.level)};
 s.completedTroopResearch={troop:job.troop,level:job.level,completedAt:job.completesAt};delete s.troopResearch;
}
