import * as THREE from 'three';
import {WorldKit,palette as c} from './world';

/** A closed cottage with an open-glazed bay: the founder is real interior geometry. */
export function founderHQ(k:WorldKit,parent:THREE.Group){
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
 for(const side of [-1,1]){const roof=box([4.6,.28,6.8],[side*2.05,5.35,0],c.dark);roof.rotation.z=-side*.36;}
 for(const z of [-3,3]){
  k.gable(house,7.8,1.44,.22,[0,4.55,z],c.cream);
 }
 box([.3,.25,6.9],[0,6.15,0],c.gold);
 // Projecting bay window puts the work desk ahead of the roof's sight line.
 box([4.8,.18,1.7],[-.9,1.2,3.55],c.gold);
 for(const x of [-3.3,1.5])box([.13,3.1,.13],[x,2.75,4.25],c.dark);
 box([4.95,.14,.15],[-.9,4.3,4.25],c.dark);
 for(const x of [-3.3,1.5])box([.13,.14,1.4],[x,4.3,3.55],c.dark);
 // No opaque pane: the window stays readable on small mobile screens.
 box([3.6,.16,1.35],[-.9,1.65,3.15],'#e7b789');
 for(const x of [-2.4,.6])box([.12,1.1,.12],[x,1,3.5],c.dark);
 const founder=new THREE.Group();founder.name='Founder at laptop';founder.position.set(-.8,0,3.05);house.add(founder);
 k.box(founder,[.95,1.0,.65],[0,2.15,0],c.coral,.18);
 k.box(founder,[.85,.85,.75],[0,3.04,0],'#f3c399',.2);
 k.box(founder,[.91,.25,.8],[0,3.43,-.04],'#765649',.1);
 for(const x of [-.2,.2])k.box(founder,[.08,.1,.04],[x,3.08,.39],c.dark,.01);
 for(const x of [-.59,.59]){k.box(founder,[.23,.25,.8],[x,2.05,.35],c.coral);k.box(founder,[.22,.16,.25],[x,1.97,.8],'#f3c399');}
 box([1.7,.1,1],[-.8,1.79,3.55],c.dark);
 const lid=box([1.7,.87,.1],[-.8,2.2,3.95],c.dark);lid.rotation.x=.12;
 // A mint backlit lid and keyboard make the laptop silhouette clear from outside.
 box([.35,.22,.035],[-.8,2.22,4.02],c.cyan);
 box([1.3,.025,.5],[-.8,1.86,3.45],c.slate);
 box([.6,.12,.5],[0,6.37,0],c.cyan);
 return house;
}

export type FoundationBuilding='hq'|'rig';
/** Resolve the nearest visible building mesh, never the old invisible campus lots. */
export function pickFoundationBuilding(ray:THREE.Raycaster,hq:THREE.Object3D,rig?:THREE.Object3D):FoundationBuilding|undefined{
 const hit=ray.intersectObjects(rig?[hq,rig]:[hq],true)[0];
 if(!hit)return;
 for(let node:THREE.Object3D|null=hit.object;node;node=node.parent){if(node===hq)return 'hq';if(node===rig)return 'rig';}
}

