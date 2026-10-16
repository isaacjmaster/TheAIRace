import type { GameState } from './contracts';
export type FacilityId = 'compute' | 'revenue' | 'training' | 'gpu' | 'research' | 'defense';
export type BuildingId = 'hq' | FacilityId;
export interface Construction { id: string; building: BuildingId; level: number; startedAt: number; completesAt: number }
export interface CampusState { version: 1; hq: number; buildings: Record<FacilityId, number>; construction: Construction | null; lastAccruedAt: number; highestRaid: number; raidWins: Record<string, number>; raidClaims?: Record<string, number>; raidHistoryImported?: boolean; creditsCarry?: number; computeCarry?: number; lastCompletion?: { id: string; building: BuildingId; level: number; at: number } }
export const FACILITIES: { id: FacilityId; name: string; unlock: number; description: string; position: [number,number] }[] = [
 { id:'compute',name:'Compute Farm',unlock:2,description:'Produces Compute while you are away.',position:[8,-5] },
 { id:'revenue',name:'Revenue Server',unlock:2,description:'Produces Credits while you are away.',position:[8,4] },
 { id:'training',name:'Agent Training Lab',unlock:2,description:'Improves every agent’s health and damage.',position:[-7,15] },
 { id:'gpu',name:'GPU Workstation',unlock:3,description:'Adds deployment capacity and production storage.',position:[17,-5] },
 { id:'research',name:'Research Center',unlock:4,description:'Unlocks specialized agents and improves damage.',position:[17,4] },
 { id:'defense',name:'Defense Laboratory',unlock:5,description:'Develops armor that protects attacking agents.',position:[5,15] },
];
export const HQ_LEVELS = ['Laptop startup','Connected garage','Compute workshop','Research studio','Armored network','Specialist division','Disruptor engineering','Quantum campus','Frontier laboratory','AI empire'].map((name,i)=>({level:i+1,name,benefit:[
 'Scout, Tank and Breaker; first rival network.','Production servers and agent training.','GPU capacity, expanded storage and Striker training.','Research technology and enhanced agent damage.','Defense armor and Medic technology.','Advanced Medic training and larger raids.','Disruptor technology and stronger training.','Elite agents and fortified rival campuses.','Advanced production and increased deployment capacity.','Maximum training, armor and production capacity.'
][i]}));
const bounded = (n: unknown,min:number,max:number,fallback=min) => typeof n==='number' && Number.isFinite(n) ? Math.min(max,Math.max(min,Math.floor(n))) : fallback;
export function ensureCampus(state: GameState,now=Date.now()): CampusState {
 if(!state.campus) state.campus={version:1,hq:bounded(state.hardwareLevel+1,1,10),buildings:{compute:0,revenue:0,training:bounded(state.agentLevel,0,10),gpu:0,research:0,defense:0},construction:null,lastAccruedAt:now,highestRaid:0,raidWins:{}};
 const c=state.campus;c.hq=bounded(c.hq,1,10);c.buildings ||= {} as Record<FacilityId,number>;
 for(const f of FACILITIES)c.buildings[f.id]=bounded(c.buildings[f.id],0,10);
 c.highestRaid=bounded(c.highestRaid,0,9);c.raidWins ||= {};c.raidClaims ||= {...c.raidWins};
 if(!Number.isFinite(c.lastAccruedAt))c.lastAccruedAt=now;
 c.creditsCarry=Math.max(0,Math.min(.999999,c.creditsCarry||0));c.computeCarry=Math.max(0,Math.min(.999999,c.computeCarry||0));
 return c;
}
export function buildingLevel(state:GameState,id:BuildingId) { const c=ensureCampus(state);return id==='hq'?c.hq:c.buildings[id]; }
export function campusEffects(state:GameState) {
 const c=ensureCampus(state);const b=c.buildings;
 return {healthMultiplier:1+b.training*.15+b.defense*.07,damageMultiplier:1+b.training*.15+b.research*.04,power:1+b.training*.15+b.research*.04+b.defense*.07,maxBase:[1,1,3,4,5,6,8,10].findLastIndex(required=>required<=c.hq),troopCapacity:Math.min(24,6+(c.hq-1)*3+b.gpu),creditsPerMinute:b.revenue*(12+b.gpu*2),computePerMinute:b.compute*(8+b.gpu),offlineHours:4,storageCredits:2000+c.hq*500+b.gpu*1000,storageCompute:1000+c.hq*250+b.gpu*500};
}
function produce(state:GameState,from:number,to:number) {
 if(to<=from)return;const c=state.campus!;const e=campusEffects(state);const minutes=(to-from)/60000;
 const credit=minutes*e.creditsPerMinute+(c.creditsCarry||0),compute=minutes*e.computePerMinute+(c.computeCarry||0);
 const earnedCredits=Math.min(Math.floor(credit),Math.max(0,e.storageCredits-state.credits));
 const earnedCompute=Math.min(Math.floor(compute),Math.max(0,e.storageCompute-(state.raidCompute||0)));
 state.credits+=earnedCredits;state.raidCompute=(state.raidCompute||0)+earnedCompute;
 c.creditsCarry=state.credits>=e.storageCredits?0:credit-Math.floor(credit);c.computeCarry=(state.raidCompute||0)>=e.storageCompute?0:compute-Math.floor(compute);
}
/** Only call with server time. A rollback never moves the accrual cursor backwards. */
export function advanceCampus(state:GameState,now=Date.now()) {
 const c=ensureCampus(state,now);if(now<=c.lastAccruedAt)return c;
 const from=Math.max(c.lastAccruedAt,now-campusEffects(state).offlineHours*3600000);
 const job=c.construction;
 if(job && job.completesAt<=now){
  produce(state,from,Math.max(from,job.completesAt));
  if(job.building==='hq')c.hq=Math.max(c.hq,job.level);else c.buildings[job.building]=Math.max(c.buildings[job.building],job.level);
  state.hardwareLevel=Math.max(state.hardwareLevel,Math.min(2,c.hq-1));state.agentLevel=Math.max(state.agentLevel||0,c.buildings.training);
  c.lastCompletion={id:job.id,building:job.building,level:job.level,at:job.completesAt};c.construction=null;
  produce(state,Math.max(from,job.completesAt),now);
 }else produce(state,from,now);
 c.lastAccruedAt=now;return c;
}
export interface UpgradeQuote { building:BuildingId; name:string; level:number; nextLevel:number; cost:{credits:number;compute:number}; durationSeconds:number; benefit:string; prerequisite:string; reason:string|null }
export function quoteUpgrade(state:GameState,id:BuildingId): UpgradeQuote {
 const c=ensureCampus(state);const def=FACILITIES.find(f=>f.id===id);if(id!=='hq'&&!def)throw new Error('Unknown building.');
 const level=buildingLevel(state,id),nextLevel=level+1;
 const cost=id==='hq'?{credits:nextLevel===2?90:nextLevel===3?220:Math.round(70*nextLevel**1.75),compute:nextLevel<3?0:Math.round(24*nextLevel**1.65)}:{credits:Math.round((id==='research'?100:50)*nextLevel**1.55),compute:Math.round((id==='training'?35:20)*nextLevel**1.5)};
 const prerequisite=id==='hq'?(nextLevel>=4?`Training Lab level ${Math.max(1,nextLevel-3)}`:'Complete the current HQ upgrade'):`HQ level ${Math.max(def!.unlock,nextLevel)}`;
 const benefit=id==='hq'?HQ_LEVELS[Math.min(9,nextLevel-1)].benefit:({compute:`Produces ${nextLevel*(8+c.buildings.gpu)} Compute/min.`,revenue:`Produces ${nextLevel*(12+c.buildings.gpu*2)} Credits/min.`,training:`All agents gain +${nextLevel*15}% base health and damage.`,gpu:`+${nextLevel} deployment slots; larger storage and faster production.`,research:`Advanced agent technology; +${nextLevel*4}% agent damage.`,defense:`All agents gain +${nextLevel*7}% base health from armor.`})[id];
 let reason:string|null=null;
 if(level>=10)reason='Maximum level reached.';
 else if(c.construction)reason='Finish the current construction first.';
 else if(id==='hq'&&state.activeJob)reason='Collect previous work before upgrading HQ.';
 else if(id!=='hq'&&c.hq<Math.max(def!.unlock,nextLevel))reason=`Requires ${prerequisite}.`;
 else if(id==='hq'&&nextLevel>=4&&c.buildings.training<Math.max(1,nextLevel-3))reason=`Requires ${prerequisite}.`;
 else if(state.credits<cost.credits||(state.raidCompute||0)<cost.compute)reason='Earn more resources.';
 return {building:id,name:def?.name||'AI Headquarters',level,nextLevel,cost,durationSeconds:Math.min(240,15+(nextLevel-1)*(id==='hq'?20:15)),benefit,prerequisite,reason};
}
export function startUpgrade(state:GameState,id:BuildingId,now=Date.now(),requestId=`${id}-${now}`) {
 now=Math.max(now,ensureCampus(state,now).lastAccruedAt);advanceCampus(state,now);const q=quoteUpgrade(state,id);if(q.reason)throw new Error(q.reason);
 state.credits-=q.cost.credits;state.raidCompute=(state.raidCompute||0)-q.cost.compute;
 state.campus!.construction={id:requestId,building:id,level:q.nextLevel,startedAt:now,completesAt:now+q.durationSeconds*1000};return q;
}
export type CampusAgent = 'scout'|'tank'|'breaker'|'striker'|'medic'|'disruptor';
export function unlockedAgents(state:GameState):CampusAgent[] {
 const c=ensureCampus(state);const agents:CampusAgent[]=['scout','tank','breaker'];
 if(c.hq>=3&&c.buildings.training>=2)agents.push('striker');
 if(c.hq>=5&&c.buildings.research>=1&&c.buildings.training>=3)agents.push('medic');
 if(c.hq>=7&&c.buildings.research>=3&&c.buildings.training>=5)agents.push('disruptor');
 return agents;
}



