import {AGENT_CLEARANCE,infiltrationPath,targetBounds,type TargetSnapshot,type Vec} from './infiltration';
import {segmentClear,type NavRect} from './navigation';
type Wall=NavRect&{id:string};
/** Test all four physical faces: square wall cells have no meaningful long axis.
 * Paths use the same clearance/obstacles as troop movement. Geometry and tie order
 * are deterministic; callers opt in for new combat versions only. */
export function wallApproach(t:TargetSnapshot,wall:Wall,from:Vec){
 const padding=AGENT_CLEARANCE+.08,clamp=(n:number,c:number,half:number)=>Math.max(c-half+Math.min(.2,half),Math.min(c+half-Math.min(.2,half),n));
 const x=clamp(from[0],wall.x,wall.w/2),z=clamp(from[1],wall.z,wall.d/2);
 const faces:Vec[]=[[x,wall.z+wall.d/2+padding],[x,wall.z-wall.d/2-padding],[wall.x+wall.w/2+padding,z],[wall.x-wall.w/2-padding,z]];
 const otherWalls=(t.walls??[]).filter(w=>w.id!==wall.id),bounds=targetBounds(t);
 const candidates=faces.map((point,index)=>({point,index,direct:Math.hypot(point[0]-from[0],point[1]-from[1])})).sort((a,b)=>a.direct-b.direct||a.index-b.index);
 let best:{point:Vec;path:Vec[];length:number}|undefined;
 for(const {point,direct} of candidates){if(best&&direct>best.length+1e-7)continue;
  if(!segmentClear(point,[wall.x,wall.z],otherWalls,bounds,.05))continue;
  const path=infiltrationPath(t,from,point);if(!path.length)continue;
  let length=0,previous=from;for(const p of path){length+=Math.hypot(p[0]-previous[0],p[1]-previous[1]);previous=p;}
  if(!best||length<best.length-1e-7)best={point,path,length};
 }
 return best;
}
