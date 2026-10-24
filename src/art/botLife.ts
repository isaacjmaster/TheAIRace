import {findPath,type NavRect} from '../../shared/navigation';
import {hangarBay} from '../../shared/bot-presentation';
import {footprint} from '../../shared/foundation';
import {obstacleSize,campusSecurityWalls} from '../../shared/landscape';
import {FOUNDATION_PLOT as P} from '../../shared/foundation-plot';
import {decorationFootprint} from '../../shared/decoration-catalog';
import {FOUNDATION_BUILDINGS,getHangar,buildingLayout,type FoundationState} from '../../shared/foundation';
import {OBSTACLES} from '../../shared/campus-layout';
export type WalkPoint=[number,number,number];
export const bayPosition=hangarBay;
export function localPoint(position:number[],orientation:number,p:WalkPoint):WalkPoint{const a=orientation*Math.PI/2;return [position[0]+p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],position[1]-p[0]*Math.sin(a)+p[2]*Math.cos(a)];}
/** Small presentation-only grid search, outside building footprints; never affects army logic. */
export function dockingRoute(s:FoundationState,slot:number):WalkPoint[]{
 const f=s.fabricator,h=getHangar(s);if(!f||!h)return [];const expanded=h.size==='expanded',start=localPoint(f.position,f.orientation??0,[0,.05,2.5]),end=localPoint(h.position,h.orientation??0,[0,.05,expanded?3:2.5]);
 const rects:NavRect[]=FOUNDATION_BUILDINGS.flatMap(kind=>{const l=buildingLayout(s,kind);return l?[footprint(kind,l)]:[]});for(const o of OBSTACLES.filter(o=>o.kind==='rock'||!s.landscape&&o.kind==='tree'))rects.push({x:o.position[0],z:o.position[1],w:o.width,d:o.depth});for(const o of s.landscape?.items??[]){const [w,d]=obstacleSize(o);rects.push({x:o.position[0],z:o.position[1],w,d});}for(const o of s.decorations??[])rects.push(decorationFootprint(o));rects.push(...campusSecurityWalls(s));
 const path=findPath([start[0],start[2]],[end[0],end[2]],rects,P,.46,1);if(!path.length)return [];
 return [localPoint(f.position,f.orientation??0,[0,.99,.08]),localPoint(f.position,f.orientation??0,[0,.43,1.45]),start,...path.slice(1).map(([x,z]):WalkPoint=>[x,.05,z]),end,localPoint(h.position,h.orientation??0,bayPosition(slot,expanded))];
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
