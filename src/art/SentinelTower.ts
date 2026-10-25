import * as THREE from 'three';
import {WorldKit} from './world';
import type {SentinelState} from '../../shared/sentinel-catalog';

const C={armor:'#183443',edge:'#304c58',steel:'#49616a',dark:'#0c202b',green:'#8cc934',light:'#baff46',core:'#eeffc0'};
type Parts={yaw:THREE.Group;pitch:THREE.Group;recoil:THREE.Group;muzzle:THREE.Object3D;charge:THREE.Mesh[]};
/** All rotating geometry stays inside the four-by-four placement envelope. */
export function sentinelModel(k:WorldKit){
 const g=new THREE.Group();g.name='Sentinel Tower — Vanguard Cannon';
 k.cylinder(g,1.94,.22,[0,.11,0],C.dark);k.cylinder(g,1.75,.48,[0,.43,0],C.armor);
 for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.sin(a),z=Math.cos(a),panel=k.box(g,[.76,.5,.48],[x*1.59,.48,z*1.59],i%3?C.armor:C.edge,.075);panel.rotation.y=a;panel.rotation.x=-.2;
  const seam=k.box(g,[.045,.42,.05],[x*1.86,.45,z*1.86],C.steel,.01);seam.rotation.y=a;
  if(i%3===0){const inset=k.box(g,[.48,.17,.05],[x*1.85,.48,z*1.85],C.dark,.025);inset.rotation.y=a;for(let j=-1;j<=1;j++){const led=k.box(g,[.1,.095,.025],[x*1.89+Math.cos(a)*j*.14,.49,z*1.89-Math.sin(a)*j*.14],C.light,.01,true);led.rotation.y=a;}}
 }
 k.cylinder(g,1.36,.2,[0,.78,0],C.edge);k.cylinder(g,1.13,.22,[0,.96,0],C.dark);
 const ring=k.ring(g,1.08,.045,[0,1.075,0],C.light,true);ring.rotation.x=Math.PI/2;
 k.cylinder(g,.83,.55,[0,1.3,0],C.armor);
 const yaw=new THREE.Group();yaw.position.y=1.52;g.add(yaw);yaw.name='sentinel-yaw';
 k.cylinder(yaw,.89,.18,[0,0,0],C.green);k.cylinder(yaw,.75,.32,[0,.23,0],C.dark);
 for(const x of [-.67,.67]){k.box(yaw,[.28,.78,.9],[x,.54,0],C.armor,.08);const bearing=k.cylinder(yaw,.31,.2,[x*1.25,.65,0],C.edge);bearing.rotation.z=Math.PI/2;const bolt=k.cylinder(yaw,.13,.215,[x*1.25,.65,0],C.green);bolt.rotation.z=Math.PI/2;}
 const pitch=new THREE.Group();pitch.position.y=.75;yaw.add(pitch);
 const recoil=new THREE.Group();pitch.add(recoil);recoil.name='sentinel-cannon';
 k.box(recoil,[1.26,.73,1.82],[0,.1,-.25],C.dark,.11);
 k.box(recoil,[1.35,.43,1.35],[0,.32,-.48],C.armor,.09);
 for(const x of [-.59,.59]){
  const cheek=k.box(recoil,[.28,.65,1.5],[x,.16,-.26],C.edge,.07);cheek.rotation.z=Math.sign(x)*.13;
  k.box(recoil,[.17,.12,1.52],[x,.56,-.26],C.green,.025);
  k.box(recoil,[.1,.31,.19],[x*1.16,.05,.47],C.green,.025);
  for(let z=-.86;z<.1;z+=.24)k.box(recoil,[.035,.2,.11],[x*1.26,.18,z],C.dark,.01);
 }
 k.box(recoil,[.87,.57,1.72],[0,.12,.77],C.armor,.055);
 k.box(recoil,[.56,.09,1.35],[0,.45,.75],C.dark,.025);
 const charge:THREE.Mesh[]=[];
 for(const x of [-.39,.39]){k.box(recoil,[.18,.15,1.52],[x,.3,.87],C.green,.03);charge.push(k.box(recoil,[.045,.045,1.37],[x,.39,.87],C.light,.01,true));k.box(recoil,[.14,.13,1.25],[x,-.18,.75],C.edge,.02);}
 for(const z of [-.88,-.43,.02]){k.box(recoil,[.45,.08,.13],[0,.61,z],C.green,.02);k.box(recoil,[.23,.035,.07],[0,.67,z],C.light,.01,true);}
 for(const x of [-.35,.35]){const plate=k.box(recoil,[.53,.075,.68],[x,.57,-.27],C.edge,.025);plate.rotation.z=-Math.sign(x)*.16;for(const z of [-.84,-.6,-.36])k.box(recoil,[.3,.02,.055],[x,.565,z],C.steel,.005);}
 const muzzlePlate=k.cylinder(recoil,.43,.22,[0,.12,1.61],C.edge);muzzlePlate.rotation.x=Math.PI/2;
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5,x=Math.sin(a)*.25,y=.12+Math.cos(a)*.25;
  const barrel=k.cylinder(recoil,.135,.28,[x,y,1.69],C.armor);barrel.rotation.x=Math.PI/2;
  k.ring(recoil,.103,.025,[x,y,1.84],C.green);const hole=k.cylinder(recoil,.086,.012,[x,y,1.835],C.dark);hole.rotation.x=Math.PI/2;
 }
 k.box(recoil,[.35,.19,.34],[0,.66,-.55],C.dark,.025);k.box(recoil,[.22,.06,.23],[0,.78,-.55],C.green,.02);
 const muzzle=new THREE.Object3D();muzzle.position.set(0,.12,1.93);recoil.add(muzzle);
 // Shared materials / batched armor; animation pivots and charge rails remain separate.
 const rails=new THREE.Group();recoil.add(rails);for(const mesh of charge)rails.attach(mesh);
 k.batchStatic(g,'sentinel-base');k.batchStatic(yaw,'sentinel-mount');k.batchStatic(recoil,'sentinel-cannon');
 g.userData.sentinel={yaw,pitch,recoil,muzzle,charge} satisfies Parts;
 return g;
}
/** Follow the simulation's aim and lock strength. No autonomous firing at the owner's HQ. */
export function animateSentinel(g:THREE.Group,state:SentinelState|undefined,now:number,dt:number,active=true){
 const p=g.userData.sentinel as Parts;if(!p)return;
 const target=state?.yaw??g.rotation.y,difference=Math.atan2(Math.sin(target-g.rotation.y-p.yaw.rotation.y),Math.cos(target-g.rotation.y-p.yaw.rotation.y));
 p.yaw.rotation.y+=difference*Math.min(1,dt*14);
 p.pitch.rotation.x=active&&state?.targetId ? -.18 : 0;
 const age=active&&state?.lastShotAt!==undefined?now-state.lastShotAt:Infinity;
 p.recoil.position.z=age>=0&&age<220?-.12*Math.sin(age/220*Math.PI):0;
 const lock=active?Math.min(4,Math.max(0,(state?.lockShots??0)-1))/4:0;
 for(const rail of p.charge)rail.scale.y=1+lock*.8+(age>=0&&age<130?.6:0);
 if(p.charge[0])(p.charge[0].material as THREE.MeshStandardMaterial).emissiveIntensity=.65+lock*.65+(age>=0&&age<130?.4:0);
}
/** One reusable bolt, core, muzzle and impact per tower; no lights or particle allocation per shot. */
export class SentinelPulse{
 readonly group=new THREE.Group();private trail:THREE.Mesh;private core:THREE.Mesh;private flash:THREE.Mesh;private impact:THREE.Mesh;
 private k=new WorldKit();private start=new THREE.Vector3();private end=new THREE.Vector3();private direction=new THREE.Vector3();private up=new THREE.Vector3(0,1,0);private forward=new THREE.Vector3(0,0,1);
 constructor(){this.trail=this.k.cylinder(this.group,.09,1,[0,0,0],C.light);this.core=this.k.cylinder(this.group,.035,1,[0,0,0],C.core);this.flash=this.k.cylinder(this.group,.16,.24,[0,0,0],C.core);this.impact=this.k.ring(this.group,.25,.045,[0,0,0],C.light,true);
  for(const mesh of [this.trail,this.core,this.flash]){mesh.material=this.k.mat(mesh===this.trail?'#9eff34':C.core,true);mesh.castShadow=false;}const glow=this.trail.material as THREE.MeshStandardMaterial;glow.transparent=true;glow.opacity=.4;glow.depthWrite=false;this.group.visible=false;this.group.traverse(n=>{n.raycast=()=>{};});}
 update(model:THREE.Group,state:SentinelState|undefined,now:number,active:boolean,walls:readonly {x:number;z:number;w:number;d:number;height?:number}[]=[]){
  const age=state?.lastShotAt===undefined?Infinity:now-state.lastShotAt;
  this.group.visible=active&&!!state?.shotPosition&&age>=0&&age<340;if(!this.group.visible)return;
  const p=model.userData.sentinel as Parts;p.muzzle.getWorldPosition(this.start);this.end.set(state!.shotPosition![0],.7,state!.shotPosition![1]);
  // Lift only the visual bolt. Authoritative hits still use captured shotPosition.
  // Compute clearance at both faces of every crossed panel (including walls near
  // the target), rather than assuming a generic arc clears all layouts.
  let lift=0;
  for(const wall of walls){let lo=0,hi=1;for(const [a,b,c,h] of [[this.start.x,this.end.x,wall.x,wall.w/2+.12],[this.start.z,this.end.z,wall.z,wall.d/2+.12]]){const delta=b-a;if(Math.abs(delta)<1e-8){if(a<c-h||a>c+h){lo=2;break;}}else{const u=(c-h-a)/delta,v=(c+h-a)/delta;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));}}if(lo<=hi&&lo<1&&hi>0)for(const t of [Math.max(.001,lo),Math.min(.999,hi)]){const baseline=this.start.y+(this.end.y-this.start.y)*t;lift=Math.max(lift,((wall.height??1.3)+.45-baseline)/(4*t*(1-t)));}}
  const distance=this.start.distanceTo(this.end),travel=Math.max(90,Math.min(230,distance*28)),t=Math.min(1,age/travel);this.direction.subVectors(this.end,this.start);this.direction.y+=4*lift*(1-2*t);this.direction.normalize();
  for(const mesh of [this.trail,this.core]){mesh.visible=t<1;mesh.position.lerpVectors(this.start,this.end,t);mesh.position.y+=4*lift*t*(1-t);mesh.quaternion.setFromUnitVectors(this.up,this.direction);mesh.scale.y=Math.min(distance,.5+distance*.14)*(mesh===this.core?.8:1);}
  this.flash.visible=age<90;this.flash.position.copy(this.start);this.flash.quaternion.setFromUnitVectors(this.up,this.direction);
  this.impact.visible=age>=travel;this.impact.position.copy(this.end);this.impact.quaternion.setFromUnitVectors(this.forward,this.direction);this.impact.scale.setScalar(1+(age-travel)/100);
 }
 dispose(){this.group.removeFromParent();this.k.dispose();}
}
