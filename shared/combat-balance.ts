import {DISRUPTOR} from './electronic-catalog';
import type {Operation} from './infiltration';
import type {TroopKind} from './troops';

/** Frozen simulation values for saved version-2 (and older tactical) operations.
 * Do not derive these from the current training/UI catalog. */
export const LEGACY_BREACHER_BALANCE=Object.freeze({health:320,damage:60,intervalMs:1800,speed:1.5,range:1.3,wallMultiplier:1});
export const LEGACY_WALL_BALANCE=Object.freeze({health:72,breachDps:18});
const LEGACY_PULSEWHEEL_BALANCE=Object.freeze({health:60,damage:9,intervalMs:1000,speed:2.8,range:4.6,wallMultiplier:1});

const CURRENT_SENTINEL={health:420,range:12,damage:18,lockStep:2,maxDamage:30,intervalMs:1250,warmupMs:450} as const;

/** Current combat rules. Only newly created operations opt into version 3.
 * Housing, cost, unlocks and training stay in troops.ts and are not combat tuning. */
export const COMBAT_BALANCE_V3={
 botHealth:60,botDamage:9,botRange:4.6,botAcquire:6.4,botIntervalMs:1000,botSpeed:2.8,
 targetLockMs:900,retargetRatio:.7,
 droneHealth:240,droneDamage:24,droneRange:5.8,droneDetection:10.2,droneIntervalMs:1000,droneWarmupMs:400,
 hackSeconds:{gpu:12,lab:16,core:22},hackContributions:[1,.65,.4,.25,.15],maxHackers:5,
 breacher:{health:480,damage:60,intervalMs:1800,speed:1.5,range:1.3,wallMultiplier:2},
 wall:{health:180,breachDps:9},
 sentinel:CURRENT_SENTINEL,
 missionSentinel:{intervalMs:2000,warmupMs:900},
 missionDroneCounts:[1,2,2,3,3],
 // Independent target durability: changing an attack's damage must not alter building HP.
 buildingHealth:{hq:216,ordinary:108,sentinel:CURRENT_SENTINEL.health}
} as const;
const CURRENT_PULSEWHEEL_BALANCE={health:COMBAT_BALANCE_V3.botHealth,damage:COMBAT_BALANCE_V3.botDamage,intervalMs:COMBAT_BALANCE_V3.botIntervalMs,speed:COMBAT_BALANCE_V3.botSpeed,range:COMBAT_BALANCE_V3.botRange,wallMultiplier:1};
type CombatOperation=Pick<Operation,'squad'|'electronic'>;
export const isCurrentCombat=(o:CombatOperation)=>o.squad?.balanceVersion===3||o.squad?.balanceVersion===4;
export const breacherBalance=(o:CombatOperation)=>isCurrentCombat(o)?COMBAT_BALANCE_V3.breacher:LEGACY_BREACHER_BALANCE;
export const wallBalance=(o:CombatOperation)=>isCurrentCombat(o)?COMBAT_BALANCE_V3.wall:LEGACY_WALL_BALANCE;
/** Troop simulation values, including frozen historical Pulsewheel values. */
export function troopCombat(o:CombatOperation,kind?:TroopKind){
 if(kind==='disruptor')return o.electronic?.disruptor??DISRUPTOR;
 if(kind==='breacher')return breacherBalance(o);
 return isCurrentCombat(o)?CURRENT_PULSEWHEEL_BALANCE:LEGACY_PULSEWHEEL_BALANCE;
}

/** Only v4 consumes level-aware, server-captured wall durability. */
export const wallHealth=(o:Pick<Operation,'squad'|'target'>,id:string)=>o.squad?.balanceVersion===4?(o.target.walls?.find(w=>w.id===id)?.maxHealth??wallBalance(o).health):wallBalance(o).health;
