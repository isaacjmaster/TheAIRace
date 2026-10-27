import {builderAssignments,reconcileBuilderAssignments} from './builder-jobs';
import {builderHutFootprints} from './foundation';
import {findPath,nearestOpen} from './navigation';
import {ownedSecurityWalls} from './security-catalog';
import {decorationFootprint} from './decoration-catalog';
import {FOUNDATION_PLOT as P} from './foundation-plot';
import {advanceFoundation,FOUNDATION_BUILDINGS,buildingLayout,footprint,type FoundationState,type RigPosition} from './foundation';
import {OBSTACLES} from './campus-layout';
export const LANDSCAPE={initialCount:28,maxCount:40,regenerationMs:3*60*60*1000,workByKind:{tree:15000,rock:15000,scrap:15000},travelSpeed:8,rewards:{tree:2,scrap:3,rock:4}} as const;
export type LandscapeObstacle={id:string;kind:'tree'|'scrap'|'rock';position:RigPosition;variant:number;size?:[number,number]};
export type ClearingJob={builderIndex?:number;id:string;obstacle:LandscapeObstacle;route:RigPosition[];returnRoute?:RigPosition[];startedAt:number;workAt:number;clearedAt:number;completesAt:number;rewarded:boolean};
/** Return travel is presentation, not an active assignment. Existing deadlines stay intact. */
export const clearingJobs=(s:FoundationState):ClearingJob[]=>[...(s.landscape?.clearing?[s.landscape.clearing]:[]),...(s.landscape?.clearings??[])];
export const activeClearingJobs=(s:FoundationState,now:number)=>clearingJobs(s).filter(j=>now<j.clearedAt);
export const clearingActive=(s:FoundationState,now:number)=>activeClearingJobs(s,now).length>0;
export function routePosition(route:RigPosition[],progress:number):RigPosition{
 const distances=route.map((p,i)=>i?Math.hypot(p[0]-route[i-1][0],p[1]-route[i-1][1]):0);let distance=Math.max(0,Math.min(1,progress))*distances.reduce((a,b)=>a+b,0);
 for(let i=1;i<route.length;i++){if(distance<=distances[i]||i===route.length-1){const t=distances[i]?distance/distances[i]:0;return [route[i-1][0]+(route[i][0]-route[i-1][0])*t,route[i-1][1]+(route[i][1]-route[i-1][1])*t];}distance-=distances[i];}
 return route[0]??[0,0];
}
export function clearingPosition(j:ClearingJob,now:number):RigPosition{return now<j.clearedAt?routePosition(j.route,now<j.workAt?(now-j.startedAt)/Math.max(1,j.workAt-j.startedAt):1):routePosition(j.returnRoute??[...j.route].reverse(),(now-j.clearedAt)/Math.max(1,j.completesAt-j.clearedAt));}
export type Landscape={legacyRocksRegistered?:boolean;version:1;epoch:string;sequence:number;nextSpawnAt:number;items:LandscapeObstacle[];clearing?:ClearingJob;clearings?:ClearingJob[];completedClears?:string[];pendingCompute:number;lastClear?:{id:string;kind:'tree'|'scrap'|'rock';position:RigPosition;at:number;reward:number}};
export const obstacleSize=(o:LandscapeObstacle):[number,number]=>o.size??(o.kind==='tree'?[4,4]:o.kind==='rock'?[4,3]:[3,3]);
const overlap=(a:{x:number;z:number;w:number;d:number},b:{x:number;z:number;w:number;d:number},gap=0)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.z-b.z)<(a.d+b.d)/2+gap;
function rect(o:LandscapeObstacle){const [w,d]=obstacleSize(o);return {x:o.position[0],z:o.position[1],w,d};}
export function door(s:FoundationState,kind:typeof FOUNDATION_BUILDINGS[number]):RigPosition{
 const l=buildingLayout(s,kind)!,a=l.orientation*Math.PI/2,dist=(kind==='hq'?5.8:kind==='station'?2:3.3);return [l.position[0]+Math.sin(a)*dist,l.position[1]+Math.cos(a)*dist];
}
/** Purchased segments only. Old automatic HQ perimeter scenery is never regenerated. */
export function campusSecurityWalls(s:FoundationState){return ownedSecurityWalls(s);}
/** Builder route stays inside the fence, avoids all solid footprints, including the former road corridor. */
export function landscapeRoute(s:FoundationState,target:RigPosition,origin?:RigPosition,clearance=.3):RigPosition[]{
 const start=origin??door(s,buildingLayout(s,'station')?'station':'hq');
 const solids=FOUNDATION_BUILDINGS.map(k=>{const l=buildingLayout(s,k);return l?footprint(k,l):null;}).filter((r):r is NonNullable<typeof r>=>!!r);
 solids.push(...builderHutFootprints(s));
 // Owner Builder Bots phase through owned security walls; other navigation is unchanged.
 for(const o of OBSTACLES.filter(o=>o.kind==='rock'&&!s.landscape?.legacyRocksRegistered))solids.push({x:o.position[0],z:o.position[1],w:o.width,d:o.depth});
 for(const o of s.landscape?.items||[])solids.push(rect(o));
 for(const o of s.decorations||[])solids.push(decorationFootprint(o));
 const bounds={minX:P.minX+.5,maxX:P.maxX-.5,minZ:P.minZ+.5,maxZ:P.maxZ-.5};
 // A valid hut can have a narrow front apron. Start at the nearest clear
 // point on that apron rather than rejecting every job over a few centimeters.
 const exit=origin?start:nearestOpen(start,solids,bounds,clearance/2,.1,.75);
 const path=exit?findPath(exit,target,solids,bounds,clearance/2,.5):[];
 return path.length?[...(origin?[]:[buildingLayout(s,'station')?.position??start]),...path]:[];
}
export function validObstaclePosition(s:FoundationState,o:LandscapeObstacle){
 const a=rect(o);if(a.x-a.w/2<P.minX+1||a.x+a.w/2>P.maxX-1||a.z-a.d/2<P.minZ+1||a.z+a.d/2>P.maxZ-1)return false;
 for(const h of builderHutFootprints(s))if(overlap(a,h,1))return false;
 for(const k of FOUNDATION_BUILDINGS){const l=buildingLayout(s,k);if(!l)continue;if(overlap(a,footprint(k,l,true),1))return false;const [x,z]=door(s,k);if(overlap(a,{x,z,w:3,d:3},1))return false;}
 for(const r of OBSTACLES.filter(o=>o.kind==='rock'&&!s.landscape?.legacyRocksRegistered))if(overlap(a,{x:r.position[0],z:r.position[1],w:r.width,d:r.depth},1))return false;
 for(const wall of ownedSecurityWalls(s))if(overlap(a,wall,1))return false;
 for(const o of s.decorations||[])if(overlap(a,decorationFootprint(o),1))return false;
 for(const p of s.landscape?.items||[])if(overlap(a,rect(p),1))return false;
 for(const [x,z] of [[-18,-15],[23,-15],[-18,19],[22,20]])if(overlap(a,{x,z,w:3,d:2},.5))return false;
 if(clearingJobs(s).some(j=>j.route.some(([x,z])=>overlap(a,{x,z,w:1,d:1},.5))))return false;
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
export function ensureLandscape(s:FoundationState,now:number,epoch:string){if(s.landscape){registerCampusRocks(s);return;}s.landscape={version:1,epoch,sequence:0,nextSpawnAt:now+LANDSCAPE.regenerationMs,items:[],pendingCompute:0};
 // Keep the original first four landmarks, then spread cleanup work around the expanded territory.
 const plan:{kind:LandscapeObstacle['kind'];position:RigPosition}[]=[{kind:'tree',position:[-18,-9]},{kind:'tree',position:[3,-14]},{kind:'scrap',position:[18,-6]},{kind:'scrap',position:[5,17]}];
 for(const position of [[-29,-18],[-29,-4],[-27,21],[-12,-22],[13,-23],[29,-19],[30,23],[16,28],[-12,27],[-23,13]] as RigPosition[])plan.push({kind:'tree',position});
 for(const position of [[-30,28],[-8,18],[25,-9],[31,14],[-24,-23],[11,21],[32,-1],[22,25]] as RigPosition[])plan.push({kind:'scrap',position});
 for(const position of [[-31,0],[-21,27],[-4,-23],[23,-23],[33,27],[-12,-12]] as RigPosition[])plan.push({kind:'rock',position});
 for(let i=0;i<LANDSCAPE.initialCount;i++)spawn(s,plan[i]);registerCampusRocks(s);
}
export function advanceLandscape(s:FoundationState,now:number){const l=s.landscape;if(!l)return;
 l.completedClears??=[];for(const job of clearingJobs(s)){if(now>=job.clearedAt&&!job.rewarded){l.items=l.items.filter(o=>o.id!==job.obstacle.id);job.rewarded=true;l.completedClears.push(job.id);l.completedClears=l.completedClears.slice(-32);const reward=LANDSCAPE.rewards[job.obstacle.kind];l.pendingCompute+=reward;l.lastClear={id:job.id,kind:job.obstacle.kind,position:job.obstacle.position,at:job.clearedAt,reward};}
 }
 const retained=clearingJobs(s).filter(j=>now<j.completesAt);l.clearing=retained[0];l.clearings=retained.slice(1);
 const paid=Math.min(l.pendingCompute,Math.max(0,s.capacity-s.compute));s.compute+=paid;l.pendingCompute-=paid;
 if(now>=l.nextSpawnAt){if(l.items.length<LANDSCAPE.maxCount)spawn(s);l.nextSpawnAt=now+LANDSCAPE.regenerationMs;}
}
export function clearObstacle(s:FoundationState,id:string,now:number){advanceFoundation(s,now);if(s.builders<1)throw new Error('Place your free Builder Station first.');const l=s.landscape;if(!l)throw new Error('Reload your landscape first.');if((s.buildersBusy??0)>=s.builders)throw new Error('Your Builder Bot is busy.');const o=l.items.find(o=>o.id===id);if(!o)throw new Error('This obstacle was already cleared.');if(activeClearingJobs(s,now).some(j=>j.obstacle.id===id))throw new Error('This obstacle is already being cleared.');const [w,d]=obstacleSize(o);
 const targets:RigPosition[]=[[o.position[0],o.position[1]+d/2+1],[o.position[0]+w/2+1,o.position[1]],[o.position[0],o.position[1]-d/2-1],[o.position[0]-w/2-1,o.position[1]]];
 reconcileBuilderAssignments(s,now);const occupied=new Set(builderAssignments(s,now).map(j=>j.builderIndex));const builderIndex=Array.from({length:s.builders},(_,i)=>i).find(i=>!occupied.has(i));if(builderIndex===undefined)throw new Error('Your Builder Bot is busy.');
 const previous=clearingJobs(s).find(j=>(j.builderIndex??0)===builderIndex),origin=previous?clearingPosition(previous,now):undefined;
 const station=builderIndex===0?buildingLayout(s,'station'):s.builderHuts?.find(h=>h.id==='builder-hut-'+(builderIndex+1)&&!h.unplaced);
 const routeState=station?{...s,stationLayout:station,builderHuts:builderIndex===0?s.builderHuts:[...(s.builderHuts??[]).filter(h=>h!==station),{id:'original-station',...buildingLayout(s,'station')!}]}:s;
 const routeFrom=(t:RigPosition)=>{const direct=landscapeRoute(routeState,t,origin,1.1);if(direct.length||!origin||!station)return direct;const home=footprint('station',station);if(Math.abs(origin[0]-home.x)>home.w/2+.55||Math.abs(origin[1]-home.z)>home.d/2+.55)return [];const exit=landscapeRoute(routeState,t,undefined,1.1);return exit.length?[origin,...exit.slice(1)]:[];};
 const route=targets.map(routeFrom).filter(p=>p.length).sort((a,b)=>a.length-b.length)[0];if(!route)throw new Error('The Builder Bot needs a clear route to this obstacle.');
 const travel=Math.max(600,route.reduce((d,p,i)=>i?d+Math.hypot(p[0]-route[i-1][0],p[1]-route[i-1][1]):d,0)/LANDSCAPE.travelSpeed*1000);
 const back=landscapeRoute(routeState,door(routeState,'station'),route.at(-1),1.1),returnRoute=back.length?[...back,buildingLayout(routeState,'station')!.position]:[...route].reverse();
 const returnMs=Math.max(600,returnRoute.reduce((d,p,i)=>i?d+Math.hypot(p[0]-returnRoute[i-1][0],p[1]-returnRoute[i-1][1]):d,0)/LANDSCAPE.travelSpeed*1000);
 const next:ClearingJob={builderIndex,id:o.id,obstacle:structuredClone(o),route,returnRoute,startedAt:now,workAt:now+Math.min(travel,LANDSCAPE.workByKind[o.kind]-1000),clearedAt:now+LANDSCAPE.workByKind[o.kind],completesAt:now+returnMs+LANDSCAPE.workByKind[o.kind],rewarded:false};const jobs=clearingJobs(s).filter(j=>(j.builderIndex??0)!==builderIndex);jobs.push(next);l.clearing=jobs[0];l.clearings=jobs.slice(1);s.buildersBusy=(s.buildersBusy??0)+1;
}

/** Stable IDs and a persisted marker prevent cleared legacy rocks from respawning. */
function registerCampusRocks(s:FoundationState){const l=s.landscape!;if(l.legacyRocksRegistered)return;for(const o of OBSTACLES.filter(o=>o.kind==='rock'))if(!l.items.some(v=>v.id===o.id)&&l.lastClear?.id!==o.id&&!clearingJobs(s).some(j=>j.obstacle.id===o.id))l.items.push({id:o.id,kind:'rock',position:[...o.position],variant:0,size:[o.width,o.depth]});l.legacyRocksRegistered=true;}
