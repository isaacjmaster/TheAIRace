import * as THREE from 'three';
import {technologyMaterials,armoredHull} from './TechnologyMaterials';
import {WorldKit} from './world';
import {addGenerationEnergy} from './GenerationEnergy';
const bladeShape=new THREE.Shape();bladeShape.moveTo(.085,.08);bladeShape.bezierCurveTo(.18,.11,.32,.18,.34,.36);bladeShape.quadraticCurveTo(.34,.48,.20,.47);bladeShape.bezierCurveTo(.035,.36,-.02,.2,.085,.08);
/** Long, low open accelerator cage. Shared by live, visit, combat and card views. */
export function gpuRigModel(k:WorldKit,level=1){
 const g=new THREE.Group();g.name='Industrial GPU Rig';
 level=Math.max(1,Math.min(5,level));const p=technologyMaterials(k,level),dark='#152c39',body=level===1?'#172a32':p.shell,metal=p.frame,edge=level>=3?p.metal:p.frame,blade='#314957',cyan='#31dafa',ice='#8cffff';
 for(const [color,roughness,metalness]of [[dark,.6,.28],[body,.52,.32],[metal,.38,.5],[edge,.32,.38],[blade,.4,.38]] as const){const mat=k.mat(color) as THREE.MeshStandardMaterial;mat.roughness=roughness;mat.metalness=metalness;}
 for(const color of [cyan,ice]){const mat=k.mat(color,true) as THREE.MeshStandardMaterial;mat.emissiveIntensity=color===ice?1.15:1.0;mat.roughness=.28;}
 k.box(g,[4.5,.22,2.48],[0,.18,0],dark,.075);
 k.box(g,[4.14,.14,2.24],[0,.36,0],metal,.04);
 k.box(g,[4.12,1.56,.13],[0,1.18,-1.05],dark,.045);
 for(const x of [-2.13,2.13]){
  k.box(g,[.22,1.98,.24],[x,1.25,1.13],edge,.045);k.box(g,[.22,1.98,.24],[x,1.25,-1.13],edge,.045);
  k.box(g,[.13,1.56,2.08],[x,1.22,-.02],body,.06);
  const sideHousing=k.box(g,[level>=2?.22:.065,level>=2?1.6:1.23,1.65],[x+(x<0?-.055:.055),1.24,-.06],level===1?dark:p.shell,.035);if(level>=2)sideHousing.rotation.z=-Math.sign(x)*.16;
  if(level>=2)for(const z of [-.57,-.19,.19,.57])k.box(g,[.075,.93,.13],[x+Math.sign(x)*.2,1.28,z],dark,.015);
  if(level>=3){for(const z of [-.67,.67]){k.box(g,[.25,1.4,.28],[x+Math.sign(x)*.12,1.25,z],metal,.035);k.box(g,[.06,.85,.09],[x+Math.sign(x)*.26,1.35,z],cyan,.01,true);}}
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
  if(level>=2){for(const dx of [-.57,.57])for(const dy of [-.57,.57]){const shoulder=k.box(g,[.25,.27,.16],[x+dx,1.235+dy,1.17],level===2?p.metal:p.frame,.035);shoulder.rotation.z=-Math.sign(dx*dy)*.2;}}
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
 // Cooling evolves with the accelerator architecture; the original three impellers stay visible.
 const energy=level===5?'#b86aff':'#32bcff';
 if(level===2){
  for(const x of [-1.36,0,1.36]){armoredHull(k,g,1.17,.32,1.74,[x,2.40,-.04],p.frame,.09);for(let j=0;j<6;j++)k.box(g,[1.04,.14,.12],[x,2.62,-.77+j*.28],p.shell,.015);}
  for(const x of [-2.08,2.08]){armoredHull(k,g,.28,1.58,1.89,[x,1.43,-.04],p.shell,.12);k.box(g,[.08,1.06,.12],[x+Math.sign(x)*.16,1.42,-.08],p.metal,.015);}
 }
 if(level===3){
  // Three premium heat exchangers connect directly to their corresponding fan sockets.
  for(const x of [-1.36,0,1.36]){
   armoredHull(k,g,1.25,.66,1.96,[x,2.55,-.04],p.metal,.20);
   armoredHull(k,g,.87,.22,1.73,[x,2.91,-.04],dark,.08);
   for(let z=-.65;z<.8;z+=.28)k.box(g,[.72,.06,.10],[x,3.05,z],p.frame,.01);
   for(const dx of [-.54,.54])k.box(g,[.10,.11,1.68],[x+dx,2.88,-.04],cyan,.015,true);
  }
  for(const x of [-2.08,2.08]){armoredHull(k,g,.35,1.7,2.1,[x,1.65,0],p.metal,.13);for(const z of [-.7,.7])k.box(g,[.07,1.05,.10],[x+Math.sign(x)*.20,1.65,z],cyan,.015,true);}
 }
 if(level===4){
  // Ceramic saddles support three visible blue coolant conduits, not a sealed rooftop box.
  for(const x of [-1.36,0,1.36]){
   for(const z of [-.80,.80]){armoredHull(k,g,1.14,.67,.33,[x,2.60,z],p.shell,.17);const collar=k.ring(g,.29,.07,[x,2.78,z],p.metal);}
   const tube=k.cylinder(g,.23,1.62,[x,2.78,0],energy);tube.rotation.x=Math.PI/2;tube.material=k.mat(energy,true);
   for(const dx of [-.45,.45]){const shroud=armoredHull(k,g,.19,.68,1.90,[x+dx,2.62,0],p.shell,.08);shroud.rotation.z=-Math.sign(dx)*.15;}
   k.box(g,[.16,.12,1.86],[x,3.10,0],p.frame,.03);
  }
  for(const x of [-2.08,2.08]){armoredHull(k,g,.32,1.9,2.08,[x,1.65,0],p.shell,.15);k.box(g,[.07,1.25,.15],[x+Math.sign(x)*.19,1.69,0],energy,.02,true);}
 }
 if(level===5){
  // A dense, sloped blade cage is integrated into the accelerator chassis.
  armoredHull(k,g,4.18,.32,2.1,[0,2.37,0],p.frame,.12);
  for(const x of [-1.36,0,1.36]){
   armoredHull(k,g,1.15,.94,1.97,[x,2.93,-.02],p.shell,.24);
   for(const dx of [-.47,.47])armoredHull(k,g,.16,.81,1.91,[x+dx,2.94,-.02],p.metal,.06);
   for(let j=0;j<5;j++){const bladePlate=k.box(g,[.76,.11,1.55],[x,2.66+j*.17,-.02],p.frame,.02);k.box(g,[.58,.04,.055],[x,2.68+j*.17,.79],j%2?cyan:energy,.01,true);}
   k.box(g,[.65,.10,1.65],[x,3.45,-.02],p.shell,.04);k.box(g,[.12,.035,1.40],[x,3.52,-.02],energy,.015,true);
  }
  for(const x of [-2.10,2.10]){armoredHull(k,g,.29,2.1,2.12,[x,1.90,0],p.metal,.11);k.box(g,[.07,1.20,.14],[x+Math.sign(x)*.17,2.04,0],energy,.02,true);}
 }
 addGenerationEnergy(k,g,level,'rig',[energy]);

 g.userData.visualLevel=level;k.batchStatic(g,'five-tier-gpu-'+level);
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
