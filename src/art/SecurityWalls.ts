import * as THREE from 'three';
import {WorldKit} from './world';
import {armoredHull} from './TechnologyMaterials';
import type {SecurityBarrier} from '../../shared/security-walls';
const tier=(n:number)=>Math.max(1,Math.min(5,Math.trunc(n)));
const HEIGHT=[1,1.04,1.08,1.09,1.12];
/** Barrier height is independent of the decorative mounted crystal. No collision changes. */
export const wallVisualHeight=(level:number,height=1.2)=>height*HEIGHT[tier(level)-1];
const BASE='#202833',GOLD='#d99a35',GOLD_TOP='#ffe096';
const RECIPES=[
 {armor:'#c8b6a3',cap:'#e0cbb5',post:'#bcaa99',energy:'#19d9ef'},
 {armor:'#92949f',cap:'#b9b8c2',post:'#4b4d5b',energy:'#19d9ef'},
 {armor:'#ddd1bc',cap:'#f0e3cd',post:GOLD,energy:'#19d9ef'},
 {armor:'#2863dc',cap:'#6da8ff',post:'#444c63',energy:'#20c9ff'},
 {armor:'#d8d8d5',cap:'#efeeea',post:'#252b45',energy:'#a841ff'},
] as const;
type Clock={time:{value:number};motion:{value:number}};
const clocks=new WeakMap<WorldKit,Clock>();
function clock(k:WorldKit){let c=clocks.get(k);if(!c){c={time:{value:0},motion:{value:1}};clocks.set(k,c);}return c;}
export function updateWallEnergy(k:WorldKit,timeSeconds:number,reduced=false){const c=clock(k);c.time.value=Number.isFinite(timeSeconds)?timeSeconds:0;c.motion.value=reduced?0:1;}
/** Shared opaque emissive surfaces: no lights, particles, per-cell updates or transparency. */
function energy(k:WorldKit,color:string,level:number,crystal=false){
 const m=k.mat(color,true) as THREE.MeshStandardMaterial;
 m.roughness=crystal?.23:.38;m.metalness=crystal?.26:.12;m.emissiveIntensity=crystal?.24:.55;
 if(level>=4&&!m.userData.wallEnergy){
  m.userData.wallEnergy=true;const c=clock(k);
  m.onBeforeCompile=shader=>{
   shader.uniforms.wallTime=c.time;shader.uniforms.wallMotion=c.motion;
   shader.vertexShader='varying vec3 wallPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwallPosition=(modelMatrix*vec4(position,1.0)).xyz;');
   shader.fragmentShader='varying vec3 wallPosition;\nuniform float wallTime;\nuniform float wallMotion;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float phase=wallPosition.x*1.71+wallPosition.z*1.13;
    float flow=pow(0.5+0.5*sin(phase-wallTime*1.25),6.0);
    float shimmer=0.5+0.5*sin(wallTime*0.78+floor(phase)*2.4);
    float activity=${level===5?'pow(0.5+0.5*sin(wallTime*0.52+floor(phase)*1.83),48.0)':'0.0'};
    totalEmissiveRadiance*=1.0+wallMotion*(${crystal?'0.30*shimmer':'0.38*flow'}+0.16*activity);`);
  };
  m.customProgramCacheKey=()=>`wall-energy-v1-${level}-${crystal}`;
 }
 return m;
}
function finishes(k:WorldKit,n:number){const p=RECIPES[n-1];for(const color of [p.armor,p.cap,p.post,BASE]){const m=k.mat(color) as THREE.MeshStandardMaterial;m.roughness=n===1?.72:.43;m.metalness=n===1?.09:.38;}if(n===3||n===5)for(const color of [GOLD,GOLD_TOP]){const m=k.mat(color) as THREE.MeshStandardMaterial;m.roughness=.3;m.metalness=.4;}energy(k,p.energy,n);return p;}
function bevel(k:WorldKit,g:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,color:string,cut=.035){return armoredHull(k,g,w,h,d,[x,y,z],color,cut);}
function light(k:WorldKit,g:THREE.Group,size:[number,number,number],pos:[number,number,number],n:number){return k.block(g,size,pos,RECIPES[n-1].energy,0,true);}
function wallPost(k:WorldKit,g:THREE.Group,x:number,z:number,height:number,level:number,compact=false){
 const n=tier(level),p=finishes(k,n),h=wallVisualHeight(n,height),w=compact?.28:n===1?.4:n===2?.48:.54,d=n===1?.44:n===2?.52:.6;
 const post=new THREE.Group();post.position.set(x,0,z);post.name='wall-support-level-'+n;g.add(post);
 bevel(k,post,w+.06,.16,d+.06,0,.08,0,BASE);
 k.box(post,[w,h-.18,d],[0,h/2+.02,0],p.post,.045);
 k.box(post,[w+.025,.16,d+.025],[0,h+.025,0],n===3?GOLD_TOP:n===4?'#b9b8c2':p.post,.035);
 if(n>=2)for(const side of [-1,1]){
  const front=side*(d/2+.008);
  bevel(k,post,w*.53,h*.64,.045,0,h*.53,front,BASE,.025);
  light(k,post,[w*.23,n>=4?h*.65:.13,.025],[0,n>=4?h*.53:h*.64,front+side*.027],n);
  if(n===3||n===5)for(const a of [-1,1])bevel(k,post,w*.17,h*.83,.06,a*w*.41,h*.53,front,GOLD,.025);
 }
 if(n===3||n===5){bevel(k,post,w+.035,.2,d+.07,0,.22,0,GOLD,.045);for(const side of [-1,1])bevel(k,post,w*.24,.2,d+.045,side*w*.4,h-.035,0,GOLD,.03);}
 if(n>=4){
  bevel(k,post,w*.85,.1,d*.85,0,h+.13,0,p.post,.035);
  const color=n===4?'#489dff':'#8072ff';energy(k,color,n,true);
  const crystal=k.crystal(post,compact?.31:w*.85,n===4?.43:.48,[0,h+.16,0],color);crystal.name='mounted-wall-crystal';
  const core=k.crystal(post,w*.32,.18,[0,h+.18,d*.12],n===4?'#8ce8ff':'#c4afff');(core.material as THREE.MeshStandardMaterial).emissiveIntensity=.18;
 }
}
/** One-tile production model, also the source for every menu and placement preview. */
export function securityWallModel(k:WorldKit,length=1,height=1.2,level=1,endPosts=true){
 const n=tier(level),h=wallVisualHeight(n,height),p=finishes(k,n),g=new THREE.Group(),len=Math.max(.08,length),depth=n===1?.29:n===2?.34:.39;
 g.name='Security Wall Level '+n;g.userData.visualLevel=n;
 bevel(k,g,len,.17,depth+.09,0,.085,0,BASE,.025);
 k.block(g,[len,h-.22,depth*.72],[0,(h-.22)/2+.15,0],BASE);
 const courses=n===1?1:2,count=n===1?1:Math.max(1,Math.ceil(len/.6)),bottom=.32,top=h-.09;
 for(let row=0;row<courses;row++)for(let i=0;i<count;i++){
  const bw=len/count-.012,bh=(top-bottom)/courses-.012,x=-len/2+(i+.5)*len/count,y=bottom+(row+.5)*(top-bottom)/courses;
  bevel(k,g,bw,bh,depth,x,y,0,n===4&&((i+row)%2)?p.cap:p.armor,n===1?.035:.045);
  if(n===4){
   // Angular split faces give the blue infill a crystalline cut rather than painted metal bricks.
   const s=new THREE.Shape();s.moveTo(-bw*.38,-bh*.36);s.lineTo(bw*.38,-bh*.36);s.lineTo(bw*.2,bh*.36);s.closePath();
   for(const side of [-1,1]){const face=k.extrusion(g,`wall-crystal-facet-${bw}-${bh}`,s,.006,[x,y,side*(depth/2+.002)],(i+row)%2?p.armor:p.cap,true);face.rotation.y=side<0?Math.PI:0;}
  }
 }
 bevel(k,g,len,.12,depth+.025,0,h-.06,0,p.cap,.025);
 for(const z of [-1,1]){
  k.block(g,[len,.12,.035],[0,.25,z*(depth/2+.01)],BASE);
  light(k,g,[len,.055,.02],[0,.25,z*(depth/2+.032)],n);
  if(n===2)k.block(g,[len,.055,.04],[0,.39,z*(depth/2+.01)],p.post);
 }
 if(endPosts){const compact=len<=1.2,inset=Math.min(compact?.18:.32,len/2),xs=new Set([-len/2+inset,len/2-inset]);for(const x of xs)wallPost(k,g,x,0,height,n,compact);}
 return g;
}
const DIRECTIONS=[[1,0],[-1,0],[0,1],[0,-1]] as const;
function wallCells(walls:readonly SecurityBarrier[]){return new Map(walls.filter(w=>w.w===1&&w.d===1).map(w=>[w.x+','+w.z,w]));}
function buildWalls(k:WorldKit,group:THREE.Group,walls:readonly SecurityBarrier[],cells:ReturnType<typeof wallCells>){
  for(const w of walls){const level=w.level??1,height=w.height??1.2;
   if(w.w===1&&w.d===1){const neighbors=DIRECTIONS.filter(([dx,dz])=>cells.has((w.x+dx)+','+(w.z+dz)));
    const straight=neighbors.length===2&&neighbors[0][0]===-neighbors[1][0]&&neighbors[0][1]===-neighbors[1][1];
    const pier=straight&&Math.abs(Math.floor(neighbors[0][0]?w.x:w.z))%3===0;
    if(!neighbors.length){const p=securityWallModel(k,1,height,level);p.position.set(w.x,0,w.z);group.add(p);}
    else {
     if(!straight||pier)wallPost(k,group,w.x,w.z,height,level);
     for(const[dx,dz]of neighbors){const p=securityWallModel(k,.5,height,level,false);p.position.set(w.x+dx*.25,0,w.z+dz*.25);p.rotation.y=dx?0:Math.PI/2;group.add(p);}
    }
   }else{const horizontal=w.w>w.d,length=Math.max(w.w,w.d),count=Math.max(1,Math.ceil(length/2.6)),span=length/count;for(let i=0;i<count;i++){const p=securityWallModel(k,span,height,level);p.position.set(w.x,0,w.z);p.rotation.y=horizontal?0:Math.PI/2;p.translateX(-length/2+span*(i+.5));group.add(p);}}
  }
  const meshes:THREE.Mesh[]=[];group.updateMatrixWorld(true);group.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o);});for(const mesh of meshes){mesh.applyMatrix4(mesh.parent!.matrixWorld);group.add(mesh);}for(const child of [...group.children])if(child instanceof THREE.Group)group.remove(child);k.batchStatic(group,'approved-security-walls');
}
type WallChunk={key:string;kit:WorldKit;meshes:THREE.Object3D[]};
/** Connected row/compartment preview using the same geometry as saved walls. Own via caller's kit. */
export function securityWallLayout(k:WorldKit,walls:readonly SecurityBarrier[]){const group=new THREE.Group();buildWalls(k,group,walls,wallCells(walls));return group;}
/** Static scenes retain one material batch; mutable campuses rebuild only changed 16-cell regions. */
export class SecurityWalls{
 readonly group=new THREE.Group();private k?:WorldKit;private chunks=new Map<string,WallChunk>();private mutable=false;
 private time=0;private reduced=false;
 constructor(walls:readonly SecurityBarrier[]){this.group.name='Campus security walls';this.k=new WorldKit('campus');buildWalls(this.k,this.group,walls,wallCells(walls));}
 /** IDs/HP do not affect artwork. Neighbor masks include cells across chunk edges. */
 sync(walls:readonly SecurityBarrier[]){
  if(!this.mutable){this.mutable=true;this.k?.dispose();this.k=undefined;this.group.clear();}
  const cells=wallCells(walls),regions=new Map<string,SecurityBarrier[]>();
  for(const w of walls){const id=Math.floor(w.x/16)+','+Math.floor(w.z/16),list=regions.get(id)||[];list.push(w);regions.set(id,list);}
  for(const [id,c] of this.chunks)if(!regions.has(id)){for(const m of c.meshes)m.removeFromParent();c.kit.dispose();this.chunks.delete(id);}
  let rebuilt=0;
  for(const [id,list] of regions){
   list.sort((a,b)=>a.x-b.x||a.z-b.z||a.w-b.w||a.d-b.d);
   const key=JSON.stringify(list.map(w=>[w.x,w.z,w.w,w.d,w.level??1,w.height??1.2,...DIRECTIONS.map(([dx,dz])=>cells.has((w.x+dx)+','+(w.z+dz)))]));
   const old=this.chunks.get(id);if(old?.key===key)continue;
   if(old){for(const m of old.meshes)m.removeFromParent();old.kit.dispose();}
   const kit=new WorldKit('campus'),g=new THREE.Group();buildWalls(kit,g,list,cells);updateWallEnergy(kit,this.time,this.reduced);
   const meshes=[...g.children];for(const m of meshes)this.group.add(m);this.chunks.set(id,{key,kit,meshes});rebuilt++;
  }
  return rebuilt;
 }
 /** Rejoin editing chunks into global material batches once editing ends. */
 compact(walls:readonly SecurityBarrier[]){if(!this.mutable)return;this.dispose();this.group.clear();this.mutable=false;this.k=new WorldKit('campus');buildWalls(this.k,this.group,walls,wallCells(walls));updateWallEnergy(this.k,this.time,this.reduced);}
 update(timeSeconds:number,reduced=false){this.time=timeSeconds;this.reduced=reduced;if(this.k)updateWallEnergy(this.k,timeSeconds,reduced);for(const c of this.chunks.values())updateWallEnergy(c.kit,timeSeconds,reduced);}
 dispose(){this.k?.dispose();this.k=undefined;for(const c of this.chunks.values())c.kit.dispose();this.chunks.clear();}
}
