import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {founderHQ,pickFoundationBuilding} from '../src/art/FounderHQ';
import {gpuRigModel} from '../src/art/GpuRig';
import {WorldKit} from '../src/art/world';

test('actual house and GPU meshes select independently; empty former garage space is not selectable',()=>{
 const kit=new WorldKit(),hq=new THREE.Group();founderHQ(kit,hq);const rig=gpuRigModel(kit);rig.position.set(6,0,0);hq.updateMatrixWorld(true);rig.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();const down=(x:number,z:number)=>{ray.set(new THREE.Vector3(x,20,z),new THREE.Vector3(0,-1,0));return pickFoundationBuilding(ray,hq,rig);};
 assert.equal(down(-5,-1),'hq');assert.equal(down(6,0),'rig');assert.equal(down(-10,-4),undefined);assert.equal(down(15,15),undefined);kit.dispose();
});
test('founder is visible through the flush window from the HQ camera direction',()=>{
 for(const level of [1,2,3,4,5] as const){const kit=new WorldKit(),hq=new THREE.Group();const house=founderHQ(kit,hq,level);hq.updateMatrixWorld(true);
 const founder=house.getObjectByName('Founder at laptop')!;const face=founder.localToWorld(new THREE.Vector3(0,3.15,.4));
 const direction=new THREE.Vector3(13,28,30).normalize();const ray=new THREE.Raycaster(face.clone().addScaledVector(direction,30),direction.clone().negate());
 const hit=ray.intersectObject(hq,true)[0];assert.ok(hit);assert.ok(founder.getObjectById(hit.object.id),`level ${level}: roof and window frame must not hide the founder`);kit.dispose();}
});

