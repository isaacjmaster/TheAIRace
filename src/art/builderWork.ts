import {founderHQWorkSites,buildingLayout,footprint,FOUNDATION_BUILDINGS,type FoundationState,type RigPosition} from '../../shared/foundation';
import {landscapeRoute,door} from '../../shared/landscape';
export type BuilderWork={key:string;center:RigPosition;positions:RigPosition[];routes:RigPosition[][]};
const activeKind=(s:FoundationState,now:number)=>s.hqUpgrade&&now<s.hqUpgrade.completesAt?'hq':(['rig','rig2','fabricator','hangar'] as const).find(k=>{const b=k==='hangar'?s.hangar:s[k];return b&&now<b.completesAt;});
export function constructionSignature(s:FoundationState,now:number){const kind=activeKind(s,now);return !kind||!buildingLayout(s,'station')||s.landscape?.clearing?'':JSON.stringify([kind,(kind==='hq'?s.hqUpgrade:kind==='hangar'?s.hangar:s[kind])?.completesAt,buildingLayout(s,kind),s.stationLayout,s.decorations,s.landscape?.items.map(o=>o.id),FOUNDATION_BUILDINGS.map(k=>buildingLayout(s,k))]);}
/** Reuse obstacle-clearing BFS and the existing rotated footprints. Only reachable work sites qualify. */
export function constructionWork(s:FoundationState,now:number):BuilderWork|undefined{
 if(!buildingLayout(s,'station')||s.landscape?.clearing)return;
 const kind=activeKind(s,now);if(!kind)return;
 const layout=buildingLayout(s,kind)!,a=footprint(kind,layout),candidates:RigPosition[]=[[Math.round(a.x),Math.ceil(a.z+a.d/2+1)],[Math.ceil(a.x+a.w/2+1),Math.round(a.z)],[Math.round(a.x),Math.floor(a.z-a.d/2-1)],[Math.floor(a.x-a.w/2-1),Math.round(a.z)]];
 const positions=kind==='hq'?founderHQWorkSites(s):candidates.filter(p=>landscapeRoute(s,p,undefined,1.1).length);if(!positions.length)return {key:constructionSignature(s,now),center:layout.position,positions:[],routes:[]};
 const routes:RigPosition[][]=[];routes.push(landscapeRoute(s,positions[0],undefined,1.1));for(let i=1;i<=positions.length;i++)routes.push(landscapeRoute(s,positions[i%positions.length],positions[(i-1)%positions.length],1.1));
 return {key:constructionSignature(s,now),center:layout.position,positions,routes};
}
export function builderReturn(s:FoundationState,from:RigPosition){const station=buildingLayout(s,'station');if(!station)return [];const path=landscapeRoute(s,door(s,'station'),from,1.1);return path.length?[...path,station.position]:[];}
