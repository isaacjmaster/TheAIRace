import * as THREE from 'three';
import {WorldKit,palette as c} from './world';
/** Presentation only: shared silhouette, named limbs retained for existing animations. */
export function scrapBotModel(k:WorldKit){
 const g=new THREE.Group();g.name='Scrap Bot';
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.17,.18,0);leg.name=side<0?'leg-left':'leg-right';g.add(leg);
  k.box(leg,[.14,.3,.16],[0,0,0],c.dark,.03);k.box(leg,[.23,.12,.32],[0,-.1,.07],c.dark,.035);
  k.box(leg,[.18,.12,.07],[0,.04,.12],c.cream,.025);
  const arm=new THREE.Group();arm.position.set(side*.35,.52,0);arm.name=side<0?'arm-left':'arm-right';g.add(arm);
  k.box(arm,[.22,.19,.25],[0,.06,0],side<0?c.gold:c.cream,.045);
  k.box(arm,[.12,.23,.13],[0,-.13,0],c.dark,.025);
  k.box(arm,[.22,.17,.22],[0,-.26,.04],c.dark,.035);
  k.box(arm,[.045,.1,.03],[side*.06,-.27,.16],c.cyan,.01);
 }
 k.box(g,[.44,.35,.32],[0,.48,0],c.dark,.06);
 k.box(g,[.38,.23,.09],[0,.52,.18],c.cream,.04);
 k.box(g,[.12,.11,.025],[0,.53,.24],c.gold,.02);
 k.box(g,[.56,.37,.42],[0,.86,0],c.cream,.075);
 k.box(g,[.46,.24,.055],[0,.85,.22],c.dark,.055);
 for(const x of [-.12,.12])k.box(g,[.065,.09,.028],[x,.87,.255],c.cyan,.025,true);
 k.box(g,[.12,.07,.34],[.06,1.075,0],c.gold,.02);
 for(const x of [-.3,.3]){const ear=k.cylinder(g,.095,.06,[x,.86,0],c.dark);ear.rotation.z=Math.PI/2;}
 k.box(g,[.12,.025,.025],[0,.76,.26],c.slate,.01);return g;
}
export function fabricatorModel(k:WorldKit){
 const g=new THREE.Group();g.name='Bot Fabricator';
 k.box(g,[4,.24,3],[0,.16,0],c.dark,.12);k.box(g,[3.86,.16,2.88],[0,.36,0],c.cream,.1);
 k.box(g,[2.35,.18,2.25],[0,.54,.08],c.dark,.12);
 k.box(g,[2.02,.07,1.95],[0,.67,.08],c.cyan,.08,true);
 k.box(g,[1.74,.09,1.65],[0,.75,.08],c.slate,.08);
 k.cylinder(g,.58,.12,[0,.86,.08],c.dark);k.cylinder(g,.47,.05,[0,.95,.08],c.gold);
 const bot=scrapBotModel(k);bot.position.set(0,.99,.08);g.add(bot);
 for(const side of [-1,1]){
  k.box(g,[.65,2.35,1.25],[side*1.54,1.6,-.45],c.dark,.12);
  k.box(g,[.68,1.45,.32],[side*1.54,2.1,-1],c.cream,.12);
  k.box(g,[.5,.7,.18],[side*1.54,.97,.24],c.cream,.07);
  k.box(g,[.09,.68,.035],[side*1.54,1,.35],c.cyan,.015,true);
  const shoulder=k.cylinder(g,.22,.32,[side*1.13,2.34,-.2],c.gold);shoulder.rotation.z=Math.PI/2;
  const arm=k.box(g,[.63,.18,.2],[side*.9,2.24,-.18],c.slate,.05);arm.rotation.z=side*.42;
  k.box(g,[.15,.46,.18],[side*.65,1.98,-.18],c.dark,.03);
  k.box(g,[.22,.16,.22],[side*.65,1.7,-.18],c.gold,.035);
  for(const z of [-1.16,1.16])k.box(g,[.3,.12,.24],[side*1.65,.49,z],c.dark,.04);
 }
 k.box(g,[3.9,.5,1.55],[0,2.98,-.44],c.cream,.16);
 k.box(g,[2.45,.26,.12],[0,2.97,.39],c.dark,.05);
 const lamp=k.box(g,[1.3,.08,.04],[0,3,.47],c.cyan,.02,true);lamp.name='production-light';
 k.box(g,[2,.12,.85],[0,3.29,-.45],c.dark,.07);
 for(let i=0;i<4;i++)k.box(g,[1.2,.03,.06],[0,3.37,-.72+i*.16],c.slate,.01);
 k.box(g,[1.5,.07,.45],[0,2.69,-.2],c.gold,.03,true);
 k.box(g,[.56,.5,.3],[1.5,.72,1],c.dark,.07);const screen=k.box(g,[.44,.25,.04],[1.5,.9,1.17],c.cyan,.03,true);screen.rotation.x=-.2;
 return g;
}
export function hangarModel(k:WorldKit,bots:number){
 const g=new THREE.Group();g.name='Bot Hangar';
 k.box(g,[4,.22,3],[0,.15,0],c.dark,.12);k.box(g,[3.88,.12,2.9],[0,.32,0],c.cream,.08);
 k.box(g,[3.7,1.9,.16],[0,1.35,-1.35],c.dark,.05);
 for(const x of [-1.83,1.83]){
  k.box(g,[.3,1.65,2.7],[x,1.18,-.03],c.dark,.09);
  k.box(g,[.32,1.1,.68],[x,1.1,1.02],c.cream,.07);
  k.box(g,[.06,.64,.04],[x,1.2,1.39],c.cyan,.02,true);
 }
 // Segmented barrel canopy over rear docking row; open apron keeps bots legible.
 for(const side of [-1,1]){
  const shoulder=k.box(g,[.9,.2,1.55],[side*1.48,2.12,-.64],c.slate,.06);shoulder.rotation.z=-side*.65;
  const roof=k.box(g,[1.22,.2,1.55],[side*.55,2.46,-.64],c.cream,.06);roof.rotation.z=-side*.12;
  for(const z of [-1.37,-.65,.08]){const seam=k.box(g,[1.22,.035,.04],[side*.55,2.57,z],c.slate,.01);seam.rotation.z=-side*.12;}
 }
 k.box(g,[2.3,.2,.14],[0,2.29,.17],c.dark,.04);k.box(g,[.8,.045,.03],[0,2.3,.25],c.cyan,.01,true);
 k.box(g,[2.7,.08,.06],[0,1.8,-1.24],c.gold,.02,true);
 for(let i=0;i<10;i++){const x=-1.46+(i%5)*.73,z=i<5?-.65:.65;
  k.box(g,[.62,.025,.91],[x,.405,z],c.slate,.04);k.box(g,[.46,.03,.06],[x,.43,z+.4],c.cyan,.01,true);
  if(i<bots){const bot=scrapBotModel(k);bot.scale.setScalar(.7);bot.position.set(x,.44,z);g.add(bot);}
 }
 k.box(g,[2.8,.08,.12],[0,.4,1.44],c.cyan,.02,true);return g;
}
