import * as THREE from 'three';import {campusRelief} from './CampusFinish';
/** Smooth deterministic ground color fields; flat geometry leaves placement heights unchanged. */
export class CampusLawn{
 readonly mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshStandardMaterial>;private relief=campusRelief();
 constructor(width:number,depth:number){const g=new THREE.PlaneGeometry(width,depth,24,18);g.rotateX(-Math.PI/2);const p=g.getAttribute('position'),colors:number[]=[],base=new THREE.Color('#a1c281'),rich=new THREE.Color('#89ae70'),earth=new THREE.Color('#b4bd87'),c=new THREE.Color();for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),field=.5+.3*Math.sin(x*.15+Math.sin(z*.12))+.2*Math.cos(z*.18-x*.065),worn=Math.max(0,Math.sin(x*.08+z*.11)-.2);c.copy(base).lerp(rich,field*.65).lerp(earth,worn*.4);colors.push(c.r,c.g,c.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));this.relief.repeat.set(width/8,depth/8);const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,bumpMap:this.relief,bumpScale:.025});this.mesh=new THREE.Mesh(g,m);this.mesh.name='textured-campus-lawn';this.mesh.receiveShadow=true;this.mesh.raycast=()=>{};}
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();this.relief.dispose();}
}
