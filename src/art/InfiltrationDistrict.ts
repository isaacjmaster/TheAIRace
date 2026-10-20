import * as THREE from 'three';
import {TechnologyDistrict} from './TechnologyDistrict';
import {WorldKit} from './world';
/** The actual HQ neighborhood renderer, sized for the rival campus. HQ defaults are unchanged. */
export class InfiltrationDistrict{
 readonly group=new THREE.Group();private district:TechnologyDistrict;private k=new WorldKit('campus');
 constructor(_established:boolean,spacious=true){this.district=new TechnologyDistrict('raid',{halfX:spacious?21:14,halfZ:spacious?17:10});this.group.name='hq-style-rival-neighborhood';this.group.add(this.district.group);
 // A planted terraced edge behind the compact neighborhood, all outside navigation.
 const hx=(spacious?21:14)+23.7,hz=(spacious?17:10)+23.7;
 for(const side of [-1,1]){this.k.box(this.group,[hx*2+2,.3,1],[0,-.05,side*hz],'#c9c8a7',.1);this.k.box(this.group,[1,.3,hz*2+2],[side*hx,-.05,0],'#c9c8a7',.1);
 for(let i=-40;i<=40;i+=6){for(const [x,z]of [[i,side*(hz+2)],[side*(hx+2),i]]){this.k.tree(this.group,x,z,.8+(i%5)*.035);this.k.boulder(this.group,[x+1.8,-.1,z+.6],[1.3,.45,1.1],'#9bae83',i);}}}
 this.k.batchStatic(this.group,'rival-planted-boundary');this.group.traverse(n=>{n.raycast=()=>{};});
 }
 update(dt:number,width:number,height:number,reduced:boolean){this.district.update(dt,width,height,reduced,document.hidden);}
 dispose(){this.district.dispose();this.k.dispose();}
}
