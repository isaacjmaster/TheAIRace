/** Shared deterministic clearance-aware navigation. No rendered geometry or player state mutations. */
export type NavPoint=[number,number];
export type NavRect={x:number;z:number;w:number;d:number};
export type NavBounds={minX:number;maxX:number;minZ:number;maxZ:number};
export function pointClear(p:NavPoint,rects:readonly NavRect[],bounds:NavBounds,radius:number){return p.every(Number.isFinite)&&p[0]>=bounds.minX+radius&&p[0]<=bounds.maxX-radius&&p[1]>=bounds.minZ+radius&&p[1]<=bounds.maxZ-radius&&!rects.some(r=>Math.abs(p[0]-r.x)<r.w/2+radius-1e-7&&Math.abs(p[1]-r.z)<r.d/2+radius-1e-7);}
/** Segment/AABB slab test, expanded by the complete moving body's radius. */
export function segmentClear(a:NavPoint,b:NavPoint,rects:readonly NavRect[],bounds:NavBounds,radius:number){if(!pointClear(a,rects,bounds,radius)||!pointClear(b,rects,bounds,radius))return false;for(const r of rects){let lo=0,hi=1;for(const [axis,center,half] of [[0,r.x,r.w/2+radius-1e-7],[1,r.z,r.d/2+radius-1e-7]]){const delta=b[axis]-a[axis],min=center-half,max=center+half;if(Math.abs(delta)<1e-10){if(a[axis]<=min||a[axis]>=max){lo=2;break;}}else{let t0=(min-a[axis])/delta,t1=(max-a[axis])/delta;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>=hi){lo=2;break;}}}if(lo<hi&&lo<1&&hi>0)return false;}return true;}
export function nearestOpen(p:NavPoint,rects:readonly NavRect[],bounds:NavBounds,radius:number,step=.5,maxDistance=20):NavPoint|undefined{if(pointClear(p,rects,bounds,radius))return [...p];const origin=p.map(v=>Math.round(v/step)*step) as NavPoint;for(let n=1;n<=Math.ceil(maxDistance/step);n++){const candidates:NavPoint[]=[];for(let dx=-n;dx<=n;dx++)for(const dz of [-n,n])candidates.push([origin[0]+dx*step,origin[1]+dz*step]);for(let dz=-n+1;dz<n;dz++)for(const dx of [-n,n])candidates.push([origin[0]+dx*step,origin[1]+dz*step]);candidates.sort((a,b)=>Math.hypot(a[0]-p[0],a[1]-p[1])-Math.hypot(b[0]-p[0],b[1]-p[1]));for(const q of candidates)if(pointClear(q,rects,bounds,radius))return q;}return undefined;}
export function smoothPath(points:NavPoint[],rects:readonly NavRect[],bounds:NavBounds,radius:number){if(!points.length)return [];const out:NavPoint[]=[[...points[0]]];let i=0;while(i<points.length-1){let j=points.length-1;while(j>i+1&&!segmentClear(points[i],points[j],rects,bounds,radius))j--;out.push([...points[j]]);i=j;}return out;}
// Bounded, geometry-keyed cache of adjacent-cell clearance and exhausted components;
// target choice, path costs, tie order and dynamic approach points are unchanged.
const navSteps=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] as const;
type GridCache={edges:Map<number,boolean>;components:Map<number,number>;nextComponent:number};
const gridClearance=new Map<string,GridCache>();
function clearanceCache(rects:readonly NavRect[],bounds:NavBounds,radius:number,step:number){
 const key=JSON.stringify([bounds,radius,step,rects.map(r=>[r.x,r.z,r.w,r.d])]);
 let cache=gridClearance.get(key);if(!cache){cache={edges:new Map(),components:new Map(),nextComponent:1};if(gridClearance.size>=8)gridClearance.delete(gridClearance.keys().next().value!);gridClearance.set(key,cache);}return cache;
}
export function findPath(from:NavPoint,to:NavPoint,rects:readonly NavRect[],bounds:NavBounds,radius=.35,step=.5):NavPoint[]{if(!pointClear(from,rects,bounds,radius)||!pointClear(to,rects,bounds,radius))return [];if(segmentClear(from,to,rects,bounds,radius))return [[...from],[...to]];
 const minX=Math.floor(bounds.minX/step)-2,minZ=Math.floor(bounds.minZ/step)-2,width=Math.ceil(bounds.maxX/step)-minX+3,height=Math.ceil(bounds.maxZ/step)-minZ+3;
 const key=(p:NavPoint)=>(p[1]-minZ)*width+p[0]-minX,grid=clearanceCache(rects,bounds,radius,step),clearance=grid.edges;
 const clearEdge=(a:NavPoint,b:NavPoint,direction:number)=>{const edge=key(a)*8+direction;let clear=clearance.get(edge);if(clear===undefined){clear=segmentClear([a[0]*step,a[1]*step],[b[0]*step,b[1]*step],rects,bounds,radius);if(clearance.size<100000)clearance.set(edge,clear);}return clear;};
 const snap=(p:NavPoint)=>{const origin=p.map(v=>Math.round(v/step)) as NavPoint;const choices:NavPoint[]=[];for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)choices.push([origin[0]+x,origin[1]+z]);choices.sort((a,b)=>Math.hypot(a[0]*step-p[0],a[1]*step-p[1])-Math.hypot(b[0]*step-p[0],b[1]*step-p[1]));return choices.find(q=>segmentClear(p,[q[0]*step,q[1]*step],rects,bounds,radius));},start=snap(from),end=snap(to);if(!start||!end)return [];
 // A failed search exhausts its entire connected grid component. Remembering
 // that component proves disconnection without repeating A* for each attack
 // surface candidate. Exact geometry/radius/step keys invalidate this on breach.
 const startComponent=grid.components.get(key(start)),endComponent=grid.components.get(key(end));
 if((startComponent!==undefined||endComponent!==undefined)&&startComponent!==endComponent)return [];
 const endKey=key(end),size=width*height,prev=new Int32Array(size).fill(-2),cost=new Float64Array(size).fill(Infinity),closed=new Uint8Array(size);prev[key(start)]=-1;cost[key(start)]=0;
 type Item={p:NavPoint;score:number;cost:number};const heap:Item[]=[];const push=(v:Item)=>{heap.push(v);let i=heap.length-1;while(i){const parent=(i-1)>>1;if(heap[parent].score<=v.score)break;heap[i]=heap[parent];i=parent;}heap[i]=v;};const pop=()=>{const v=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].score<heap[c].score)c++;if(heap[c].score>=last.score)break;heap[i]=heap[c];i=c;}heap[i]=last;}return v;};push({p:start,score:0,cost:0});
 while(heap.length){const item=pop(),k=key(item.p);if(closed[k]!==0)continue;if(k===endKey)break;closed[k]=1;for(let direction=0;direction<8;direction++){const [dx,dz]=navSteps[direction];const q:NavPoint=[item.p[0]+dx,item.p[1]+dz],qk=key(q),next=item.cost+(direction<4?1:Math.SQRT2);if(closed[qk]!==0||next>=cost[qk]||!clearEdge(item.p,q,direction))continue;cost[qk]=next;prev[qk]=k;push({p:q,cost:next,score:next+Math.hypot(q[0]-end[0],q[1]-end[1])});}}
 if(prev[endKey]===-2){const component=grid.nextComponent++;for(let k=0;k<closed.length;k++)if(closed[k])grid.components.set(k,component);return [];}const path:NavPoint[]=[];for(let k=endKey;k!==-1;k=prev[k])path.unshift([(k%width+minX)*step,(Math.floor(k/width)+minZ)*step]);return smoothPath([[...from],...path,[...to]],rects,bounds,radius);
}
/** One A* search for a set of legal firing positions. Unlike serial endpoint
 * searches, a distant wall opening is explored once for the entire perimeter. */
