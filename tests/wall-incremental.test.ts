import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SecurityWalls} from '../src/art/SecurityWalls';
import type {SecurityBarrier} from '../shared/security-walls';
const wall=(x:number,z:number,level:1|2|3|4|5=5):SecurityBarrier=>({id:`${x},${z}`,x,z,w:1,d:1,level});
test('joined mixed-level barriers remain continuous at tile boundaries while intentional openings stay open',()=>{
 for(const vertical of [false,true]){
  const input=Array.from({length:5},(_,i)=>wall(vertical?.5:i+.5,vertical?i+.5:.5,(i+1) as 1|2|3|4|5));
  const view=new SecurityWalls([]);try{view.sync(input);view.group.updateMatrixWorld(true);for(const edge of [1,2,3,4]){
   const ray=new THREE.Raycaster(new THREE.Vector3(vertical?-2:edge,.65,vertical?edge:-2),new THREE.Vector3(vertical?1:0,0,vertical?0:1));
   assert.ok(ray.intersectObject(view.group,true).length>0,`visible panel reaches shared ${vertical?'z':'x'} edge ${edge}`);
  }
  view.sync(input.filter((_,i)=>i!==2));view.group.updateMatrixWorld(true);const gap=new THREE.Raycaster(new THREE.Vector3(vertical?-2:2.5,.65,vertical?2.5:-2),new THREE.Vector3(vertical?1:0,0,vertical?0:1));assert.equal(gap.intersectObject(view.group,true).length,0,'destroyed center tile leaves a real visible opening');
  }finally{view.dispose();}
 }
});
function triangles(view:SecurityWalls){let n=0;view.group.traverse(o=>{if(o instanceof THREE.Mesh)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return n;}
function signature(view:SecurityWalls){const out:string[]=[];view.group.updateMatrixWorld(true);view.group.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const p=o.geometry.attributes.position,m=o.material as THREE.MeshStandardMaterial,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);out.push(`${m.color.getHexString()}:${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`);}});return out.sort();}
test('incremental wall batches match static geometry across corners, intersections and mixed chunk boundaries',()=>{
 const cells=[wall(15.5,.5,1),wall(16.5,.5,2),wall(17.5,.5,3),wall(16.5,1.5,4),wall(16.5,-.5,5),wall(-.5,15.5,2),wall(.5,15.5,3),wall(.5,16.5,4),wall(30.5,8.5,5)];
 const saved=structuredClone(cells),staticView=new SecurityWalls(cells),view=new SecurityWalls([]);
 try{view.sync(cells);assert.deepEqual(signature(view),signature(staticView));assert.deepEqual(cells,saved);const meshes=[...view.group.children];assert.equal(view.sync([...cells].reverse()),0);assert.deepEqual(view.group.children,meshes);}finally{view.dispose();staticView.dispose();}
});
test('a boundary edit refreshes both neighboring regions and preserves unrelated GPU resources',()=>{
 const input=[wall(15.5,.5),wall(16.5,.5),wall(40.5,.5),wall(41.5,.5)],view=new SecurityWalls([]);view.sync(input);
 try{const far=view.group.children.filter(m=>new THREE.Box3().setFromObject(m).min.x>30);assert.ok(far.length);let disposed=0;for(const m of far)(m as THREE.Mesh).geometry.addEventListener('dispose',()=>disposed++);
 const moved=input.map(w=>w.x===16.5?{...w,z:1.5}:w);assert.equal(view.sync(moved),2);assert.ok(far.every(m=>view.group.children.includes(m)));assert.equal(disposed,0);
 const expected=new SecurityWalls(moved);try{assert.deepEqual(signature(view),signature(expected));}finally{expected.dispose();}
 view.sync([]);assert.equal(disposed,far.length);assert.equal(view.group.children.length,0);
 }finally{view.dispose();}
});
test('200-wall layouts retain exact geometry while interior edits rebuild only their region',()=>{
 const input:SecurityBarrier[]=[];for(let x=0;x<50;x++)for(const z of [.5,10.5,20.5,30.5])input.push(wall(x+.5,z));
 const staticView=new SecurityWalls(input),view=new SecurityWalls([]);try{view.sync(input);assert.equal(triangles(view),triangles(staticView));assert.deepEqual(new THREE.Box3().setFromObject(view.group),new THREE.Box3().setFromObject(staticView.group));
 const meshes=[...view.group.children],changed=input.map(w=>w.x===7.5&&w.z===.5?{...w,level:4 as const}:w);assert.equal(view.sync(changed),1);assert.ok(meshes.filter(m=>view.group.children.includes(m)).length>meshes.length/2,'most batches survive a local edit');
 const changedStatic=new SecurityWalls(changed);try{view.compact(changed);assert.equal(view.group.children.length,changedStatic.group.children.length);assert.deepEqual(signature(view),signature(changedStatic));assert.ok(view.sync(input)>0,'editing can resume after compaction');}finally{changedStatic.dispose();}
 }finally{view.dispose();staticView.dispose();}
});
