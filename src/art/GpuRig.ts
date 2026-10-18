import * as THREE from 'three';
import {WorldKit,palette as c} from './world';
/** Open accelerator frame with three cards and exposed fans. */
export function gpuRigModel(k:WorldKit){const g=new THREE.Group();
 k.box(g,[3.5,.2,2.5],[0,.15,0],c.dark,.1);
 for(const x of [-1.65,1.65])for(const z of [-1.15,1.15])k.box(g,[.13,2.1,.13],[x,1.25,z],c.slate);
 for(const z of [-1.15,1.15])k.box(g,[3.5,.14,.14],[0,2.3,z],c.slate);
 for(const x of [-1.65,1.65])k.box(g,[.14,.14,2.5],[x,2.3,0],c.slate);
 for(let i=0;i<3;i++){const x=-1.05+i*1.05;k.box(g,[.8,1.35,1.7],[x,1.15,-.1],c.slate,.08);k.box(g,[.65,.1,1.55],[x,1.88,-.1],c.dark,.03);
 const fan=k.cylinder(g,.32,.08,[x,1.18,.8],c.dark);fan.rotation.x=Math.PI/2;const rim=k.cylinder(g,.25,.09,[x,1.18,.86],c.cream);rim.rotation.x=Math.PI/2;const hub=k.cylinder(g,.09,.11,[x,1.18,.93],c.dark);hub.rotation.x=Math.PI/2;
 const rotor=new THREE.Group();rotor.name='gpu-fan-'+i;rotor.position.set(x,1.18,.95);g.add(rotor);for(let n=0;n<4;n++){const blade=k.box(rotor,[.07,.43,.04],[0,0,0],c.dark,.01);blade.rotation.z=n*Math.PI/4;}}
 // Recessed service lid: two vent banks around a continuous compute bus.
 // All detail stays beneath the existing frame and within its original footprint.
 const top=new THREE.Group();top.name='gpu-service-lid';g.add(top);
 k.box(top,[3.12,.14,2.02],[0,2.08,-.08],c.dark,.05);
 for(const x of [-.83,.83]){
  k.box(top,[1.36,.08,1.9],[x,2.19,-.08],c.cream,.045);
  k.box(top,[1.12,.025,1.24],[x,2.235,-.2],c.dark,.025);
  for(let i=0;i<6;i++)k.box(top,[1.01,.035,.085],[x,2.26,-.7+i*.2],c.slate,.012);
  // Flush fasteners and a small gold service marker keep the casing readable.
  for(const z of [-.91,.75])k.box(top,[.07,.018,.07],[x+(x<0?-.5:.5),2.24,z],c.dark,.012);
  k.box(top,[.24,.025,.08],[x,2.245,.68],c.gold,.012);
 }
 k.box(top,[.25,.065,1.9],[0,2.2,-.08],c.dark,.025);
 k.box(top,[.115,.025,1.62],[0,2.245,-.12],c.cyan,.018,true);
 for(const x of [-.12,.12])k.box(top,[.065,.025,.065],[x,2.245,.79],c.cyan,.012,true);
 // Static pieces share geometry batches; the existing activity material supplies
 // the restrained active/idle pulse with no extra per-frame work or point lights.
 k.batchStatic(top,'gpu-service-lid');
 k.box(g,[1,.4,.65],[0,.45,.6],c.dark);const light=k.box(g,[.65,.07,.04],[0,.5,.94],c.cyan,.01,true);light.name='gpu-activity';return g;
}

export function animateGpu(group:THREE.Group|undefined,time:number,dt:number,active:boolean,reduced=false){
 if(!group)return;for(let i=0;i<3;i++){const fan=group.getObjectByName('gpu-fan-'+i);if(fan&&!reduced)fan.rotation.z=(fan.rotation.z+dt*(active?11:1.1))%(Math.PI*2);}
 const lamp=group.getObjectByName('gpu-activity') as THREE.Mesh|undefined;
 if(lamp){const material=lamp.material as THREE.MeshStandardMaterial;material.emissiveIntensity=active?(reduced?.65:.65+Math.sin(time*2)*.18):.12;}
}
