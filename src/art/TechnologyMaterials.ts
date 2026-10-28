import * as THREE from 'three';
import {WorldKit} from './world';

/** Dedicated surface recipes, shared per WorldKit and disposed with its scene. */
export const technology=[
 {shell:'#e6dfcf',frame:'#36434d',metal:'#c38b42',glass:'#527b87'},
 {shell:'#a9b5ba',frame:'#33434e',metal:'#738894',glass:'#42b9da'},
 {shell:'#d8a444',frame:'#263642',metal:'#f0c461',glass:'#41cddd'},
 {shell:'#e2eaf0',frame:'#3c5369',metal:'#a9becd',glass:'#27aaff'},
 {shell:'#242c42',frame:'#b88836',metal:'#edbb54',glass:'#aa65f2'},
] as const;
export function technologyMaterials(k:WorldKit,level:number){
 const p=technology[Math.max(0,Math.min(4,level-1))];
 for(const [color,roughness,metalness] of [[p.shell,level===1?.83:level===2?.46:level===3?.34:level===4?.24:.28,level===4?.08:level===1?.12:.42],[p.frame,.31,.55],[p.metal,.24,.7],[p.glass,.17,.3]] as const){
  const m=k.mat(color) as THREE.MeshStandardMaterial;m.roughness=Math.max(.3,roughness);m.metalness=Math.min(.45,metalness);
 }
 return p;
}
/** Beveled cross section, extruded as one coherent housing rather than stacked boxes. */
export function armoredHull(k:WorldKit,g:THREE.Object3D,w:number,h:number,d:number,pos:[number,number,number],color:string,cut=.2){
 const x=w/2,y=h/2,c=Math.min(cut,x*.7,y*.7),s=new THREE.Shape();
 s.moveTo(-x+c,-y);s.lineTo(x-c,-y);s.lineTo(x,-y+c);s.lineTo(x,y-c);s.lineTo(x-c,y);s.lineTo(-x+c,y);s.lineTo(-x,y-c);s.lineTo(-x,-y+c);s.closePath();
 const m=k.extrusion(g,`technology-hull-${w}-${h}-${c}`,s,d,pos,color,true);m.castShadow=true;m.receiveShadow=true;return m;
}
