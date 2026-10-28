import * as THREE from 'three';
import {WorldKit} from './world';

/** Dedicated surface recipes, shared per WorldKit and disposed with its scene. */
export const technology=[
 {shell:'#b7b4a1',frame:'#46575a',metal:'#aa7955',glass:'#527b87'},
 {shell:'#7f99a2',frame:'#364e59',metal:'#c18b51',glass:'#498d9e'},
 {shell:'#283b51',frame:'#53677a',metal:'#d0ad65',glass:'#357f98'},
 {shell:'#e2e8dc',frame:'#53798b',metal:'#c7dadf',glass:'#69cbd7'},
 {shell:'#31364f',frame:'#d4e3e4',metal:'#e2bd77',glass:'#98e4e5'},
] as const;
export function technologyMaterials(k:WorldKit,level:number){
 const p=technology[Math.max(0,Math.min(4,level-1))];
 for(const [color,roughness,metalness] of [[p.shell,level===1?.83:level===2?.46:level===3?.34:level===4?.24:.28,level===4?.08:level===1?.12:.42],[p.frame,.31,.55],[p.metal,.24,.7],[p.glass,.17,.3]] as const){
  const m=k.mat(color) as THREE.MeshStandardMaterial;m.roughness=roughness;m.metalness=metalness;
 }
 return p;
}
/** Beveled cross section, extruded as one coherent housing rather than stacked boxes. */
export function armoredHull(k:WorldKit,g:THREE.Object3D,w:number,h:number,d:number,pos:[number,number,number],color:string,cut=.2){
 const x=w/2,y=h/2,c=Math.min(cut,x*.7,y*.7),s=new THREE.Shape();
 s.moveTo(-x+c,-y);s.lineTo(x-c,-y);s.lineTo(x,-y+c);s.lineTo(x,y-c);s.lineTo(x-c,y);s.lineTo(-x+c,y);s.lineTo(-x,y-c);s.lineTo(-x,-y+c);s.closePath();
 const m=k.extrusion(g,`technology-hull-${w}-${h}-${c}`,s,d,pos,color,true);m.castShadow=true;m.receiveShadow=true;return m;
}
