import {registerScrapPose,animateScrapBot,turnScrapBot,SCRAP_BOT_VISUAL_SCALE,type BotLeg} from './ScrapBotMotion';
import * as THREE from 'three';
import {WorldKit,palette as c} from './world';
/** Presentation only: shared silhouette, named limbs retained for existing animations. */
export function scrapBotModel(k:WorldKit){
 const g=new THREE.Group();g.name='Scrap Bot';const rig=new THREE.Group(),core=new THREE.Group();rig.name='scrap-rig';core.name='body-core';rig.scale.setScalar(SCRAP_BOT_VISUAL_SCALE);g.add(rig);rig.add(core);const legs:BotLeg[]=[],arms:THREE.Group[]=[];
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.name=side<0?'leg-left':'leg-right';rig.add(leg);
  const upper=k.box(leg,[.13,1,.15],[0,0,0],c.dark,.025),lower=k.box(leg,[.15,1,.17],[0,0,0],c.cream,.025),knee=k.box(leg,[.19,.16,.19],[0,0,0],side<0?c.gold:c.slate,.04),foot=new THREE.Group();foot.name=side<0?'foot-left':'foot-right';leg.add(foot);
  k.box(foot,[.26,.12,.36],[0,.06,.05],c.dark,.035);k.box(foot,[.23,.07,.13],[0,.12,.15],side<0?c.gold:c.cream,.025);k.box(foot,[.12,.025,.025],[0,.16,.21],c.cyan,.01,true);legs.push({group:leg,upper,lower,knee,foot,side});
  const arm=new THREE.Group();arm.position.set(side*.33,.52,0);arm.name=side<0?'arm-left':'arm-right';core.add(arm);arms.push(arm);
  k.box(arm,[.2,.19,.25],[0,.06,0],side<0?c.gold:c.cream,.045);k.box(arm,[.12,.23,.13],[0,-.13,0],c.dark,.025);k.box(arm,[.2,.17,.22],[0,-.26,.04],c.dark,.035);k.box(arm,[.045,.1,.03],[side*.06,-.27,.16],c.cyan,.01);
 }
 k.box(core,[.44,.35,.32],[0,.48,0],c.dark,.06);
 k.box(core,[.38,.23,.09],[0,.52,.18],c.cream,.04);
 k.box(core,[.12,.11,.025],[0,.53,.24],c.gold,.02);
 k.box(core,[.56,.37,.42],[0,.86,0],c.cream,.075);
 k.box(core,[.46,.24,.055],[0,.85,.22],c.dark,.055);
 for(const x of [-.12,.12])k.box(core,[.065,.09,.028],[x,.87,.255],c.cyan,.025,true);
 k.box(core,[.12,.07,.34],[.06,1.075,0],c.gold,.02);
 for(const x of [-.3,.3]){const ear=k.cylinder(core,.095,.06,[x,.86,0],c.dark);ear.rotation.z=Math.PI/2;}
  k.box(core,[.12,.025,.025],[0,.76,.26],c.slate,.01);k.box(core,[.2,.035,.04],[-.06,.63,.24],c.cyan,.01,true);k.box(core,[.05,.1,.05],[.25,1.05,-.08],c.slate,.015);k.box(core,[.075,.05,.075],[.25,1.105,-.08],c.gold,.02);k.batchStatic(core,'scrap-core');for(let i=0;i<arms.length;i++)k.batchStatic(arms[i],'scrap-arm-'+i);registerScrapPose(g,rig,core,legs,arms);return g;
}
export function fabricatorModel(k:WorldKit){
 const g=new THREE.Group();g.name='Bot Fabricator';
 k.box(g,[4,.24,3],[0,.16,0],c.dark,.12);k.box(g,[3.86,.16,2.88],[0,.36,0],c.cream,.1);
 k.box(g,[2.35,.18,2.25],[0,.54,.08],c.dark,.12);
 k.box(g,[2.02,.07,1.95],[0,.67,.08],c.cyan,.08,true);
 k.box(g,[1.74,.09,1.65],[0,.75,.08],c.slate,.08);
 k.cylinder(g,.58,.12,[0,.86,.08],c.dark);k.cylinder(g,.47,.05,[0,.95,.08],c.gold);
 const bot=scrapBotModel(k);bot.position.set(0,.99,.08);bot.name='assembly-bot';g.add(bot);
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
 // Open four-sided charging pavilion: no opaque rear wall or preferred facade.
 for(const x of [-1.78,1.78])for(const z of [-1.22,1.22]){
  k.box(g,[.28,1.75,.28],[x,1.26,z],c.dark,.07);
  k.box(g,[.3,.62,.3],[x,.72,z],c.cream,.06);
  k.box(g,[.08,.65,.035],[x,1.42,z+Math.sign(z)*.15],c.cyan,.012,true);
  k.box(g,[.035,.65,.08],[x+Math.sign(x)*.15,1.42,z],c.cyan,.012,true);
  k.box(g,[.34,.12,.34],[x,2.18,z],c.gold,.035);
 }
 // Segmented perimeter canopy leaves a generous central skylight for visible troops.
 for(const z of [-1.17,1.17]){
  const roof=k.box(g,[3.8,.18,.62],[0,2.38,z],c.cream,.09);roof.rotation.x=Math.sign(z)*.12;
  k.box(g,[2.7,.14,.08],[0,2.19,z+Math.sign(z)*.29],c.dark,.035);
  k.box(g,[.95,.045,.03],[0,2.2,z+Math.sign(z)*.31],c.cyan,.01,true);
  for(const x of [-.24,0,.24])k.box(g,[.1,.055,.03],[x,2.21,z+Math.sign(z)*.31],c.gold,.01,true);
 }
 for(const x of [-1.56,1.56]){
  const roof=k.box(g,[.65,.18,1.85],[x,2.38,0],c.slate,.075);roof.rotation.z=-Math.sign(x)*.12;
  k.box(g,[.08,.14,1.65],[x+Math.sign(x)*.31,2.19,0],c.dark,.025);
  k.box(g,[.03,.045,.8],[x+Math.sign(x)*.36,2.2,0],c.cyan,.01,true);
 }
 for(let i=0;i<10;i++){const x=-1.46+(i%5)*.73,z=i<5?-.65:.65;
  k.box(g,[.62,.025,.91],[x,.405,z],c.slate,.04);k.box(g,[.46,.03,.06],[x,.43,z+.4],c.cyan,.01,true);
  if(i<bots){const bot=scrapBotModel(k);bot.scale.setScalar(.7);bot.position.set(x,.44,z);bot.name='docked-bot-'+i;g.add(bot);}
 }
 for(const z of [-1.44,1.44])k.box(g,[2.8,.06,.08],[0,.4,z],c.cyan,.02,true);
 for(const x of [-1.88,1.88]){
  k.box(g,[.06,.06,1.7],[x,.4,0],c.cyan,.015,true);
  k.box(g,[.22,.48,.42],[x,.64,0],c.dark,.04);
  k.box(g,[.025,.14,.26],[x+Math.sign(x)*.1,.76,0],c.gold,.02,true);
 }
 return g;
}

