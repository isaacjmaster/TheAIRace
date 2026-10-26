/** Founder HQ building progression is independent of Company XP. */
export const FOUNDER_HQ={maxLevel:3,upgradeCost:500,upgradeMs:5*60*1000,rigCaps:{1:1,2:2,3:2}} as const;
export type FounderHQUpgrade={id:string;targetLevel:2|3;startedAt:number;completesAt:number};
export function founderHqLevel(state:{founderHqLevel?:number}):1|2|3{return state.founderHqLevel===3?3:state.founderHqLevel===2?2:1;}
export function gpuRigCapacity(state:{founderHqLevel?:number}){return FOUNDER_HQ.rigCaps[founderHqLevel(state)];}
export const founderBuilderCapacity=(s:{founderHqLevel?:number})=>founderHqLevel(s)>=2?2:1;
export const founderDroneCapacity=(s:{founderHqLevel?:number})=>founderHqLevel(s)>=2?2:1;
export function founderUnlocks(from:1|2|3,to:1|2|3){return [{id:'rig' as const,name:'GPU Rig',count:gpuRigCapacity({founderHqLevel:to})-(from===to?0:gpuRigCapacity({founderHqLevel:from}))},{id:'builder' as const,name:'Builder Bot',count:founderBuilderCapacity({founderHqLevel:to})-(from===to?0:founderBuilderCapacity({founderHqLevel:from}))},{id:'securityDrone' as const,name:'Security Drone',count:founderDroneCapacity({founderHqLevel:to})-(from===to?0:founderDroneCapacity({founderHqLevel:from}))},...(to===3?[{id:'elite' as const,name:'Level 3 building upgrades',count:1}]:[])].filter(u=>u.count>0);}
export const WALL_CAPACITY_BY_HQ:Readonly<Record<number,number>>={1:100,2:100,3:100};
export function wallCapacity(s:{founderHqLevel?:number}){return WALL_CAPACITY_BY_HQ[s.founderHqLevel??1]??0;}
