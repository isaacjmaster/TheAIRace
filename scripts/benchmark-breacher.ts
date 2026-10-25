/** Isolated deterministic balance scenarios; never reads accounts or connects to a database. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {newSquadOperation,advanceSquad,commandSquad} from '../shared/squad-infiltration';
import {targetBounds,validDeployment,type Operation,type Vec} from '../shared/infiltration';
import {playerOperation} from '../shared/player-combat';
import type {PublicBase} from '../shared/player-base';
import {beginReplayRecording,takeReplayFrames} from '../shared/pvp-replay';
import {TROOPS} from '../shared/troops';
const missions=['lumen-labs','vector-works','prism-systems','orbit-research','apex-compute','synthetic-player-base'];
function fixture():Operation{
 const buildings=[['hq',[-4.5,-4]],['rig',[5.5,-4.5]],['lab',[5,3.5]],['sentinel',[-6,5]],['droneStation',[0,5]]].map(([id,position])=>({id,position,orientation:0,level:id==='hq'?2:1,complete:true}));const walls=[];
 for(let x=-11.5;x<=10.5;x++)for(const z of [-11.5,10.5])walls.push({id:'h'+x+','+z,position:[x,z],orientation:0});
 for(let z=-10.5;z<=9.5;z++)for(const x of [-11.5,10.5])walls.push({id:'v'+x+','+z,position:[x,z],orientation:1});
 const base={version:1,companyId:'isolated-defender',capturedAt:1000,buildings,walls,decorations:[],scenery:[]} as PublicBase;
 return playerOperation('isolated-pvp',base,{id:'isolated-defender',name:'Isolated PvP Fixture',level:2,hqLevel:2,influence:0,rank:null,visitable:true},'isolated-attacker',1000);
}
const rows=[];
for(const mission of missions)for(const [pulsewheels,breachers] of [[20,0],[10,2],[0,4]]){
 const o=mission==='synthetic-player-base'?fixture():newSquadOperation('balance',mission,1000);o.squad!.undeployed=pulsewheels;o.squad!.undeployedBreacher=breachers;const bounds=targetBounds(o.target);beginReplayRecording(o);
 for(let i=0;i<pulsewheels+breachers;i++){const position:Vec=[bounds.minX+1.5,-4+i*.35];commandSquad(o,{action:'deploy',troop:i<breachers?'breacher':'pulsewheel',position:validDeployment(o.target,position)?position:o.target.entry},1000);}
 const start=performance.now();advanceSquad(o,181000);const simulationMs=performance.now()-start,frames=takeReplayFrames(o);
 rows.push({mission,pulsewheels,breachers,housing:pulsewheels+5*breachers,status:o.status,hacked:o.hacked.length,total:o.target.assets.filter(a=>a.access&&a.hackSeconds).length,survivingPulsewheels:o.squad!.agents.filter(a=>a.troop!=='breacher'&&a.state==='extracted').length,survivingBreachers:o.squad!.agents.filter(a=>a.troop==='breacher'&&a.state==='extracted').length,durationSeconds:(o.finishedAt!-1000)/1000,simulationMs,replayRetainsTroop:!o.pvp||!breachers||frames.some(f=>f.squad?.agents.some(a=>a.troop==='breacher'))});
}
const out='output/Breacher_Review';mkdirSync(out,{recursive:true});writeFileSync(out+'/balance.json',JSON.stringify({note:'Deterministic 20-housing scenarios using fixed west-edge deployment, 100ms authoritative ticks. These are first-pass balance fixtures, not broad PvP win-rate measurements or device FPS.',stats:TROOPS,rows},null,2));console.table(rows);
