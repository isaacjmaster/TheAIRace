import * as THREE from 'three';
/** Small reusable contact bursts: no physics, dynamic lights or hit calculations. */
export class BreachImpact {
 readonly group=new THREE.Group();
 private geometry=new THREE.BoxGeometry(.075,.09,.13);
 private ringGeometry=new THREE.RingGeometry(.18,.24,16);
 private material=new THREE.MeshBasicMaterial({color:0xffa53a});
 private ringMaterial=new THREE.MeshBasicMaterial({color:0xffce79,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false});
 private slots=Array.from({length:12},()=>{const group=new THREE.Group(),ring=new THREE.Mesh(this.ringGeometry,this.ringMaterial),sparks=new THREE.InstancedMesh(this.geometry,this.material,7);sparks.frustumCulled=false;sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(ring,sparks);group.visible=false;this.group.add(group);return {group,ring,sparks,at:-Infinity};});
 private dummy=new THREE.Object3D();
 fire(position:THREE.Vector3,now:number){const slot=this.slots.find(s=>!s.group.visible)??this.slots.reduce((a,b)=>a.at<b.at?a:b);slot.group.position.copy(position);slot.at=now;slot.group.visible=true;}
 update(now:number,camera:THREE.Camera,reduced=false){for(const s of this.slots){if(!s.group.visible)continue;const t=(now-s.at)/360;if(t<0||t>=1){s.group.visible=false;continue;}s.ring.quaternion.copy(camera.quaternion);s.ring.scale.setScalar(.7+t*2.5);s.ring.visible=t<.45;for(let i=0;i<7;i++){const a=i*2.399;this.dummy.position.set(Math.cos(a)*t*.65,Math.sin(a)*t*.5,Math.sin(a*2)*t*.35);this.dummy.rotation.set(a,t*3,a);this.dummy.scale.setScalar(reduced?(i===0?1-t:0):1-t);this.dummy.updateMatrix();s.sparks.setMatrixAt(i,this.dummy.matrix);}s.sparks.instanceMatrix.needsUpdate=true;}}
 dispose(){this.group.removeFromParent();for(const s of this.slots)s.sparks.dispose();this.geometry.dispose();this.ringGeometry.dispose();this.material.dispose();this.ringMaterial.dispose();}
}
