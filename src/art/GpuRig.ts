import * as THREE from 'three';
import {WorldKit} from './world';
const bladeShape=new THREE.Shape();bladeShape.moveTo(.085,.08);bladeShape.bezierCurveTo(.18,.11,.32,.18,.34,.36);bladeShape.quadraticCurveTo(.34,.48,.20,.47);bladeShape.bezierCurveTo(.035,.36,-.02,.2,.085,.08);
/** Long, low open accelerator cage. Shared by live, visit, combat and card views. */
export function gpuRigModel(k:WorldKit){
 const g=new THREE.Group();g.name='Industrial GPU Rig';
 const dark='#152c39',body='#263e4b',metal='#526773',edge='#91a3ab',blade='#314957',cyan='#31dafa',ice='#8cffff';
 for(const [color,roughness,metalness]of [[dark,.6,.28],[body,.52,.32],[metal,.38,.5],[edge,.3,.65],[blade,.4,.38]] as const){const mat=k.mat(color) as THREE.MeshStandardMaterial;mat.roughness=roughness;mat.metalness=metalness;}
 for(const color of [cyan,ice]){const mat=k.mat(color,true) as THREE.MeshStandardMaterial;mat.emissiveIntensity=color===ice?1.15:1.0;mat.roughness=.28;}
 k.box(g,[4.5,.22,2.48],[0,.18,0],dark,.075);
 k.box(g,[4.14,.14,2.24],[0,.36,0],metal,.04);
 k.box(g,[4.12,1.56,.13],[0,1.18,-1.05],dark,.045);
 for(const x of [-2.13,2.13]){
  k.box(g,[.22,1.98,.24],[x,1.25,1.13],edge,.045);k.box(g,[.22,1.98,.24],[x,1.25,-1.13],edge,.045);
  k.box(g,[.13,1.56,2.08],[x,1.22,-.02],body,.06);
  k.box(g,[.065,1.23,1.55],[x+(x<0?-.085:.085),1.24,-.06],dark,.035);
  // Lit inset on each end cap and substantial corner shoulder blocks.
  k.box(g,[.035,.065,1.35],[x+(x<0?-.125:.125),1.74,-.06],cyan,.015,true);
  for(const y of [.47,2.08])for(const z of [-1.13,1.13])k.box(g,[.29,.27,.31],[x,y,z],metal,.045);
 }
 for(const y of [.43,2.24]){for(const z of [-1.13,1.13])k.box(g,[4.48,.16,.22],[0,y,z],metal,.035);for(const x of [-2.13,2.13])k.box(g,[.22,.16,2.45],[x,y,0],edge,.035);}
 for(let i=0;i<3;i++){
  const x=-1.36+i*1.36;
  // Individually recessed accelerator modules rather than one solid cuboid.
  k.box(g,[1.19,1.61,1.96],[x,1.19,-.05],body,.06);
  k.box(g,[1.13,.10,1.99],[x,2.045,-.04],dark,.03);
  k.box(g,[.99,.06,1.78],[x,2.115,-.05],metal,.025);
  for(let n=0;n<8;n++)k.box(g,[.86,.035,.065],[x,2.16,-.82+n*.21],dark,.009);
  k.box(g,[.1,.04,.82],[x-.47,2.17,-.38],cyan,.01,true);
  k.box(g,[.26,.035,.085],[x+.25,2.17,.74],edge,.015);
  // Thick outer socket, metal lip, illuminated inner rim and recessed impeller.
  const socket=k.cylinder(g,.649,.16,[x,1.235,1.015],dark);socket.rotation.x=Math.PI/2;
  k.ring(g,.612,.045,[x,1.235,1.145],metal);
  k.ring(g,.565,.035,[x,1.235,1.205],cyan,true);
  k.ring(g,.529,.015,[x,1.235,1.204],ice,true);
  k.ring(g,.642,.018,[x,1.235,1.14],edge);
  // Recessed LED chamber: a dim blue backplate and brighter concentric channels
  // sit behind the dark impeller, leaving visible depth between blades and rims.
  const backing=k.cylinder(g,.511,.024,[x,1.235,1.114],dark);backing.rotation.x=Math.PI/2;
  backing.material=k.mat('#087fae',true);backing.castShadow=false;backing.receiveShadow=false;
  const backMaterial=backing.material as THREE.MeshStandardMaterial;backMaterial.emissiveIntensity=.85;
  k.ring(g,.423,.032,[x,1.235,1.139],'#23bedc',true);
  k.ring(g,.276,.022,[x,1.235,1.139],'#1497c4',true);
  k.ring(g,.507,.014,[x,1.235,1.153],'#55dce9',true);
  const rotor=new THREE.Group();rotor.name='gpu-fan-'+i;rotor.position.set(x,1.235,1.16);g.add(rotor);
  for(let n=0;n<7;n++){const b=k.extrusion(rotor,'gpu-swept-blade',bladeShape,.045,[0,0,0],blade);b.rotation.z=n*Math.PI*2/7;}
  k.batchStatic(rotor,'gpu-swept-rotor');
  const hub=k.cylinder(g,.139,.12,[x,1.235,1.205],metal);hub.rotation.x=Math.PI/2;
  const cap=k.cylinder(g,.095,.13,[x,1.235,1.215],dark);cap.rotation.x=Math.PI/2;
  const center=k.cylinder(g,.044,.14,[x,1.235,1.222],edge);center.rotation.x=Math.PI/2;
  // Four mounting screws anchor the circular assembly into its structural plate.
  for(const dx of [-.56,.56])for(const dy of [-.56,.56]){const screw=k.cylinder(g,.038,.07,[x+dx,1.235+dy,1.115],edge);screw.rotation.x=Math.PI/2;}
 }
 k.box(g,[3.98,.07,.055],[0,.49,1.265],cyan,.018,true);
 for(const x of [-2.12,2.12])k.box(g,[.055,.34,.035],[x,.78,1.275],cyan,.012,true);
 for(const sign of [-1,1]){
  k.box(g,[.12,.42,.49],[sign*2.18,.67,-.56],metal,.03);
  const plug=k.cylinder(g,.145,.16,[sign*2.25,.67,-.56],dark);plug.rotation.z=Math.PI/2;
  const port=new THREE.Object3D();port.name=sign<0?'gpu-power-port-left':'gpu-power-port';port.position.set(sign*2.33,.67,-.56);port.userData.exitSign=sign;g.add(port);
 }
 k.batchStatic(g,'refined-industrial-gpu');
 const lamp=k.box(g,[.3,.045,.025],[1.72,.56,1.285],ice,.01,true);lamp.name='gpu-activity';
 return g;
}
/** Fit only the visual X extent when an existing neighbour or wall needs clearance.
 * The saved position, orientation, and logical 4 x 3 placement lot never change. */
