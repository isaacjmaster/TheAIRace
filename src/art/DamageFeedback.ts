import * as THREE from 'three';
/** Isolate only illuminated surfaces, so a hit never flashes shared campus materials. */
export class DamageFeedback {
 private entries=new Map<THREE.Group,{surfaces:{material:THREE.MeshStandardMaterial;base:number}[];at:number}>();
 hit(model:THREE.Group,now:number){if(model.userData.systemDisabled)return;let e=this.entries.get(model);if(!e){const surfaces:{material:THREE.MeshStandardMaterial;base:number}[]=[];model.traverse(n=>{if(!(n instanceof THREE.Mesh)||surfaces.length>=3)return;const m=n.material;if(!(m instanceof THREE.MeshStandardMaterial)||!m.emissive.getHex())return;const material=m.clone();material.onBeforeCompile=m.onBeforeCompile;material.customProgramCacheKey=m.customProgramCacheKey;n.material=material;surfaces.push({material,base:m.emissiveIntensity});});e={surfaces,at:now};this.entries.set(model,e);}e.at=now;}
 update(now:number){for(const [model,e] of this.entries){if(model.userData.systemDisabled)continue;const t=Math.max(0,1-(now-e.at)/170);for(const s of e.surfaces)s.material.emissiveIntensity=s.base+t*.7;}}
 settle(model:THREE.Group){const e=this.entries.get(model);if(e)for(const s of e.surfaces)s.material.emissiveIntensity=s.base;}
 dispose(){for(const e of this.entries.values())for(const s of e.surfaces)s.material.dispose();this.entries.clear();}
}
