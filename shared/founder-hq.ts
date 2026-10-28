/** Founder HQ building progression is independent of Company XP. */
export const FOUNDER_HQ={maxLevel:5,upgradeCost:500,upgradeMs:5*60*1000,rigCaps:{1:1,2:2,3:2,4:2,5:2}} as const;
export type FounderHQUpgrade={id:string;targetLevel:2|3|4|5;startedAt:number;completesAt:number};
export function founderHqLevel(state:{founderHqLevel?:number}):1|2|3|4|5{return state.founderHqLevel===5?5:state.founderHqLevel===4?4:state.founderHqLevel===3?3:state.founderHqLevel===2?2:1;}
export function gpuRigCapacity(state:{founderHqLevel?:number}){return FOUNDER_HQ.rigCaps[founderHqLevel(state)];}
export const founderBuilderCapacity=(s:{founderHqLevel?:number})=>founderHqLevel(s)>=2?2:1;
export const founderDroneCapacity=(s:{founderHqLevel?:number})=>founderHqLevel(s)>=2?2:1;
export function founderUnlocks(from:1|2|3|4|5,to:1|2|3|4|5){return [{id:'rig' as const,name:'GPU Rig',count:gpuRigCapacity({founderHqLevel:to})-(from===to?0:gpuRigCapacity({founderHqLevel:from}))},{id:'builder' as const,name:'Builder Bot',count:founderBuilderCapacity({founderHqLevel:to})-(from===to?0:founderBuilderCapacity({founderHqLevel:from}))},{id:'securityDrone' as const,name:'Security Drone',count:founderDroneCapacity({founderHqLevel:to})-(from===to?0:founderDroneCapacity({founderHqLevel:from}))},...(to>=3?[{id:'elite' as const,name:`Level ${to} building upgrades`,count:1}]:[]),...(to>=3?[{id:'wall' as const,name:'Additional wall allowance',count:wallCapacity({founderHqLevel:to})-wallCapacity({founderHqLevel:to-1})}]:[])].filter(u=>u.count>0);}
export const WALL_CAPACITY_BY_HQ:Readonly<Record<number,number>>={1:100,2:100,3:120,4:160,5:200};
export function wallCapacity(s:{founderHqLevel?:number;wallAllowance?:number}){const configured=WALL_CAPACITY_BY_HQ[s.founderHqLevel??1]??0;return Math.max(configured,Number.isSafeInteger(s.wallAllowance)&&s.wallAllowance!>0?s.wallAllowance!:0);}
