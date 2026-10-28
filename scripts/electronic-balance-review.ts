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

const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8)??'electronic-initial';
const file=`output/Electronic_Review/${label}.json`;if(existsSync(file))throw Error('Use a fresh label to preserve measurements');mkdirSync('output/Electronic_Review',{recursive:true});
const armies=[{pulsewheel:20,breacher:0,disruptor:0},{pulsewheel:10,breacher:2,disruptor:0},{pulsewheel:7,breacher:2,disruptor:1},{pulsewheel:4,breacher:2,disruptor:2},{pulsewheel:2,breacher:0,disruptor:6}] as const;
const results=[];
for(const layout of ['pvp-open','pvp-clear-fire-lanes','pvp-fortified'])for(const withArc of [false,true])for(const army of armies)for(const strategy of ['clustered','protected','support-first','split'] as const){
 const base=baseFixture(layout);base.buildings.find(b=>b.id==='hq')!.level=3;
 if(withArc)base.buildings.push({id:'arcSpire',position:layout==='pvp-fortified'?[5,2]:[-3,15],orientation:0,level:1,complete:true});
 const o=playerOperation('electronic-review',base,{id:'synthetic',name:'Synthetic HQ3',hqLevel:3,level:3,influence:0,rank:null,visitable:true},'synthetic-attacker',1000);
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
 results.push({layout,withArc,army,housing:Object.entries(army).reduce((n,[kind,count])=>n+TROOPS[kind as TroopKind].housing*count,0),strategy,status:o.status,tokens:rating.count,destruction:rating.destruction,durationMs:(o.finishedAt??o.lastTick)-(o.startedAt??1000),survivors,damageTaken:taken,empPulses,disabledDefenseMs,arcShots,arcHits,maxChain,stalledMs,simulationMs,worstTickMs});
 if(results.length%15===0)console.log(`${results.length}/120 battles`);
}
const sourceHash=createHash('sha256').update(readdirSync('shared').filter(f=>f.endsWith('.ts')).sort().map(f=>readFileSync('shared/'+f,'utf8')).join('\n')).digest('hex');
writeFileSync(file,JSON.stringify({label,sourceHash,createdAt:new Date().toISOString(),note:'120 deterministic production-rule synthetic HQ3 battles. Equal20-housing armies, no research. Existing base fixtures plus one legal Arc Spire at[-3,15] exposed or[5,2] behind the fortified perimeter. These are reproducible strategies, not human skill estimates or player win rates. Timings measure headless desktop simulation CPU, not render FPS or physical phones.',configuration:{disruptor:DISRUPTOR,arcSpire:ARC_SPIRE},results},null,2));console.log(file);
