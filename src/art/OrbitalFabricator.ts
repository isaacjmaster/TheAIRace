import * as THREE from 'three';
import {WorldKit,palette as c} from './world';
import {cipherBotModel} from './CipherBot';
import {CAMPUS_BOT_SCALE} from '../../shared/bot-presentation';

const navy='#183345',metal='#39515c';
function ring(k:WorldKit,g:THREE.Object3D,r:number,t:number,y:number,color:string,glow=false){const m=k.ring(g,r,t,[0,y,0],color,glow);m.rotation.x=Math.PI/2;return m;}
function cassette(k:WorldKit,g:THREE.Object3D,outer:number,inner:number,y:number,depth:number,color:string){const shape=new THREE.Shape(),hole=new THREE.Path();for(let i=0;i<=32;i++){const a=i*Math.PI/16;const fn=i?'lineTo':'moveTo';shape[fn](Math.cos(a)*outer,Math.sin(a)*outer);hole[fn](Math.cos(-a)*inner,Math.sin(-a)*inner);}shape.holes.push(hole);const m=k.extrusion(g,`orbital-${outer}-${inner}`,shape,depth,[0,y,0],color);m.rotation.x=Math.PI/2;return m;}
export function orbitalFabricator(k:WorldKit){
 const g=new THREE.Group();g.name='Bot Fabricator';const fixed=new THREE.Group();g.add(fixed);
 k.box(fixed,[4,.2,3],[0,.1,0],c.cream,.1);k.box(fixed,[3.8,.16,2.8],[0,.28,0],navy,.1);
 k.cylinder(fixed,1.12,.18,[0,.45,0],metal);ring(k,fixed,.94,.055,.56,'#3edee9',true);k.cylinder(fixed,.82,.08,[0,.54,0],navy);ring(k,fixed,.61,.025,.59,c.cyan,true);
 // Rear spine carries the heavy canopy; the circular tool head is not a floating ornament.
 for(const x of [-1.25,1.25]){k.box(fixed,[.38,2.65,.5],[x,1.6,-.94],navy,.07);k.box(fixed,[.5,1.7,.42],[x,1.35,-1.03],c.cream,.09);k.box(fixed,[.075,1.15,.04],[x,1.53,-.79],c.cyan,.015,true);const brace=k.box(fixed,[.24,.85,.24],[x*.87,2.7,-.75],c.cream,.04);brace.rotation.z=x<0?-.48:.48;}
 k.box(fixed,[2.8,.3,.55],[0,3.02,-.92],c.cream,.1);
 // Thick layered overhead cassette, with a recessed centre and underside tooling.
 cassette(k,fixed,1.3,.84,3.12,.28,navy);cassette(k,fixed,1.23,.87,2.86,.11,c.cream);ring(k,fixed,1.01,.035,3.135,c.cyan,true);cassette(k,fixed,.82,.59,3.04,.1,metal);k.cylinder(fixed,.56,.10,[0,2.94,0],navy);ring(k,fixed,.48,.025,3.01,c.cyan,true);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;const p=k.box(fixed,[.16,.055,.10],[Math.cos(a)*1.2,3.15,Math.sin(a)*1.2],i%3?metal:c.cream,.012);p.rotation.y=-a;}
 const rotor=new THREE.Group();rotor.name='orbital-inner';g.add(rotor);const pulse=ring(k,rotor,.78,.04,2.77,'#42e8ee',true);g.userData.pulse=pulse.material;g.userData.platform=k.mat('#3edee9',true);for(let i=0;i<4;i++){const a=i*Math.PI/2;const tool=k.box(rotor,[.18,.18,.3],[Math.cos(a)*.77,2.71,Math.sin(a)*.77],c.gold,.03);tool.rotation.y=-a;}
 k.cylinder(fixed,.18,.22,[0,2.73,0],metal);ring(k,fixed,.15,.035,2.6,c.cyan,true);
 for(const side of [-1,1]){
  k.box(fixed,[.55,.5,.55],[side*1.42,.55,.1],metal,.08);
  const arm=new THREE.Group();arm.position.set(side*1.35,.78,-.02);arm.name='orbital-arm-'+side;g.add(arm);
  const shoulder=k.cylinder(arm,.17,.25,[0,0,0],c.gold);shoulder.rotation.z=Math.PI/2;
  const upper=new THREE.Group();upper.rotation.z=side*.5;arm.add(upper);k.box(upper,[.2,.7,.22],[0,.35,0],c.gold,.04);k.box(upper,[.08,.46,.24],[0,.34,0],navy,.02);
  const elbow=new THREE.Group();elbow.position.y=.7;elbow.name='orbital-elbow';upper.add(elbow);elbow.rotation.z=side*.85;k.cylinder(elbow,.16,.2,[0,0,0],metal).rotation.z=Math.PI/2;k.box(elbow,[.16,.6,.18],[0,.3,0],c.cream,.03);k.box(elbow,[.22,.18,.25],[0,.65,0],navy,.03);for(const z of [-.13,.13])k.box(elbow,[.06,.19,.05],[0,.78,z],c.gold,.01);k.box(elbow,[.07,.025,.08],[0,.76,0],c.cyan,.01,true);
 }
 // Side console and low front bumper keep the central bot visible from the game camera.
 k.box(fixed,[.6,.55,.65],[1.58,.6,.9],navy,.06);const console=k.box(fixed,[.52,.65,.13],[1.58,1.13,.85],c.cream,.05);console.rotation.x=-.18;k.box(fixed,[.36,.43,.04],[1.58,1.15,.94],c.cyan,.02,true);for(let i=0;i<3;i++)k.box(fixed,[.28,.035,.04],[1.58,1.03+i*.1,.97],navy,.01);
 for(const x of [-1.35,1.35]){k.box(fixed,[.85,.28,.3],[x,.47,1.22],c.cream,.07);k.box(fixed,[.55,.045,.025],[x,.5,1.38],c.cyan,.01,true);}
 const ramp=k.box(fixed,[1.1,.09,.65],[0,.27,1.17],metal,.025);ramp.rotation.x=.35;for(const x of [-.57,.57]){const rail=k.box(fixed,[.1,.1,.65],[x,.31,1.17],c.gold,.02);rail.rotation.x=.35;}
 for(const x of [-1.65,-1.2]){k.box(fixed,[.34,.3,.4],[x,.47,.95],metal,.035);k.box(fixed,[.08,.32,.42],[x,.47,.95],c.gold,.015);}
 // Segmented assembly rail and tooling stations make the manufacturing floor
 // readable without obscuring the bot or adding dynamic lights.
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,x=Math.cos(a)*1.03,z=Math.sin(a)*1.03;
  const shoe=k.box(fixed,[.24,.13,.2],[x,.63,z],i%2?c.cream:metal,.035);shoe.rotation.y=-a;
  const led=k.box(fixed,[.13,.045,.025],[x,.71,z],c.cyan,.01,true);led.rotation.y=-a;
 }
 for(const side of [-1,1]){
  const brace=k.box(fixed,[.23,.8,.3],[side*1.6,1.05,-.65],metal,.04);brace.rotation.z=side*.28;
  k.box(fixed,[.16,.1,.37],[side*1.59,1.49,-.65],c.gold,.025);
  k.box(fixed,[.09,.36,.06],[side*1.25,1.48,-.69],c.cyan,.01,true);
 }
 // Alternating shell panels emphasize the substantial, stationary tool cassette.
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  const panel=k.box(fixed,[.28,.15,.13],[Math.cos(a)*1.24,2.94,Math.sin(a)*1.24],i%2?metal:c.cream,.025);panel.rotation.y=-a;
 }
 for(const side of [-1,1]){const arrow=k.box(fixed,[.065,.025,.26],[side*.08,.365,1.14],c.cyan,.01,true);arrow.rotation.y=side*.65;}
 k.batchStatic(fixed,'orbital-shell-v2');
 const bot=cipherBotModel(k);bot.name='assembly-bot';bot.scale.setScalar(CAMPUS_BOT_SCALE);bot.position.y=.6;g.add(bot);
 const scan=new THREE.Group();scan.name='orbital-scan';ring(k,scan,.47,.016,0,c.cyan,true);g.add(scan);
 return g;
}
export function animateOrbital(g:THREE.Object3D|undefined,time:number,progress:number,active:boolean,reduced=false){if(!g)return;
 const pulse=g.userData.pulse as THREE.MeshStandardMaterial|undefined,platform=g.userData.platform as THREE.MeshStandardMaterial|undefined;if(pulse)pulse.emissiveIntensity=.58+(reduced?0:Math.sin(time*(active?2:1))*.1);if(platform)platform.emissiveIntensity=active?.65+(reduced?0:Math.sin(time*2)*.1):.48;
 const rotor=g.getObjectByName('orbital-inner');if(rotor)rotor.rotation.y=reduced?0:time*(active?.38:.10);
 const scan=g.getObjectByName('orbital-scan');if(scan){scan.visible=!reduced&&(active||time%12<2);scan.position.y=.65+(Math.sin(time*(active?2:1.2))*.5+.5)*1.05;scan.scale.setScalar(1+(reduced?0:Math.sin(time*2)*.045));}
 for(const side of [-1,1]){const arm=g.getObjectByName('orbital-arm-'+side);if(arm){arm.rotation.y=reduced?0:Math.sin(time*(active?1.7:.5)+side)*.09;const elbow=arm.getObjectByName('orbital-elbow');if(elbow)elbow.rotation.z=side*(.85+(reduced?0:Math.sin(time*(active?2:.6)+side)*.12));}}
 const bot=g.getObjectByName('assembly-bot');if(bot){bot.visible=active&&!g.userData.heavyAssembly;const core=bot.getObjectByName('body-core');if(core)core.visible=progress>.25;bot.scale.setScalar(CAMPUS_BOT_SCALE);}
}
