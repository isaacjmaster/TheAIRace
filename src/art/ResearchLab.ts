import {technologyMaterials,armoredHull} from './TechnologyMaterials';
import * as THREE from 'three';import {WorldKit,palette as C} from './world';
export function researchLabModel(k:WorldKit,level=1){level=Math.max(1,Math.min(5,level));const p=technologyMaterials(k,level),g=new THREE.Group();g.name='Research Lab';k.box(g,[3.9,.18,2.9],[0,.09,0],'#879b94');k.grounding(g,4.6,3.6);armoredHull(k,g,3.5,1.9,2.4,[0,1.12,0],p.shell,level>=3?.25:.12);k.box(g,[3.65,.28,2.6],[0,2.2,0],C.dark,.1);
 const window=k.box(g,[2.3,1.2,.045],[-.4,1.2,1.235],'#203e61');window.name='research-window';k.box(g,[2.12,.07,.035],[-.4,1.75,1.27],C.cyan,.015,true);for(const x of [-1.05,-.4,.25]){k.box(g,[.38,.65,.055],[x,1.12,1.285],'#8771cf',.04,true);k.box(g,[.23,.06,.035],[x,1.28,1.327],C.cyan,.01,true);}
 const door=new THREE.Group();door.name='research-door';door.position.set(1.25,0,1.265);g.add(door);k.box(door,[.6,1.4,.055],[0,.93,0],C.dark,.025);for(const x of [-.35,.35])k.box(door,[.085,1.58,.09],[x,.95,-.025],C.slate,.015);k.box(door,[.78,.085,.09],[0,1.7,-.025],C.slate,.015);k.box(door,[.035,1.16,.018],[-.25,.96,.04],C.cyan,.008,true);k.box(door,[.1,.065,.04],[.16,.94,.055],C.gold,.012);k.box(g,[.82,.1,.22],[1.25,.14,1.36],C.cream,.025);
 const deck=k.box(g,[1.7,.14,1.5],[-.25,2.41,-.15],C.slate,.04);deck.name='research-roof-deck';const core=new THREE.Group();core.name='research-core';core.position.set(-.25,2.67,-.15);k.cylinder(core,.4,.34,[0,0,0],'#8771cf');k.cylinder(core,.22,.4,[0,.04,0],C.cyan);g.add(core);for(const x of [-1.3,1.3]){const accent=k.box(g,[.1,.045,2.1],[x,2.365,0],C.cyan,.015,true);accent.name=x<0?'research-roof-accent-left':'research-roof-accent-right';}
 const armor=p.shell,navy='#193344',purple='#9855d5';
 if(level===2){armoredHull(k,g,3.4,.42,2.45,[0,2.53,0],p.frame,.13);for(const x of [-1.05,.65]){k.cylinder(g,.35,.5,[x,2.96,-.15],p.metal);k.cylinder(g,.22,.55,[x,3,-.15],purple);}core.position.y=2.98;}
 if(level===3){armoredHull(k,g,3.55,.7,2.45,[0,2.62,0],p.shell,.28);k.box(g,[2.65,.25,.09],[0,2.66,1.25],p.metal,.04);core.position.y=3.07;for(const x of [-1.1,.6]){const hoop=k.ring(g,.47,.08,[x,3.18,-.15],p.metal);hoop.rotation.y=Math.PI/2;}}
 if(level>=4){
  // A split experimental roof exposes a working reaction apparatus between insulated wings.
  for(const x of [-1.14,1.14])armoredHull(k,g,1.12,.78,2.45,[x,2.73,0],armor,.24);
  armoredHull(k,g,1.1,.42,2.15,[0,2.55,0],p.glass,.12);core.position.y=2.98;
  for(const z of [-.72,.62]){const chamber=k.ring(g,.65,.1,[0,3.15,z],p.frame);chamber.rotation.y=0;}
  k.box(g,[2.75,.16,.07],[0,2.32,1.32],p.glass,.035);
 }
 if(level===5){for(const x of [-1.14,1.14]){armoredHull(k,g,.92,.24,2.15,[x,3.24,0],p.glass,.11);k.box(g,[.64,.08,1.85],[x,3.42,0],p.metal,.025);}const halo=k.ring(g,.84,.085,[0,3.18,-.05],p.frame);halo.rotation.x=Math.PI/2;core.scale.setScalar(1.25);core.userData.restScale=1.25;}
 const named=new THREE.Group();named.name='research-service-components';g.add(named);for(const child of [...g.children])if(child instanceof THREE.Mesh&&child.name)named.attach(child);g.userData.visualLevel=level;k.batchStatic(door,'research-door-five-'+level);k.batchStatic(g,'research-shell-five-'+level);return g;}

export function animateResearchLab(g:THREE.Object3D|undefined,time:number,active:boolean,reduced:boolean){const core=g?.getObjectByName('research-core');if(core){core.rotation.y=reduced?0:time*.35;core.scale.setScalar((core.userData.restScale??1)*(active&&!reduced?1+Math.sin(time*2)*.025:1));}}
