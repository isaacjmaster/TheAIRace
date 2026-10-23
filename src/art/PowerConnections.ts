import {fitGpuVisual} from './GpuRig';
import * as THREE from 'three';import{WorldKit,palette as C}from './world';
export type CableRect={x:number;z:number;w:number;d:number};
type P=[number,number];
const inside=(p:P,r:CableRect,pad=.35)=>Math.abs(p[0]-r.x)<r.w/2+pad&&Math.abs(p[1]-r.z)<r.d/2+pad;
/** Visual-only half-unit routing. Never participates in collision, production or saves. */
export function cableRoute(start:P,end:P,obstacles:readonly CableRect[],padding=.35):P[]{
 const step=.5,minX=Math.floor(Math.min(start[0],end[0],...obstacles.map(r=>r.x-r.w/2))-3),minZ=Math.floor(Math.min(start[1],end[1],...obstacles.map(r=>r.z-r.d/2))-3),maxX=Math.ceil(Math.max(start[0],end[0],...obstacles.map(r=>r.x+r.w/2))+3),maxZ=Math.ceil(Math.max(start[1],end[1],...obstacles.map(r=>r.z+r.d/2))+3),w=Math.ceil((maxX-minX)/step)+1,h=Math.ceil((maxZ-minZ)/step)+1;
 if(w*h>100000)return [];
 const point=(id:number):P=>[minX+id%w*step,minZ+Math.floor(id/w)*step],id=(p:P)=>Math.round((p[1]-minZ)/step)*w+Math.round((p[0]-minX)/step),a=id(start),b=id(end),seen=new Int32Array(w*h).fill(-2),queue=[a];seen[a]=-1;
 const blocked=new Uint8Array(w*h);for(let n=0;n<blocked.length;n++)blocked[n]=obstacles.some(r=>inside(point(n),r,padding))?1:0;
 if(blocked[a]||blocked[b])return [];
 for(let i=0;i<queue.length&&seen[b]===-2;i++){const n=queue[i],x=n%w;for(const next of [x>0?n-1:-1,x<w-1?n+1:-1,n>=w?n-w:-1,n<(h-1)*w?n+w:-1])if(next>=0&&seen[next]===-2&&!blocked[next]){seen[next]=n;queue.push(next);}}
 if(seen[b]===-2)return [];
 const path:P[]=[];for(let n=b;n!==-1;n=seen[n])path.push(point(n));path.reverse();path.unshift(start);path.push(end);
 const out:P[]=[];for(const p of path){if(out.length&&Math.hypot(p[0]-out.at(-1)![0],p[1]-out.at(-1)![1])<.001)continue;while(out.length>1){const a=out.at(-2)!,b=out.at(-1)!;if(Math.abs((b[0]-a[0])*(p[1]-b[1])-(b[1]-a[1])*(p[0]-b[0]))>.0001)break;out.pop();}out.push(p);}return out;
}
/** Exterior side-wall power box; its local port moves with the real HQ model. */
export function addHqPowerBox(k:WorldKit,house:THREE.Group,level:1|2){
 const box=new THREE.Group();box.name='HQ power distribution';box.position.set(level===2?4.21:3.95,2,1.65);box.rotation.y=Math.PI/2;house.add(box);
 k.box(box,[.92,1.2,.28],[0,0,0],'#364956',.08);k.box(box,[.76,1.04,.05],[0,0,.16],'#203542',.04);

 // Flat emissive emblem with shared box details, no new light source.
 k.emblem(box,[[.04,.4],[-.23,-.04],[-.02,-.04],[-.1,-.4],[.25,.09],[.04,.09]],[0,0,.2],C.cyan);
 for(const x of [-.28,.28])k.cylinder(box,.09,.16,[x,-.66,0],'#171f29');k.batchStatic(box,'hq-power-box');
 const port=new THREE.Object3D();port.name='hq-power-port';port.position.set(0,-.69,.17);box.add(port);
}
export class PowerConnections{
 readonly group=new THREE.Group();private k=new WorldKit();private geometry:THREE.BufferGeometry[]=[];private signature='';
 constructor(private ground=.12){this.group.name='GPU power cables';}
 sync(house:THREE.Object3D|undefined,rigs:readonly {id:string;model:THREE.Object3D}[],obstacles:readonly CableRect[],walls:readonly CableRect[]=[]){
  const port=house?.getObjectByName('hq-power-port');if(!port){this.clear();return;}
  for(const r of rigs)fitGpuVisual(r.model,[...obstacles,...walls]);
  // Route around the displayed casing, including any fit for a crowded saved lot.
  obstacles=obstacles.map(rect=>{const rig=rigs.find(r=>{const p=r.model.getWorldPosition(new THREE.Vector3());return Math.hypot(rect.x-p.x,rect.z-p.z)<.1;});if(!rig)return rect;const g=rig.model,odd=Math.abs(Math.sin(g.rotation.y))>.5,w=4.7*g.scale.x,d=2.65*g.scale.z;return {...rect,w:odd?d:w,d:odd?w:d};});
  house!.updateWorldMatrix(true,true);const end=port.getWorldPosition(new THREE.Vector3());
  // The concrete slab reaches local X=4.4, top Y=.375. Keep the full cable
  // radius above it, and make the ground-to-slab bend outside its rounded edge.
  // House-local points preserve this clearance through rotations and title scale.
  const localEnd=house!.worldToLocal(end.clone()),exit=house!.localToWorld(new THREE.Vector3(4.65,0,localEnd.z));exit.y=this.ground;
  const slabEdge=house!.localToWorld(new THREE.Vector3(4.56,.54,localEnd.z)),riser=house!.localToWorld(new THREE.Vector3(localEnd.x,.54,localEnd.z));
  const inputs=rigs.map(r=>{r.model.updateWorldMatrix(true,true);const candidates=[r.model.getObjectByName('gpu-power-port'),r.model.getObjectByName('gpu-power-port-left')].filter((p):p is THREE.Object3D=>!!p);const p=candidates.sort((a,b)=>a.getWorldPosition(new THREE.Vector3()).distanceToSquared(end)-b.getWorldPosition(new THREE.Vector3()).distanceToSquared(end))[0];return {...r,start:p.getWorldPosition(new THREE.Vector3()),exit:p.localToWorld(new THREE.Vector3((p.getWorldPosition(new THREE.Vector3()).distanceTo(end)<2?.14:.65)*(p.userData.exitSign??1),0,0))};});
  const key=JSON.stringify([end.toArray(),exit.toArray(),slabEdge.toArray(),riser.toArray(),inputs.map(r=>[r.id,r.start.toArray(),r.exit.toArray()]),obstacles,walls]);if(key===this.signature)return;this.clear();this.signature=key;
  for(const r of inputs){let tight=false;const routeFrom=(p:P)=>{const end:P=[exit.x,exit.z];let route=cableRoute(p,end,[...obstacles,...walls]);if(!route.length){route=cableRoute(p,end,[...obstacles,...walls],.12);tight=!!route.length;}if(!route.length)route=cableRoute(p,end,obstacles);return route;};let route=routeFrom([r.exit.x,r.exit.z]);if(!route.length){
    // A neighbouring building can cover the nearer connector's ground lead.
    // Try the opposite physical socket before giving up on this layout.
    const other=[r.model.getObjectByName('gpu-power-port'),r.model.getObjectByName('gpu-power-port-left')].filter((p):p is THREE.Object3D=>!!p).find(p=>p.getWorldPosition(new THREE.Vector3()).distanceToSquared(r.start)>.01);
    if(other){r.start=other.getWorldPosition(new THREE.Vector3());r.exit=other.localToWorld(new THREE.Vector3(.65*(other.userData.exitSign??1),0,0));route=routeFrom([r.exit.x,r.exit.z]);}
   }const buried=!route.length;if(buried)route=[[r.exit.x,r.exit.z],[exit.x,exit.z]];const ground=buried?-.22:this.ground;
   const cable=new THREE.Group();cable.name='power-cable-'+r.id;cable.userData.route=route;cable.userData.buried=buried;cable.userData.endpoints=[r.start.toArray(),end.toArray()];cable.userData.hqApproach=[exit.toArray(),slabEdge.toArray(),riser.toArray(),end.toArray()];this.group.add(cable);
   const points=[r.start.clone(),new THREE.Vector3(r.exit.x,ground+.04,r.exit.z),...route.slice(1).map(p=>new THREE.Vector3(p[0],ground,p[1])),slabEdge.clone(),riser.clone(),end.clone()];
   // Round only the ground elbows. Elevated ends run close to each machine.
   const curve=new THREE.CurvePath<THREE.Vector3>();let cursor=points[0];for(let i=1;i<points.length-1;i++){const p=points[i],next=points[i+1],radius=Math.min(tight?.015:.22,cursor.distanceTo(p)/3,p.distanceTo(next)/3),a=p.clone().add(cursor.clone().sub(p).normalize().multiplyScalar(radius)),b=p.clone().add(next.clone().sub(p).normalize().multiplyScalar(radius));curve.add(new THREE.LineCurve3(cursor,a));curve.add(new THREE.QuadraticBezierCurve3(a,p,b));cursor=b;}curve.add(new THREE.LineCurve3(cursor,points.at(-1)!));
   const geometry=new THREE.TubeGeometry(curve,Math.min(260,Math.max(24,Math.ceil(curve.getLength()*3))),.095,6,false);this.geometry.push(geometry);const mesh=new THREE.Mesh(geometry,this.k.mat('#202a32'));mesh.name='grounded-power-conduit';mesh.raycast=()=>{};cable.add(mesh);
   for(const p of [r.start,end]){const collar=this.k.box(cable,[.27,.25,.25],[p.x,p.y,p.z],'#6b7c85',.035);collar.raycast=()=>{};}
  }
 }
 setActive(id:string,active:boolean){const cable=this.group.getObjectByName('power-cable-'+id);if(cable)cable.visible=active;}
 private clear(){this.group.clear();this.geometry.forEach(g=>g.dispose());this.geometry=[];this.signature='';}
 dispose(){this.clear();this.k.dispose();this.group.removeFromParent();}
}
