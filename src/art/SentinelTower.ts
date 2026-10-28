import * as THREE from 'three';
import {WorldKit} from './world';
import {addGenerationEnergy} from './GenerationEnergy';
import {technologyMaterials,armoredHull} from './TechnologyMaterials';
import type {SentinelState} from '../../shared/sentinel-catalog';

const C={armor:'#183443',edge:'#304c58',steel:'#49616a',dark:'#0c202b',green:'#8cc934',light:'#baff46',core:'#eeffc0'};
type Parts={yaw:THREE.Group;pitch:THREE.Group;recoil:THREE.Group;muzzle:THREE.Object3D;charge:THREE.Mesh[]};
/** All rotating geometry stays inside the four-by-four placement envelope. */
export function sentinelModel(k:WorldKit,level=1){
 level=Math.max(1,Math.min(5,level));const g=new THREE.Group();g.name='Sentinel Tower — Vanguard Cannon';
 const p=technologyMaterials(k,level),dark='#202c37',steel='#63717c',cream='#eee5d3',gold='#dfaa44',energy=sentinelEnergyColor(level),armor=level===3?gold:level===5?'#253144':cream;
 for(const [color,roughness,metalness] of [[gold,.32,.42],[steel,.38,.40],[cream,.45,.12],[dark,.43,.30]] as const){const material=k.mat(color) as THREE.MeshStandardMaterial;material.roughness=roughness;material.metalness=metalness;}
 const box=(parent:THREE.Object3D,size:[number,number,number],pos:[number,number,number],color:string,glow=false)=>k.box(parent,size,pos,color,.035,glow);
 const cylinder=(parent:THREE.Object3D,r:number,length:number,pos:[number,number,number],color:string)=>{const m=k.cylinder(parent,r,length,pos,color);m.rotation.x=Math.PI/2;return m;};
 // Low service foundation and four load-bearing stabilizers, not a tall stack of rings.
 armoredHull(k,g,3.65,.22,3.65,[0,.14,0],dark,.32);k.cylinder(g,1.63,.50,[0,.48,0],steel);k.cylinder(g,1.43,.12,[0,.78,0],dark);
 for(const x of [-1.35,1.35])for(const z of [-1.35,1.35]){armoredHull(k,g,.72,.32,.85,[x,.26,z],dark,.12);const foot=armoredHull(k,g,.68,.66,.80,[x,.59,z],level===1||level>=3?gold:cream,.20);foot.rotation.y=-Math.sign(x*z)*.2;box(g,[.22,.32,.08],[x,.43,z+Math.sign(z)*.42],dark);box(g,[.18,.10,.18],[x,.83,z],level>=4?energy:steel,level>=4);}
 for(const side of [-1,1]){box(g,[2.0,.23,.08],[0,.5,side*1.55],dark);for(let i=-1;i<=1;i++)box(g,[.5,.055,.04],[i*.62,.51,side*1.61],level>=3?energy:steel,level>=3);}
 k.cylinder(g,1.17,.18,[0,.79,0],cream);k.cylinder(g,1.04,.15,[0,.94,0],dark);const bearing=k.ring(g,1.02,.065,[0,1.02,0],steel);bearing.rotation.x=Math.PI/2;
 const yaw=new THREE.Group();yaw.position.y=1.52;yaw.name='sentinel-yaw';g.add(yaw);
 k.cylinder(yaw,.66,.47,[0,-.25,0],dark);for(const x of [-.69,.69]){armoredHull(k,yaw,.32,.98,.89,[x,.28,-.14],level>=3?gold:steel,.12);const trunnion=k.cylinder(yaw,.30,.18,[x,.62,0],dark);trunnion.rotation.z=Math.PI/2;const hub=k.cylinder(yaw,.18,.20,[x,.62,0],level>=3?gold:steel);hub.rotation.z=Math.PI/2;}
 const pitch=new THREE.Group();pitch.position.y=.75;yaw.add(pitch);const recoil=new THREE.Group();pitch.add(recoil);recoil.name='sentinel-cannon';
 const radius=[.44,.49,.53,.58,.65][level-1],width=[1.17,1.45,1.67,1.85,2.0][level-1];
 cylinder(recoil,.62+(level-1)*.055,1.44,[0,.12,-.44],dark);
 armoredHull(k,recoil,width,.64+(level-1)*.09,1.38,[0,.31,-.47],armor,.20);
 // Contoured side cheeks and an integrated rear receiver distinguish every generation.
 for(const side of [-1,1]){const cheek=armoredHull(k,recoil,level===1?.25:.38,.92+(level-1)*.12,1.23,[side*(width/2-.08),.04,-.49],armor,.13);cheek.rotation.z=side*.12;
 box(recoil,[.06,.26,.67],[side*(width/2+.12),.14,-.45],level===1?gold:energy,level>=2);
 if(level>=3){const brace=armoredHull(k,recoil,.19,1.34,.46,[side*(width/2+.12),-.03,-.80],gold,.07);brace.rotation.z=side*.16;}
 }
 armoredHull(k,recoil,.67,.20,.66,[0,.80+(level-1)*.07,-.59],level>=3?gold:steel,.10);box(recoil,[.34,.07,.34],[0,.93+(level-1)*.07,-.59],energy,level>=2);
 // A true open single bore. Rear dark disk gives depth without sealing the muzzle face.
 const tube=k.cachedMesh(recoil,'sentinel-open-barrel-'+level,()=>new THREE.CylinderGeometry(radius,radius,1.56,12,1,true),[0,.12,1.03],dark);tube.rotation.x=Math.PI/2;tube.material=k.ownMaterial((tube.material as THREE.MeshStandardMaterial).clone());(tube.material as THREE.MeshStandardMaterial).side=THREE.DoubleSide;
 cylinder(recoil,radius,.06,[0,.12,1.02],'#080f18');
 for(const z of [.45,1.58]){const collar=k.ring(recoil,radius,.09,[0,.12,z],level===1?gold:level===3?gold:steel);collar.name='sentinel-barrel-collar';}
 const charge:THREE.Mesh[]=[];
 if(level>=2)for(let i=0;i<4;i++){const angle=i*Math.PI/2,rad=radius+.015,x=Math.sin(angle)*rad,y=.12+Math.cos(angle)*rad;const rail=box(recoil,[level>=4?.30:level===3?.23:.16,.08,1.0],[x,y,1.03],energy,true);rail.rotation.z=-angle;charge.push(rail);if(level>=3){const guard=box(recoil,[level===5?.25:.16,.12,.92],[Math.sin(angle+.3)*(radius+.10),.12+Math.cos(angle+.3)*(radius+.10),1.03],level===3||level===5?gold:cream);guard.rotation.z=-angle-.3;}}
 else charge.push(box(recoil,[.075,.04,.44],[0,.61,.23],energy,true));
 const muzzleRim=k.ring(recoil,radius,.075,[0,.12,1.84],level>=4?energy:steel,level>=4);muzzleRim.name='sentinel-single-bore';
 if(level>=4){k.ring(recoil,radius-.13,.035,[0,.12,1.79],energy,true);for(const side of [-1,1])armoredHull(k,recoil,.23,.32,.83,[side*.76,-.59,-.03],level===5?gold:cream,.10);}
 if(level===5){for(const side of [-1,1]){const rear=armoredHull(k,recoil,.22,.52,.25,[side*.60,.99,-.92],gold,.07);rear.rotation.z=side*.18;box(recoil,[.08,.27,.08],[side*.60,1.07,-.76],energy,true);}}
 // Major generational engineering: a gold side-yoke, radial energy clamps, then a long armored accelerator.
 if(level===3)for(const side of [-1,1]){const yoke=armoredHull(k,recoil,.45,1.42,.80,[side*.87,.06,-.28],gold,.17);yoke.rotation.z=side*.23;box(recoil,[.10,.63,.06],[side*.93,.12,.16],dark);}
 if(level===4){
  for(const z of [.43,1.48])for(let i=0;i<4;i++){const a=i*Math.PI/2,clamp=armoredHull(k,recoil,.45,.26,.27,[Math.sin(a)*.64,.12+Math.cos(a)*.64,z],cream,.08);clamp.rotation.z=-a;}
  for(const side of [-1,1]){const shield=armoredHull(k,recoil,.40,1.49,.66,[side*.96,.04,-.23],cream,.15);shield.rotation.z=side*.23;box(recoil,[.10,.78,.08],[side*1.07,.04,-.65],energy,true);}
  k.ring(recoil,radius+.12,.065,[0,.12,1.70],steel);k.ring(recoil,radius+.08,.04,[0,.12,1.78],energy,true);
 }
 if(level===5){
  for(const side of [-1,1]){const shield=armoredHull(k,recoil,.30,1.76,.62,[side*1.04,.12,-.59],gold,.11);shield.rotation.z=side*.16;box(recoil,[.12,1.1,.08],[side*1.07,.13,-.24],energy,true);const stabilizer=armoredHull(k,recoil,.44,.43,1.06,[side*.70,-.67,.28],gold,.13);stabilizer.rotation.z=side*.24;}
  for(const z of [.46,1.56])k.ring(recoil,radius+.06,.11,[0,.12,z],gold);
  k.ring(recoil,radius+.13,.065,[0,.12,1.73],steel);k.ring(recoil,radius+.10,.04,[0,.12,1.83],energy,true);
 }
 g.userData.visualLevel=level;g.userData.weaponEnergyColor=energy;
 const muzzle=new THREE.Object3D();muzzle.name='sentinel-muzzle';muzzle.position.set(0,.12,1.93);recoil.add(muzzle);
 const rails=new THREE.Group();recoil.add(rails);for(const mesh of charge)rails.attach(mesh);
 k.batchStatic(g,'sentinel-base-'+level);k.batchStatic(yaw,'sentinel-mount-'+level);k.batchStatic(recoil,'sentinel-cannon-'+level);
 g.userData.sentinel={yaw,pitch,recoil,muzzle,charge} satisfies Parts;
 addGenerationEnergy(k,g,level,'sentinel',[energy]);return g;
}
/** Cosmetic generation color; never used by the authoritative combat simulation. */
export function sentinelEnergyColor(level:number){return level>=5?'#ba63ff':level>=4?'#2eaeff':level>=2?'#43dcf3':'#f7ab45';}
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
 private k=new WorldKit();private start=new THREE.Vector3();private end=new THREE.Vector3();private direction=new THREE.Vector3();private up=new THREE.Vector3(0,1,0);private forward=new THREE.Vector3(0,0,1);private shotAt=-Infinity;private energyColor='';private victim?:THREE.Vector3;
 constructor(){this.trail=this.k.cylinder(this.group,.09,1,[0,0,0],C.light);this.core=this.k.cylinder(this.group,.035,1,[0,0,0],C.core);this.flash=this.k.cylinder(this.group,.16,.24,[0,0,0],C.core);this.impact=this.k.ring(this.group,.25,.045,[0,0,0],C.light,true);
  for(const mesh of [this.trail,this.core,this.flash]){mesh.material=this.k.mat(mesh===this.trail?'#9eff34':C.core,true);mesh.castShadow=false;}const glow=this.trail.material as THREE.MeshStandardMaterial;glow.transparent=true;glow.opacity=.4;glow.depthWrite=false;this.group.visible=false;this.group.traverse(n=>{n.raycast=()=>{};});}
 update(model:THREE.Group,state:SentinelState|undefined,now:number,active:boolean,walls:readonly {x:number;z:number;w:number;d:number;height?:number}[]=[],baseDamage=18,victim?:THREE.Vector3){
  const color=model.userData.weaponEnergyColor??sentinelEnergyColor(model.userData.visualLevel??1);if(color!==this.energyColor){this.energyColor=color;for(const mesh of [this.trail,this.core,this.flash,this.impact]){const material=mesh.material as THREE.MeshStandardMaterial;material.color.set(color);material.emissive.set(color);}}
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
