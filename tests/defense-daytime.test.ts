import test from 'node:test';import assert from 'node:assert/strict';
import {initialFoundation,advanceFoundation,type FoundationState} from '../shared/foundation';
import {buyWall,snapWallPosition} from '../shared/cybersecurity';
import {landscapeRoute,clearObstacle,LANDSCAPE,clearingPosition} from '../shared/landscape';
import {ownedSecurityWalls} from '../shared/security-catalog';
import {findPath,segmentClear} from '../shared/navigation';
import {BASE_IDS,chooseInfiltrationBase,craftCampusTarget} from '../shared/infiltration-bases';
import {newSquadOperation,advanceSquad} from '../shared/squad-infiltration';
import {commandOperation,infiltrationPath,targetBounds,type Vec} from '../shared/infiltration';
import {planTactical,TACTICAL_BALANCE,LEGACY_TACTICAL_BALANCE,tacticalBalance} from '../shared/tactical-infiltration';
const ready=():FoundationState=>Object.assign(initialFoundation(),{compute:900,builders:1,starterStation:'placed' as const,stationLayout:{position:[12,-12] as Vec,orientation:0 as const},landscape:{version:1 as const,epoch:'test',sequence:0,nextSpawnAt:1e15,items:[],pendingCompute:0}});
test('closed perimeter permits owner builder routing but remains solid for hostiles; snap joins corner endpoints',()=>{
 const s=ready();let n=0;for(let x=-11;x<=1;x+=2)for(const z of [-8,6])buyWall(s,[x,z],0,'w'+n++);for(let z=-7;z<=5;z+=2)for(const x of [-12,2])buyWall(s,[x,z],1,'w'+n++);
 assert.equal(s.walls!.length,28);assert.ok(landscapeRoute(s,[-5,4.8],undefined,1.1).length);
 assert.equal(findPath([12,-12],[-5,4.8],ownedSecurityWalls(s),{minX:-35,maxX:39,minZ:-26,maxZ:32},.65).length,0);
 const one=ready();buyWall(one,[16,-12],0,'a');assert.deepEqual(snapWallPosition(one,[17.3,-10.8],1),[17,-11]);
});
test('near and far obstacles complete exactly 15 seconds after acceptance with idempotent reward and immediate reassignment',()=>{
 for(const kind of ['tree','rock','scrap'] as const)for(const position of [[16,0],[-29,26]] as Vec[]){const s=ready();s.landscape!.items=[{id:'one',kind,position,variant:0},{id:'two',kind:'scrap',position:[20,20],variant:1}];clearObstacle(s,'one',1000);const j=structuredClone(s.landscape!.clearing!);assert.equal(j.clearedAt,16000);assert.ok(j.workAt<j.clearedAt);assert.throws(()=>clearObstacle(s,'two',2000),/busy/);const restored=structuredClone(s);advanceFoundation(restored,15999);assert.equal(restored.compute,900);advanceFoundation(restored,16000);assert.equal(restored.compute,900+LANDSCAPE.rewards[kind]);assert.equal(restored.buildersBusy,0);advanceFoundation(restored,16000);assert.equal(restored.compute,900+LANDSCAPE.rewards[kind]);const from=clearingPosition(j,16000);clearObstacle(restored,'two',16000);assert.deepEqual(restored.landscape!.clearing!.route[0],from);assert.equal(restored.landscape!.clearing!.clearedAt,31000);}
});
test('every live bot leaves a completed shared target, including a moving follower; stopped distant paths recover',()=>{
 const o=newSquadOperation('shared','vector-works',1000);o.target.walls=[];o.target.defenses=[];o.drones=[];
 o.target.assets=[{id:'lab',kind:'lab',name:'Lab',position:[0,0],size:[2,2],access:[0,2],hackSeconds:.1,compute:0,research:1},{id:'gpu',kind:'gpu',name:'GPU',position:[8,0],size:[2,2],access:[8,2],hackSeconds:50,compute:1,research:0}];
 for(let i=0;i<6;i++)commandOperation(o,{action:'deploy',position:[-18,i*.1]},1000);
 for(const a of o.squad!.agents){a.target='lab';a.droneTarget=undefined;a.wallTarget=undefined;a.mode='hacking';a.path=[];a.position=[0,2];a.nextPlanAt=100000;}
 const follower=o.squad!.agents[5];follower.mode='moving';follower.position=[-2,3];follower.path=[[0,2]];
 advanceSquad(o,1100);assert.ok(o.hacked.includes('lab'));assert.ok(o.squad!.agents.every(a=>a.target!=='lab'));
 for(const a of o.squad!.agents){a.target='gpu';a.position=[-5,3];a.path=[];a.mode='moving';a.nextPlanAt=0;}
 for(const a of o.squad!.agents.slice(1))a.target=undefined;planTactical(o,o.squad!.agents[0]);assert.ok(o.squad!.agents[0].path.length>0);
 const restored=structuredClone(o);advanceSquad(o,30000);advanceSquad(restored,30000);assert.deepEqual(restored,o);assert.ok((o.squad!.progress.gpu??0)>0);
});
test('five handcrafted campuses have increasing footprint, defenses and rewards; all objectives have legitimate ground paths',()=>{
 let area=0,award=0;for(const [i,id]of BASE_IDS.entries()){const t=craftCampusTarget(id),b=targetBounds(t),a=(b.maxX-b.minX)*(b.maxZ-b.minZ);assert.ok(a>area);area=a;assert.equal(t.defenses.length,i+1);assert.ok(t.influence>award);award=t.influence;
  for(const obj of t.assets.filter(a=>a.access)){const path=infiltrationPath({...t,walls:[]},t.entry,obj.access!);assert.ok(path.length,`${id}/${obj.id} reachable`);for(let j=1;j<path.length;j++)assert.ok(segmentClear(path[j-1],path[j],[],b,.65));}
 }
 const s=initialFoundation();s.bots=1;for(let i=0;i<30;i++)assert.equal(chooseInfiltrationBase(s,i),BASE_IDS[0]);s.founderHqLevel=2;s.bots=10;assert.equal(new Set(Array.from({length:50},(_,i)=>chooseInfiltrationBase(s,i,3))).size,5);
});
test('new drone balance is captured without changing legacy mission tuning',()=>{const o=newSquadOperation('new','lumen-labs',0);assert.equal(tacticalBalance(o),TACTICAL_BALANCE);const old=structuredClone(o);delete old.squad!.balanceVersion;assert.equal(tacticalBalance(old),LEGACY_TACTICAL_BALANCE);assert.ok(TACTICAL_BALANCE.droneHealth>LEGACY_TACTICAL_BALANCE.droneHealth);});
