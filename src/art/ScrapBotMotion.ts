import * as THREE from 'three';
export const SCRAP_BOT_VISUAL_SCALE=1;
type Pose={rig:THREE.Group;core:THREE.Group;wheel:THREE.Group;flash:THREE.Mesh;last:THREE.Vector3;point:THREE.Vector3;scale:THREE.Vector3;initialized:boolean;activity:number;time:number};
const poses=new WeakMap<THREE.Object3D,Pose>();
export function registerWheelPose(bot:THREE.Group,rig:THREE.Group,core:THREE.Group,wheel:THREE.Group,flash:THREE.Mesh){poses.set(bot,{rig,core,wheel,flash,last:new THREE.Vector3(),point:new THREE.Vector3(),scale:new THREE.Vector3(),initialized:false,activity:0,time:0});}
/** Distance-driven tire rotation stays consistent across frame rates and parent scales. */
export function animateScrapBot(bot:THREE.Object3D,dt:number,reduced=false,attack=0,idleBob=0){
 const p=poses.get(bot);if(!p)return;dt=Math.min(.1,Math.max(0,dt));p.rig.getWorldPosition(p.point);p.rig.getWorldScale(p.scale);
 const distance=p.initialized?p.point.distanceTo(p.last):0;p.last.copy(p.point);p.initialized=true;
 const moving=distance>1e-5&&distance<1.5;if(!reduced&&moving)p.wheel.rotation.x+=distance/(.44*Math.max(.001,Math.abs(p.scale.z)));
 p.activity+=(Number(moving&&!reduced)-p.activity)*(1-Math.exp(-dt*18));p.time+=dt;
 p.core.position.y=reduced?0:Math.sin(p.time*2)*.006*(1-p.activity)+idleBob*.15;
 p.core.position.z=reduced?0:-attack*.018;
 p.flash.visible=!!bot.userData.pulsewheelFiring;p.flash.scale.setScalar(reduced?1:1+Math.sin(p.time*35)*.15);
 bot.userData.walkPhase=(p.wheel.rotation.x/(Math.PI*2))%1;bot.userData.walkActivity=p.activity;
}
export function handoffScrapPose(from:THREE.Object3D,to:THREE.Object3D){const a=poses.get(from),b=poses.get(to);if(!a||!b)return;b.wheel.rotation.x=a.wheel.rotation.x;b.initialized=false;}
export function turnScrapBot(bot:THREE.Object3D,yaw:number,dt:number,reduced=false){if(reduced){bot.rotation.y=yaw;return;}const delta=Math.atan2(Math.sin(yaw-bot.rotation.y),Math.cos(yaw-bot.rotation.y));bot.rotation.y+=delta*(1-Math.exp(-Math.max(0,dt)*14));}
