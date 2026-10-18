import * as THREE from 'three';
export const SCRAP_BOT_VISUAL_SCALE=1.18;
export type BotLeg={group:THREE.Group;upper:THREE.Mesh;lower:THREE.Mesh;knee:THREE.Mesh;foot:THREE.Group;side:number};
type FootState={anchor:THREE.Vector3;from:THREE.Vector3;phase:number;swing:boolean};
type Pose={rig:THREE.Group;core:THREE.Group;legs:BotLeg[];arms:THREE.Group[];feet:FootState[];initialized:boolean;distance:number;activity:number;position:THREE.Vector3;scale:THREE.Vector3;previousScale:number;inverse:THREE.Matrix4;local:THREE.Vector3;target:THREE.Vector3;hip:THREE.Vector3;ankle:THREE.Vector3;knee:THREE.Vector3;direction:THREE.Vector3;bend:THREE.Vector3};
const poses=new WeakMap<THREE.Object3D,Pose>(),UP=new THREE.Vector3(0,1,0),cycle=1.1,stance=.55,front=cycle*stance/2;
export function registerScrapPose(bot:THREE.Group,rig:THREE.Group,core:THREE.Group,legs:BotLeg[],arms:THREE.Group[]){const p:Pose={rig,core,legs,arms,feet:legs.map(()=>({anchor:new THREE.Vector3(),from:new THREE.Vector3(),phase:0,swing:false})),initialized:false,distance:0,activity:0,position:new THREE.Vector3(),scale:new THREE.Vector3(),previousScale:0,inverse:new THREE.Matrix4(),local:new THREE.Vector3(),target:new THREE.Vector3(),hip:new THREE.Vector3(),ankle:new THREE.Vector3(),knee:new THREE.Vector3(),direction:new THREE.Vector3(),bend:new THREE.Vector3()};poses.set(bot,p);for(const leg of legs){leg.foot.position.set(leg.side*.17,0,0);solveLeg(p,leg);}}
function bone(mesh:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3,direction:THREE.Vector3){mesh.position.copy(a).add(b).multiplyScalar(.5);direction.copy(b).sub(a);mesh.scale.y=direction.length();mesh.quaternion.setFromUnitVectors(UP,direction.normalize());}
function solveLeg(p:Pose,leg:BotLeg){
 p.hip.set(leg.side*.17,.43+p.core.position.y,0);p.ankle.copy(leg.foot.position);p.ankle.y+=.12;p.direction.copy(p.ankle).sub(p.hip);const distance=p.direction.length();p.bend.set(0,p.direction.z,-p.direction.y).normalize();p.knee.copy(p.hip).add(p.ankle).multiplyScalar(.5).addScaledVector(p.bend,Math.sqrt(Math.max(0,.25*.25-distance*distance/4)));leg.knee.position.copy(p.knee);bone(leg.upper,p.hip,p.knee,p.direction);bone(leg.lower,p.knee,p.ankle,p.direction);
}
/** Read-only animation: actual rendered displacement drives cadence; a stance foot never translates in world X/Z. */
export function animateScrapBot(bot:THREE.Object3D,dt:number,reduced=false,attack=0,idleBob=0,windup=0){
 const p=poses.get(bot);if(!p)return;dt=Math.min(.1,Math.max(0,dt));p.rig.updateWorldMatrix(true,false);p.rig.getWorldPosition(p.target);p.rig.getWorldScale(p.scale);const scale=Math.max(.001,Math.abs(p.scale.z));
 let distance=p.initialized?Math.hypot(p.target.x-p.position.x,p.target.z-p.position.z):0,dy=p.initialized?p.target.y-p.position.y:0;
 if(!p.initialized||distance>1.5||Math.abs(scale-p.previousScale)>scale*.2){for(let i=0;i<2;i++){p.feet[i].anchor.copy(p.legs[i].foot.position).applyMatrix4(p.rig.matrixWorld);p.feet[i].swing=false;p.feet[i].phase=(.275+i*.5)%1;}distance=0;dy=0;p.initialized=true;}
 p.previousScale=scale;p.position.copy(p.target);p.inverse.copy(p.rig.matrixWorld).invert();const moving=distance>1e-5;
 if(!reduced)p.distance+=distance/scale;p.activity+=(Number(moving&&!reduced)-p.activity)*(1-Math.exp(-dt*18));const phase=(p.distance/cycle+.275)%1;
 const bob=reduced?0:Math.abs(Math.sin(phase*Math.PI*2))*.024*p.activity+idleBob*(1-p.activity);p.core.position.y+=(bob-p.core.position.y)*(1-Math.exp(-dt*20));
 for(let i=0;i<2;i++){const leg=p.legs[i],foot=p.feet[i],q=(phase+i*.5)%1;foot.anchor.y+=dy;
  if(moving&&!reduced){
   if(q>=stance){const u=(q-stance)/(1-stance),ease=u*u*(3-2*u);p.target.set(leg.side*.17,0,front+(1-u)*cycle*(1-stance)).applyMatrix4(p.rig.matrixWorld);
    if(!foot.swing){foot.from.copy(foot.anchor);if(foot.phase>=stance&&ease<.98)foot.from.copy(foot.anchor).addScaledVector(p.target,-ease).multiplyScalar(1/(1-ease));foot.swing=true;}
    foot.anchor.lerpVectors(foot.from,p.target,ease);foot.anchor.y=p.position.y+Math.sin(u*Math.PI)*.13*scale*p.activity;
   }else{foot.swing=false;foot.anchor.y=p.position.y;}
  }else{foot.anchor.y+=(p.position.y-foot.anchor.y)*(1-Math.exp(-dt*24));if(reduced){p.target.set(leg.side*.17,0,0).applyMatrix4(p.rig.matrixWorld);foot.anchor.copy(p.target);foot.swing=false;}}
  leg.foot.position.copy(foot.anchor).applyMatrix4(p.inverse);leg.foot.rotation.x=foot.swing&&moving&&!reduced?Math.sin((q-stance)/(1-stance)*Math.PI)*-.1:0;solveLeg(p,leg);foot.phase=q;
 }
 const striking=attack>0&&!reduced,preparing=windup>0&&!reduced;
 // Upper-body motion leaves the stance feet and ground anchors untouched.
 const lean=striking?-.19*attack:preparing?.08*windup:0,twist=striking?.18*attack:preparing?-.16*windup:0;
 p.core.rotation.x+=(lean-p.core.rotation.x)*(1-Math.exp(-dt*24));p.core.rotation.y+=(twist-p.core.rotation.y)*(1-Math.exp(-dt*24));
 const swing=Math.sin(phase*Math.PI*2)*.22*p.activity;
 for(let i=0;i<2;i++){const arm=p.arms[i],target=reduced?0:i===1&&striking?-1.85*attack:i===1&&preparing?.8*windup:i===0&&(striking||preparing)?-.4*Math.max(attack,windup):(i===0?-swing:swing);
  // The hit pose is applied on its event frame; recovery and anticipation ease naturally.
  if(i===1&&striking)arm.rotation.x=target;else arm.rotation.x+=(target-arm.rotation.x)*(1-Math.exp(-dt*22));
  const forward=i===1&&striking?.13*attack:0;arm.position.z+=(forward-arm.position.z)*(1-Math.exp(-dt*35));
 }
 bot.userData.punchExtension=attack;bot.userData.punchWindup=windup;
 bot.userData.walkPhase=phase;bot.userData.walkActivity=p.activity;
}
/** Copy the settled delivery pose into its existing authoritative Hangar representation. */
export function handoffScrapPose(from:THREE.Object3D,to:THREE.Object3D){const a=poses.get(from),b=poses.get(to);if(!a||!b)return;b.core.position.y=a.core.position.y;for(let i=0;i<2;i++){b.legs[i].foot.position.copy(a.legs[i].foot.position);b.arms[i].rotation.copy(a.arms[i].rotation);solveLeg(b,b.legs[i]);}b.initialized=false;}
export function turnScrapBot(bot:THREE.Object3D,yaw:number,dt:number,reduced=false){if(reduced){bot.rotation.y=yaw;return;}const delta=Math.atan2(Math.sin(yaw-bot.rotation.y),Math.cos(yaw-bot.rotation.y));bot.rotation.y+=delta*(reduced?1:1-Math.exp(-Math.max(0,dt)*14));}
