import {troopKind,troopHousing,TROOPS} from './troops';
import {cipherDamageMultiplier} from './technology';
import type {FoundationState} from './foundation';
import {newOperation,commandOperation,type InfiltrationCommand,type Operation} from './infiltration';
export const reservedAgent=(o:Operation|undefined)=>o?.squad?o.squad.agents.filter(a=>a.unitStatus==='reserved').length:o?.unit?.status==='reserved'&&o.unit.reservationId===o.id?1:0;
export const reservedHousing=(o:Operation|undefined)=>o?.squad?o.squad.agents.reduce((sum,a)=>sum+(a.unitStatus==='reserved'?troopHousing(a.troop):0),0):reservedAgent(o);
export function startOwnedOperation(s:FoundationState,id:string,target:string,now:number,factory=newOperation){
 if(s.botRaid&&!s.botRaid.settled)throw new Error('Finish your previous operation first.');
 if(s.infiltration&&['ready','active'].includes(s.infiltration.status))throw new Error('Resume your current infiltration.');
 if((s.bots??0)+(s.breachers??0)<1)throw new Error('No troops available. Train troops in your Bot Fabricator.');
 const o=factory(id,target,now);o.cipherDamageMultiplier=cipherDamageMultiplier(s);if(!o.squad){if(!(s.bots!>0))throw new Error('This legacy operation requires a Pulsewheel.');s.bots=(s.bots??0)-1;o.unit={kind:'scrap',reservationId:o.id,status:'reserved'};}if(o.squad){o.squad.undeployed=Math.max(0,s.bots??0);o.squad.undeployedBreacher=Math.max(0,s.breachers??0);}s.infiltration=o;
}
/** Pre-ownership live missions never reserved a unit. Close them without retroactively charging inventory or banking unsupported loot. */
export function ensureOwnedOperation(s:FoundationState,now:number){
 const o=s.infiltration;if(o?.squad){if(['ready','active'].includes(o.status)&&o.squad.undeployed===undefined)o.squad.undeployed=Math.max(0,s.bots??0);return;}if(!o||!['ready','active'].includes(o.status)||reservedAgent(o))return;
 o.status='abandoned';o.finishedAt=now;o.lastTick=now;o.agent.path=[];o.agent.mode='idle';o.carried={compute:0,research:0,intel:false};o.ownershipRequired=true;o.events.push({at:now,type:'agent-ownership-required'});
}
export function settleOwnedUnit(s:FoundationState){
 const o=s.infiltration;if(!o||!reservedAgent(o)||['ready','active'].includes(o.status))return;
 if(o.squad&&o.squad.agents.length){for(const agent of o.squad.agents){if(agent.unitStatus!=='reserved')continue;const returned=agent.state==='extracted'&&(agent.health??1)>0;if(returned){if(troopKind(agent.troop)==='breacher')s.breachers=(s.breachers??0)+1;else s.bots=(s.bots??0)+1;}agent.unitStatus=returned?'returned':'lost';}return;}
 const returned=o.status==='extracted'||o.status==='abandoned'&&o.startedAt===undefined;
 if(returned)s.bots=(s.bots??0)+1;
 o.unit!.status=returned?'returned':'lost';
}
export function requireReservedAgent(o:Operation){if(!reservedAgent(o))throw new Error('No reserved agent. Return to HQ and train a Pulsewheel.');}

/** One serialized inventory purchase per accepted placement; action receipts handle network retries. */
export function commandOwnedOperation(s:FoundationState,c:InfiltrationCommand,now:number){const o=s.infiltration!;if(!o.squad){if(c.action==='deploy'&&c.troop==='breacher')throw new Error('This legacy operation requires a Pulsewheel.');requireReservedAgent(o);commandOperation(o,c,now);settleOwnedUnit(s);return;}
 if(c.action==='deploy'){if(o.status!=='ready'&&o.status!=='active')throw Error('This operation has ended.');const kind=troopKind(c.troop);if(!((kind==='breacher'?s.breachers:s.bots)!>0))throw Error(`No ${TROOPS[kind].name}s available.`);}
 commandOperation(o,c,now);
 if(c.action==='deploy'){if(troopKind(c.troop)==='breacher')s.breachers=(s.breachers??0)-1;else s.bots=(s.bots??0)-1;}
 settleOwnedUnit(s);
}
