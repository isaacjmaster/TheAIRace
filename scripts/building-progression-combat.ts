/** Isolated real authoritative simulations. No database or production services. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {baseFixture} from './combat-balance-scenarios';
import {playerOperation} from '../shared/player-combat';
import {commandSquad,advanceSquad} from '../shared/squad-infiltration';
import {breachRating} from '../shared/breach-rating';
import {buildingStats} from '../shared/building-levels';
import {validDeployment,type Vec} from '../shared/infiltration';
const rows=[];
for(const level of [1,2,3] as const)for(const layout of ['pvp-open','pvp-fortified','pvp-clear-fire-lanes'])for(const style of ['front','heavy-first','light-first','sides','split','scattered'])for(const heavy of [0,2,4]){
 const base=baseFixture(layout);for(const b of base.buildings)b.level=b.id==='station'?1:level;for(const w of base.walls)w.level=level;
 const o=playerOperation('progression',base,{id:layout,name:layout,level,hqLevel:level,influence:0,rank:null,visitable:true},'synthetic-attacker',1000),housing=buildingStats('hangar',level).housing,pulse=housing-heavy*5;
 o.squad!.undeployed=pulse;o.squad!.undeployedBreacher=heavy;
 const orders=[...Array.from({length:heavy},()=> 'breacher' as const),...Array.from({length:pulse},()=> 'pulsewheel' as const)].map((troop,i)=>({troop,at:(style==='heavy-first'&&heavy&&troop==='pulsewheel'||style==='light-first'&&troop==='breacher')?6500:style==='scattered'?1000+i*800:1000,position:(style==='scattered'?[[31,0],[-28,0],[0,-24],[0,28]][i%4]:style==='sides'?[-16.8,(i%5-2)*.7]:style==='split'?[i%2?16.8:-16.8,(i%5-2)*.7]:[(i%5-2)*.7,15.3]) as Vec})).sort((a,b)=>a.at-b.at);
 let i=0;for(let t=1000;t<=181000;t+=100){while(i<orders.length&&orders[i].at<=t&&(o.status==='ready'||o.status==='active')){const order=orders[i++];commandSquad(o,{action:'deploy',troop:order.troop,position:validDeployment(o.target,order.position)?order.position:o.target.entry},t);}advanceSquad(o,t);if(o.status!=='active'&&o.status!=='ready')break;}
 const r=breachRating(o);rows.push({level,layout,style,pulse,heavy,housing,tokens:r.count,destruction:r.destruction,survivors:o.squad!.agents.filter(a=>a.state!=='lost').length,seconds:((o.finishedAt??o.lastTick)-(o.startedAt??1000))/1000,wallsBreached:o.squad!.breachedWalls.length});
}
mkdirSync('output/Building_Progression',{recursive:true});writeFileSync('output/Building_Progression/combat-results.json',JSON.stringify({note:'162 deterministic authoritative scripts; synthetic layouts, not human win rates. L1 army20, L2 army25, L3 army30. No research multiplier. L1 one drone, L2/3 HQ drone entitlement.',rows},null,2));console.log(JSON.stringify(rows));
