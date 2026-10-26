import * as THREE from 'three';
import {WorldKit,palette as C} from './world';
import {founderHQ} from './FounderHQ';
import {gpuRigModel} from './GpuRig';
import {researchLabModel} from './ResearchLab';
import {fabricatorModel,hangarModel,builderStationModel} from './BotBuildings';
import {droneStationModel} from './DroneStation';
import {sentinelModel} from './SentinelTower';
import {securityWallModel} from './SecurityWalls';
export type VisualBuildingKind='hq'|'rig'|'rig2'|'lab'|'fabricator'|'hangar'|'sentinel'|'droneStation'|'wall'|'station'|'computeStorage'|'researchStorage';
const navy='#183443',metal='#4c6977',ice='#adffff',purple='#9a65e7';
/** Modular, material-batched upgrades; no dynamic lights or per-frame allocations. */
export function applyBuildingLevel(k:WorldKit,g:THREE.Group,kind:string,level:number){
 if(level<2||kind==='hq'||kind==='wall'||kind==='station'||kind.endsWith('Storage'))return g;
 const a=new THREE.Group();a.name='building-level-details';a.userData.level=level;g.add(a);
 const box=(s:[number,number,number],p:[number,number,number],c=navy,glow=false)=>k.box(a,s,p,c,.035,glow);
 const ring=(r:number,y:number,color:string)=>{const m=k.ring(a,r,.045,[0,y,0],color,true);m.rotation.x=Math.PI/2;};
 if(kind==='rig'||kind==='rig2'){
  for(const x of [-2.12,2.12]){box([.3,.45,2.55],[x,2.36,0],C.cream);box([.05,.08,2.28],[x+Math.sign(x)*.16,2.43,0],C.cyan,true);}
  for(const x of [-1.36,0,1.36]){box([1.06,.34,1.65],[x,2.4,-.12],metal);for(let n=0;n<4;n++)box([.9,.055,.13],[x,2.61,-.7+n*.38],navy);}
  if(level>=3){for(const x of [-1.36,0,1.36]){box([.72,.34,1.3],[x,2.81,-.25],navy);box([.6,.06,1.15],[x,3.01,-.25],ice,true);}for(const z of [-1.23,1.23])box([4.3,.14,.15],[0,2.8,z],C.slate);for(const x of [-2.12,2.12])box([.18,.7,.18],[x,2.7,1.15],C.gold);}
 }else if(kind==='lab'){
  for(const x of [-1.65,1.65]){box([.22,1.8,.28],[x,1.25,-1],navy);box([.12,1.4,.06],[x,1.35,-1.17],purple,true);box([.5,.55,.8],[x,2.57,-.65],metal);}
  for(const z of [-.85,.85])box([2.8,.12,.14],[0,2.47,z],purple,true);
  if(level>=3){box([1.55,.2,1.45],[-.25,3.48,-.15],navy);for(const x of [-.87,.37])box([.12,1.05,.12],[x,2.99,-.15],C.cream);const m=k.ring(a,.56,.09,[-.25,3.2,-.15],purple,true);m.rotation.x=Math.PI/2;box([.8,.4,.65],[.5,2.6,.6],navy);box([.65,.26,.05],[.5,2.63,.96],ice,true);}
 }else if(kind==='fabricator'){
  ring(1.34,3.32,C.cyan);for(const x of [-1.65,1.65]){box([.5,1.3,.65],[x,1.06,-.85],C.cream);box([.08,.8,.04],[x,1.1,-.5],C.cyan,true);}
  if(level>=3){ring(1.28,3.62,ice);for(const x of [-1.2,1.2]){box([.2,.55,.22],[x,3.38,-.5],metal);box([.38,.16,.5],[x,3.7,-.5],C.gold);}for(const z of [-1.13,1.13])box([1.8,.14,.2],[0,.4,z],ice,true);}
 }else if(kind==='hangar'){
  const wide=!!g.userData.compound,sx=wide?3.65:1.75,sz=wide?3.05:1.15;
  for(const x of [-sx,sx])for(const z of [-sz,sz]){box([.35,1.4,.35],[x,.95,z],metal);box([.14,.9,.05],[x,1.12,z+Math.sign(z)*.19],C.cyan,true);box([.5,.15,.5],[x,1.7,z],C.cream);}
  if(level>=3){for(const x of [-sx,sx]){box([.28,.22,sz*2],[x,2.65,0],C.cream);box([.06,.08,sz*2-.3],[x,2.51,0],ice,true);for(const z of [-sz,sz])box([.18,1.1,.18],[x,2.15,z],navy);}for(const x of [-.55,.55])box([.09,.04,sz*1.55],[x,.28,0],C.cyan,true);}
 }else if(kind==='sentinel'){
  for(const x of [-1.4,1.4])for(const z of [-1.1,1.1]){box([.65,.52,.62],[x,.72,z],metal);box([.42,.07,.42],[x,1.01,z],'#8cc934');}
  const cannon=g.getObjectByName('sentinel-cannon');if(cannon){const armor=new THREE.Group();armor.name='building-level-cannon';a.userData.attached=armor;cannon.add(armor);for(const x of [-.78,.78]){k.box(armor,[.24,.55,1.25],[x,.25,-.2],navy);k.box(armor,[.07,.07,1.15],[x,.56,-.2],'#baff46',.02,true);}if(level>=3){for(const x of [-.82,.82]){k.box(armor,[.22,.23,1.3],[x,.7,.18],metal);k.box(armor,[.1,.06,1.2],[x,.86,.18],'#baff46',.02,true);}k.box(armor,[.45,.3,.45],[0,.88,-.6],navy);k.box(armor,[.26,.14,.06],[0,.9,-.34],'#eeffc0',.02,true);}k.batchStatic(armor,'elite-cannon-'+level);}
  if(level>=3){ring(1.54,.99,'#baff46');for(const z of [-1.55,1.55])box([1.5,.2,.34],[0,.6,z],C.cream);}
 }else if(kind==='droneStation'){
  for(const x of [-1.22,1.22]){box([.3,.24,2.5],[x,1.17,0],metal);box([.06,.04,2.2],[x,1.31,0],C.cyan,true);}
  box([.5,.85,.6],[1.12,.6,-1.12],navy);box([.3,.3,.04],[1.12,.8,-.79],C.cyan,true);
  if(level>=3){for(const x of [-1.1,1.1]){box([.16,1.8,.16],[x,1.3,-1.1],C.cream);box([.45,.3,.3],[x,2.27,-1.1],navy);box([.32,.1,.04],[x,2.3,-.92],ice,true);}ring(.86,1.19,C.cyan);}
 }
 k.batchStatic(a,'upgrade-'+kind+'-'+level);return g;
}
/** Open server vault versus sealed research memory chamber: production and storage have different silhouettes. */
export function storageModel(k:WorldKit,kind:'computeStorage'|'researchStorage',level=1){
 const g=new THREE.Group();g.name=kind==='computeStorage'?'Compute Storage':'Research Storage';const research=kind==='researchStorage',glow=research?purple:C.cyan;
 k.box(g,[3.8,.22,3.8],[0,.14,0],C.cream,.1);k.box(g,[3.5,.18,3.5],[0,.34,0],navy,.09);
 if(!research){
  for(const x of [-1,0,1]){k.box(g,[.78,1.7,.85],[x,1.3,-.45],metal,.07);for(let y=0;y<4;y++){k.box(g,[.64,.28,.08],[x,.75+y*.36,.02],navy,.025);k.box(g,[.46,.055,.035],[x,.82+y*.36,.07],glow,.01,true);}}
  for(const x of [-1.6,1.6]){k.box(g,[.24,2.35,2.8],[x,1.6,-.1],C.cream);k.box(g,[.08,1.7,.05],[x,1.55,1.34],glow,.015,true);}
  k.box(g,[3.5,.24,2.8],[0,2.83,-.1],navy,.09);k.box(g,[1.6,.045,1.4],[0,2.98,-.1],glow,.035,true);
  k.box(g,[3.1,.7,.2],[0,.83,1.4],metal);k.box(g,[.62,.42,.1],[0,.87,1.54],C.gold);
 }else{
  k.cylinder(g,1.35,.24,[0,.58,0],metal);k.cylinder(g,1.02,1.65,[0,1.5,0],navy);for(let i=0;i<6;i++){const t=i*Math.PI/3;const pod=k.box(g,[.53,1.35,.17],[Math.sin(t)*.99,1.55,Math.cos(t)*.99],glow,.06,true);pod.rotation.y=t;}
  for(const y of [.79,2.24]){const r=k.ring(g,1.08,.13,[0,y,0],C.cream);r.rotation.x=Math.PI/2;}k.cylinder(g,.84,.28,[0,2.5,0],metal);k.cylinder(g,.45,.12,[0,2.7,0],glow);
 }
 if(level>=2){for(const x of [-1.52,1.52])for(const z of [-1.5,1.5]){k.box(g,[.48,1.4,.48],[x,1.1,z],navy);k.box(g,[.12,.85,.035],[x,1.2,z+Math.sign(z)*.25],glow,.02,true);k.box(g,[.54,.14,.54],[x,1.85,z],C.cream);}for(const z of [-1.65,1.65])k.box(g,[2.9,.12,.15],[0,.48,z],glow,.02,true);}
 if(level>=3){for(const x of [-1.5,1.5]){k.box(g,[.32,.2,3.3],[x,3.13,0],C.cream);for(const z of [-1.5,1.5])k.box(g,[.2,1.1,.2],[x,2.4,z],metal);}k.box(g,[3.3,.18,.32],[0,3.13,-1.5],C.gold);if(research){const r=k.ring(g,.75,.07,[0,2.93,0],C.cyan,true);r.rotation.x=Math.PI/2;}else for(const x of [-.85,0,.85])k.box(g,[.5,.3,1.65],[x,3.13,-.1],metal);}
 k.batchStatic(g,kind+'-'+level);k.grounding(g,4,4);return g;
}
export function progressionModel(k:WorldKit,kind:VisualBuildingKind,level:number=1){let g:THREE.Group;if(kind==='hq'){const p=new THREE.Group();g=founderHQ(k,p,Math.max(1,Math.min(3,level)) as 1|2|3);g.position.set(0,0,0);return g;}if(kind==='computeStorage'||kind==='researchStorage')return storageModel(k,kind,level);if(kind==='wall')return securityWallModel(k,1,1.2,level);g=kind==='rig'||kind==='rig2'?gpuRigModel(k):kind==='lab'?researchLabModel(k):kind==='fabricator'?fabricatorModel(k):kind==='hangar'?hangarModel(k,0,'compound'):kind==='sentinel'?sentinelModel(k):kind==='droneStation'?droneStationModel(k):builderStationModel(k);return applyBuildingLevel(k,g,kind,level);}