/** Free permanent worker dock; fits entirely inside the already reserved work area. */
export function builderStationModel(k:WorldKit){
 const g=new THREE.Group();g.name='Builder Station';
 k.box(g,[2.7,.18,1.8],[0,.12,0],c.dark,.13);k.box(g,[2.55,.1,1.7],[0,.26,0],c.cream,.1);
 k.box(g,[1.35,.03,1.1],[0,.33,.13],c.slate,.08);k.box(g,[1,.025,.08],[0,.36,.61],c.cyan,.02,true);
 // Four-sided micro workshop: matching pillars, hip canopy and side tool benches.
 for(const x of [-1.08,1.08])for(const z of [-.64,.64]){
  k.box(g,[.16,1.45,.16],[x,1.06,z],c.slate,.04);
  k.box(g,[.22,.48,.22],[x,.6,z],c.cream,.045);
  k.box(g,[.035,.4,.025],[x+Math.sign(x)*.085,1.2,z],c.cyan,.01,true);
 }
 for(const z of [-.48,.48]){const roof=k.box(g,[2.65,.16,.88],[0,1.94,z],c.cream,.09);roof.rotation.x=Math.sign(z)*.22;k.box(g,[1.15,.07,.04],[0,1.72,z+Math.sign(z)*.38],c.gold,.015,true);}
 k.box(g,[2.45,.12,.2],[0,2.08,0],c.dark,.05);k.box(g,[.48,.08,.32],[0,2.18,0],c.gold,.05);
 for(const x of [-1,1]){
  k.box(g,[.3,.12,.9],[x,.78,0],c.dark,.04);
  k.box(g,[.31,.06,.85],[x,.87,0],c.gold,.025);
  k.box(g,[.05,.32,.24],[x+Math.sign(x)*.12,1.05,-.12],c.slate,.02);
  k.box(g,[.025,.12,.18],[x+Math.sign(x)*.15,1.09,-.12],c.cyan,.01,true);
  for(const z of [-.26,.17]){k.box(g,[.09,.1,.12],[x,.96,z],c.cream,.025);k.box(g,[.05,.25,.05],[x,1.13,z],c.slate,.01);}
 }
 return g;
}

/** Subtle bay-local motion: never crosses a neighbour's docking space. */
export function animateDockedBot(bot:THREE.Object3D,slot:number,time:number,reduced=false,dt=1/60){
 const x=-1.46+(slot%5)*.73,z=slot<5?-.65:.65,phase=time*.8+slot*1.7;
 bot.position.set(x,.44,z);turnScrapBot(bot,reduced?0:Math.sin(phase*.65)*.16,dt,reduced);animateScrapBot(bot,dt,reduced,0,reduced?0:Math.sin(phase*1.3)*.009);
}
