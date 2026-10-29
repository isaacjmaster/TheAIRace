import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GroundOcclusionProbe} from '../src/art/PlacementOcclusion';
test('wall editing fades only geometry between the camera and the preview ground',()=>{
 const camera=new THREE.OrthographicCamera(-15,15,15,-15,.1,100);camera.position.set(0,20,20);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 const probe=new GroundOcclusionProbe(),ground=new THREE.Box3(new THREE.Vector3(-.5,0,-.5),new THREE.Vector3(.5,0,.5)),geometry=new THREE.BoxGeometry(3,6,3),material=new THREE.MeshBasicMaterial(),model=new THREE.Mesh(geometry,material);
 try{model.position.set(0,3,3);assert.equal(probe.obscures(model,ground,camera),true,'foreground tall structure hides wall');model.position.set(8,3,3);assert.equal(probe.obscures(model,ground,camera),false,'unrelated nearby building remains opaque');model.position.set(0,3,-6);assert.equal(probe.obscures(model,ground,camera),false,'building behind the wall remains opaque');model.position.set(0,3,3);model.visible=false;assert.equal(probe.obscures(model,ground,camera),false);model.visible=true;
 camera.position.set(0,20,-20);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);assert.equal(probe.obscures(model,ground,camera),false,'camera changes reconsider which structure is in front');model.position.set(0,3,-3);assert.equal(probe.obscures(model,ground,camera),true);
 }finally{geometry.dispose();material.dispose();}
});
test('ground slabs never fade and row endpoint obstruction is recognized',()=>{
 const camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,100);camera.position.set(0,20,20);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);const probe=new GroundOcclusionProbe(),ground=new THREE.Box3(new THREE.Vector3(-8,0,-.5),new THREE.Vector3(8,0,.5));
 const geometry=new THREE.BoxGeometry(2,6,2),material=new THREE.MeshBasicMaterial(),model=new THREE.Mesh(geometry,material);try{model.position.set(8,3,3);assert.equal(probe.obscures(model,ground,camera),true);model.scale.y=.02;model.position.y=.06;assert.equal(probe.obscures(model,ground,camera),false);}finally{geometry.dispose();material.dispose();}
});
