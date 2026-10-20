import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import{establishedFoundation as initialFoundation}from './helpers/established-foundation';
import{advanceFoundation,buildRig,builderBusyAt}from'../shared/foundation';
import{LANDSCAPE,ensureLandscape,clearObstacle,clearingPosition,landscapeRoute}from'../shared/landscape';
import{constructionWork}from'../src/art/builderWork';import{HeadquartersScene}from'../src/art/HeadquartersScene';
import{avaComputeReady,avaWaiting}from'../src/ui/avaPresentation';import{newAva,reconcileAva,avaLine}from'../shared/ava';
const epoch=100000;
function fresh(){const s=initialFoundation();s.compute=500;ensureLandscape(s,epoch,'hq-polish');return s;}
test('all new basic clearing work lasts 15s; legacy active 30s work retains its exact deadline and reward',()=>{
 for(const kind of ['tree','rock','scrap']as const){const s=fresh(),o=s.landscape!.items.find(o=>o.kind===kind)!;clearObstacle(s,o.id,epoch);const j=s.landscape!.clearing!;assert.equal(j.clearedAt-j.workAt,15000);assert.equal(LANDSCAPE.workByKind[kind],15000);}
 const s=fresh(),o=s.landscape!.items.find(o=>o.kind==='scrap')!;clearObstacle(s,o.id,epoch);const j=s.landscape!.clearing!;j.clearedAt+=15000;j.completesAt+=15000;const deadline=j.clearedAt;const restored=JSON.parse(JSON.stringify(s));advanceFoundation(restored,deadline-1);assert.equal(restored.buildersBusy,1);assert.equal(restored.landscape.clearing.clearedAt,deadline);advanceFoundation(restored,deadline);assert.equal(restored.buildersBusy,0);assert.equal(restored.compute,503);advanceFoundation(restored,deadline);assert.equal(restored.compute,503);
});
test('clearing releases at work completion and another job interrupts return from its actual authoritative position',()=>{
 const s=fresh();clearObstacle(s,s.landscape!.items[0].id,epoch);const j=structuredClone(s.landscape!.clearing!);assert.equal(builderBusyAt(s,j.clearedAt-1),1);assert.equal(builderBusyAt(s,j.clearedAt),0);
 const at=j.clearedAt+200;advanceFoundation(s,at);assert.equal(s.buildersBusy,0);const origin=clearingPosition(j,at),next=s.landscape!.items.find(o=>o.id!==j.obstacle.id)!;clearObstacle(s,next.id,at);assert.deepEqual(s.landscape!.clearing!.route[0],origin);assert.equal(s.compute,502);assert.throws(()=>clearObstacle(s,s.landscape!.items.at(-1)!.id,at),/busy/);assert.throws(()=>buildRig(s,[6,0],at),/busy/);
 advanceFoundation(s,s.landscape!.clearing!.clearedAt);assert.equal(s.buildersBusy,0);assert.equal(s.compute,502+LANDSCAPE.rewards[next.kind]);assert.deepEqual(s.landscape!.clearing!.returnRoute!.at(-1),s.stationLayout?.position??[-1,4.8]);
});
test('new construction can start during clearing return; its work plan is not blocked by old cosmetic travel',()=>{
 const s=fresh();clearObstacle(s,s.landscape!.items[0].id,epoch);const at=s.landscape!.clearing!.clearedAt;buildRig(s,[6,0],at);assert.equal(s.buildersBusy,1);assert.ok(constructionWork(s,at)?.routes.length);assert.throws(()=>clearObstacle(s,s.landscape!.items[1].id,at),/busy/);advanceFoundation(s,at+15000);assert.equal(s.buildersBusy,0);assert.equal(builderBusyAt(s,at+15000),0);
});
test('Ava wait visibility follows real stored Compute, never a display timer; only collection advances progress',()=>{
 const s=fresh(),p={...newAva(),step:12,builderStep:4};s.rig={position:[6,0],startedAt:epoch-15000,completesAt:epoch,lastProducedAt:epoch,stored:0};assert.equal(avaWaiting(12,s),true);assert.equal(avaWaiting(10,s),true);advanceFoundation(s,epoch+5999);assert.equal(avaComputeReady(s),false);advanceFoundation(s,epoch+6000);assert.equal(avaComputeReady(s),true);assert.equal(avaWaiting(12,s),false);assert.match(avaLine(p,s,epoch+6000,null,null),/Compute is ready/);assert.equal(reconcileAva(p,s,epoch+6000).step,12);assert.equal(reconcileAva({...p,collected:true},s,epoch+6000).step,13);
});
test('rendered builder interrupts returning movement without station teleport or crossing blocked routes',()=>{
 const s=fresh();s.landscape!.items=[];s.rig={position:[6,0],startedAt:epoch,completesAt:epoch+15000,lastProducedAt:epoch+15000,stored:0};const group=new THREE.Group();group.position.set(12,.12,4);
 const scene=Object.assign(Object.create(HeadquartersScene.prototype),{builders:[{group,spark:new THREE.Object3D()}],renderer:{domElement:{dataset:{}}},returning:true,constructionKey:'',workPause:0,lifeClock:0,reduced:false,stationOwned:true}) as any;
 const before=group.position.clone();scene.syncConstruction(s,epoch);assert.ok(group.position.distanceTo(before)<1e-9);assert.deepEqual(scene.builderRoute[0],[12,4]);scene.animateConstruction(.05);assert.ok(group.position.distanceTo(before)<=.301);assert.equal(scene.returning,false);assert.ok(landscapeRoute(s,scene.workPlan.positions[0],[12,4],1.1).length);
});
