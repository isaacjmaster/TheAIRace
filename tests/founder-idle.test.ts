import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {WorldKit} from '../src/art/world';import {founderHQ,animateFounderIdle} from '../src/art/FounderHQ';
test('both HQ levels retain animated founder joints after campus batching, rest between bursts and respect reduced motion',()=>{
 for(const level of [1,2] as const){const k=new WorldKit('campus'),parent=new THREE.Group(),house=founderHQ(k,parent,level);try{
 const left=house.getObjectByName('founder-left-arm')!,right=house.getObjectByName('founder-right-arm')!,head=house.getObjectByName('founder-head')!;
 assert.ok(left&&right&&head);assert.equal(left.children.length,2);
 const placement=house.position.clone(),size=house.scale.clone(),count=house.children.length;
 animateFounderIdle(house,2);assert.equal(left.rotation.x,0);assert.equal(right.rotation.x,0);
 animateFounderIdle(house,4.7);assert.ok(Math.abs(left.rotation.x-right.rotation.x)>.02);assert.ok(head.rotation.x>0);
 const pose=left.rotation.x;animateFounderIdle(house,13.7);assert.ok(Math.abs(left.rotation.x-pose)<1e-10);
 animateFounderIdle(house,4.7,true);assert.equal(left.rotation.x,0);assert.equal(right.rotation.x,0);assert.equal(head.rotation.x,0);
 animateFounderIdle(house,6);assert.equal(left.rotation.x,0);assert.deepEqual(house.position,placement);assert.deepEqual(house.scale,size);assert.equal(house.children.length,count);
 // Eased boundaries return to the seated pose without snapping.
 animateFounderIdle(house,4.001);assert.ok(Math.abs(left.rotation.x)<.00001);animateFounderIdle(house,5.999);assert.ok(Math.abs(left.rotation.x)<.00001);
 }finally{k.dispose();}}
});
