import {segmentClear} from './navigation';
import {canPatrol} from './security';
import {CYBERSECURITY,wallFootprint,wallEnds} from './security-catalog';
import {FOUNDATION_BUILDINGS,buildingLayout,footprint,validFoundationPosition,advanceFoundation,hasBuilderStation,type FoundationState,type RigPosition,type Orientation} from './foundation';
import {FOUNDATION_PLOT as P} from './foundation-plot';
import {overlapsRect,decorationFootprint} from './decoration-catalog';
import {obstacleSize,landscapeRoute,door} from './landscape';
import {OBSTACLES} from './campus-layout';
/** No new worker/queue: walls are instantaneous, station uses the existing builder. */
export function validWallPosition(s:FoundationState,position:RigPosition,orientation:Orientation,ignoreId?:string,verifyAccess=true):string|null{
 if(position.length!==2||!position.every(Number.isInteger)||![0,1,2,3].includes(orientation))return 'Snap the wall to the grid.';
 const candidate={id:ignoreId??'preview-wall',position,orientation},a=wallFootprint(candidate);
 if(a.x-a.w/2<P.minX||a.x+a.w/2>P.maxX||a.z-a.d/2<P.minZ||a.z+a.d/2>P.maxZ)return 'Keep the wall inside your property.';
 if(a.z+a.d/2>7.1&&a.z-a.d/2<10.9)return 'Keep roads and crossings clear.';
 if(!ignoreId&&(s.walls?.length??0)>=CYBERSECURITY.wall.maxSegments)return 'Wall placement limit reached.';
 for(const k of FOUNDATION_BUILDINGS){const l=buildingLayout(s,k);if(l&&overlapsRect(a,footprint(k,l),.15))return 'Leave space around buildings.';if(l&&!segmentClear(l.position,door(s,k),[a],{minX:-100,maxX:100,minZ:-100,maxZ:100},.55))return 'Leave building entrances clear.';}
 for(const o of OBSTACLES.filter(o=>o.kind==='rock'||!s.landscape&&o.kind==='tree'))if(overlapsRect(a,{x:o.position[0],z:o.position[1],w:o.width,d:o.depth},.1))return 'Choose open ground.';
 for(const o of s.landscape?.items??[]){const [w,d]=obstacleSize(o);if(overlapsRect(a,{x:o.position[0],z:o.position[1],w,d},.1))return 'Clear the obstacle first.';}
 for(const d of s.decorations??[])if(overlapsRect(a,decorationFootprint(d),.1))return 'Keep decorations clear.';
 for(const [x,z]of [[-16,7],[13,7],[-16,11],[25,11]])if(overlapsRect(a,{x,z,w:1.4,d:1.4},.1))return 'Keep streetlights clear.';
 for(const w of s.walls??[])if(w.id!==ignoreId&&overlapsRect(a,wallFootprint(w))){const joined=orientation%2!==w.orientation%2&&wallEnds(candidate).some(p=>wallEnds(w).some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<.01));if(!joined)return 'Align wall ends without overlapping.';}
 return null;
}
export function buyWall(s:FoundationState,p:RigPosition,o:Orientation,id:string){const reason=validWallPosition(s,p,o);if(reason)throw Error(reason);if(s.walls?.some(w=>w.id===id))throw Error('Wall already purchased.');if(s.compute<CYBERSECURITY.wall.cost)throw Error('Need '+(CYBERSECURITY.wall.cost-s.compute)+' more Compute');s.compute-=CYBERSECURITY.wall.cost;(s.walls??=[]).push({id,position:[...p],orientation:o});}
export function moveWall(s:FoundationState,id:string,p:RigPosition,o:Orientation){const w=s.walls?.find(w=>w.id===id);if(!w)throw Error('Security Wall not found.');const reason=validWallPosition(s,p,o,id);if(reason)throw Error(reason);w.position=[...p];w.orientation=o;}
export function buildDroneStation(s:FoundationState,p:RigPosition,now:number,o:Orientation=0){advanceFoundation(s,now);if(s.droneStation)throw Error('Security Drone Station — 1/1 Built');if(!hasBuilderStation(s)||s.builders<1)throw Error('Place your Builder Station first.');if(s.buildersBusy)throw Error('Your Builder Bot is busy.');const reason=validFoundationPosition(s,p,'droneStation',o);if(reason)throw Error(reason);if(s.compute<CYBERSECURITY.station.cost)throw Error('You need 200 Compute.');const station={position:[...p] as RigPosition,orientation:o,startedAt:now,completesAt:now+CYBERSECURITY.station.buildSeconds*1000};const trial={...s,droneStation:station};if(!landscapeRoute(trial,door(trial,'droneStation'),undefined,1.1).length)throw Error('Leave a path for your Builder Bot.');if(!canPatrol(trial))throw Error('Leave a wide route for the Security Drone.');s.compute-=CYBERSECURITY.station.cost;s.droneStation=station;s.buildersBusy=(s.buildersBusy??0)+1;}

/** Prefer exact endpoint joins near the pointer; authoritative placement still validates. */
export function snapWallPosition(s:FoundationState,p:RigPosition,o:Orientation,ignoreId?:string):RigPosition{
 const grid=p.map(Math.round) as RigPosition,candidates:RigPosition[]=[];
 for(const w of s.walls??[]){if(w.id===ignoreId)continue;for(const end of wallEnds(w))for(const sign of [-1,1]){
 const q:RigPosition=[end[0]+(o%2?0:sign),end[1]+(o%2?sign:0)];
 if(Math.hypot(q[0]-p[0],q[1]-p[1])<=1.25&&!validWallPosition(s,q,o,ignoreId,false))candidates.push(q);
 }}
 return candidates.sort((a,b)=>Math.hypot(a[0]-p[0],a[1]-p[1])-Math.hypot(b[0]-p[0],b[1]-p[1]))[0]??grid;
}
