import {finishCampusMaterial,campusRelief,contactTexture,campusCoating} from './CampusFinish';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
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
 constructor(readonly finish:'default'|'campus'='default'){}
 private contact?:THREE.Texture;private coatings=new Map<boolean,THREE.Texture>();
 private geometries=new Map<string,THREE.BufferGeometry>();
 private materials=new Map<string,THREE.Material>();
 private textures:THREE.Texture[]=[];
 private instances:THREE.InstancedMesh[]=[];
 instanced(parent:THREE.Object3D,geometry:THREE.BufferGeometry,mat:THREE.Material,count:number){const mesh=new THREE.InstancedMesh(geometry,mat,count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;this.instances.push(mesh);parent.add(mesh);return mesh;}
 mat(color:string,glow=false){const key=color+glow;if(!this.materials.has(key)){
  const mat=material(color,glow);if(this.finish==='campus'){
   finishCampusMaterial(mat,color,glow);const roof=['#155976','#185d7a'].includes(color);
   if(!glow&&(color===palette.cream||roof)){if(!this.coatings.has(roof)){const map=campusCoating(roof);this.coatings.set(roof,map);this.textures.push(map);}mat.map=this.coatings.get(roof)!;}
  }this.materials.set(key,mat);
 }return this.materials.get(key)!;}

 private geometry(key:string,make:()=>THREE.BufferGeometry){if(!this.geometries.has(key))this.geometries.set(key,make());return this.geometries.get(key)!;}
 box(parent:THREE.Object3D,size:[number,number,number],position:[number,number,number],color:string,radius=.06,glow=false){
  const mesh=new THREE.Mesh(this.geometry('box'+size.join()+radius,()=>new RoundedBoxGeometry(...size,1,radius)),this.mat(color,glow));
  mesh.position.set(...position);mesh.castShadow=!glow&&size[1]>.15;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 /** Flat inset bands need twelve triangles, not a rounded hull on every wall tile. */
 block(parent:THREE.Object3D,size:[number,number,number],position:[number,number,number],color:string,_radius=0,glow=false){
  const mesh=new THREE.Mesh(this.geometry('flat-block'+size.join(),()=>new THREE.BoxGeometry(...size)),this.mat(color,glow));
  mesh.position.set(...position);mesh.castShadow=!glow&&size[1]>.15;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 /** Batch repeated static character pieces by material; animated joints remain separate. */
 batchStatic(parent:THREE.Object3D,key:string){const groups=new Map<THREE.Material,THREE.Mesh[]>();for(const child of [...parent.children])if(child instanceof THREE.Mesh&&!Array.isArray(child.material)){const list=groups.get(child.material)||[];list.push(child);groups.set(child.material,list);}
  for(const [material,meshes] of groups){const geometry=this.geometry(key+material.uuid,()=>{const pieces=meshes.map(mesh=>{mesh.updateMatrix();const copy=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();return copy.applyMatrix4(mesh.matrix);});const merged=mergeGeometries(pieces,false)!;pieces.forEach(g=>g.dispose());return merged;});const batch=new THREE.Mesh(geometry,material);batch.castShadow=meshes.some(m=>m.castShadow);batch.receiveShadow=true;for(const mesh of meshes)mesh.removeFromParent();parent.add(batch);}
 }
 gable(parent:THREE.Object3D,width:number,height:number,depth:number,position:[number,number,number],color:string){
  const mesh=new THREE.Mesh(this.geometry(`gable${width},${height},${depth}`,()=>{const shape=new THREE.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(0,height);shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geometry.translate(0,0,-depth/2);return geometry;}),this.mat(color));mesh.position.set(...position);mesh.castShadow=true;parent.add(mesh);return mesh;
 }
 extrusion(parent:THREE.Object3D,key:string,shape:THREE.Shape,depth:number,position:[number,number,number],color:string,centered=false){
  const mesh=new THREE.Mesh(this.geometry('extrusion'+key+depth+centered,()=>{const geometry=new THREE.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:4,bevelEnabled:false});if(centered)geometry.translate(0,0,-depth/2);return geometry;}),this.mat(color));mesh.position.set(...position);parent.add(mesh);return mesh;
 }
 emblem(parent:THREE.Object3D,points:[number,number][],position:[number,number,number],color:string){
  const mesh=new THREE.Mesh(this.geometry('emblem'+points.flat().join(),()=>{const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));return new THREE.ShapeGeometry(shape);}),this.mat(color,true));mesh.position.set(...position);parent.add(mesh);return mesh;
 }
 ring(parent:THREE.Object3D,radius:number,tube:number,position:[number,number,number],color:string,glow=false){
  const mesh=new THREE.Mesh(this.geometry('ring'+radius+','+tube,()=>new THREE.TorusGeometry(radius,tube,6,24)),this.mat(color,glow));mesh.position.set(...position);parent.add(mesh);return mesh;
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
   const color=new THREE.Color(this.finish==='campus'?(edge<2?'#97c885':edge<10?'#86b27d':'#78a17b'):edge<2?'#98bb91':edge<10?'#83a881':'#729987');color.multiplyScalar(this.finish==='campus'?.97+.03*Math.sin(x*.16+z*.11):.9+.1*Math.sin(x*.5+z*.3));colors.push(color.r,color.g,color.b);
  }
  if(clip){const source=g.getIndex()!,indices:number[]=[];for(let i=0;i<source.count;i+=3){const a=source.getX(i),b=source.getX(i+1),c=source.getX(i+2),x=(p.getX(a)+p.getX(b)+p.getX(c))/3,z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;if(x>=clip.minX&&x<=clip.maxX&&z>=clip.minZ&&z<=clip.maxZ)indices.push(a,b,c);}g.setIndex(indices);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();this.geometries.set('terrain',g);
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1});this.materials.set('terrain',mat);
  if(this.finish==='campus'){const relief=campusRelief();relief.repeat.set(80,80);this.textures.push(relief);mat.bumpMap=relief;mat.bumpScale=.045;mat.flatShading=false;}
  const mesh=new THREE.Mesh(g,mat);mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 /** Shared faceted boulders for removable landscape obstacles. */
 boulder(parent:THREE.Object3D,position:[number,number,number],scale:[number,number,number],color:string,yaw:number){const mesh=new THREE.Mesh(this.geometry('landscape-boulder',()=>new THREE.DodecahedronGeometry(1,0)),this.mat(color));mesh.position.set(...position);mesh.scale.set(...scale);mesh.rotation.set(.1,yaw,.12);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 label(parent:THREE.Object3D,text:string,position:[number,number,number],width:number){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d')!;c.fillStyle=palette.dark;c.fillRect(0,0,512,96);c.font='700 40px Segoe UI, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=palette.cream;c.fillText(text,256,48,480);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);
  const mat=new THREE.MeshBasicMaterial({map:texture});this.materials.set('label'+this.textures.length,mat);
  const mesh=new THREE.Mesh(this.geometry('label'+width,()=>new THREE.PlaneGeometry(width,width*96/512)),mat);mesh.position.set(...position);parent.add(mesh);
 }
 roadMaterial(){const mat=this.mat('#365b6b') as THREE.MeshStandardMaterial;mat.roughness=.92;mat.metalness=0;if(!mat.bumpMap){const relief=campusRelief();relief.repeat.set(24,2);this.textures.push(relief);mat.bumpMap=relief;mat.bumpScale=.025;}return mat;}
 grounding(parent:THREE.Object3D,width:number,depth:number,x=0,z=0){
  if(this.finish!=='campus')return;
  if(!this.contact){this.contact=contactTexture();this.textures.push(this.contact);}
  const key='grounding-material';if(!this.materials.has(key))this.materials.set(key,new THREE.MeshBasicMaterial({map:this.contact,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false}));
  const shadow=new THREE.Mesh(this.geometry(`grounding${width},${depth}`,()=>new THREE.PlaneGeometry(width,depth)),this.materials.get(key)!);shadow.name='decorative-contact-shadow';shadow.rotation.x=-Math.PI/2;shadow.position.set(x,-.105,z);shadow.raycast=()=>{};parent.add(shadow);return shadow;
 }
 dispose(){for(const i of this.instances)i.dispose();for(const g of this.geometries.values())g.dispose();for(const m of this.materials.values())m.dispose();for(const t of this.textures)t.dispose();}
}
