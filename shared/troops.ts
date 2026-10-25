/** Stable troop IDs; missing IDs in older saves always mean Pulsewheel. */
export type TroopKind='pulsewheel'|'breacher';
export const HANGAR_HOUSING=20;
export const TROOPS={
 pulsewheel:{name:'Pulsewheel',housing:1,cost:5,trainSeconds:10,health:60,speed:2.8,damage:9,intervalMs:1000,range:4.6,unlockHq:1,description:'Fast digital attacker · structures and drones'},
 breacher:{name:'Breacher',housing:5,cost:40,trainSeconds:30,health:320,speed:1.5,damage:60,intervalMs:1800,range:1.3,unlockHq:2,description:'Heavy melee assault · prefers defenses · cannot hit aircraft'}
} as const;
export const troopKind=(kind?:TroopKind):TroopKind=>kind==='breacher'?'breacher':'pulsewheel';
export const troopHousing=(kind?:TroopKind)=>TROOPS[troopKind(kind)].housing;
