import test from 'node:test';import assert from 'node:assert/strict';
import {WorldKit} from '../src/art/world';import {gpuRigModel,animateGpu} from '../src/art/GpuRig';import {hangarModel,animateDockedBot} from '../src/art/BotBuildings';import {BotArrivals,dockingRoute} from '../src/art/botLife';import {initialFoundation,type FoundationState} from '../shared/foundation';
const fixture=():FoundationState=>({...initialFoundation(),bots:0,training:[1000,6000,11000],fabricator:{position:[6,-6],hangarPosition:[12,-6],startedAt:0,completesAt:0}});
test('only observed training completion produces visual arrivals; polling, refresh, army return and offline catch-up do not duplicate bots',()=>{
 const tracker=new BotArrivals(),s=fixture(),original=JSON.stringify(s);assert.deepEqual(tracker.sync(s,500),[]);assert.equal(JSON.stringify(s),original);
 s.bots=1;s.training=[6000,11000];assert.deepEqual(tracker.sync(s,2000),[0]);assert.deepEqual(tracker.sync(s,2250),[]);
 s.bots=3;s.training=[];assert.deepEqual(tracker.sync(s,12000),[1,2]);assert.deepEqual(new BotArrivals().sync(s,12000),[]);
 s.bots=4;assert.deepEqual(tracker.sync(s,13000),[]);s.training=[14000];tracker.sync(s,13000);s.bots=5;s.training=[];assert.deepEqual(tracker.sync(s,15000,true),[]);
 s.training=[16000];tracker.sync(s,15000);s.generation=1;s.bots=6;s.training=[];assert.deepEqual(tracker.sync(s,17000),[]);
});
test('docking paths respect all four building rotations and land on the correct bay without rewriting state',()=>{
 for(const orientation of [0,1,2,3] as const){const s=fixture();s.fabricator!.orientation=orientation;s.fabricator!.hangarOrientation=orientation;const before=JSON.stringify(s);for(const slot of [0,4,5,9]){const path=dockingRoute(s,slot);assert.ok(path.length>3);assert.ok(path.every(p=>p.every(Number.isFinite)));assert.ok(path.length<150);}assert.equal(JSON.stringify(s),before);}
});
test('GPU fans spin on their axes, storage-full is calmer, reduced motion stays still; Hangar idle stays in its bay',()=>{
 const k=new WorldKit();try{const rig=gpuRigModel(k),fan=rig.getObjectByName('gpu-fan-0')!;animateGpu(rig,1,.05,true);const active=fan.rotation.z;assert.ok(active>0);animateGpu(rig,2,.05,false);assert.ok(fan.rotation.z-active<active);const angle=fan.rotation.z;animateGpu(rig,3,.05,true,true);assert.equal(fan.rotation.z,angle);
 const hangar=hangarModel(k,10);assert.equal(hangar.children.filter(c=>c.name.startsWith('docked-bot-')).length,10);for(let i=0;i<10;i++){const bot=hangar.getObjectByName('docked-bot-'+i)!;const x=bot.position.x;animateDockedBot(bot,i,2);assert.ok(Math.abs(bot.position.x-x)<=.035001);assert.ok(Math.abs(bot.rotation.y)<=.16);animateDockedBot(bot,i,3,true);assert.equal(bot.rotation.y,0);assert.equal(bot.position.y,.44);}
 }finally{k.dispose();}
});

test('obstructed doorways safely settle visually instead of routing through another building',()=>{const s=fixture();s.rig={position:[6,-3],orientation:0,startedAt:0,completesAt:0,lastProducedAt:0,stored:0};assert.deepEqual(dockingRoute(s,0),[]);});
