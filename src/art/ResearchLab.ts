import {technologyMaterials,armoredHull} from './TechnologyMaterials';
import {addGenerationEnergy} from './GenerationEnergy';
import * as THREE from 'three';import {WorldKit,palette as C} from './world';
/** Five scientific facilities, each keeping the research displays and instrument core. */
export function researchLabModel(k:WorldKit,level=1){
 level=Math.max(1,Math.min(5,level));const p=technologyMaterials(k,level),g=new THREE.Group();g.name='Research Lab';
 const purple='#aa66da',energy=level===5?'#c57bff':'#3bc9ff',dark='#1b2b3a';
 const box=(s:[number,number,number],pos:[number,number,number],color:string,r=.04,glow=false)=>k.box(g,s,pos,color,r,glow);
 const hull=(w:number,h:number,d:number,pos:[number,number,number],color:string,cut=.12)=>armoredHull(k,g,w,h,d,pos,color,cut);
 box([3.9,.18,2.9],[0,.09,0],p.frame);k.grounding(g,4.6,3.6);
 hull(3.48,1.9,2.35,[0,1.12,0],level===1?p.shell:dark,.15);
 // Separate scientific wing panels with dark structural seams.
 for(const side of [-1,1])for(const z of [-.65,.65]){hull(.16,1.35,1.12,[side*1.77,1.14,z],p.shell,.06);box([.07,.12,.78],[side*1.87,1.53,z],level>=4?energy:purple,.018,true);}
 box([3.6,.20,2.47],[0,2.14,0],p.frame,.06);
 const window=box([2.3,1.2,.045],[-.4,1.2,1.235],'#203e61');window.name='research-window';
 box([2.12,.07,.035],[-.4,1.75,1.27],C.cyan,.015,true);
 for(const x of [-1.05,-.4,.25]){box([.38,.65,.055],[x,1.12,1.285],purple,.04,true);box([.23,.06,.035],[x,1.28,1.327],C.cyan,.01,true);}
 const door=new THREE.Group();door.name='research-door';door.position.set(1.25,0,1.265);g.add(door);k.box(door,[.6,1.4,.055],[0,.93,0],dark,.025);
 for(const x of [-.35,.35])k.box(door,[.085,1.58,.09],[x,.95,-.025],p.frame,.015);
 k.box(door,[.78,.085,.09],[0,1.7,-.025],p.frame,.015);k.box(door,[.035,1.16,.018],[-.25,.96,.04],C.cyan,.008,true);k.box(door,[.1,.065,.04],[.16,.94,.055],p.metal,.012);box([.82,.1,.22],[1.25,.14,1.36],p.shell,.025);
 const deck=box([2.30,.15,2.02],[0,2.31,-.10],p.shell);deck.name='research-roof-deck';
 const core=new THREE.Group();core.name='research-core';core.position.set(-.25,2.67,-.15);g.add(core);
 const experiment=(r:number,h:number)=>{k.cylinder(core,r,h,[0,0,0],purple);const disk=k.cylinder(core,r*.64,h+.035,[0,0,0],C.cyan);for(const y of [-h/2,h/2]){const ring=k.ring(core,r+.02,.045,[0,y,0],p.frame);ring.rotation.x=Math.PI/2;}};
 for(const x of [-1.3,1.3]){const accent=box([.1,.045,2.1],[x,2.365,0],C.cyan,.015,true);accent.name=x<0?'research-roof-accent-left':'research-roof-accent-right';}
 if(level===1){experiment(.32,.30);hull(1.20,.20,1.15,[-.25,2.48,-.15],p.frame,.08);}
 if(level===2){
  // A steel roof bench carries a pair of reaction cells and a diagnostic instrument.
  hull(3.2,.30,2.12,[0,2.55,-.02],p.frame,.16);core.position.set(-.68,2.98,-.15);experiment(.34,.48);
  for(const x of [.50,1.05]){k.cylinder(g,.22,.50,[x,2.97,-.15],purple);for(const y of [2.72,3.23])k.cylinder(g,.26,.08,[x,y,-.15],p.metal);}
  for(const z of [-.8,.75])box([2.78,.16,.19],[0,2.82,z],p.shell);
  for(const x of [-1.62,1.62])hull(.24,1.74,.38,[x,1.2,.95],p.frame,.06);
 }
 if(level===3){
  // Gold-alloy saddle structures support a horizontal linear research instrument.
  hull(3.3,.39,2.22,[0,2.49,-.02],p.shell,.18);core.position.set(0,3.04,-.10);
  const chamber=k.cylinder(g,.34,2.05,[0,3.04,-.10],purple);chamber.rotation.z=Math.PI/2;
  for(const x of [-1.05,-.55,0,.55,1.05]){const hoop=k.ring(g,.38,.065,[x,3.04,-.10],x===0?C.cyan:p.metal,x===0);hoop.rotation.y=Math.PI/2;}
  k.crystal(core,.26,.30,[0,.34,0],C.cyan);
  for(const x of [-1.30,1.30]){hull(.48,.94,1.35,[x,2.92,-.1],p.metal,.15);box([.09,.6,.08],[x,2.98,.62],C.cyan,.015,true);}
  for(const x of [-1.67,1.67]){hull(.26,1.84,.55,[x,1.22,.91],p.metal,.08);hull(.44,.23,.65,[x,2.13,.91],p.metal,.08);}
 }
 if(level===4){
  // Open insulated experimental cradle, visually distinct from a closed storage vault.
  for(const x of [-1.18,1.18]){hull(1.02,.86,2.12,[x,2.72,-.02],p.shell,.24);box([.11,.07,1.75],[x,3.20,-.02],energy,.02,true);}
  core.position.set(0,2.98,-.10);k.crystal(core,.68,.75,[0,-.22,0],purple);
  for(const z of [-.66,.53]){const rim=k.ring(g,.72,.10,[0,3.05,z],p.frame);const field=k.ring(g,.58,.035,[0,3.05,z+.02],energy,true);}
  hull(1.12,.21,1.7,[0,2.53,-.10],p.frame,.07);
  for(const x of [-1.67,1.67]){hull(.28,1.95,.58,[x,1.29,.91],p.shell,.08);box([.12,.95,.05],[x,1.4,1.23],energy,.015,true);}
 }
 if(level===5){
  // A flagship interferometer: paired gold focusing frames around a violet test lattice.
  hull(3.36,.39,2.22,[0,2.51,-.02],p.frame,.20);
  for(const x of [-1.25,1.25]){hull(.80,.88,2.02,[x,2.92,-.02],p.shell,.21);for(const z of [-.80,.78])hull(.85,.28,.30,[x,3.30,z],p.metal,.09);box([.10,.09,1.50],[x,3.43,-.02],energy,.02,true);}
  core.position.set(0,3.08,-.10);k.crystal(core,.85,.95,[0,-.28,0],purple);
  for(const z of [-.70,.57]){const a=k.ring(g,.78,.095,[0,3.13,z],p.metal);const b=k.ring(g,.60,.040,[0,3.13,z+.025],energy,true);}
  const orbit=k.ring(core,.60,.035,[0,.19,0],C.cyan,true);orbit.rotation.x=Math.PI/2;orbit.rotation.z=.25;
  for(const x of [-1.67,1.67]){hull(.30,1.95,.58,[x,1.29,.91],p.metal,.09);box([.13,.95,.055],[x,1.4,1.23],energy,.02,true);}
  box([2.62,.16,.08],[-.25,2.12,1.29],p.metal);core.userData.restScale=1;
 }
 addGenerationEnergy(k,g,level,'lab',[energy]);
 const named=new THREE.Group();named.name='research-service-components';g.add(named);for(const child of [...g.children])if(child instanceof THREE.Mesh&&child.name)named.attach(child);
 g.userData.visualLevel=level;k.batchStatic(core,'research-experiment-generation-'+level);k.batchStatic(door,'research-door-generation-'+level);k.batchStatic(g,'research-shell-generation-'+level);return g;
}
export function animateResearchLab(g:THREE.Object3D|undefined,time:number,active:boolean,reduced:boolean){const core=g?.getObjectByName('research-core');if(core){core.rotation.y=reduced?0:time*.35;core.scale.setScalar((core.userData.restScale??1)*(active&&!reduced?1+Math.sin(time*2)*.025:1));}}
