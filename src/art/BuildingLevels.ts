import * as THREE from 'three';
import {technologyMaterials,armoredHull} from './TechnologyMaterials';
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
 level=tier(level);const g=new THREE.Group();g.name=kind;g.userData.visualLevel=level;const research=kind==='researchStorage',glow=research?purple:C.cyan,p=technologyMaterials(k,level);
 k.box(g,[3.8,.18,3.8],[0,.09,0],p.frame,.08);
 if(!research){
  const height=[1.65,2.05,2.3,2.45,2.6][level-1],count=level===1?2:3;
  // Racks become progressively denser blades inside a complete secure enclosure.
  if(level>=2){armoredHull(k,g,3.45,height+.6,2.5,[0,.4+(height+.6)/2,-.12],p.shell,.25);k.box(g,[2.75,height,.08],[0,.48+height/2,1.17],navy,.08);}
  for(let i=0;i<count;i++){const x=(i-(count-1)/2)*(count===2?1.45:.87);if(level===1)k.box(g,[.85,height,1.55],[x,.3+height/2,-.1],navy,.04);
   for(let j=0;j<level+3;j++){const y=.48+j*(height-.1)/(level+3);k.box(g,[level===1?.75:.73,.2,.14],[x,y,level===1?.73:1.24],level>=4?p.glass:p.frame,.025);k.box(g,[.53,.035,.035],[x,y+.035,level===1?.82:1.33],glow,.005,true);}}
  if(level===2)for(const x of [-1.49,1.49])k.box(g,[.12,height,.12],[x,1.5,1.19],p.metal,.025);
  if(level===3){for(const x of [-1.5,1.5])armoredHull(k,g,.35,2.3,2.5,[x,1.6,0],p.frame,.12);k.box(g,[3.1,.24,.2],[0,.65,1.34],p.metal,.045);k.box(g,[3.1,.2,.2],[0,2.72,1.34],p.metal,.04);}
  if(level>=4){for(const x of [-1.5,1.5]){armoredHull(k,g,.5,2.65,2.7,[x,1.72,0],level===5?p.frame:p.shell,.18);k.box(g,[.16,1.9,.07],[x,1.75,1.42],p.glass,.025);k.box(g,[.045,1.65,.03],[x,1.75,1.47],glow,.006,true);}k.box(g,[2.7,.16,2.1],[0,3.2,-.1],p.frame,.06);}
  if(level===5){armoredHull(k,g,2.4,.46,2.3,[0,3.36,-.1],p.glass,.18);k.box(g,[2.1,.09,2.1],[0,3.61,-.1],p.frame,.03);k.box(g,[.75,.38,.16],[0,.67,1.45],p.metal,.05);}
 }else{
  if(level<=2){const r=level===1?.85:1.12,h=level===1?1.3:1.75;
   k.cylinder(g,r,h,[0,.45+h/2,0],'#584278');for(const y of [.42,.48+h])k.cylinder(g,r+.15,.22,[0,y,0],p.frame);
   for(const x of [-.58,.58])k.box(g,[level===1?.12:.2,h,.17],[x,.45+h/2,.78],level===2?p.metal:p.shell,.035);
   k.box(g,[.9,h*.65,.1],[0,.45+h/2,r],purple,.08,true);
   if(level===2)for(const x of [-1.07,1.07])armoredHull(k,g,.4,1.6,1.55,[x,1.3,0],p.shell,.13);
  }else if(level===3){
   armoredHull(k,g,2.9,2.15,2.5,[0,1.5,0],p.shell,.35);
   k.box(g,[1.8,1.45,.1],[0,1.5,1.28],'#574479',.1);for(const x of [-.56,0,.56])k.box(g,[.3,1.2,.05],[x,1.5,1.35],purple,.03,true);
   for(const y of [.65,2.35])k.box(g,[2.65,.24,.16],[0,y,1.32],p.metal,.04);
  }else{
   // A faceted containment chamber nested between broad pressure caps, not a stretched cylinder.
   armoredHull(k,g,level===5?2.6:2.3,2.1,2.25,[0,1.55,0],level===5?'#7464a1':'#775f9a',.5);
   for(const y of [.43,2.68])armoredHull(k,g,3.1,.35,2.8,[0,y,0],p.frame,.13);
   for(const x of [-1.3,1.3])armoredHull(k,g,.42,2.12,2.38,[x,1.55,0],p.shell,.16);
   const core=k.boulder(g,[0,1.57,1.13],[level===5?.76:.58,.8,.22],level===5?'#d4a9ee':'#b080df',0);core.material=k.mat(level===5?'#d4a9ee':'#b080df',true);
   for(const y of [.73,2.37])k.box(g,[2.4,.1,.08],[0,y,1.23],p.metal,.025);
   if(level===5){for(const x of [-.9,.9]){const rib=k.box(g,[.16,1.7,.16],[x,1.55,1.3],p.frame,.035);rib.rotation.z=-Math.sign(x)*.18;}armoredHull(k,g,2.2,.4,1.95,[0,2.99,0],p.shell,.16);}
  }
 }

 k.batchStatic(g,kind+'-five-'+level);k.grounding(g,4,4);return g;
}
/** Floor and exit are invariant. More capable gantries replace the manufacturing crown at each tier. */
function manufacturingModel(k:WorldKit,level:number){
 const g=new THREE.Group(),fixed=new THREE.Group();g.name='Bot Fabricator';g.add(fixed);const p=technologyMaterials(k,level),armor=p.shell,top=3.65;
 k.box(fixed,[3.95,.18,2.95],[0,.09,0],navy,.08);k.box(fixed,[3.7,.12,2.75],[0,.24,0],armor,.06);k.cylinder(fixed,1.02,.18,[0,.42,0],navy);band(k,fixed,.91,.54,C.cyan,.045,true);
 const width=level===1?.27:level===2?.42:.54;
 for(const x of [-1.48,1.48]){const pier=k.box(fixed,[width,top-.5,.63],[x,1.94,-.85],armor,.09);pier.rotation.z=level===3?-Math.sign(x)*.06:0;k.box(fixed,[.09,1.1,.045],[x,1.55,-.51],C.cyan,.012,true);}
 k.box(fixed,[3.25,level===1?.23:.48,.72],[0,top,-.85],armor,.1);
 const r=[1.04,1.16,1.22,1.24,1.25][level-1];
 band(k,fixed,r,top,p.frame,level===1?.09:.16);
 if(level===2){band(k,fixed,r,top-.16,p.metal,.12);for(const x of [-1.48,1.48])k.cylinder(fixed,.12,1.8,[x,2.1,-.48],p.metal);}
 if(level>=3){
  // Four quadrant tool housings form a manufactured annulus with an unobstructed working aperture.
  for(let i=0;i<4;i++){const a=i*Math.PI/2,part=armoredHull(k,fixed,.9,level===3?.5:.65,.6,[Math.sin(a)*(r-.16),top,Math.cos(a)*(r-.16)],armor,.15);part.rotation.y=a;
   const jaw=k.box(fixed,[.44,.15,.2],[Math.sin(a)*(r-.2),top-.28,Math.cos(a)*(r-.2)],level===3?p.metal:p.glass,.035);jaw.rotation.y=a;}
  band(k,fixed,r,top+.18,p.metal,.07);
 }
 if(level>=4){for(const x of [-1.48,1.48]){k.box(fixed,[.25,2.25,.18],[x,2.06,-.48],p.glass,.04);k.box(fixed,[.06,1.95,.04],[x,2.06,-.36],C.cyan,.01,true);}band(k,fixed,1.08,top-.3,C.cyan,.045,true);}
 if(level===5){for(let i=0;i<8;i++){const a=i*Math.PI/4,lens=armoredHull(k,fixed,.78,.28,.42,[Math.sin(a)*1.08,top+.25,Math.cos(a)*1.08],p.glass,.12);lens.rotation.y=a;}band(k,fixed,1.13,top+.43,p.frame,.09);}
 const rotor=new THREE.Group();rotor.name='orbital-inner';g.add(rotor);const pulse=band(k,rotor,r-.25,top-.25,C.cyan,.035,true);g.userData.pulse=pulse.material;g.userData.platform=k.mat(C.cyan,true);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,tool=k.box(rotor,[.22,.18,.32],[Math.sin(a)*(r-.25),top-.25,Math.cos(a)*(r-.25)],p.metal,.025);tool.rotation.y=a;}
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
 const g=new THREE.Group();g.name='Bot Hangar';g.userData.compound=true;const shell=new THREE.Group();shell.name='hangar-structure';g.add(shell);const p=technologyMaterials(k,level),armor=p.shell;
 k.box(shell,[7.95,.14,6.95],[0,.07,0],navy,.07);k.box(shell,[7.65,.08,6.65],[0,.18,0],'#809783',.04);
 for(const x of [-2,0,2])for(let z=-2;z<=2;z++)k.box(shell,[1.45,.035,.83],[x,.245,z],z%2?metal:'#65817e',.02);
 // Entire rear facility changes generation; the courtyard has no new posts or roof.
 const rear=p.shell,roof=2.75;
 k.box(shell,[7.15,level===1?1.6:2.3,level>=3?.6:.28],[0,level===1?1.12:1.46,-3.05],rear,.07);
 for(const x of [-2,0,2]){
  k.box(shell,[1.52,1.75,.12],[x,1.2,-2.7],navy,.05);
  if(level>=2){armoredHull(k,shell,1.35,1.2,.2,[x,1.22,-2.57],p.frame,.2);k.box(shell,[.8,.4,.06],[x,1.4,-2.43],p.glass,.04);k.box(shell,[.7,.07,.04],[x,1.4,-2.38],C.cyan,.01,true);}
  for(const side of [-1,1]){armoredHull(k,shell,level===1?.18:level===2?.27:.36,1.95,.6,[x+side*.77,1.25,-2.55],p.frame,.08);if(level>=2)k.box(shell,[.1,.85,.07],[x+side*.62,1.2,-2.21],level===2?p.metal:p.glass,.025);}
  if(level===1)k.box(shell,[1.9,.2,1.3],[x,2.28,-2.55],armor,.05);
  if(level===2){k.gable(shell,1.85,.35,1.5,[x,2.65,-2.48],rear);k.box(shell,[1.85,.12,.12],[x,2.64,-1.7],p.metal,.02);}
  if(level===3){armoredHull(k,shell,2.05,.65,1.8,[x,2.78,-2.46],rear,.18);k.box(shell,[1.6,.12,.08],[x,2.67,-1.53],p.metal,.025);}
  if(level>=4){armoredHull(k,shell,2.08,.58,1.88,[x,2.85,-2.43],p.shell,.2);k.box(shell,[1.6,.18,.1],[x,2.72,-1.44],p.glass,.025);}
 }
 if(level>=4)for(const x of [-3.28,3.28]){armoredHull(k,shell,.55,1.8,1.3,[x,1.2,-2.45],p.frame,.15);k.box(shell,[.3,.7,.08],[x,1.45,-1.75],C.cyan,.03,true);}
 if(level===5){armoredHull(k,shell,7.2,.42,1.85,[0,3.29,-2.46],p.frame,.18);for(const x of [-2,0,2]){armoredHull(k,shell,1.55,.22,1.65,[x,3.61,-2.45],p.glass,.1);k.box(shell,[1.45,.08,.1],[x,2.46,-1.44],p.metal,.02);}}
 if(level>=2)for(const x of [-2,0,2]){k.box(shell,[1.6,.025,3.4],[x,.285,.25],level===3?'#506a79':level===5?'#9aaeb2':'#748e93',.03);k.box(shell,[.045,.025,2.9],[x-.67,.31,.35],C.cyan,.008,true);}
 for(const x of [-2.5,2.5]){k.box(shell,[1.85,.5,.24],[x,.48,3.2],navy,.04);k.box(shell,[1.95,.15,.34],[x,.8,3.2],armor,.04);}for(const x of [-.62,.62])for(const z of [1.1,1.65,2.2,2.75])k.box(shell,[.075,.025,.32],[x,.285,z],C.cyan,.01,true);
 k.batchStatic(shell,'depot-five-'+level);return g;
}
function aerialStationModel(k:WorldKit,level:number){
 const g=new THREE.Group();g.name='Security Drone Station';const p=technologyMaterials(k,level),armor=p.shell;
 k.box(g,[2.95,.18,2.95],[0,.09,0],p.frame,.08);
 if(level===1)for(const x of [-1.08,1.08])for(const z of [-1.08,1.08])k.box(g,[.25,.7,.25],[x,.58,z],p.frame,.04);
 else {armoredHull(k,g,2.5,.72,2.5,[0,.6,0],armor,.22);for(const x of [-1,1])k.box(g,[.12,.48,1.6],[x,.62,0],level===2?p.metal:p.frame,.035);}
 k.cylinder(g,1.34,.15,[0,.99,0],p.frame);k.cylinder(g,1.04,.055,[0,1.1,0],navy);band(k,g,.83,1.15,C.cyan,.03,true);
 if(level>=2){armoredHull(k,g,2.5,level>=3?.75:.5,.38,[0,level>=3?1.36:1.23,-1.24],armor,.12);k.box(g,[1.65,.25,.05],[0,1.4,-1.02],p.glass,.04);}
 if(level>=3){for(const z of [-.6,.6]){k.box(g,[1.55,.2,.04],[0,.57,z*2.12],p.metal,.03);}}
 if(level>=4){for(const x of [-1.16,1.16]){k.box(g,[.2,.075,1.6],[x,1.11,0],p.glass,.03);k.box(g,[.045,.035,1.3],[x,1.16,0],C.cyan,.008,true);}}
 if(level===5){armoredHull(k,g,2.6,.3,.4,[0,1.86,-1.23],p.frame,.1);for(const x of [-.8,0,.8])k.box(g,[.5,.2,.05],[x,1.85,-.99],p.glass,.04);}
 k.batchStatic(g,'aerial-station-five-'+level);return g;
}

function rawModel(k:WorldKit,kind:VisualBuildingKind,level:number){return kind==='rig'||kind==='rig2'?gpuRigModel(k,level):kind==='lab'?researchLabModel(k,level):kind==='fabricator'?manufacturingModel(k,level):kind==='hangar'?depotModel(k,level):kind==='sentinel'?sentinelModel(k,level):kind==='droneStation'?aerialStationModel(k,level):kind==='arcSpire'?arcSpireModel(k,level):builderStationModel(k);}
export function progressionModel(k:WorldKit,kind:VisualBuildingKind,level=1){level=tier(level);if(kind==='hq'){const p=new THREE.Group(),g=founderHQ(k,p,level as 1|2|3|4|5);g.position.set(0,0,0);return g;}if(kind==='computeStorage'||kind==='researchStorage')return storageModel(k,kind,level);if(kind==='wall')return securityWallModel(k,1,1.2,level);const g=rawModel(k,kind,level);g.userData.visualLevel=level;return g;}
