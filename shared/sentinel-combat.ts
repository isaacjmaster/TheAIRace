import {segmentClear} from './navigation';
import {infiltrationSolids,targetBounds,type Operation} from './infiltration';
import {squadTarget} from './squad-infiltration';
/** Runs only inside the authoritative fixed-step tactical simulation. Visuals read this state. */
export function advanceSentinels(o:Operation){
 if(o.status!=='active'||!o.squad||!o.target.sentinels?.length)return;
 o.sentinels??=[];
 for(const cfg of o.target.sentinels){
  let state=o.sentinels.find(s=>s.id===cfg.id);
  if(!state){state={id:cfg.id,yaw:0,lockShots:0};o.sentinels.push(state);}
  if(o.hacked.includes(cfg.id)){state.targetId=undefined;state.lockShots=0;continue;}
  const target=squadTarget(o),solids=infiltrationSolids({...target,assets:target.assets.filter(a=>a.id!==cfg.id)});
  const distance=(p:[number,number])=>Math.hypot(p[0]-cfg.position[0],p[1]-cfg.position[1]);
  const eligible=o.squad.agents.filter(a=>a.state==='active'&&(a.health??0)>0&&distance(a.position)<=cfg.range&&segmentClear(cfg.position,a.position,solids,targetBounds(target),0));
  const bot=eligible.find(a=>a.id===state!.targetId)??eligible.sort((a,b)=>distance(a.position)-distance(b.position)||a.id.localeCompare(b.id))[0];
  if(!bot){state.targetId=undefined;state.acquiredAt=undefined;state.lockShots=0;continue;}
  if(state.targetId!==bot.id){state.targetId=bot.id;state.acquiredAt=o.lastTick;state.lockShots=0;}
  state.yaw=Math.atan2(bot.position[0]-cfg.position[0],bot.position[1]-cfg.position[1]);
  if(o.lastTick-(state.acquiredAt??o.lastTick)<cfg.warmupMs||o.lastTick-(state.lastShotAt??-Infinity)<cfg.intervalMs)continue;
  const damage=Math.min(cfg.maxDamage,cfg.damage+state.lockShots*cfg.lockStep);
  state.shotDamage=damage;state.lockShots++;state.lastShotAt=o.lastTick;state.shotPosition=[...bot.position];
  bot.health=Math.max(0,bot.health!-damage);
  if(o.events.length<1024)o.events.push({at:o.lastTick,type:'sentinel-shot',detail:cfg.id});
  if(!bot.health){bot.state='lost';bot.mode='idle';bot.path=[];bot.cargo={compute:0,research:0,intel:false};if(o.events.length<1024)o.events.push({at:o.lastTick,type:'agent-lost',detail:bot.id});}
 }
}
