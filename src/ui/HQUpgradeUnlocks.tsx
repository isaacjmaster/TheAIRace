import {buildingStats} from '../../shared/building-levels';
import {wallCapacity} from '../../shared/founder-hq';
import {BuildingImage} from './BuildingImage';
type Unlock={id:Parameters<typeof BuildingImage>[0]['id'];name:string;benefit:string;level?:number};
/** Construction permissions and purchasable upgrades are deliberately distinct from immediate grants. */
export function hqUpgradeUnlocks(level:number):Unlock[]{
 const stats=(kind:string)=>buildingStats(kind,level);
 if(level===2)return [{id:'rig',name:'Second GPU Rig',benefit:'One additional construction slot'},{id:'builder',name:'Second Builder Bot',benefit:'Existing HQ builder entitlement'},{id:'securityDrone',name:'Second Security Drone',benefit:'Station allows two defenders'},{id:'sentinel',name:'Sentinel Tower',benefit:'Construction unlocked'},{id:'hq',name:'Level 2 buildings',benefit:'Upgrade existing facilities',level:2}];
 const tiers:Unlock[]=[
  {id:'rig',name:'GPU Rig',benefit:`${stats('rig').productionPerMinute} Compute/min`,level},
  {id:'lab',name:'Research Lab',benefit:`${stats('lab').productionPerMinute} Research/min`,level},
  {id:'computeStorage',name:'Compute Storage',benefit:`+${stats('computeStorage').capacity.toLocaleString()} global capacity`,level},
  {id:'researchStorage',name:'Research Storage',benefit:`+${stats('researchStorage').capacity.toLocaleString()} global capacity`,level},
  {id:'fabricator',name:'Bot Fabricator',benefit:`${Math.round((1-stats('fabricator').trainingMultiplier)*100)}% shorter base training`,level},
  {id:'hangar',name:'Bot Hangar',benefit:`${stats('hangar').housing} housing spaces`,level},
  {id:'sentinel',name:'Sentinel Tower',benefit:`${stats('sentinel').sentinelDamage}–${stats('sentinel').maxDamage} damage`,level},
  {id:'droneStation',name:'Drone Station',benefit:`${stats('droneStation').droneHealth} HP / ${stats('droneStation').droneDamage} drone damage`,level},
  {id:'arcSpire',name:'Arc Spire',benefit:`${stats('arcSpire').arcDamage} primary damage · 3 targets`,level},
  {id:'wall',name:'Security Walls',benefit:`${stats('wall').maxHealth} HP · ${wallCapacity({founderHqLevel:level})} placement limit`,level}
 ];
 return level===3?[{id:'disruptor',name:'Disruptor',benefit:'Training unlocked · 3 housing'},...tiers]:tiers;
}
export function HQUpgradeUnlocks({level}:{level:number}){return <section className="hq-upgrade-unlocks" aria-label={`HQ Level ${level} unlocks`}><h3>Available at HQ {level}</h3><p>Building upgrades and construction are purchased separately. Existing troops and buildings are kept.</p><div>{hqUpgradeUnlocks(level).map(item=><article key={item.id}><BuildingImage id={item.id} name={item.name} level={item.level??1}/><span><strong>{item.name}{item.level?` · Lv. ${item.level}`:''}</strong><small>{item.benefit}</small></span></article>)}</div>{level>=4&&<small>GPU Rig slots, builder entitlements and drone count stay unchanged. Wall allowance increases by {wallCapacity({founderHqLevel:level})-wallCapacity({founderHqLevel:level-1})}; no walls are granted.</small>}</section>;}
