import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldKit} from '../src/art/world';
import {armoredHull,technologyMaterials} from '../src/art/TechnologyMaterials';
import {sentinelModel,animateSentinel} from '../src/art/SentinelTower';
import {securityWallModel} from '../src/art/SecurityWalls';

test('centered armor stays centered when rotated into short wall connections',()=>{
 const k=new WorldKit();try{for(const length of [.5,1]){
  const g=new THREE.Group(),hull=armoredHull(k,g,.6,1.2,length,[0,.6,0],'#123456',.15);hull.rotation.y=Math.PI/2;
  const bounds=new THREE.Box3().setFromObject(g),center=bounds.getCenter(new THREE.Vector3());
  assert.ok(Math.abs(center.x)<1e-6&&Math.abs(center.z)<1e-6);
  assert.ok(bounds.max.x<=length/2+1e-6&&bounds.min.x>=-length/2-1e-6);
 }}finally{k.dispose();}
});
test('each wall half connection remains in its owner tile with bounded height',()=>{
 const k=new WorldKit();try{for(let level=1;level<=5;level++){
  const model=securityWallModel(k,.5,1.2,level,false),bounds=new THREE.Box3().setFromObject(model);
  assert.ok(bounds.min.x>=-.251&&bounds.max.x<=.251);
  assert.ok(bounds.min.z>=-.5&&bounds.max.z<=.5);
  assert.ok(bounds.max.y<=1.35&&bounds.min.y>=-.001);
 }}finally{k.dispose();}
});
test('weapon housings preserve the physical muzzle through rotation and recoil at every tier',()=>{
 const k=new WorldKit();try{for(let level=1;level<=5;level++){
  const model=sentinelModel(k,level),parts=model.userData.sentinel;
  assert.equal(parts.muzzle.parent,parts.recoil);
  assert.deepEqual(parts.muzzle.position.toArray(),[0,.12,1.93]);
  model.rotation.y=.7;parts.yaw.rotation.y=.4;parts.pitch.rotation.x=-.18;
  const before=parts.muzzle.getWorldPosition(new THREE.Vector3());
  parts.recoil.position.z=-.23;
  const after=parts.muzzle.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(before.distanceTo(after)-.23)<1e-6);
  animateSentinel(model,undefined,1000,.016,false);
  assert.equal(parts.recoil.position.z,0);
 }}finally{k.dispose();}
});
test('technology surfaces use actual shared finish differences without transparent wall overdraw',()=>{
 const k=new WorldKit();try{const starter=technologyMaterials(k,1),advanced=technologyMaterials(k,4),flagship=technologyMaterials(k,5);
  const matte=k.mat(starter.shell) as THREE.MeshStandardMaterial,ceramic=k.mat(advanced.shell) as THREE.MeshStandardMaterial,metal=k.mat(flagship.metal) as THREE.MeshStandardMaterial;
  assert.ok(matte.roughness>ceramic.roughness&&metal.metalness>ceramic.metalness);
  assert.equal(k.mat(flagship.metal),metal);
  for(let level=1;level<=5;level++)securityWallModel(k,1,1.2,level).traverse(n=>{if(n instanceof THREE.Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])assert.equal(m.transparent,false);});
 }finally{k.dispose();}
});

test('idle animation preserves authored emitter and lab apparatus scale',async()=>{
 const {arcSpireModel,animateArcSpire}=await import('../src/art/ArcSpire');
 const {researchLabModel,animateResearchLab}=await import('../src/art/ResearchLab');
 const k=new WorldKit();try{for(let level=1;level<=5;level++){
  const arc=arcSpireModel(k,level),sphere=arc.userData.arcSpire.sphere,scale=sphere.scale.x;
  animateArcSpire(arc,undefined,1000,.016,false);assert.equal(sphere.scale.x,scale);
  const lab=researchLabModel(k,level),core=lab.getObjectByName('research-core')!,labScale=core.scale.x;
  animateResearchLab(lab,1,false,true);assert.equal(core.scale.x,labScale);
 }}finally{k.dispose();}
});
