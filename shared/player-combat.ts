import {FOUNDATION_PLOT} from './foundation-plot';
import {guardPatrolPoints} from './security';
import {SENTINEL} from './sentinel-catalog';
import {breachRating} from './breach-rating';
import {founderDroneCapacity} from './founder-hq';
import {operationFromSnapshot,infiltrationSolids,AGENT_CLEARANCE,type TargetSnapshot,type Operation,type Vec} from './infiltration';
import {publicFootprint,type PublicBase,type PublicCompany} from './player-base';
import {ownedSecurityWalls} from './security-catalog';
import {nearestOpen} from './navigation';
import {COMBAT_BALANCE_V3} from './combat-balance';
export const PVP={shieldMs:5*60*1000,award:25,penalty:10,cooldownMs:5*60*1000,scoutMs:5*60*1000,readyMs:5*60*1000};
export function playerTarget(base:PublicBase,company:PublicCompany):TargetSnapshot{
 base={...base,buildings:[...base.buildings,...(base.builderHuts??[]).map(h=>({...h,id:h.id as import('./foundation').RotatableBuilding,level:1 as const,complete:true}))]};const footprints=base.buildings.map(v=>publicFootprint({...v,id:v.id.startsWith('builder-hut-')?'station':v.id})),walls=ownedSecurityWalls(base),x=Math.max(8,...footprints.map(f=>Math.abs(f.x)+f.w/2),...walls.map(w=>Math.abs(w.x)+w.w/2))+2.2,z=Math.max(8,...footprints.map(f=>Math.abs(f.z)+f.d/2),...walls.map(w=>Math.abs(w.z)+w.d/2))+2.2;
 const bounds={minX:Math.min(-x-5,FOUNDATION_PLOT.minX),maxX:Math.max(x+5,FOUNDATION_PLOT.maxX),minZ:Math.min(-z-5,FOUNDATION_PLOT.minZ),maxZ:Math.max(z+5,FOUNDATION_PLOT.maxZ)};
 const t:TargetSnapshot={version:1,id:company.id,name:company.name,difficulty:`Company Level ${company.level}`,arena:'campus-v2',navigationVersion:2,compound:[x,z],campusBounds:bounds,entry:[-x-2,z+2],exit:[-x-2,z+2],hqLevel:company.hqLevel,publicBase:structuredClone({...base,buildings:base.buildings.filter(b=>!b.id.startsWith('builder-hut-'))}),walls:ownedSecurityWalls(base),assets:base.buildings.map(v=>{const f=publicFootprint({...v,id:v.id.startsWith('builder-hut-')?'station':v.id});return {id:v.id,kind:v.id==='hq'?'hq':v.id==='rig'||v.id==='rig2'?'gpu':v.id==='lab'?'lab':'station',model:v.id.startsWith('builder-hut-')?'station':v.id,level:v.level,orientation:v.orientation,visualPosition:[...v.position] as Vec,position:[f.x,f.z] as Vec,size:[f.w,f.d] as Vec,name:v.id==='sentinel'?'Sentinel Tower':v.id==='hq'?'Founder HQ':v.id==='rig2'?'GPU Rig 2':v.id,hackSeconds:v.id==='hq'?24:12,maxHealth:v.id==='sentinel'?COMBAT_BALANCE_V3.buildingHealth.sentinel:v.id==='hq'?COMBAT_BALANCE_V3.buildingHealth.hq:COMBAT_BALANCE_V3.buildingHealth.ordinary,compute:0,research:0};}),defenses:[],influence:PVP.award};
 // Access points are selected without walls, so enclosed bases remain attackable via the existing breach planner.
 const buildings=infiltrationSolids({...t,walls:[]});for(const a of t.assets){const candidates:Vec[]=[[a.position[0],a.position[1]+a.size[1]/2+AGENT_CLEARANCE+.15],[a.position[0]+a.size[0]/2+AGENT_CLEARANCE+.15,a.position[1]],[a.position[0],a.position[1]-a.size[1]/2-AGENT_CLEARANCE-.15],[a.position[0]-a.size[0]/2-AGENT_CLEARANCE-.15,a.position[1]]];a.access=candidates.map(p=>nearestOpen(p,buildings,bounds,AGENT_CLEARANCE,.5)).find((p):p is Vec=>!!p);if(!a.access)throw Error('This campus is not available for infiltration yet.');}
 const station=base.buildings.find(b=>b.id==='droneStation'&&b.complete);if(station)t.defenses=Array.from({length:founderDroneCapacity({founderHqLevel:company.hqLevel})},(_,i)=>{const center=base.droneGuards?.[i]??base.droneGuard??station.position,route=guardPatrolPoints(center,[],bounds);return {id:i?'owner-security-drone-2':'owner-security-drone',route:route.length>1?[...route.slice(i*2),...route.slice(0,i*2)]:[route[0],route[0]],aerial:true,fliesOverWalls:true,radius:COMBAT_BALANCE_V3.droneDetection,patrolSpeed:1.1,pursuitSpeed:2,warningSeconds:.4};});
 const tower=base.buildings.find(b=>b.id==='sentinel'&&b.complete);if(tower)t.sentinels=[{id:tower.id,position:[...tower.position],range:SENTINEL.range,damage:SENTINEL.damage,lockStep:SENTINEL.lockStep,maxDamage:SENTINEL.maxDamage,intervalMs:SENTINEL.intervalMs,warmupMs:SENTINEL.warmupMs}];
 return t;
}
export function playerOperation(id:string,base:PublicBase,company:PublicCompany,attackerId:string,now:number):Operation{
 const o=operationFromSnapshot(id,playerTarget(base,company),now);o.pvp={attackerId,defenderId:company.id};o.squad={version:1,balanceVersion:3,rules:'tactical-v1',agents:[],progress:{},wallDamage:{},breachedWalls:[]};for(const d of o.drones)d.health=COMBAT_BALANCE_V3.droneHealth;return o;
}
export const playerDestruction=(o:Operation)=>breachRating(o).destruction;
