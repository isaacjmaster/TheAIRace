import {orbitalFabricator,animateOrbital} from './OrbitalFabricator';
import {hangarCompound,animateCompoundBot} from './HangarCompound';
import {cipherBotModel} from './CipherBot';
import {CAMPUS_BOT_SCALE,hangarBay} from '../../shared/bot-presentation';

import {animateScrapBot,turnScrapBot} from './ScrapBotMotion';

import * as THREE from 'three';

import {WorldKit,palette as c} from './world';

/** Presentation only: shared silhouette, named limbs retained for existing animations. */

export function scrapBotModel(k:WorldKit){return cipherBotModel(k);}
export const fabricatorModel=orbitalFabricator;

export function hangarModel(k:WorldKit,bots:number,expanded:boolean|'compound'=false){
 if(expanded==='compound')return hangarCompound(k,bots);
 const g=new THREE.Group();g.name='Bot Hangar';const shell=new THREE.Group();g.add(shell);shell.name='hangar-structure';if(expanded)shell.scale.set(1.4,1.08,1.4);
 k.box(shell,[4,.22,3],[0,.15,0],c.dark,.12);k.box(shell,[3.88,.12,2.9],[0,.32,0],c.cream,.08);
 // Open four-sided charging pavilion: no opaque rear wall or preferred facade.
 for(const x of [-1.78,1.78])for(const z of [-1.22,1.22]){
  k.box(shell,[.28,1.75,.28],[x,1.26,z],c.dark,.07);
  k.box(shell,[.3,.62,.3],[x,.72,z],c.cream,.06);
  k.box(shell,[.08,.65,.035],[x,1.42,z+Math.sign(z)*.15],c.cyan,.012,true);
  k.box(shell,[.035,.65,.08],[x+Math.sign(x)*.15,1.42,z],c.cyan,.012,true);
  k.box(shell,[.34,.12,.34],[x,2.18,z],c.gold,.035);
 }
 // Segmented perimeter canopy leaves a generous central skylight for visible troops.
 for(const z of [-1.17,1.17]){
  const roof=k.box(shell,[3.8,.18,.62],[0,2.38,z],c.cream,.09);roof.rotation.x=Math.sign(z)*.12;
  k.box(shell,[2.7,.14,.08],[0,2.19,z+Math.sign(z)*.29],c.dark,.035);
  k.box(shell,[.95,.045,.03],[0,2.2,z+Math.sign(z)*.31],c.cyan,.01,true);
  for(const x of [-.24,0,.24])k.box(shell,[.1,.055,.03],[x,2.21,z+Math.sign(z)*.31],c.gold,.01,true);
 }
 for(const x of [-1.56,1.56]){
  const roof=k.box(shell,[.65,.18,1.85],[x,2.38,0],c.slate,.075);roof.rotation.z=-Math.sign(x)*.12;
  k.box(shell,[.08,.14,1.65],[x+Math.sign(x)*.31,2.19,0],c.dark,.025);
  k.box(shell,[.03,.045,.8],[x+Math.sign(x)*.36,2.2,0],c.cyan,.01,true);
 }
 for(let i=0;i<10;i++){const x=-1.46+(i%5)*.73,z=i<5?-.65:.65;
  k.box(shell,[.62,.025,.91],[x,.405,z],c.slate,.04);k.box(shell,[.46,.03,.06],[x,.43,z+.4],c.cyan,.01,true);
  if(i<bots){const bot=scrapBotModel(k);bot.scale.setScalar(CAMPUS_BOT_SCALE);const bay=hangarBay(i,expanded);bot.position.set(...bay);bot.userData.bay=bay;bot.name='docked-bot-'+i;g.add(bot);}
 }
 for(const z of [-1.44,1.44])k.box(shell,[2.8,.06,.08],[0,.4,z],c.cyan,.02,true);
 for(const x of [-1.88,1.88]){
  k.box(shell,[.06,.06,1.7],[x,.4,0],c.cyan,.015,true);
  k.box(shell,[.22,.48,.42],[x,.64,0],c.dark,.04);
  k.box(shell,[.025,.14,.26],[x+Math.sign(x)*.1,.76,0],c.gold,.02,true);
 }
 return g;
}

/** Free permanent worker dock; fits entirely inside the already reserved work area. */

export function builderStationModel(k:WorldKit){

 const g=new THREE.Group();g.name='Builder Station';

 k.box(g,[2.7,.18,1.8],[0,.12,0],c.dark,.13);k.box(g,[2.55,.1,1.7],[0,.26,0],c.cream,.1);

 k.box(g,[1.35,.03,1.1],[0,.33,.13],c.slate,.08);k.box(g,[1,.025,.08],[0,.36,.61],c.cyan,.02,true);

 k.box(g,[2.2,1.55,.2],[0,1.1,-.73],c.dark,.1);

 for(const side of [-1,1]){k.box(g,[.22,1.5,1.6],[side*1.14,1.1,0],c.slate,.06);k.box(g,[.24,.65,.3],[side*1.14,.66,.61],c.cream,.05);}

 const roof=k.box(g,[2.65,.24,1.3],[0,1.97,-.28],c.cream,.14);roof.rotation.x=-.12;

 k.box(g,[.6,.06,.3],[0,2.14,-.28],c.gold,.04);

 k.box(g,[1.15,.06,.04],[0,1.7,-.57],c.gold,.02,true);

 k.box(g,[.45,.64,.4],[-.83,.63,-.35],c.dark,.04);k.box(g,[.22,.12,.03],[-.83,.82,-.12],c.cyan,.02,true);

 for(const x of [.62,.82]){k.box(g,[.07,.4,.07],[x,1.15,-.59],c.slate,.02);k.box(g,[.16,.08,.08],[x,1.35,-.59],c.gold,.02);}

 return g;

}



/** Subtle bay-local motion: never crosses a neighbour's docking space. */

export function animateDockedBot(bot:THREE.Object3D,slot:number,time:number,reduced=false,dt=1/60){

 if(bot.userData.compound){animateCompoundBot(bot,slot,time,reduced,dt);return;}
 const bay=(bot.userData.bay as [number,number,number]|undefined)??hangarBay(slot),phase=time*.8+slot*1.7;

 bot.position.set(...bay);turnScrapBot(bot,reduced?0:Math.sin(phase*.65)*.16,dt,reduced);animateScrapBot(bot,dt,reduced,0,reduced?0:Math.sin(phase*1.3)*.009);

}



export const animateFabricator=animateOrbital;
