import type {NavRect} from './navigation';
import type {TargetSnapshot,Vec} from './infiltration';
export function protectedAreas(t:TargetSnapshot):NavRect[]{
 if(!t.publicBase)return [];
 const a=t.assets;if(!a.length)return [];
 const minX=Math.min(...a.map(v=>v.position[0]-v.size[0]/2))-2,maxX=Math.max(...a.map(v=>v.position[0]+v.size[0]/2))+2,minZ=Math.min(...a.map(v=>v.position[1]-v.size[1]/2))-2,maxZ=Math.max(...a.map(v=>v.position[1]+v.size[1]/2))+2;
 // Isolated walls protect only their immediate area; they never inflate the whole campus rectangle.
 return [{x:(minX+maxX)/2,z:(minZ+maxZ)/2,w:maxX-minX,d:maxZ-minZ},...(t.walls??[]).map(w=>({x:w.x,z:w.z,w:w.w+2,d:w.d+2})).filter(w=>w.x-w.w/2<minX||w.x+w.w/2>maxX||w.z-w.d/2<minZ||w.z+w.d/2>maxZ)];
}
export const insideProtected=(p:Vec,rects:NavRect[])=>rects.some(r=>Math.abs(p[0]-r.x)<=r.w/2&&Math.abs(p[1]-r.z)<=r.d/2);
/** Split rectangle edges at overlaps, then omit internal edges of the union. */
export function protectedOutline(rects:NavRect[]):number[]{const out:number[]=[];for(const r of rects)for(const axis of [0,1])for(const side of [-1,1]){const fixed=(axis?r.z:r.x)+side*(axis?r.d:r.w)/2,lo=(axis?r.x:r.z)-(axis?r.w:r.d)/2,hi=(axis?r.x:r.z)+(axis?r.w:r.d)/2;const cuts=[lo,hi,...rects.flatMap(v=>[(axis?v.x:v.z)-(axis?v.w:v.d)/2,(axis?v.x:v.z)+(axis?v.w:v.d)/2]).filter(v=>v>lo&&v<hi)].sort((a,b)=>a-b);for(let i=1;i<cuts.length;i++){const a=cuts[i-1],b=cuts[i];if(b-a<.001)continue;const mid=(a+b)/2,p:Vec=axis?[mid,fixed+side*.001]:[fixed+side*.001,mid];if(insideProtected(p,rects))continue;out.push(...(axis?[a,.16,fixed,b,.16,fixed]:[fixed,.16,a,fixed,.16,b]));}}return out;}
