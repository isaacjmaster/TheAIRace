import {CampusLawn} from './CampusLawn';
import {FOUNDATION_PLOT as P,FOUNDATION_PLOT_WIDTH as W,FOUNDATION_PLOT_DEPTH as D} from '../../shared/foundation-plot';
import {districtBuilding} from './DistrictBuildings';
import {DistrictTraffic} from './DistrictTraffic';
import * as THREE from 'three';
import {WorldKit} from './world';
import {FOUNDATION_BUILDINGS,buildingLayout,footprint,type FoundationState} from '../../shared/foundation';

/** Read-only presentation switch. No storage, identity or simulation state involved. */
export function districtEnabled(){return typeof location==='undefined'||new URLSearchParams(location.search).get('landscape')!=='legacy';}
const C={asphalt:'#536b73',concrete:'#e3dfcf',curb:'#f4efdd',grass:'#a3c78b',hedge:'#609b78',glass:'#7bbfc9',navy:'#345b70'};
/** Scenery only. Solid details stay outside the authoritative play area. */
export class TechnologyDistrict{
 readonly group=new THREE.Group();private k=new WorldKit('campus');private geometries=new Map<string,THREE.BoxGeometry>();private lots=new THREE.Group();private lotsKey='';private lotInstances?:THREE.InstancedMesh;private lotEdges?:THREE.LineSegments;private traffic:DistrictTraffic;private lawn?:CampusLawn;readonly architectureCounts=new Map<string,number>();
 constructor(readonly kind:'hq'|'raid',campus?:{halfX:number;halfZ:number}){
  this.group.name='technology-district-'+kind;this.lots.name='property-aprons';
  const hq=kind==='hq',cx=hq?(P.minX+P.maxX)/2:0,cz=hq?(P.minZ+P.maxZ)/2:0,hx=campus?.halfX??(hq?W/2:12.5),hz=campus?.halfZ??(hq?D/2:8.5);
  // The protected campus retains its original lawn. Everything beyond it is a
  // developed street-and-property network, rather than offices on a grass plane.
  this.block(this.group,[2000,.04,2000],[0,-.2,0],campus?C.grass:'#bac3bd');
  if(campus){this.lawn=new CampusLawn(220,220);this.lawn.mesh.position.set(0,-.17,0);}else if(hq){this.lawn=new CampusLawn(hx*2+3,hz*2+3);this.lawn.mesh.position.set(cx,-.12,cz);}else this.block(this.group,[hx*2+3,.04,hz*2+3],[cx,-.14,cz],C.grass);
  const roadX=hx+5.2,roadZ=hz+5.2,step=15.5;
  const axis=(half:number)=>{const n=hq?4:Math.ceil(half*2/16);return [...(campus?[]:[-half-step*2]),-half-step,...Array.from({length:n+1},(_,i)=>-half+half*2*i/n),half+step,...(campus?[]:[half+step*2])];};
  const xs=axis(roadX),zs=axis(roadZ),outerX=xs.at(-1)!,outerZ=zs.at(-1)!;
  for(const z of zs){if(Math.abs(z)>=roadZ-.01)this.street(cx,cz+z,outerX*2+(campus?4.2:25),false);else for(const sign of [-1,1])this.street(cx+sign*(roadX+outerX+(campus?2.1:25))/2,cz+z,outerX+(campus?2.1:25)-roadX,false);}
  for(const x of xs){if(Math.abs(x)>=roadX-.01)this.street(cx+x,cz,outerZ*2+(campus?4.2:25),true);else for(const sign of [-1,1])this.street(cx+x,cz+sign*(roadZ+outerZ+(campus?2.1:25))/2,outerZ+(campus?2.1:25)-roadZ,true);}
  // Intersections continue into adjacent blocks in both directions.
  for(const x of xs)for(const z of zs){if(Math.abs(x)<roadX-.01&&Math.abs(z)<roadZ-.01)continue;if(Math.abs(x)>outerX-1||Math.abs(z)>outerZ-1)continue;this.crossing(cx+x,cz+z-2.8,false,4.2);this.crossing(cx+x+2.8,cz+z,true,4.2);}
  for(let ix=0;ix<xs.length-1;ix++)for(let iz=0;iz<zs.length-1;iz++){
   const x=(xs[ix]+xs[ix+1])/2,z=(zs[iz]+zs[iz+1])/2;
   if(Math.abs(x)<roadX&&Math.abs(z)<roadZ)continue;
   const w=xs[ix+1]-xs[ix]-4.4,d=zs[iz+1]-zs[iz]-4.4,variant=(ix*3+iz*7)%10;
   const lot=new THREE.Group();lot.position.set(cx+x,0,cz+z);lot.name='urban-property-'+ix+'-'+iz;this.group.add(lot);
   this.block(lot,[w,.045,d],[0,-.12,0],'#d0d4ce');
   for(const sign of [-1,1]){this.block(lot,[w,.07,.5],[0,-.075,sign*d/2],C.concrete);this.block(lot,[.5,.07,d],[sign*w/2,-.075,0],C.concrete);}
   const property=new THREE.Group();property.position.set(-1.05,0,-.65);property.rotation.y=(variant%4)*Math.PI/2;lot.add(property);
   const architecture=districtBuilding(property,variant,this.block.bind(this),Math.abs(x)<roadX+20&&Math.abs(z)<roadZ+20);
   this.architectureCounts.set(architecture.name,(this.architectureCounts.get(architecture.name)||0)+1);
   // Alternate parking court layouts instead of repeating a single little bay.
   if(variant%2===0){this.block(lot,[2.6,.025,d-1],[w/2-1.6,-.085,0],C.asphalt);for(let i=0;i<4;i++)this.block(lot,[2.3,.012,.05],[w/2-1.6,-.065,-d/2+1.1+i*(d-2.2)/3],C.curb);}
   else{this.block(lot,[w-1,.025,2.1],[0,-.085,d/2-1.3],C.asphalt);for(let i=0;i<4;i++)this.block(lot,[.055,.012,1.8],[-w/2+1+i*(w-2)/3,-.065,d/2-1.3],C.curb);}
   const parkX=variant%2?-2:w/2-1.6,parkZ=variant%2?d/2-1.3:-1;this.block(lot,[1.2,.42,2.2],[parkX,.15,parkZ],variant%3?'#a5b7ae':'#d3bd96');this.block(lot,[1.1,.15,.9],[parkX,.43,parkZ],C.navy);
   this.block(lot,[2,.025,1.4],[-w/2+1.3,-.08,d/2-1.1],C.grass);
   this.tree(cx+x-w/2+.9,cz+z-d/2+.9,.68);
   this.block(lot,[2,.3,.6],[0,.08,-d/2+.7],C.hedge);
   // Low signposts and occasional streetlights are on the sidewalk, never in the base.
   if((ix+iz)%3===0){this.lamp(cx+x+w/2-.3,cz+z-d/2+.4);this.block(lot,[.12,1,.12],[w/2-.6,.4,d/2-.4],C.navy);this.block(lot,[.65,.3,.08],[w/2-.6,.95,d/2-.4],'#84a5a4');}
  }
  // An inner promenade defines the edge of the original functional campus.
  for(const sign of [-1,1]){
   this.block(this.group,[hx*2+3,.08,1.2],[cx,-.075,cz+sign*(hz+1)],C.concrete);
   this.block(this.group,[hx*2+3,.12,.18],[cx,-.055,cz+sign*(hz+1.65)],C.curb);
   const intervals=[[cz-hz-.4,cz+hz+.4]];
   for(const [from,to]of intervals){this.block(this.group,[1.2,.08,to-from],[cx+sign*(hx+1),-.075,(from+to)/2],C.concrete);this.block(this.group,[.18,.12,to-from],[cx+sign*(hx+1.65),-.055,(from+to)/2],C.curb);}
   for(let x=-hx+3;x<hx;x+=9){this.tree(cx+x,cz+sign*(hz+2.4),.75);this.block(this.group,[2.4,.32,.7],[cx+x+2.5,.08,cz+sign*(hz+2.4)],C.hedge);this.lamp(cx+x+4.4,cz+sign*(hz+1.6));}
   for(let z=-hz+3;z<hz;z+=9)this.tree(cx+sign*(hx+2.5),cz+z,.75);
  }
  this.group.updateMatrixWorld(true);const nested:THREE.Mesh[]=[];this.group.traverse(o=>{if(o instanceof THREE.Mesh&&o.parent!==this.group)nested.push(o);});for(const mesh of nested)this.group.attach(mesh);
  this.k.batchStatic(this.group,'technology-district-'+kind);
  // Background offices receive the existing light but do not add a city-sized shadow pass.
  this.group.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=false;});this.group.add(this.lots);if(this.lawn)this.group.add(this.lawn.mesh);this.noPicking(this.group);
  this.traffic=new DistrictTraffic(cx,cz,roadX,roadZ);this.group.add(this.traffic.group);
 }
 update(dt:number,width:number,height:number,reduced=false,hidden=false){this.traffic.update(dt,width,height,reduced,hidden);}

 private block(parent:THREE.Object3D,size:[number,number,number],p:[number,number,number],color:string){const key=size.join(',');let geo=this.geometries.get(key);if(!geo){geo=new THREE.BoxGeometry(...size);this.geometries.set(key,geo);}const mesh=new THREE.Mesh(geo,this.k.mat(color));mesh.position.set(...p);mesh.castShadow=size[1]>.3;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 private street(x:number,z:number,length:number,vertical:boolean,width=4.2){
  this.block(this.group,vertical?[width,.06,length]:[length,.06,width],[x,-.12,z],C.asphalt);
  for(let t=-length/2+2;t<length/2-1;t+=4.3)this.block(this.group,vertical?[.07,.012,1.7]:[1.7,.012,.07],[x+(vertical?0:t),-.083,z+(vertical?t:0)],'#f2e9c9');
 }
 private crossing(x:number,z:number,vertical:boolean,width:number){for(let i=-2;i<=2;i++)this.block(this.group,vertical?[width-.5,.012,.22]:[.22,.012,width-.5],[x+(vertical?0:i*.42),-.078,z+(vertical?i*.42:0)],C.curb);}
 private lamp(x:number,z:number){this.block(this.group,[.12,2.2,.12],[x,1,z],C.navy);this.block(this.group,[.75,.12,.32],[x+.22,2.15,z],C.navy);this.block(this.group,[.56,.035,.23],[x+.22,2.075,z],'#ffe3a0');}
 private tree(x:number,z:number,scale:number){this.block(this.group,[1.5,.12,1.5],[x,-.035,z],C.concrete);this.k.tree(this.group,x,z,scale);}
 /** Flat property aprons follow existing position/rotation, never add solid clutter. */
 syncLots(state:FoundationState,placed?:Set<string>){if(this.kind!=='hq')return;const rects=FOUNDATION_BUILDINGS.filter(kind=>!placed||placed.has(kind)).flatMap(kind=>{const l=buildingLayout(state,kind);return l?[{kind,...footprint(kind,l)}]:[];});const key=JSON.stringify(rects);if(key===this.lotsKey)return;this.lotsKey=key;
  this.lotInstances?.dispose();this.lotEdges?.geometry.dispose();(this.lotEdges?.material as THREE.Material|undefined)?.dispose();this.lots.clear();
  const unit=this.geometries.get('1,1,1')??new THREE.BoxGeometry(1,1,1);this.geometries.set('1,1,1',unit);
  this.lotInstances=new THREE.InstancedMesh(unit,this.k.mat(C.concrete),rects.length);this.lotInstances.receiveShadow=true;const pose=new THREE.Object3D(),lines:number[]=[];
  for(let i=0;i<rects.length;i++){const a=rects[i],w=a.w+.35,d=a.d+.35;pose.position.set(a.x,-.095,a.z);pose.scale.set(w,.025,d);pose.updateMatrix();this.lotInstances.setMatrixAt(i,pose.matrix);const l=a.x-w/2,r=a.x+w/2,t=a.z-d/2,b=a.z+d/2;lines.push(l,-.077,t,r,-.077,t,r,-.077,t,r,-.077,b,r,-.077,b,l,-.077,b,l,-.077,b,l,-.077,t);}
  this.lotInstances.instanceMatrix.needsUpdate=true;this.lotInstances.computeBoundingSphere();this.lots.add(this.lotInstances);
  const edges=new THREE.BufferGeometry();edges.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));this.lotEdges=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:C.curb}));this.lots.add(this.lotEdges);this.noPicking(this.lots);
 }

 private noPicking(parent:THREE.Object3D){parent.traverse(o=>{o.raycast=()=>{};o.userData.decorative=true;});}
 dispose(){this.lawn?.dispose();this.traffic.dispose();this.lotInstances?.dispose();this.lotEdges?.geometry.dispose();(this.lotEdges?.material as THREE.Material|undefined)?.dispose();this.group.removeFromParent();for(const geo of this.geometries.values())geo.dispose();this.k.dispose();}
}
