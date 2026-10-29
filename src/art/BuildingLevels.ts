import * as THREE from 'three';
import {technologyMaterials,armoredHull} from './TechnologyMaterials';
import {addGenerationEnergy} from './GenerationEnergy';
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
const generationGlow=(level:number)=>level===5?'#b66bff':level===4?'#43caff':C.cyan;
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
 level=tier(level);const g=new THREE.Group();g.name=kind;g.userData.visualLevel=level;
 const research=kind==='researchStorage',resource=research?purple:C.cyan,energy=generationGlow(level),p=technologyMaterials(k,level);
 const foundation=k.box(g,[3.8,.18,2.9],[0,.09,0],level===5?p.shell:p.frame,.08);
 if(!research){
  // Exposed startup racks evolve into a secure paired-bank storage vault, never a fan-front GPU.
  const h=[1.65,2.05,2.4,2.65,3.0][level-1],count=level===1?2:level===5?4:3;
  if(level>=2){armoredHull(k,g,3.3,h+.45,2.55,[0,.4+h/2,-.18],p.shell,.22);k.box(g,[2.8,h,.13],[0,.4+h/2,1.12],navy,.04);}
  for(let i=0;i<count;i++){const x=(i-(count-1)/2)*(level===1?1.4:level===5?.64:.88);
   if(level===1)k.box(g,[.92,h,1.55],[x,.35+h/2,-.12],navy,.05);
   for(let j=0;j<4+level;j++){const y=.49+j*(h-.2)/(4+level);k.box(g,[level===5?.52:.72,.17,.12],[x,y,level===1?.72:1.21],level===5?navy:p.frame,.025);k.box(g,[level===5?.36:.51,.035,.035],[x,y+.03,level===1?.80:1.29],resource,.005,true);}
  }
  if(level===2){for(const x of [-1.55,1.55]){k.box(g,[.24,h+.3,2.6],[x,.4+h/2,-.15],p.metal,.05);for(const z of [-.9,.7])k.box(g,[.3,.12,.24],[x,2.34,z],p.frame,.02);}k.box(g,[2.85,.25,2.6],[0,2.61,-.15],p.frame,.06);}
  if(level>=3){for(const x of [-1.5,1.5]){armoredHull(k,g,.48,h+.2,2.75,[x,.45+h/2,-.15],level>=4?p.shell:p.metal,.16);armoredHull(k,g,.64,.34,2.85,[x,.40,-.15],level===5?p.shell:p.frame,.08);k.box(g,[.11,h-.55,.07],[x,.65+h/2,1.28],energy,.015,true);}
   armoredHull(k,g,3.35,.38,2.8,[0,h+.73,-.15],level===5?p.shell:p.metal,.12);k.box(g,[2.62,.16,.2],[0,.57,1.34],p.metal,.03);
  }
  if(level===3){armoredHull(k,g,2.45,.34,2.1,[0,3.30,-.15],p.shell,.12);for(const x of [-.7,0,.7])k.box(g,[.43,.09,1.5],[x,3.51,-.15],p.frame,.02);}
  if(level>=4){
   // Two energy-assisted banks and a recessed data spine replace the conventional cap.
   for(const x of [-.78,.78]){armoredHull(k,g,1.3,.63,2.15,[x,h+1.02,-.15],p.shell,.2);k.box(g,[.78,.12,1.65],[x,h+1.36,-.15],level===5?navy:p.frame,.04);for(const z of [-.68,-.15,.38])k.box(g,[.72,.045,.12],[x,h+1.43,z],energy,.02,true);}
   k.box(g,[.15,.48,1.85],[0,h+.94,-.15],energy,.03,true);
  }
  if(level===5){
   // Dark independent bank enclosures with gold load-bearing posts rather than gold wall sheets.
   for(const x of [-1.5,1.5])for(const z of [-1.38,1.12]){armoredHull(k,g,.25,3.05,.30,[x,1.96,z],p.metal,.07);armoredHull(k,g,.48,.22,.5,[x,3.68,z],p.metal,.07);}
   for(const x of [-.78,.78])for(const z of [-1.0,.70])k.box(g,[1.04,.07,.13],[x,4.05,z],p.metal,.02);
   armoredHull(k,g,.24,2.55,.3,[0,1.93,1.38],p.metal,.06);k.box(g,[.56,.32,.22],[0,1.65,1.53],p.frame,.04);k.box(g,[.3,.09,.03],[0,1.65,1.66],resource,.01,true);}
 }else{
  // Purple is the stored knowledge; the supporting containment hardware follows the generation.
  if(level<=2){const r=level===1?.85:1.1,h=level===1?1.3:1.8;k.cylinder(g,r,h,[0,.45+h/2,0],'#584278');for(const y of [.42,.48+h])k.cylinder(g,r+.14,.22,[0,y,0],p.frame);k.box(g,[.8,h*.72,.08],[0,.48+h/2,r],resource,.06,true);
   if(level===2)for(let i=0;i<4;i++){const a=i*Math.PI/2;armoredHull(k,g,.35,1.95,.4,[Math.sin(a)*1.12,1.42,Math.cos(a)*1.12],p.metal,.1);}if(level===2)band(k,g,1.2,2.46,p.shell,.14);
  }else{
   const h=level===3?2.0:level===4?2.4:2.85,r=level===3?.92:1.03;
   armoredHull(k,g,3.05,.4,2.9,[0,.45,0],level===5?p.shell:p.frame,.18);
   k.cylinder(g,r,h,[0,.66+h/2,0],'#584278');for(const y of [.75,.58+h])band(k,g,r+.11,y,resource,.065,true);
   for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,x=Math.sin(a)*1.28,z=Math.cos(a)*1.28;armoredHull(k,g,.5,h+.28,.5,[x,.62+h/2,z],level===4?p.shell:p.metal,.14);k.box(g,[.12,h-.48,.08],[x,.64+h/2,z+.27],energy,.02,true);}
   for(const z of [-1,1])k.box(g,[1.15,h-.35,.06],[0,.64+h/2,z*1.04],resource,.06,true);
   armoredHull(k,g,3.05,.34,2.9,[0,.78+h,0],level===5?p.shell:p.metal,.12);
   if(level===3){k.cylinder(g,1.06,.22,[0,3.05,0],p.frame);band(k,g,.76,3.19,p.metal,.1);}
   if(level===4){const core=k.boulder(g,[0,1.85,1.1],[.65,.8,.24],'#c496ee',0);core.material=k.mat('#c496ee',true);k.cylinder(g,1.15,.2,[0,3.45,0],p.frame);band(k,g,.88,3.59,energy,.09,true);}
   if(level===5){
    // Faceted pressure shoulders protect the upper memory chamber; its purple front remains exposed.
    armoredHull(k,g,2.6,2.6,.58,[0,2.00,-.88],p.shell,.30);
    for(const x of [-1.10,1.10]){armoredHull(k,g,.62,2.40,1.75,[x,2.10,-.12],p.shell,.24);armoredHull(k,g,.75,.48,1.85,[x,3.41,-.12],p.shell,.18);k.box(g,[.10,1.70,.06],[x,2.15,.79],p.metal,.025);}
    for(const y of [.68,3.66])for(const x of [-1.16,1.16])for(const z of [-1.02,1.02])armoredHull(k,g,.63,.20,.60,[x,y,z],p.metal,.08);
    armoredHull(k,g,2.42,.5,2.25,[0,3.92,0],p.shell,.27);for(const x of [-.65,0,.65]){armoredHull(k,g,.43,.3,1.8,[x,4.29,0],p.metal,.1);k.box(g,[.16,.06,1.25],[x,4.47,0],energy,.02,true);}for(const x of [-.48,.48])k.box(g,[.12,2.2,.13],[x,2.02,1.14],p.metal,.025);}
  }
 }
 // Storage occupies 4 x 3 cells at every tier. Keep its detailed hardware inside
 // that established depth rather than expanding saved occupancy or hiding a gap.
 for(const child of g.children)if(child!==foundation){child.position.z*=.86;child.scale.z*=.86;}
 k.batchStatic(g,kind+'-generation-'+level);addGenerationEnergy(k,g,level,kind,[energy]);k.grounding(g,4,3);return g;
}
/** Floor and exit are invariant. More capable gantries replace the manufacturing crown at each tier. */
function manufacturingModel(k:WorldKit,level:number){
 const g=new THREE.Group(),fixed=new THREE.Group();g.name='Bot Fabricator';g.add(fixed);const p=technologyMaterials(k,level),armor=p.shell,energy=generationGlow(level),top=3.65;
 k.box(fixed,[3.95,.18,2.95],[0,.09,0],navy,.08);k.box(fixed,[3.7,.12,2.75],[0,.24,0],armor,.06);k.cylinder(fixed,1.02,.18,[0,.42,0],navy);band(k,fixed,.91,.54,C.cyan,.045,true);
 const width=level===1?.27:level===2?.42:level===3?.58:.66;
 for(const x of [-1.48,1.48]){const pier=k.box(fixed,[width,top-.5,.63],[x,1.94,-.85],level===3?p.metal:armor,.09);pier.rotation.z=level===3?-Math.sign(x)*.06:0;k.box(fixed,[.09,1.1,.045],[x,1.55,-.51],C.cyan,.012,true);}
 k.box(fixed,[3.25,level===1?.23:.48,.72],[0,top,-.85],armor,.1);
 const r=[1.04,1.16,1.22,1.24,1.25][level-1];
 band(k,fixed,r,top,p.frame,level===1?.09:.16);
 if(level===2){for(const x of [-1.48,1.48]){armoredHull(k,fixed,.7,.5,.92,[x,.65,-.85],p.frame,.12);k.box(fixed,[.3,1.2,.19],[x,2.2,-.47],p.metal,.04);}band(k,fixed,r,top-.16,p.metal,.12);for(const x of [-1.48,1.48])k.cylinder(fixed,.12,1.8,[x,2.1,-.48],p.metal);}
 if(level>=3){
  // Four quadrant tool housings form a manufactured annulus with an unobstructed working aperture.
  for(let i=0;i<4;i++){const a=i*Math.PI/2,part=armoredHull(k,fixed,.9,level===3?.5:.65,.6,[Math.sin(a)*(r-.16),top,Math.cos(a)*(r-.16)],level===3?p.metal:armor,.15);part.rotation.y=a;
   const jaw=k.box(fixed,[.44,.15,.2],[Math.sin(a)*(r-.2),top-.28,Math.cos(a)*(r-.2)],level===3?p.metal:p.glass,.035);jaw.rotation.y=a;}
  band(k,fixed,r,top+.18,p.metal,.07);
 }
 if(level>=4){for(const x of [-1.48,1.48]){k.box(fixed,[.25,2.25,.18],[x,2.06,-.48],p.glass,.04);k.box(fixed,[.06,1.95,.04],[x,2.06,-.36],C.cyan,.01,true);}band(k,fixed,1.08,top-.3,energy,.045,true);}
 if(level===4){
  // Separate focusing heads on pale curved containment rings, clear of the working aperture.
  band(k,fixed,1.21,top+.52,p.shell,.11);for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;const head=armoredHull(k,fixed,.36,.65,.5,[Math.sin(a)*1.12,top+.25,Math.cos(a)*1.12],p.frame,.12);head.rotation.y=a;k.box(fixed,[.12,.4,.12],[Math.sin(a)*1.1,top+.25,Math.cos(a)*1.1],energy,.03,true);}
 }
 if(level===5){
  // Flagship six-sector crown: angled shielded tools around a gold precision bearing.
  band(k,fixed,1.24,top+.43,p.metal,.12);for(let i=0;i<6;i++){const a=i*Math.PI/3,lens=armoredHull(k,fixed,.70,.62,.55,[Math.sin(a)*1.13,top+.40,Math.cos(a)*1.13],p.shell,.18);lens.rotation.y=a;const edge=k.box(fixed,[.43,.10,.08],[Math.sin(a)*1.40,top+.45,Math.cos(a)*1.40],energy,.025,true);edge.rotation.y=a;}
  for(const x of [-1.48,1.48]){armoredHull(k,fixed,.82,.35,.94,[x,2.85,-.85],p.metal,.1);k.box(fixed,[.15,1.45,.08],[x,2.01,-.39],energy,.02,true);}
 }
 const rotor=new THREE.Group();rotor.name='orbital-inner';g.add(rotor);const pulse=band(k,rotor,r-.25,top-.25,energy,.035,true);g.userData.pulse=pulse.material;g.userData.platform=k.mat(C.cyan,true);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,tool=k.box(rotor,[.22,.18,.32],[Math.sin(a)*(r-.25),top-.25,Math.cos(a)*(r-.25)],p.metal,.025);tool.rotation.y=a;}
 for(const side of [-1,1]){
  k.box(fixed,[.48,.5,.58],[side*1.61,.55,.15],armor,.06);const arm=new THREE.Group();arm.name='orbital-arm-'+side;arm.position.set(side*1.55,.8,.12);g.add(arm);const upper=new THREE.Group();upper.rotation.z=side*.45;arm.add(upper);k.box(upper,[.17,.62,.23],[0,.31,0],C.gold,.03);const elbow=new THREE.Group();elbow.name='orbital-elbow';elbow.position.y=.62;elbow.rotation.z=side*.85;upper.add(elbow);k.box(elbow,[.17,.55,.2],[0,.27,0],armor,.025);k.box(elbow,[.28,.16,.28],[0,.62,0],navy,.03);k.box(elbow,[.1,.12,.1],[0,.74,0],C.cyan,.01,true);k.batchStatic(upper,'fabricator-upper-'+level+'-'+side);k.batchStatic(elbow,'fabricator-elbow-'+level+'-'+side);
 }
 for(const x of [-1.35,1.35]){k.box(fixed,[.7,.35,.34],[x,.5,1.24],armor,.05);k.box(fixed,[.46,.06,.04],[x,.53,1.43],C.cyan,.01,true);}
 k.box(fixed,[1.05,.08,.65],[0,.22,1.12],metal,.02);k.box(fixed,[.45,.7,.42],[1.6,.91,.88],navy,.04);k.box(fixed,[.32,.4,.05],[1.6,1.02,1.12],C.cyan,.02,true);
 k.batchStatic(fixed,'manufacturing-generation-'+level);k.batchStatic(rotor,'manufacturing-rotor-'+level);
 const bot=cipherBotModel(k);bot.name='assembly-bot';bot.scale.setScalar(CAMPUS_BOT_SCALE);bot.position.y=.6;g.add(bot);const scan=new THREE.Group();scan.name='orbital-scan';band(k,scan,.47,0,C.cyan,.016,true);g.add(scan);addGenerationEnergy(k,g,level,'fabricator',[energy]);const livePulse=rotor.children.find(o=>o instanceof THREE.Mesh&&o.material instanceof THREE.MeshStandardMaterial&&o.material.color.getHex()===new THREE.Color(energy).getHex()) as THREE.Mesh|undefined;if(livePulse)g.userData.pulse=livePulse.material;return g;
}
/** All added equipment lives at the rear/edges, outside shared resident destinations and front entrance. */
function depotModel(k:WorldKit,level:number){
 const g=new THREE.Group();g.name='Bot Hangar';g.userData.compound=true;const shell=new THREE.Group();shell.name='hangar-structure';g.add(shell);const p=technologyMaterials(k,level),armor=p.shell,energy=generationGlow(level);
 k.box(shell,[7.95,.14,6.95],[0,.07,0],navy,.07);k.box(shell,[7.65,.08,6.65],[0,.18,0],'#809783',.04);
 for(const x of [-2,0,2])for(let z=-2;z<=2;z++)k.box(shell,[1.45,.035,.83],[x,.245,z],z%2?metal:'#65817e',.02);
 // Entire rear facility changes generation; the courtyard has no new posts or roof.
 const rear=p.shell;
 k.box(shell,[7.15,level===1?1.6:2.3,level>=3?.6:.28],[0,level===1?1.12:1.46,-3.05],rear,.07);
 for(const x of [-2,0,2]){
  k.box(shell,[1.52,1.75,.12],[x,1.2,-2.7],navy,.05);
  if(level>=2){armoredHull(k,shell,1.35,1.2,.2,[x,1.22,-2.57],p.frame,.2);k.box(shell,[.8,.4,.06],[x,1.4,-2.43],p.glass,.04);k.box(shell,[.7,.07,.04],[x,1.4,-2.38],C.cyan,.01,true);}
  for(const side of [-1,1]){armoredHull(k,shell,level===1?.18:level===2?.27:.36,1.95,.6,[x+side*.77,1.25,-2.55],p.frame,.08);if(level>=2)k.box(shell,[.1,.85,.07],[x+side*.62,1.2,-2.21],level===2?p.metal:p.glass,.025);}
  if(level===1)k.box(shell,[1.9,.2,1.3],[x,2.28,-2.55],armor,.05);
  if(level===2){k.gable(shell,1.85,.35,1.5,[x,2.65,-2.48],rear);k.box(shell,[1.85,.12,.12],[x,2.64,-1.7],p.metal,.02);}
  if(level===3){
   // Gold portal housings, each with a recessed charging cradle.
   for(const side of [-1,1])armoredHull(k,shell,.36,2.3,1.25,[x+side*.78,1.43,-2.60],p.metal,.13);
   armoredHull(k,shell,2.05,.65,1.8,[x,2.78,-2.46],p.metal,.18);armoredHull(k,shell,1.45,.28,1.35,[x,3.20,-2.46],rear,.10);k.box(shell,[1.6,.12,.08],[x,2.67,-1.53],C.cyan,.025,true);
  }
  if(level>=4){
   armoredHull(k,shell,2.08,.62,1.88,[x,2.87,-2.43],p.shell,.2);
   for(const side of [-1,1]){armoredHull(k,shell,.4,2.45,.82,[x+side*.75,1.47,-2.48],level===5?p.metal:p.shell,.12);k.box(shell,[.10,1.7,.075],[x+side*.75,1.42,-2.03],energy,.02,true);}
   k.box(shell,[1.6,.18,.1],[x,2.72,-1.44],energy,.025,true);
   if(level===4){armoredHull(k,shell,1.5,.45,1.35,[x,3.37,-2.5],p.frame,.15);k.box(shell,[.85,.12,.9],[x,3.65,-2.5],energy,.04,true);}
  }
 }
 if(level>=4)for(const x of [-3.28,3.28]){armoredHull(k,shell,.55,1.8,1.3,[x,1.2,-2.45],p.frame,.15);k.box(shell,[.3,.7,.08],[x,1.45,-1.75],C.cyan,.03,true);}
 if(level===5){
  // A rear maintenance block unifies the bays; all roof machinery stays behind z=-1.45.
  armoredHull(k,shell,7.25,.55,1.85,[0,3.40,-2.46],p.metal,.18);armoredHull(k,shell,6.8,.40,1.65,[0,3.85,-2.46],p.shell,.16);
  for(const x of [-2,0,2]){armoredHull(k,shell,1.55,.28,1.55,[x,4.16,-2.45],p.frame,.1);k.box(shell,[1.05,.075,1.12],[x,4.34,-2.45],energy,.04,true);k.box(shell,[1.45,.08,.1],[x,2.46,-1.44],p.metal,.02);}
 }
 if(level>=2)for(const x of [-2,0,2]){k.box(shell,[1.6,.025,3.4],[x,.285,.25],level===3?'#506a79':level===5?'#9aaeb2':'#748e93',.03);k.box(shell,[.045,.025,2.9],[x-.67,.31,.35],C.cyan,.008,true);}
 for(const x of [-2.5,2.5]){k.box(shell,[1.85,.5,.24],[x,.48,3.2],navy,.04);k.box(shell,[1.95,.15,.34],[x,.8,3.2],armor,.04);}for(const x of [-.62,.62])for(const z of [1.1,1.65,2.2,2.75])k.box(shell,[.075,.025,.32],[x,.285,z],C.cyan,.01,true);
 k.batchStatic(shell,'depot-generation-'+level);addGenerationEnergy(k,g,level,'hangar',[energy]);return g;
}
function aerialStationModel(k:WorldKit,level:number){
 const g=new THREE.Group();g.name='Security Drone Station';const p=technologyMaterials(k,level),energy=generationGlow(level);
 k.box(g,[2.95,.18,2.95],[0,.09,0],p.frame,.08);
 if(level===1){for(const x of [-1.08,1.08])for(const z of [-1.08,1.08])k.box(g,[.25,.7,.25],[x,.58,z],p.frame,.04);}
 else{armoredHull(k,g,2.62,.72,2.62,[0,.6,0],p.shell,.25);for(const x of [-1.13,1.13]){armoredHull(k,g,.3,.6,1.85,[x,.64,0],level>=3?p.metal:p.frame,.10);for(const z of [-.65,0,.65])k.box(g,[.08,.12,.27],[x*1.12,.65,z],p.frame,.02);}}
 // Actual landing plane remains the same height and radius at every generation.
 k.cylinder(g,1.34,.15,[0,.99,0],p.frame);k.cylinder(g,1.04,.055,[0,1.1,0],navy);band(k,g,.83,1.15,C.cyan,.03,true);
 if(level===2){armoredHull(k,g,2.45,.52,.35,[0,1.31,-1.24],p.shell,.12);for(const x of [-.75,0,.75])k.box(g,[.48,.15,.06],[x,1.35,-1.03],C.cyan,.02,true);}
 if(level===3){
  // Gold communications saddle frames the rear of the open pad.
  for(const x of [-1.06,1.06])armoredHull(k,g,.4,1.3,.46,[x,1.28,-1.18],p.metal,.12);
  armoredHull(k,g,2.45,.28,.45,[0,1.98,-1.18],p.metal,.1);k.box(g,[1.65,.22,.08],[0,1.72,-1.0],p.glass,.03);
  k.cylinder(g,.055,.7,[-1.06,2.27,-1.18],p.frame);k.box(g,[.15,.15,.15],[-1.06,2.65,-1.18],C.cyan,.03,true);
 }
 if(level>=4){
  for(const x of [-1.12,1.12]){armoredHull(k,g,.5,1.65,.55,[x,1.46,-1.16],level===5?p.metal:p.shell,.15);k.box(g,[.14,1.18,.08],[x,1.48,-.85],energy,.025,true);armoredHull(k,g,.66,.25,.68,[x,2.38,-1.16],p.frame,.08);k.box(g,[.30,.10,.30],[x,2.57,-1.16],energy,.03,true);}
  armoredHull(k,g,1.65,.5,.45,[0,1.72,-1.24],p.shell,.15);for(const x of [-.48,0,.48])k.box(g,[.32,.20,.06],[x,1.73,-.98],energy,.025,true);
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;const clamp=armoredHull(k,g,.38,.18,.5,[Math.sin(a)*1.22,1.16,Math.cos(a)*1.22],level===5?p.metal:p.shell,.08);clamp.rotation.y=a;}
 }
 if(level===5){armoredHull(k,g,2.7,.3,.62,[0,2.65,-1.16],p.metal,.1);armoredHull(k,g,1.9,.4,.48,[0,2.98,-1.16],p.shell,.12);k.box(g,[1.35,.10,.08],[0,2.98,-.89],energy,.02,true);}
 k.batchStatic(g,'aerial-station-generation-'+level);addGenerationEnergy(k,g,level,'droneStation',[energy]);return g;
}

function rawModel(k:WorldKit,kind:VisualBuildingKind,level:number){return kind==='rig'||kind==='rig2'?gpuRigModel(k,level):kind==='lab'?researchLabModel(k,level):kind==='fabricator'?manufacturingModel(k,level):kind==='hangar'?depotModel(k,level):kind==='sentinel'?sentinelModel(k,level):kind==='droneStation'?aerialStationModel(k,level):kind==='arcSpire'?arcSpireModel(k,level):builderStationModel(k);}
export function progressionModel(k:WorldKit,kind:VisualBuildingKind,level=1){level=tier(level);if(kind==='hq'){const p=new THREE.Group(),g=founderHQ(k,p,level as 1|2|3|4|5);g.position.set(0,0,0);return g;}if(kind==='computeStorage'||kind==='researchStorage')return storageModel(k,kind,level);if(kind==='wall')return securityWallModel(k,1,1.2,level);const g=rawModel(k,kind,level);g.userData.visualLevel=level;return g;}
