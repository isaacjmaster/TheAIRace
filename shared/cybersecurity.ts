import {reconcileBuilderAssignments} from './builder-jobs';
import {snapFootprint,onFootprintGrid} from './placement-grid';
import {builderHutFootprints} from './foundation';
import {SENTINEL} from './sentinel-catalog';
import {founderHqLevel,wallCapacity} from './founder-hq';
import {segmentClear} from './navigation';
import {canPatrol} from './security';
import {CYBERSECURITY,wallFootprint,wallEnds} from './security-catalog';
import {FOUNDATION_BUILDINGS,buildingLayout,placementFootprint,footprint,validFoundationPosition,advanceFoundation,hasBuilderStation,type FoundationState,type RigPosition,type Orientation} from './foundation';
import {FOUNDATION_PLOT as P} from './foundation-plot';
import {overlapsRect,decorationFootprint} from './decoration-catalog';
import {obstacleSize,landscapeRoute,door} from './landscape';
import {OBSTACLES} from './campus-layout';
/** No new worker/queue: walls are instantaneous, station uses the existing builder. */
export function validWallPosition(s:FoundationState,position:RigPosition,orientation:Orientation,ignoreId?:string,verifyAccess=true):string|null{
 if(position.length!==2||!(s.buildingUpdate?onFootprintGrid(position,1,1):position.every(Number.isInteger))||![0,1,2,3].includes(orientation))return 'Snap the wall to the grid.';
 const candidate={id:ignoreId??'preview-wall',position,orientation},a=wallFootprint(candidate);
 if(a.x-a.w/2<P.minX||a.x+a.w/2>P.maxX||a.z-a.d/2<P.minZ||a.z+a.d/2>P.maxZ)return 'Keep the wall inside your property.';
 if(!ignoreId&&s.buildingUpdate?.pending)return 'Finish your replacement wall layout first.';
 if(!ignoreId&&(s.walls?.length??0)>=wallCapacity(s))return 'Wall placement limit reached.';
 for(const h of builderHutFootprints(s))if(overlapsRect(a,h))return 'Keep the Builder Hut clear.';
 for(const k of FOUNDATION_BUILDINGS){const l=buildingLayout(s,k);if(l&&overlapsRect(a,(s.buildingUpdate?placementFootprint:footprint)(k,l)))return 'Leave space around buildings.';if(!s.buildingUpdate&&l&&!segmentClear(l.position,door(s,k),[a],{minX:-100,maxX:100,minZ:-100,maxZ:100},.55))return 'Leave building entrances clear.';}
 for(const o of OBSTACLES.filter(o=>o.kind==='rock'&&!s.landscape?.legacyRocksRegistered||!s.landscape&&o.kind==='tree'))if(overlapsRect(a,{x:o.position[0],z:o.position[1],w:o.width,d:o.depth}))return 'Choose open ground.';
 for(const o of s.landscape?.items??[]){const [w,d]=obstacleSize(o);if(overlapsRect(a,{x:o.position[0],z:o.position[1],w,d}))return 'Clear the obstacle first.';}
 for(const d of s.decorations??[])if(overlapsRect(a,decorationFootprint(d)))return 'Keep decorations clear.';
 for(const w of s.walls??[])if(w.id!==ignoreId&&overlapsRect(a,wallFootprint(w)))return 'This tile already contains a wall.';
 return null;
}
export function buyWall(s:FoundationState,p:RigPosition,o:Orientation,id:string){const reason=validWallPosition(s,p,o);if(reason)throw Error(reason);if(s.walls?.some(w=>w.id===id))throw Error('Wall already purchased.');if(s.compute<CYBERSECURITY.wall.cost)throw Error('Need '+(CYBERSECURITY.wall.cost-s.compute)+' more Compute');s.compute-=CYBERSECURITY.wall.cost;(s.walls??=[]).push({id,position:[...p],orientation:o,...(!s.buildingUpdate?{legacy:true}:{})});}
export function moveWall(s:FoundationState,id:string,p:RigPosition,o:Orientation){const w=s.walls?.find(w=>w.id===id);if(!w)throw Error('Security Wall not found.');const reason=validWallPosition(s,p,o,id);if(reason)throw Error(reason);w.position=[...p];w.orientation=o;if(s.buildingUpdate)delete w.legacy;}
/** Follow the selected segment's axis through junctions, never turn a corner. */
export function connectedWallRow(s:FoundationState,id:string){
 const first=s.walls?.find(w=>w.id===id);if(!first)return [];
 if(!first.legacy){const rows=[0,1].map(axis=>{const row=[first];for(const direction of [-1,1]){let p=first.position[axis]+direction;while(true){const next=s.walls?.find(w=>!w.legacy&&w.position[axis]===p&&w.position[1-axis]===first.position[1-axis]);if(!next)break;row.push(next);p+=direction;}}return row.sort((a,b)=>a.position[axis]-b.position[axis]);});return rows[0].length===rows[1].length?rows[first.orientation%2]:rows[0].length>rows[1].length?rows[0]:rows[1];}
 const axis=first.orientation%2,found=[first],pending=[first];
 while(pending.length){const w=pending.pop()!;for(const next of s.walls??[]){if(next.orientation%2!==axis||found.includes(next))continue;if(wallEnds(w).some(p=>wallEnds(next).some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<.01))){found.push(next);pending.push(next);}}}
 return found.sort((a,b)=>a.position[axis]-b.position[axis]||a.id.localeCompare(b.id));
}
export function wallRowMove(s:FoundationState,id:string,p:RigPosition){const anchor=s.walls?.find(w=>w.id===id);if(!anchor)throw Error('Security Wall not found.');return connectedWallRow(s,id).map(w=>({...w,...(s.buildingUpdate?{legacy:undefined}:{}),position:[w.position[0]+p[0]-anchor.position[0],w.position[1]+p[1]-anchor.position[1]] as RigPosition}));}
export function validWallRowPosition(s:FoundationState,id:string,p:RigPosition){
 const moves=wallRowMove(s,id,p),ids=new Set(moves.map(w=>w.id)),trial={...s,walls:(s.walls??[]).filter(w=>!ids.has(w.id))};
 for(const w of moves){const reason=validWallPosition(trial,w.position,w.orientation,w.id);if(reason)return reason;trial.walls.push(w);}return null;
}
export function moveWallRow(s:FoundationState,id:string,p:RigPosition){const reason=validWallRowPosition(s,id,p);if(reason)throw Error(reason);const moves=new Map(wallRowMove(s,id,p).map(w=>[w.id,w]));s.walls=s.walls!.map(w=>moves.get(w.id)??w);}
export function buildDroneStation(s:FoundationState,p:RigPosition,now:number,o:Orientation=0){advanceFoundation(s,now);if(s.droneStation)throw Error('Security Drone Station — 1/1 Built');if(!hasBuilderStation(s)||s.builders<1)throw Error('Place your Builder Station first.');if((s.buildersBusy??0)>=s.builders)throw Error('Your Builder Bot is busy.');const reason=validFoundationPosition(s,p,'droneStation',o);if(reason)throw Error(reason);if(s.compute<CYBERSECURITY.station.cost)throw Error('You need 200 Compute.');const station={position:[...p] as RigPosition,orientation:o,startedAt:now,completesAt:now+CYBERSECURITY.station.buildSeconds*1000};const trial={...s,droneStation:station};if(!landscapeRoute(trial,door(trial,'droneStation'),undefined,1.1).length)throw Error('Leave a path for your Builder Bot.');if(!canPatrol(trial))throw Error('Leave an open exit from the drone pad to nearby patrol space.');s.compute-=CYBERSECURITY.station.cost;s.droneStation=station;s.buildersBusy=(s.buildersBusy??0)+1;reconcileBuilderAssignments(s,now);}

