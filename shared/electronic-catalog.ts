/** Initial electronic-warfare tier. Keep unlocks and tuning explicit, not runtime ratios. */
export const ELECTRONIC_UNLOCK_HQ=3;
export const DISRUPTOR={name:'Disruptor',housing:3,cost:15,trainSeconds:30,health:54,damage:2.25,intervalMs:1000,speed:2.38,range:4.6,wallMultiplier:1,unlockHq:ELECTRONIC_UNLOCK_HQ,description:'Fragile support · temporarily suppresses defensive weapons',empDurationMs:1500,empCooldownMs:6000,empImmunityMs:4500,engagementRange:10} as const;
export const ARC_SPIRE={name:'Arc Spire',health:336,damage:11,chainMultipliers:[1,.8,.6] as readonly number[],intervalMs:1250,warmupMs:450,range:9.6,jumpDistance:2.5,cost:450,buildSeconds:120,width:4,depth:4,hqLevel:ELECTRONIC_UNLOCK_HQ,maxCount:1} as const;
export type DisruptorConfig={health:number;damage:number;intervalMs:number;speed:number;range:number;wallMultiplier:number;empDurationMs:number;empCooldownMs:number;empImmunityMs:number;engagementRange:number};
export type ArcSpireDefense={id:string;position:[number,number];damage:number;chainMultipliers:readonly number[];intervalMs:number;warmupMs:number;range:number;jumpDistance:number};
export type ArcSpireState={id:string;targetId?:string;acquiredAt?:number;lastShotAt?:number;resumeFireAt?:number;chain?:{id:string;position:[number,number];damage:number}[]};
export type ElectronicState={version:1;disruptor:DisruptorConfig;statuses:Record<string,{disabledUntil:number;immuneUntil:number}>};
