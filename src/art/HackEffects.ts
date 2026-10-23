import * as THREE from 'three';
/** Per-battle visual state only; no owner geometry or server health is mutated. */
export class HackEffects {
 private entries=new Map<string,{model:THREE.Group;scale:THREE.Vector3;at:number;fx:THREE.Group;materials:THREE.MeshStandardMaterial[]}>();private geometry=new THREE.BoxGeometry(.12,.12,.12);private material=new THREE.MeshBasicMaterial({color:'#64e9ef',transparent:true,opacity:.8,depthWrite:false});
 apply(id:string,model:THREE.Group,age:number){let e=this.entries.get(id);if(!e){const materials:THREE.MeshStandardMaterial[]=[];model.traverse(n=>{if(n instanceof THREE.Mesh){const map=(m:THREE.Material)=>{if(!(m instanceof THREE.MeshStandardMaterial))return m;const clone=m.clone();clone.color.multiplyScalar(.48);clone.emissive.set('#245367');clone.emissiveIntensity=.12;materials.push(clone);return clone;};n.material=Array.isArray(n.material)?n.material.map(map):map(n.material);}});const fx=new THREE.Group();for(let i=0;i<10;i++){const p=new THREE.Mesh(this.geometry,this.material);p.position.set(Math.sin(i*2.4)*1.5,.5+i*.19,Math.cos(i*2.4)*1.5);fx.add(p);}model.add(fx);e={model,scale:model.scale.clone(),at:age,fx,materials};this.entries.set(id,e);}
 const t=Math.max(0,Math.min(1,age/1000));for(const m of e.materials)m.emissiveIntensity=.12+(1-t)*.65;
 e.model.scale.y=e.scale.y*(1-.55*t);e.fx.visible=t<1;e.fx.scale.setScalar(1+t*.6);e.fx.position.y=t*.8;e.fx.rotation.y=t*.25;
 }
 dispose(){for(const e of this.entries.values()){e.fx.removeFromParent();for(const m of e.materials)m.dispose();}this.geometry.dispose();this.material.dispose();}
}
