/** Isolated deterministic combat comparison. Never connects to a database or API.
 * Run: node --import tsx scripts/check-combat-equivalence.ts after
 * Baseline: node --import tsx scripts/check-combat-equivalence.ts before [snapshot-directory]
 * The baseline snapshot must contain shared/ from the pre-update Git revision.
 * Compare each row's SHA256: it includes the complete JSON operation after EVERY 100ms tick.
 * Timing is Node CPU time, not browser FPS or physical-device performance.
 */
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const mode=process.argv[2]??'after';
if(!['before','after'].includes(mode))throw Error('Expected before or after');
const root=resolve(mode==='before'?(process.argv[3]??'data/combat-presentation-before'):'.','shared');
const {playerOperation}=await import(pathToFileURL(resolve(root,'player-combat.ts')).href);
const {commandSquad,advanceSquad,newSquadOperation}=await import(pathToFileURL(resolve(root,'squad-infiltration.ts')).href);
const rows=[];
// PvP first preserves the cold-cache timing order used for the original measurement.
for(const mission of ['synthetic-player-base','lumen-labs','vector-works','prism-systems','orbit-research','apex-compute']){
 let op:any;const started=performance.now();
 if(mission==='synthetic-player-base'){
const buildings=[['hq',[-4.5,-4]],['rig',[5.5,-4.5]],['lab',[5,3.5]],['sentinel',[-6,5]],['droneStation',[0,5]]].map(([id,position])=>({id,position,orientation:0,level:id==='hq'?2:1,complete:true}));const walls=[];for(let x=-11.5;x<=10.5;x++)for(const z of [-11.5,10.5])walls.push({id:'h'+x+','+z,position:[x,z],orientation:0});for(let z=-10.5;z<=9.5;z++)for(const x of [-11.5,10.5])walls.push({id:'v'+x+','+z,position:[x,z],orientation:1});const base={version:1,companyId:'isolated-defender',capturedAt:1000,buildings,walls,decorations:[],scenery:[]};op=playerOperation('isolated-pvp',base,{id:'isolated-defender',name:'Isolated PvP Fixture',level:2,hqLevel:2,influence:0,rank:null,visitable:true},'isolated-attacker',1000);
 }else op=newSquadOperation('review',mission,1000);
 for(let i=0;i<10;i++)commandSquad(op,{action:'deploy',position:op.target.entry},1000);
 const hash=createHash('sha256');let worst=0,total=0,ticks=0;const stages=[];
 for(let t=1100;t<=181000&&op.status==='active';t+=100){
  const startedTick=performance.now();advanceSquad(op,t);const elapsed=performance.now()-startedTick;
  total+=elapsed;worst=Math.max(worst,elapsed);ticks++;hash.update(JSON.stringify(op));
  if(t%10000===0)stages.push({t,total,worst});
 }
 rows.push({mission,hash:hash.digest('hex'),ticks,status:op.status,totalMs:performance.now()-started,simulationMs:total,worstTickMs:worst,stages});
}
console.log(JSON.stringify({mode,root,rows},null,2));
