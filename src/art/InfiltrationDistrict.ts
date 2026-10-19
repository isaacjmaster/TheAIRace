import * as THREE from 'three';
import {WorldKit} from './world';
import {districtBuilding} from './DistrictBuildings';
/** Mission-only backdrop: a single campus street and distant businesses, never gameplay solids. */
export class InfiltrationDistrict{
 readonly group=new THREE.Group();private k=new WorldKit('campus');
 constructor(established:boolean){const k=this.k,box=(p:THREE.Object3D,s:[number,number,number],v:[number,number,number],c:string)=>k.box(p,s,v,c,.025);
  this.group.name='quiet-rival-district';box(this.group,[1000,.08,1000],[0,-.3,0],'#c5cec4');
  for(const z of [-12,12]){box(this.group,[150,.08,3],[0,-.18,z],'#637980');for(const side of [-1,1])box(this.group,[150,.07,.65],[0,-.09,z+side*1.9],'#e1ded1');for(let x=-35;x<=35;x+=5)box(this.group,[1.8,.02,.06],[x,-.12,z],'#ece0b9');}
  for(const x of [-14,14]){box(this.group,[.8,.08,20],[x,-.1,0],'#e1ded1');for(const z of [-7,0,7]){box(this.group,[1.8,.16,2],[x,-.04,z],'#a6b99b');k.tree(this.group,x,z,.65);}}
  for(const [i,x,z]of [[0,-18,-21],[1,0,-22],[2,18,-21],[3,-23,7],[4,23,-3]] as const){const property=new THREE.Group();property.position.set(x,-.1,z);property.scale.setScalar(.8);this.group.add(property);districtBuilding(property,(i+(established?3:0))%10,box,false);}
  const meshes:THREE.Mesh[]=[];this.group.updateMatrixWorld(true);this.group.traverse(n=>{if(n instanceof THREE.Mesh&&n.parent!==this.group)meshes.push(n);});for(const m of meshes)this.group.attach(m);k.batchStatic(this.group,'quiet-rival-district');this.group.traverse(n=>{if(n instanceof THREE.Mesh){n.castShadow=false;n.raycast=()=>{};}});
 }
 dispose(){this.k.dispose();}
}
