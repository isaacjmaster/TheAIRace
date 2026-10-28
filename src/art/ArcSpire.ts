import * as THREE from 'three';
import {WorldKit} from './world';
import {ARC_SPIRE} from '../../shared/electronic-catalog';

const C={navy:'#25364f',dark:'#142433',steel:'#52647d',cream:'#eff0e6',violet:'#a750ef',purple:'#6131a5',cyan:'#47dcf3',core:'#f6c5ff',gold:'#e9b647'};
export type ArcSpireAnimationState={lastShotAt?:number;targetId?:string;acquiredAt?:number;disabledUntil?:number};
type Parts={muzzle:THREE.Object3D;sphere:THREE.Mesh;rings:THREE.Group[];arcs:THREE.Group[];charge:THREE.Mesh;time:number};
/** Coil Array defense, entirely inside a 4×4 logical foundation. No dynamic lights. */
export function arcSpireModel(k:WorldKit,level=1){
 level=Math.max(1,Math.min(5,level));const lift=[0,.25,.55,.8,1.15][level-1],orbY=2.52+lift;const root=new THREE.Group();root.name='Arc Spire — Coil Array';
 const shape=new THREE.Shape();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4,x=Math.sin(a)*2.12,y=Math.cos(a)*2.12;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();
 const base=k.extrusion(root,'arc-spire-foundation',shape,.2,[0,.2,0],C.dark);base.rotation.x=Math.PI/2;
 const inset=k.extrusion(root,'arc-spire-foundation-inset',shape,.12,[0,.31,0],C.steel);inset.rotation.x=Math.PI/2;inset.scale.set(.9,.9,1);
 k.cylinder(root,.69,.23,[0,.44,0],C.navy);k.cylinder(root,.47,.75,[0,.9,0],C.dark);
 const rings:THREE.Group[]=[];
 for(const [y,r] of [[.68,.58],[1.04,.5],[1.36+lift*.3,.44],[1.69+lift*.6,.49],[1.98+lift,.56]]){const ring=new THREE.Group();ring.position.y=y;root.add(ring);rings.push(ring);const band=k.ring(ring,r,.055,[0,0,0],C.violet,true);band.rotation.x=Math.PI/2;const surround=k.ring(ring,r+.055,.045,[0,-.055,0],C.steel);surround.rotation.x=Math.PI/2;for(let i=0;i<4;i++){const a=i*Math.PI/2,tab=k.box(ring,[.13,.09,.23],[Math.sin(a)*(r+.02),0,Math.cos(a)*(r+.02)],i%2?C.navy:C.cream,.018);tab.rotation.y=a;}k.batchStatic(ring,'arc-spire-rotor-'+y);}
 k.cylinder(root,.3,.85+lift,[0,1.48+lift/2,0],C.purple);
 k.cylinder(root,.37,.1,[0,2.12+lift,0],C.cream);
 // Shared faceted sphere has deliberate crystalline surface, a luminous core and restrained cage hoops.
 const core=k.boulder(root,[0,orbY+.01,.38],[.17,.17,.14],C.core,0);core.material=k.mat(C.core,true);
 for(const angle of [-.4,.4]){const cage=k.ring(root,.54,.02,[0,orbY,0],C.violet,true);cage.rotation.y=angle;cage.rotation.x=.1;}
 const arcs:THREE.Group[]=[];
 for(let i=0;i<(level===1?2:4);i++){
  const a=Math.PI/4+i*Math.PI/(level===1?1:2),x=Math.sin(a),z=Math.cos(a),post=new THREE.Group();post.position.set(x*1.32,.31,z*1.32);root.add(post);
  k.cylinder(post,.23,.31,[0,.15,0],C.navy);k.cylinder(post,.14,.74,[0,.58,0],C.dark);
  for(let j=0;j<4;j++){const coil=k.ring(post,.195,.037,[0,.43+j*.13,0],C.violet,true);coil.rotation.x=Math.PI/2;}
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
 for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const panel=new THREE.Group();panel.position.set(Math.sin(a)*1.48,.35,Math.cos(a)*1.48);panel.rotation.y=a;root.add(panel);k.box(panel,[.43,.55,.27],[0,.09,0],C.cream,.035);k.box(panel,[.13,.14,.035],[0,.135,.16],C.cyan,.018,true);k.box(panel,[.075,.17,.035],[0,-.06,.17],C.gold,.008);k.batchStatic(panel,'arc-spire-panel');}
 if(level>=2){for(const x of [-1.1,1.1]){const support=k.box(root,[.3,1.25,.5],[x,1.02,-.65],C.cream,.045);support.rotation.z=-Math.sign(x)*.18;k.box(root,[.12,.65,.09],[x,1.17,-.35],C.cyan,.015,true);}}
 if(level>=3){for(const x of [-1.15,1.15])for(const z of [-1.15,1.15]){const brace=k.box(root,[.26,1.5,.3],[x,.98,z],C.steel,.04);brace.rotation.z=-x*.16;brace.rotation.x=z*.16;k.box(root,[.42,.2,.42],[x,1.81,z],C.cream,.04);}}
 if(level===4){for(const x of [-1.12,1.12]){k.cylinder(root,.3,1.13,[x,2.05,0],C.dark);for(let n=0;n<4;n++){const r=k.ring(root,.32,.07,[x,1.63+n*.26,0],C.violet,true);r.rotation.x=Math.PI/2;}k.box(root,[.76,.18,.28],[x*.68,2.56,0],C.cream,.035);}}
 if(level===5){for(const x of [-1.12,1.12]){const shoulder=k.box(root,[.32,1.75,.55],[x,2.65,0],C.cream,.05);shoulder.rotation.z=-Math.sign(x)*.22;k.box(root,[.12,1.25,.1],[x,2.8,.32],C.violet,.02,true);k.box(root,[.62,.25,.65],[x*.73,3.54,0],C.steel,.06);}for(const y of [1.9,2.25]){const ring=k.ring(root,.87,.09,[0,y,0],C.cream);ring.rotation.x=Math.PI/2;}}
 // Conductive posts and support panels are fixed: consolidate their meshes into one material batch.
 for(const fixed of [...root.children])if(fixed instanceof THREE.Group&&!rings.includes(fixed)&&!arcs.includes(fixed)){for(const child of [...fixed.children])if(child instanceof THREE.Mesh)root.attach(child);fixed.removeFromParent();}
 k.batchStatic(root,'arc-spire-static-'+level);
 // Keep animated sphere outside the static merge and retain a named physical discharge origin.
 const animatedSphere=k.boulder(root,[0,orbY,0],[.54,.54,.54],'#b45ce8',0);animatedSphere.material=k.mat('#b45ce8',true);
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
 p.sphere.scale.setScalar(.54*pulse);p.sphere.rotation.y=p.time*.12;
 p.rings.forEach((ring,i)=>{if(enabled)ring.rotation.y+=Math.min(.1,dt)*(i%2?-.17:.14)*(1+discharge*3);ring.position.x=jammed?Math.sin(p.time*25+i)*.009:0;});
 p.charge.visible=enabled&&(discharge>.05||charge>.3);p.charge.scale.setScalar(1+discharge*.32+charge*.035);
 p.arcs.forEach((arc,i)=>{const phase=(p.time+i*.71)%3.7;arc.visible=enabled&&(discharge>.18||phase<.075);});
}

