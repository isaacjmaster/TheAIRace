import * as THREE from 'three';
import {WorldKit,palette as C} from './world';
import {registerScrapPose,SCRAP_BOT_VISUAL_SCALE,type BotLeg} from './ScrapBotMotion';
/** Cipher: a low hood, illuminated mono-visor, narrow runner frame and dedicated wrist terminal. */
export function cipherBotModel(k:WorldKit){
 const bot=new THREE.Group(),rig=new THREE.Group(),core=new THREE.Group(),legs:BotLeg[]=[],arms:THREE.Group[]=[];bot.name='Cipher Bot';rig.name='scrap-rig';core.name='body-core';rig.scale.setScalar(SCRAP_BOT_VISUAL_SCALE);bot.add(rig);rig.add(core);
 for(const side of [-1,1]){const leg=new THREE.Group(),foot=new THREE.Group();leg.name=side<0?'leg-left':'leg-right';foot.name=side<0?'foot-left':'foot-right';rig.add(leg);leg.add(foot);
  const upper=k.box(leg,[.105,1,.12],[0,0,0],C.dark,.025),lower=k.box(leg,[.11,1,.13],[0,0,0],C.slate,.025),knee=k.box(leg,[.14,.13,.15],[0,0,0],C.cyan,.025);
  k.box(foot,[.22,.1,.32],[0,.05,.04],C.dark,.035);const toe=k.box(foot,[.21,.055,.18],[0,.1,.13],C.cream,.02);toe.rotation.x=-.12;k.box(foot,[.1,.02,.035],[0,.13,.21],C.cyan,.01,true);legs.push({group:leg,upper,lower,knee,foot,side});
  const arm=new THREE.Group();arm.name=side<0?'arm-left':'arm-right';arm.position.set(side*.285,.61,0);core.add(arm);arms.push(arm);
  const shoulder=k.box(arm,[.19,.17,.22],[side*.015,.035,0],side<0?C.cream:C.slate,.04);shoulder.rotation.z=side*-.18;k.box(arm,[.09,.22,.11],[0,-.12,0],C.dark,.02);k.box(arm,[.16,.16,.19],[0,-.26,.055],side<0?C.slate:C.gold,.025);k.box(arm,[.15,.07,.15],[0,-.33,.09],C.dark,.02);
  if(side===-1){k.box(arm,[.19,.045,.22],[0,-.18,.1],C.dark,.025);k.box(arm,[.13,.015,.15],[0,-.15,.1],C.cyan,.01,true);}
 }
 k.box(core,[.3,.12,.25],[0,.38,0],C.dark,.035);const torso=k.gable(core,.43,.35,.3,[0,.44,0],C.slate);torso.rotation.z=Math.PI;torso.position.y=.79;torso.name='cipher-tapered-chassis';
 k.box(core,[.35,.19,.07],[0,.62,.18],C.cream,.025);for(const x of [-.07,.07]){const chevron=k.box(core,[.045,.13,.025],[x,.62,.225],C.cyan,.01,true);chevron.rotation.z=x<0?-.4:.4;}
 // The cowl and two swept side fins create a different silhouette from the old box-headed unit.
 const hood=k.gable(core,.56,.18,.43,[0,.99,0],C.dark);hood.rotation.z=Math.PI;hood.name='cipher-hood';k.box(core,[.48,.22,.34],[0,.91,0],C.dark,.055);
 k.box(core,[.4,.11,.035],[0,.93,.19],C.cyan,.02,true);k.box(core,[.12,.11,.04],[0,.93,.21],C.dark,.015);
 for(const side of [-1,1]){const fin=k.box(core,[.08,.27,.28],[side*.24,1.02,-.07],C.cream,.025);fin.rotation.z=-side*.24;k.box(core,[.045,.14,.08],[side*.245,1.07,-.12],C.gold,.01);}
 for(const x of [-.09,.09]){k.box(core,[.12,.26,.11],[x,.62,-.21],C.dark,.025);k.box(core,[.035,.17,.025],[x,.64,-.28],C.cyan,.01,true);}
 k.batchStatic(core,'cipher-v2-core');for(let i=0;i<2;i++)k.batchStatic(arms[i],'cipher-v2-arm-'+i);registerScrapPose(bot,rig,core,legs,arms);return bot;
}
