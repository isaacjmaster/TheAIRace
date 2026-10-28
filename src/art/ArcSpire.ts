import * as THREE from 'three';
import {technologyMaterials,armoredHull} from './TechnologyMaterials';
import {WorldKit} from './world';
import {addGenerationEnergy} from './GenerationEnergy';
import {ARC_SPIRE} from '../../shared/electronic-catalog';

const C={navy:'#25364f',dark:'#142433',steel:'#52647d',cream:'#eff0e6',violet:'#a750ef',purple:'#6131a5',cyan:'#47dcf3',core:'#f6c5ff',gold:'#e9b647'};
export type ArcSpireAnimationState={lastShotAt?:number;targetId?:string;acquiredAt?:number;disabledUntil?:number};
type Parts={muzzle:THREE.Object3D;sphere:THREE.Mesh;rings:THREE.Group[];arcs:THREE.Group[];charge:THREE.Mesh;time:number};
/** Coil Array defense, entirely inside a 4×4 logical foundation. No dynamic lights. */
export function arcSpireModel(k:WorldKit,level=1){
 level=Math.max(1,Math.min(5,level));const p=technologyMaterials(k,level),lift=[0,.12,.30,.48,.65][level-1],orbY=2.52+lift;const root=new THREE.Group();root.name='Arc Spire — Coil Array';
 const shape=new THREE.Shape();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4,x=Math.sin(a)*2.12,y=Math.cos(a)*2.12;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();
 const base=k.extrusion(root,'arc-spire-foundation',shape,.2,[0,.2,0],C.dark);base.rotation.x=Math.PI/2;
 const inset=k.extrusion(root,'arc-spire-foundation-inset',shape,.12,[0,.31,0],C.steel);inset.rotation.x=Math.PI/2;inset.scale.set(.9,.9,1);
 k.cylinder(root,.69,.23,[0,.44,0],C.navy);k.cylinder(root,.47,.75,[0,.9,0],C.dark);
 const technology=level===5?'#af64ff':level===4?'#37b8ff':C.cyan;
 const rings:THREE.Group[]=[];
 for(const [y,r] of [[.68,.58],[1.04,.5],[1.36+lift*.3,.44],[1.69+lift*.6,.49],[1.98+lift,.56]]){const ring=new THREE.Group();ring.position.y=y;root.add(ring);rings.push(ring);const band=k.ring(ring,r+(level>=3?.12:0),level===1?.055:.085,[0,0,0],level<=3?p.metal:technology,level>=4);band.rotation.x=Math.PI/2;const surround=k.ring(ring,r+.055,.045,[0,-.055,0],p.frame);surround.rotation.x=Math.PI/2;for(let i=0;i<4;i++){const a=i*Math.PI/2,tab=k.box(ring,[.13,.09,.23],[Math.sin(a)*(r+.02),0,Math.cos(a)*(r+.02)],i%2?p.frame:p.shell,.018);tab.rotation.y=a;}k.batchStatic(ring,'arc-spire-rotor-'+y);}
 k.cylinder(root,.3,.85+lift,[0,1.48+lift/2,0],C.purple);
 k.cylinder(root,.37,.1,[0,2.12+lift,0],C.cream);
 // Shared faceted sphere has deliberate crystalline surface, a luminous core and restrained cage hoops.
 const core=k.boulder(root,[0,orbY+.01,.38],[.17,.17,.14],C.core,0);core.material=k.mat(C.core,true);
 for(const angle of [-.4,.4]){const cage=k.ring(root,.54,.02,[0,orbY,0],C.violet,true);cage.rotation.y=angle;cage.rotation.x=.1;}
 const arcs:THREE.Group[]=[];
 for(let i=0;i<(level>=3?4:level===2?3:2);i++){
  const a=Math.PI/4+i*Math.PI*2/(level>=3?4:level===2?3:2),x=Math.sin(a),z=Math.cos(a),post=new THREE.Group();post.position.set(x*1.32,.31,z*1.32);root.add(post);
  k.cylinder(post,.23,.31,[0,.15,0],C.navy);k.cylinder(post,.14,.74,[0,.58,0],C.dark);
  for(let j=0;j<4;j++){const coil=k.ring(post,.195,.037,[0,.43+j*.13,0],level<=3?p.metal:technology,level>=4);coil.rotation.x=Math.PI/2;}
  k.cylinder(post,.24,.1,[0,.97,0],p.shell);const cap=k.boulder(post,[0,1.08,0],[.18,.12,.18],C.purple,0);cap.material=k.mat(C.violet,true);
  const support=k.box(post,[.24,.46,.27],[x*.16,.21,z*.16],p.shell,.04);support.rotation.z=-x*.19;support.rotation.x=z*.19;
  k.box(post,[.045,.25,.035],[x*.3,.22,z*.3],C.gold,.008);
  k.batchStatic(post,'arc-spire-post-'+i);
  // Tiny bounded idle arcs connect physical conductors, never create damage.
  const spark=new THREE.Group();spark.name='arc-spire-idle-spark-'+i;root.add(spark);arcs.push(spark);
  const points=[[x*1.32,1.4,z*1.32],[x*.75+.06,1.71+lift*.3,z*.75],[x*.6-.04,1.8+lift*.6,z*.6],[x*.34,2.13+lift,z*.34]];
  for(let n=1;n<points.length;n++){const from=new THREE.Vector3(...points[n-1] as [number,number,number]),to=new THREE.Vector3(...points[n] as [number,number,number]),direction=to.clone().sub(from),beam=k.cylinder(spark,.012,direction.length(),[0,0,0],C.core);beam.material=k.mat(C.core,true);beam.position.copy(from.add(to).multiplyScalar(.5));beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());beam.castShadow=false;}
  k.batchStatic(spark,'arc-spire-idle-spark-'+i);spark.visible=false;
 }
 const shell=p.shell;
 // Each tier changes the power distribution chassis beneath the exposed coil stack.
 if(level===1){k.cylinder(root,.8,.32,[0,.55,0],shell);for(const x of [-.65,.65])armoredHull(k,root,.28,.38,.63,[x,.44,0],C.steel,.08);}
 if(level===2){k.cylinder(root,.96,.65,[0,.72,0],C.steel);for(let i=0;i<4;i++){const a=i*Math.PI/2,block=armoredHull(k,root,.72,.66,.34,[Math.sin(a)*.81,.75,Math.cos(a)*.81],shell,.12);block.rotation.y=a;}const band=k.ring(root,.88,.06,[0,1.08,0],p.metal);band.rotation.x=Math.PI/2;}
 if(level===3){k.cylinder(root,1.06,.83,[0,.81,0],C.dark);for(let i=0;i<4;i++){const a=i*Math.PI/2,block=armoredHull(k,root,.65,.95,.44,[Math.sin(a)*.89,.92,Math.cos(a)*.89],p.metal,.15);block.rotation.y=a;const indicator=k.box(root,[.32,.12,.05],[Math.sin(a)*1.13,.98,Math.cos(a)*1.13],C.cyan,.02,true);indicator.rotation.y=a;}for(const y of [.5,1.36]){const collar=k.ring(root,.96,.11,[0,y,0],p.metal);collar.rotation.x=Math.PI/2;}}
 if(level>=4){
  k.cylinder(root,1.12,.62,[0,.74,0],C.dark);
  for(let i=0;i<4;i++){const a=i*Math.PI/2,rail=new THREE.Group();rail.position.set(Math.sin(a)*.93,0,Math.cos(a)*.93);rail.rotation.y=a;root.add(rail);
   armoredHull(k,rail,.59,1.15,.47,[0,1.09,0],shell,.13);armoredHull(k,rail,.30,.77,.13,[0,1.10,.26],p.frame,.08);k.box(rail,[.13,.58,.035],[0,1.12,.34],technology,.02,true);
   const foot=armoredHull(k,rail,.76,.32,.65,[0,.43,.09],level===5?p.metal:C.steel,.12);
  }
  for(const y of [.49,1.57]){const rim=k.ring(root,1.0,.09,[0,y,0],level===5?p.metal:p.frame);rim.rotation.x=Math.PI/2;}
  const field=k.ring(root,.72,.045,[0,2.23+lift,0],technology,true);field.rotation.x=Math.PI/2;
 }
 if(level===5){
  // Four raked gold conductors hold the mature containment field, keeping the violet orb exposed.
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,fin=new THREE.Group();fin.position.set(Math.sin(a)*.73,2.04,Math.cos(a)*.73);fin.rotation.y=a;root.add(fin);const brace=armoredHull(k,fin,.24,1.12,.32,[0,.13,0],p.metal,.07);brace.rotation.x=-.23;k.box(fin,[.08,.68,.04],[0,.23,.18],technology,.01,true);}
  const cage=k.ring(root,.77,.075,[0,orbY-.08,0],p.metal);cage.rotation.x=Math.PI/2;
 }
 // Conductive posts and support panels are fixed: consolidate their meshes into one material batch.
 for(const fixed of [...root.children])if(fixed instanceof THREE.Group&&!rings.includes(fixed)&&!arcs.includes(fixed)){for(const child of [...fixed.children])if(child instanceof THREE.Mesh)root.attach(child);fixed.removeFromParent();}
 k.batchStatic(root,'arc-spire-static-'+level);
 // Keep animated sphere outside the static merge and retain a named physical discharge origin.
 const animatedSphere=k.boulder(root,[0,orbY,0],[level===1?.36:level===2?.43:level===3?.5:.56,level===1?.36:level===2?.43:level===3?.5:.56,level===1?.36:level===2?.43:level===3?.5:.56],'#b45ce8',0);animatedSphere.material=k.mat('#b45ce8',true);animatedSphere.userData.restScale=animatedSphere.scale.x;
 const energyCore=k.boulder(root,[.13,orbY+.11,.47],[.14,.14,.12],C.core,0);energyCore.material=k.mat(C.core,true);
 const muzzle=new THREE.Object3D();muzzle.name='arc-muzzle';muzzle.position.set(0,orbY+.13,0);root.add(muzzle);
 const charge=k.ring(root,.62,.024,[0,orbY,0],C.core,true);charge.rotation.x=Math.PI/2;charge.visible=false;
 root.userData.visualLevel=level;addGenerationEnergy(k,root,level,'arcSpire',[technology]);root.userData.arcSpire={muzzle,sphere:animatedSphere,rings,arcs,charge,time:0} satisfies Parts;return root;
}
/** Simulation-driven discharge and disabled state. Cosmetic internal sparks have no gameplay callbacks. */
export function animateArcSpire(g:THREE.Group,state:ArcSpireAnimationState|undefined,now:number,dt:number,active=true){
 const p=g.userData.arcSpire as Parts|undefined;if(!p)return;p.time+=Math.min(.1,Math.max(0,dt));
 const jammed=(state?.disabledUntil??0)>now,enabled=active&&!jammed,age=enabled&&state?.lastShotAt!==undefined?now-state.lastShotAt:Infinity;
 const nextShot=Math.max((state?.acquiredAt??now)+ARC_SPIRE.warmupMs,(state?.lastShotAt??-Infinity)+ARC_SPIRE.intervalMs);
 const discharge=age>=0&&age<330?1-age/330:0,charge=enabled&&state?.targetId&&state.acquiredAt!==undefined?Math.max(0,Math.min(1,1-(nextShot-now)/ARC_SPIRE.warmupMs)):0;
 const pulse=enabled?1+Math.sin(p.time*2.1)*.025+discharge*.12:1;
 p.sphere.scale.setScalar((p.sphere.userData.restScale??.54)*pulse);p.sphere.rotation.y=p.time*.12;
 p.rings.forEach((ring,i)=>{if(enabled)ring.rotation.y+=Math.min(.1,dt)*(i%2?-.17:.14)*(1+discharge*3);ring.position.x=jammed?Math.sin(p.time*25+i)*.009:0;});
 p.charge.visible=enabled&&(discharge>.05||charge>.3);p.charge.scale.setScalar(1+discharge*.32+charge*.035);
 p.arcs.forEach((arc,i)=>{const phase=(p.time+i*.71)%3.7;arc.visible=enabled&&(discharge>.18||phase<.075);});
}

