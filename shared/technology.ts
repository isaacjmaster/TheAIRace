import type {FoundationState} from './foundation';
export const TECHNOLOGY_IDS=['gpuOptimization','cipherEngineering','trainingEfficiency'] as const;
export type TechnologyId=typeof TECHNOLOGY_IDS[number];
export type Technologies=Partial<Record<TechnologyId,number>>;
export const TECHNOLOGY_DURATIONS_MS=[5*60*1000,10*60*1000,15*60*1000] as const;
export type TechnologyUpgrade={technology:TechnologyId;level:number;startedAt:number;completesAt:number};
export const TECHNOLOGY_COSTS=[50,125,250] as const;
export const TECHNOLOGIES={
 gpuOptimization:{name:'GPU Optimization',description:'More Compute from every GPU Rig.',effect:'Compute production',icon:'gpu'},
 cipherEngineering:{name:'Cipher Bot Engineering',description:'Stronger Cipher Bot attacks on rival defenses.',effect:'attack damage',icon:'cipher'},
 trainingEfficiency:{name:'Bot Training Efficiency',description:'Build your next Cipher Bots sooner.',effect:'shorter training',icon:'training'}
} as const;
/** Missing legacy fields mean level zero; legitimate saved levels are preserved. */
export function technologyLevel(s:Pick<FoundationState,'technologies'>,id:TechnologyId){const n=s.technologies?.[id];return Number.isInteger(n)&&n!>=0&&n!<=3?n!:0;}
export const productionPerMinute=(s:Pick<FoundationState,'technologies'>)=>10*(1+technologyLevel(s,'gpuOptimization')/10);
export const trainingMilliseconds=(s:Pick<FoundationState,'technologies'>)=>Math.round(10000*(1-technologyLevel(s,'trainingEfficiency')/10));
export const cipherDamageMultiplier=(s:Pick<FoundationState,'technologies'>)=>1+technologyLevel(s,'cipherEngineering')/10;
/** Caller advances accrual at the old rate, then holds the save/action transaction. */
export function purchaseTechnology(s:FoundationState,id:TechnologyId,expectedLevel:number,now:number){
 if(!s.lab||now<s.lab.completesAt)throw Error('Finish your Research Lab first.');
 if(s.technologyUpgrade)throw Error('Your Research Lab is already researching an upgrade.');
 const level=technologyLevel(s,id);if(level>=3)throw Error('This technology is already at MAX LEVEL.');
 if(expectedLevel!==level)throw Error('Technology level changed. Review the next upgrade and try again.');
 const cost=TECHNOLOGY_COSTS[level];if((s.research??0)<cost)throw Error(`You need ${cost} Research.`);
 s.research=(s.research??0)-cost;s.technologyUpgrade={technology:id,level:level+1,startedAt:now,completesAt:now+TECHNOLOGY_DURATIONS_MS[level]};
}

/** Server time completes a saved job once. Existing purchased levels remain intact. */
export function advanceTechnology(s:FoundationState,now:number){
 const job=s.technologyUpgrade;if(!job||now<job.completesAt)return;
 s.technologies={...s.technologies,[job.technology]:Math.max(technologyLevel(s,job.technology),job.level)};
 delete s.technologyUpgrade;
}
