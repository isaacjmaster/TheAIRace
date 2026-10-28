import type {Operation} from './infiltration';
import type {FoundationState} from './foundation';
export type RaidLoot={version:1;eligible:boolean;compute:number;research:number;contributions:Record<string,{compute:number;research:number}>};
export const RAID_LOOT_FRACTION=.1;
const whole=(n:number)=>Math.max(0,Math.floor(Number.isFinite(n)?n:0));
/** Frozen at start. Storage receives three shares; each producer receives one. No account balance is exposed. */
export function initializeRaidLoot(o:Operation,balances:{compute:number;research:number},eligible:boolean):RaidLoot{
 const result:RaidLoot={version:1,eligible,compute:0,research:0,contributions:{}};
 for(const resource of ['compute','research'] as const){
  const assets=o.target.assets.filter(a=>resource==='compute'?a.model==='rig'||a.model==='rig2'||a.model==='computeStorage':a.model==='lab'||a.model==='researchStorage');
  const weight=(a:typeof assets[number])=>a.model==='computeStorage'||a.model==='researchStorage'?3:1,total=assets.reduce((n,a)=>n+weight(a),0),cap=eligible?whole(whole(balances[resource])*RAID_LOOT_FRACTION):0;
  let cumulative=0,awarded=0;
  for(const a of assets){cumulative+=weight(a);const next=Math.floor(cap*cumulative/total),amount=next-awarded;awarded=next;(result.contributions[a.id]??={compute:0,research:0})[resource]=amount;}
  result[resource]=awarded;
 }
 return result;
}
/** Derive progress from cumulative authoritative damage; never pay out individual hit callbacks. */
export function raidLootProgress(o:Operation){
 const loot=o.raidLoot,result={compute:0,research:0};if(!o.pvp||!loot?.eligible)return result;
 for(const a of o.target.assets){const value=loot.contributions[a.id];if(!value)continue;const fraction=o.hacked.includes(a.id)?1:Math.max(0,Math.min(1,(o.squad?.progress[a.id]??0)/(a.maxHealth??a.hackSeconds??Infinity)));
 for(const resource of ['compute','research'] as const)result[resource]+=Math.floor(value[resource]*fraction);}
 return result;
}
export function transferableRaidLoot(o:Operation,attacker:Pick<FoundationState,'compute'|'research'|'capacity'|'researchCapacity'>,defender:{compute:number;research:number}){
 const earned=raidLootProgress(o);return {compute:Math.min(earned.compute,whole(defender.compute*.1),whole(attacker.capacity-attacker.compute)),research:Math.min(earned.research,whole(defender.research*.1),whole((attacker.researchCapacity??500)-(attacker.research??0)))};
}
