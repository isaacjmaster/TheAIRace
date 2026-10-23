import {founderDroneCapacity} from './founder-hq';
import {FOUNDATION_BUILDINGS,buildingLayout,footprint} from './foundation';
import {ownedSecurityWalls} from './security-catalog';
import {obstacleSize,door} from './landscape';
import {decorationFootprint} from './decoration-catalog';
import {OBSTACLES} from './campus-layout';
import {findPath,nearestOpen,type NavRect} from './navigation';
import {FOUNDATION_PLOT as P} from './foundation-plot';
import type {FoundationState} from './foundation';
/** Legacy free-defense flags are retained as data but no longer grant ownership. */
export type CompanySecurity={version:1;drone:{enabled:boolean;route:'hq-perimeter'}};
export const DEFAULT_SECURITY:CompanySecurity={version:1,drone:{enabled:false,route:'hq-perimeter'}};
export const companySecurity=(s:Pick<FoundationState,'droneStation'|'security'|'founderHqLevel'>,now=Date.now()):CompanySecurity=>({version:1,drone:{enabled:!!s.droneStation&&now>=s.droneStation.completesAt,route:'hq-perimeter'}});

export function securitySolids(s:FoundationState):NavRect[]{const rects=FOUNDATION_BUILDINGS.filter(k=>k!=='droneStation').flatMap(k=>{const l=buildingLayout(s,k);return l?[footprint(k,l)]:[]});for(const o of OBSTACLES.filter(o=>o.kind==='rock'||!s.landscape&&o.kind==='tree'))rects.push({x:o.position[0],z:o.position[1],w:o.width,d:o.depth});for(const o of s.landscape?.items??[]){const [w,d]=obstacleSize(o);rects.push({x:o.position[0],z:o.position[1],w,d});}for(const d of s.decorations??[])rects.push(decorationFootprint(d));return [...rects,...ownedSecurityWalls(s)];}
export function canPatrol(s:FoundationState){if(!s.droneStation)return true;const rects=securitySolids(s),goal=nearestOpen(door(s,'hq'),rects,P,1.15);return !!goal&&findPath(s.droneStation.position,goal,rects,P,1.15).length>0;}

export const securityDroneCount=(s:Pick<FoundationState,'droneStation'|'security'|'founderHqLevel'>,now=Date.now())=>companySecurity(s,now).drone.enabled?founderDroneCapacity(s):0;
