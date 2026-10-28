import * as THREE from 'three';
import {WorldKit,palette as C} from './world';
import type {SecurityBarrier} from '../../shared/security-walls';
const tier=(n:number)=>Math.max(1,Math.min(5,Math.trunc(n)));
const HEIGHT=[1,1.16,1.34,1.47,1.62],ARMOR=['#e1ddca','#95a8b0','#304a60','#52667e','#d1dee0'],FRAME=['#355358','#354d5d','#202f43','#26384e','#25364c'];
/** Cosmetic heights never change a cell's logical obstruction or firing rules. */
export const wallVisualHeight=(level:number,height=1.2)=>height*HEIGHT[tier(level)-1];
function wallPost(k:WorldKit,g:THREE.Group,x:number,z:number,height:number,level:number){
 const n=tier(level),h=wallVisualHeight(n,height),w=[.2,.28,.34,.36,.4][n-1],frame=FRAME[n-1];
 k.box(g,[w,h,w],[x,h/2,z],frame,.025);
 if(n>=2){k.box(g,[w+.1,.16,w+.1],[x,h-.02,z],ARMOR[n-1],.025);k.box(g,[w+.08,.16,w+.08],[x,.12,z],frame,.025);}
 if(n>=3)for(const side of [-1,1]){const brace=k.box(g,[.09,h*.6,.1],[x+side*w*.44,h*.39,z+w*.45],ARMOR[n-1],.015);brace.rotation.z=-side*.1;}
 if(n>=4){k.box(g,[w*.7,.16,w*.7],[x,h+.13,z],'#bad0d7',.025);k.box(g,[w*.42,.12,w*.42],[x,h+.27,z],frame,.015);k.box(g,[w*.44,.035,w*.44],[x,h+.34,z],C.cyan,.012,true);}
}
/** Five structural families; effects-off readability comes from silhouette and layered armor. */
export function securityWallModel(k:WorldKit,length=1,height=1.2,level=1,endPosts=true){
 const n=tier(level),h=wallVisualHeight(n,height),panel=new THREE.Group(),frame=FRAME[n-1],armor=ARMOR[n-1],len=Math.max(.08,length);panel.name='Security Wall Level '+n;panel.userData.visualLevel=n;
 k.box(panel,[len,.16,.42],[0,.1,0],frame,.025);
 k.box(panel,[len,h-.24,n>=3?.3:.21],[0,h/2,0],armor,.025);
 if(n===1)k.box(panel,[len,.1,.26],[0,h,0],frame,.015);
 if(n>=2){
  k.box(panel,[len,.18,n>=3?.44:.36],[0,h,0],frame,.025);
  for(const z of [-1,1]){k.box(panel,[len*.92,.17,.065],[0,h*.35,z*.16],n===2?'#d8e0dc':'#688394',.012);k.box(panel,[len*.92,.22,.06],[0,h*.66,z*.17],armor,.012);}
 }
 if(n>=3){
  for(const z of [-1,1]){const plate=k.box(panel,[len*.78,.42,.095],[0,h*.56,z*.2],n===3?'#617b8c':armor,.025);plate.rotation.x=-z*.12;k.box(panel,[len*.9,.045,.025],[0,h*.26,z*.225],C.cyan,.008,true);}
 }
 if(n>=4){
  for(const z of [-.18,.18]){k.box(panel,[len,.08,.09],[0,h+.16,z],'#adc6ce',.018);k.box(panel,[len,.035,.045],[0,h+.22,z],C.cyan,.008,true);}
  for(const z of [-1,1]){k.box(panel,[len*.4,.35,.1],[0,h*.66,z*.28],frame,.02);k.box(panel,[len*.22,.2,.03],[0,h*.66,z*.34],'#67c7d0',.012,true);}
 }
 if(n===5){
  for(const z of [-1,1]){const shield=k.box(panel,[len*.86,.56,.12],[0,h*.53,z*.29],armor,.035);shield.rotation.x=-z*.16;k.box(panel,[len,.12,.1],[0,h*.83,z*.29],'#8babb9',.025);k.box(panel,[len*.9,.065,.05],[0,h*.86,z*.35],C.cyan,.012,true);}
  k.box(panel,[len,.14,.16],[0,h+.3,0],frame,.025);k.box(panel,[len*.88,.055,.12],[0,h+.39,0],'#c1d9de',.015);
 }
 if(endPosts){const inset=n===1?.1:([.2,.28,.34,.36,.4][n-1]+.1)/2+(n>=3?.06:0);for(const x of new Set([-Math.max(0,len/2-inset),Math.max(0,len/2-inset)]))wallPost(k,panel,x,0,height,n);}
 return panel;
}
/** One post per occupied cell, owner-level half connections, shared static material batches. */
export class SecurityWalls{
 readonly group=new THREE.Group();private k=new WorldKit('campus');
 constructor(walls:readonly SecurityBarrier[]){
  this.group.name='Campus security walls';const cells=new Map(walls.filter(w=>w.w===1&&w.d===1).map(w=>[w.x+','+w.z,w]));
  for(const w of walls){const level=(w as SecurityBarrier & {level?:number}).level??1,height=w.height??1.2;
   if(w.w===1&&w.d===1){const neighbors=([[1,0],[-1,0],[0,1],[0,-1]] as const).filter(([dx,dz])=>cells.has((w.x+dx)+','+(w.z+dz)));
    wallPost(this.k,this.group,w.x,w.z,height,level);
    if(!neighbors.length){const p=securityWallModel(this.k,.92,height,level,false);p.position.set(w.x,0,w.z);this.group.add(p);}
    for(const[dx,dz]of neighbors){const p=securityWallModel(this.k,.5,height,level,false);p.position.set(w.x+dx*.25,0,w.z+dz*.25);p.rotation.y=dx?0:Math.PI/2;this.group.add(p);}
   }else{const horizontal=w.w>w.d,length=Math.max(w.w,w.d),count=Math.max(1,Math.ceil(length/2.6)),span=length/count;for(let i=0;i<count;i++){const p=securityWallModel(this.k,span,height,level);p.position.set(w.x,0,w.z);p.rotation.y=horizontal?0:Math.PI/2;p.translateX(-length/2+span*(i+.5));this.group.add(p);}}
  }
  // Transform once, then render large mixed-level layouts in material batches.
  const meshes:THREE.Mesh[]=[];this.group.updateMatrixWorld(true);this.group.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o);});for(const mesh of meshes){mesh.applyMatrix4(mesh.parent!.matrixWorld);this.group.add(mesh);}for(const child of [...this.group.children])if(child instanceof THREE.Group)this.group.remove(child);this.k.batchStatic(this.group,'all-five-tier-security-panels');
 }
 dispose(){this.k.dispose();}
}
