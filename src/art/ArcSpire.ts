import * as THREE from 'three';
import {technologyMaterials,armoredHull} from './TechnologyMaterials';
import {WorldKit} from './world';
import {ARC_SPIRE} from '../../shared/electronic-catalog';

const C={navy:'#25364f',dark:'#142433',steel:'#52647d',cream:'#eff0e6',violet:'#a750ef',purple:'#6131a5',cyan:'#47dcf3',core:'#f6c5ff',gold:'#e9b647'};
export type ArcSpireAnimationState={lastShotAt?:number;targetId?:string;acquiredAt?:number;disabledUntil?:number};
type Parts={muzzle:THREE.Object3D;sphere:THREE.Mesh;rings:THREE.Group[];arcs:THREE.Group[];charge:THREE.Mesh;time:number};
/** Coil Array defense, entirely inside a 4×4 logical foundation. No dynamic lights. */
export function arcSpireModel(k:WorldKit,level=1){
 level=Math.max(1,Math.min(5,level));const p=technologyMaterials(k,level),lift=[0,.08,.12,.16,.2][level-1],orbY=2.52+lift;const root=new THREE.Group();root.name='Arc Spire — Coil Array';
 const shape=new THREE.Shape();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4,x=Math.sin(a)*2.12,y=Math.cos(a)*2.12;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();
 const base=k.extrusion(root,'arc-spire-foundation',shape,.2,[0,.2,0],C.dark);base.rotation.x=Math.PI/2;
 const inset=k.extrusion(root,'arc-spire-foundation-inset',shape,.12,[0,.31,0],C.steel);inset.rotation.x=Math.PI/2;inset.scale.set(.9,.9,1);
 k.cylinder(root,.69,.23,[0,.44,0],C.navy);k.cylinder(root,.47,.75,[0,.9,0],C.dark);
 const rings:THREE.Group[]=[];
 for(const [y,r] of [[.68,.58],[1.04,.5],[1.36+lift*.3,.44],[1.69+lift*.6,.49],[1.98+lift,.56]]){const ring=new THREE.Group();ring.position.y=y;root.add(ring);rings.push(ring);const band=k.ring(ring,r+(level>=3?.12:0),level===1?.055:.085,[0,0,0],level<=3?p.metal:C.violet,level>=4);band.rotation.x=Math.PI/2;const surround=k.ring(ring,r+.055,.045,[0,-.055,0],p.frame);surround.rotation.x=Math.PI/2;for(let i=0;i<4;i++){const a=i*Math.PI/2,tab=k.box(ring,[.13,.09,.23],[Math.sin(a)*(r+.02),0,Math.cos(a)*(r+.02)],i%2?C.navy:C.cream,.018);tab.rotation.y=a;}k.batchStatic(ring,'arc-spire-rotor-'+y);}
 k.cylinder(root,.3,.85+lift,[0,1.48+lift/2,0],C.purple);
 k.cylinder(root,.37,.1,[0,2.12+lift,0],C.cream);
 // Shared faceted sphere has deliberate crystalline surface, a luminous core and restrained cage hoops.
 const core=k.boulder(root,[0,orbY+.01,.38],[.17,.17,.14],C.core,0);core.material=k.mat(C.core,true);
 for(const angle of [-.4,.4]){const cage=k.ring(root,.54,.02,[0,orbY,0],C.violet,true);cage.rotation.y=angle;cage.rotation.x=.1;}
 const arcs:THREE.Group[]=[];
 for(let i=0;i<(level>=3?4:2);i++){
  const a=Math.PI/4+i*Math.PI/(level>=3?2:1),x=Math.sin(a),z=Math.cos(a),post=new THREE.Group();post.position.set(x*1.32,.31,z*1.32);root.add(post);
  k.cylinder(post,.23,.31,[0,.15,0],C.navy);k.cylinder(post,.14,.74,[0,.58,0],C.dark);
  for(let j=0;j<4;j++){const coil=k.ring(post,.195,.037,[0,.43+j*.13,0],level===2||level===3?p.metal:C.violet,level>=4);coil.rotation.x=Math.PI/2;}
  k.cylinder(post,.24,.1,[0,.97,0],C.cream);const cap=k.boulder(post,[0,1.08,0],[.18,.12,.18],C.purple,0);cap.material=k.mat(C.violet,true);
  const support=k.box(post,[.24,.46,.27],[x*.16,.21,z*.16],C.cream,.04);support.rotation.z=-x*.19;support.rotation.x=z*.19;
  k.box(post,[.045,.25,.035],[x*.3,.22,z*.3],C.gold,.008);
  k.batchStatic(post,'arc-spire-post-'+i);
  // Tiny bounded idle arcs connect physical conductors, never create damage.
  const spark=new THREE.Group();spark.name='arc-spire-idle-spark-'+i;root.add(spark);arcs.push(spark);
  const points=[[x*1.32,1.4,z*1.32],[x*.75+.06,1.71+lift*.3,z*.75],[x*.6-.04,1.8+lift*.6,z*.6],[x*.34,2.13+lift,z*.34]];
  for(let n=1;n<points.length;n++){const from=new THREE.Vector3(...points[n-1] as [number,number,number]),to=new THREE.Vector3(...points[n] as [number,number,number]),direction=to.clone().sub(from),beam=k.cylinder(spark,.012,direction.length(),[0,0,0],C.core);beam.material=k.mat(C.core,true);beam.position.copy(from.add(to).multiplyScalar(.5));beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());beam.castShadow=false;}
  k.batchStatic(spark,'arc-spire-idle-spark-'+i);spark.visible=false;
 }
 const shell=p.shell;
 if(level===1)k.cylinder(root,.8,.32,[0,.55,0],shell);
 if(level===2){armoredHull(k,root,2.1,.85,1.8,[0,.75,0],shell,.22);for(const x of [-.8,.8])k.box(root,[.15,.45,1.7],[x,.8,0],p.metal,.04);}
 if(level===3){armoredHull(k,root,2.4,1.05,2.1,[0,.85,0],shell,.3);for(const y of [.5,1.25]){const collar=k.ring(root,.88,.12,[0,y,0],p.metal);collar.rotation.x=Math.PI/2;}}
 if(level>=4){
  // A widening insulated containment body replaces the exposed high-voltage stalk.
  k.cylinder(root,1.18,.7,[0,.75,0],shell);
  for(const x of [-.79,.79]){const cheek=armoredHull(k,root,.42,1.25,1.8,[x,1.72,0],p.frame,.14);cheek.rotation.z=-Math.sign(x)*.15;}
  for(const y of [.5,1.85]){const rim=k.ring(root,.91,.1,[0,y,0],p.frame);rim.rotation.x=Math.PI/2;}
  k.box(root,[1.1,.35,.06],[0,.82,1.16],p.glass,.08);k.box(root,[.75,.08,.03],[0,.82,1.21],C.violet,.02,true);
 }
 if(level===5){for(const a of [0,Math.PI/2]){const cage=k.ring(root,.76,.1,[0,orbY-.05,0],p.frame);cage.rotation.y=a;cage.rotation.x=.3;}
  for(const x of [-.72,.72]){const facet=armoredHull(k,root,.33,1.0,.65,[x,2.05,0],p.glass,.13);facet.rotation.z=-Math.sign(x)*.25;}
 }
 // Conductive posts and support panels are fixed: consolidate their meshes into one material batch.
 for(const fixed of [...root.children])if(fixed instanceof THREE.Group&&!rings.includes(fixed)&&!arcs.includes(fixed)){for(const child of [...fixed.children])if(child instanceof THREE.Mesh)root.attach(child);fixed.removeFromParent();}
 k.batchStatic(root,'arc-spire-static-'+level);
 // Keep animated sphere outside the static merge and retain a named physical discharge origin.
 const animatedSphere=k.boulder(root,[0,orbY,0],[level===1?.36:level===2?.43:level===3?.5:.56,level===1?.36:level===2?.43:level===3?.5:.56,level===1?.36:level===2?.43:level===3?.5:.56],'#b45ce8',0);animatedSphere.material=k.mat('#b45ce8',true);animatedSphere.userData.restScale=animatedSphere.scale.x;
 const energyCore=k.boulder(root,[.13,orbY+.11,.47],[.14,.14,.12],C.core,0);energyCore.material=k.mat(C.core,true);
 const muzzle=new THREE.Object3D();muzzle.name='arc-muzzle';muzzle.position.set(0,orbY+.13,0);root.add(muzzle);
 const charge=k.ring(root,.62,.024,[0,orbY,0],C.core,true);charge.rotation.x=Math.PI/2;charge.visible=false;
 root.userData.visualLevel=level;root.userData.arcSpire={muzzle,sphere:animatedSphere,rings,arcs,charge,time:0} satisfies Parts;return root;
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

