import * as THREE from 'three';
import {WorldKit,palette as c} from './world';
/** Shared lightweight robot model for the Hangar, assembly table and raid. */
export function scrapBotModel(k:WorldKit){
 const g=new THREE.Group();g.name='Scrap Bot';
 for(const side of [-1,1]){const leg=k.box(g,[.17,.28,.25],[side*.16,.17,.02],c.dark,.04);leg.name=side<0?'leg-left':'leg-right';
 const arm=k.box(g,[.16,.34,.2],[side*.33,.48,.03],side<0?c.gold:c.coral,.04);arm.name=side<0?'arm-left':'arm-right';}
 k.box(g,[.48,.38,.36],[0,.48,0],c.cyan,.08);
 k.box(g,[.17,.18,.035],[-.08,.48,.2],c.gold,.02);
 k.box(g,[.51,.32,.38],[0,.84,0],c.cream,.09);
 k.box(g,[.39,.15,.04],[0,.84,.21],c.dark,.03);
 for(const x of [-.11,.11])k.box(g,[.06,.06,.025],[x,.85,.24],c.cyan,.01,true);
 k.box(g,[.12,.15,.12],[.2,1.04,-.07],c.gold,.02);return g;
}
export function fabricatorModel(k:WorldKit){
 const g=new THREE.Group();g.name='Bot Fabricator';
 k.box(g,[4,.25,3],[0,.15,0],c.dark,.12);k.box(g,[3.8,.12,2.8],[0,.34,0],c.cream);
 for(const x of [-1.8,1.8]){k.box(g,[.25,2.9,.25],[x,1.7,-1.1],c.slate);k.box(g,[.25,2.9,.25],[x,1.7,1.1],c.slate);}
 k.box(g,[4.2,.3,3.2],[0,3.25,0],c.dark,.12);k.box(g,[2,.13,1.8],[0,3.48,0],c.cyan);
 k.box(g,[3.5,2.5,.2],[0,1.65,-1.2],c.cream);
 k.box(g,[2.3,.3,1.9],[0,.7,.2],c.slate);k.box(g,[1.9,.06,1.6],[0,.9,.2],c.gold);
 const bot=scrapBotModel(k);bot.position.set(0,.94,.2);bot.rotation.y=.25;g.add(bot);
 for(const side of [-1,1]){k.box(g,[.25,1.3,.3],[side*1.25,1.4,.05],c.gold);const arm=k.box(g,[.9,.22,.22],[side*.95,2,.1],c.gold);arm.rotation.z=side*.35;}
 k.box(g,[.8,.8,.5],[1.5,.8,1.1],c.dark);k.box(g,[.6,.4,.03],[1.5,1,1.37],c.cyan,.03,true);
 const lamp=k.box(g,[2.4,.1,.08],[0,2.95,1.65],c.cyan,.02,true);lamp.name='production-light';return g;
}
export function hangarModel(k:WorldKit,bots:number){
 const g=new THREE.Group();g.name='Bot Hangar';k.box(g,[4,.2,3],[0,.14,0],c.dark,.1);k.box(g,[3.8,.08,2.8],[0,.29,0],c.cream);
 for(let i=0;i<10;i++){const x=-1.5+(i%5)*.75,z=i<5?-.65:.65;k.box(g,[.62,.025,.9],[x,.35,z],c.slate,.04);k.box(g,[.5,.03,.08],[x,.38,z+.4],c.cyan,.01,true);
 if(i<bots){const bot=scrapBotModel(k);bot.scale.setScalar(.7);bot.position.set(x,.4,z);g.add(bot);}}
 for(const x of [-1.8,1.8]){k.box(g,[.18,1.5,.18],[x,.95,-1.3],c.slate);k.box(g,[.28,.14,.28],[x,1.75,-1.3],c.gold);}
 k.box(g,[3.8,.3,.18],[0,1.65,-1.3],c.dark);return g;
}
