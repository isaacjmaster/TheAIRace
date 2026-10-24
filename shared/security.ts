import {builderHutFootprints} from './foundation';
import {founderDroneCapacity} from './founder-hq';
import {FOUNDATION_BUILDINGS,buildingLayout,footprint} from './foundation';
import {ownedSecurityWalls} from './security-catalog';
import {obstacleSize,door} from './landscape';
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
export function homePatrolPoints(s:FoundationState){if(!s.droneStation)return [];const rects=securitySolids(s),start=s.droneStation.position;if(!pointClear(start,rects,P,HOME_DRONE_CLEARANCE))return [];const hq=footprint('hq',buildingLayout(s,'hq')!);const candidates:[number,number][]=[...([-1,1].flatMap(x=>[-1,1].map(z=>[hq.x+x*(hq.w/2+2.2),hq.z+z*(hq.d/2+2.2)] as [number,number]))),...[[-4,0],[0,4],[4,0],[0,-4]].map(([x,z])=>[start[0]+x,start[1]+z] as [number,number])];const reachable=candidates.map(p=>nearestOpen(p,rects,P,HOME_DRONE_CLEARANCE,.5,2)).filter((p):p is [number,number]=>!!p&&Math.hypot(p[0]-start[0],p[1]-start[1])>=2.5&&findPath(start,p,rects,P,HOME_DRONE_CLEARANCE,.5).length>0);return reachable.length?[...reachable,[...start] as [number,number]]:[];}
export function canPatrol(s:FoundationState){return !s.droneStation||homePatrolPoints(s).length>0;}


export const securityDroneCount=(s:Pick<FoundationState,'droneStation'|'security'|'founderHqLevel'>,now=Date.now())=>companySecurity(s,now).drone.enabled?founderDroneCapacity(s):0;
