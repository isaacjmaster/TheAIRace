import {getHangar,type FoundationState} from '../../shared/foundation';
import {dockingRoute,localPoint,type WalkPoint} from './botLife';
/** Presentation-only completion detector. Old saves, hidden tabs and inventory returns never spawn deliveries. */
export class BreacherArrivals{
 constructor(private kind:'breacher'|'disruptor'='breacher',private limit=4){}
 private previous?:{count:number;due:number[];generation:number;layout:string};
 sync(s:FoundationState,now:number,reset=false){const count=(this.kind==='disruptor'?s.disruptors:s.breachers)??0,due=(s.training??[]).filter((_,i)=>s.trainingKinds?.[i]===this.kind),generation=s.generation??0,layout=JSON.stringify([s.fabricator,getHangar(s)]),old=this.previous;this.previous={count,due:[...due],generation,layout};if(reset||!old||generation!==old.generation||layout!==old.layout||count<=old.count)return [];const completed=old.due.filter(t=>t<=now&&!due.includes(t)).length,n=Math.min(this.limit,count-old.count,completed);return Array.from({length:n},(_,i)=>count-n+i).filter(slot=>slot<this.limit);}
}
export function breacherHomePose(slot:number,time:number,compound=true){
 const x=(slot%2?1:-1)*(compound?1.72:.85),z=(slot<2?0:1)*(compound?1.95:1.15)+(compound?0:.05);
 // Separate short service lanes: ease into a step, pause, then step back. No crossing paths.
 const phase=((Math.max(0,time)+slot*1.1)%12)/12,move=phase<.25?0:phase<.4?(1-Math.cos((phase-.25)/.15*Math.PI))*.5:phase<.7?1:phase<.85?(1+Math.cos((phase-.7)/.15*Math.PI))*.5:0;
 return {position:[x+(slot%2?-1:1)*(compound?.55:.18)*move,.28,z] as WalkPoint,yaw:phase<.55?(slot%2?-Math.PI/2:Math.PI/2):(slot%2?Math.PI/2:-Math.PI/2)};
}
export function breacherDockingRoute(s:FoundationState,slot:number):WalkPoint[]{const h=getHangar(s),base=dockingRoute(s,slot,.9);if(!h||base.length<4)return [];const compound=h.size==='compound',end=breacherHomePose(slot,0,compound).position;
 // Reuse the established gate-preferring/friendly-wall route. Activate outside the Fabricator,
 // then enter via the Hangar's central ramp before separating into safe service lanes.
 const route=base.slice(2,base.length-(compound?2:1)).map(([x,y,z]):WalkPoint=>[x,y===.05?0:y,z]);return [...route,localPoint(h.position,h.orientation??0,[0,.28,compound?1.95:1.1]),localPoint(h.position,h.orientation??0,[end[0],.28,compound?1.95:1.1]),localPoint(h.position,h.orientation??0,end)];}