export function findPathToAny(from:NavPoint,goals:{point:NavPoint;penalty:number}[],rects:readonly NavRect[],bounds:NavBounds,radius=.35,step=.5):NavPoint[]{
 if(!goals.length||!pointClear(from,rects,bounds,radius))return [];
 const minX=Math.floor(bounds.minX/step)-2,minZ=Math.floor(bounds.minZ/step)-2,width=Math.ceil(bounds.maxX/step)-minX+3,height=Math.ceil(bounds.maxZ/step)-minZ+3,key=(p:NavPoint)=>(p[1]-minZ)*width+p[0]-minX;
 const world=(k:number):NavPoint=>[(k%width+minX)*step,(Math.floor(k/width)+minZ)*step];
 const snap=(p:NavPoint)=>{const center=p.map(v=>Math.round(v/step)) as NavPoint,choices:NavPoint[]=[];for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)choices.push([center[0]+x,center[1]+z]);return choices.filter(q=>segmentClear(p,[q[0]*step,q[1]*step],rects,bounds,radius)).sort((a,b)=>Math.hypot(a[0]*step-p[0],a[1]*step-p[1])-Math.hypot(b[0]*step-p[0],b[1]*step-p[1]));};
 const start=snap(from)[0];if(!start)return [];const ends=new Map<number,{point:NavPoint;penalty:number;tail:number}>();
 for(const goal of goals)for(const p of snap(goal.point)){const k=key(p),tail=Math.hypot(p[0]*step-goal.point[0],p[1]*step-goal.point[1]),old=ends.get(k);if(!old||tail+goal.penalty<old.tail+old.penalty)ends.set(k,{...goal,tail});}if(!ends.size)return [];
 // Distance to the goal envelope is admissible and constant-time; evaluating
 // every perimeter goal for every explored cell caused large swarm-planning spikes.
 let goalMinX=Infinity,goalMaxX=-Infinity,goalMinZ=Infinity,goalMaxZ=-Infinity,minPenalty=Infinity;
 for(const goal of goals){goalMinX=Math.min(goalMinX,goal.point[0]);goalMaxX=Math.max(goalMaxX,goal.point[0]);goalMinZ=Math.min(goalMinZ,goal.point[1]);goalMaxZ=Math.max(goalMaxZ,goal.point[1]);minPenalty=Math.min(minPenalty,goal.penalty);}
 const heuristic=(p:NavPoint)=>{const x=p[0]*step,z=p[1]*step,dx=Math.max(0,goalMinX-x,x-goalMaxX),dz=Math.max(0,goalMinZ-z,z-goalMaxZ);return Math.sqrt(dx*dx+dz*dz)+minPenalty;};
 type Item={k:number;p:NavPoint;score:number;cost:number};const heap:Item[]=[];
 const push=(v:Item)=>{heap.push(v);let i=heap.length-1;while(i){const j=(i-1)>>1;if(heap[j].score<=v.score)break;heap[i]=heap[j];i=j;}heap[i]=v;};
 const pop=()=>{const v=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].score<heap[j].score)j++;if(heap[j].score>=last.score)break;heap[i]=heap[j];i=j;}heap[i]=last;}return v;};
 const size=width*height,prev=new Int32Array(size).fill(-2),cost=new Float64Array(size).fill(Infinity),closed=new Uint8Array(size),grid=clearanceCache(rects,bounds,radius,step);prev[key(start)]=-1;cost[key(start)]=0;push({k:key(start),p:start,cost:0,score:heuristic(start)});let best=Infinity,endKey=-1,endpoint:NavPoint|undefined;
 while(heap.length){const item=pop(),k=item.k;if(item.score>=best)break;if(closed[k])continue;closed[k]=1;const end=ends.get(k);if(end&&item.cost+end.tail+end.penalty<best){best=item.cost+end.tail+end.penalty;endKey=k;endpoint=end.point;}
  for(let direction=0;direction<8;direction++){const [dx,dz]=navSteps[direction],p:NavPoint=[item.p[0]+dx,item.p[1]+dz],q=key(p),next=item.cost+(direction<4?step:step*Math.SQRT2);if(q<0||q>=size||closed[q]||next>=cost[q])continue;const edge=k*8+direction;let clear=grid.edges.get(edge);if(clear===undefined){clear=segmentClear(world(k),world(q),rects,bounds,radius);if(grid.edges.size<100000)grid.edges.set(edge,clear);}if(!clear)continue;prev[q]=k;cost[q]=next;push({k:q,p,cost:next,score:next+heuristic(p)});}
 }
 if(endKey<0)return [];const path:NavPoint[]=[];for(let k=endKey;k!==-1;k=prev[k])path.unshift(world(k));return smoothPath([[...from],...path,[...endpoint!]],rects,bounds,radius);
}
