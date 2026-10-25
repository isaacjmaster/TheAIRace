import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {initialFoundation,advanceFoundation,reconcileBuilderHuts,establishBuilderStation,trainScrap,buildRig,buildFabricator,type FoundationState} from '../shared/foundation';
import {wallCapacity,founderBuilderCapacity} from '../shared/founder-hq';
import {buyWall,moveWall} from '../shared/cybersecurity';
import {validDecorationPosition,purchaseDecoration} from '../shared/decorations';
import {validGuardPosition,setGuardPosition,homePatrolPoints,DRONE_PATROL_RADIUS} from '../shared/security';
import {publicBase,baseVisualState} from '../shared/player-base';
import {playerTarget,playerOperation} from '../shared/player-combat';
import {attackApproach} from '../shared/attack-positions';
import {targetBounds,advanceOperation,commandOperation,type Asset,type TargetSnapshot,type Vec} from '../shared/infiltration';
import {separateDronePositions} from '../shared/drone-separation';
import {segmentClear} from '../shared/navigation';
import {BASE_IDS,craftCampusTarget} from '../shared/infiltration-bases';
import {advanceSentinels} from '../shared/sentinel-combat';
import {newSquadOperation,advanceSquad} from '../shared/squad-infiltration';
import {BuildMenu} from '../src/ui/BuildMenu';
import {worldFixture} from './helpers/player-world-fixture';
const ready=():FoundationState=>({...initialFoundation(),starterStation:'placed',builders:2,founderHqLevel:2,compute:1000,stationLayout:{position:[-18,-18],orientation:0},landscape:{version:1,legacyRocksRegistered:true,epoch:'refine',items:[],nextSpawnAt:1e15,sequence:0,pendingCompute:0}});
test('100 individual walls at HQ 1 and 2; over-cap ownership and movement remain intact',()=>{
 for(const level of [1,2] as const){const s=ready();s.founderHqLevel=level;s.walls=Array.from({length:101},(_,i)=>({id:'w'+i,position:[-30,-24] as Vec,orientation:0}));assert.equal(wallCapacity(s),100);const before=structuredClone(s);assert.throws(()=>buyWall(s,[24,24],0,'new'),/limit/);assert.deepEqual(s,before);moveWall(s,'w0',[24,24],0);assert.equal(s.walls.length,101);s.walls=s.walls.slice(0,99);buyWall(s,[20,24],0,'new');assert.equal(s.walls.length,100);}
 assert.equal(wallCapacity({founderHqLevel:3}),0,'future levels require explicit configuration');
});
test('two stable builder stations, correct menu count, concurrent jobs survive reload and complete independently',()=>{
 const s=ready();reconcileBuilderHuts(s);const hut=structuredClone(s.builderHuts![0]);reconcileBuilderHuts(s);assert.equal(s.builderHuts!.length,1);assert.equal(s.builders,2);assert.equal(founderBuilderCapacity(s),2);assert.deepEqual(s.builderHuts![0],hut);
 buildRig(s,[8,0],1000);buildFabricator(s,[8,-10],2000);assert.equal(s.buildersBusy,2);const restored=JSON.parse(JSON.stringify(s));advanceFoundation(restored,16000);assert.equal(restored.buildersBusy,1);advanceFoundation(restored,17000);assert.equal(restored.buildersBusy,0);assert.equal(restored.builders,2);
 const html=renderToStaticMarkup(createElement(BuildMenu,{state:s,busy:false,onPlace:()=>{},tutorial:true}));assert.ok(!html.includes('NaN'));
 s.builderHuts![0].unplaced=true;establishBuilderStation(s,[24,20]);assert.equal(s.builderHuts![0].unplaced,false);assert.equal(s.builders,2);assert.deepEqual(s.stationLayout,{position:[-18,-18],orientation:0});assert.throws(()=>establishBuilderStation(s,[28,20]),/already placed/);
});
test('decoration accepts valid enclosed campus terrain and rejects real occupied footprints',()=>{
 const s=ready();s.walls=Array.from({length:12},(_,i)=>({id:'wall'+i,position:[-12+i*2,6] as Vec,orientation:0}));for(const kind of ['cypress','ornamental','flowers','planter'] as const){assert.equal(validDecorationPosition(s,kind,[20,20],0),null);assert.ok(validDecorationPosition(s,kind,[-5,-1],0));assert.ok(validDecorationPosition(s,kind,[100,100],0));}purchaseDecoration(s,'cypress',[20,20],0,'tree');assert.equal(JSON.parse(JSON.stringify(s)).decorations[0].id,'tree');
});
test('guard assignment is authenticated, persistent, idempotent and captured by defensive PvP snapshots',async()=>{
 const f=await worldFixture();try{const p=await f.fresh('Guard_Owner'),other=await f.fresh('Guard_Other');const s=ready();s.droneStation={position:[15,0],startedAt:0,completesAt:0};f.save(p,s);assert.equal((await f.command(p,{action:'set-drone-guard',position:[-24,20]})).status,200);assert.equal((await f.command(p,{action:'set-drone-guard',position:[1e20,0]})).status,400);assert.equal((await f.command(other,{action:'set-drone-guard',position:[20,20],companyId:p.id})).status,400);const state=(await f.get(p)).data.state as FoundationState;assert.deepEqual(state.droneGuards?.[0],[-24,20]);const base=publicBase(state,p.id,f.time())!;assert.deepEqual(baseVisualState(base).droneGuards?.[0],state.droneGuards?.[0]);const target=playerTarget(base,{id:p.id,name:'Guard',level:2,hqLevel:2,influence:0,rank:null,visitable:true});assert.equal(target.defenses.length,2);for(const [i,d] of target.defenses.entries()){assert.equal(d.radius,10.2);const center=i?state.droneStation!.position:state.droneGuards![0]!;assert.ok(d.route.every(q=>Math.hypot(q[0]-center[0],q[1]-center[1])<=DRONE_PATROL_RADIUS+.01));}assert.notDeepEqual(target.defenses[0].route[0],target.defenses[1].route[0]);}finally{await f.close();}
});
test('bounded drone separation opens spacing without crossing obstacles',()=>{let p:Vec[]=[[0,0],[0,0]];const bounds={minX:-10,maxX:10,minZ:-10,maxZ:10};for(let i=0;i<50;i++)p=separateDronePositions(p,.1,(_i,a,b)=>segmentClear(a,b,[],bounds,1));assert.ok(Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1])>1.6);const blocked=separateDronePositions([[0,0],[0,0]],.1,()=>false);assert.deepEqual(blocked,[[0,0],[0,0]]);});
test('HQ notices originate only from a true completion, acknowledge across reload, and preserve historical upgrades',async()=>{
 const f=await worldFixture();try{const p=await f.fresh('Notice_Player'),s=ready();s.founderHqLevel=1;s.hqUpgrade={id:'offline-upgrade',targetLevel:2,startedAt:f.time()-1000,completesAt:f.time()+1000};f.save(p,s);f.setTime(f.time()+1000);let view=(await f.get(p)).data.state;assert.equal(view.hqNotification.acknowledged,false);assert.equal((await f.command(p,{action:'acknowledge-hq',id:'offline-upgrade'})).status,200);view=(await f.get(p)).data.state;assert.equal(view.hqNotification.acknowledged,true);delete view.hqNotification;f.save(p,view);assert.equal((await f.get(p)).data.state.hqNotification,undefined);}finally{await f.close();}
});
test('new training is ten seconds per bot while old deadlines and research bonuses survive',()=>{const s=ready();s.fabricator={position:[10,10],hangarPosition:[20,10],startedAt:0,completesAt:0};s.training=[5000,10000];s.bots=0;trainScrap(s,3,1000);assert.deepEqual(s.training,[5000,10000,20000,30000,40000]);assert.deepEqual(s.trainingDurations,[5000,5000,10000,10000,10000]);const restored=JSON.parse(JSON.stringify(s));advanceFoundation(restored,40000);assert.equal(restored.bots,5);advanceFoundation(restored,40000);assert.equal(restored.bots,5);s.training=[];s.trainingDurations=[];s.technologies={trainingEfficiency:1};trainScrap(s,1,1000);assert.deepEqual(s.training,[10000]);});
test('all four HQ approaches use the nearest reachable face, including perimeter slots and intact wall exclusion',()=>{
 const asset:Asset={id:'hq',kind:'hq',position:[0,0],size:[8,6],name:'HQ',access:[0,4],hackSeconds:20,compute:0,research:0};const target:TargetSnapshot={version:1,id:'test',arena:'campus-v2',name:'test',difficulty:'test',entry:[-12,0],exit:[-12,0],assets:[asset],defenses:[],influence:0,campusBounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},navigationVersion:2};for(const from of [[0,12],[0,-12],[-12,0],[12,0]] as Vec[]){const approach=attackApproach(target,asset,from)!;assert.ok(approach);assert.ok(Math.hypot(from[0]-approach.point[0],from[1]-approach.point[1])<9);const next=attackApproach(target,asset,from,[approach.point])!;assert.ok(Math.hypot(next.point[0]-approach.point[0],next.point[1]-approach.point[1])>.7);}
 target.walls=[{id:'back',x:0,z:-4,w:12,d:.5,height:1.2}];const approach=attackApproach(target,asset,[0,-12])!;assert.ok(approach);assert.ok(segmentClear(approach.point,asset.position,target.walls,target.campusBounds!,0));
});
test('advanced missions include live hackable Sentinel Towers without changing total rewards',()=>{
 for(const [i,id] of BASE_IDS.entries()){const target=craftCampusTarget(id);assert.equal(target.sentinels?.length,[0,0,1,1,2][i]);for(const tower of target.sentinels??[]){assert.ok(target.assets.some(a=>a.id===tower.id&&a.model==='sentinel'&&a.access));const o=newSquadOperation('tower-test',id,1000);o.status='active';o.startedAt=1000;o.squad!.agents=[{id:'a',unitStatus:'reserved',state:'active',position:[tower.position[0]+3,tower.position[1]],path:[],mode:'idle',hack:0,yaw:0,health:60,work:0,cargo:{compute:0,research:0,intel:false}}];advanceSentinels(o);o.lastTick+=1000;advanceSentinels(o);assert.ok(o.sentinels?.some(s=>s.lastShotAt!==undefined),id);}}
});


