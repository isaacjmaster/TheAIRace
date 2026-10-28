import * as THREE from 'three';
import {WorldKit} from './world';

const C={navy:'#25364f',dark:'#142433',steel:'#52647d',cream:'#f0f1e8',violet:'#a750ef',purple:'#6131a5',cyan:'#47dcf3',core:'#f6c5ff'};
type Leg={root:THREE.Group;upper:THREE.Group;lower:THREE.Group;foot:THREE.Group;side:number;row:number;hip:THREE.Vector3;toe:THREE.Vector3;lastToe:THREE.Vector3;initialized:boolean};
type LimbBatch={mesh:THREE.InstancedMesh;sources:THREE.Mesh[]};
type Pose={batches:LimbBatch[];inverse:THREE.Matrix4;matrix:THREE.Matrix4;body:THREE.Group;dish:THREE.Group;charge:THREE.Mesh;legs:Leg[];last:THREE.Vector3;point:THREE.Vector3;phase:number;time:number;activity:number;initialized:boolean};
const poses=new WeakMap<THREE.Object3D,Pose>();
/** Orbital Dish support robot. Forward +Z; exactly six articulated legs. All assets are Kit-owned. */
export function disruptorModel(k:WorldKit){
 const root=new THREE.Group(),body=new THREE.Group();root.name='Disruptor';body.name='disruptor-chassis';root.add(body);body.position.y=.64;
 k.cylinder(body,.46,.2,[0,-.05,0],C.dark);
 k.box(body,[.79,.25,.79],[0,.08,0],C.navy,.13);
 k.box(body,[.69,.11,.71],[0,.24,0],C.cream,.08);
 k.box(body,[.46,.11,.2],[0,.2,.4],C.cream,.04);
 k.box(body,[.3,.09,.04],[0,.12,.49],C.dark,.02);
 for(const x of [-.105,.105])k.box(body,[.075,.035,.018],[x,.13,.517],C.cyan,.006,true);
 for(const side of [-1,1]){
  k.box(body,[.08,.12,.32],[side*.43,.12,-.03],C.cream,.025);
  k.box(body,[.025,.045,.14],[side*.477,.15,.04],C.violet,.005,true);
  const equipment=k.box(body,[.16,.31,.23],[side*.27,.35,-.25],C.navy,.03);equipment.rotation.z=-side*.12;
  k.box(body,[.1,.06,.16],[side*.27,.53,-.25],C.cream,.015);
 }
 // Rear receiver mast is separate from the dish and keeps the reference's asymmetric equipment silhouette.
 const mast=new THREE.Group();mast.position.set(-.31,.4,-.27);mast.rotation.z=.12;body.add(mast);
 k.box(mast,[.115,.52,.13],[0,.23,0],C.navy,.02);k.box(mast,[.075,.41,.025],[0,.24,.08],C.violet,.01,true);k.box(mast,[.14,.055,.15],[0,.5,0],C.cream,.012);k.batchStatic(mast,'disruptor-mast');
 const mount=new THREE.Group();body.add(mount);mount.position.set(.08,.31,-.12);
 k.box(mount,[.23,.38,.25],[0,.16,0],C.dark,.035);
 const bearing=k.cylinder(mount,.145,.3,[0,.31,0],C.steel);bearing.rotation.z=Math.PI/2;
 const dish=new THREE.Group();dish.name='disruptor-orbital-dish';dish.position.set(0,.58,.035);dish.rotation.x=-.32;mount.add(dish);
 // Concentric concave bands, radial receiver petals and a thick mechanical rim form an actual dish silhouette.
 const back=k.cylinder(dish,.525,.075,[0,0,-.12],C.navy);back.rotation.x=Math.PI/2;
 for(const [r,z,t,color] of [[.53,.075,.047,C.steel],[.485,.052,.018,C.cream],[.43,.005,.035,C.purple],[.33,-.047,.033,C.purple],[.215,-.085,.029,C.violet]] as const)k.ring(dish,r,t,[0,0,z],color,color===C.violet);
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,b=(i+1)*Math.PI/6,points:[number,number][]=[[Math.sin(a)*.13,Math.cos(a)*.13],[Math.sin(a)*.465,Math.cos(a)*.465],[Math.sin(b)*.465,Math.cos(b)*.465],[Math.sin(b)*.13,Math.cos(b)*.13]];
  k.emblem(dish,points,[0,0,-.06],i%2?'#783ac1':'#6933ac');
  const rib=k.box(dish,[.012,.32,.016],[Math.sin(a)*.31,Math.cos(a)*.31,-.025],C.violet,.003,true);rib.rotation.z=-a;
 }
 k.ring(dish,.145,.033,[0,0,.06],C.core,true);
 const hub=k.cylinder(dish,.115,.11,[0,0,.045],C.violet);hub.rotation.x=Math.PI/2;hub.material=k.mat(C.violet,true);
 const eye=k.cylinder(dish,.085,.025,[0,0,.116],C.core);eye.rotation.x=Math.PI/2;eye.material=k.mat(C.core,true);
 for(const side of [-1,1]){const brace=k.box(dish,[.04,.05,.43],[side*.26,0,-.08],C.navy,.008);brace.rotation.y=side*.55;}
 k.batchStatic(dish,'disruptor-dish');k.batchStatic(mount,'disruptor-mount');
 for(const fixed of [mast,mount])for(const child of [...fixed.children])if(child instanceof THREE.Mesh)body.attach(child);
 k.batchStatic(body,'disruptor-chassis');
 const muzzle=new THREE.Object3D();muzzle.name='cipher-muzzle';muzzle.position.z=.16;dish.add(muzzle);
 const charge=k.ring(dish,.17,.019,[0,0,.14],C.core,true);charge.name='disruptor-charge';charge.visible=false;
 const legs:Leg[]=[];
 for(const side of [-1,1])for(let row=0;row<3;row++){
  const leg=new THREE.Group(),upper=new THREE.Group(),lower=new THREE.Group(),foot=new THREE.Group(),z=(row-1)*.35;
  leg.name=`disruptor-leg-${side<0?'left':'right'}-${row+1}`;root.add(leg);leg.position.set(side*.33,.63,z);leg.add(upper,lower,foot);
  // Segments point along +Y; a lightweight IK pose joins the hip, knee and grounded foot.
  k.box(upper,[.18,.43,.21],[0,.215,0],C.dark,.035);
  k.box(upper,[.19,.26,.16],[0,.24,.05],C.cream,.03);
  const hinge=k.cylinder(upper,.095,.21,[0,.43,0],C.steel);hinge.rotation.x=Math.PI/2;
  k.box(lower,[.19,.51,.23],[0,.255,0],C.navy,.035);
  k.box(lower,[.16,.36,.065],[0,.28,.15],C.cream,.024);
  k.box(lower,[.045,.25,.018],[0,.28,.193],C.violet,.006,true);
  k.box(foot,[.21,.1,.27],[0,.05,0],C.dark,.025);
  k.box(foot,[.12,.045,.09],[0,.11,.07],C.cream,.012);
  k.batchStatic(upper,'disruptor-upper');k.batchStatic(lower,'disruptor-lower');k.batchStatic(foot,'disruptor-foot');
  legs.push({root:leg,upper,lower,foot,side,row,hip:new THREE.Vector3(),toe:new THREE.Vector3(),lastToe:new THREE.Vector3(),initialized:false});
 }
 // Six repeated legs share dynamic instance batches per segment material. Joint transforms remain independent.
 const groups=new Map<string,THREE.Mesh[]>();for(const leg of legs)leg.root.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){const key=o.geometry.uuid+o.material.uuid,list=groups.get(key)??[];list.push(o);groups.set(key,list);}});
 const batches:LimbBatch[]=[];for(const sources of groups.values()){const instance=k.instanced(root,sources[0].geometry,sources[0].material as THREE.Material,sources.length);instance.castShadow=sources.some(m=>m.castShadow);instance.name='disruptor-limb-batch';for(const source of sources)source.visible=false;batches.push({mesh:instance,sources});}
 poses.set(root,{batches,inverse:new THREE.Matrix4(),matrix:new THREE.Matrix4(),body,dish,charge,legs,last:new THREE.Vector3(),point:new THREE.Vector3(),phase:0,time:0,activity:0,initialized:false});
 animateDisruptor(root,0);return root;
}
const up=new THREE.Vector3(0,1,0),segment=new THREE.Vector3(),knee=new THREE.Vector3(),toe=new THREE.Vector3();
function poseSegment(mesh:THREE.Object3D,from:THREE.Vector3,to:THREE.Vector3,length:number){mesh.position.copy(from);segment.subVectors(to,from);mesh.scale.y=segment.length()/length;mesh.quaternion.setFromUnitVectors(up,segment.normalize());}
/** Visual gait follows actual displacement; animation never determines training or EMP outcomes. */
export function animateDisruptor(bot:THREE.Object3D,dt:number,reduced=false,attack=0,idleBob=0){
 const p=poses.get(bot);if(!p)return;dt=Math.max(0,Math.min(.1,dt));bot.getWorldPosition(p.point);
 const distance=p.initialized?p.point.distanceTo(p.last):0;p.last.copy(p.point);p.initialized=true;
 const moving=distance>.00001&&distance<1.5;p.activity+=(Number(moving)-p.activity)*(1-Math.exp(-dt*14));p.time+=dt;if(moving)p.phase+=distance*9;
 const charge=Math.max(0,Math.min(1,bot.userData.disruptorCharge??bot.userData.pulsewheelCharge??attack)),age=bot.userData.disruptorShotAge??bot.userData.pulsewheelShotAge??Infinity;
 const hit=bot.userData.disruptorHit??bot.userData.pulsewheelHit??0,death=Math.max(0,Math.min(1,bot.userData.disruptorDeath??0)),spawn=Math.max(0,Math.min(1,bot.userData.disruptorSpawn??1));
 const motion=reduced?0:1,walk=p.activity*(1-charge)*(1-death)*motion,recoil=age>=0&&age<230?Math.sin(age/230*Math.PI):0;
 p.body.position.y=.64-charge*.035-death*.29-(1-spawn)*.12+Math.sin(p.phase*2)*.012*walk+Math.sin(p.time*1.7)*.006*(1-walk)*motion+idleBob*.04;
 p.body.rotation.z=Math.sin(p.phase)*.018*walk+Math.sin(hit*8)*hit*.035*motion;p.body.rotation.x=recoil*.04*motion+death*.2;
 p.dish.rotation.x=-.32+recoil*.075*motion+death*.65;p.dish.rotation.y=Math.sin(p.time*.55)*.09*(1-walk)*(1-charge)*(1-death)*motion;
 for(const leg of p.legs){
  const phase=(p.phase+((leg.row+(leg.side<0?0:1))%2)*Math.PI)%(Math.PI*2),stance=phase<Math.PI,sweep=stance?.17-phase/Math.PI*.34:-.17+.17*(1-Math.cos(phase-Math.PI)),lift=stance?0:Math.sin(phase-Math.PI)*.105*walk;
  // Alternating tripods: stance feet sweep backward relative to the advancing chassis.
  const extension=leg.side*(.5+charge*.035),spread=(leg.row-1)*.16;
  toe.set(extension,-.63+lift+death*.25,spread+sweep*walk);
  knee.set(leg.side*.35,-.09-death*.1,spread*.55+sweep*.36*walk);
  leg.hip.set(0,-charge*.025-death*.15,0);poseSegment(leg.upper,leg.hip,knee,.43);toe.y+=.1;poseSegment(leg.lower,knee,toe,.51);toe.y-=.1;leg.foot.position.copy(toe);leg.foot.rotation.x=-(stance?0:Math.sin(phase-Math.PI))*.15*walk;
 }
 bot.updateWorldMatrix(true,true);p.inverse.copy(bot.matrixWorld).invert();for(const batch of p.batches){for(let i=0;i<batch.sources.length;i++){p.matrix.multiplyMatrices(p.inverse,batch.sources[i].matrixWorld);batch.mesh.setMatrixAt(i,p.matrix);}batch.mesh.instanceMatrix.needsUpdate=true;}
 p.charge.visible=death===0&&(charge>.05||recoil>.1);p.charge.scale.setScalar(1+charge*.24+recoil*.35);
 bot.userData.walkActivity=p.activity;bot.userData.walkPhase=(p.phase/(Math.PI*2))%1;
}
export function turnDisruptor(bot:THREE.Object3D,yaw:number,dt:number,reduced=false){const delta=Math.atan2(Math.sin(yaw-bot.rotation.y),Math.cos(yaw-bot.rotation.y));bot.rotation.y+=reduced?delta:delta*(1-Math.exp(-Math.max(0,dt)*9));}
