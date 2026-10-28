import * as THREE from 'three';
import {WorldKit,palette as C} from './world';
import {founderHQ} from './FounderHQ';
import {gpuRigModel} from './GpuRig';
import {researchLabModel} from './ResearchLab';
import {builderStationModel} from './BotBuildings';
import {sentinelModel} from './SentinelTower';
import {arcSpireModel} from './ArcSpire';
import {securityWallModel} from './SecurityWalls';
import {cipherBotModel} from './CipherBot';
import {CAMPUS_BOT_SCALE} from '../../shared/bot-presentation';
export type VisualBuildingKind='hq'|'rig'|'rig2'|'lab'|'fabricator'|'hangar'|'sentinel'|'droneStation'|'arcSpire'|'wall'|'station'|'computeStorage'|'researchStorage';
const navy='#193546',metal='#526e7a',ice='#adffff',purple='#9a65e7';
const tier=(v:number)=>Math.max(1,Math.min(5,Math.floor(v)));
const armors=['#e9e7d8','#b8cdd0','#e4ede8','#a9bdcf','#dce8ef'];
function band(k:WorldKit,g:THREE.Object3D,r:number,y:number,color:string,t=.05,glow=false){const m=k.ring(g,r,t,[0,y,0],color,glow);m.rotation.x=Math.PI/2;return m;}
/** Rebuild only one building's visual subtree. Ownership, transform and resident skeletons remain intact. */
export function applyBuildingLevel(k:WorldKit,g:THREE.Group,kind:string,level:number){
 level=tier(level);if(kind==='hq'||kind==='wall'||kind==='station'||kind.endsWith('Storage'))return g;
 if(!['rig','rig2','lab','fabricator','hangar','sentinel','droneStation','arcSpire'].includes(kind))return g;
 // Resident bots and shared instance batches have their own lifecycle in HeadquartersScene.
 if(kind==='rig'||kind==='rig2')for(const name of ['gpu-fan-0','gpu-fan-1','gpu-fan-2','gpu-power-port','gpu-power-port-left','gpu-activity']){const node=g.getObjectByName(name);if(node&&node.parent!==g)g.attach(node);}
 const keep=g.children.filter(c=>c.name.startsWith('docked-')||c.name.startsWith('assembly-')||c.name.startsWith('gpu-fan-')||c.name.startsWith('gpu-power-port')||c.name==='gpu-activity'||c instanceof THREE.InstancedMesh&&kind==='hangar');
 const residentBatches=g.userData.residentBatches,heavyAssembly=g.userData.heavyAssembly;
 for(const child of [...g.children])if(!keep.includes(child))child.removeFromParent();
 const model=rawModel(k,kind as VisualBuildingKind,level);model.name='building-level-details';model.userData.level=level;
 if(kind==='fabricator'&&keep.some(c=>c.name==='assembly-bot'))model.getObjectByName('assembly-bot')?.removeFromParent();
 if(kind==='rig'||kind==='rig2')for(const node of keep)model.getObjectByName(node.name)?.removeFromParent();
 g.add(model);Object.assign(g.userData,model.userData);g.userData.visualLevel=level;
 if(kind==='hangar'){g.userData.compound=true;if(residentBatches)g.userData.residentBatches=residentBatches;}
 if(heavyAssembly!==undefined)g.userData.heavyAssembly=heavyAssembly;
 return g;
}
/** Open modular server vault versus ring-framed knowledge chamber. Five architectural generations. */
export function storageModel(k:WorldKit,kind:'computeStorage'|'researchStorage',level=1){
 level=tier(level);const g=new THREE.Group();g.name=kind;g.userData.visualLevel=level;const research=kind==='researchStorage',glow=research?purple:C.cyan,armor=armors[level-1];
 k.box(g,[3.8,.18,3.8],[0,.09,0],navy,.08);k.box(g,[3.5,.1,3.5],[0,.23,0],metal,.05);
 if(!research){
  const count=level===1?2:3,height=[1.65,2.05,2.45,2.75,3.15][level-1];
  for(let i=0;i<count;i++){const x=(i-(count-1)/2)*(count===2?1.45:1.02);k.box(g,[.82,height,1.5],[x,.34+height/2,-.35],navy,.06);for(let y=0;y<level+3;y++){const cy=.57+y*(height-.24)/(level+3);k.box(g,[.69,.24,.12],[x,cy,.45],metal,.025);k.box(g,[.5,.045,.035],[x,cy+.04,.53],glow,.01,true);}}
  // L2 side locking ribs, L3 enclosing vault arch, L4 split service cabinets, L5 double-wall secure crown.
  if(level>=2)for(const x of [-1.57,1.57]){k.box(g,[.25,height+.35,2.55],[x,.43+height/2,-.1],armor,.06);k.box(g,[.08,.8,.07],[x,1.13,1.23],glow,.015,true);}
  if(level>=3){k.box(g,[3.5,.28,2.75],[0,height+.67,-.1],armor,.07);k.box(g,[2.3,.48,.32],[0,.67,1.4],navy,.05);k.box(g,[.6,.3,.1],[0,.69,1.62],C.gold,.03);}
  if(level===4){k.box(g,[3.45,.42,2.65],[0,height+.92,-.1],navy,.12);for(const x of [-1,0,1])k.box(g,[.6,.12,.04],[x,height+.92,1.25],glow,.02,true);}
  if(level===5){k.box(g,[3.5,.44,2.8],[0,height+.93,-.1],navy,.14);k.box(g,[3.2,.14,2.6],[0,height+1.2,-.1],armor,.07);k.box(g,[2.4,.06,.04],[0,height+.93,1.33],glow,.02,true);}

 }else{
  // Five complete containment vessels, with constant low centres of gravity.
  const shells=['#b7bbc5','#68748f','#24324c','#dcdfe8','#27304a'],shell=shells[level-1];
  if(level===1){k.cylinder(g,1.03,1.35,[0,1.05,0],navy);for(const y of [.4,1.7])band(k,g,1.06,y,'#bcc6cc',.13);for(const x of [-.55,0,.55])k.box(g,[.34,1.03,.12],[x,1.07,.98],purple,.045,true);}
  if(level===2){for(const x of [-.62,.62]){k.cylinder(g,.65,1.65,[x,1.18,0],navy);k.box(g,[.73,1.18,.13],[x,1.18,.61],purple,.06,true);k.cylinder(g,.7,.22,[x,2.08,0],shell);}k.box(g,[2.75,.24,1.8],[0,.43,0],shell,.1);}
  if(level===3){k.box(g,[2.8,1.85,2.1],[0,1.35,0],shell,.2);k.box(g,[2.26,1.2,.12],[0,1.4,1.09],navy,.1);for(const x of [-.65,0,.65])k.box(g,[.46,.94,.07],[x,1.4,1.17],purple,.06,true);k.box(g,[2.95,.25,2.25],[0,2.4,0],'#65708c',.1);}
  if(level===4){k.cylinder(g,1.4,1.9,[0,1.4,0],navy);for(const x of [-1.15,1.15]){const cheek=k.box(g,[.68,1.9,2.05],[x,1.35,0],shell,.18);cheek.rotation.z=-Math.sign(x)*.1;}k.box(g,[1.5,1.3,.15],[0,1.42,1.28],purple,.12,true);k.cylinder(g,1.38,.25,[0,2.42,0],shell);}
  if(level===5){k.box(g,[3.1,2.05,2.55],[0,1.42,0],shell,.25);for(const x of [-1.27,1.27])k.box(g,[.32,1.8,2.57],[x,1.4,0],'#bcc8d3',.1);k.box(g,[1.7,1.26,.13],[0,1.5,1.33],purple,.2,true);k.box(g,[1.4,.1,.05],[0,1.5,1.42],'#d9c5ef',.03);k.box(g,[2.6,.25,2.3],[0,2.6,0],'#b7c7cf',.12);}
 }

 k.batchStatic(g,kind+'-five-'+level);k.grounding(g,4,4);return g;
}
/** Floor and exit are invariant. More capable gantries replace the manufacturing crown at each tier. */
function manufacturingModel(k:WorldKit,level:number){
 const g=new THREE.Group(),fixed=new THREE.Group();g.name='Bot Fabricator';g.add(fixed);const armor=['#e8e4d3','#7893a0','#233c52','#d5e3df','#bec9d3'][level-1],top=3.65;
 k.box(fixed,[3.95,.18,2.95],[0,.09,0],navy,.08);k.box(fixed,[3.7,.12,2.75],[0,.24,0],armor,.06);k.cylinder(fixed,1.02,.18,[0,.42,0],navy);band(k,fixed,.91,.54,C.cyan,.045,true);
 const width=level===1?.27:level===2?.42:.54;
 for(const x of [-1.48,1.48]){const pier=k.box(fixed,[width,top-.5,.63],[x,1.94,-.85],armor,.09);pier.rotation.z=level===3?-Math.sign(x)*.06:0;k.box(fixed,[.09,1.1,.045],[x,1.55,-.51],C.cyan,.012,true);}
 k.box(fixed,[3.25,level===1?.23:.48,.72],[0,top,-.85],armor,.1);
 const r=[1.14,1.19,1.23,1.21,1.22][level-1];band(k,fixed,r,top,level===1||level===4?armor:navy,level===1?.11:.24);
 if(level===2)band(k,fixed,r,top+.17,armor,.14);
 if(level===3){for(const z of [-.9,.9])k.box(fixed,[1.75,.45,.6],[0,top,z],armor,.12);}
 if(level===4){band(k,fixed,r,top+.22,navy,.08);for(const x of [-1.48,1.48])k.box(fixed,[.62,.6,.8],[x,top-.35,-.85],armor,.1);}
 if(level===5){band(k,fixed,r,top+.12,armor,.25);band(k,fixed,r-.09,top-.17,navy,.16);k.box(fixed,[2.65,.23,.88],[0,top+.26,-.78],navy,.09);}
 const rotor=new THREE.Group();rotor.name='orbital-inner';g.add(rotor);const pulse=band(k,rotor,r-.25,top-.25,C.cyan,.035,true);g.userData.pulse=pulse.material;g.userData.platform=k.mat(C.cyan,true);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,tool=k.box(rotor,[.22,.18,.32],[Math.sin(a)*(r-.25),top-.25,Math.cos(a)*(r-.25)],C.gold,.025);tool.rotation.y=a;}
 for(const side of [-1,1]){
  k.box(fixed,[.48,.5,.58],[side*1.61,.55,.15],armor,.06);const arm=new THREE.Group();arm.name='orbital-arm-'+side;arm.position.set(side*1.55,.8,.12);g.add(arm);const upper=new THREE.Group();upper.rotation.z=side*.45;arm.add(upper);k.box(upper,[.17,.62,.23],[0,.31,0],C.gold,.03);const elbow=new THREE.Group();elbow.name='orbital-elbow';elbow.position.y=.62;elbow.rotation.z=side*.85;upper.add(elbow);k.box(elbow,[.17,.55,.2],[0,.27,0],armor,.025);k.box(elbow,[.28,.16,.28],[0,.62,0],navy,.03);k.box(elbow,[.1,.12,.1],[0,.74,0],C.cyan,.01,true);k.batchStatic(upper,'fabricator-upper-'+level+'-'+side);k.batchStatic(elbow,'fabricator-elbow-'+level+'-'+side);
 }
 for(const x of [-1.35,1.35]){k.box(fixed,[.7,.35,.34],[x,.5,1.24],armor,.05);k.box(fixed,[.46,.06,.04],[x,.53,1.43],C.cyan,.01,true);}
 k.box(fixed,[1.05,.08,.65],[0,.22,1.12],metal,.02);k.box(fixed,[.45,.7,.42],[1.6,.91,.88],navy,.04);k.box(fixed,[.32,.4,.05],[1.6,1.02,1.12],C.cyan,.02,true);
 k.batchStatic(fixed,'manufacturing-five-'+level);k.batchStatic(rotor,'manufacturing-rotor-'+level);
 const bot=cipherBotModel(k);bot.name='assembly-bot';bot.scale.setScalar(CAMPUS_BOT_SCALE);bot.position.y=.6;g.add(bot);const scan=new THREE.Group();scan.name='orbital-scan';band(k,scan,.47,0,C.cyan,.016,true);g.add(scan);return g;
}
/** All added equipment lives at the rear/edges, outside shared resident destinations and front entrance. */
function depotModel(k:WorldKit,level:number){
 const g=new THREE.Group();g.name='Bot Hangar';g.userData.compound=true;const shell=new THREE.Group();shell.name='hangar-structure';g.add(shell);const armor=armors[level-1];
 k.box(shell,[7.95,.14,6.95],[0,.07,0],navy,.07);k.box(shell,[7.65,.08,6.65],[0,.18,0],'#809783',.04);
 for(const x of [-2,0,2])for(let z=-2;z<=2;z++)k.box(shell,[1.45,.035,.83],[x,.245,z],z%2?metal:'#65817e',.02);
 // Entire rear facility changes generation; the courtyard has no new posts or roof.
 const rear=['#e5e4d5','#718d98','#24445a','#d5e1df','#253c52'][level-1],roof=2.75;
 k.box(shell,[7.15,level===1?1.6:2.3,.28],[0,level===1?1.12:1.46,-3.12],rear,.07);
 for(const x of [-2,0,2]){
  k.box(shell,[1.52,1.75,.12],[x,1.2,-2.9],navy,.05);k.box(shell,[1.14,1.14,.06],[x,1.17,-2.81],metal,.04);
  for(const side of [-1,1]){k.box(shell,[.18,1.95,.3],[x+side*.77,1.25,-2.66],level>=4?'#c1d5d9':rear,.035);k.box(shell,[.045,.85,.035],[x+side*.63,1.2,-2.74],C.cyan,.01,true);}
  if(level===1)k.box(shell,[1.9,.2,1.3],[x,2.28,-2.55],armor,.05);
  if(level===2)k.gable(shell,1.85,.35,1.5,[x,2.65,-2.48],rear);
  if(level===3){const canopy=k.box(shell,[2,.25,1.8],[x,roof,-2.46],rear,.08);canopy.rotation.x=.12;}
  if(level===4){const canopy=k.box(shell,[2.15,.3,1.7],[x,2.9,-2.45],rear,.12);canopy.rotation.z=x===0?0:-Math.sign(x)*.07;}
 }
 if(level===5){k.box(shell,[7.2,.35,1.65],[0,2.93,-2.49],'#c6d6db',.13);k.box(shell,[6.5,.16,1.2],[0,3.17,-2.55],navy,.06);k.box(shell,[5.6,.08,.06],[0,2.76,-1.64],C.cyan,.02,true);}
 if(level>=2)for(const x of [-2,0,2]){k.box(shell,[1.6,.025,3.4],[x,.285,.25],level===3?'#506a79':level===5?'#9aaeb2':'#748e93',.03);k.box(shell,[.045,.025,2.9],[x-.67,.31,.35],C.cyan,.008,true);}
 for(const x of [-2.5,2.5]){k.box(shell,[1.85,.5,.24],[x,.48,3.2],navy,.04);k.box(shell,[1.95,.15,.34],[x,.8,3.2],armor,.04);}for(const x of [-.62,.62])for(const z of [1.1,1.65,2.2,2.75])k.box(shell,[.075,.025,.32],[x,.285,z],C.cyan,.01,true);
 k.batchStatic(shell,'depot-five-'+level);return g;
}
function aerialStationModel(k:WorldKit,level:number){
 const g=new THREE.Group();g.name='Security Drone Station';const armor=['#dbdece','#758e9a','#263e57','#e1e7df','#abc0ca'][level-1];
 k.box(g,[2.95,.18,2.95],[0,.09,0],navy,.08);
 // Landing plane remains at 1.1; all control equipment is below it or behind the pad.
 if(level===1)for(const x of [-1.08,1.08])for(const z of [-1.08,1.08])k.box(g,[.25,.7,.25],[x,.58,z],navy,.04);
 else if(level===2)k.cylinder(g,1.16,.7,[0,.57,0],armor);
 else k.box(g,[level===4?2.5:2.3,.7,2.3],[0,.57,0],armor,.18);
 if(level===3)k.cylinder(g,1.4,.2,[0,.98,0],armor);else k.box(g,[2.7,.2,2.7],[0,.98,0],armor,.12);
 k.cylinder(g,1.05,.055,[0,1.1,0],navy);band(k,g,.83,1.15,C.cyan,.03,true);
 if(level>=2){k.box(g,[level===5?2.6:1.8,level===3?.85:.55,.38],[0,level===3?1.45:1.3,-1.25],armor,.09);k.box(g,[1.25,.22,.05],[0,1.38,-1.03],navy,.04);for(const x of [-.4,0,.4])k.box(g,[.2,.09,.025],[x,1.4,-.99],C.cyan,.01,true);}
 k.batchStatic(g,'aerial-station-five-'+level);return g;
}

function rawModel(k:WorldKit,kind:VisualBuildingKind,level:number){return kind==='rig'||kind==='rig2'?gpuRigModel(k,level):kind==='lab'?researchLabModel(k,level):kind==='fabricator'?manufacturingModel(k,level):kind==='hangar'?depotModel(k,level):kind==='sentinel'?sentinelModel(k,level):kind==='droneStation'?aerialStationModel(k,level):kind==='arcSpire'?arcSpireModel(k,level):builderStationModel(k);}
export function progressionModel(k:WorldKit,kind:VisualBuildingKind,level=1){level=tier(level);if(kind==='hq'){const p=new THREE.Group(),g=founderHQ(k,p,level as 1|2|3|4|5);g.position.set(0,0,0);return g;}if(kind==='computeStorage'||kind==='researchStorage')return storageModel(k,kind,level);if(kind==='wall')return securityWallModel(k,1,1.2,level);const g=rawModel(k,kind,level);g.userData.visualLevel=level;return g;}
