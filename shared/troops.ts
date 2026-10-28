import {DISRUPTOR} from './electronic-catalog';
import {COMBAT_BALANCE_V3 as BALANCE} from './combat-balance';
/** Stable troop IDs; missing IDs in older saves always mean Pulsewheel. */
export type TroopKind='pulsewheel'|'breacher'|'disruptor';
export const HANGAR_HOUSING=20;
export const TROOPS={
 pulsewheel:{name:'Pulsewheel',housing:1,cost:5,trainSeconds:10,health:BALANCE.botHealth,speed:BALANCE.botSpeed,damage:BALANCE.botDamage,intervalMs:BALANCE.botIntervalMs,range:BALANCE.botRange,unlockHq:1,description:'Fast digital attacker · structures and drones'},
 disruptor:DISRUPTOR,
 breacher:{name:'Breacher',housing:5,cost:40,trainSeconds:30,health:BALANCE.breacher.health,speed:BALANCE.breacher.speed,damage:BALANCE.breacher.damage,intervalMs:BALANCE.breacher.intervalMs,range:BALANCE.breacher.range,unlockHq:2,description:'Heavy melee assault · prefers defenses · cannot hit aircraft'}
} as const;
export const troopKind=(kind?:TroopKind):TroopKind=>kind==='disruptor'?'disruptor':kind==='breacher'?'breacher':'pulsewheel';
export const troopHousing=(kind?:TroopKind)=>TROOPS[troopKind(kind)].housing;


export type TroopLevel=1|2|3;
export type TroopLevels=Partial<Record<TroopKind,TroopLevel>>;
export type TroopCombatStats={health:number;damage:number;intervalMs:number;speed:number;range:number;wallMultiplier:number};
export const troopLevel=(state:{troopLevels?:TroopLevels},kind:TroopKind):TroopLevel=>state.troopLevels?.[kind]===3?3:state.troopLevels?.[kind]===2?2:1;
/** Stable v1 progression: training, housing, range and cadence do not change. */
export function troopStats(kind:TroopKind,level:TroopLevel=1){
 const base=TROOPS[kind],i=level-1;
 const health={pulsewheel:[60,72,84],breacher:[480,576,672],disruptor:[54,65,76]}[kind][i];
 const damage={pulsewheel:[9,11,13],breacher:[60,72,84],disruptor:[2.25,2.7,3.15]}[kind][i];
 return {...base,health,damage,wallMultiplier:kind==='breacher'?2:1,empDurationMs:[1500,1650,1800][i],empCooldownMs:6000,empImmunityMs:4500,engagementRange:10};
}
/** Capture once at battle creation. Saved operations/replays never read live research. */
export function captureTroopProgression(o:import('./infiltration').Operation,state:{troopLevels?:TroopLevels}){
 o.troopLevels={pulsewheel:troopLevel(state,'pulsewheel'),breacher:troopLevel(state,'breacher'),disruptor:troopLevel(state,'disruptor')};
 o.troopStats={pulsewheel:troopStats('pulsewheel',o.troopLevels.pulsewheel),breacher:troopStats('breacher',o.troopLevels.breacher),disruptor:troopStats('disruptor',o.troopLevels.disruptor)};
 o.cipherDamageMultiplier=1;
 if(o.squad?.abilityVersion===1)o.electronic={version:1,disruptor:{...troopStats('disruptor',o.troopLevels.disruptor)},statuses:{}};
}
