import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SecurityWalls,securityWallModel} from '../src/art/SecurityWalls';
import {WorldKit} from '../src/art/world';
import type {SecurityBarrier} from '../shared/security-walls';

const row=(count:number,level:1|2|3|4|5):SecurityBarrier[]=>Array.from({length:count},(_,i)=>({id:`wall-${i}`,x:i+.5,z:.5,w:1,d:1,level}));
function materials(g:THREE.Object3D){const result=new Set<THREE.MeshStandardMaterial>();g.traverse(o=>{if(o instanceof THREE.Mesh&&o.material instanceof THREE.MeshStandardMaterial)result.add(o.material);});return [...result];}

test('half-tile grid rows retain spaced crystal piers away from their endpoints',()=>{
 for(const level of [4,5] as const)for(const vertical of [false,true])for(const offset of [0,-12]){
  const input=row(12,level).map(w=>({...w,x:vertical?.5:w.x+offset,z:vertical?w.x+offset:.5})),walls=new SecurityWalls(input);
  try{
   const interior=new Set<number>();walls.group.updateMatrixWorld(true);
   walls.group.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const vertices=o.geometry.attributes.position,point=new THREE.Vector3();
    for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(o.matrixWorld);const along=vertical?point.z:point.x;
     // Only the upper crystal facets rise this far; endpoints must not satisfy this check.
     if(point.y>1.7&&along>offset+2&&along<offset+10)interior.add(Math.floor(along));
    }
   });
   assert.ok(interior.size>=2,`level ${level}, ${vertical?'vertical':'horizontal'} row at ${offset}: intermediate crystal piers required`);
  }finally{walls.dispose();}
 }
});

test('approved walls preserve opaque faceted crystals, distinct palettes and one-tile previews without lighting helpers',()=>{
 const k=new WorldKit(),palettes:string[]=[];
 try{for(const level of [1,2,3,4,5]){
  const g=securityWallModel(k,1,1.2,level),bounds=new THREE.Box3().setFromObject(g);let crystals=0;
  assert.ok(bounds.min.x>=-.501&&bounds.max.x<=.501&&bounds.min.z>=-.501&&bounds.max.z<=.501);
  g.traverse(o=>{assert.equal(o instanceof THREE.Light,false);if(o.name==='mounted-wall-crystal'){crystals++;assert.ok(o instanceof THREE.Mesh);const geometry=(o as THREE.Mesh).geometry;assert.ok(geometry.attributes.normal,'facets survive reduced emissive settings');assert.ok(geometry.attributes.position.count>=24);}});
  assert.equal(crystals,level>=4?2:0);
  const mats=materials(g);assert.ok(mats.every(m=>!m.transparent),'200-wall scenes avoid stacked alpha surfaces');
  palettes.push(mats.map(m=>m.color.getHexString()).sort().join(','));
 }assert.equal(new Set(palettes).size,5);}finally{k.dispose();}
});

test('two hundred premium walls batch by shared materials, keep input intact and dispose their GPU resources',()=>{
 const walls=row(200,5),before=structuredClone(walls),small=new SecurityWalls(row(8,5)),large=new SecurityWalls(walls);
 try{
  assert.deepEqual(walls,before);assert.ok(large.group.children.length<=small.group.children.length+2,'draw batches do not grow per wall');
  assert.ok(large.group.children.length<=18);assert.ok(large.group.children.every(o=>o instanceof THREE.Mesh));
  const bounds=new THREE.Box3().setFromObject(large.group);assert.ok(bounds.min.x>=0&&bounds.max.x<=200&&bounds.min.z>=0&&bounds.max.z<=1);
  let disposed=0;const resource=new Set<THREE.BufferGeometry>();large.group.traverse(o=>{if(o instanceof THREE.Mesh)resource.add(o.geometry);});for(const g of resource)g.addEventListener('dispose',()=>disposed++);
  large.dispose();assert.equal(disposed,resource.size);
 }finally{small.dispose();}
});

test('ambient energy uses one shared clock, honors reduced motion and never moves wall geometry',()=>{
 const walls=new SecurityWalls([...row(4,4),...row(4,5).map(w=>({...w,id:w.id+'-v',z:2.5}))]);
 try{
  const before=new THREE.Box3().setFromObject(walls.group),compiled=materials(walls.group).filter(m=>m.userData.wallEnergy).map(m=>{
   const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <emissivemap_fragment>'};m.onBeforeCompile(shader as any,{} as THREE.WebGLRenderer);return shader as unknown as {uniforms:{wallTime:{value:number};wallMotion:{value:number}}};
  });assert.ok(compiled.length>=4,'blue/violet channels and crystals remain separately shaded');
  walls.update(21.5);assert.ok(compiled.every(s=>s.uniforms.wallTime.value===21.5&&s.uniforms.wallMotion.value===1));
  assert.ok(compiled.every(s=>s.uniforms.wallTime===compiled[0].uniforms.wallTime),'a shared uniform replaces per-wall animation updates');
  walls.update(22,true);assert.ok(compiled.every(s=>s.uniforms.wallMotion.value===0));
  assert.deepEqual(new THREE.Box3().setFromObject(walls.group),before);
  walls.update(Number.NaN);assert.ok(compiled.every(s=>Number.isFinite(s.uniforms.wallTime.value)));
 }finally{walls.dispose();}
});
