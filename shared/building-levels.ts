import {ARC_SPIRE} from './electronic-catalog';
import type {FoundationState} from './foundation';
export type BuildingLevel=1|2|3|4|5;
export type BuildingKind='hq'|'rig'|'lab'|'fabricator'|'hangar'|'sentinel'|'droneStation'|'wall'|'computeStorage'|'researchStorage'|'station'|'arcSpire';
export type BuildingUpgrade={id:string;targetLevel:2|3|4|5;startedAt:number;completesAt:number};
export const STORAGE_CATALOG={computeStorage:{name:'Compute Storage',cost:250,buildSeconds:60},researchStorage:{name:'Research Storage',cost:150,buildSeconds:60}} as const;
export function buildingKind(id:string):BuildingKind{return id.startsWith('wall:')?'wall':id==='rig2'?'rig':id as BuildingKind;}
export function buildingLevel(s:Pick<FoundationState,'buildingLevels'|'founderHqLevel'>,id:string):BuildingLevel{const value=id==='hq'?s.founderHqLevel:s.buildingLevels?.[id];return value===5?5:value===4?4:value===3?3:value===2?2:1;}
/** Completed-tier statistics. Existing Levels 1–3 retain their original values. */
export function buildingStats(kind:BuildingKind|string,level:number){const i=Math.max(0,Math.min(4,Math.floor(level)-1));return {
 maxHealth:(kind==='arcSpire'?[ARC_SPIRE.health,420,510,900,1250]:kind==='hq'?[216,280,350,440,550]:kind==='sentinel'?[420,600,800,1300,1800]:kind==='wall'?[180,270,390,510,650]:[108,140,180,225,280])[i],
 productionMultiplier:[1,1.4,1.8,2.4,3.2][i],productionPerMinute:(kind==='lab'?[2,2.8,3.6,4.8,6.4]:[10,14,18,24,32])[i],buffer:(kind==='lab'?[50,75,100,150,220]:[100,150,200,300,450])[i],
 housing:[20,25,30,40,50][i],trainingMultiplier:[1,.85,.7,.6,.5][i],capacity:(kind==='researchStorage'?[500,1250,2500,4000,6000]:[1000,2500,5000,8000,12000])[i],
 sentinelDamage:[18,24,30,45,65][i],maxDamage:[30,40,50,70,90][i],droneHealth:[240,300,360,480,600][i],droneDamage:[24,30,36,48,60][i],arcDamage:[ARC_SPIRE.damage,14,17,45,60][i]
};}
export const MAX_BUILDING_LEVEL=5;
export const MIN_TRAINING_MS=2000;
export function requiredHqLevel(kind:BuildingKind,level:number){return kind==='hq'?Math.max(1,level-1):kind==='arcSpire'?Math.max(3,level):kind==='sentinel'?Math.max(2,level):level;}
export const housingCapacity=(s:Pick<FoundationState,'buildingLevels'|'founderHqLevel'>)=>buildingStats('hangar',buildingLevel(s,'hangar')).housing;
export const UPGRADE_COSTS:Record<BuildingKind,readonly [number,number,number,number]>={hq:[500,1500,4500,7500],rig:[200,650,1800,3500],lab:[200,600,1600,3200],fabricator:[250,700,1900,3800],hangar:[300,800,2200,4400],sentinel:[400,1000,2400,4800],droneStation:[300,800,2100,4200],arcSpire:[500,1000,2400,4800],wall:[20,45,75,110],computeStorage:[400,900,2000,4000],researchStorage:[300,750,1700,3400],station:[0,0,0,0]};
export const UPGRADE_TIMES:Record<BuildingKind,readonly [number,number,number,number]>={hq:[300000,600000,900000,1200000],rig:[120000,300000,480000,720000],lab:[120000,300000,480000,720000],fabricator:[120000,300000,480000,720000],hangar:[120000,300000,480000,720000],sentinel:[180000,360000,600000,900000],droneStation:[180000,360000,600000,900000],arcSpire:[180000,360000,600000,900000],wall:[0,0,0,0],computeStorage:[120000,300000,480000,720000],researchStorage:[120000,300000,480000,720000],station:[0,0,0,0]};
/** Capacity entitlements only increase. Existing oversized balances are never clamped. */
export function reconcileStorage(s:FoundationState,now:number){if(!s.computeStorage&&!s.researchStorage)return;s.storageBaseline??={compute:Math.max(1000,s.capacity),research:Math.max(500,s.researchCapacity??500)};s.capacity=Math.max(s.capacity,s.storageBaseline.compute+(s.computeStorage&&now>=s.computeStorage.completesAt?buildingStats('computeStorage',buildingLevel(s,'computeStorage')).capacity:0));s.researchCapacity=Math.max(s.researchCapacity??500,s.storageBaseline.research+(s.researchStorage&&now>=s.researchStorage.completesAt?buildingStats('researchStorage',buildingLevel(s,'researchStorage')).capacity:0));}
