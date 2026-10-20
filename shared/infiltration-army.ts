import type {FoundationState} from './foundation';
import {newOperation,commandOperation,type InfiltrationCommand,type Operation} from './infiltration';
export const reservedAgent=(o:Operation|undefined)=>o?.squad?o.squad.agents.filter(a=>a.unitStatus==='reserved').length:o?.unit?.status==='reserved'&&o.unit.reservationId===o.id?1:0;
export function startOwnedOperation(s:FoundationState,id:string,target:string,now:number,factory=newOperation){
 if(s.botRaid&&!s.botRaid.settled)throw new Error('Finish your previous operation first.');
 if(s.infiltration&&['ready','active'].includes(s.infiltration.status))throw new Error('Resume your current infiltration.');
 if((s.bots??0)<1)throw new Error('No agents available. Train a Cipher Bot in your Bot Fabricator.');
 const o=factory(id,target,now);if(!o.squad){s.bots=(s.bots??0)-1;o.unit={kind:'scrap',reservationId:o.id,status:'reserved'};}s.infiltration=o;
}
/** Pre-ownership live missions never reserved a unit. Close them without retroactively charging inventory or banking unsupported loot. */
export function ensureOwnedOperation(s:FoundationState,now:number){
 const o=s.infiltration;if(!o||o.squad||!['ready','active'].includes(o.status)||reservedAgent(o))return;
 o.status='abandoned';o.finishedAt=now;o.lastTick=now;o.agent.path=[];o.agent.mode='idle';o.carried={compute:0,research:0,intel:false};o.ownershipRequired=true;o.events.push({at:now,type:'agent-ownership-required'});
}
export function settleOwnedUnit(s:FoundationState){
 const o=s.infiltration;if(!o||!reservedAgent(o)||['ready','active'].includes(o.status))return;
 if(o.squad&&o.squad.agents.length){for(const agent of o.squad.agents){if(agent.unitStatus!=='reserved')continue;const returned=agent.state==='extracted';if(returned)s.bots=(s.bots??0)+1;agent.unitStatus=returned?'returned':'lost';}return;}
 const returned=o.status==='extracted'||o.status==='abandoned'&&o.startedAt===undefined;
 if(returned)s.bots=(s.bots??0)+1;
 o.unit!.status=returned?'returned':'lost';
}
export function requireReservedAgent(o:Operation){if(!reservedAgent(o))throw new Error('No reserved agent. Return to HQ and train a Cipher Bot.');}

/** One serialized inventory purchase per accepted placement; action receipts handle network retries. */
export function commandOwnedOperation(s:FoundationState,c:InfiltrationCommand,now:number){const o=s.infiltration!;if(!o.squad){requireReservedAgent(o);commandOperation(o,c,now);settleOwnedUnit(s);return;}
 if(c.action==='deploy'){if(o.status!=='ready'&&o.status!=='active')throw Error('This operation has ended.');if(!(s.bots!>0))throw Error('No Cipher Bots available.');}
 commandOperation(o,c,now);
 if(c.action==='deploy')s.bots=(s.bots??0)-1;
 settleOwnedUnit(s);
}
