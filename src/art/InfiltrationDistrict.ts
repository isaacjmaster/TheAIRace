import * as THREE from 'three';
import {WorldKit} from './world';
import {districtBuilding} from './DistrictBuildings';
/** A compact, developed neighborhood. Scenery never joins navigation or picking. */
export class InfiltrationDistrict{
 readonly group=new THREE.Group();private k=new WorldKit('campus');
 constructor(established:boolean){const k=this.k,box=(p:THREE.Object3D,s:[number,number,number],v:[number,number,number],c:string)=>k.box(p,s,v,c,.025);
  this.group.name='rival-city-block';box(this.group,[220,.08,220],[0,-.3,0],'#c9d8d0');
  // One connected corner street, with a small amount of neighborhood context.
  box(this.group,[80,.08,3.4],[0,-.18,13.4],'#54666a');box(this.group,[3.4,.08,70],[-18,-.18,-6],'#54666a');
  for(const z of [11.2,15.6])box(this.group,[80,.07,.8],[0,-.09,z],'#f2e8ce');
  for(const x of [-20.2,-15.8])box(this.group,[.8,.07,70],[x,-.09,-6],'#f2e8ce');
  for(let x=-35;x<36;x+=5)box(this.group,[1.6,.02,.06],[x,-.12,13.4],'#f5e4b9');for(let z=-32;z<29;z+=5)box(this.group,[.06,.02,1.6],[-18,-.12,z],'#f5e4b9');
  for(let i=0;i<5;i++)box(this.group,[.32,.025,2.7],[-15+i*.65,-.11,13.4],'#faf1d7');
  // Sidewalk wraps the actual property; no walls or scenery inside the drop lanes.
  for(const x of [-14.8,14.8])box(this.group,[.6,.07,21.4],[x,-.07,0],'#eee6d1');box(this.group,[30,.07,.6],[0,-.07,-10.8],'#eee6d1');
  const properties=[[-23,-5,2],[-23,5,4],[-8,-16,0],[3,-17,1],[19,-6,3],[20,5,8]];
  properties.forEach(([x,z,variant],i)=>{box(this.group,[9.2,.12,8.7],[x,-.15,z],'#deddd0');const property=new THREE.Group();property.position.set(x,-.08,z);property.scale.setScalar(.82);property.rotation.y=i===0?Math.PI/2:i===4?-Math.PI/2:0;this.group.add(property);districtBuilding(property,(variant+(established?1:0))%10,box,false);
   // Parking and a planted strip belong to each lot, rather than empty grass.
   box(this.group,[8,.05,1.5],[x,-.045,z+4.8],'#6d7d7e');for(let n=-3;n<=3;n+=1.5)box(this.group,[.045,.02,1.1],[x+n,-.01,z+4.8],'#f6eacb');
   box(this.group,[6,.16,.7],[x,.01,z-4.3],'#f2e8cf');for(const dx of [-2,0,2])k.box(this.group,[.8,.5,.65],[x+dx,.32,z-4.3],'#91b584',.16);
  });
  for(const [x,z] of [[-14.7,-8],[14.7,-8],[-14.7,8],[14.7,8],[-11,11],[9,11]]){box(this.group,[.9,.18,.9],[x,.01,z],'#f2e8ce');k.tree(this.group,x,z,.56);}
  for(const x of [-13,11]){box(this.group,[.12,2.8,.12],[x,1.35,10.9],'#31566a');box(this.group,[.65,.12,.38],[x,2.8,10.9],'#f9edc8');}
  const meshes:THREE.Mesh[]=[];this.group.updateMatrixWorld(true);this.group.traverse(n=>{if(n instanceof THREE.Mesh&&n.parent!==this.group)meshes.push(n);});for(const m of meshes)this.group.attach(m);k.batchStatic(this.group,'rival-city-block');const materials=new Set<THREE.Material>();this.group.traverse(n=>{if(n instanceof THREE.Mesh){n.castShadow=false;n.raycast=()=>{};for(const material of Array.isArray(n.material)?n.material:[n.material])materials.add(material);}});
  // A horizontal atmospheric falloff hides street ends in every camera direction.
  // Only this backdrop's materials are changed; playable buildings stay crisp.
  for(const material of materials){material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 vDistrictWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvDistrictWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
   shader.fragmentShader='varying vec3 vDistrictWorld;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','#include <fog_fragment>\ngl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(0.71,0.918,0.98),smoothstep(23.,36.,length(vDistrictWorld.xz)));');
  };material.customProgramCacheKey=()=> 'rival-neighborhood-haze-v1';}

 }
 dispose(){this.k.dispose();}
}
