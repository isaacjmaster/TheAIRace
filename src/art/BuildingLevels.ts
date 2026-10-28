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
  if(level===4){for(const x of [-1.02,1.02]){k.box(g,[.72,.6,1.45],[x,3.68,-.2],navy,.06);k.box(g,[.55,.35,.07],[x,3.7,.57],glow,.025,true);}k.box(g,[.48,.72,2.05],[0,3.74,-.15],metal,.06);}
  if(level===5){for(const x of [-1.35,1.35])k.box(g,[.42,.55,3],[x,4.08,-.1],navy,.07);k.box(g,[3.1,.2,3],[0,4.45,-.1],armor,.07);for(const x of [-.75,0,.75])k.box(g,[.48,.31,1.85],[x,4.1,-.15],metal,.04);k.box(g,[1.5,.08,.48],[0,4.6,-.15],glow,.025,true);}
 }else{
  const height=[1.55,1.9,2.3,2.65,3.05][level-1],radius=level>=3?1.02:.86;
  k.cylinder(g,radius+.2,.2,[0,.4,0],metal);k.cylinder(g,radius,height,[0,.52+height/2,0],navy);
  for(let i=0;i<(level===1?4:6);i++){const a=i*Math.PI*2/(level===1?4:6),pod=k.box(g,[.48,height-.2,.14],[Math.sin(a)*radius,.57+height/2,Math.cos(a)*radius],glow,.035,true);pod.rotation.y=a;}
  for(const y of [.55,height+.58])band(k,g,radius+.08,y,armor,.11);
  k.cylinder(g,radius*.78,.2,[0,height+.76,0],metal);
  if(level>=2)for(const x of [-1.35,1.35]){k.box(g,[.27,height+.25,.55],[x,.5+height/2,0],armor,.05);k.box(g,[.6,.15,.7],[x,height+.7,0],navy,.04);}
  if(level>=3)for(const z of [-1.35,1.35]){k.box(g,[.55,height+.25,.27],[0,.5+height/2,z],armor,.05);k.box(g,[.7,.15,.6],[0,height+.7,z],navy,.04);}
  if(level===4){for(const x of [-1.12,1.12])for(const z of [-1.12,1.12]){k.box(g,[.48,1.15,.48],[x,.98,z],navy,.05);k.box(g,[.25,.84,.06],[x,1.02,z+Math.sign(z)*.26],glow,.015,true);}band(k,g,.75,3.75,armor,.15);k.cylinder(g,.48,.5,[0,3.64,0],navy);}
  if(level===5){const cap=k.boulder(g,[0,3.97,0],[.7,.6,.7],purple,0);for(const x of [-1.32,1.32]){const arch=k.box(g,[.24,1.05,.45],[x,4.0,0],armor,.04);arch.rotation.z=-Math.sign(x)*.27;}k.box(g,[2.45,.18,.5],[0,4.65,0],armor,.05);band(k,g,.82,3.82,glow,.055,true);band(k,g,.82,4.13,navy,.08);}
 }
 k.batchStatic(g,kind+'-five-'+level);k.grounding(g,4,4);return g;
}
/** Floor and exit are invariant. More capable gantries replace the manufacturing crown at each tier. */
function manufacturingModel(k:WorldKit,level:number){
 const g=new THREE.Group(),fixed=new THREE.Group();g.name='Bot Fabricator';g.add(fixed);const armor=armors[level-1],top=[3.35,3.65,3.9,4.15,4.45][level-1];
 k.box(fixed,[3.95,.18,2.95],[0,.09,0],navy,.08);k.box(fixed,[3.7,.12,2.75],[0,.24,0],metal,.06);k.cylinder(fixed,1.02,.18,[0,.42,0],navy);band(k,fixed,.91,.54,C.cyan,.045,true);
 for(const x of [-1.48,1.48]){k.box(fixed,[.3,top-.5,.42],[x,(top+.1)/2,-.98],navy,.04);k.box(fixed,[.44,level>=3?2.3:1.5,.45],[x,level>=3?1.48:1.08,-.98],armor,.06);k.box(fixed,[.09,1,.04],[x,1.4,-.73],C.cyan,.01,true);}
 k.box(fixed,[3.23,.25,.6],[0,top,-.98],armor,.07);
 // Fixed split crown leaves a genuine clearance envelope above the large Breacher.
 const r=level>=3?1.33:1.17;band(k,fixed,r,top,navy,level===1?.12:.17);band(k,fixed,r,top+.15,armor,.07);band(k,fixed,r-.15,top-.12,C.cyan,.025,true);
 const rotor=new THREE.Group();rotor.name='orbital-inner';g.add(rotor);const pulse=band(k,rotor,r-.28,top-.22,C.cyan,.035,true);g.userData.pulse=pulse.material;g.userData.platform=k.mat(C.cyan,true);
 for(let i=0;i<(level<3?2:4);i++){const a=i*Math.PI*2/(level<3?2:4);const tool=k.box(rotor,[.22,.18,.32],[Math.sin(a)*(r-.25),top-.25,Math.cos(a)*(r-.25)],C.gold,.025);tool.rotation.y=a;}
 if(level===2){for(const x of [-1.48,1.48])k.box(fixed,[.65,.35,1.5],[x,top-.5,-.55],metal,.06);k.box(fixed,[2.7,.57,.6],[0,top-.08,-.98],navy,.06);for(const x of [-.8,0,.8])k.box(fixed,[.45,.2,.06],[x,top-.04,-.65],C.cyan,.02,true);}
 if(level>=3){for(const x of [-1.47,1.47]){k.box(fixed,[.5,.48,1.8],[x,top-.35,-.3],armor,.06);k.box(fixed,[.2,.14,1.5],[x,top-.02,-.3],navy,.025);}for(const z of [-.95,.95])k.box(fixed,[1.9,.23,.4],[0,top+.35,z],navy,.04);}
 if(level===4){for(const x of [-1.2,1.2]){const brace=k.box(fixed,[.22,.8,.3],[x,top+.1,-.65],C.gold,.03);brace.rotation.z=-Math.sign(x)*.4;}k.box(fixed,[2.7,.18,.45],[0,top+.55,-.65],armor,.04);}
 if(level===5){for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.sin(a)*1.2,z=Math.cos(a)*1.2;const petal=k.box(fixed,[.65,.36,.48],[x,top+.28,z],armor,.05);petal.rotation.y=a;k.box(fixed,[.15,.14,.15],[x,top+.53,z],C.gold,.02);}band(k,fixed,1.01,top+.57,navy,.09);}
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
 // Wider charging apertures retain the original rear access line; only roofs change.
 const roof=[1.95,2.3,2.65,2.9,3.15][level-1];
 for(const x of [-2,0]){for(const side of [-1,1]){k.box(shell,[.22,roof-.15,.35],[x+side*.82,roof/2+.2,-2.75],navy,.035);k.box(shell,[.24,1.5,.3],[x+side*.82,1.05,-1.78],armor,.04);k.box(shell,[.05,.7,.04],[x+side*.82,1.25,-1.6],C.cyan,.01,true);}k.box(shell,[1.9,.2,1.55],[x,roof,-2.47],armor,.06);k.box(shell,[1.7,1.6,.18],[x,1.08,-3.1],navy,.04);k.box(shell,[1.0,.7,.06],[x,1.12,-2.99],metal,.025);for(const side of [-1,1])k.box(shell,[.08,.85,.05],[x+side*.6,1.18,-2.96],C.cyan,.01,true);}
 if(level>=2){for(const x of [-3.63,3.63])for(const z of [-2.7,2.75]){k.box(shell,[.38,1.8,.38],[x,1.15,z],navy,.045);k.box(shell,[.46,.18,.46],[x,2.12,z],armor,.045);}for(const x of [-2,0])k.box(shell,[1.1,.35,1.2],[x,roof+.27,-2.5],navy,.06);}
 if(level>=3){for(const x of [-3.63,3.63])for(const z of [-2.7,2.75])k.box(shell,[.23,.65,.23],[x,2.46,z],navy,.035);for(const x of [-3.55,3.55]){k.box(shell,[.25,.28,5.7],[x,2.8,0],armor,.04);k.box(shell,[.08,.06,5.2],[x,2.61,0],C.cyan,.01,true);}for(const x of [-2,0])for(const side of [-1,1])k.box(shell,[.2,.37,1.65],[x+side*.75,roof+.25,-2.47],metal,.03);}
 // Right-hand service equipment stays behind the roaming court.
 for(const x of [1.5,3.45])k.box(shell,[.2,2.1,.22],[x,1.3,-2.65],navy,.03);k.box(shell,[2.2,.18,1.3],[2.5,2.45,-2.55],level===1?C.gold:armor,.06);k.box(shell,[1.65,.18,.55],[2.5,.95,-2.85],armor,.04);
 if(level===4){for(const x of [-2,0]){k.box(shell,[1.85,.2,.55],[x,3.48,-2.9],armor,.04);k.box(shell,[.35,.8,.3],[x,3.1,-2.9],metal,.03);}k.box(shell,[1.5,.75,.65],[2.5,2.9,-2.6],navy,.05);for(const x of [2.1,2.5,2.9])k.box(shell,[.24,.4,.05],[x,3,-2.23],C.cyan,.02,true);}
 if(level===5){for(const x of [-3.5,3.5]){k.box(shell,[.36,1.1,.5],[x,3.27,-2.6],navy,.05);k.box(shell,[.55,.22,.65],[x,3.88,-2.6],armor,.04);}k.box(shell,[7.3,.25,.6],[0,3.95,-2.6],armor,.07);for(const x of [-2.5,-.8,.8,2.5]){k.box(shell,[.25,.6,.28],[x,3.55,-2.6],C.gold,.03);k.box(shell,[.7,.25,.45],[x,3.24,-2.6],navy,.04);}for(const x of [-2,0])k.box(shell,[1.6,.16,.4],[x,3.5,-1.8],C.cyan,.03,true);}
 for(const x of [-2.5,2.5]){k.box(shell,[1.85,.5,.24],[x,.48,3.2],navy,.04);k.box(shell,[1.95,.15,.34],[x,.8,3.2],armor,.04);}for(const x of [-.62,.62])for(const z of [1.1,1.65,2.2,2.75])k.box(shell,[.075,.025,.32],[x,.285,z],C.cyan,.01,true);
 k.batchStatic(shell,'depot-five-'+level);return g;
}
function aerialStationModel(k:WorldKit,level:number){
 const g=new THREE.Group();g.name='Security Drone Station';const armor=armors[level-1];k.box(g,[2.95,.18,2.95],[0,.09,0],navy,.08);k.box(g,[2.75,.13,2.75],[0,.28,0],metal,.05);k.box(g,[2.6,.2,2.6],[0,.97,0],armor,.06);k.box(g,[2.25,.06,2.25],[0,1.1,0],navy,.05);band(k,g,.83,1.15,C.cyan,.03,true);
 for(const x of [-1.08,1.08])for(const z of [-1.08,1.08]){k.box(g,[.26,.6,.26],[x,.62,z],navy,.04);k.box(g,[.22,.07,.3],[x,1.17,z],C.cyan,.02,true);}
 if(level>=2){for(const x of [-1.2,1.2]){k.box(g,[.38,1.6,.65],[x,1.1,-1.05],armor,.05);k.box(g,[.24,.32,.05],[x,1.56,-.7],C.cyan,.02,true);}k.box(g,[2.7,.17,.34],[0,1.9,-1.12],metal,.04);}
 if(level>=3){for(const x of [-1.14,1.14])k.box(g,[.2,1.55,.3],[x,1.7,-1.14],armor,.035);k.box(g,[2.55,.26,.5],[0,2.58,-1.14],navy,.05);for(const x of [-.7,0,.7])k.box(g,[.4,.12,.05],[x,2.61,-.86],C.cyan,.02,true);}
 if(level===4){for(const x of [-.85,.85]){k.box(g,[.5,.6,.65],[x,2.99,-1.1],armor,.05);k.box(g,[.35,.3,.06],[x,3.03,-.73],navy,.025);}k.box(g,[.6,.18,.5],[0,2.85,-1.1],C.gold,.03);}
 if(level===5){k.box(g,[2.7,.38,.7],[0,3.03,-1.08],armor,.06);for(const x of [-1.14,1.14]){k.box(g,[.23,.75,.27],[x,2.95,-1.08],navy,.035);k.box(g,[.36,.2,.4],[x,3.4,-1.08],metal,.035);}k.box(g,[1.7,.32,.1],[0,3.07,-.67],navy,.025);for(const x of [-.5,0,.5])k.box(g,[.3,.16,.05],[x,3.09,-.59],C.cyan,.015,true);}
 // The central 2.2-square launch volume remains open at every tier.
 k.batchStatic(g,'aerial-station-five-'+level);return g;
}
function rawModel(k:WorldKit,kind:VisualBuildingKind,level:number){return kind==='rig'||kind==='rig2'?gpuRigModel(k,level):kind==='lab'?researchLabModel(k,level):kind==='fabricator'?manufacturingModel(k,level):kind==='hangar'?depotModel(k,level):kind==='sentinel'?sentinelModel(k,level):kind==='droneStation'?aerialStationModel(k,level):kind==='arcSpire'?arcSpireModel(k,level):builderStationModel(k);}
export function progressionModel(k:WorldKit,kind:VisualBuildingKind,level=1){level=tier(level);if(kind==='hq'){const p=new THREE.Group(),g=founderHQ(k,p,level as 1|2|3|4|5);g.position.set(0,0,0);return g;}if(kind==='computeStorage'||kind==='researchStorage')return storageModel(k,kind,level);if(kind==='wall')return securityWallModel(k,1,1.2,level);const g=rawModel(k,kind,level);g.userData.visualLevel=level;return g;}
