import * as THREE from 'three';

/** HQ-only finish; title and raid rendering keep their existing material profiles. */
export function finishCampusMaterial(material:THREE.MeshStandardMaterial,color:string,glow:boolean){
 if(glow)return material;
 material.metalness=.04;material.roughness=.7;
 const finishes:Record<string,[string,number,number]>={
  '#f0f3ef':['#fff8e9',.72,0], '#294a60':['#214b61',.42,.18],
  '#88a6b5':['#8eaeb9',.48,.22], '#efb64e':['#ffc64a',.38,.16],
  '#33d9d5':['#25d9cf',.4,.08], '#e7b789':['#dca56a',.8,0],
 };
 if(color==='#155976'||color==='#185d7a'||color==='#397991'){material.roughness=.37;material.metalness=.12;}
 const finish=finishes[color];if(finish){material.color.set(finish[0]);material.roughness=finish[1];material.metalness=finish[2];}
 return material;
}
export function lightCampus(renderer:THREE.WebGLRenderer,scene:THREE.Scene,sun:THREE.DirectionalLight){
 renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;
 const fill=scene.children.find(o=>o instanceof THREE.HemisphereLight) as THREE.HemisphereLight|undefined;
 if(fill){fill.color.set('#f9f7f0');fill.groundColor.set('#81977c');fill.intensity=1.7;}
 sun.color.set('#fff0d5');sun.intensity=2.8;sun.position.set(-16,26,18);
 Object.assign(sun.shadow.camera,{left:-27,right:27,top:27,bottom:-27,far:85});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.025;sun.shadow.bias=-.0001;
}
/** Low-frequency surface relief, not photographic noise. One tiny repeating map per surface. */
export function campusRelief(){
 const size=64,data=new Uint8Array(size*size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*Math.PI*2,v=y/size*Math.PI*2;data[y*size+x]=128+Math.round(9*Math.sin(u*3+Math.sin(v))*Math.cos(v*2)+4*Math.cos(u*7+v*5));
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RedFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.needsUpdate=true;return texture;
}
export function contactTexture(){
 const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const d=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));const i=(y*size+x)*4;data[i]=35;data[i+1]=58;data[i+2]=47;data[i+3]=Math.round(Math.pow(Math.max(0,1-d),1.35)*100);
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.needsUpdate=true;return texture;
}

/** Soft edge/vertical variation gives painted shells depth without noisy imagery. */
export function campusCoating(roof=false){
 const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(y+.5)/size,edge=Math.min(u,1-u,v,1-v),inset=Math.min(1,edge*12);
  const value=roof?.94+.045*inset+.015*v:.94+.025*inset+.035*v;const i=(y*size+x)*4;
  data[i]=Math.round(255*value);data[i+1]=Math.round(255*value);data[i+2]=Math.round((roof?255:252)*value);data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
}
