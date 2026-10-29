import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PlacementOverlay} from '../src/art/PlacementOverlay';
import {initialFoundation,buildingLayout,placementFootprint} from '../shared/foundation';
import {decorationFootprint} from '../shared/decoration-catalog';

function outlines(view:PlacementOverlay){return view.group.children.find(o=>o instanceof THREE.LineSegments) as THREE.LineSegments;}
function rectangles(view:PlacementOverlay){
 const points=outlines(view).geometry.getAttribute('position'),result=[];
 for(let i=0;i<points.count;i+=8){const b=new THREE.Box3();for(let j=0;j<8;j++)b.expandByPoint(new THREE.Vector3().fromBufferAttribute(points,i+j));result.push({x:(b.min.x+b.max.x)/2,z:(b.min.z+b.max.z)/2,w:b.max.x-b.min.x,d:b.max.z-b.min.z});}
 return result;
}
test('occupied outlines follow authoritative rotated cells, visible huts and placed inventory',()=>{
 const s=initialFoundation(),view=new PlacementOverlay();
 s.hqLayout={position:[-5,0],orientation:1};
 s.rig={position:[12,8.5],orientation:3,startedAt:0,completesAt:0,stored:0,lastProducedAt:0};
 s.builderHuts=[{id:'hut',position:[20,12.5],orientation:1},{id:'stored-hut',position:[25,12],orientation:0,unplaced:true}];
 s.decorations=[{id:'flowers',kind:'flowers',position:[7,20.5],orientation:1}];
 const before=structuredClone(s);
 try{
  view.sync(s,new Set(['hq','rig','hut','stored-hut','flowers']));
  assert.deepEqual(rectangles(view),[placementFootprint('hq',buildingLayout(s,'hq')!),placementFootprint('rig',buildingLayout(s,'rig')!),placementFootprint('station',s.builderHuts[0]),decorationFootprint(s.decorations[0])]);
  view.sync(s,new Set(['hut']));assert.deepEqual(rectangles(view),[placementFootprint('station',s.builderHuts[0])]);
  view.sync(s,new Set());assert.deepEqual(rectangles(view),[]);
  assert.deepEqual(s,before,'overlay cannot mutate placement or ownership');
 }finally{view.dispose();}
});
test('passive state changes reuse occupied geometry buffers while movement refreshes them',()=>{
 const s=initialFoundation(),view=new PlacementOverlay();
 try{
  view.sync(s);const geometry=outlines(view).geometry,positions=geometry.getAttribute('position');
  const copy=structuredClone(s);copy.compute+=1;view.sync(copy);
  assert.equal(outlines(view).geometry,geometry);assert.equal(geometry.getAttribute('position'),positions);
  copy.hqLayout={position:[10,12],orientation:1};view.sync(copy);
  assert.equal(outlines(view).geometry,geometry);assert.notEqual(geometry.getAttribute('position'),positions);
  assert.ok(rectangles(view).some(r=>r.x===10&&r.z===12&&r.w===10&&r.d===9));
 }finally{view.dispose();}
});
test('selected valid and invalid footprints occupy the same cells without intercepting input',()=>{
 const view=new PlacementOverlay(),r={x:7,z:-4,w:3,d:5};
 try{
  view.preview(r,true);view.group.updateMatrixWorld(true);
  const fill=view.group.getObjectByName('selected-occupied-footprint') as THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>,edge=view.group.children.find(o=>o instanceof THREE.LineLoop) as THREE.LineLoop<THREE.BufferGeometry,THREE.LineBasicMaterial>;
  const b=new THREE.Box3().setFromObject(fill);assert.ok(Math.abs(b.min.x-5.5)<1e-6&&Math.abs(b.max.x-8.5)<1e-6&&Math.abs(b.min.z+6.5)<1e-6&&Math.abs(b.max.z+1.5)<1e-6);
  assert.equal(fill.visible,true);assert.equal(edge.visible,true);const validColor=fill.material.color.getHex();
  view.preview(r,false);assert.notEqual(fill.material.color.getHex(),validColor);assert.equal(fill.material.color.getHex(),edge.material.color.getHex());assert.deepEqual(new THREE.Box3().setFromObject(fill),b);
  assert.deepEqual(new THREE.Raycaster(new THREE.Vector3(7,10,-4),new THREE.Vector3(0,-1,0)).intersectObject(view.group,true),[]);
  view.preview();assert.equal(fill.visible,false);assert.equal(edge.visible,false);
 }finally{view.dispose();}
});
test('overlay teardown detaches and disposes every owned drawing resource',()=>{
 const view=new PlacementOverlay(),scene=new THREE.Scene(),counts=new Map<THREE.BufferGeometry|THREE.Material,number>();scene.add(view.group);
 for(const child of view.group.children){const o=child as THREE.Mesh;for(const resource of [o.geometry,...(Array.isArray(o.material)?o.material:[o.material])]){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)!+1));}}
 view.dispose();assert.equal(view.group.parent,null);assert.equal(counts.size,6);assert.ok([...counts.values()].every(n=>n===1));
});
