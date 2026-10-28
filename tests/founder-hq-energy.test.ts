import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldKit} from '../src/art/world';
import {founderHQ,animateFounderHQEnergy} from '../src/art/FounderHQ';
import {progressionModel} from '../src/art/BuildingLevels';

const emissions=(g:THREE.Object3D)=>{const values:number[]=[];g.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial&&m.emissive.getHex())values.push(m.emissiveIntensity);});return values;};

test('actual preview models retain the distinct roof apparatus and founder at every level',()=>{
 const k=new WorldKit();try{const names=['hq-startup-computing-vent','hq-developed-computing-module','hq-cyan-roof-apparatus','hq-faceted-blue-hemisphere','hq-articulated-command-spire'];
 for(let level=1;level<=5;level++){const h=progressionModel(k,'hq',level);assert.deepEqual(h.position.toArray(),[0,0,0]);const roof=h.getObjectByName(names[level-1]);assert.ok(roof,`level ${level} roof identity`);h.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(0,12,-.25),new THREE.Vector3(0,-1,0)),hit=ray.intersectObject(h,true)[0];assert.ok(hit&&hit.point.y>4.8,'actual batched roof apparatus is present above office');assert.ok(h.getObjectByName('Founder at laptop'));assert.ok(h.getObjectByName('hq-power-port'));}
 }finally{k.dispose();}
});

test('HQ energy animation is bounded, resets for reduced motion and preserves model resources and interaction anchors',()=>{
 for(const level of [4,5] as const){const k=new WorldKit(),h=founderHQ(k,new THREE.Group(),level);try{
 const nodes:THREE.Object3D[]=[],geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();h.traverse(o=>{nodes.push(o);if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
 const founder=h.getObjectByName('Founder at laptop')!,port=h.getObjectByName('hq-power-port')!,founderPosition=founder.position.clone(),portPosition=port.getWorldPosition(new THREE.Vector3());
 animateFounderHQEnergy(h,0,true);const still=emissions(h);animateFounderHQEnergy(h,2);assert.notDeepEqual(emissions(h),still,'advanced energy subtly changes');
 for(let t=0;t<60;t+=.17)animateFounderHQEnergy(h,t);
 const after:THREE.Object3D[]=[];h.traverse(o=>{after.push(o);if(o instanceof THREE.Mesh){assert.ok(geometries.has(o.geometry));for(const m of Array.isArray(o.material)?o.material:[o.material])assert.ok(materials.has(m));}});assert.deepEqual(after,nodes,'no accumulating effect nodes');assert.deepEqual(founder.position,founderPosition);assert.deepEqual(port.getWorldPosition(new THREE.Vector3()),portPosition);
 animateFounderHQEnergy(h,17,true);assert.deepEqual(emissions(h),still);const rotor=h.getObjectByName('hq-circulating-core-energy'),traveller=h.getObjectByName('hq-spire-energy-traveller');if(rotor)assert.equal(rotor.rotation.y,0);if(traveller)assert.equal(traveller.position.y,0);
 animateFounderHQEnergy(h,52,true);assert.deepEqual(emissions(h),still,'reduced motion remains static');
 }finally{k.dispose();}}
});

test('separate HQ instances do not animate one another through shared materials',()=>{const k=new WorldKit();try{for(const level of [4,5] as const){const a=founderHQ(k,new THREE.Group(),level),b=founderHQ(k,new THREE.Group(),level);animateFounderHQEnergy(b,0,true);const before=emissions(b);animateFounderHQEnergy(a,3);assert.deepEqual(emissions(b),before,`level ${level} independent energy`);}}finally{k.dispose();}});
