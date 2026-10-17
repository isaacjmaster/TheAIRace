import {FOUNDATION_BUILDINGS,buildingLayout,type FoundationState} from '../../shared/foundation';
import {OBSTACLES} from '../../shared/campus-layout';
export type WalkPoint=[number,number,number];
export const bayPosition=(slot:number):WalkPoint=>[-1.46+(slot%5)*.73,.44,slot<5?-.65:.65];
export function localPoint(position:number[],orientation:number,p:WalkPoint):WalkPoint{const a=orientation*Math.PI/2;return [position[0]+p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],position[1]-p[0]*Math.sin(a)+p[2]*Math.cos(a)];}
/** Small presentation-only grid search, outside building footprints; never affects army logic. */
export function dockingRoute(s:FoundationState,slot:number):WalkPoint[]{
 const f=s.fabricator;if(!f)return [];const start=localPoint(f.position,f.orientation??0,[0,.12,2.5]),end=localPoint(f.hangarPosition,f.hangarOrientation??0,[0,.12,2.5]);
 const blocked=(x:number,z:number)=>FOUNDATION_BUILDINGS.some(kind=>{const l=buildingLayout(s,kind);if(!l)return false;let [w,d]=kind==='hq'?[9,8]:kind==='station'?[2.7,1.8]:[4,3];if(l.orientation%2)[w,d]=[d,w];const offset=kind==='hq'?localPoint(l.position,l.orientation,[0,0,.6]):[...l.position];return Math.abs(x-offset[0])<w/2+.22&&Math.abs(z-offset[kind==='hq'?2:1])<d/2+.22;})||OBSTACLES.some(o=>(o.kind==='tree'||o.kind==='rock')&&Math.abs(x-o.position[0])<o.width/2+.15&&Math.abs(z-o.position[1])<o.depth/2+.15);
 if(blocked(Math.round(start[0]),Math.round(start[2]))||blocked(Math.round(end[0]),Math.round(end[2])))return [];
 const key=(x:number,z:number)=>x+','+z,from=key(Math.round(start[0]),Math.round(start[2])),to=key(Math.round(end[0]),Math.round(end[2])),queue=[from],previous=new Map<string,string|null>([[from,null]]);
 for(let i=0;i<queue.length&&!previous.has(to);i++){const [x,z]=queue[i].split(',').map(Number);for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){const a=x+dx,b=z+dz,k=key(a,b);if(a< -29||a>33||b< -24||b>29||previous.has(k)||blocked(a,b))continue;previous.set(k,queue[i]);queue.push(k);}}
 if(!previous.has(to))return [];
 const path:WalkPoint[]=[];for(let k:string|null=to;k;k=previous.get(k)??null){const [x,z]=k.split(',').map(Number);path.unshift([x,.12,z]);}
 return [localPoint(f.position,f.orientation??0,[0,.99,.08]),start,...path,end,localPoint(f.hangarPosition,f.hangarOrientation??0,bayPosition(slot))];
}
export class BotArrivals{
 private previous?:{count:number;training:number[];generation:number;layout:string};
 sync(s:FoundationState,now:number,reset=false){
 const count=(s.bots||0)+(!s.botRaid?.settled?(s.botRaid?.simulation.stock.scrap||0):0),training=[...(s.training||[])],generation=s.generation||0,layout=JSON.stringify(s.fabricator),old=this.previous;
 this.previous={count,training,generation,layout};
 if(reset||!old||old.generation!==generation||old.layout!==layout||count<=old.count)return [];
 const due=old.training.filter(t=>t<=now&&!training.includes(t)).length,n=Math.min(10,count-old.count,due);
 return Array.from({length:n},(_,i)=>count-n+i);
 }
}
