/** Dedicated electronic-warfare fixtures using the production simulator, no accounts or database. */
import {mkdirSync,writeFileSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {baseFixture} from './combat-balance-scenarios';
import {playerOperation} from '../shared/player-combat';
import {advanceSquad,commandSquad} from '../shared/squad-infiltration';
import {validDeployment,type Vec} from '../shared/infiltration';
import {breachRating} from '../shared/breach-rating';
import {DISRUPTOR,ARC_SPIRE} from '../shared/electronic-catalog';
import {TROOPS,type TroopKind} from '../shared/troops';
import {buildingStats,UPGRADE_COSTS,UPGRADE_TIMES,requiredHqLevel,type BuildingKind} from '../shared/building-levels';

const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8)??'five-tier-initial';
const file=`output/Five_Tier_Review/${label}.json`;if(existsSync(file))throw Error('Use a fresh label to preserve measurements');mkdirSync('output/Five_Tier_Review',{recursive:true});
const results=[];
for(const tier of [4,5] as const){const capacity=buildingStats('hangar',tier).housing;
const armies=[{pulsewheel:capacity,breacher:0,disruptor:0},{pulsewheel:0,breacher:capacity/5,disruptor:0},{pulsewheel:capacity-24,breacher:3,disruptor:3},{pulsewheel:capacity-18,breacher:3,disruptor:1}];
for(const layout of ['pvp-open','pvp-clear-fire-lanes','pvp-fortified'])for(const army of armies)for(const strategy of ['clustered','protected','support-first','split'] as const){const withArc=true;
 const base=baseFixture(layout);for(const b of base.buildings)b.level=b.id==='station'?1:tier;for(const w of base.walls)w.level=tier;
 if(withArc)base.buildings.push({id:'arcSpire',position:layout==='pvp-fortified'?[5,2]:[-3,15],orientation:0,level:tier,complete:true});
 const o=playerOperation('electronic-review',base,{id:'synthetic',name:'Synthetic HQ'+tier,hqLevel:tier,level:3,influence:0,rank:null,visitable:true},'synthetic-attacker',1000);
 o.squad!.undeployed=army.pulsewheel;o.squad!.undeployedBreacher=army.breacher;o.squad!.undeployedDisruptor=army.disruptor;
 const units:TroopKind[]=[...Array<TroopKind>(army.breacher).fill('breacher'),...Array<TroopKind>(army.pulsewheel).fill('pulsewheel'),...Array<TroopKind>(army.disruptor).fill('disruptor')];
 const orders=units.map((troop,i)=>{let position:Vec=strategy==='split'?[i%2?-18:18,(i%4)*2]:[-3+(i%4)*.25,21+(i%3)*.25];if(!validDeployment(o.target,position))position=[...o.target.entry];return {troop,position,at:1000+(strategy==='support-first'&&troop!=='disruptor'&&army.disruptor?3500:strategy==='protected'&&troop!=='breacher'&&army.breacher?troop==='disruptor'?1800:1200:0)};}).sort((a,b)=>a.at-b.at);
 let cursor=0,empPulses=0,arcShots=0,arcHits=0,maxChain=0,worstTickMs=0,simulationMs=0,disabledDefenseMs=0,stalledMs=0;
 const taken={pulsewheel:0,breacher:0,disruptor:0},stalls=new Map<string,number>();
 for(let now=1000;now<=181000;now+=100){
  while(cursor<orders.length&&orders[cursor].at<=now&&(o.status==='ready'||o.status==='active')){const order=orders[cursor++];commandSquad(o,{action:'deploy',troop:order.troop,position:order.position},now);}
  const before=new Map(o.squad!.agents.map(a=>[a.id,{health:a.health??0,position:[...a.position] as Vec}]));const began=performance.now();advanceSquad(o,now);const elapsed=performance.now()-began;simulationMs+=elapsed;worstTickMs=Math.max(worstTickMs,elapsed);
  for(const a of o.squad!.agents){if(a.lastEmpAt===now)empPulses++;const prior=before.get(a.id);if(prior){taken[a.troop??'pulsewheel']+=Math.max(0,prior.health-(a.health??0));const stuck=a.state==='active'&&(a.mode==='idle'||a.mode==='moving')&&Math.hypot(a.position[0]-prior.position[0],a.position[1]-prior.position[1])<.02;const duration=stuck?(stalls.get(a.id)??0)+100:0;stalls.set(a.id,duration);stalledMs=Math.max(stalledMs,duration);}}
  for(const a of o.arcSpires??[])if(a.lastShotAt===now){arcShots++;arcHits+=a.chain?.length??0;maxChain=Math.max(maxChain,a.chain?.length??0);}
  disabledDefenseMs+=Object.values(o.electronic?.statuses??{}).filter(s=>s.disabledUntil>now).length*100;
  if(o.status!=='active'&&o.status!=='ready')break;
 }
 const rating=breachRating(o),survivors=Object.fromEntries((['pulsewheel','breacher','disruptor'] as const).map(kind=>[kind,o.squad!.agents.filter(a=>(a.troop??'pulsewheel')===kind&&a.state!=='lost'&&(a.health??0)>0).length]));
 results.push({tier,layout,withArc,army,housing:Object.entries(army).reduce((n,[kind,count])=>n+TROOPS[kind as TroopKind].housing*count,0),strategy,status:o.status,tokens:rating.count,destruction:rating.destruction,durationMs:(o.finishedAt??o.lastTick)-(o.startedAt??1000),survivors,damageTaken:taken,empPulses,disabledDefenseMs,arcShots,arcHits,maxChain,stalledMs,simulationMs,worstTickMs});
 if(results.length%15===0)console.log(`${results.length}/96 battles`);
}
}
const sourceHash=createHash('sha256').update(readdirSync('shared').filter(f=>f.endsWith('.ts')).sort().map(f=>readFileSync('shared/'+f,'utf8')).join('\n')).digest('hex');
writeFileSync(file,JSON.stringify({label,sourceHash,createdAt:new Date().toISOString(),note:'96 deterministic production-rule synthetic HQ4/5 battles. All defenders are completed matching tiers. Each army uses the reachable matching Hangar capacity (40/50), no research. Three layouts, four army compositions, four deployment scripts. Arc at[-3,15] exposed or[5,2] behind fortified perimeter. Strategies are reproducible scripts, not human skill ratings. No live player data; CPU timings are desktop headless simulation, not mobile render FPS.',configuration:{disruptor:DISRUPTOR,arcSpire:ARC_SPIRE,tiers:Object.fromEntries([1,2,3,4,5].map(level=>[level, Object.fromEntries(Object.keys(UPGRADE_COSTS).map(kind=>[kind,{...buildingStats(kind,level),requiredHq:requiredHqLevel(kind as BuildingKind,level),upgradeCost:level===1?null:UPGRADE_COSTS[kind as BuildingKind][level-2],upgradeMs:level===1?null:UPGRADE_TIMES[kind as BuildingKind][level-2]}]))]))},results},null,2));console.log(file);
