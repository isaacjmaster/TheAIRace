import * as THREE from 'three';
import {WorldKit,palette as c} from './world';
import {cipherBotModel} from './CipherBot';
import {animateScrapBot,turnScrapBot} from './ScrapBotMotion';
import {compoundBotPose,compoundBay,COMPOUND_BOT_LIMIT} from '../../shared/hangar-presentation';

const navy='#203746',metal='#48616b';
export function hangarCompound(k:WorldKit,bots:number){
 const g=new THREE.Group();g.name='Bot Hangar';g.userData.compound=true;const shell=new THREE.Group();shell.name='hangar-structure';g.add(shell);
 k.box(shell,[8,.16,7],[0,.08,0],c.cream,.1);k.box(shell,[7.65,.06,6.65],[0,.19,0],'#8ca468',.04);
 // Paved service lanes remain open; vegetation is confined to the edges.
 for(const x of [-2,0,2])for(let z=-2;z<=2;z++)k.box(shell,[1.45,.04,.83],[x,.245,z],z%2?metal:'#728b89',.025);
 for(const x of [-2,0]){
  k.box(shell,[1.85,.15,1.7],[x,.29,-2.35],navy,.06);k.box(shell,[1.8,1.65,.22],[x,1.12,-3.08],navy,.05);
  for(const side of [-1,1]){k.box(shell,[.24,1.85,1.5],[x+side*.8,1.2,-2.45],metal,.05);k.box(shell,[.29,1.7,.3],[x+side*.8,1.2,-1.78],c.cream,.06);k.box(shell,[.045,.92,.035],[x+side*.8,1.3,-1.61],c.cyan,.01,true);}
  k.box(shell,[1.9,.25,1.8],[x,2.23,-2.4],navy,.07);for(const side of [-1,1])k.box(shell,[.28,.32,1.85],[x+side*.82,2.22,-2.4],c.cream,.05);
  for(const z of [-2.9,-2.35,-1.8]){k.box(shell,[1.25,.025,.035],[x,2.365,z],metal,.01);for(const side of [-1,1])k.box(shell,[.065,.03,.065],[x+side*.63,2.38,z],c.gold,.01);}
  k.box(shell,[1.35,.12,.055],[x,2.15,-1.47],c.cyan,.01,true);k.box(shell,[.7,.2,.12],[x,1.65,-2.91],c.gold,.03);
  // Recessed charging hardware frames the resident without blocking the bay exit.
  k.box(shell,[.82,.9,.08],[x,1.01,-2.92],metal,.05);
  for(const side of [-1,1]){
   k.box(shell,[.12,1.12,.06],[x+side*.55,1.03,-2.9],c.cyan,.02,true);
   k.box(shell,[.09,.035,1.35],[x+side*.56,.385,-2.35],c.cyan,.01,true);
   k.box(shell,[.24,.18,.18],[x+side*.8,1.96,-1.6],c.gold,.03);
  }
  const bayRamp=k.box(shell,[1.4,.04,.4],[x,.32,-1.4],metal,.01);bayRamp.rotation.x=.24;
  for(const side of [-1,1]){const arrow=k.box(shell,[.08,.025,.35],[x+side*.12,.39,-1.85],c.cream,.01);arrow.rotation.y=side*.65;}
 }
 // Maintenance canopy on the right, independent of the docking roofs.
 for(const x of [1.45,3.55])for(const z of [-2.9,-1.1]){k.box(shell,[.13,2,.13],[x,1.25,z],navy,.025);k.box(shell,[.25,.2,.25],[x,2.3,z],c.gold,.03);}
 for(const x of [1.97,3.03]){const roof=k.box(shell,[1.13,.08,2.05],[x,2.35,-2],x<2.5?c.cream:c.gold,.025);roof.rotation.z=x<2.5?-.08:.08;}
 k.box(shell,[1.65,.13,.65],[2.5,.95,-2.3],c.cream,.04);for(const x of [1.85,3.15])k.box(shell,[.16,.65,.45],[x,.59,-2.3],navy,.025);
 for(const x of [2,2.5,3]){k.cylinder(shell,.14,.08,[x,1.06,-2.25],metal);k.box(shell,[.08,.03,.2],[x,1.12,-2.25],c.cyan,.01,true);}
 const crate=(x:number,z:number)=>{k.box(shell,[.62,.6,.65],[x,.55,z],metal,.07);k.box(shell,[.66,.1,.68],[x,.86,z],navy,.03);k.box(shell,[.11,.64,.69],[x,.56,z],c.gold,.015);k.box(shell,[.22,.1,.03],[x,.65,z+.36],c.cyan,.01,true);for(const side of [-1,1]){k.box(shell,[.07,.54,.07],[x+side*.25,.55,z+.3],c.cream,.01);k.box(shell,[.2,.035,.02],[x+side*.19,.46,z+.34],navy,.005);}};
 crate(3.35,-.3);crate(-3.35,-1);crate(-3.35,1.8);crate(3.35,1.8);
 for(const x of [-3.6,3.6])for(const z of [-2.9,.5,2.8]){k.box(shell,[.42,.4,.42],[x,.44,z],c.cream,.06);k.box(shell,[.34,1.15,.34],[x,1.15,z],navy,.04);k.box(shell,[.22,.88,.045],[x,1.16,z+.19],c.cyan,.01,true);k.box(shell,[.045,.88,.22],[x+(x<0?.19:-.19),1.16,z],c.cyan,.01,true);k.box(shell,[.43,.18,.43],[x,1.8,z],c.cream,.04);}
 for(const x of [-3.73,3.73])for(const z of [-1.8,1.5]){k.box(shell,[.23,.5,1.2],[x,.5,z],navy,.04);k.box(shell,[.3,.18,1.25],[x,.83,z],c.cream,.05);}
 for(const x of [-2.4,2.4]){k.box(shell,[2,.6,.26],[x,.57,3.18],navy,.05);k.box(shell,[2.05,.18,.34],[x,.94,3.18],c.cream,.05);k.box(shell,[1.1,.07,.035],[x,.65,3.33],c.cyan,.01,true);}
 const ramp=k.box(shell,[1.7,.08,.7],[0,.15,3.08],metal,.025);ramp.rotation.x=.22;for(const x of [-.88,.88]){const rail=k.box(shell,[.12,.1,.7],[x,.19,3.08],c.gold,.02);rail.rotation.x=.22;}
 for(const x of [-3.25,3.25])for(const z of [-2,1,2.8]){const grass=k.box(shell,[.4,.06,.23],[x,.26,z],'#779b58',.025);grass.rotation.y=x+z;}
 // Broken cyan guide strips lead into the open staging court rather than a beacon.
 for(const x of [-.62,.62])for(const z of [1.1,1.65,2.2,2.75])k.box(shell,[.075,.03,.32],[x,.285,z],c.cyan,.012,true);
 for(const x of [-1.05,1.05]){
  k.box(shell,[.28,.5,.38],[x,.48,3.1],navy,.04);
  k.box(shell,[.34,.16,.43],[x,.81,3.1],c.cream,.04);
  k.box(shell,[.16,.3,.035],[x,.48,3.31],c.cyan,.01,true);
 }
 k.batchStatic(shell,'compound-shell-v2');
 const residents:THREE.Group[]=[];
 for(let i=0;i<Math.min(COMPOUND_BOT_LIMIT,bots);i++){const bot=cipherBotModel(k);bot.name='docked-bot-'+i;bot.scale.setScalar(.7);bot.position.set(...compoundBay(i));bot.userData.compound=true;g.add(bot);residents.push(bot);}
 // Animate the existing skeletons, but render repeated parts with shared instanced draws.
 const pieces=new Map<string,{geometry:THREE.BufferGeometry;material:THREE.Material;parts:{mesh:THREE.Mesh;bot:THREE.Group}[]}>();
 for(const bot of residents)bot.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){const key=o.geometry.uuid+o.material.uuid;let entry=pieces.get(key);if(!entry){entry={geometry:o.geometry,material:o.material,parts:[]};pieces.set(key,entry);}entry.parts.push({mesh:o,bot});o.visible=false;}});
 g.userData.residentBatches=[...pieces.values()].map(p=>({mesh:k.instanced(g,p.geometry,p.material,p.parts.length),parts:p.parts}));syncCompoundInstances(g);
 return g;
}
const inverse=new THREE.Matrix4(),instanceMatrix=new THREE.Matrix4();
export function syncCompoundInstances(g:THREE.Object3D|undefined){if(!g?.userData.residentBatches)return;g.updateWorldMatrix(true,true);inverse.copy(g.matrixWorld).invert();for(const batch of g.userData.residentBatches as {mesh:THREE.InstancedMesh;parts:{mesh:THREE.Mesh;bot:THREE.Group}[]}[]){let count=0;for(const p of batch.parts)if(p.bot.visible){instanceMatrix.multiplyMatrices(inverse,p.mesh.matrixWorld);batch.mesh.setMatrixAt(count++,instanceMatrix);}batch.mesh.count=count;batch.mesh.instanceMatrix.needsUpdate=true;}}
export function animateCompoundBot(bot:THREE.Object3D,slot:number,time:number,reduced:boolean,dt:number){
 const pose=compoundBotPose(slot,reduced?0:Math.max(0,time-(bot.userData.arrivalTime??0)));bot.position.set(...pose.position);turnScrapBot(bot,pose.yaw,dt,reduced);animateScrapBot(bot,dt,reduced,0,Math.sin(time*.7+slot)*.005);
}
