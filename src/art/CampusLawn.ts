import * as THREE from 'three';
import {campusRelief} from './CampusFinish';
/** Seamless stylized turf: soft clusters and fine blades, no extra draw calls. */
function lawnTexture(){
 const size=128,data=new Uint8Array(size*size*4);
 const hash=(x:number,y:number,n:number)=>{const seed=Math.sin((x%n)*127.1+(y%n)*311.7)*43758.5453;return seed-Math.floor(seed);};
 const noise=(x:number,y:number,n:number)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy,n),hash(ix+1,iy,n),sx),THREE.MathUtils.lerp(hash(ix,iy+1,n),hash(ix+1,iy+1,n),sx),sy);};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const patch=noise(x/size*8,y/size*8,8),fine=noise(x/size*32,y/size*32,32);
  const value=Math.round(238+12*patch+5*fine),i=(y*size+x)*4;
  data[i]=value-3;data[i+1]=value;data[i+2]=value-7;data[i+3]=255;
 }
 const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
/** Flat geometry preserves placement and unit height; all variation is material-only. */
export class CampusLawn{
 readonly mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshStandardMaterial>;private relief=campusRelief();private color=lawnTexture();
 constructor(width:number,depth:number){
  const g=new THREE.PlaneGeometry(width,depth,24,18);g.rotateX(-Math.PI/2);
  const p=g.getAttribute('position'),colors:number[]=[],base=new THREE.Color('#91b96d'),rich=new THREE.Color('#78a75c'),warm=new THREE.Color('#a4bc74'),c=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),field=.5+.3*Math.sin(x*.19+Math.sin(z*.17))+.2*Math.cos(z*.27-x*.085),sunny=Math.max(0,Math.sin(x*.24+z*.15));c.copy(base).lerp(rich,field*.65).lerp(warm,sunny*.28);colors.push(c.r,c.g,c.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));this.relief.repeat.set(width/5,depth/5);this.color.repeat.set(width/5,depth/5);
  const m=new THREE.MeshStandardMaterial({vertexColors:true,map:this.color,roughness:1,metalness:0,bumpMap:this.relief,bumpScale:.008});
  this.mesh=new THREE.Mesh(g,m);this.mesh.name='textured-campus-lawn';this.mesh.receiveShadow=true;this.mesh.raycast=()=>{};
 }
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();this.relief.dispose();this.color.dispose();}
}
