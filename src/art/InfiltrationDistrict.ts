import {MapBoundary} from './MapBoundary';
import {DistrictTraffic} from './DistrictTraffic';
import * as THREE from 'three';
import {WorldKit} from './world';
import {districtBuilding} from './DistrictBuildings';
/** A compact, developed neighborhood. Scenery never joins navigation or picking. */
export class InfiltrationDistrict{
 readonly group=new THREE.Group();private k=new WorldKit('campus');private clouds=new MapBoundary();private traffic=new DistrictTraffic(0,0,18,13.4);
 constructor(established:boolean){const k=this.k,box=(p:THREE.Object3D,s:[number,number,number],v:[number,number,number],c:string)=>k.box(p,s,v,c,.025);
  this.group.name='rival-city-block';box(this.group,[220,.08,220],[0,-.3,0],'#c9d8d0');
  // A compact connected street loop encloses the encounter's city block.
  box(this.group,[40,.08,3.4],[0,-.18,13.4],'#54666a');box(this.group,[3.4,.08,30],[-18,-.18,0],'#54666a');box(this.group,[3.4,.08,30],[18,-.18,0],'#54666a');box(this.group,[40,.08,3.4],[0,-.18,-13.4],'#54666a');
  for(const z of [-15.6,-11.2,11.2,15.6])box(this.group,[40,.07,.8],[0,-.09,z],'#f2e8ce');
  for(const x of [-20.2,-15.8,15.8,20.2])box(this.group,[.8,.07,30],[x,-.09,0],'#f2e8ce');
  for(let x=-15;x<16;x+=5)box(this.group,[1.6,.02,.06],[x,-.12,13.4],'#f5e4b9');for(let z=-10;z<11;z+=5)box(this.group,[.06,.02,1.6],[-18,-.12,z],'#f5e4b9');
  for(let i=0;i<5;i++)box(this.group,[.32,.025,2.7],[-15+i*.65,-.11,13.4],'#faf1d7');
  // Sidewalk wraps the actual property; no walls or scenery inside the drop lanes.
  for(const x of [-14.8,14.8])box(this.group,[.6,.07,21.4],[x,-.07,0],'#eee6d1');box(this.group,[30,.07,.6],[0,-.07,-10.8],'#eee6d1');
  const properties=[[-25,-7,2],[-25,5,4],[-11,-21,0],[0,-21,1],[11,-21,5],[25,-6,3],[25,6,8],[-10,21,6],[1,21,9],[12,21,7]];
  properties.forEach(([x,z,variant],i)=>{box(this.group,[9.2,.12,8.7],[x,-.15,z],'#deddd0');const property=new THREE.Group();property.position.set(x,-.08,z);property.scale.setScalar(.82);property.rotation.y=i===0?Math.PI/2:i===4?-Math.PI/2:0;this.group.add(property);districtBuilding(property,(variant+(established?1:0))%10,box,false);
   // Parking and a planted strip belong to each lot, rather than empty grass.
   box(this.group,[8,.05,1.5],[x,-.045,z+4.8],'#6d7d7e');for(let n=-3;n<=3;n+=1.5)box(this.group,[.045,.02,1.1],[x+n,-.01,z+4.8],'#f6eacb');
   box(this.group,[6,.16,.7],[x,.01,z-4.3],'#f2e8cf');for(const dx of [-2,0,2])k.box(this.group,[.8,.5,.65],[x+dx,.32,z-4.3],'#91b584',.16);
  });
  for(const [x,z] of [[-14.7,-8],[14.7,-8],[-14.7,8],[14.7,8],[-11,11],[9,11]]){box(this.group,[.9,.18,.9],[x,.01,z],'#f2e8ce');k.tree(this.group,x,z,.56);}
  for(const x of [-13,11]){box(this.group,[.12,2.8,.12],[x,1.35,10.9],'#31566a');box(this.group,[.65,.12,.38],[x,2.8,10.9],'#f9edc8');}
  const meshes:THREE.Mesh[]=[];this.group.updateMatrixWorld(true);this.group.traverse(n=>{if(n instanceof THREE.Mesh&&n.parent!==this.group)meshes.push(n);});for(const m of meshes)this.group.attach(m);k.batchStatic(this.group,'rival-city-block');const materials=new Set<THREE.Material>();this.group.traverse(n=>{if(n instanceof THREE.Mesh){n.castShadow=false;n.raycast=()=>{};for(const material of Array.isArray(n.material)?n.material:[n.material])materials.add(material);}});
  this.clouds.group.scale.setScalar(.8);this.clouds.group.position.set(-1.6,0,-2);for(const name of ['continuous-mountain-rim','outer-rim-boulders'])this.clouds.group.getObjectByName(name)!.visible=false;this.group.add(this.clouds.group,this.traffic.group);
 }
 update(dt:number,width:number,height:number,reduced:boolean){this.clouds.update(dt,reduced);this.traffic.update(dt,width,height,reduced,document.hidden);}
 dispose(){this.clouds.dispose();this.traffic.dispose();this.k.dispose();}
}
