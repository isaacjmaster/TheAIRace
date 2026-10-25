import type {BuildingLayout} from './foundation';
import type {SecurityBarrier} from './security-walls';
export const CYBERSECURITY={wall:{cost:10,length:1,depth:1,maxSegments:100},station:{cost:200,buildSeconds:60,maxCount:1,width:3,depth:3}} as const;
export type OwnedWall=BuildingLayout&{id:string;legacy?:boolean};
export function wallFootprint(w:Pick<OwnedWall,'position'|'orientation'|'legacy'>){return {x:w.position[0],z:w.position[1],w:w.legacy?(w.orientation%2?.5:2):1,d:w.legacy?(w.orientation%2?2:.5):1};}
export function ownedSecurityWalls(s:{walls?:OwnedWall[]}):SecurityBarrier[]{return (s.walls??[]).map(w=>({...wallFootprint(w),id:w.id,height:1.2}));}
export function wallEnds(w:Pick<OwnedWall,'position'|'orientation'|'legacy'>){const [x,z]=w.position;const r=w.legacy?1:.5;return w.orientation%2?[[x,z-r],[x,z+r]]:[[x-r,z],[x+r,z]];}
