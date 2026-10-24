/** New attacks capture these settings; existing operation snapshots remain unchanged. */
export const SENTINEL={cost:300,buildSeconds:90,maxCount:1,width:4,depth:4,hqLevel:2,
 health:240,range:12,damage:18,lockStep:2,maxDamage:30,intervalMs:1250,warmupMs:450} as const;
export type SentinelDefense={id:string;position:[number,number];range:number;damage:number;lockStep:number;maxDamage:number;intervalMs:number;warmupMs:number};
export type SentinelState={id:string;targetId?:string;acquiredAt?:number;lastShotAt?:number;shotPosition?:[number,number];yaw:number;lockShots:number;shotDamage?:number};
