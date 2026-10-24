import type {BuildingLayout} from './foundation';
import type {SecurityBarrier} from './security-walls';
export const CYBERSECURITY={wall:{cost:10,length:2,depth:.5,maxSegments:200},station:{cost:200,buildSeconds:60,maxCount:1,width:3,depth:3}} as const;
export type OwnedWall=BuildingLayout&{id:string};
export function wallFootprint(w:Pick<OwnedWall,'position'|'orientation'>){return {x:w.position[0],z:w.position[1],w:w.orientation%2?.5:2,d:w.orientation%2?2:.5};}
export function ownedSecurityWalls(s:{walls?:OwnedWall[]}):SecurityBarrier[]{return (s.walls??[]).map(w=>({...wallFootprint(w),id:w.id,height:1.2}));}
export function wallEnds(w:Pick<OwnedWall,'position'|'orientation'>){const [x,z]=w.position;return w.orientation%2?[[x,z-1],[x,z+1]]:[[x-1,z],[x+1,z]];}
