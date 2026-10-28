import {AGENT_CLEARANCE,infiltrationSolids,targetBounds,type Asset,type TargetSnapshot,type Vec,type Operation} from './infiltration';
import {pointClear,segmentClear,findPathToAny} from './navigation';
import {troopCombat,wallBalance,wallHealth,isCurrentCombat} from './combat-balance';
import {wallApproach} from './wall-approach';
import type {SquadAgent} from './squad-infiltration';
export const reliableCombat=(o:Operation)=>o.squad?.behaviorVersion===1&&isCurrentCombat(o);
const distance=(a:Vec,b:Vec)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function canFireAt(t:TargetSnapshot,asset:Asset,from:Vec,range:number){
 const gap=Math.hypot(Math.max(0,Math.abs(from[0]-asset.position[0])-asset.size[0]/2),Math.max(0,Math.abs(from[1]-asset.position[1])-asset.size[1]/2));
 return gap<=range+1e-7&&pointClear(from,infiltrationSolids(t),targetBounds(t),AGENT_CLEARANCE)&&segmentClear(from,asset.position,infiltrationSolids({...t,assets:t.assets.filter(v=>v.id!==asset.id)}),targetBounds(t),.05);
}
/** Spatial samples scale with perimeter, never with a maximum attacker count.
 * Occupancy is a preference, not an exclusive reservation. Already legal firing
 * positions are retained even when another robot is nearby. */
export function firingApproach(t:TargetSnapshot,asset:Asset,from:Vec,range:number,occupied:Vec[]=[]){
 if(canFireAt(t,asset,from,range))return {point:[...from] as Vec,path:[] as Vec[],length:0};
 const [x,z]=asset.position,[w,d]=asset.size,points:Vec[]=[];
 for(const padding of [Math.max(AGENT_CLEARANCE+.08,range-.15),AGENT_CLEARANCE+.2]){
  for(let i=0,n=Math.ceil(w/.8);i<=n;i++){const px=x-w/2+w*i/n;points.push([px,z+d/2+padding],[px,z-d/2-padding]);}
  for(let i=0,n=Math.ceil(d/.8);i<=n;i++){const pz=z-d/2+d*i/n;points.push([x+w/2+padding,pz],[x-w/2-padding,pz]);}
 }
 const penalty=(p:Vec)=>occupied.reduce((v,q)=>v+Math.max(0,.75-distance(p,q)),0);
 const candidates=points.filter(p=>canFireAt(t,asset,p,range)).map(point=>({point,direct:distance(from,point),spacing:penalty(point)})).sort((a,b)=>a.direct+a.spacing-b.direct-b.spacing);
 // Most approaches are direct; retain that inexpensive exact path.
 const first=candidates[0];if(!first)return undefined;
 if(segmentClear(from,first.point,infiltrationSolids(t),targetBounds(t),AGENT_CLEARANCE))return {point:first.point,path:[from,first.point],length:first.direct};
 const path=findPathToAny(from,candidates.map(c=>({point:c.point,penalty:c.spacing})),infiltrationSolids(t),targetBounds(t),AGENT_CLEARANCE);
 if(!path.length)return undefined;let length=0,last=from;for(const p of path){length+=distance(last,p);last=p;}return {point:path.at(-1)!,path,length};
}
/** Compare actual walking time with a useful wall-free corridor plus remaining
 * durability of every wall intersecting that corridor. Only the first reachable
 * barrier is assigned; destruction invalidates the plan and reveals the next. */
export function tacticalRoute(o:Operation,t:TargetSnapshot,asset:Asset,a:SquadAgent,occupied:Vec[]=[]){
 const troop=troopCombat(o,a.troop),around=firingApproach(t,asset,a.position,troop.range,occupied);
 if(around?.length===0||!t.walls?.length)return {around};
 const free=firingApproach({...t,walls:[]},asset,a.position,troop.range,occupied);if(!free)return {around};
 const surface:Vec=[Math.max(asset.position[0]-asset.size[0]/2,Math.min(asset.position[0]+asset.size[0]/2,free.point[0])),Math.max(asset.position[1]-asset.size[1]/2,Math.min(asset.position[1]+asset.size[1]/2,free.point[1]))];
 const walls=t.walls.filter(w=>!segmentClear(free.point,surface,[w],targetBounds(t),.05)||free.path.some((p,i)=>i>0&&!segmentClear(free.path[i-1],p,[w],targetBounds(t),AGENT_CLEARANCE)));
 if(!walls.length)return {around};
 const breakSeconds=walls.reduce((seconds,w)=>{const hp=Math.max(0,wallHealth(o,w.id)-(o.squad!.wallDamage[w.id]??0));return seconds+(a.troop==='breacher'?Math.ceil(hp/(troop.damage*troop.wallMultiplier))*troop.intervalMs/1000:hp/((a.troop==='disruptor'?troop.damage*1000/troop.intervalMs:wallBalance(o).breachDps*(o.cipherDamageMultiplier??1))));},0);
 // A ten percent advantage commits a breach, preventing marginal route churn.
 if(around&&free.length/troop.speed+breakSeconds>=around.length/troop.speed*.9)return {around};
 const candidates=walls.slice().sort((x,y)=>distance(a.position,[x.x,x.z])-distance(a.position,[y.x,y.z])||x.id.localeCompare(y.id));
 for(const wall of candidates){const approach=wallApproach(t,wall,a.position);if(!approach)continue;const seconds=(approach.length+Math.max(0,free.length-distance(a.position,approach.point)))/troop.speed+breakSeconds;if(!around||seconds<around.length/troop.speed*.9)return {around,breach:{wall,approach}};}
 return {around};
}
