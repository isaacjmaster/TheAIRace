import {DistrictTraffic} from './DistrictTraffic';
import * as THREE from 'three';
import {WorldKit} from './world';
import {districtBuilding} from './DistrictBuildings';
/** A defined campus arena inside a continuous city district. No fog, cloud mesh or gradient mask. */
export class InfiltrationDistrict{
 readonly group=new THREE.Group();private k=new WorldKit('campus');private traffic:DistrictTraffic;
 constructor(established:boolean,spacious=true){const k=this.k,hx=spacious?25:18,hz=spacious?21:13.4;this.traffic=new DistrictTraffic(0,0,hx,hz);const box=(p:THREE.Object3D,s:[number,number,number],v:[number,number,number],c:string)=>k.box(p,s,v,c,.025);
 this.group.name='defined-rival-city';box(this.group,[240,.12,240],[0,-.4,0],'#c9d6d5');
 for(const z of [-hz,hz]){box(this.group,[hx*2+4,.08,3.4],[0,-.18,z],'#465c62');for(const side of [-1,1])box(this.group,[hx*2+5,.1,.85],[0,-.1,z+side*2.1],'#f4e8cd');for(let x=-hx+5;x<hx-3;x+=5)box(this.group,[1.6,.025,.07],[x,-.12,z],'#ecddb4');}
 for(const x of [-hx,hx]){box(this.group,[3.4,.08,hz*2+4],[x,-.18,0],'#465c62');for(const side of [-1,1])box(this.group,[.85,.1,hz*2+5],[x+side*2.1,-.1,0],'#f4e8cd');for(let z=-hz+5;z<hz-3;z+=5)box(this.group,[.07,.025,1.6],[x,-.12,z],'#ecddb4');}
 for(const x of [-hx+4,hx-4])for(let i=0;i<5;i++)box(this.group,[.32,.025,2.6],[x+i*.65,-.11,hz],'#fff2d9');
 const properties=spacious?[[-33,-12,2],[-33,0,4],[-33,12,6],[-13,-29,0],[0,-29,1],[13,-29,5],[33,-12,3],[33,0,8],[33,12,7],[-13,29,6],[0,29,9],[13,29,7]]:[[-25,-7,2],[-25,5,4],[-11,-21,0],[0,-21,1],[11,-21,5],[25,-6,3],[25,6,8],[-10,21,6],[1,21,9],[12,21,7]];
 properties.forEach(([x,z,variant],i)=>{box(this.group,[10,.16,9.5],[x,-.16,z],'#e3dfcb');const p=new THREE.Group();p.position.set(x,-.08,z);p.scale.setScalar(.9);p.rotation.y=i%4===0?Math.PI/2:i%4===2?-Math.PI/2:0;this.group.add(p);districtBuilding(p,(variant+(established?1:0))%10,box,false);box(this.group,[8.4,.06,1.7],[x,-.04,z+5.2],'#687c7c');for(let n=-3;n<=3;n+=1.5)box(this.group,[.045,.025,1.3],[x+n,0,z+5.2],'#fff2d9');k.grounding(this.group,9,8,x,z);for(const dx of [-4,4]){k.tree(this.group,x+dx,z-3,.65);box(this.group,[1.4,.16,1.4],[x+dx,-.03,z-3],'#f7ebd2');}box(this.group,[7,.18,.65],[x,.05,z-4.6],'#f7ebd2');for(const dx of [-2,0,2])k.box(this.group,[.8,.5,.6],[x+dx,.35,z-4.6],'#88ac72',.15);});
 // The outer block and skyline make the arena read as a location within a city.
 for(const z of [-42,42]){box(this.group,[120,.1,5],[0,-.2,z],'#526d77');for(let i=0;i<7;i++){const x=-48+i*16,g=new THREE.Group();g.position.set(x,-.1,z+Math.sign(z)*8);g.scale.set(1.2+(i%3)*.2,1.2+(i%4)*.35,1.2);this.group.add(g);districtBuilding(g,(i+3)%10,box,false);}}
 for(const x of [-43,43])box(this.group,[4,.1,120],[x,-.2,0],'#526d77');
 for(const x of [-hx+3,hx-3])for(const z of [-hz+4,hz-4]){box(this.group,[.14,3,.14],[x,1.4,z],'#355d70');box(this.group,[.8,.12,.45],[x,2.95,z],'#ffe5ae');}
 const ax=spacious?21:14,az=spacious?17:10;
 for(const x of [-ax-.7,ax+.7]){box(this.group,[.8,.24,az*2+2],[x,-.03,0],'#f2e2be');for(const z of [-az+2,0,az-2]){box(this.group,[.75,.25,1.7],[x,.16,z],'#fff0d2');k.tree(this.group,x,z,.55);}}
 for(const z of [-az-.7,az+.7])box(this.group,[ax*2+2,.24,.8],[0,-.03,z],'#f2e2be');
 const meshes:THREE.Mesh[]=[];this.group.updateMatrixWorld(true);this.group.traverse(n=>{if(n instanceof THREE.Mesh&&n.parent!==this.group)meshes.push(n);});for(const mesh of meshes)this.group.attach(mesh);k.batchStatic(this.group,'defined-rival-city');this.group.traverse(n=>{if(n instanceof THREE.Mesh){n.castShadow=false;n.raycast=()=>{};}});this.group.add(this.traffic.group);
 }
 update(dt:number,width:number,height:number,reduced:boolean){this.traffic.update(dt,width,height,reduced,document.hidden);}
 dispose(){this.traffic.dispose();this.k.dispose();}
}
