import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldKit,palette} from '../src/art/world';
import {founderHQ,pickFoundationBuilding} from '../src/art/FounderHQ';
import {gpuRigModel,animateGpu} from '../src/art/GpuRig';

test('campus finish leaves the title/raid default material profile unchanged and releases surface maps',()=>{
 const standard=new WorldKit(),campus=new WorldKit('campus');
 const old=standard.mat(palette.cream) as THREE.MeshStandardMaterial,newMat=campus.mat(palette.cream) as THREE.MeshStandardMaterial;
 assert.equal(old.color.getHexString(),'f0f3ef');assert.equal(old.metalness,.16);assert.equal(newMat.color.getHexString(),'fff8e9');assert.equal(newMat.metalness,0);
 const road=campus.roadMaterial();assert.equal(road.metalness,0);assert.ok(road.roughness>.85);assert.equal((road.bumpMap as THREE.DataTexture).image.width,64);
 const group=new THREE.Group(),shadow=campus.grounding(group,4,3)!;let released=0;
 road.bumpMap!.addEventListener('dispose',()=>released++);(shadow.material as THREE.MeshBasicMaterial).map!.addEventListener('dispose',()=>released++);
 standard.dispose();campus.dispose();assert.equal(released,2);
});

test('polished meshes keep real selection, ignore decorative contact shadows, and preserve the visible founder',()=>{
 const k=new WorldKit('campus'),root=new THREE.Group(),house=founderHQ(k,root),gpu=gpuRigModel(k);gpu.position.set(6,0,0);k.grounding(gpu,4.6,3.6);root.updateMatrixWorld(true);gpu.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();const down=(x:number,z:number)=>{ray.set(new THREE.Vector3(x,20,z),new THREE.Vector3(0,-1,0));return pickFoundationBuilding(ray,root,gpu);};
 assert.equal(down(-5,-1),'hq');assert.equal(down(6,0),'rig');assert.equal(down(-9.8,-1),undefined);assert.equal(down(8.6,0),undefined);
 const founder=house.getObjectByName('Founder at laptop')!,face=founder.localToWorld(new THREE.Vector3(0,3.15,.4)),direction=new THREE.Vector3(13,28,30).normalize();
 ray.set(face.clone().addScaledVector(direction,30),direction.clone().negate());assert.ok(founder.getObjectById(ray.intersectObject(root,true)[0]!.object.id),'the camera ray must reach the visible founder through the window');
 const fan=gpu.getObjectByName('gpu-fan-0')!;animateGpu(gpu,1,.1,true);assert.ok(fan.rotation.z>0);assert.ok(gpu.getObjectByName('gpu-activity'));k.dispose();
});

