import * as THREE from 'three';
export type FailureKind='arcSpire'|'hq'|'gpu'|'lab'|'sentinel'|'station'|'wall'|'generic';
type Surface={original:THREE.MeshStandardMaterial;damaged:THREE.MeshStandardMaterial;lit:boolean};
type Failure={model:THREE.Group;position:THREE.Vector3;surfaces:Surface[];particles:THREE.InstancedMesh;kind:FailureKind;finished:boolean;spread:number;height:number;fans?:{node:THREE.Object3D;angle:number}[];pitch?:THREE.Object3D};
/** One-shot visual shutdowns. Shared particle geometry, no physics or gameplay writes. */
export class HackEffects {
 private entries=new Map<string,Failure>();private geometry=new THREE.BoxGeometry(.14,.09,.18);private materials=new Map<FailureKind,THREE.MeshBasicMaterial>();private dummy=new THREE.Object3D();
 apply(id:string,model:THREE.Group,age:number,kind:FailureKind='generic'){
  let e=this.entries.get(id);if(e?.finished)return;
  if(!e){const clones=new Map<THREE.Material,THREE.Material>(),surfaces:Surface[]=[];
   model.traverse(n=>{if(!(n instanceof THREE.Mesh))return;const clone=(m:THREE.Material)=>{if(!(m instanceof THREE.MeshStandardMaterial))return m;if(clones.has(m))return clones.get(m)!;const damaged=m.clone();clones.set(m,damaged);surfaces.push({original:m,damaged,lit:m.emissive.getHex()!==0&&m.emissiveIntensity>0});return damaged;};n.material=Array.isArray(n.material)?n.material.map(clone):clone(n.material);});
   const color=kind==='sentinel'?'#b5ff38':(kind==='lab'||kind==='arcSpire')?'#b68bff':kind==='wall'?'#718b97':'#64e9ef';let material=this.materials.get(kind);if(!material){material=new THREE.MeshBasicMaterial({color});this.materials.set(kind,material);}
   const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()),spread=Math.max(size.x,size.z,1)/(Math.min(model.scale.x,model.scale.z)||1)*.6,height=Math.max(1,size.y/(model.scale.y||1));
   const particles=new THREE.InstancedMesh(this.geometry,material,kind==='wall'?5:kind==='hq'?12:8);particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);particles.frustumCulled=false;particles.name='shutdown-fragments';model.add(particles);
   e={model,position:model.position.clone(),surfaces,particles,kind,finished:false,spread,height,fans:kind==='gpu'?[0,1,2].map(i=>model.getObjectByName('gpu-fan-'+i)).filter((n):n is THREE.Object3D=>!!n).map(node=>({node,angle:node.rotation.z})):undefined,pitch:model.userData.sentinel?.pitch};this.entries.set(id,e);model.userData.systemDisabled=true;
  }
  const duration=kind==='wall'?450:1200,t=THREE.MathUtils.clamp(age/duration,0,1),surge=t<.17?1-t/.17:Math.max(0,1-t)*((Math.floor(t*30)%3)===0?.35:0),color=kind==='sentinel'?0xb5ff38:(kind==='lab'||kind==='arcSpire')?0xb68bff:0x64e9ef;
  for(const s of e.surfaces){s.damaged.color.copy(s.original.color).multiplyScalar(1-.48*Math.min(1,t*2));s.damaged.emissive.setHex(color);s.damaged.emissiveIntensity=(s.lit?1:.12)*surge;if(t===1)s.damaged.emissiveIntensity=0;}
  // A tiny decaying interference jitter, never a whole-building scale/collapse.
  model.position.copy(e.position);if(t<.6){model.position.x+=Math.sin(t*95)*(1-t)*.035;model.position.z+=Math.sin(t*71)*(1-t)*.025;}
  if(e.pitch)e.pitch.rotation.x=.32*Math.min(1,t*1.5);
  for(const fan of e.fans??[])fan.node.rotation.z=fan.angle+1.4*(1-Math.pow(1-t,3));
  for(let i=0;i<e.particles.count;i++){const angle=i*2.399,spread=e.spread,u=Math.min(1,t*1.5),radius=spread*(.85+u*.3),y=t===1?.08:Math.max(.08,e.height*(1-u)*.45+Math.sin(u*Math.PI)*.8);this.dummy.position.set(Math.sin(angle)*radius,y,Math.cos(angle)*radius);this.dummy.rotation.set(u*3+i,angle,u*2);this.dummy.scale.setScalar(t===1?(i<3?1:0):1-t*.35);this.dummy.updateMatrix();e.particles.setMatrixAt(i,this.dummy.matrix);}e.particles.instanceMatrix.needsUpdate=true;
  if(t===1){e.finished=true;model.position.copy(e.position);if(kind==='arcSpire'){const parts=model.userData.arcSpire;if(parts){parts.charge.visible=false;for(const arc of parts.arcs)arc.visible=false;parts.sphere.scale.setScalar(.4);}}}
 }
 dispose(){for(const e of this.entries.values()){e.particles.removeFromParent();e.particles.dispose();for(const s of e.surfaces)s.damaged.dispose();}this.entries.clear();this.geometry.dispose();for(const m of this.materials.values())m.dispose();}
}
