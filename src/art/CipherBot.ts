import * as THREE from 'three';
import {WorldKit,palette as C} from './world';
import {registerWheelPose,SCRAP_BOT_VISUAL_SCALE} from './ScrapBotMotion';
/** Canonical Pulsewheel. Internal factory ID stays stable for saves and research. Forward is +Z. */
export function cipherBotModel(k:WorldKit){
 const bot=new THREE.Group(),rig=new THREE.Group(),core=new THREE.Group(),wheel=new THREE.Group();
 bot.name='Pulsewheel';rig.name='scrap-rig';core.name='body-core';wheel.name='pulsewheel-tire';rig.scale.setScalar(SCRAP_BOT_VISUAL_SCALE);bot.add(rig);rig.add(wheel,core);wheel.position.y=.44;
 const navy='#203044',rubber='#20262e',steel='#425364';
 const tire=k.cylinder(wheel,.43,.42,[0,0,0],rubber);tire.rotation.z=Math.PI/2;
 for(let i=0;i<20;i++){const a=i*Math.PI/10,t=k.box(wheel,[.43,.075,.12],[0,Math.cos(a)*.423,Math.sin(a)*.423],i%2?rubber:'#303842',.016);t.rotation.x=a;}
 for(const side of [-1,1]){
  const ring=k.ring(wheel,.343,.025,[side*.223,0,0],C.cyan,true);ring.rotation.y=Math.PI/2;
  const hub=k.cylinder(wheel,.24,.045,[side*.24,0,0],navy);hub.rotation.z=Math.PI/2;
  const axle=k.cylinder(core,.12,.12,[side*.31,.44,0],steel);axle.rotation.z=Math.PI/2;
  for(let i=0;i<6;i++){const a=i*Math.PI/3,t=k.box(wheel,[.04,.13,.07],[side*.25,Math.cos(a)*.2,Math.sin(a)*.2],steel,.01);t.rotation.x=a;}
  // Compact stabilizer claws, never weapons or walking legs.
  const arm=new THREE.Group();arm.name=side<0?'arm-left':'arm-right';core.add(arm);
  const shoulder=k.box(arm,[.15,.2,.2],[side*.37,.6,0],C.cream,.035);shoulder.rotation.z=side*.25;
  const link=k.box(arm,[.09,.25,.09],[side*.47,.39,.05],navy,.02);link.rotation.z=side*.35;
  k.box(arm,[.14,.13,.17],[side*.5,.26,.09],C.cream,.03);k.box(arm,[.045,.07,.025],[side*.5,.26,.185],C.cyan,.01,true);
  for(const x of [-.045,.045])k.box(arm,[.035,.11,.06],[side*.5+x,.16,.1],navy,.01);
  k.batchStatic(arm,'pulsewheel-claw-'+side);
 }
 k.box(core,[.58,.23,.56],[0,.83,-.015],navy,.055);
 for(const x of [-.23,.23]){const f=k.box(core,[.115,.13,.65],[x,.89,.025],C.cream,.025);f.rotation.x=-.12;}
 k.box(core,[.31,.105,.3],[0,.98,-.1],navy,.025);
 for(const z of [-.08,.025])k.box(core,[.18,.025,.045],[0,1.04,z],C.cyan,.007,true);
 k.box(core,[.07,.28,.08],[-.24,1.08,-.22],navy,.015);k.box(core,[.035,.085,.018],[-.24,1.04,-.171],C.cyan,.005,true);
 // Layered front eye is the barrel: cream armor surrounds a recessed cyan emitter.
 const face=new THREE.Group();face.name='pulsewheel-face';face.position.set(0,.67,.325);core.add(face);
 for(const [r,d,z,color] of [[.275,.12,0,C.cream],[.218,.14,.045,navy],[.177,.06,.13,steel],[.135,.025,.17,navy]] as const){const m=k.cylinder(face,r,d,[0,0,z],color);m.rotation.x=Math.PI/2;}
 k.ring(face,.153,.018,[0,0,.19],C.cyan,true);
 k.box(face,[.12,.12,.026],[0,0,.197],C.cyan,.015,true);k.box(face,[.055,.055,.03],[0,0,.216],navy,.006);
 for(let i=0;i<6;i++){const a=i*Math.PI/3,m=k.box(face,[.08,.085,.055],[Math.sin(a)*.25,Math.cos(a)*.25,.065],C.cream,.016);m.rotation.z=-a;}
 k.batchStatic(face,'pulsewheel-face');k.batchStatic(core,'pulsewheel-chassis');k.batchStatic(wheel,'pulsewheel-tread');
 const muzzle=new THREE.Object3D();muzzle.name='cipher-muzzle';muzzle.position.z=.24;face.add(muzzle);
 const flash=k.ring(face,.105,.022,[0,0,.245],C.cyan,true);flash.name='pulsewheel-flash';flash.visible=false;
 registerWheelPose(bot,rig,core,wheel,flash);return bot;
}
