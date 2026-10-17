import {FOUNDATION_BUILDINGS,getHangar,buildingLayout,type FoundationState} from '../../shared/foundation';
import {OBSTACLES} from '../../shared/campus-layout';
export type WalkPoint=[number,number,number];
export const bayPosition=(slot:number):WalkPoint=>[-1.46+(slot%5)*.73,.44,slot<5?-.65:.65];
export function localPoint(position:number[],orientation:number,p:WalkPoint):WalkPoint{const a=orientation*Math.PI/2;return [position[0]+p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],position[1]-p[0]*Math.sin(a)+p[2]*Math.cos(a)];}
/** Small presentation-only grid search, outside building footprints; never affects army logic. */
export function dockingRoute(s:FoundationState,slot:number):WalkPoint[]{
 const f=s.fabricator,h=getHangar(s);if(!f||!h)return [];const start=localPoint(f.position,f.orientation??0,[0,-.1,2.5]),end=localPoint(h.position,h.orientation??0,[0,-.1,2.5]);
 const blocked=(x:number,z:number)=>FOUNDATION_BUILDINGS.some(kind=>{const l=buildingLayout(s,kind);if(!l)return false;let [w,d]=kind==='hq'?[9,8]:kind==='station'?[2.7,1.8]:[4,3];if(l.orientation%2)[w,d]=[d,w];const offset=kind==='hq'?localPoint(l.position,l.orientation,[0,0,.6]):[...l.position];return Math.abs(x-offset[0])<w/2+.22&&Math.abs(z-offset[kind==='hq'?2:1])<d/2+.22;})||OBSTACLES.some(o=>(o.kind==='rock'||!s.landscape&&o.kind==='tree')&&Math.abs(x-o.position[0])<o.width/2+.15&&Math.abs(z-o.position[1])<o.depth/2+.15)||(s.landscape?.items||[]).some(o=>Math.abs(x-o.position[0])<(o.kind==='tree'?2:1.5)+.15&&Math.abs(z-o.position[1])<(o.kind==='tree'?2:1.5)+.15);
 if(blocked(Math.round(start[0]),Math.round(start[2]))||blocked(Math.round(end[0]),Math.round(end[2])))return [];
 const key=(x:number,z:number)=>x+','+z,from=key(Math.round(start[0]),Math.round(start[2])),to=key(Math.round(end[0]),Math.round(end[2])),queue=[from],previous=new Map<string,string|null>([[from,null]]);
 for(let i=0;i<queue.length&&!previous.has(to);i++){const [x,z]=queue[i].split(',').map(Number);for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){const a=x+dx,b=z+dz,k=key(a,b);if(a< -24||a>28||b< -19||b>24||previous.has(k)||blocked(a,b))continue;previous.set(k,queue[i]);queue.push(k);}}
 if(!previous.has(to))return [];
 const path:WalkPoint[]=[];for(let k:string|null=to;k;k=previous.get(k)??null){const [x,z]=k.split(',').map(Number);path.unshift([x,z>7.1&&z<10.9?.06:-.1,z]);}
 return [localPoint(f.position,f.orientation??0,[0,.99,.08]),start,...path,end,localPoint(h.position,h.orientation??0,bayPosition(slot))];
}
export class BotArrivals{
 private previous?:{count:number;training:number[];generation:number;layout:string};
 sync(s:FoundationState,now:number,reset=false){
 const count=(s.bots||0)+(!s.botRaid?.settled?(s.botRaid?.simulation.stock.scrap||0):0),training=[...(s.training||[])],generation=s.generation||0,layout=JSON.stringify([s.fabricator,getHangar(s)]),old=this.previous;
 this.previous={count,training,generation,layout};
 if(reset||!old||old.generation!==generation||old.layout!==layout||count<=old.count)return [];
 const due=old.training.filter(t=>t<=now&&!training.includes(t)).length,n=Math.min(10,count-old.count,due);
 return Array.from({length:n},(_,i)=>count-n+i);
 }
}

/** Presentation-only delivery kinematics. Never reads/writes bot inventory or simulation state. */
export class DeliveryMotion{
 x:number;y:number;z:number;segment=1;speed=0;arrived=false;private suffix:number[];
 constructor(readonly route:readonly WalkPoint[]){[this.x,this.y,this.z]=route[0];this.suffix=Array(route.length).fill(0);for(let i=route.length-2;i>=0;i--)this.suffix[i]=this.suffix[i+1]+Math.hypot(route[i+1][0]-route[i][0],route[i+1][1]-route[i][1],route[i+1][2]-route[i][2]);}
 get remaining(){const p=this.route[this.segment];return p?Math.hypot(p[0]-this.x,p[1]-this.y,p[2]-this.z)+this.suffix[this.segment]:0;}
 advance(dt:number,maxTravel=Infinity){if(this.arrived)return;dt=Math.min(.1,Math.max(0,dt));if(!dt)return;const goal=Math.min(2.6,Math.sqrt(10*this.remaining),maxTravel/dt),change=goal-this.speed;this.speed+=Math.max(-7*dt,Math.min(7*dt,change));let travel=Math.min(this.speed*dt,Math.max(0,maxTravel));while(travel>0&&this.segment<this.route.length){const p=this.route[this.segment],distance=Math.hypot(p[0]-this.x,p[1]-this.y,p[2]-this.z);if(distance<=travel){[this.x,this.y,this.z]=p;travel-=distance;this.segment++;}else{const a=travel/distance;this.x+=(p[0]-this.x)*a;this.y+=(p[1]-this.y)*a;this.z+=(p[2]-this.z)*a;travel=0;}}if(this.remaining<.012){[this.x,this.y,this.z]=this.route[this.route.length-1];this.segment=this.route.length;this.arrived=true;this.speed=0;}}
}