export function fitGpuVisual(model:THREE.Object3D,obstacles:readonly {x:number;z:number;w:number;d:number}[]){
 const base:number=model.userData.gpuBaseScaleX??=model.scale.x,odd=Math.abs(Math.sin(model.rotation.y))>.5,p=model.getWorldPosition(new THREE.Vector3()),axis=odd?p.z:p.x,cross=odd?p.x:p.z;
 let available=2.40*base;
 for(const r of obstacles){if(Math.hypot(r.x-p.x,r.z-p.z)<.1)continue;const a=odd?r.z:r.x,b=odd?r.x:r.z,w=odd?r.d:r.w,d=odd?r.w:r.d;if(Math.abs(b-cross)<d/2+1.28*model.scale.z+.06)available=Math.min(available,Math.abs(a-axis)-w/2-.06);}
 model.scale.x=base*Math.min(1,Math.max(.82,available/(2.40*base)));model.updateWorldMatrix(true,true);
}
export function animateGpu(group:THREE.Group|undefined,time:number,dt:number,active:boolean,reduced=false){
 if(!group)return;for(let i=0;i<3;i++){const fan=group.getObjectByName('gpu-fan-'+i);if(fan&&!reduced)fan.rotation.z=(fan.rotation.z+Math.min(dt,.05)*(active?3.2+i*.23:.3))%(Math.PI*2);}
 const lamp=group.getObjectByName('gpu-activity') as THREE.Mesh|undefined;
 if(lamp){const material=lamp.material as THREE.MeshStandardMaterial;material.emissiveIntensity=active?(reduced?1.15:1.15+Math.sin(time*1.7)*.1):.35;}
}
