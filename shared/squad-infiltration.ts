import {COMBAT_BALANCE_V3,troopCombat} from './combat-balance';
import {type TroopKind} from './troops';
import {craftCampusTarget} from './infiltration-bases';
import {advanceTactical,planTactical} from './tactical-infiltration';
import {findPath,segmentClear,nearestOpen,pointClear} from './navigation';
import {INFILTRATION,targetBounds,AGENT_CLEARANCE,DRONE_CLEARANCE,newOperation,infiltrationPath,infiltrationSolids,validDeployment,type Operation,type Vec,type InfiltrationCommand} from './infiltration';
export const SQUAD_BALANCE={health:42,laserDamage:18,laserIntervalMs:750,hackWorkMultiplier:2.5,maxHackers:3,endGraceMs:3000,wallHealth:72,breachDps:18,breachDetour:6} as const;
export type SquadAgent=Operation['agent']&{id:string;troop?:TroopKind;state:'active'|'extracted'|'lost';unitStatus:'reserved'|'returned'|'lost';work:number;workPosition?:Vec;unreachableDrone?:string;retryDroneAt?:number;blockedSince?:number;nextPlanAt?:number;lastProgressAt?:number;progressPosition?:Vec;routeRevision?:number;wallTarget?:string;droneTarget?:string;lockedUntil?:number;attackReadyAt?:number;lastShotAt?:number;shotPosition?:Vec;cargo:{compute:number;research:number;intel:boolean}};
export type SquadState={version:1;balanceVersion?:2|3|4;behaviorVersion?:1;undeployed?:number;undeployedBreacher?:number;rules?:'tactical-v1';agents:SquadAgent[];progress:Record<string,number>;wallDamage:Record<string,number>;breachedWalls:string[];idleSince?:number};
/** New missions use captured layouts; older active operation snapshots are never rewritten. */
export function newSquadOperation(id:string,targetId:string,now:number,spacious=true):Operation{
 const o=newOperation(id,targetId,now);o.squad={version:1,agents:[],progress:{},wallDamage:{},breachedWalls:[]};
 o.target.hqLevel=2;
 for(const asset of o.target.assets){asset.position=asset.position.map(v=>v*1.04) as Vec;if(asset.access)asset.access=asset.access.map(v=>v*1.04) as Vec;}
 o.target.assets.push({id:'security-station',kind:'station',name:'Security station',position:[-7.5,-4.4],size:[3.2,3.2],compute:0,research:0});
 o.target.walls=[{id:'north-core',x:0,z:-8,w:16,d:.3},{id:'north-west',x:-9.5,z:-7,w:3,d:.3},{id:'north-east',x:9.5,z:-7,w:3,d:.3},{id:'west',x:-11,z:-1.6,w:.3,d:10.4},{id:'east',x:11,z:-2,w:.3,d:9.5},{id:'front-west',x:-9.6,z:5.5,w:2.8,d:.3,height:.95},{id:'front-core',x:1.8,z:5.5,w:13.2,d:.3,height:.95}];
 if(targetId==='vector-works')o.target.walls.push({id:'research-wing',x:3.1,z:-3,w:.3,d:5.5});
 o.target.walls=o.target.walls.flatMap(w=>{const horizontal=w.w>w.d,length=Math.max(w.w,w.d),count=Math.ceil(length/2.5),span=length/count;return Array.from({length:count},(_,i)=>({...w,id:w.id+'-'+i,x:w.x+(horizontal?-length/2+span*(i+.5):0),z:w.z+(!horizontal?-length/2+span*(i+.5):0),w:horizontal?span:w.w,d:horizontal?w.d:span}));});
 if(spacious){o.target.arena='campus-v2';o.target.entry=[-11,13];o.target.exit=[-18,13];o.agent.position=[...o.target.entry];
 for(const asset of o.target.assets){asset.position=asset.position.map(v=>v*1.2) as Vec;if(asset.access)asset.access=asset.access.map(v=>v*1.2) as Vec;}
 for(const wall of o.target.walls){wall.x*=1.2;wall.z*=1.2;if(wall.w>wall.d)wall.w*=1.2;else wall.d*=1.2;}
 for(const defense of o.target.defenses)defense.route=defense.route.map(p=>p.map(v=>v*1.2) as Vec);
 }
 if(spacious){o.target=craftCampusTarget(targetId);o.breachRatingVersion=1;const hq=o.target.assets.find(a=>a.kind==='hq')!;hq.access=[hq.position[0],hq.position[1]+hq.size[1]/2+1.2];hq.hackSeconds=COMBAT_BALANCE_V3.hackSeconds.core;}
 const solids=infiltrationSolids(o.target);
 for(const defense of o.target.defenses){defense.radius+=.6;defense.warningSeconds=0;defense.route=defense.route.map(p=>nearestOpen(p,solids,targetBounds(o.target),DRONE_CLEARANCE,.5)??p);}
 if(spacious){o.squad.balanceVersion=3;o.squad.behaviorVersion=1;o.squad.rules='tactical-v1';for(const a of o.target.assets)if(a.hackSeconds&&a.model!=='sentinel')a.hackSeconds=a.kind==='gpu'?COMBAT_BALANCE_V3.hackSeconds.gpu:a.kind==='lab'?COMBAT_BALANCE_V3.hackSeconds.lab:COMBAT_BALANCE_V3.hackSeconds.core;
 // Freeze the previous effective NPC durability independently of future attacker damage tuning.
 for(const a of o.target.assets)if(a.hackSeconds&&a.maxHealth===undefined)a.maxHealth=a.hackSeconds*9;for(const d of o.target.defenses){d.radius=COMBAT_BALANCE_V3.droneDetection;d.warningSeconds=COMBAT_BALANCE_V3.droneWarmupMs/1000;}}
 o.drones=o.target.defenses.map(d=>({id:d.id,position:[...d.route[0]],segment:1,alert:0,lost:0,mode:'patrol'}));if(spacious)for(const d of o.drones)d.health=COMBAT_BALANCE_V3.droneHealth;return o;
}
export function squadTarget(o:Operation){return o.squad?{...o.target,...(o.pvp?{assets:o.target.assets.filter(a=>!o.hacked.includes(a.id))}:{}),walls:o.target.walls?.filter(w=>!o.squad!.breachedWalls.includes(w.id))}:o.target;}
const distance=(a:Vec,b:Vec)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function event(o:Operation,type:string,detail?:string){if(o.events.length<1024)o.events.push({at:o.lastTick,type,...(detail?{detail}:{})});}
function walk(a:SquadAgent,dt:number){let budget=INFILTRATION.agentSpeed*dt;const before:Vec=[...a.position];while(a.path.length&&budget>0){const q=a.path[0],d=distance(a.position,q);if(d<=budget){a.position=[...q];a.path.shift();budget-=d;}else{a.position[0]+=(q[0]-a.position[0])*budget/d;a.position[1]+=(q[1]-a.position[1])*budget/d;break;}}if(distance(before,a.position)>.001)a.yaw=Math.atan2(a.position[0]-before[0],a.position[1]-before[1]);}
function returnAgent(o:Operation,a:SquadAgent){a.target=undefined;a.wallTarget=undefined;a.mode='extracting';a.hack=0;a.path=infiltrationPath(squadTarget(o),a.position,o.target.exit);}
function targetAgent(o:Operation,a:SquadAgent){
 const agents=o.squad!.agents,candidates=o.target.assets.filter(v=>v.access&&v.hackSeconds&&!o.hacked.includes(v.id));
 candidates.sort((x,y)=>distance(a.position,x.access!)-distance(a.position,y.access!)||x.id.localeCompare(y.id));
 for(const asset of candidates){if(agents.filter(v=>v!==a&&v.state==='active'&&v.target===asset.id).length>=SQUAD_BALANCE.maxHackers)continue;const target=squadTarget(o),path=infiltrationPath(target,a.position,asset.access!);if(path.length||o.squad){
  let length=path.length?0:Infinity;for(let i=1;i<path.length;i++)length+=distance(path[i-1],path[i]);
  if(length>distance(a.position,asset.access!)+SQUAD_BALANCE.breachDetour){
   const walls=(target.walls??[]).filter(w=>!segmentClear(a.position,asset.access!,[w],targetBounds(o.target),AGENT_CLEARANCE)).sort((x,y)=>distance(a.position,[x.x,x.z])-distance(a.position,[y.x,y.z]));
   for(const wall of walls){const horizontal=wall.w>wall.d,side=Math.sign((horizontal?a.position[1]-wall.z:a.position[0]-wall.x))||1,spot:Vec=horizontal?[Math.max(wall.x-wall.w/2+.2,Math.min(wall.x+wall.w/2-.2,a.position[0])),wall.z+side*(wall.d/2+AGENT_CLEARANCE+.08)]:[wall.x+side*(wall.w/2+AGENT_CLEARANCE+.08),Math.max(wall.z-wall.d/2+.2,Math.min(wall.z+wall.d/2-.2,a.position[1]))];
    const route=infiltrationPath(target,a.position,spot);if(route.length){a.target=asset.id;a.wallTarget=wall.id;a.path=route;a.mode='breaching';return;}}
  }
  if(!path.length)continue;
  const slot=agents.filter(v=>v!==a&&v.state==='active'&&v.target===asset.id).length,spot:Vec=[asset.access![0]+(slot-1)*.9,asset.access![1]+.12],spaced=infiltrationPath(target,a.position,spot);
  a.target=asset.id;a.wallTarget=undefined;a.path=spaced.length?spaced:path;a.mode='moving';a.hack=0;return;
 }}
 if(candidates.length){a.mode='idle';a.target=undefined;}else returnAgent(o,a);
}
function finish(o:Operation,status:Operation['status']){o.status=status;o.finishedAt=o.lastTick;for(const a of o.squad!.agents)if(a.state==='active'){a.state=(a.health??0)>0?'extracted':'lost';a.path=[];a.mode='idle';}if(status!=='extracted')o.carried={compute:0,research:0,intel:false};event(o,status);}
export function commandSquad(o:Operation,c:InfiltrationCommand,now:number){
 advanceSquad(o,now);if(o.status!=='ready'&&o.status!=='active')throw Error('This operation has ended.');
 if(c.action==='abandon'){finish(o,'abandoned');(o.orders??=[]).push({at:now,intent:structuredClone(c)});return;}
 if(c.action!=='deploy')throw Error('Pulsewheels hack automatically.');
 const heavy=c.troop==='breacher';if(c.troop!==undefined&&c.troop!=='pulsewheel'&&!heavy)throw Error('Unknown troop.');
 if(heavy&&!o.squad!.rules)throw Error('Breacher requires a current operation.');
 const available=heavy?(o.squad!.undeployedBreacher??0):o.squad!.undeployed;if(available!==undefined&&available<=0)throw Error('No '+(heavy?'Breachers':'Pulsewheels')+' available for this mission.');
 const position=c.position??o.target.entry;if(!validDeployment(o.target,position))throw Error('Choose a highlighted perimeter tile.');
 // The Foundation command transaction owns the inventory deduction before this call.
 const a:SquadAgent={...(heavy?{troop:'breacher' as const}:{}),id:o.id+':'+o.squad!.agents.length,position:[...position],path:[],mode:'idle',hack:0,yaw:0,health:o.squad!.rules?troopCombat(o,heavy?'breacher':'pulsewheel').health:SQUAD_BALANCE.health,state:'active',unitStatus:'reserved',work:0,cargo:{compute:0,research:0,intel:false}};
 o.squad!.agents.push(a);if(heavy)o.squad!.undeployedBreacher!--;else if(o.squad!.undeployed!==undefined)o.squad!.undeployed--;o.squad!.idleSince=undefined;if(o.status==='ready'){o.status='active';o.startedAt=now;o.lastTick=now;}if(o.squad!.rules)planTactical(o,a);else targetAgent(o,a);o.agent=o.squad!.agents[0];event(o,'deployed',a.id);(o.orders??=[]).push({at:now,intent:structuredClone(c)});
}
/** Fixed server ticks. Shared building work is awarded only once; each worker extracts after its first successful objective. */
export function advanceSquad(o:Operation,now:number){
 if(o.squad?.rules==='tactical-v1'){advanceTactical(o,now);return;}
 if(o.status!=='active')return;const squad=o.squad!,end=Math.min(now,o.startedAt!+INFILTRATION.operationMs),solids=infiltrationSolids(squadTarget(o));
 while(o.status==='active'&&o.lastTick+INFILTRATION.stepMs<=end){o.lastTick+=INFILTRATION.stepMs;const dt=INFILTRATION.stepMs/1000;
  for(const a of squad.agents){if(a.state!=='active')continue;walk(a,dt);
   if(a.wallTarget){const wall=o.target.walls?.find(w=>w.id===a.wallTarget);if(!wall||squad.breachedWalls.includes(wall.id)){a.wallTarget=undefined;targetAgent(o,a);}else if(!a.path.length){a.mode='breaching';a.yaw=Math.atan2(wall.x-a.position[0],wall.z-a.position[1]);squad.wallDamage[wall.id]=(squad.wallDamage[wall.id]??0)+dt*SQUAD_BALANCE.breachDps*(o.cipherDamageMultiplier??1);if(squad.wallDamage[wall.id]+1e-6>=SQUAD_BALANCE.wallHealth){squad.breachedWalls.push(wall.id);event(o,'breached',wall.id);solids.splice(0,solids.length,...infiltrationSolids(squadTarget(o)));for(const worker of squad.agents)if(worker.wallTarget===wall.id){worker.wallTarget=undefined;targetAgent(o,worker);}}}if(a.wallTarget)continue;}

   if(a.mode==='extracting'&&!a.path.length&&distance(a.position,o.target.exit)<1.2){a.state='extracted';a.mode='idle';o.carried.compute+=a.cargo.compute;o.carried.research+=a.cargo.research;o.carried.intel||=a.cargo.intel;event(o,'agent-extracted',a.id);continue;}
   if(a.target&&o.hacked.includes(a.target)){a.target=undefined;targetAgent(o,a);}
   if(!a.target&&a.mode!=='extracting'&&o.lastTick>=(a.nextPlanAt??0)){targetAgent(o,a);a.nextPlanAt=o.lastTick+1000;}
   const asset=o.target.assets.find(v=>v.id===a.target);if(!asset?.access||a.path.length||distance(a.position,asset.access)>1.25)continue;
   a.mode='hacking';a.yaw=Math.atan2(asset.position[0]-a.position[0],asset.position[1]-a.position[1]);a.work+=dt;
   squad.progress[asset.id]=(squad.progress[asset.id]??0)+dt/SQUAD_BALANCE.hackWorkMultiplier;a.hack=squad.progress[asset.id];
   if(squad.progress[asset.id]+1e-6>=asset.hackSeconds!){squad.progress[asset.id]=asset.hackSeconds!;o.hacked.push(asset.id);a.cargo={compute:asset.compute,research:asset.research,intel:!!asset.intel};event(o,'hacked',asset.id);
    for(const worker of squad.agents)if(worker.state==='active'&&worker.target===asset.id&&worker.mode==='hacking')returnAgent(o,worker);
   }
  }
  for(const drone of o.drones){const cfg=o.target.defenses.find(v=>v.id===drone.id)!,goal=cfg.route[drone.segment];
   if(drone.pathKey!==String(drone.segment)||!drone.path?.length){drone.path=findPath(drone.position,goal,solids,targetBounds(o.target),DRONE_CLEARANCE);drone.pathKey=String(drone.segment);}
   let budget=cfg.patrolSpeed*dt;while(drone.path?.length&&budget>0){const p=drone.path[0],d=distance(drone.position,p);if(d<=budget){drone.position=[...p];drone.path.shift();budget-=d;}else{drone.yaw=Math.atan2(p[0]-drone.position[0],p[1]-drone.position[1]);drone.position[0]+=(p[0]-drone.position[0])*budget/d;drone.position[1]+=(p[1]-drone.position[1])*budget/d;break;}}
   if(distance(drone.position,goal)<.05){drone.segment=(drone.segment+1)%cfg.route.length;drone.pathKey=undefined;}
   const visible=squad.agents.filter(a=>a.state==='active'&&distance(drone.position,a.position)<=cfg.radius&&segmentClear(drone.position,a.position,solids,targetBounds(o.target),0));
   const target=visible.find(a=>a.id===drone.targetAgentId)??visible.sort((a,b)=>distance(drone.position,a.position)-distance(drone.position,b.position)||a.id.localeCompare(b.id))[0];
   drone.mode=target?'pursuit':'patrol';drone.targetAgentId=target?.id;
   if(target&&o.lastTick-(drone.lastShotAt??-Infinity)>=SQUAD_BALANCE.laserIntervalMs){drone.lastShotAt=o.lastTick;drone.shotPosition=[...target.position];target.health=Math.max(0,target.health!-SQUAD_BALANCE.laserDamage);event(o,'laser',target.id);if(!target.health){target.state='lost';target.mode='idle';target.path=[];target.cargo={compute:0,research:0,intel:false};event(o,'agent-lost',target.id);}}
  }
  if((squad.undeployed??0)+(squad.undeployedBreacher??0)===0&&squad.agents.every(a=>a.state!=='active')){squad.idleSince??=o.lastTick;if(o.lastTick-squad.idleSince>=SQUAD_BALANCE.endGraceMs)finish(o,squad.agents.some(a=>a.state==='extracted')?'extracted':'caught');}else squad.idleSince=undefined;
 }
 o.agent=squad.agents[0]??o.agent;
 if(o.status==='active'&&now>=o.startedAt!+INFILTRATION.operationMs){o.lastTick=o.startedAt!+INFILTRATION.operationMs;finish(o,'timeout');}
}
