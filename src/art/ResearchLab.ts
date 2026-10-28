import * as THREE from 'three';import {WorldKit,palette as C} from './world';
export function researchLabModel(k:WorldKit,level=1){level=Math.max(1,Math.min(5,level));const g=new THREE.Group();g.name='Research Lab';k.box(g,[3.9,.18,2.9],[0,.09,0],'#879b94');k.grounding(g,4.6,3.6);k.box(g,[3.5,1.9,2.4],[0,1.12,0],C.cream,.12);k.box(g,[3.65,.28,2.6],[0,2.2,0],C.dark,.1);
 const window=k.box(g,[2.3,1.2,.045],[-.4,1.2,1.235],'#203e61');window.name='research-window';k.box(g,[2.12,.07,.035],[-.4,1.75,1.27],C.cyan,.015,true);for(const x of [-1.05,-.4,.25]){k.box(g,[.38,.65,.055],[x,1.12,1.285],'#8771cf',.04,true);k.box(g,[.23,.06,.035],[x,1.28,1.327],C.cyan,.01,true);}
 const door=new THREE.Group();door.name='research-door';door.position.set(1.25,0,1.265);g.add(door);k.box(door,[.6,1.4,.055],[0,.93,0],C.dark,.025);for(const x of [-.35,.35])k.box(door,[.085,1.58,.09],[x,.95,-.025],C.slate,.015);k.box(door,[.78,.085,.09],[0,1.7,-.025],C.slate,.015);k.box(door,[.035,1.16,.018],[-.25,.96,.04],C.cyan,.008,true);k.box(door,[.1,.065,.04],[.16,.94,.055],C.gold,.012);k.box(g,[.82,.1,.22],[1.25,.14,1.36],C.cream,.025);
 const deck=k.box(g,[1.7,.14,1.5],[-.25,2.41,-.15],C.slate,.04);deck.name='research-roof-deck';const core=new THREE.Group();core.name='research-core';core.position.set(-.25,2.67,-.15);k.cylinder(core,.4,.34,[0,0,0],'#8771cf');k.cylinder(core,.22,.4,[0,.04,0],C.cyan);g.add(core);for(const x of [-1.3,1.3]){const accent=k.box(g,[.1,.045,2.1],[x,2.365,0],C.cyan,.015,true);accent.name=x<0?'research-roof-accent-left':'research-roof-accent-right';}
 const armor=['#eee9d9','#bcced0','#edf0e8','#b2c0d7','#dde6f0'][level-1],navy='#193344',purple='#9855d5';
 if(level>=2){for(const x of [-1.56,1.56]){k.box(g,[.34,2.2,.36],[x,1.2,-.9],navy,.05);k.box(g,[.5,.56,1.35],[x,2.55,-.25],armor,.06);}k.box(g,[2.5,.34,1.85],[0,2.53,-.15],armor,.08);}
 if(level===2){for(const x of [-.7,.7]){k.cylinder(g,.34,.5,[x,2.94,-.2],navy);k.cylinder(g,.22,.18,[x,3.27,-.2],purple);}core.position.y=2.91;}
 if(level>=3){
  // Dedicated experimental chamber framed above the still-accessible terminal floor.
  core.position.y=3.35;for(const x of [-1.2,1.2]){k.box(g,[.3,1.4,1.3],[x,3,-.2],armor,.06);k.box(g,[.1,.86,.08],[x,3.18,.5],purple,.02,true);}
  k.box(g,[2.8,.25,1.6],[0,3.76,-.2],navy,.07);k.box(g,[2.1,.06,.1],[0,3.92,.5],purple,.02,true);
 }
 if(level===4){
  for(const x of [-1.1,1.1]){const pod=k.cylinder(g,.4,.8,[x,4.1,-.2],navy);k.cylinder(g,.32,.17,[x,4.58,-.2],armor);for(let n=0;n<3;n++){const band=k.ring(g,.37,.045,[x,3.94+n*.2,-.2],purple,true);band.rotation.x=Math.PI/2;}}
  k.box(g,[1.5,.18,.4],[0,4.13,-.2],armor,.05);
 }
 if(level===5){
  // Magnetic sample-analysis arch, mounted to the laboratory's two load-bearing piers.
  for(const x of [-1.22,1.22])k.box(g,[.32,1.25,.75],[x,4.22,-.2],armor,.05);
  k.box(g,[2.75,.2,.8],[0,4.93,-.2],armor,.07);k.cylinder(g,.48,.75,[0,4.27,-.2],navy);
  for(const y of [4.03,4.25,4.47]){const band=k.ring(g,.52,.07,[0,y,-.2],purple,true);band.rotation.x=Math.PI/2;}
  k.box(g,[2.3,.09,.3],[0,3.86,.69],'#6c82a0',.025);
 }
 const named=new THREE.Group();named.name='research-service-components';g.add(named);for(const child of [...g.children])if(child instanceof THREE.Mesh&&child.name)named.attach(child);g.userData.visualLevel=level;k.batchStatic(door,'research-door-five-'+level);k.batchStatic(g,'research-shell-five-'+level);return g;}

export function animateResearchLab(g:THREE.Object3D|undefined,time:number,active:boolean,reduced:boolean){const core=g?.getObjectByName('research-core');if(core){core.rotation.y=reduced?0:time*.35;core.scale.setScalar(active&&!reduced?1+Math.sin(time*2)*.025:1);}}
