import {findPath,pointClear} from './navigation';
import {infiltrationSolids,infiltrationPath,targetBounds,type TargetSnapshot,type Vec} from './infiltration';
/** Read-only decoration islands; these never become targets, clearing tasks or gameplay solids. */
export function rivalScenery(t:TargetSnapshot){
 const solids=infiltrationSolids(t),bounds=targetBounds(t),access=t.assets.flatMap(a=>a.access?[a.access]:[]),routes:Vec[][]=[];
 for(const from of [t.entry,t.exit,...access])for(const to of access)routes.push(infiltrationPath(t,from,to));
 for(const drone of t.defenses)for(let i=0;i<drone.route.length;i++)routes.push(findPath(drone.route[i],drone.route[(i+1)%drone.route.length],solids,bounds,1.15));
 const segmentDistance=(p:Vec,a:Vec,b:Vec)=>{const x=b[0]-a[0],z=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*z)/(x*x+z*z||1)));return Math.hypot(p[0]-a[0]-x*u,p[1]-a[1]-z*u);};
 const result:{id:string;kind:'tree'|'rock'|'scrap';position:Vec;variant:number;radius:number}[]=[];
 for(const kind of ['tree','scrap','rock','tree','scrap'] as const){const radius=kind==='tree'?.85:.7;let placed=false;
  for(const [x,z]of [[-11,3],[-11,-1],[-4,-8],[4,-8],[10,-7],[11,3],[-4,4],[0,4],[8,4],[-11,-6],[2,-8],[10,-4],[-6,4],[5,4]] as Vec[]){const p:Vec=[x,z];
   if(!pointClear(p,solids,bounds,radius+.35)||result.some(o=>Math.hypot(x-o.position[0],z-o.position[1])<radius+o.radius+1)||access.some(q=>Math.hypot(x-q[0],z-q[1])<radius+2))continue;
   if(routes.some(path=>path.some((b,i)=>i>0&&segmentDistance(p,path[i-1],b)<radius+1.15)))continue;
   result.push({id:'rival-decoration-'+result.length,kind,position:p,variant:result.length%3,radius});placed=true;break;
  }if(!placed)continue;
 }return result;
}
