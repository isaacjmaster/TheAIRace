import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldKit} from '../src/art/world';
import {applyBuildingLevel,progressionModel,type VisualBuildingKind} from '../src/art/BuildingLevels';
import {animateGenerationEnergy} from '../src/art/GenerationEnergy';
import {HackEffects} from '../src/art/HackEffects';
import {DamageFeedback} from '../src/art/DamageFeedback';
const kinds:VisualBuildingKind[]=['rig','lab','computeStorage','researchStorage','fabricator','hangar','sentinel','droneStation','arcSpire'];
const energyMaterials=(g:THREE.Object3D)=>{const set=new Set<THREE.MeshStandardMaterial>();g.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial&&m.customProgramCacheKey().startsWith('generation-energy-v1:'))set.add(m);});return [...set];};
const compile=(m:THREE.MeshStandardMaterial)=>{const shader={uniforms:{} as Record<string,{value:number}>,vertexShader:'#include <begin_vertex>',fragmentShader:'#include <emissivemap_fragment>'};m.onBeforeCompile(shader as never,{} as THREE.WebGLRenderer);return shader;};

test('all nine real high-tier families bind spatial energy shaders and isolated per-instance uniforms',()=>{
 const k=new WorldKit();try{for(const kind of kinds)for(const level of [4,5]){
  const a=progressionModel(k,kind,level),b=progressionModel(k,kind,level),am=energyMaterials(a),bm=energyMaterials(b);assert.ok(am.length&&bm.length,`${kind} ${level} has actual animated materials`);
  const as=am.map(compile),bs=bm.map(compile);assert.ok(as.every(s=>s.vertexShader.includes('vGenerationPosition=position')&&s.fragmentShader.includes('totalEmissiveRadiance*=')));
  animateGenerationEnergy(a,11);for(const s of as){assert.equal(s.uniforms.generationTime.value,11);assert.equal(s.uniforms.generationEnabled.value,1);}for(const s of bs){assert.equal(s.uniforms.generationTime.value,0);assert.equal(s.uniforms.generationEnabled.value,0);}
  assert.notEqual(as[0].uniforms.generationTime,bs[0].uniforms.generationTime,`${kind} instance clock isolation`);
  animateGenerationEnergy(a,55,true);for(const s of as){assert.equal(s.uniforms.generationTime.value,0);assert.equal(s.uniforms.generationEnabled.value,0);}animateGenerationEnergy(a,99,true);assert.equal(as[0].uniforms.generationTime.value,0);
 }}finally{k.dispose();}
});

test('family shaders follow equipment axes instead of sharing a universal pulse',()=>{
 const k=new WorldKit();try{const sources=new Map(kinds.map(kind=>[kind,compile(energyMaterials(progressionModel(k,kind,5))[0]).fragmentShader]));
 assert.ok(sources.get('rig')!.includes('vGenerationPosition.x*3.0'));
 assert.ok(sources.get('lab')!.includes('vGenerationPosition.y*4.0+vGenerationPosition.x*2.0'));
 assert.ok(sources.get('fabricator')!.includes('atan('));assert.ok(sources.get('droneStation')!.includes('length(vGenerationPosition.xz)'));
 assert.ok(new Set(sources.values()).size>=6,'at least six physically distinct circulation patterns');
 }finally{k.dispose();}
});

test('energy updates retain geometry, materials, uniforms, transforms and node counts without effect accumulation',()=>{
 const k=new WorldKit();try{for(const kind of kinds)for(const level of [4,5]){
 const g=progressionModel(k,kind,level),nodes:THREE.Object3D[]=[],state=new Map<THREE.Object3D,unknown>();g.traverse(o=>{nodes.push(o);state.set(o,{position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),geometry:o instanceof THREE.Mesh?o.geometry:undefined,material:o instanceof THREE.Mesh?o.material:undefined});});
 const materials=energyMaterials(g),shaders=materials.map(compile),refs=shaders.map(s=>[s.uniforms.generationTime,s.uniforms.generationEnabled]);
 const geometryCount=(k as unknown as {geometries:Map<unknown,unknown>}).geometries.size,materialCount=(k as unknown as {materials:Map<unknown,unknown>}).materials.size;
 for(let i=0;i<600;i++)animateGenerationEnergy(g,i/60,i%47===0);
 const after:THREE.Object3D[]=[];g.traverse(o=>{after.push(o);assert.deepEqual({position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),geometry:o instanceof THREE.Mesh?o.geometry:undefined,material:o instanceof THREE.Mesh?o.material:undefined},state.get(o));});assert.deepEqual(after,nodes);
 assert.equal((k as unknown as {geometries:Map<unknown,unknown>}).geometries.size,geometryCount);assert.equal((k as unknown as {materials:Map<unknown,unknown>}).materials.size,materialCount);
 shaders.forEach((s,i)=>{assert.equal(s.uniforms.generationTime,refs[i][0]);assert.equal(s.uniforms.generationEnabled,refs[i][1]);});
 }}finally{k.dispose();}
});

