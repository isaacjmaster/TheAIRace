import * as THREE from 'three';
import {WorldKit,palette as c} from './world';
/** Open accelerator frame with three cards and exposed fans. */
export function gpuRigModel(k:WorldKit){const g=new THREE.Group();
 k.box(g,[3.5,.2,2.5],[0,.15,0],c.dark,.1);
 for(const x of [-1.65,1.65])for(const z of [-1.15,1.15])k.box(g,[.13,2.1,.13],[x,1.25,z],c.slate);
 for(const z of [-1.15,1.15])k.box(g,[3.5,.14,.14],[0,2.3,z],c.slate);
 for(const x of [-1.65,1.65])k.box(g,[.14,.14,2.5],[x,2.3,0],c.slate);
 for(let i=0;i<3;i++){const x=-1.05+i*1.05;k.box(g,[.8,1.35,1.7],[x,1.15,-.1],c.slate,.08);k.box(g,[.65,.1,1.55],[x,1.88,-.1],c.cyan,.03,true);
 const fan=k.cylinder(g,.32,.08,[x,1.18,.8],c.dark);fan.rotation.x=Math.PI/2;const rim=k.cylinder(g,.25,.09,[x,1.18,.86],c.cream);rim.rotation.x=Math.PI/2;const hub=k.cylinder(g,.09,.11,[x,1.18,.93],c.dark);hub.rotation.x=Math.PI/2;
 for(let n=0;n<4;n++){const blade=k.box(g,[.07,.43,.04],[x,1.18,.93],c.dark,.01);blade.rotation.z=n*Math.PI/4;}}
 k.box(g,[1,.4,.65],[0,.45,.6],c.dark);k.box(g,[.65,.07,.04],[0,.5,.94],c.cyan,.01,true);return g;
}
