import * as THREE from 'three';
export type TrafficPose={x:number;z:number;yaw:number};
const R=2.4;
export function trafficRouteLength(hx:number,hz:number){return 4*(hx+hz-2*R)+2*Math.PI*R;}
/** Arc-length sampling gives constant speed and tangent-aligned rounded turns. */
export function trafficPose(distance:number,hx:number,hz:number,direction:1|-1,out:TrafficPose){
 const length=trafficRouteLength(hx,hz);let d=((distance*direction)%length+length)%length;const xs=2*(hx-R),zs=2*(hz-R),arc=Math.PI*R/2;
 let i=0;while(i<7){const span=i%2?arc:i%4===0?xs:zs;if(d<span)break;d-=span;i++;}
 let dx=0,dz=0;
 if(i===0){out.x=-hx+R+d;out.z=-hz;dx=1;}
 else if(i===2){out.x=hx;out.z=-hz+R+d;dz=1;}
 else if(i===4){out.x=hx-R-d;out.z=hz;dx=-1;}
 else if(i===6){out.x=-hx;out.z=hz-R-d;dz=-1;}
 else{const angle=(i===1?-Math.PI/2:i===3?0:i===5?Math.PI/2:Math.PI)+d/R;const cx=i===1||i===3?hx-R:-hx+R,cz=i===1||i===7?-hz+R:hz-R;out.x=cx+Math.cos(angle)*R;out.z=cz+Math.sin(angle)*R;dx=-Math.sin(angle);dz=Math.cos(angle);}
 out.yaw=Math.atan2(dx*direction,dz*direction);return out;
}
type Part={x:number;y:number;z:number;w:number;h:number;d:number;color:string};
/** One instanced draw for up to eight vehicles; no physics, audio, lights or server state. */
export class DistrictTraffic{
 readonly group=new THREE.Group();private geometry=new THREE.BoxGeometry(1,1,1);private material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.6,metalness:.08});private mesh:THREE.InstancedMesh;private clock=0;private scratch=new THREE.Object3D();private pose:TrafficPose={x:0,z:0,yaw:0};private parts:Part[][]=[];private color=new THREE.Color();private active=0;
 constructor(private cx:number,private cz:number,private hx:number,private hz:number){
  this.group.name='ambient-traffic';const colors=['#d29a63','#e5d7bc','#719da9','#768a9c','#ad7c72','#92a58b','#c8ae6a','#729c9b'];
  for(let car=0;car<8;car++){const van=car%4===3,suv=car%4===2,l=van?2.05:suv?1.8:1.65,h=van?.68:suv?.48:.35,w=suv?.95:.85;const parts:Part[]=[{x:0,y:.34,z:0,w,h:.3,d:l,color:colors[car]},{x:0,y:.5+h/2,z:van?-.1:-.12,w:w-.12,h,d:van?1.35:1,color:colors[car]},{x:0,y:.54+h*.45,z:.43,w:w-.2,h:h*.7,d:.045,color:'#344e60'},{x:0,y:.49+h*.5,z:van?-.8:-.65,w:w-.2,h:h*.65,d:.035,color:'#344e60'}];
   for(const x of [-w/2,w/2])for(const z of [-l*.31,l*.31])parts.push({x,y:.15,z,w:.14,h:.27,d:.34,color:'#35454c'});
   for(const x of [-.27,.27]){parts.push({x,y:.36,z:l/2+.015,w:.18,h:.09,d:.04,color:'#f8e6b9'});parts.push({x,y:.36,z:-l/2-.015,w:.18,h:.08,d:.04,color:'#b76c5d'});}this.parts.push(parts);
  }
  this.mesh=new THREE.InstancedMesh(this.geometry,this.material,8*12);this.mesh.castShadow=false;this.mesh.receiveShadow=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.frustumCulled=false;this.group.add(this.mesh);this.group.traverse(o=>{o.raycast=()=>{};o.userData.decorative=true;});this.update(0,1280,900,false,false);
 }
 update(dt:number,width:number,height:number,reduced=false,hidden=false){
  if(hidden)return;this.active=width>=900&&height>=500?8:4;if(!reduced)this.clock+=Math.min(.1,Math.max(0,dt));let index=0;
  for(let car=0;car<this.active;car++){const direction=car%2? -1:1,hx=this.hx+(direction===1?-.85:.85),hz=this.hz+(direction===1?-.85:.85),length=trafficRouteLength(hx,hz),slot=Math.floor(car/2),perLane=this.active/2;
   trafficPose(this.clock*3.3+slot*length/perLane+(direction===1?length*.11:length*.24),hx,hz,direction,this.pose);const sin=Math.sin(this.pose.yaw),cos=Math.cos(this.pose.yaw);
   for(const p of this.parts[car]){this.scratch.position.set(this.cx+this.pose.x+p.x*cos+p.z*sin,p.y-.075,this.cz+this.pose.z-p.x*sin+p.z*cos);this.scratch.rotation.set(0,this.pose.yaw,0);this.scratch.scale.set(p.w,p.h,p.d);this.scratch.updateMatrix();this.mesh.setMatrixAt(index,this.scratch.matrix);this.mesh.setColorAt(index++,this.color.set(p.color));}
  }
  this.mesh.count=index;this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;
 }
 get count(){return this.active;}
 dispose(){this.group.removeFromParent();this.mesh.dispose();this.geometry.dispose();this.material.dispose();}
}
