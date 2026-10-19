import {findPath} from './navigation';
import {ownedSecurityWalls} from './security-catalog';
import {decorationFootprint} from './decoration-catalog';
import {FOUNDATION_PLOT as P} from './foundation-plot';
import {FOUNDATION_BUILDINGS,buildingLayout,footprint,type FoundationState,type RigPosition} from './foundation';
import {OBSTACLES} from './campus-layout';
export const LANDSCAPE={initialCount:28,maxCount:40,regenerationMs:3*60*60*1000,workByKind:{tree:15000,rock:15000,scrap:30000},travelSpeed:8,rewards:{tree:2,scrap:3,rock:4}} as const;
export type LandscapeObstacle={id:string;kind:'tree'|'scrap'|'rock';position:RigPosition;variant:number};
export type ClearingJob={id:string;obstacle:LandscapeObstacle;route:RigPosition[];startedAt:number;workAt:number;clearedAt:number;completesAt:number;rewarded:boolean};
export type Landscape={version:1;epoch:string;sequence:number;nextSpawnAt:number;items:LandscapeObstacle[];clearing?:ClearingJob;pendingCompute:number;lastClear?:{id:string;kind:'tree'|'scrap'|'rock';position:RigPosition;at:number;reward:number}};
export const obstacleSize=(o:LandscapeObstacle):[number,number]=>o.kind==='tree'?[4,4]:o.kind==='rock'?[4,3]:[3,3];
const overlap=(a:{x:number;z:number;w:number;d:number},b:{x:number;z:number;w:number;d:number},gap=0)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.z-b.z)<(a.d+b.d)/2+gap;
function rect(o:LandscapeObstacle){const [w,d]=obstacleSize(o);return {x:o.position[0],z:o.position[1],w,d};}
export function door(s:FoundationState,kind:typeof FOUNDATION_BUILDINGS[number]):RigPosition{
 const l=buildingLayout(s,kind)!,a=l.orientation*Math.PI/2,dist=(kind==='hq'?5.8:kind==='station'?2:3.3);return [l.position[0]+Math.sin(a)*dist,l.position[1]+Math.cos(a)*dist];
}
/** Purchased segments only. Old automatic HQ perimeter scenery is never regenerated. */
export function campusSecurityWalls(s:FoundationState){return ownedSecurityWalls(s);}
/** Builder route stays inside the fence, avoids all solid footprints, and may cross the service road. */
export function landscapeRoute(s:FoundationState,target:RigPosition,origin?:RigPosition,clearance=.3):RigPosition[]{
 const start=origin??door(s,buildingLayout(s,'station')?'station':'hq');
 const solids=FOUNDATION_BUILDINGS.map(k=>{const l=buildingLayout(s,k);return l?footprint(k,l):null;}).filter((r):r is NonNullable<typeof r>=>!!r);
 solids.push(...campusSecurityWalls(s));
 for(const o of OBSTACLES.filter(o=>o.kind==='rock'))solids.push({x:o.position[0],z:o.position[1],w:o.width,d:o.depth});
 for(const o of s.landscape?.items||[])solids.push(rect(o));
 for(const o of s.decorations||[])solids.push(decorationFootprint(o));
 for(const [x,z] of [[-16,7],[13,7],[-16,11],[25,11]])solids.push({x,z,w:1.4,d:1.4});
 const path=findPath(start,target,solids,{minX:P.minX+.5,maxX:P.maxX-.5,minZ:P.minZ+.5,maxZ:P.maxZ-.5},clearance/2,.5);
 return path.length?[...(origin?[]:[buildingLayout(s,'station')?.position??start]),...path]:[];
}
export function validObstaclePosition(s:FoundationState,o:LandscapeObstacle){
 const a=rect(o);if(a.x-a.w/2<P.minX+1||a.x+a.w/2>P.maxX-1||a.z-a.d/2<P.minZ+1||a.z+a.d/2>P.maxZ-1||a.z+a.d/2>6.2&&a.z-a.d/2<11.8)return false;
 for(const k of FOUNDATION_BUILDINGS){const l=buildingLayout(s,k);if(!l)continue;if(overlap(a,footprint(k,l,true),1))return false;const [x,z]=door(s,k);if(overlap(a,{x,z,w:3,d:3},1))return false;}
 for(const r of OBSTACLES.filter(o=>o.kind==='rock'))if(overlap(a,{x:r.position[0],z:r.position[1],w:r.width,d:r.depth},1))return false;
 for(const wall of ownedSecurityWalls(s))if(overlap(a,wall,1))return false;
 for(const o of s.decorations||[])if(overlap(a,decorationFootprint(o),1))return false;
 for(const p of s.landscape?.items||[])if(overlap(a,rect(p),1))return false;
 for(const [x,z] of [[-16,7],[13,7],[-16,11],[25,11],[-18,-15],[23,-15],[-18,19],[22,20]])if(overlap(a,{x,z,w:3,d:2},.5))return false;
 if(s.landscape?.clearing?.route.some(([x,z])=>overlap(a,{x,z,w:1,d:1},.5)))return false;
 // Preserve the initial tutorial's building plots as well as access to every owned structure.
 for(const [x,z] of [[3,5],[6,0],[12,0],[6,-6],[12,-6]])if(overlap(a,{x,z,w:4,d:3},1))return false;
 const trial={...s,landscape:{...s.landscape!,items:[...(s.landscape?.items||[]),o]}};
 return FOUNDATION_BUILDINGS.filter(k=>buildingLayout(s,k)).every(k=>landscapeRoute(trial,door(s,k)).length>0);
}
function spawn(s:FoundationState,preferred?:{kind:LandscapeObstacle['kind'];position:RigPosition}){
 const l=s.landscape!;const n=++l.sequence;let seed=2166136261;for(const c of l.epoch)seed=Math.imul(seed^c.charCodeAt(0),16777619);seed=(seed+n*2654435761)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<160;i++){const o:LandscapeObstacle={id:l.epoch+':'+n,kind:preferred?.kind??(['tree','tree','tree','tree','scrap','scrap','scrap','rock','rock'][Math.floor(random()*9)] as LandscapeObstacle['kind']),variant:n%3,position:i===0&&preferred?preferred.position:[Math.floor(random()*(P.maxX-P.minX-4))+P.minX+2,Math.floor(random()*(P.maxZ-P.minZ-4))+P.minZ+2]};if(validObstaclePosition(s,o)){l.items.push(o);return;}}
}
/** Additive, lazy JSON migration, called only inside the server save transaction. */
export function ensureLandscape(s:FoundationState,now:number,epoch:string){if(s.landscape)return;s.landscape={version:1,epoch,sequence:0,nextSpawnAt:now+LANDSCAPE.regenerationMs,items:[],pendingCompute:0};
 // Keep the original first four landmarks, then spread cleanup work around the expanded territory.
 const plan:{kind:LandscapeObstacle['kind'];position:RigPosition}[]=[{kind:'tree',position:[-18,-9]},{kind:'tree',position:[3,-14]},{kind:'scrap',position:[18,-6]},{kind:'scrap',position:[5,17]}];
 for(const position of [[-29,-18],[-29,-4],[-27,21],[-12,-22],[13,-23],[29,-19],[30,23],[16,28],[-12,27],[-23,13]] as RigPosition[])plan.push({kind:'tree',position});
 for(const position of [[-30,28],[-8,18],[25,-9],[31,14],[-24,-23],[11,21],[32,-1],[22,25]] as RigPosition[])plan.push({kind:'scrap',position});
 for(const position of [[-31,0],[-21,27],[-4,-23],[23,-23],[33,27],[-12,-12]] as RigPosition[])plan.push({kind:'rock',position});
 for(let i=0;i<LANDSCAPE.initialCount;i++)spawn(s,plan[i]);
}
export function advanceLandscape(s:FoundationState,now:number){const l=s.landscape;if(!l)return;
 const job=l.clearing;if(job&&now>=job.clearedAt&&!job.rewarded){l.items=l.items.filter(o=>o.id!==job.obstacle.id);job.rewarded=true;const reward=LANDSCAPE.rewards[job.obstacle.kind];l.pendingCompute+=reward;l.lastClear={id:job.id,kind:job.obstacle.kind,position:job.obstacle.position,at:job.clearedAt,reward};}
 if(job&&now>=job.completesAt)delete l.clearing;
 const paid=Math.min(l.pendingCompute,Math.max(0,s.capacity-s.compute));s.compute+=paid;l.pendingCompute-=paid;
 if(now>=l.nextSpawnAt){if(l.items.length<LANDSCAPE.maxCount)spawn(s);l.nextSpawnAt=now+LANDSCAPE.regenerationMs;}
}
export function clearObstacle(s:FoundationState,id:string,now:number){if(s.builders<1)throw new Error('Place your free Builder Station first.');const l=s.landscape;if(!l)throw new Error('Reload your landscape first.');if(s.buildersBusy||l.clearing)throw new Error('Your Builder Bot is busy.');const o=l.items.find(o=>o.id===id);if(!o)throw new Error('This obstacle was already cleared.');const [w,d]=obstacleSize(o);
 const targets:RigPosition[]=[[o.position[0],o.position[1]+d/2+1],[o.position[0]+w/2+1,o.position[1]],[o.position[0],o.position[1]-d/2-1],[o.position[0]-w/2-1,o.position[1]]];
 const route=targets.map(t=>landscapeRoute(s,t)).filter(p=>p.length).sort((a,b)=>a.length-b.length)[0];if(!route)throw new Error('The Builder Bot needs a clear route to this obstacle.');
 const travel=Math.max(600,route.reduce((d,p,i)=>i?d+Math.hypot(p[0]-route[i-1][0],p[1]-route[i-1][1]):d,0)/LANDSCAPE.travelSpeed*1000);
 l.clearing={id:o.id,obstacle:structuredClone(o),route,startedAt:now,workAt:now+travel,clearedAt:now+travel+LANDSCAPE.workByKind[o.kind],completesAt:now+travel*2+LANDSCAPE.workByKind[o.kind],rewarded:false};s.buildersBusy=1;
}
