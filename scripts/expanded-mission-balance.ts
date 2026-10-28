/** Production fixed-step mission matrix. Synthetic armies only; never touches accounts. */
import {mkdirSync,writeFileSync,existsSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BASE_IDS,MISSION_CATALOG} from '../shared/infiltration-bases';
import {newSquadOperation,advanceSquad,commandSquad} from '../shared/squad-infiltration';
import {captureTroopProgression,type TroopKind} from '../shared/troops';
import {buildingStats} from '../shared/building-levels';
import {validDeployment,type Vec} from '../shared/infiltration';
import {breachRating} from '../shared/breach-rating';
const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8)??'initial';
const filter=process.argv.find(a=>a.startsWith('--mission='))?.slice(10);
const file=`output/Gameplay_Expansion/missions-${label}.json`;mkdirSync('output/Gameplay_Expansion',{recursive:true});if(existsSync(file))throw Error('Use a fresh label');
const sourceHash=createHash('sha256').update(readdirSync('shared').filter(f=>f.endsWith('.ts')).sort().map(f=>readFileSync('shared/'+f,'utf8')).join('\n')).digest('hex');
const templates=Object.fromEntries(BASE_IDS.map(id=>[id,newSquadOperation('mission-balance',id,1000)]));
const results=[];
for(const [rank,id]of BASE_IDS.entries()){
 if(filter&&filter!==id)continue;
 const m=MISSION_CATALOG[rank],capacity=buildingStats('hangar',m.hqLevel).housing;
 const compositions=m.hqLevel===1?[{pulsewheel:10,breacher:0,disruptor:0},{pulsewheel:capacity,breacher:0,disruptor:0}]:[{pulsewheel:capacity,breacher:0,disruptor:0},{pulsewheel:capacity%5,breacher:Math.floor(capacity/5),disruptor:0},{pulsewheel:capacity-10,breacher:2,disruptor:0},...(m.hqLevel>=3?[{pulsewheel:capacity-21,breacher:3,disruptor:2}]:[]),...(m.hqLevel>=4?[{pulsewheel:capacity-36,breacher:6,disruptor:2}]:[])];
 for(const army of compositions)for(const strategy of ['front-cluster','west-protected','east-protected','rear-split','southwest-protected','northwest-protected','northeast-protected'] as const){
 const o=newSquadOperation('mission-balance',id,1000);captureTroopProgression(o,{troopLevels:{pulsewheel:m.troopLevel,breacher:m.troopLevel,disruptor:m.troopLevel}});
 o.squad!.undeployed=army.pulsewheel;o.squad!.undeployedBreacher=army.breacher;o.squad!.undeployedDisruptor=army.disruptor;
 const b=o.target.campusBounds!,units:TroopKind[]=[...Array<TroopKind>(army.breacher).fill('breacher'),...Array<TroopKind>(army.disruptor).fill('disruptor'),...Array<TroopKind>(army.pulsewheel).fill('pulsewheel')];
 const orders=units.map((troop,i)=>{const shift=(i%5-2)*.5;let position:Vec=strategy==='southwest-protected'?[b.minX+1,10+shift]:strategy==='northwest-protected'?[b.minX+1,-10+shift]:strategy==='northeast-protected'?[b.maxX-1,-10+shift]:strategy==='west-protected'?[b.minX+1,shift]:strategy==='east-protected'?[b.maxX-1,shift]:strategy==='rear-split'?[i%2?-8:8,b.minZ+1]:[shift,b.maxZ-1];if(!validDeployment(o.target,position))position=[...o.target.entry];return {troop,position,at:1000+(strategy.endsWith('protected')?(troop==='pulsewheel'?2000:troop==='disruptor'?900:0):0)};}).sort((a,b)=>a.at-b.at);
 let cursor=0,longestStallMs=0;const still=new Map<string,number>(),damageTaken={pulsewheel:0,breacher:0,disruptor:0};const start=performance.now();
 for(let now=1000;now<=181000;now+=100){while(cursor<orders.length&&orders[cursor].at<=now&&(o.status==='ready'||o.status==='active')){const order=orders[cursor++];commandSquad(o,{action:'deploy',troop:order.troop,position:order.position},now);}
 const previous=new Map(o.squad!.agents.map(a=>[a.id,{health:a.health,position:[...a.position] as Vec}]));advanceSquad(o,now);
 for(const a of o.squad!.agents){const p=previous.get(a.id);if(!p)continue;damageTaken[a.troop??'pulsewheel']+=Math.max(0,p.health-a.health);const stalled=a.state==='active'&&(a.mode==='idle'||a.mode==='moving')&&Math.hypot(a.position[0]-p.position[0],a.position[1]-p.position[1])<.02;const ms=stalled?(still.get(a.id)??0)+100:0;still.set(a.id,ms);longestStallMs=Math.max(longestStallMs,ms);}
 if(o.status!=='active'&&o.status!=='ready')break;
 }
 const rating=breachRating(o);results.push({id,mission:rank+1,hq:m.hqLevel,troopLevel:m.troopLevel,capacity,army,strategy,orders,tokens:rating.count,destruction:rating.destruction,hqDestroyed:o.hacked.includes('hq'),survivors:o.squad!.agents.filter(a=>a.state!=='lost').length,damageTaken,durationMs:(o.finishedAt??o.lastTick)-(o.startedAt??1000),longestStallMs,simulationMs:performance.now()-start,status:o.status,walls:o.target.walls?.length});
 }
 console.log(id,results.filter(r=>r.id===id).map(r=>`${r.strategy}:${r.tokens}/${Math.round(r.destruction)}`).join(' '));writeFileSync(file,JSON.stringify({label,sourceHash,templates,createdAt:new Date().toISOString(),note:'Deterministic production simulation with legitimate matching HQ Hangar capacity and catalog troop tier. Reproducible deployment scripts, not human skill ratings. No live accounts. Timings are desktop CPU, not mobile FPS.',results},null,2));
}
console.log(file);
