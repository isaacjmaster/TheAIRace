import * as THREE from 'three';
import {WorldKit,palette as C} from './world';
import {technologyMaterials,armoredHull} from './TechnologyMaterials';
import type {SecurityBarrier} from '../../shared/security-walls';
const tier=(n:number)=>Math.max(1,Math.min(5,Math.trunc(n)));
const HEIGHT=[1,1.04,1.08,1.09,1.12],ARMOR=['#e1ddca','#788d99','#20384e','#dbe7e5','#596978'],FRAME=['#355358','#455b6a','#142737','#26384e','#d2deda'];
/** Main barrier stays within twelve percent across all tiers; collision remains authoritative. */
export const wallVisualHeight=(level:number,height=1.2)=>height*HEIGHT[tier(level)-1];
function wallPost(k:WorldKit,g:THREE.Group,x:number,z:number,height:number,level:number){
 const n=tier(level),h=wallVisualHeight(n,height),w=[.2,.3,.36,.34,.38][n-1];
 k.box(g,[w,h-.14,w],[x,(h-.14)/2,z],technologyMaterials(k,n).shell,.035);
}
/** Whole panel generations: laminate, steel, faceted armor, ceramic and platinum. */
export function securityWallModel(k:WorldKit,length=1,height=1.2,level=1,endPosts=true){
 const n=tier(level),h=wallVisualHeight(n,height),panel=new THREE.Group(),frame=FRAME[n-1],armor=ARMOR[n-1],len=Math.max(.08,length);panel.name='Security Wall Level '+n;panel.userData.visualLevel=n;
 const p=technologyMaterials(k,n),depth=[.2,.34,.5,.52,.6][n-1];
 // An extruded armor profile runs continuously across owner-level half tiles.
 if(n===1)k.block(panel,[len,h-.12,depth],[0,h/2-.02,0],p.shell,.025);
 else {const hull=armoredHull(k,panel,depth,h-.12,len,[0,h/2,0],p.shell,n===2?.08:.16);hull.rotation.y=Math.PI/2;}
 k.block(panel,[len,.12,depth+.06],[0,.06,0],p.frame,.025);
 k.block(panel,[len,n>=3?.2:.14,depth+.12],[0,h-.1,0],p.frame,.035);
 if(n===2)for(const z of [-1,1]){k.block(panel,[len,.18,.055],[0,h*.3,z*.18],p.metal,.015);k.block(panel,[len,.07,.05],[0,h*.79,z*.18],p.metal,.015);}
 if(n===3)for(const z of [-1,1]){k.block(panel,[len,.22,.075],[0,h*.67,z*.255],p.metal,.025);k.block(panel,[len,.36,.06],[0,h*.36,z*.265],p.frame,.03);}
 if(n>=4)for(const z of [-1,1]){
  k.block(panel,[len,.26,.07],[0,h*.58,z*(depth/2)],p.frame,.025);
  k.block(panel,[len,.12,.08],[0,h*.58,z*(depth/2+.035)],p.glass,.02);
  k.block(panel,[len,.035,.085],[0,h*.58,z*(depth/2+.045)],n===5?'#c9ffff':'#6ce1e6',.005,true);
  if(n===5){const facet=armoredHull(k,panel,len,.36,.08,[0,h*.31,z*.3],p.glass,.1);facet.rotation.x=z*.14;k.block(panel,[len,.045,.07],[0,h*.83,z*.29],p.metal,.01);}
 }
 if(endPosts){for(const x of new Set([-Math.max(0,len/2-.22),Math.max(0,len/2-.22)]))wallPost(k,panel,x,0,height,n);}
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