test('high-to-low visual rebuild clears stale energy clocks while retaining resident bots and GPU ports',()=>{
 const k=new WorldKit();try{for(const kind of kinds.filter(k=>!k.endsWith('Storage'))){const g=progressionModel(k,kind,5),old=g.userData.generationEnergy;animateGenerationEnergy(g,7);const resident=new THREE.Group();resident.name='docked-test-resident';g.add(resident);
 g.position.set(12,0,-8);g.rotation.y=Math.PI/2;applyBuildingLevel(k,g,kind,1);assert.equal(g.userData.generationEnergy,undefined,kind);assert.equal(energyMaterials(g).length,0,kind);assert.equal(g.getObjectByName(resident.name),resident);assert.deepEqual(g.position.toArray(),[12,0,-8]);assert.equal(g.rotation.y,Math.PI/2);
 animateGenerationEnergy(g,30);assert.equal(old.time.value,7,'retired shader clock remains untouched');if(kind==='rig'){assert.ok(g.getObjectByName('gpu-power-port'));for(let i=0;i<3;i++)assert.ok(g.getObjectByName('gpu-fan-'+i));}
 }}finally{k.dispose();}
});

test('hacked high-tier buildings remain powered down even if their presentation clock is updated',()=>{
 const k=new WorldKit(),hacks=new HackEffects();try{for(const kind of kinds){const g=progressionModel(k,kind,5);animateGenerationEnergy(g,4);hacks.apply(kind,g,1200,kind==='rig'?'gpu':kind==='lab'?'lab':kind==='sentinel'?'sentinel':kind==='arcSpire'?'arcSpire':'generic');assert.equal(g.userData.systemDisabled,true);
 for(let t=5;t<20;t++)animateGenerationEnergy(g,t);g.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial)assert.equal(m.emissiveIntensity,0,`${kind} must not relight`);});
 }}finally{hacks.dispose();k.dispose();}
});

test('a normal damage flash preserves energy shader hooks on any cloned animated surfaces',()=>{
 const k=new WorldKit(),feedback=new DamageFeedback();let checked=0;try{for(const kind of kinds){const g=progressionModel(k,kind,5),before=new Map<THREE.Mesh,THREE.MeshStandardMaterial>();g.traverse(o=>{if(o instanceof THREE.Mesh&&o.material instanceof THREE.MeshStandardMaterial&&o.material.customProgramCacheKey().startsWith('generation-energy-v1:'))before.set(o,o.material);});feedback.hit(g,100);for(const [mesh,old] of before)if(mesh.material!==old){checked++;const replacement=mesh.material as THREE.MeshStandardMaterial;assert.equal(replacement.onBeforeCompile,old.onBeforeCompile,kind);assert.equal(replacement.customProgramCacheKey(),old.customProgramCacheKey(),kind);}}
 assert.ok(checked>0,'real damaged models exercised animated material clones');
 }finally{feedback.dispose();k.dispose();}
});

test('WorldKit teardown disposes every instance-owned energy material exactly once',()=>{
 const k=new WorldKit(),counts=new Map<THREE.Material,number>();for(const kind of kinds)for(const level of [4,5])for(const material of energyMaterials(progressionModel(k,kind,level))){counts.set(material,0);material.addEventListener('dispose',()=>counts.set(material,counts.get(material)!+1));}k.dispose();for(const count of counts.values())assert.equal(count,1);
});