test('advanced tower missions retain successful breaches with ten unupgraded Pulsewheels against elevated tower fire',()=>{
 for(const id of ['prism-systems','orbit-research','apex-compute']){
  const o=newSquadOperation('balance',id,100037),b=targetBounds(o.target);
  for(let i=0;i<10;i++)commandOperation(o,{action:'deploy',position:id==='prism-systems'?[i*.02,b.maxZ-1.5]:[-.8*b.maxX+i*.05,b.minZ+1.5]},100037);
  advanceSquad(o,280037);assert.notEqual(o.status,'active',id);assert.ok(o.hacked.length>0,id); // Wall cover no longer guarantees a full clear; successful Breach Tokens remain obtainable.
  assert.ok(o.events.some(e=>e.type==='sentinel-shot'),id);
 }
});

test('bots actually navigate and complete HQ hacking from each reachable side',()=>{
 for(const from of [[0,12],[0,-12],[-12,0],[12,0]] as Vec[]){const o=newSquadOperation('four-faces','lumen-labs',1000);o.target.campusBounds={minX:-20,maxX:20,minZ:-20,maxZ:20};o.target.walls=[];o.target.defenses=[];o.target.sentinels=[];o.drones=[];o.target.assets=[{id:'hq',kind:'hq',position:[0,0],size:[8,6],access:[0,4.2],name:'HQ',hackSeconds:10,compute:0,research:0}];
 commandOperation(o,{action:'deploy'},1000);const a=o.squad!.agents[0];Object.assign(a,{position:from,path:[],target:undefined,workPosition:undefined,mode:'idle',nextPlanAt:1000});advanceSquad(o,20000);assert.equal(o.status,'extracted',String(from));assert.ok(o.hacked.includes('hq'));assert.ok(Math.hypot(a.position[0]-from[0],a.position[1]-from[1])<9,'uses nearby face');}
});
