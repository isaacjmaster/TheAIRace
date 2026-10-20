import * as THREE from 'three';
import {TechnologyDistrict} from './TechnologyDistrict';
import {districtBuilding} from './DistrictBuildings';
import {WorldKit} from './world';
/** The actual HQ neighborhood renderer, sized for the rival campus. HQ defaults are unchanged. */
export class InfiltrationDistrict{
 readonly group=new THREE.Group();private district:TechnologyDistrict;private k=new WorldKit('campus');
 constructor(_established:boolean,spacious=true){this.district=new TechnologyDistrict('raid',{halfX:spacious?21:14,halfZ:spacious?17:10});this.group.name='hq-style-rival-neighborhood';this.group.add(this.district.group);
 // A planted terraced edge behind the compact neighborhood, all outside navigation.
 const hx=(spacious?21:14)+23.7,hz=(spacious?17:10)+23.7;
 for(const side of [-1,1]){for(const [from,to]of [[-hx-1,-hx+6],[-hx+10,hx-10],[hx-6,hx+1]])this.k.box(this.group,[to-from,.3,1],[(from+to)/2,-.05,side*hz],'#c9c8a7',.1);this.k.box(this.group,[1,.3,hz*2+2],[side*hx,-.05,0],'#c9c8a7',.1);
 for(let i=-40;i<=40;i+=6){for(const [x,z]of [[i,side*(hz+2)],[side*(hx+2),i]]){if(Math.abs(z)>hz&&Math.abs(Math.abs(x)-(hx-8))<3)continue;this.k.tree(this.group,x,z,.8+(i%5)*.035);this.k.boulder(this.group,[x+1.8,-.1,z+.6],[1.3,.45,1.1],'#9bae83',i);}}}
 // A small connected fringe beyond the original loop, rather than bare ground.
 const k=this.k,box=(parent:THREE.Object3D,size:[number,number,number],position:[number,number,number],color:string)=>k.box(parent,size,position,color,.03);
 for(const side of [-1,1]){for(const x of [-18,0,18]){const z=side*(hz+11),g=new THREE.Group();g.position.set(x,-.05,z);g.rotation.y=side<0?0:Math.PI;this.group.add(g);box(g,[13,.08,10],[0,-.08,0],'#d0d4c6');districtBuilding(g,(Math.abs(x)/18+(side>0?3:7))%10,box,false);box(g,[11,.06,1.1],[0,-.01,5.1],'#f4efdd');k.tree(g,-5,3,.7);}
 box(this.group,[(hx-8)*2+3.2,.08,3.2],[0,-.12,side*(hz+5.2)],'#536b73');for(const x of [-hx+8,hx-8])box(this.group,[3.2,.08,8],[x,-.12,side*(hz+1.5)],'#536b73');for(const x of [-hx,hx])box(this.group,[1,.12,10],[x,-.05,side*(hz+5)],'#e3dfcf');
 for(let x=-hx+5;x<hx-3;x+=6)box(this.group,[1.7,.02,.07],[x,-.07,side*(hz+5.2)],'#f2e9c9');}
 this.k.batchStatic(this.group,'rival-planted-boundary');this.group.traverse(n=>{n.raycast=()=>{};});
 }
 update(dt:number,width:number,height:number,reduced:boolean){this.district.update(dt,width,height,reduced,document.hidden);}
 dispose(){this.district.dispose();this.k.dispose();}
}