/** Prefer exact endpoint joins near the pointer; authoritative placement still validates. */
export function snapWallPosition(s:FoundationState,p:RigPosition,o:Orientation,ignoreId?:string):RigPosition{
 return snapFootprint(p,1,1);
}

export function buildSentinel(s:FoundationState,p:RigPosition,now:number,o:Orientation=0){
 advanceFoundation(s,now);if(s.sentinel)throw Error('Sentinel Tower — 1/1 Built');
 if(founderHqLevel(s)<SENTINEL.hqLevel)throw Error('Upgrade Founder HQ to Level 2 for a Sentinel Tower.');
 if(!hasBuilderStation(s)||s.builders<1)throw Error('Place your Builder Station first.');
 if((s.buildersBusy??0)>=s.builders)throw Error('Your Builder Bot is busy.');
 const reason=validFoundationPosition(s,p,'sentinel',o);if(reason)throw Error(reason);
 if(s.compute<SENTINEL.cost)throw Error('You need '+SENTINEL.cost+' Compute.');
 const building={position:[...p] as RigPosition,orientation:o,startedAt:now,completesAt:now+SENTINEL.buildSeconds*1000},trial={...s,sentinel:building};
 if(!landscapeRoute(trial,door(trial,'sentinel'),undefined,1.1).length)throw Error('Leave a path for your Builder Bot.');
 s.compute-=SENTINEL.cost;s.sentinel=building;s.buildersBusy=(s.buildersBusy??0)+1;reconcileBuilderAssignments(s,now);
}
