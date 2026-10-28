import * as THREE from 'three';
import {WorldKit} from './world';
import {technologyMaterials,armoredHull} from './TechnologyMaterials';
import type {SentinelState} from '../../shared/sentinel-catalog';

const C={armor:'#183443',edge:'#304c58',steel:'#49616a',dark:'#0c202b',green:'#8cc934',light:'#baff46',core:'#eeffc0'};
type Parts={yaw:THREE.Group;pitch:THREE.Group;recoil:THREE.Group;muzzle:THREE.Object3D;charge:THREE.Mesh[]};
/** All rotating geometry stays inside the four-by-four placement envelope. */
export function sentinelModel(k:WorldKit,level=1){
 const g=new THREE.Group();g.name='Sentinel Tower — Vanguard Cannon';
 level=Math.max(1,Math.min(5,level));
 const p=technologyMaterials(k,level),armor=level===1?p.frame:p.shell,trim=p.frame;
 k.box(g,[3.65,.18,3.65],[0,.09,0],C.dark,.08);
 // A complete low mount, never a stacked tyre or a cage of accessories.
 const mount=k.box(g,[level===1?2.4:3.0,.55,level===3?2.75:2.4],[0,.46,0],armor,.16);mount.rotation.y=level===3?Math.PI/4:0; if(level===3)mount.scale.set(.86,1,.86);
 for(const x of [-1.42,1.42])for(const z of [-1.42,1.42])k.box(g,[.65,.35,.65],[x,.3,z],trim,.07);
 k.cylinder(g,.66,.6,[0,1.05,0],C.dark);const ring=k.ring(g,.67,.045,[0,1.18,0],C.light,true);ring.rotation.x=Math.PI/2;
 const yaw=new THREE.Group();yaw.position.y=1.52;g.add(yaw);yaw.name='sentinel-yaw';
 for(const x of [-.74,.74]){const fork=k.box(yaw,[.3,.95,1.05],[x,.3,-.15],trim,.09);fork.rotation.z=-Math.sign(x)*.13;const bearing=k.cylinder(yaw,.29,.17,[x,.61,0],C.dark);bearing.rotation.z=Math.PI/2;}
 const pitch=new THREE.Group();pitch.position.y=.75;yaw.add(pitch);const recoil=new THREE.Group();pitch.add(recoil);recoil.name='sentinel-cannon';
 // Each generation replaces the principal shroud with a deliberate profile.
 const width=[1.12,1.5,1.85,2.05,2.23][level-1],height=[.68,.86,1.08,1.16,1.32][level-1];
 armoredHull(k,recoil,width,height,[1.48,1.85,2.05,2.15,2.3][level-1],[0,.22,-.25],armor,level===1?.08:.25);
 if(level===1){for(const x of [-.48,.48])k.box(recoil,[.14,.16,1.4],[x,-.18,-.23],trim,.025);}
 if(level===2){for(const x of [-.68,.68]){k.box(recoil,[.18,.45,1.55],[x,.05,-.3],p.metal,.04);k.box(recoil,[.25,.12,1.75],[x,.55,-.2],trim,.04);}}
 if(level===3){for(const x of [-.83,.83]){armoredHull(k,recoil,.36,.88,1.95,[x,.2,-.25],trim,.13);k.box(recoil,[.12,.12,1.9],[x,.6,-.25],p.metal,.025);}}
 if(level>=4){for(const x of [-.8,.8]){
  armoredHull(k,recoil,.5,.78,1.95,[x,.35,-.25],trim,.16);
  k.box(recoil,[.13,.25,1.65],[x+Math.sign(x)*.23,.38,-.18],p.glass,.04);
  k.box(recoil,[.06,.08,1.5],[x+Math.sign(x)*.3,.38,-.18],C.light,.015,true);
 }armoredHull(k,recoil,1.3,.3,1.85,[0,.92,-.3],armor,.13);}
 // Successive barrel collars belong to the recoil assembly, concentric with the original five emitters.
 const neck=k.cylinder(recoil,[.37,.45,.57,.64,.7][level-1],1.14,[0,.12,1.02],level>=3?trim:armor);neck.rotation.x=Math.PI/2;
 const collar=k.cylinder(recoil,[.4,.51,.65,.7,.77][level-1],level>=3?.34:.15,[0,.12,1.43],level<=3?p.metal:trim);collar.rotation.x=Math.PI/2;
 if(level>=4){k.ring(recoil,level===5?.69:.61,.055,[0,.12,1.62],C.green,true);}
 if(level===5)for(let i=0;i<6;i++){const a=i*Math.PI/3;const fin=armoredHull(k,recoil,.23,.28,.62,[Math.sin(a)*.69,.12+Math.cos(a)*.69,1.28],p.glass,.08);fin.rotation.z=-a;}
 const charge:THREE.Mesh[]=[];for(const x of [-.37,.37]){k.box(recoil,[.16,.1,1.55],[x,.51,.61],C.dark,.025);charge.push(k.box(recoil,[.055,.04,1.4],[x,.57,.61],C.light,.012,true));}
 const muzzlePlate=k.cylinder(recoil,level===5?.57:.49,.2,[0,.12,1.61],trim);muzzlePlate.rotation.x=Math.PI/2;
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5,x=Math.sin(a)*.25,y=.12+Math.cos(a)*.25;const barrel=k.cylinder(recoil,.135,.28,[x,y,1.69],C.dark);barrel.rotation.x=Math.PI/2;k.ring(recoil,.103,.025,[x,y,1.84],C.green);const hole=k.cylinder(recoil,.086,.012,[x,y,1.835],C.dark);hole.rotation.x=Math.PI/2;}
 if(level===5)k.ring(recoil,.48,.035,[0,.12,1.74],C.light,true);
 g.userData.visualLevel=level;
 const muzzle=new THREE.Object3D();muzzle.position.set(0,.12,1.93);recoil.add(muzzle);
 // Shared materials / batched armor; animation pivots and charge rails remain separate.
 const rails=new THREE.Group();recoil.add(rails);for(const mesh of charge)rails.attach(mesh);
 k.batchStatic(g,'sentinel-base-'+level);k.batchStatic(yaw,'sentinel-mount-'+level);k.batchStatic(recoil,'sentinel-cannon-'+level);
 g.userData.sentinel={yaw,pitch,recoil,muzzle,charge} satisfies Parts;
 return g;
}
/** Follow the simulation's aim and lock strength. No autonomous firing at the owner's HQ. */
export function animateSentinel(g:THREE.Group,state:SentinelState|undefined,now:number,dt:number,active=true,baseDamage=18){
 const p=g.userData.sentinel as Parts;if(!p)return;
 const target=state?.yaw??g.rotation.y,difference=Math.atan2(Math.sin(target-g.rotation.y-p.yaw.rotation.y),Math.cos(target-g.rotation.y-p.yaw.rotation.y));
 p.yaw.rotation.y+=difference*Math.min(1,dt*9);
 p.pitch.rotation.x=active&&state?.targetId ? -.18 : 0;
 const age=active&&state?.lastShotAt!==undefined?now-state.lastShotAt:Infinity;
 p.recoil.position.z=age>=0&&age<220?-.23*Math.sin(age/220*Math.PI):0;
 const lock=active?Math.min(1,Math.max(0,(state?.shotDamage??baseDamage)-baseDamage)/12):0;
 const warm=active&&state?.targetId&&state.acquiredAt!==undefined?Math.max(0,Math.min(1,(now-state.acquiredAt)/450)):0;
 for(const rail of p.charge){rail.scale.y=1+lock*.8+(age>=0&&age<130?1.4:warm*.4);rail.scale.x=1+lock*.3;}
}
/** One reusable bolt, core, muzzle and impact per tower; no lights or particle allocation per shot. */
export class SentinelPulse{
 readonly group=new THREE.Group();private trail:THREE.Mesh;private core:THREE.Mesh;private flash:THREE.Mesh;private impact:THREE.Mesh;
 private k=new WorldKit();private start=new THREE.Vector3();private end=new THREE.Vector3();private direction=new THREE.Vector3();private up=new THREE.Vector3(0,1,0);private forward=new THREE.Vector3(0,0,1);private shotAt=-Infinity;private victim?:THREE.Vector3;
 constructor(){this.trail=this.k.cylinder(this.group,.09,1,[0,0,0],C.light);this.core=this.k.cylinder(this.group,.035,1,[0,0,0],C.core);this.flash=this.k.cylinder(this.group,.16,.24,[0,0,0],C.core);this.impact=this.k.ring(this.group,.25,.045,[0,0,0],C.light,true);
  for(const mesh of [this.trail,this.core,this.flash]){mesh.material=this.k.mat(mesh===this.trail?'#9eff34':C.core,true);mesh.castShadow=false;}const glow=this.trail.material as THREE.MeshStandardMaterial;glow.transparent=true;glow.opacity=.4;glow.depthWrite=false;this.group.visible=false;this.group.traverse(n=>{n.raycast=()=>{};});}
 update(model:THREE.Group,state:SentinelState|undefined,now:number,active:boolean,walls:readonly {x:number;z:number;w:number;d:number;height?:number}[]=[],baseDamage=18,victim?:THREE.Vector3){
  const age=state?.lastShotAt===undefined?Infinity:now-state.lastShotAt;
  this.group.visible=active&&!!state?.shotPosition&&age>=0&&age<340;if(!this.group.visible)return;
  const p=model.userData.sentinel as Parts;if(this.shotAt!==state!.lastShotAt){this.shotAt=state!.lastShotAt!;this.victim=victim;p.muzzle.getWorldPosition(this.start);this.end.set(state!.shotPosition![0],.7,state!.shotPosition![1]);}
  if(this.victim)this.end.set(this.victim.x,this.victim.y+.7,this.victim.z);
  // Lift only the visual bolt. Authoritative hits still use captured shotPosition.
  // Compute clearance at both faces of every crossed panel (including walls near
  // the target), rather than assuming a generic arc clears all layouts.
  let lift=0;
  for(const wall of walls){let lo=0,hi=1;for(const [a,b,c,h] of [[this.start.x,this.end.x,wall.x,wall.w/2+.12],[this.start.z,this.end.z,wall.z,wall.d/2+.12]]){const delta=b-a;if(Math.abs(delta)<1e-8){if(a<c-h||a>c+h){lo=2;break;}}else{const u=(c-h-a)/delta,v=(c+h-a)/delta;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));}}if(lo<=hi&&lo<1&&hi>0)for(const t of [Math.max(.001,lo),Math.min(.999,hi)]){const baseline=this.start.y+(this.end.y-this.start.y)*t;lift=Math.max(lift,((wall.height??1.3)+.45-baseline)/(4*t*(1-t)));}}
  const strength=1+Math.min(1,Math.max(0,(state?.shotDamage??baseDamage)-baseDamage)/12)*.35;
  const distance=this.start.distanceTo(this.end),travel=Math.max(90,Math.min(230,distance*28)),t=Math.min(1,age/travel);this.direction.subVectors(this.end,this.start);this.direction.y+=4*lift*(1-2*t);this.direction.normalize();
  for(const mesh of [this.trail,this.core]){mesh.visible=t<1;mesh.position.lerpVectors(this.start,this.end,t);mesh.position.y+=4*lift*t*(1-t);mesh.quaternion.setFromUnitVectors(this.up,this.direction);mesh.scale.y=Math.min(distance,.75+distance*.14)*(mesh===this.core?.8:1);mesh.scale.x=mesh.scale.z=strength*(mesh===this.core?1.7:1.8);}
  this.flash.scale.setScalar(strength*(1.8-Math.min(1,age/90)));this.flash.visible=age<90;this.flash.position.copy(this.start);this.flash.quaternion.setFromUnitVectors(this.up,this.direction);
  this.impact.visible=age>=travel;this.impact.position.copy(this.end);this.impact.quaternion.setFromUnitVectors(this.forward,this.direction);this.impact.scale.setScalar(1+(age-travel)/100);
 }
 dispose(){this.group.removeFromParent();this.k.dispose();}
}
