import {builderHutFootprints} from './foundation';
import {founderDroneCapacity} from './founder-hq';
import {FOUNDATION_BUILDINGS,buildingLayout,footprint} from './foundation';
import {ownedSecurityWalls} from './security-catalog';
import {obstacleSize} from './landscape';
import {decorationFootprint} from './decoration-catalog';
import {OBSTACLES} from './campus-layout';
import {findPath,nearestOpen,pointClear,type NavRect} from './navigation';
import {FOUNDATION_PLOT as P} from './foundation-plot';
import type {FoundationState} from './foundation';
/** Legacy free-defense flags are retained as data but no longer grant ownership. */
export type CompanySecurity={version:1;drone:{enabled:boolean;route:'hq-perimeter'}};
export const DEFAULT_SECURITY:CompanySecurity={version:1,drone:{enabled:false,route:'hq-perimeter'}};
export const companySecurity=(s:Pick<FoundationState,'droneStation'|'security'|'founderHqLevel'>,now=Date.now()):CompanySecurity=>({version:1,drone:{enabled:!!s.droneStation&&now>=s.droneStation.completesAt,route:'hq-perimeter'}});

export function securitySolids(s:FoundationState):NavRect[]{const rects=FOUNDATION_BUILDINGS.filter(k=>k!=='droneStation').flatMap(k=>{const l=buildingLayout(s,k);return l?[footprint(k,l)]:[]});for(const o of OBSTACLES.filter(o=>o.kind==='rock'&&!s.landscape?.legacyRocksRegistered||!s.landscape&&o.kind==='tree'))rects.push({x:o.position[0],z:o.position[1],w:o.width,d:o.depth});for(const o of s.landscape?.items??[]){const [w,d]=obstacleSize(o);rects.push({x:o.position[0],z:o.position[1],w,d});}for(const d of s.decorations??[])rects.push(decorationFootprint(d));return [...rects,...builderHutFootprints(s),...ownedSecurityWalls(s)];}
export const HOME_DRONE_CLEARANCE=1;
/** Validate reachable local patrol space using the same body clearance as the renderer. */
export const DRONE_ALTITUDE=10;
export const droneGuardPosition=(s:Pick<FoundationState,'droneGuards'|'droneGuard'|'droneStation'>,index=0)=>s.droneGuards?.[index]??s.droneGuard??s.droneStation?.position;
export function homePatrolPoints(s:FoundationState,index=0){const center=droneGuardPosition(s,index);return center?guardPatrolPoints(center,[],P):[];}
export function canPatrol(s:FoundationState){return !s.droneStation||homePatrolPoints(s).length>0;}


export const securityDroneCount=(s:Pick<FoundationState,'droneStation'|'security'|'founderHqLevel'>,now=Date.now())=>companySecurity(s,now).drone.enabled?founderDroneCapacity(s):0;

export const DRONE_PATROL_RADIUS=6;
export function validGuardPosition(s:FoundationState,p:[number,number]){if(!s.droneStation)return 'Build a Security Drone Station first.';if(p.length!==2||!p.every(Number.isFinite)||p[0]<P.minX+HOME_DRONE_CLEARANCE||p[0]>P.maxX-HOME_DRONE_CLEARANCE||p[1]<P.minZ+HOME_DRONE_CLEARANCE||p[1]>P.maxZ-HOME_DRONE_CLEARANCE)return 'Keep the guard position inside the campus.';return null;}
export function setGuardPosition(s:FoundationState,p:[number,number],index=0){if(!Number.isInteger(index)||index<0||index>=founderDroneCapacity(s))throw Error('This Security Drone is not available.');const reason=validGuardPosition(s,p);if(reason)throw Error(reason);s.droneGuards??=[];s.droneGuards[index]=[...p];}
export function guardPatrolPoints(center:[number,number],rects:NavRect[],bounds:{minX:number;maxX:number;minZ:number;maxZ:number}=P){
 const points:[number,number][]=[];
 // Test inward alternatives rather than moving a blocked waypoint outside the shown patrol radius.
 for(const angle of [Math.PI,Math.PI/2,0,-Math.PI/2])for(const radius of [DRONE_PATROL_RADIUS,3,2]){
  const p:[number,number]=[center[0]+Math.cos(angle)*radius,center[1]+Math.sin(angle)*radius];
  if(pointClear(p,[],bounds,HOME_DRONE_CLEARANCE)&&!points.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<1.6)){points.push(p);break;}
 }
 return points.length?points:[center];
}
