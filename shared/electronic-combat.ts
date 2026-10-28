import {DISRUPTOR} from './electronic-catalog';
import {infiltrationSolids,targetBounds,type Operation,type Vec} from './infiltration';
import {segmentClear} from './navigation';
import {canFireAt} from './reliable-combat-routing';
import {squadTarget,type SquadAgent} from './squad-infiltration';

const distance=(a:Vec,b:Vec)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const emit=(o:Operation,type:string,detail:string)=>{if(o.events.length<1024)o.events.push({at:o.lastTick,type,detail});};
/** New battles capture ability tuning once. Historical battles never opt in implicitly. */
export function initializeElectronics(o:Operation){if(o.squad?.abilityVersion===1&&!o.electronic)o.electronic={version:1,disruptor:{...DISRUPTOR},statuses:{}};}
export const weaponDisabled=(o:Operation,id:string)=>o.squad?.abilityVersion===1&&(o.electronic?.statuses[id]?.disabledUntil??0)>o.lastTick;
export const empEligible=(o:Operation,id:string)=>(o.electronic?.statuses[id]?.immuneUntil??0)<=o.lastTick;

/** EMP uses legal ground firing surfaces; aircraft retain the existing aerial targeting rule. */
export function advanceEmp(o:Operation,a:SquadAgent){
 if(a.troop!=='disruptor'||a.state!=='active'||o.squad?.abilityVersion!==1)return;
 initializeElectronics(o);const cfg=o.electronic!.disruptor;
 if(o.lastTick-(a.lastEmpAt??-Infinity)<cfg.empCooldownMs)return;
 const t=squadTarget(o),candidates:{id:string;position:Vec;distance:number}[]=[];
 for(const defense of [...(t.sentinels??[]),...(t.arcSpires??[])]){
  if(o.hacked.includes(defense.id)||!empEligible(o,defense.id))continue;
  const asset=t.assets.find(v=>v.id===defense.id);
  if(asset&&canFireAt(t,asset,a.position,cfg.range))candidates.push({id:defense.id,position:[...defense.position],distance:distance(a.position,defense.position)});
 }
 for(const drone of o.drones){const spec=t.defenses.find(d=>d.id===drone.id);if(!spec||(drone.health??1)<=0||!empEligible(o,drone.id)||distance(a.position,drone.position)>cfg.range)continue;
  if(!spec.aerial&&!segmentClear(a.position,drone.position,infiltrationSolids(t),targetBounds(t),0))continue;
  candidates.push({id:drone.id,position:[...drone.position],distance:distance(a.position,drone.position)});
 }
 const pending=candidates.find(v=>v.id===a.empPendingTargetId),target=pending??candidates.sort((x,y)=>x.distance-y.distance||x.id.localeCompare(y.id))[0];
 if(!target){a.empChargeAt=undefined;a.empPendingTargetId=undefined;a.empPendingPosition=undefined;return;}
 if(!pending){a.empChargeAt=o.lastTick;a.empPendingTargetId=target.id;a.empPendingPosition=target.position;return;}
 a.empPendingPosition=target.position;if(o.lastTick-(a.empChargeAt??o.lastTick)<150)return;
 a.empChargeAt=undefined;a.empPendingTargetId=undefined;a.empPendingPosition=undefined;
 a.lastEmpAt=o.lastTick;a.empTargetId=target.id;a.empPosition=target.position;
 o.electronic!.statuses[target.id]={disabledUntil:o.lastTick+cfg.empDurationMs,immuneUntil:o.lastTick+cfg.empDurationMs+cfg.empImmunityMs};
 emit(o,'emp',a.id+':'+target.id);
}

/** One deterministic chain, never three independent tower beams or repeated hits. */
export function advanceArcSpires(o:Operation){
 if(o.status!=='active'||o.squad?.abilityVersion!==1||!o.target.arcSpires?.length)return;
 o.arcSpires??=[];
 for(const cfg of o.target.arcSpires){
  let state=o.arcSpires.find(s=>s.id===cfg.id);if(!state){state={id:cfg.id};o.arcSpires.push(state);}
  if(o.hacked.includes(cfg.id)){state.targetId=undefined;continue;}
  if(weaponDisabled(o,cfg.id)){state.resumeFireAt=o.electronic!.statuses[cfg.id].disabledUntil+cfg.warmupMs;continue;}
  const t=squadTarget(o),solids=infiltrationSolids({...t,walls:[],assets:t.assets.filter(a=>a.id!==cfg.id&&!o.hacked.includes(a.id))}),bounds=targetBounds(t);
  const active=o.squad.agents.filter(a=>a.state==='active'&&(a.health??0)>0);
  const eligible=active.filter(a=>distance(cfg.position,a.position)<=cfg.range&&segmentClear(cfg.position,a.position,solids,bounds,0));
  const primary=eligible.find(a=>a.id===state!.targetId)??eligible.sort((a,b)=>distance(cfg.position,a.position)-distance(cfg.position,b.position)||a.id.localeCompare(b.id))[0];
  if(!primary){state.targetId=undefined;state.acquiredAt=undefined;continue;}
  if(state.targetId!==primary.id){state.targetId=primary.id;state.acquiredAt=o.lastTick;}
  if(o.lastTick<(state.resumeFireAt??0)||o.lastTick-(state.acquiredAt??o.lastTick)<cfg.warmupMs||o.lastTick-(state.lastShotAt??-Infinity)<cfg.intervalMs)continue;
  const hits:SquadAgent[]=[primary];
  while(hits.length<Math.min(3,cfg.chainMultipliers.length)){
   const prev=hits[hits.length-1],next=active.filter(a=>!hits.includes(a)&&distance(prev.position,a.position)<=cfg.jumpDistance&&segmentClear(prev.position,a.position,solids,bounds,0)).sort((a,b)=>distance(prev.position,a.position)-distance(prev.position,b.position)||a.id.localeCompare(b.id))[0];
   if(!next)break;hits.push(next);
  }
  state.lastShotAt=o.lastTick;state.chain=hits.map((a,i)=>({id:a.id,position:[...a.position],damage:cfg.damage*cfg.chainMultipliers[i]}));
  for(let i=0;i<hits.length;i++){const a=hits[i];a.health=Math.max(0,a.health!-state.chain[i].damage);if(!a.health){a.state='lost';a.mode='idle';a.path=[];a.cargo={compute:0,research:0,intel:false};emit(o,'agent-lost',a.id);}}
  emit(o,'arc-discharge',cfg.id);
 }
}
