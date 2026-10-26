import * as THREE from 'three';import {WorldKit,palette as C} from './world';import type {SecurityBarrier} from '../../shared/security-walls';
export function securityWallModel(k:WorldKit,length=1,height=1.2,level=1){
 const panel=new THREE.Group(),armor=level>=3?'#3c5969':C.cream,frame=level>=2?'#243e50':C.dark;
 k.box(panel,[length,.2,.48],[0,.11,0],frame,.035);k.box(panel,[Math.max(.12,length-.17),height-.27,.24],[0,height/2+.1,0],armor,.035);k.box(panel,[Math.max(.12,length-.12),.14,.32],[0,height,0],frame,.025);
 for(const z of [-.17,.17])k.box(panel,[Math.max(.08,length-.3),.045,.027],[0,height-.08,z],C.cyan,.008,true);
 for(const x of [-length/2+.05,length/2-.05])k.box(panel,[.1,height+.1,.38],[x,height/2,0],C.slate,.02);
 if(level>=2){k.box(panel,[Math.max(.12,length-.14),.12,.31],[0,.38,0],C.slate,.015);k.box(panel,[Math.max(.12,length-.12),.07,.36],[0,height+.1,0],level>=3?C.cream:C.slate,.02);}
 if(level>=3)for(const z of [-.18,.18])k.box(panel,[Math.max(.08,length-.2),.07,.025],[0,height*.55,z],C.cyan,.008,true);
 return panel;
}
/** Shared modular panels, merged by material; no physics, particles or per-panel updates. */
export class SecurityWalls{readonly group=new THREE.Group();private k=new WorldKit('campus');constructor(walls:readonly SecurityBarrier[]){this.group.name='Campus security walls';for(const wall of walls){if(wall.w===1&&wall.d===1){
 const neighbors=walls.filter(w=>Math.abs(w.x-wall.x)+Math.abs(w.z-wall.z)<1.01&&w!==wall);
 this.k.box(this.group,[.34,wall.height??1.2,.34],[wall.x,(wall.height??1.2)/2,wall.z],C.slate,.025);
 if(!neighbors.length){const panel=securityWallModel(this.k,.92,wall.height??1.2,(wall as SecurityBarrier & {level?:number}).level??1);panel.position.set(wall.x,0,wall.z);this.group.add(panel);}
 for(const n of neighbors){const dx=n.x-wall.x,dz=n.z-wall.z,panel=securityWallModel(this.k,.5,wall.height??1.2,(wall as SecurityBarrier & {level?:number}).level??1);panel.position.set(wall.x+dx*.25,0,wall.z+dz*.25);panel.rotation.y=dx?0:Math.PI/2;this.group.add(panel);}continue;
 }const horizontal=wall.w>wall.d,length=Math.max(wall.w,wall.d),height=wall.height??1.3,count=Math.max(1,Math.ceil(length/2.6)),span=length/count;for(let i=0;i<count;i++){const panel=securityWallModel(this.k,span,height,(wall as SecurityBarrier & {level?:number}).level??1);panel.position.set(wall.x,0,wall.z);panel.rotation.y=horizontal?0:Math.PI/2;const x=-length/2+span*(i+.5);panel.translateX(x);this.group.add(panel);}}const joins=new Map<string,{x:number;z:number;horizontal:Set<boolean>;height:number}>();for(const w of walls){const horizontal=w.w>w.d;for(const sign of [-1,1]){const x=w.x+(horizontal?sign*w.w/2:0),z=w.z+(horizontal?0:sign*w.d/2),key=x.toFixed(3)+','+z.toFixed(3);const j=joins.get(key)??{x,z,horizontal:new Set<boolean>(),height:w.height??1.2};j.horizontal.add(horizontal);joins.set(key,j);}}for(const j of joins.values())if(j.horizontal.size>1){this.k.box(this.group,[.48,j.height,.48],[j.x,j.height/2,j.z],C.slate,.025);this.k.box(this.group,[.52,.12,.52],[j.x,j.height,j.z],C.dark,.02);}
 // Flatten static transforms once before material batching.
 const meshes:THREE.Mesh[]=[];this.group.updateMatrixWorld(true);this.group.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o);});for(const mesh of meshes){mesh.applyMatrix4(mesh.parent!.matrixWorld);this.group.add(mesh);}for(const child of [...this.group.children])if(child instanceof THREE.Group)this.group.remove(child);this.k.batchStatic(this.group,'all-security-panels');}
 dispose(){this.k.dispose();}}
