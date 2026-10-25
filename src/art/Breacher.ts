import * as THREE from 'three';
import {WorldKit} from './world';

const navy='#253950',white='#edf0e6',joint='#182936',steel='#506574',orange='#ff9e32',cyan='#43dcf4';
type Pose={rig:THREE.Group;body:THREE.Group;head:THREE.Group;arms:THREE.Group[];elbows:THREE.Group[];legs:THREE.Group[];knees:THREE.Group[];glow:THREE.Mesh;last:THREE.Vector3;point:THREE.Vector3;phase:number;time:number;activity:number;initialized:boolean};
const poses=new WeakMap<THREE.Object3D,Pose>();
/** Reference-led, native stylized heavy assault mech. Forward +Z; all resources belong to WorldKit. */
export function breacherModel(k:WorldKit){
 const root=new THREE.Group(),rig=new THREE.Group(),body=new THREE.Group(),head=new THREE.Group();
 root.name='Breacher';rig.scale.setScalar(1.08);rig.name='breacher-rig';body.name='breacher-torso';head.name='breacher-head';root.add(rig);rig.add(body);body.position.y=1.14;
 const arms:THREE.Group[]=[],elbows:THREE.Group[]=[],legs:THREE.Group[]=[],knees:THREE.Group[]=[];
 // Compact layered torso, exposed waist machinery, and a broad angled breastplate.
 k.box(body,[.56,.21,.42],[0,-.08,0],joint,.04);
 k.box(body,[.78,.48,.46],[0,.25,0],navy,.09);
 const breastplate=new THREE.Shape();breastplate.moveTo(-.35,.16);breastplate.lineTo(-.27,-.035);breastplate.lineTo(0,-.14);breastplate.lineTo(.27,-.035);breastplate.lineTo(.35,.16);breastplate.lineTo(.17,.13);breastplate.lineTo(0,.065);breastplate.lineTo(-.17,.13);breastplate.closePath();k.extrusion(body,'breacher-breastplate',breastplate,.09,[0,.29,.26],white);
 k.box(body,[.29,.12,.07],[0,.09,.28],steel,.02);
 for(const side of [-1,1]){
  const plate=k.box(body,[.21,.38,.18],[side*.35,.24,.22],navy,.035);plate.rotation.z=-side*.18;
  for(const y of [.18,.28])k.box(body,[.12,.035,.025],[side*.36,y,.32],orange,.007,true);
  const piston=k.cylinder(body,.055,.28,[side*.22,-.04,.21],steel);piston.rotation.z=side*.25;
  k.box(body,[.16,.32,.18],[side*.2,.3,-.29],steel,.02);
  k.box(body,[.11,.18,.05],[side*.2,.34,-.4],navy,.015);
 }
 k.emblem(body,[[-.065,.035],[.065,.035],[0,-.045]],[0,.32,.337],navy);
 body.add(head);head.position.y=.58;
 k.box(head,[.32,.29,.29],[0,0,0],navy,.065);
 k.box(head,[.23,.12,.08],[0,.1,.1],white,.035);
 k.box(head,[.25,.095,.035],[0,-.025,.16],joint,.012);
 k.emblem(head,[[-.115,.025],[-.025,-.025],[0,-.057],[.025,-.025],[.115,.025],[.105,-.025],[.035,-.065],[-.035,-.065],[-.105,-.025]],[0,0,.184],cyan);
 for(const side of [-1,1]){const cheek=k.box(head,[.055,.15,.085],[side*.12,-.015,.105],white,.012);cheek.rotation.z=-side*.25;}
 const chin=k.box(head,[.11,.065,.07],[0,-.11,.135],steel,.016);chin.rotation.x=.2;
 k.box(head,[.045,.075,.025],[0,.09,.153],orange,.008,true);
 k.batchStatic(head,'breacher-head');
 // Independent shoulder / elbow pivots make the large fist articulate instead of stretching.
 for(const side of [-1,1]){
  const arm=new THREE.Group(),forearm=new THREE.Group();arms.push(arm);elbows.push(forearm);arm.name=side<0?'breacher-gauntlet-arm':'breacher-support-arm';arm.position.set(side*.48,.38,0);body.add(arm);
  const bearing=k.cylinder(arm,.15,.18,[0,0,0],steel);bearing.rotation.z=Math.PI/2;
  const shoulder=k.box(arm,[.4,.32,.46],[side*.09,.08,0],navy,.08);shoulder.rotation.z=-side*.12;
  k.box(arm,[.33,.11,.36],[side*.09,.24,.015],white,.04);const shoulderEdge=k.box(arm,[.12,.25,.37],[side*.255,.12,.01],white,.025);shoulderEdge.rotation.z=side*.32;const chevron=k.box(arm,[.1,.17,.025],[side*.19,.01,.245],white,.012);chevron.rotation.z=-side*.5;
  const shoulderOverlay=k.box(arm,[.13,.22,.29],[side*.275,.075,.035],navy,.022);shoulderOverlay.rotation.z=side*.37;
  k.box(arm,[.16,.045,.03],[side*.12,.13,.245],orange,.01,true);
  k.box(arm,[.23,.25,.25],[side*.07,-.23,0],joint,.035);
  const elbow=k.cylinder(arm,.12,.22,[side*.07,-.36,0],steel);elbow.rotation.z=Math.PI/2;
  forearm.position.set(side*.07,-.36,0);arm.add(forearm);
  const heavy=side<0;if(heavy)forearm.scale.set(1.18,1.07,1.14);
  k.box(forearm,[heavy?.43:.31,.37,heavy?.4:.3],[0,-.21,.065],navy,.06);
  k.box(forearm,[heavy?.34:.25,.24,.08],[0,-.19,heavy?.29:.23],white,.035);
  if(heavy){
   const socket=k.cylinder(forearm,.135,.028,[0,-.19,.339],joint);socket.rotation.x=Math.PI/2;
   k.ring(forearm,.109,.018,[0,-.19,.362],orange,true);
   const hub=k.cylinder(forearm,.069,.035,[0,-.19,.366],steel);hub.rotation.x=Math.PI/2;
   k.box(forearm,[.045,.065,.012],[0,-.19,.39],orange,.005,true);
  }else k.box(forearm,[.065,.22,.03],[0,-.19,.278],cyan,.01,true);
  const fist=new THREE.Group();fist.name=heavy?'breacher-gauntlet':'breacher-fist';fist.position.set(0,-.49,.13);forearm.add(fist);
  k.box(fist,[heavy?.46:.3,heavy?.27:.23,heavy?.43:.29],[0,0,0],joint,.045);
  for(const x of [-1,0,1]){
   k.box(fist,[heavy?.125:.08,.23,.12],[x*(heavy?.145:.095),.02,heavy?.19:.13],white,.018);
   if(heavy)k.box(fist,[.025,.18,.025],[x*.145,.025,.255],orange,.005,true);
  }
  k.box(fist,[.12,.2,.18],[side*.25,.02,0],navy,.025);
  if(heavy){
   for(const x of [-.145,0,.145]){k.box(fist,[.125,.065,.33],[x,-.157,0],white,.012);k.box(fist,[.025,.012,.22],[x,-.195,0],orange,.003,true);}
   const ring=k.ring(fist,.21,.025,[0,.1,0],orange,true);ring.rotation.x=Math.PI/2;
   const contact=new THREE.Object3D();contact.name='breacher-impact';contact.position.set(0,-.21,0);fist.add(contact);
   const alias=new THREE.Object3D();alias.name='cipher-muzzle';contact.add(alias);
  }
  k.batchStatic(fist,'breacher-fist-'+side);k.batchStatic(forearm,'breacher-forearm-'+side);k.batchStatic(arm,'breacher-shoulder-'+side);
 }
 for(const side of [-1,1]){
  const leg=new THREE.Group(),shin=new THREE.Group();legs.push(leg);knees.push(shin);leg.position.set(side*.24,1.05,0);leg.name='breacher-leg-'+side;rig.add(leg);
  const hip=k.cylinder(leg,.13,.18,[0,0,0],steel);hip.rotation.z=Math.PI/2;
  k.box(leg,[.3,.33,.32],[0,-.17,0],navy,.045);
  const thigh=k.box(leg,[.22,.26,.08],[0,-.15,.18],white,.025);thigh.rotation.x=-.13;
  shin.position.y=-.38;leg.add(shin);
  const knee=k.cylinder(shin,.115,.32,[0,0,0],joint);knee.rotation.z=Math.PI/2;
  k.box(shin,[.31,.37,.28],[0,-.18,0],navy,.04);
  k.box(shin,[.25,.15,.085],[0,-.06,.19],white,.025);
  const shinPlate=k.box(shin,[.23,.24,.07],[0,-.25,.16],white,.02);shinPlate.rotation.x=.13;k.box(shin,[.16,.15,.04],[0,-.25,.21],navy,.012);
  k.box(shin,[.085,.025,.025],[0,-.32,.202],orange,.004,true);
  k.box(shin,[.36,.18,.47],[0,-.48,.095],joint,.035);
  k.box(shin,[.32,.1,.23],[0,-.42,.11],white,.025);
  for(const x of [-.115,0,.115])k.box(shin,[.1,.1,.12],[x,-.51,.33],steel,.015);
  k.batchStatic(shin,'breacher-shin-'+side);k.batchStatic(leg,'breacher-thigh-'+side);
 }
 k.batchStatic(body,'breacher-body');
 const glow=k.ring(elbows[0],.22,.018,[0,-.46,.14],orange,true);glow.rotation.x=Math.PI/2;glow.name='breacher-charge';glow.visible=false;
 poses.set(root,{rig,body,head,arms,elbows,legs,knees,glow,last:new THREE.Vector3(),point:new THREE.Vector3(),phase:0,time:0,activity:0,initialized:false});
 return root;
}
/** Visual-only pose: shot age is authoritative elapsed milliseconds, never changes hit timing. */
export function animateBreacher(bot:THREE.Object3D,dt:number,reduced=false,attack=0,idleBob=0){
 const p=poses.get(bot);if(!p)return;dt=Math.min(.1,Math.max(0,dt));p.rig.getWorldPosition(p.point);
 const distance=p.initialized?p.point.distanceTo(p.last):0;p.last.copy(p.point);p.initialized=true;
 const moving=distance>1e-5&&distance<1.5;p.activity+=(Number(moving)-p.activity)*(1-Math.exp(-dt*12));p.time+=dt;
 if(moving)p.phase+=distance*6;
 const charge=Math.max(0,Math.min(1,bot.userData.breacherCharge??bot.userData.pulsewheelCharge??0));
 const age=bot.userData.breacherShotAge??bot.userData.pulsewheelShotAge??Infinity;
 const hit=bot.userData.breacherHit??bot.userData.pulsewheelHit??0,death=Math.max(0,Math.min(1,bot.userData.breacherDeath??0)),spawn=Math.max(0,Math.min(1,bot.userData.breacherSpawn??1));
 // Punch contacts on the shot, then settles over 420ms; wind-up comes from the real charge phase.
 const strike=age>=0&&age<420?Math.pow(1-age/420,2):0,walk=reduced?0:p.activity*(1-charge)*(1-death),motion=reduced?0:1;
 p.body.position.y=1.14+motion*(Math.abs(Math.sin(p.phase))*.035*walk+Math.sin(p.time*1.6)*.009*(1-walk)+idleBob*.1)-death*.36-(1-spawn)*.18;
 p.body.rotation.set(-strike*.13*motion+death*.4,charge*.13*motion-strike*.18*motion,Math.sin(p.phase)*.035*walk+Math.sin(hit*9)*hit*.055*motion);
 p.head.rotation.y=-p.body.rotation.y*.55;
 for(let i=0;i<2;i++){
  const stride=Math.sin(p.phase+i*Math.PI)*.34*walk;
  p.legs[i].rotation.x=stride-death*.35-(1-spawn)*.2;
  p.knees[i].rotation.x=Math.max(0,-stride)*.65+death*.75+(1-spawn)*.35;
  p.arms[i].rotation.x=-stride*.55+(i===0?charge*.45-strike*1.42:charge*-.15-strike*.2)*motion-death*.12;
  p.arms[i].rotation.z=(i===0?.12:-.09)+Math.sin(p.time*1.6)*.01*motion;
  p.elbows[i].rotation.x=-.18+(i===0?-charge*.8-strike*.05:-charge*.1)*motion;
 }
 p.glow.visible=death===0&&(charge>.05||strike>.1);p.glow.scale.setScalar(1+charge*.2+strike*.3);
 bot.userData.walkPhase=(p.phase/(Math.PI*2))%1;bot.userData.walkActivity=p.activity;
 bot.userData.breacherFootstep=Math.floor(p.phase/Math.PI);
}
export function turnBreacher(bot:THREE.Object3D,yaw:number,dt:number,reduced=false){const delta=Math.atan2(Math.sin(yaw-bot.rotation.y),Math.cos(yaw-bot.rotation.y));bot.rotation.y+=reduced?delta:delta*(1-Math.exp(-Math.max(0,dt)*8));}
