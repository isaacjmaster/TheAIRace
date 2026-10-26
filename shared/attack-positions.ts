import {AGENT_CLEARANCE,infiltrationPath,infiltrationSolids,type Asset,type TargetSnapshot,type Vec} from './infiltration';
import {segmentClear} from './navigation';
import {targetBounds} from './infiltration';
export function attackPositions(asset:Asset,p=AGENT_CLEARANCE+.2):Vec[]{const [x,z]=asset.position,[w,d]=asset.size;const points:Vec[]=[];for(const t of [0,-.32,.32])points.push([x+w*t,z+d/2+p],[x+w*t,z-d/2-p],[x+w/2+p,z+d*t],[x-w/2-p,z+d*t]);return points;}
export function attackApproach(t:TargetSnapshot,asset:Asset,from:Vec,occupied:Vec[]=[],range?:number){
 // Ranged units may hold a valid firing position; walls still block the shot.
 const gap=Math.hypot(Math.max(0,Math.abs(from[0]-asset.position[0])-asset.size[0]/2),Math.max(0,Math.abs(from[1]-asset.position[1])-asset.size[1]/2));
 const points=range?[...(gap<=range&&gap>=AGENT_CLEARANCE?[from]:[]),...attackPositions(asset,range-.15),...attackPositions(asset)]:attackPositions(asset);
 const firingSolids=range?infiltrationSolids({...t,assets:t.assets.filter(a=>a.id!==asset.id)}):(t.walls??[]);
 const candidates=points.filter(p=>occupied.every(q=>Math.hypot(p[0]-q[0],p[1]-q[1])>.7)&&segmentClear(p,asset.position,firingSolids,targetBounds(t),.05)).sort((a,b)=>Math.hypot(a[0]-from[0],a[1]-from[1])-Math.hypot(b[0]-from[0],b[1]-from[1]));
 let best:{point:Vec;path:Vec[];length:number}|undefined;
 for(const point of candidates){const direct=Math.hypot(point[0]-from[0],point[1]-from[1]);if(best&&direct>best.length+.01)continue;const path=infiltrationPath(t,from,point);if(!path.length)continue;let length=0,previous=from;for(const q of path){length+=Math.hypot(q[0]-previous[0],q[1]-previous[1]);previous=q;}if(!best||length<best.length)best={point,path,length};}return best;
}
