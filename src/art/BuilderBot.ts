import * as THREE from 'three';
import {WorldKit,palette as c} from './world';
export function builderBotModel(k:WorldKit,group=new THREE.Group()){
k.box(group,[.8,.6,.7],[0,.7,0],c.gold,.14);k.box(group,[.65,.3,.08],[0,.76,.38],c.dark);
   for(const x of [-.17,.17])k.box(group,[.09,.1,.04],[x,.8,.44],c.cyan,.02,true);
   for(const x of [-.4,.4]){const wheel=k.cylinder(group,.23,.18,[x,.3,0],c.dark);wheel.rotation.z=Math.PI/2;}
   const tool=new THREE.Group();tool.name='builder-tool';tool.position.set(.55,.7,0);group.add(tool);k.box(tool,[.2,.6,.2],[0,0,0],c.slate);k.box(tool,[.55,.15,.15],[0,.35,.1],c.cream);
   k.cylinder(group,.04,.3,[0,1.15,0],c.slate);k.box(group,[.14,.14,.14],[0,1.35,0],c.cyan,.03,true);
   const spark=k.box(group,[.17,.17,.17],[.72,1.15,.25],c.cyan,.01,true);spark.visible=false;
return {group,spark};}
