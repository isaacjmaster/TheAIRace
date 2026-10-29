import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldKit} from '../src/art/world';
import {progressionModel} from '../src/art/BuildingLevels';
import {FOUNDATION_BUILDINGS,placementFootprint} from '../shared/foundation';

test('all five tiers fit their unchanged occupied cells in every rotation',()=>{
 const kit=new WorldKit();
 try{for(const kind of FOUNDATION_BUILDINGS)for(let level=1;level<=5;level++){
  const model=progressionModel(kit,kind,level),root=new THREE.Group();root.add(model);
  // Ground-contact decals and transient muzzle effects are not solid architecture.
  const excluded:THREE.Object3D[]=[];
  model.traverse(o=>{if(o.name==='decorative-contact-shadow')excluded.push(o);});
  excluded.forEach(o=>o.removeFromParent());
  for(const orientation of [0,1,2,3] as const){
   root.rotation.y=orientation*Math.PI/2;
   const box=new THREE.Box3().setFromObject(root,true);
   const footprint=placementFootprint(kind,{position:[0,0],orientation,size:'compound'});
   const message=`${kind} level ${level} rotation ${orientation}: ${JSON.stringify(box)}`;
   assert.ok(box.min.x>=-footprint.w/2-1e-5&&box.max.x<=footprint.w/2+1e-5,message);
   assert.ok(box.min.z>=-footprint.d/2-1e-5&&box.max.z<=footprint.d/2+1e-5,message);
  }
 }}finally{kit.dispose();}
});
