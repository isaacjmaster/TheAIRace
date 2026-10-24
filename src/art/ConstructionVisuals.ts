import * as THREE from 'three';
import {WorldKit,palette as C} from './world';
import {founderHQ} from './FounderHQ';
import type {BuildingLayout,RotatableBuilding} from '../../shared/foundation';
export type BuildStage='foundation'|'framework'|'finishing'|'finished';
export const constructionProgress=(timer:{startedAt:number;completesAt:number},now:number)=>Math.max(0,Math.min(1,(now-timer.startedAt)/Math.max(1,timer.completesAt-timer.startedAt)));
export const constructionStage=(progress:number):BuildStage=>progress>=1?'finished':progress>=.6?'finishing':progress>=.25?'framework':'foundation';
const shapes={sentinel:[4,4,3.1],rig:[4,3,2.6],rig2:[4,3,2.6],lab:[4,3,2.8],fabricator:[4,3,3.5],hangar:[5.6,4.2,3.2],droneStation:[3,3,1.6],hq:[9,8,7],station:[3.6,2.6,2]} as const;
type Entry={root:THREE.Object3D;proxy:THREE.Group;foundation:THREE.Group;frame:THREE.Group;future?:THREE.Group;plane:THREE.Plane;originals:Map<THREE.Mesh,THREE.Material|THREE.Material[]>;materials:THREE.Material[];lights:THREE.Light[]};
/** Presentation only. Actual roots, timers and server capability checks remain authoritative. */
export class ConstructionVisuals{
 private k=new WorldKit('campus');private entries=new Map<RotatableBuilding,Entry>();private effects:{group:THREE.Group;age:number}[]=[];
 readonly stages:Partial<Record<RotatableBuilding,BuildStage>>={};
 constructor(private scene:THREE.Scene){}
 private prepare(kind:RotatableBuilding,root:THREE.Object3D,layout:BuildingLayout):Entry{
  const [w,d,h]=shapes[kind],proxy=new THREE.Group(),foundation=new THREE.Group(),frame=new THREE.Group();proxy.name='construction-'+kind;proxy.position.set(...[layout.position[0],0,layout.position[1]] as [number,number,number]);proxy.rotation.y=layout.orientation*Math.PI/2;proxy.add(foundation,frame);this.scene.add(proxy);
  const machinery=kind==='rig'||kind==='rig2'||kind==='fabricator';this.k.box(foundation,[w,.22,d],[0,.12,0],machinery?C.slate:'#ddd8c5',.07);
  for(const x of [-w*.43,w*.43])for(const z of [-d*.43,d*.43]){this.k.box(foundation,[.18,.55,.18],[x,.4,z],C.slate,.025);this.k.box(frame,[.13,h*.82,.13],[x,h*.41+.2,z],C.slate,.025);}
  for(const z of [-d*.43,d*.43])this.k.box(frame,[w*.9,.13,.13],[0,h*.82,z],C.dark,.025);
  for(const x of [-w*.43,w*.43])this.k.box(frame,[.13,.13,d*.9],[x,h*.82,0],C.dark,.025);
  if(machinery)for(let i=0;i<3;i++)this.k.box(frame,[.12,h*.55,d*.65],[-w*.28+i*w*.28,h*.3,0],C.dark,.025);
  else if(kind==='droneStation')this.k.cylinder(frame,w*.28,.09,[0,h*.65,0],C.slate);
  else if(kind==='hq')for(const z of [-d*.4,d*.4])for(const side of [-1,1]){const beam=this.k.box(frame,[w*.5,.12,.12],[side*w*.23,h*.91,z],C.dark,.025);beam.rotation.z=-side*.3;}
  else if(kind==='lab')for(const x of [-w*.42,w*.42])this.k.box(frame,[.15,.65,d*.85],[x,.55,0],C.cream,.025);
  else if(kind==='hangar')for(const x of [-w*.28,0,w*.28])this.k.box(frame,[.08,.04,d*.6],[x,.26,0],C.gold,.015);
  this.k.batchStatic(foundation,'foundation-'+kind);this.k.batchStatic(frame,'frame-'+kind);
  const e:Entry={root,proxy,foundation,frame,plane:new THREE.Plane(new THREE.Vector3(0,-1,0),h*.8),originals:new Map(),materials:[],lights:[]};
  if(kind==='hq'){e.future=founderHQ(this.k,proxy,2);e.future.position.set(0,0,0);e.future.visible=false;}
  const clones=new Map<THREE.Material,THREE.Material>();(e.future??root).traverse(n=>{if(n instanceof THREE.Mesh){e.originals.set(n,n.material);const clone=(m:THREE.Material)=>{if(!clones.has(m)){const copy=m.clone();copy.clippingPlanes=[e.plane];copy.clipShadows=true;if(copy instanceof THREE.MeshStandardMaterial)copy.emissiveIntensity=0;clones.set(m,copy);e.materials.push(copy);}return clones.get(m)!;};n.material=Array.isArray(n.material)?n.material.map(clone):clone(n.material);}if(n instanceof THREE.Light){e.lights.push(n);n.visible=false;}});root.traverse(n=>{if(n instanceof THREE.Light&&!e.lights.includes(n)){e.lights.push(n);n.visible=false;}});
  return e;
 }
 sync(kind:RotatableBuilding,root:THREE.Object3D|undefined,layout:BuildingLayout|undefined,timer:{startedAt:number;completesAt:number}|undefined,now:number){
  let e=this.entries.get(kind);if(!root||!layout||!timer){if(e)this.remove(kind,e);delete this.stages[kind];return;}
  const progress=constructionProgress(timer,now),stage=constructionStage(progress);this.stages[kind]=stage;
  if(stage==='finished'){if(e){this.remove(kind,e);this.complete(layout);}return;}
  if(e&&e.root!==root){this.remove(kind,e);e=undefined;}if(!e){e=this.prepare(kind,root,layout);this.entries.set(kind,e);}
  e.proxy.position.set(layout.position[0],0,layout.position[1]);e.proxy.rotation.y=layout.orientation*Math.PI/2;e.foundation.visible=true;e.frame.visible=stage!=='foundation';
  root.visible=stage==='finishing'&&kind!=='hq';if(e.future)e.future.visible=stage==='finishing';e.plane.constant=shapes[kind][2]*(.74+.22*Math.max(0,(progress-.6)/.4));
 }
 private remove(kind:RotatableBuilding,e:Entry){e.root.visible=true;for(const [mesh,material]of e.originals)mesh.material=material;for(const light of e.lights)light.visible=true;for(const m of e.materials)m.dispose();e.proxy.removeFromParent();this.entries.delete(kind);}
 private complete(layout:BuildingLayout){const g=new THREE.Group();g.position.set(layout.position[0],.5,layout.position[1]);for(let i=0;i<8;i++)this.k.box(g,[.14,.14,.14],[Math.sin(i*2.4)*1.5,.5+Math.cos(i)*.3,Math.cos(i*2.4)*1.5],i%2?C.gold:C.cyan,.025);this.scene.add(g);this.effects.push({group:g,age:0});}
 update(dt:number,reduced:boolean){for(const fx of this.effects){fx.age+=dt;fx.group.position.y+=reduced?0:dt*1.5;fx.group.scale.setScalar(Math.max(0,1-fx.age/.8));if(fx.age>=.8)fx.group.removeFromParent();}this.effects=this.effects.filter(f=>f.age<.8);}
 dispose(){for(const [kind,e]of this.entries)this.remove(kind,e);for(const fx of this.effects)fx.group.removeFromParent();this.k.dispose();}
}
