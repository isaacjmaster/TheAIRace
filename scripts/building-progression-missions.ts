/** Expanded Hangar validation through the production mission simulation, without databases. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {newSquadOperation,commandSquad,advanceSquad} from '../shared/squad-infiltration';
import {breachRating} from '../shared/breach-rating';
import {buildingStats} from '../shared/building-levels';
import {validDeployment,targetBounds,type Vec} from '../shared/infiltration';
const rows=[];
for(const level of [1,2,3] as const)for(const mission of ['lumen-labs','vector-works','prism-systems','orbit-research','apex-compute'])for(const style of ['front','heavy-first','split'])for(const heavy of [0,2,4]){
 const o=newSquadOperation('progression-mission',mission,1000),housing=buildingStats('hangar',level).housing,pulse=housing-heavy*5;
 o.squad!.undeployed=pulse;o.squad!.undeployedBreacher=heavy;
 const bounds=targetBounds(o.target),xs=o.target.assets.flatMap(a=>[a.position[0]-a.size[0]/2,a.position[0]+a.size[0]/2]),zs=o.target.assets.flatMap(a=>[a.position[1]-a.size[1]/2,a.position[1]+a.size[1]/2]);
 for(const w of o.target.walls??[]){xs.push(w.x-w.w/2,w.x+w.w/2);zs.push(w.z-w.d/2,w.z+w.d/2);}
 const left=Math.max(bounds.minX+1,Math.min(...xs)-2.8),right=Math.min(bounds.maxX-1,Math.max(...xs)+2.8),front=Math.min(bounds.maxZ-1,Math.max(...zs)+2.8),middle=(Math.min(...zs)+Math.max(...zs))/2;
 const orders=[...Array.from({length:heavy},()=> 'breacher' as const),...Array.from({length:pulse},()=> 'pulsewheel' as const)].map((troop,i)=>{const candidate:Vec=style==='split'?[i%2?right:left,middle+(i%5-2)*.7]:[(i%5-2)*.7,front];return {troop,at:style==='heavy-first'&&heavy&&troop==='pulsewheel'?6500:1000,position:validDeployment(o.target,candidate)?candidate:[...o.target.entry] as Vec};}).sort((a,b)=>a.at-b.at);
 let index=0,longestStallMs=0;const stalled=new Map<string,number>();
 for(let t=1000;t<=181000;t+=100){const before=new Map(o.squad!.agents.map(a=>[a.id,[...a.position] as Vec]));while(index<orders.length&&orders[index].at<=t&&(o.status==='ready'||o.status==='active')){const order=orders[index++];commandSquad(o,{action:'deploy',troop:order.troop,position:order.position},t);}advanceSquad(o,t);for(const a of o.squad!.agents){const prior=before.get(a.id),idle=a.state==='active'&&(a.mode==='idle'||a.mode==='moving')&&prior&&Math.hypot(a.position[0]-prior[0],a.position[1]-prior[1])<.02;const ms=idle?(stalled.get(a.id)??0)+100:0;stalled.set(a.id,ms);longestStallMs=Math.max(longestStallMs,ms);}if(o.status!=='active'&&o.status!=='ready')break;}
 const r=breachRating(o);rows.push({level,mission,style,pulse,heavy,housing,tokens:r.count,destruction:r.destruction,status:o.status,survivors:o.squad!.agents.filter(a=>a.state!=='lost').length,seconds:((o.finishedAt??o.lastTick)-(o.startedAt??1000))/1000,wallsBreached:o.squad!.breachedWalls.length,longestStallMs,deployed:o.squad!.agents.length,orders});
}
mkdirSync('output/Building_Progression',{recursive:true});writeFileSync('output/Building_Progression/mission-results.json',JSON.stringify({note:'135 deterministic scripts using actual authoritative mission version3. Hangar20/25/30; no research bonus. Synthetic scripted deployment outcomes, not human win rates. Level1 means Hangar1, and may be HQ2 for Breacher access; mission unlocks are not bypassed in live game.',rows},null,2));console.log('Recorded '+rows.length+' mission scenarios.');
