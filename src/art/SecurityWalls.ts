import * as THREE from 'three';
import {WorldKit,palette as C} from './world';
import type {SecurityBarrier} from '../../shared/security-walls';
const tier=(n:number)=>Math.max(1,Math.min(5,Math.trunc(n)));
const HEIGHT=[1,1.04,1.08,1.09,1.12],ARMOR=['#e1ddca','#788d99','#20384e','#dbe7e5','#596978'],FRAME=['#355358','#455b6a','#142737','#26384e','#d2deda'];
/** Main barrier stays within twelve percent across all tiers; collision remains authoritative. */
export const wallVisualHeight=(level:number,height=1.2)=>height*HEIGHT[tier(level)-1];
function wallPost(k:WorldKit,g:THREE.Group,x:number,z:number,height:number,level:number){
 const n=tier(level),h=wallVisualHeight(n,height),w=[.2,.3,.36,.34,.38][n-1];
 k.box(g,[w,h-.14,w],[x,(h-.14)/2,z],ARMOR[n-1],.035);
}
/** Whole panel generations: laminate, steel, faceted armor, ceramic and platinum. */
export function securityWallModel(k:WorldKit,length=1,height=1.2,level=1,endPosts=true){
 const n=tier(level),h=wallVisualHeight(n,height),panel=new THREE.Group(),frame=FRAME[n-1],armor=ARMOR[n-1],len=Math.max(.08,length);panel.name='Security Wall Level '+n;panel.userData.visualLevel=n;
 const depth=[.2,.3,.4,.38,.44][n-1];
 k.box(panel,[len,h-.12,depth],[0,h/2-.02,0],armor,n>=3?.065:.025);
 k.box(panel,[len,.12,depth+.06],[0,.06,0],frame,.025);
 k.box(panel,[len,.12,depth+.08],[0,h-.06,0],frame,n===5?.05:.025);
 if(n===2)for(const z of [-1,1])k.box(panel,[len,.32,.035],[0,h*.48,z*(depth/2+.012)],'#9badb5',.018);
 if(n===3)for(const z of [-1,1]){const plate=k.box(panel,[len,.64,.06],[0,h*.5,z*.21],'#2b435b',.04);plate.rotation.x=z*.09;k.box(panel,[len,.035,.018],[0,h*.72,z*.247],'#4b9ba9',.005);}
 if(n===4)for(const z of [-1,1]){k.box(panel,[len,.09,.04],[0,h*.65,z*.205],FRAME[n-1],.01);k.box(panel,[len,.025,.045],[0,h*.65,z*.214],'#76d2d5',.005,true);}
 if(n===5)for(const z of [-1,1]){const plate=k.box(panel,[len,.45,.065],[0,h*.47,z*.22],'#bacacb',.045);plate.rotation.x=z*.12;k.box(panel,[len,.035,.035],[0,h*.77,z*.24],'#b8eeee',.008,true);}
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
