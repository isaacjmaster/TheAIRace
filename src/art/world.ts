import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** One art direction for the company campus and enemy networks. */
export const palette = { cream:'#f0f3ef', dark:'#294a60', slate:'#88a6b5', cyan:'#33d9d5', purple:'#9aabed', gold:'#efb64e', coral:'#ff9a87', sky:'#b5eafa', grass:'#a5d9bd', terracotta:'#e7b789' };
export function material(color:string, glow=false) {
 return new THREE.MeshStandardMaterial({color,roughness:glow?.36:.48,metalness:.16,emissive:glow?color:'#000000',emissiveIntensity:glow?.65:0});
}
export function lightWorld(renderer:THREE.WebGLRenderer, scene:THREE.Scene) {
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 scene.background=new THREE.Color(palette.sky);scene.fog=new THREE.Fog(palette.sky,40,85);
 scene.add(new THREE.HemisphereLight('#d9eeff','#759278',1.65));
 const sun=new THREE.DirectionalLight('#ffe3af',3.2);sun.position.set(-9,22,12);sun.castShadow=true;
 sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-21,right:21,top:21,bottom:-21,near:1,far:65});sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;scene.add(sun);
 return sun;
}
export class WorldKit {
 private geometries=new Map<string,THREE.BufferGeometry>();
 private materials=new Map<string,THREE.Material>();
 private textures:THREE.Texture[]=[];
 mat(color:string,glow=false){const key=color+glow;if(!this.materials.has(key))this.materials.set(key,material(color,glow));return this.materials.get(key)!;}
 private geometry(key:string,make:()=>THREE.BufferGeometry){if(!this.geometries.has(key))this.geometries.set(key,make());return this.geometries.get(key)!;}
 box(parent:THREE.Object3D,size:[number,number,number],position:[number,number,number],color:string,radius=.06,glow=false){
  const mesh=new THREE.Mesh(this.geometry('box'+size.join()+radius,()=>new RoundedBoxGeometry(...size,1,radius)),this.mat(color,glow));
  mesh.position.set(...position);mesh.castShadow=!glow&&size[1]>.15;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 gable(parent:THREE.Object3D,width:number,height:number,depth:number,position:[number,number,number],color:string){
  const mesh=new THREE.Mesh(this.geometry(`gable${width},${height},${depth}`,()=>{const shape=new THREE.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(0,height);shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geometry.translate(0,0,-depth/2);return geometry;}),this.mat(color));mesh.position.set(...position);mesh.castShadow=true;parent.add(mesh);return mesh;
 }
 cylinder(parent:THREE.Object3D,radius:number,height:number,position:[number,number,number],color:string){
  const mesh=new THREE.Mesh(this.geometry('cyl'+radius+','+height,()=>new THREE.CylinderGeometry(radius,radius,height,10)),this.mat(color));mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 tree(parent:THREE.Object3D,x:number,z:number,scale=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);this.cylinder(g,.15,1.1,[0,.55,0],'#ba9577');
  const top=new THREE.Mesh(this.geometry('foliage',()=>new THREE.DodecahedronGeometry(.85,0)),this.mat(x%3<1?'#5d9c7c':'#78af86'));top.position.y=1.5;top.scale.y=1.3;top.castShadow=true;g.add(top);const crown=top.clone();crown.scale.set(.72,.85,.72);crown.position.set(.25,2.22,-.12);g.add(crown);
 }
 /** Continuous, faceted terrain. The playable center stays flat; hills rise outside it. */
 terrain(parent:THREE.Object3D, halfX:number, halfZ:number,clip?:{minX:number;maxX:number;minZ:number;maxZ:number}){
  const g=new THREE.PlaneGeometry(160,160,64,64);g.rotateX(-Math.PI/2);
  const p=g.attributes.position;const colors:number[]=[];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),z=p.getZ(i),edge=Math.max(Math.abs(x)-halfX,Math.abs(z)-halfZ,0);
   const hill=Math.min(4,edge*.2)*(1+Math.sin(x*.19)*Math.cos(z*.23))*.65;
   p.setY(i,-.15+hill);
   const color=new THREE.Color(edge<2?'#98bb91':edge<10?'#83a881':'#729987');color.multiplyScalar(.9+.1*Math.sin(x*.5+z*.3));colors.push(color.r,color.g,color.b);
  }
  if(clip){const source=g.getIndex()!,indices:number[]=[];for(let i=0;i<source.count;i+=3){const a=source.getX(i),b=source.getX(i+1),c=source.getX(i+2),x=(p.getX(a)+p.getX(b)+p.getX(c))/3,z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;if(x>=clip.minX&&x<=clip.maxX&&z>=clip.minZ&&z<=clip.maxZ)indices.push(a,b,c);}g.setIndex(indices);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();this.geometries.set('terrain',g);
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1});this.materials.set('terrain',mat);
  const mesh=new THREE.Mesh(g,mat);mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 label(parent:THREE.Object3D,text:string,position:[number,number,number],width:number){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d')!;c.fillStyle=palette.dark;c.fillRect(0,0,512,96);c.font='700 40px Segoe UI, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=palette.cream;c.fillText(text,256,48,480);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);
  const mat=new THREE.MeshBasicMaterial({map:texture});this.materials.set('label'+this.textures.length,mat);
  const mesh=new THREE.Mesh(this.geometry('label'+width,()=>new THREE.PlaneGeometry(width,width*96/512)),mat);mesh.position.set(...position);parent.add(mesh);
 }
 dispose(){for(const g of this.geometries.values())g.dispose();for(const m of this.materials.values())m.dispose();for(const t of this.textures)t.dispose();}
}
