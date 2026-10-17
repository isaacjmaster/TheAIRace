import * as THREE from 'three';
import {WorldKit,palette as c} from './world';
import {obstacleSize,type LandscapeObstacle} from '../../shared/landscape';
export function landscapeModel(k:WorldKit,o:LandscapeObstacle){const g=new THREE.Group();g.position.set(o.position[0],0,o.position[1]);
 if(o.kind==='tree'){k.tree(g,0,0,1.3);k.cylinder(g,1.15,.13,[0,0,0],'#95cfa9');}
 else{const v=o.variant;k.cylinder(g,1.15,.08,[0,.02,0],'#91aaa7');
 const plate=k.box(g,[1.8,.17,1.2],[-.15,.24,0],c.slate,.08);plate.rotation.set(.15, v*.7,.12);
 const panel=k.box(g,[1.15,.14,1.25],[.1,.56,-.12],c.cream,.06);panel.rotation.set(.3,-.45+v*.6,.16);
 const core=k.cylinder(g,.43,.75,[.5,.51,.4],c.dark);core.rotation.z=Math.PI/2;k.cylinder(g,.23,.15,[.95,.51,.4],c.cyan);
 for(let i=0;i<3;i++){const rib=k.box(g,[.12,.25,.67],[-.7+i*.22,.35,.46],i===1?c.gold:c.dark,.03);rib.rotation.y=-.3;}
 k.box(g,[.7,.05,.12],[0,.69,-.05],c.cyan,.02,true);k.box(g,[.12,.4,.12],[-.6,.53,-.45],c.dark);
 if(v===1)k.box(g,[.45,.55,.5],[-.55,.71,-.3],c.slate,.06);if(v===2){const arm=k.box(g,[1,.15,.24],[.15,.7,.6],c.slate,.03);arm.rotation.z=.5;}
 }
 const [w,d]=obstacleSize(o),hit=k.box(g,[w,o.kind==='tree'?4:1.8,d],[0,o.kind==='tree'?2:.9,0],c.dark);hit.visible=false;hit.userData.obstacleId=o.id;return {group:g,hit};
}
