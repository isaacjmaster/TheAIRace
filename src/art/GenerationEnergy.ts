import * as THREE from 'three';
import {WorldKit} from './world';

type EnergyRig={time:{value:number};enabled:{value:number}};
/** Spatial movement follows each family's equipment; no new lights, meshes or per-frame allocations. */
export function addGenerationEnergy(k:WorldKit,g:THREE.Group,level:number,kind:string,colors:string[]){
 g.userData.generationEnergy=undefined;
 if(level<4||!colors.length)return;
 const rig:EnergyRig={time:{value:0},enabled:{value:0}},selected=new Set(colors.map(c=>new THREE.Color(c).getHex())),copies=new Map<THREE.Material,THREE.Material>();
 const phase=kind==='fabricator'||kind==='arcSpire'?'atan(vGenerationPosition.z,vGenerationPosition.x)*3.0':kind==='hangar'?'vGenerationPosition.z*3.2':kind==='droneStation'?'length(vGenerationPosition.xz)*5.0':kind==='sentinel'?'vGenerationPosition.z*5.0':kind==='rig'?'vGenerationPosition.x*3.0':kind==='lab'?'vGenerationPosition.y*4.0+vGenerationPosition.x*2.0':'vGenerationPosition.y*5.0';
 g.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const adapt=(source:THREE.Material)=>{
  if(!(source instanceof THREE.MeshStandardMaterial)||!selected.has(source.color.getHex())||source.emissiveIntensity<=0)return source;
  if(copies.has(source))return copies.get(source)!;
  const mat=k.ownMaterial(source.clone());
  mat.onBeforeCompile=shader=>{shader.uniforms.generationTime=rig.time;shader.uniforms.generationEnabled=rig.enabled;shader.vertexShader='varying vec3 vGenerationPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGenerationPosition=position;');shader.fragmentShader='varying vec3 vGenerationPosition;\nuniform float generationTime;\nuniform float generationEnabled;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>\nfloat flow=pow(0.5+0.5*sin(${phase}-generationTime*1.5),3.0);\ntotalEmissiveRadiance*=1.0+generationEnabled*(flow*0.28-0.07);`);};
  mat.customProgramCacheKey=()=>`generation-energy-v1:${kind}`;copies.set(source,mat);return mat;
 };o.material=Array.isArray(o.material)?o.material.map(adapt):adapt(o.material);});
 if(copies.size)g.userData.generationEnergy=rig;
}
export function animateGenerationEnergy(g:THREE.Object3D,time:number,reduced=false){
 const rig=g.userData.generationEnergy as EnergyRig|undefined;if(!rig)return;
 rig.time.value=reduced?0:time;rig.enabled.value=reduced?0:1;
}
