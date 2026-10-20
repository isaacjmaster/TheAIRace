import {findPath,segmentClear,nearestOpen} from './navigation';
import {AGENT_CLEARANCE,DRONE_CLEARANCE,INFILTRATION,infiltrationPath,infiltrationSolids,targetBounds,type Operation,type Vec,type DroneState} from './infiltration';
import {squadTarget,SQUAD_BALANCE,type SquadAgent} from './squad-infiltration';

/** Snapshot-versioned tuning: old missions continue using their original simulation. */
export const TACTICAL_BALANCE={botHealth:60,botDamage:9,botRange:4.6,botAcquire:6.4,botIntervalMs:1000,targetLockMs:900,retargetRatio:.7,droneHealth:100,droneDamage:22,droneRange:5.8,droneDetection:6.8,droneIntervalMs:1250,droneWarmupMs:650,hackSeconds:{gpu:12,lab:16,core:22},hackContributions:[1,.65,.4,.25,.15],maxHackers:5} as const;
const WORK_SPOTS:readonly Vec[]=[[0,0],[-.95,0],[.95,0],[-.48,.95],[.48,.95]];
const distance=(a:Vec,b:Vec)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const emit=(o:Operation,type:string,detail?:string)=>{if(o.events.length<1024)o.events.push({at:o.lastTick,type,...(detail?{detail}:{})});};
const alive=(d:DroneState)=>(d.health??TACTICAL_BALANCE.droneHealth)>0;
const sight=(o:Operation,a:Vec,b:Vec)=>segmentClear(a,b,infiltrationSolids(squadTarget(o)),targetBounds(o.target),0);
function move(a:{position:Vec;path?:Vec[];yaw?:number},budget:number){while(a.path?.length&&budget>0){const p=a.path[0],d=distance(a.position,p);if(d<.001){a.path.shift();continue;}a.yaw=Math.atan2(p[0]-a.position[0],p[1]-a.position[1]);if(d<=budget){a.position=[...p];a.path.shift();budget-=d;}else{a.position[0]+=(p[0]-a.position[0])*budget/d;a.position[1]+=(p[1]-a.position[1])*budget/d;break;}}}
function chooseDrone(o:Operation,a:SquadAgent){return o.drones.filter(d=>alive(d)&&distance(a.position,d.position)<=TACTICAL_BALANCE.botAcquire&&sight(o,a.position,d.position)).sort((x,y)=>distance(a.position,x.position)-distance(a.position,y.position)||x.id.localeCompare(y.id))[0];}
/** Stable nearest eligible objective, with the existing opening-versus-breach policy. */
export function planTactical(o:Operation,a:SquadAgent){
 const t=squadTarget(o),bounds=targetBounds(t),assets=t.assets.filter(v=>v.access&&v.hackSeconds&&!o.hacked.includes(v.id)).sort((x,y)=>distance(a.position,x.access!)-distance(a.position,y.access!)||x.id.localeCompare(y.id)),nearest=chooseDrone(o,a);
 const current=o.drones.find(d=>d.id===a.droneTarget&&alive(d));
 const currentValid=current&&distance(a.position,current.position)<=TACTICAL_BALANCE.botAcquire&&sight(o,a.position,current.position);if(currentValid&&o.lastTick<(a.lockedUntil??0))return;
 const drone=currentValid&&(!nearest||distance(a.position,nearest.position)>=distance(a.position,current.position)*TACTICAL_BALANCE.retargetRatio)?current:nearest;
 const first=assets.find(v=>o.squad!.agents.filter(b=>b!==a&&b.state==='active'&&b.target===v.id&&!b.droneTarget).length<TACTICAL_BALANCE.maxHackers);
 const objectiveDistance=first?distance(a.position,first.access!):Infinity;
 if(drone&&distance(a.position,drone.position)<objectiveDistance*(a.mode==='hacking'?TACTICAL_BALANCE.retargetRatio:1)){
  if(a.droneTarget!==drone.id){a.lockedUntil=o.lastTick+TACTICAL_BALANCE.targetLockMs;a.path=[];}a.target=undefined;a.droneTarget=drone.id;a.wallTarget=undefined;a.mode='attacking';return;
 }
 a.droneTarget=undefined;
 if(a.target&&!o.hacked.includes(a.target)&&a.mode!=='idle')return;
 for(const asset of assets){const slot=o.squad!.agents.filter(b=>b!==a&&b.state==='active'&&b.target===asset.id&&!b.droneTarget).length;if(slot>=TACTICAL_BALANCE.maxHackers)continue;
  const path=infiltrationPath(t,a.position,asset.access!);let length=path.length?0:Infinity;for(let i=1;i<path.length;i++)length+=distance(path[i-1],path[i]);
  if(length>distance(a.position,asset.access!)+SQUAD_BALANCE.breachDetour){
   const walls=(t.walls??[]).filter(w=>!segmentClear(a.position,asset.access!,[w],bounds,AGENT_CLEARANCE)).sort((x,y)=>distance(a.position,[x.x,x.z])-distance(a.position,[y.x,y.z]));
   for(const w of walls){const horizontal=w.w>w.d,side=Math.sign(horizontal?a.position[1]-w.z:a.position[0]-w.x)||1,p:Vec=horizontal?[Math.max(w.x-w.w/2+.2,Math.min(w.x+w.w/2-.2,a.position[0])),w.z+side*(w.d/2+AGENT_CLEARANCE+.08)]:[w.x+side*(w.w/2+AGENT_CLEARANCE+.08),Math.max(w.z-w.d/2+.2,Math.min(w.z+w.d/2-.2,a.position[1]))],route=infiltrationPath(t,a.position,p);if(route.length){a.target=asset.id;a.wallTarget=w.id;a.path=route;a.mode='breaching';return;}}
  }
  if(!path.length)continue;const offset=WORK_SPOTS[slot],spot:Vec=[asset.access![0]+offset[0],asset.access![1]+offset[1]+.12],spaced=infiltrationPath(t,a.position,spot);a.target=asset.id;a.wallTarget=undefined;a.path=spaced.length?spaced:path;a.mode='moving';return;
 }
 a.target=undefined;a.path=[];a.mode='idle';
}
function end(o:Operation,status:Operation['status']){o.status=status;o.finishedAt=o.lastTick;for(const a of o.squad!.agents)if(a.state==='active'){a.state=status==='extracted'?'extracted':'lost';a.path=[];a.mode='idle';a.target=undefined;a.droneTarget=undefined;a.wallTarget=undefined;}for(const d of o.drones){d.path=[];d.targetAgentId=undefined;if(alive(d))d.mode='patrol';}if(status!=='extracted')o.carried={compute:0,research:0,intel:false};emit(o,status);}
function drones(o:Operation,dt:number){const solids=infiltrationSolids(squadTarget(o)),bounds=targetBounds(o.target);
 for(const d of o.drones){if(!alive(d)){d.mode='disabled';d.path=[];d.targetAgentId=undefined;continue;}const cfg=o.target.defenses.find(c=>c.id===d.id)!;
  const visible=o.squad!.agents.filter(a=>a.state==='active'&&distance(d.position,a.position)<=cfg.radius&&sight(o,d.position,a.position));const target=visible.find(a=>a.id===d.targetAgentId)??visible.sort((a,b)=>distance(d.position,a.position)-distance(d.position,b.position)||a.id.localeCompare(b.id))[0];
  if(target){if(d.targetAgentId!==target.id){d.acquiredAt=o.lastTick;emit(o,'detected',target.id);}d.targetAgentId=target.id;d.yaw=Math.atan2(target.position[0]-d.position[0],target.position[1]-d.position[1]);
   if(distance(d.position,target.position)<=TACTICAL_BALANCE.droneRange){d.mode='attacking';d.path=[];d.pathKey=undefined;
    if(o.lastTick-(d.acquiredAt??o.lastTick)>=TACTICAL_BALANCE.droneWarmupMs&&o.lastTick-(d.lastShotAt??-Infinity)>=TACTICAL_BALANCE.droneIntervalMs){d.lastShotAt=o.lastTick;d.shotPosition=[...target.position];target.health=Math.max(0,target.health!-TACTICAL_BALANCE.droneDamage);emit(o,'laser',target.id);if(!target.health){target.state='lost';target.mode='idle';target.path=[];target.cargo={compute:0,research:0,intel:false};emit(o,'agent-lost',target.id);}}continue;
   }
   d.mode='pursuit';if(o.lastTick-(d.lost??0)>=700||d.pathKey!=='engage'){// Find a reachable firing position; never fly through a wall to the target.
    const route=findPath(d.position,nearestOpen(target.position,solids,bounds,DRONE_CLEARANCE)??d.position,solids,bounds,DRONE_CLEARANCE);d.path=route;d.pathKey='engage';d.lost=o.lastTick;
   }move(d,cfg.pursuitSpeed*dt);continue;
  }
  d.targetAgentId=undefined;d.acquiredAt=undefined;d.mode='patrol';const goal=cfg.route[d.segment];if(d.pathKey!==String(d.segment)||!d.path?.length){d.path=findPath(d.position,goal,solids,bounds,DRONE_CLEARANCE);d.pathKey=String(d.segment);}move(d,cfg.patrolSpeed*dt);if(distance(d.position,goal)<.05){d.segment=(d.segment+1)%cfg.route.length;d.pathKey=undefined;}
 }
}
/** Shared work survives interruption. Pending loot banks only on a successful mission, exactly once. */
export function advanceTactical(o:Operation,now:number){if(o.status!=='active')return;const squad=o.squad!,endAt=Math.min(now,o.startedAt!+INFILTRATION.operationMs);
 while(o.status==='active'&&o.lastTick+INFILTRATION.stepMs<=endAt){o.lastTick+=INFILTRATION.stepMs;const dt=INFILTRATION.stepMs/1000;
  for(const a of squad.agents){if(a.state!=='active')continue;if(o.lastTick>=(a.nextPlanAt??0)){planTactical(o,a);a.nextPlanAt=o.lastTick+500;}
   if(a.droneTarget){const d=o.drones.find(d=>d.id===a.droneTarget&&alive(d));if(!d||!sight(o,a.position,d.position)||distance(a.position,d.position)>TACTICAL_BALANCE.botAcquire){a.droneTarget=undefined;a.target=undefined;a.mode='idle';continue;}
    a.yaw=Math.atan2(d.position[0]-a.position[0],d.position[1]-a.position[1]);if(distance(a.position,d.position)>TACTICAL_BALANCE.botRange){if(!a.path.length||o.lastTick>=(a.lockedUntil??0)){a.path=infiltrationPath(squadTarget(o),a.position,d.position);a.lockedUntil=o.lastTick+TACTICAL_BALANCE.targetLockMs;}move(a,INFILTRATION.agentSpeed*dt);a.mode='moving';}else{a.path=[];a.mode='attacking';if(o.lastTick-(a.lastShotAt??-Infinity)>=TACTICAL_BALANCE.botIntervalMs){a.lastShotAt=o.lastTick;a.shotPosition=[...d.position];d.health=Math.max(0,(d.health??TACTICAL_BALANCE.droneHealth)-TACTICAL_BALANCE.botDamage);emit(o,'cipher-shot',a.id);if(!d.health){d.mode='disabled';d.path=[];d.targetAgentId=undefined;emit(o,'drone-disabled',d.id);}}}continue;
   }
   move(a,INFILTRATION.agentSpeed*dt);
   if(a.wallTarget){const wall=o.target.walls?.find(w=>w.id===a.wallTarget);if(!wall||squad.breachedWalls.includes(wall.id)){a.wallTarget=undefined;a.target=undefined;a.mode='idle';planTactical(o,a);}else if(!a.path.length){a.mode='breaching';a.yaw=Math.atan2(wall.x-a.position[0],wall.z-a.position[1]);squad.wallDamage[wall.id]=(squad.wallDamage[wall.id]??0)+dt*SQUAD_BALANCE.breachDps;if(squad.wallDamage[wall.id]+1e-6>=SQUAD_BALANCE.wallHealth){squad.breachedWalls.push(wall.id);emit(o,'breached',wall.id);for(const b of squad.agents)if(b.wallTarget===wall.id){b.wallTarget=undefined;b.target=undefined;b.mode='idle';planTactical(o,b);}}}if(a.wallTarget)continue;}
   if(a.target&&o.hacked.includes(a.target)){a.target=undefined;a.mode='idle';planTactical(o,a);}
   const asset=o.target.assets.find(v=>v.id===a.target);if(asset?.access&&!a.path.length&&distance(a.position,asset.access)<1.5){a.mode='hacking';a.yaw=Math.atan2(asset.position[0]-a.position[0],asset.position[1]-a.position[1]);a.work+=dt;}
  }
  for(const asset of o.target.assets.filter(a=>a.hackSeconds&&!o.hacked.includes(a.id))){const workers=squad.agents.filter(a=>a.state==='active'&&a.mode==='hacking'&&a.target===asset.id&&!a.droneTarget);if(!workers.length)continue;const rate=TACTICAL_BALANCE.hackContributions.slice(0,workers.length).reduce((a,b)=>a+b,0);squad.progress[asset.id]=Math.min(asset.hackSeconds!,(squad.progress[asset.id]??0)+dt*rate);if(squad.progress[asset.id]+1e-6>=asset.hackSeconds!){squad.progress[asset.id]=asset.hackSeconds!;o.hacked.push(asset.id);o.carried.compute+=asset.compute;o.carried.research+=asset.research;o.carried.intel||=!!asset.intel;emit(o,'hacked',asset.id);for(const a of workers){a.target=undefined;a.mode='idle';a.nextPlanAt=o.lastTick;}}}
  if(o.target.assets.filter(a=>a.hackSeconds).every(a=>o.hacked.includes(a.id))){end(o,'extracted');break;}
  drones(o,dt);if(squad.agents.length&&squad.agents.every(a=>a.state!=='active'))end(o,'caught');
 }
 o.agent=squad.agents[0]??o.agent;if(o.status==='active'&&now>=o.startedAt!+INFILTRATION.operationMs){o.lastTick=o.startedAt!+INFILTRATION.operationMs;end(o,'timeout');}
}
