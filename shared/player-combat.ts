import {SENTINEL} from './sentinel-catalog';
import {breachRating} from './breach-rating';
import {founderDroneCapacity} from './founder-hq';
import {operationFromSnapshot,infiltrationSolids,AGENT_CLEARANCE,type TargetSnapshot,type Operation,type Vec} from './infiltration';
import {publicFootprint,type PublicBase,type PublicCompany} from './player-base';
import {ownedSecurityWalls} from './security-catalog';
import {nearestOpen} from './navigation';
import {TACTICAL_BALANCE} from './tactical-infiltration';
export const PVP={award:25,cooldownMs:12*60*60*1000,scoutMs:5*60*1000,readyMs:5*60*1000};
export function playerTarget(base:PublicBase,company:PublicCompany):TargetSnapshot{
 const footprints=base.buildings.map(publicFootprint),walls=ownedSecurityWalls(base),x=Math.max(8,...footprints.map(f=>Math.abs(f.x)+f.w/2),...walls.map(w=>Math.abs(w.x)+w.w/2))+2.2,z=Math.max(8,...footprints.map(f=>Math.abs(f.z)+f.d/2),...walls.map(w=>Math.abs(w.z)+w.d/2))+2.2;
 const bounds={minX:-x-5,maxX:x+5,minZ:-z-5,maxZ:z+5};
 const t:TargetSnapshot={version:1,id:company.id,name:company.name,difficulty:`Company Level ${company.level}`,arena:'campus-v2',navigationVersion:2,compound:[x,z],campusBounds:bounds,entry:[-x-2,z+2],exit:[-x-2,z+2],hqLevel:company.hqLevel,publicBase:structuredClone(base),walls:ownedSecurityWalls(base),assets:base.buildings.map(v=>{const f=publicFootprint(v);return {id:v.id,kind:v.id==='hq'?'hq':v.id==='rig'||v.id==='rig2'?'gpu':v.id==='lab'?'lab':'station',model:v.id,level:v.level,orientation:v.orientation,visualPosition:[...v.position] as Vec,position:[f.x,f.z] as Vec,size:[f.w,f.d] as Vec,name:v.id==='sentinel'?'Sentinel Tower':v.id==='hq'?'Founder HQ':v.id==='rig2'?'GPU Rig 2':v.id,hackSeconds:v.id==='hq'?24:12,maxHealth:v.id==='sentinel'?SENTINEL.health:(v.id==='hq'?24:12)*TACTICAL_BALANCE.botDamage,compute:0,research:0};}),defenses:[],influence:PVP.award};
 // Access points are selected without walls, so enclosed bases remain attackable via the existing breach planner.
 const buildings=infiltrationSolids({...t,walls:[]});for(const a of t.assets){const candidates:Vec[]=[[a.position[0],a.position[1]+a.size[1]/2+AGENT_CLEARANCE+.15],[a.position[0]+a.size[0]/2+AGENT_CLEARANCE+.15,a.position[1]],[a.position[0],a.position[1]-a.size[1]/2-AGENT_CLEARANCE-.15],[a.position[0]-a.size[0]/2-AGENT_CLEARANCE-.15,a.position[1]]];a.access=candidates.map(p=>nearestOpen(p,buildings,bounds,AGENT_CLEARANCE,.5)).find((p):p is Vec=>!!p);if(!a.access)throw Error('This campus is not available for infiltration yet.');}
 const station=base.buildings.find(b=>b.id==='droneStation'&&b.complete);if(station){const solids=infiltrationSolids(t),route:Vec[]=[];for(const [dx,dz] of [[-5,0],[0,5],[5,0],[0,-5]]){const p=nearestOpen([station.position[0]+dx,station.position[1]+dz],solids,bounds,1.15,.5);if(p)route.push(p);}if(route.length)t.defenses=Array.from({length:founderDroneCapacity({founderHqLevel:company.hqLevel})},(_,i)=>({id:i?'owner-security-drone-2':'owner-security-drone',route:route.length>1?[...route.slice(i*2),...route.slice(0,i*2)]:[route[0],route[0]],radius:TACTICAL_BALANCE.droneDetection,patrolSpeed:1.1,pursuitSpeed:2,warningSeconds:.4}));}
 const tower=base.buildings.find(b=>b.id==='sentinel'&&b.complete);if(tower)t.sentinels=[{id:tower.id,position:[...tower.position],range:SENTINEL.range,damage:SENTINEL.damage,lockStep:SENTINEL.lockStep,maxDamage:SENTINEL.maxDamage,intervalMs:SENTINEL.intervalMs,warmupMs:SENTINEL.warmupMs}];
 return t;
}
export function playerOperation(id:string,base:PublicBase,company:PublicCompany,attackerId:string,now:number):Operation{
 const o=operationFromSnapshot(id,playerTarget(base,company),now);o.pvp={attackerId,defenderId:company.id};o.squad={version:1,balanceVersion:2,rules:'tactical-v1',agents:[],progress:{},wallDamage:{},breachedWalls:[]};for(const d of o.drones)d.health=TACTICAL_BALANCE.droneHealth;return o;
}
export const playerDestruction=(o:Operation)=>breachRating(o).destruction;
