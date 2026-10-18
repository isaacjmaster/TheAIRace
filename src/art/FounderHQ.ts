import * as THREE from 'three';
import {WorldKit,palette as c} from './world';

/** A closed cottage with a flush front window: the founder is real interior geometry. */
export function founderHQ(k:WorldKit,parent:THREE.Group){
 const polished=k.finish==='campus';
 const house=new THREE.Group();house.name='Founder HQ';house.position.set(-5,0,-1);parent.add(house);
 const box=(size:[number,number,number],pos:[number,number,number],color:string,r=.06)=>k.box(house,size,pos,color,r);
 box([8.8,.35,8],[0,.2,.6],'#d9e9df',.15);
 box([7.8,.18,6.5],[0,.45,0],c.cream);
 box([7.8,4.2,.3],[0,2.6,-3],c.cream);
 for(const x of [-3.75,3.75])box([.3,4.2,6],[x,2.6,0],c.cream);
 // Front wall wraps a broad window and a separate front door.
 box([7.8,.8,.3],[0,.85,3],c.cream);
 box([7.8,.55,.3],[0,4.45,3],c.cream);
 box([2.1,3.3,.3],[2.7,2.7,3],c.cream);
 box([.4,3.3,.3],[-3.6,2.7,3],c.cream);
 box([1.35,2.6,.18],[2.65,1.95,3.2],c.dark);
 box([.9,.65,.06],[2.65,2.65,3.32],c.cyan);
 box([.13,.13,.12],[3.1,1.8,3.37],c.gold);
 box([2,.2,1.1],[2.65,.45,3.7],c.slate);
 // Pitched roof runs along Z; triangular gables close the roof ends.
 for(const side of [-1,1]){const roof=box([4.6,.28,6.8],[side*2.05,5.35,0],polished?'#155976':c.dark);roof.rotation.z=-side*.36;}
 for(const z of [-3,3]){
  k.gable(house,7.8,1.44,.22,[0,4.55,z],c.cream);
 }
 box([.3,.25,6.9],[0,6.15,0],c.gold);
 // Restrained standing-seam roof and warm workspace lighting; footprint is unchanged.
 for(const side of [-1,1])for(const z of [-2.4,-1.2,0,1.2,2.4]){const seam=box([4.56,.045,.045],[side*2.05,5.51,z],polished?'#397991':'#4b6b7d',.01);seam.rotation.z=-side*.36;}
 const deskLight=new THREE.PointLight(polished?'#ffd080':'#ffd29a',polished?16:5,polished?8:7,2);deskLight.position.set(-.9,3.6,2);house.add(deskLight);
 k.box(house,[2.6,.045,.18],[-.9,4.1,2.75],'#ffe0a7',.02,true);
 // Window trim sits against the front wall, with the entire workspace inside.
 box([4.8,.18,.3],[-.9,1.2,3.08],c.gold);
 for(const x of [-3.3,1.5])box([.13,3.1,.13],[x,2.75,3.12],c.dark);
 box([4.95,.14,.15],[-.9,4.3,3.12],c.dark);
 // No opaque pane: the window stays readable on small mobile screens.
 box([3.6,.16,1.35],[-.9,1.65,1.85],'#e7b789');
 for(const x of [-2.4,.6])box([.12,1.1,.12],[x,1,2.2],c.dark);
 const founder=new THREE.Group();founder.name='Founder at laptop';founder.position.set(-.8,-.5,1.75);house.add(founder);
 k.box(founder,[.95,1.0,.65],[0,2.15,0],c.coral,.18);
 k.box(founder,[.85,.85,.75],[0,3.04,0],'#f3c399',.2);
 k.box(founder,[.91,.25,.8],[0,3.43,-.04],'#765649',.1);
 for(const x of [-.2,.2])k.box(founder,[.08,.1,.04],[x,3.08,.39],c.dark,.01);
 for(const x of [-.59,.59]){k.box(founder,[.23,.25,.8],[x,2.05,.35],c.coral);k.box(founder,[.22,.16,.25],[x,1.97,.8],'#f3c399');}
 box([1.7,.1,1],[-.8,1.79,2.25],c.dark);
 const lid=box([1.7,.87,.1],[-.8,2.2,2.65],c.dark);lid.rotation.x=.12;
 // A mint backlit lid and keyboard make the laptop silhouette clear from outside.
 box([.35,.22,.035],[-.8,2.22,2.72],c.cyan);
 box([1.3,.025,.5],[-.8,1.86,2.15],c.slate);
 box([.6,.12,.5],[0,6.37,0],c.cyan);
 if(polished){
  // Layered standing-seam panels preserve the original roof outline and footprint.
  for(const side of [-1,1])for(let i=0;i<5;i++){
   const panel=box([4.54,.025,1.13],[side*2.05,5.51,-2.4+i*1.2],i%2?'#155976':'#185d7a',.015);panel.rotation.z=-side*.36;
  }
  box([7.4,.16,.09],[0,1.28,3.18],'#fff8e6',.025);
  for(const x of [-3.53,3.53])box([.16,3.9,.12],[x,2.8,3.18],'#fff8e6',.025);
  box([7.1,.18,.08],[0,.64,3.2],'#d7c9ac',.02);
  // Warm interior surfaces and a pendant make the existing window inviting.
  box([6.9,3.05,.045],[0,2.8,-2.8],'#f0d4a0',.015);
  box([3.7,.07,1.45],[-.9,1.77,1.85],'#e3ac62',.025);
  k.cylinder(house,.035,.55,[-2.1,3.85,1.5],'#876f4e');k.cylinder(house,.24,.13,[-2.1,3.56,1.5],c.gold);
  const warm=k.box(house,[.3,.025,.22],[-2.1,3.48,1.5],'#fff1bb',.02,true);warm.castShadow=false;
  box([.8,1.15,.22],[.7,2.35,.5],'#bb854b',.03);
  for(let i=0;i<3;i++)box([.16,.65,.15],[.47+i*.2,2.45,.65],i%2?'#61b8ad':'#ebbc65',.015);
  k.batchStatic(founder,'campus-founder');k.batchStatic(house,'campus-house');
  k.grounding(house,10,9,0,.4);
 }
 return house;
}

export type FoundationBuilding='hq'|'rig'|'rig2'|'fabricator'|'hangar'|'station';
/** Resolve the nearest visible building mesh, never the old invisible campus lots. */
export function pickFoundationBuilding(ray:THREE.Raycaster,hq:THREE.Object3D,rig?:THREE.Object3D,fabricator?:THREE.Object3D,hangar?:THREE.Object3D,station?:THREE.Object3D,rig2?:THREE.Object3D):FoundationBuilding|undefined{
 const hit=ray.intersectObjects([hq,rig,fabricator,hangar,station,rig2].filter((g):g is THREE.Object3D=>!!g),true)[0];
 if(!hit)return;
 for(let node:THREE.Object3D|null=hit.object;node;node=node.parent){if(node===hq)return 'hq';if(node===rig)return 'rig';if(node===rig2)return 'rig2';if(node===fabricator)return 'fabricator';if(node===hangar)return 'hangar';if(node===station)return 'station';}
}

