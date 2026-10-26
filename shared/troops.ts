import {COMBAT_BALANCE_V3 as BALANCE} from './combat-balance';
/** Stable troop IDs; missing IDs in older saves always mean Pulsewheel. */
export type TroopKind='pulsewheel'|'breacher';
export const HANGAR_HOUSING=20;
export const TROOPS={
 pulsewheel:{name:'Pulsewheel',housing:1,cost:5,trainSeconds:10,health:BALANCE.botHealth,speed:BALANCE.botSpeed,damage:BALANCE.botDamage,intervalMs:BALANCE.botIntervalMs,range:BALANCE.botRange,unlockHq:1,description:'Fast digital attacker · structures and drones'},
 breacher:{name:'Breacher',housing:5,cost:40,trainSeconds:30,health:BALANCE.breacher.health,speed:BALANCE.breacher.speed,damage:BALANCE.breacher.damage,intervalMs:BALANCE.breacher.intervalMs,range:BALANCE.breacher.range,unlockHq:2,description:'Heavy melee assault · prefers defenses · cannot hit aircraft'}
} as const;
export const troopKind=(kind?:TroopKind):TroopKind=>kind==='breacher'?'breacher':'pulsewheel';
export const troopHousing=(kind?:TroopKind)=>TROOPS[troopKind(kind)].housing;
