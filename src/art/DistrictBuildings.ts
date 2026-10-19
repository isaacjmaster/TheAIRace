import * as THREE from 'three';
export const DISTRICT_BUILDINGS=['courtyard-office','glass-startup','corner-cafe','research-shed','townhouses','stepped-office','design-studio','warehouse','corporate-terrace','retail-court'] as const;
type Block=(parent:THREE.Object3D,size:[number,number,number],position:[number,number,number],color:string)=>THREE.Mesh;
/** Ten background-only silhouettes. None imports or modifies a gameplay building. */
export function districtBuilding(parent:THREE.Object3D,variant:number,block:Block,detailed=true){
 const type=variant%DISTRICT_BUILDINGS.length,g=new THREE.Group();g.name=DISTRICT_BUILDINGS[type];parent.add(g);
 const wall=['#e8dec7','#c1d0d2','#e0c7ab','#d1d8c6'][variant%4],navy='#385c70',glass='#82b9c5',cream='#eee9d9',roof=['#567581','#807968','#586d82'][variant%3];
 const b=(size:[number,number,number],p:[number,number,number],color=wall)=>block(g,size,p,color);
 const front=(width:number,height:number,z:number,x=0,floors=1)=>{for(let i=0;i<floors;i++){const y=.65+i*(height-.4)/floors;b([width-.7,.5,.035],[x,y,z],glass);b([width-.7,.5,.035],[x,y,-z],glass);if(detailed)for(let j=1;j<4;j++)b([.07,.54,.06],[x-width/2+j*width/4,y,z+.025],cream);}};
 const flat=(w:number,h:number,d:number,x=0,z=0)=>{b([w,h,d],[x,h/2,z]);b([w+.3,.18,d+.3],[x,h+.06,z],roof);};
 switch(type){
 case 0:flat(4.2,2.5,5,-1.1);flat(2.8,1.6,2.6,2,1.2);front(4.2,2.5,2.52,-1.1,2);b([2.1,.12,2],[1.8,.05,-1.6],cream);break;
 case 1:flat(6,3.8,4);b([5.6,2.8,.06],[0,1.9,2.03],glass);b([5.6,2.3,.04],[0,1.9,-2.03],glass);b([.04,2.3,3.4],[3.02,1.9,0],glass);for(const x of [-2,0,2])b([.12,3,.12],[x,1.8,2.08],cream);b([6.5,.14,.8],[0,1.45,2.25],navy);break;
 case 2:flat(5.8,1.7,3.8);front(5.8,1.7,1.92);b([6.2,.18,1.2],[0,1.4,2.35],'#c58d62');b([2,.18,.12],[0,1.77,1.94],cream);for(const x of [-2,1.6]){b([.65,.1,.65],[x,.55,3.1],navy);b([.1,.5,.1],[x,.25,3.1],navy);}break;
 case 3:flat(6.8,2.1,4.6);for(const x of [-2.2,0,2.2]){b([1.6,.4,.035],[x,1.5,2.32],glass);b([1,.4,1],[x,2.4,-.5],navy);}b([1.4,1.4,.05],[2.2,.7,2.34],navy);break;
 case 4:for(let i=0;i<3;i++){const x=-2.3+i*2.3;b([2.15,2.8,4],[x,1.4,0],i%2?cream:wall);const roofPanel=b([2.25,.16,4.35],[x,2.9,0],roof);roofPanel.rotation.x=.1;for(const y of [.8,2])for(const side of [-1,1])b([1.15,.65,.04],[x,y,side*2.03],glass);b([.5,.9,.05],[x+.55,.45,2.05],navy);}break;
 case 5:flat(6.5,2,4.8);b([4,1.6,3.6],[-.9,2.8,-.5]);b([4.3,.15,3.9],[-.9,3.65,-.5],navy);front(6.5,2,2.42);front(4,3.4,1.32,-.9,3);break;
 case 6:flat(5.4,2,4.8);const panel=b([5.8,.2,5.1],[0,2.2,0],roof);panel.rotation.z=.13;front(5.4,2,2.42);b([2,.1,1.5],[1.1,2.48,-.5],navy);break;
 case 7:flat(7.4,2.4,5.6);for(const x of [-1.9,1.9]){b([2.5,1.7,.055],[x,.87,2.83],navy);if(detailed)for(let j=0;j<4;j++)b([2.3,.045,.04],[x,.4+j*.35,2.87],roof);}b([6,.45,1],[0,2.7,-1],cream);break;
 case 8:flat(6.3,3.7,4.7);front(6.3,3.7,2.37,0,3);b([3.4,.22,2.5],[-1.2,3.95,-.8],navy);b([1.3,.35,1.1],[1.6,3.93,1],'#6f9b82');b([7,.13,1.1],[0,1.45,2.7],cream);break;
 case 9:flat(3.8,1.8,4,-1.7);flat(3,2.6,4,1.8);front(3.8,1.8,2.02,-1.7);front(3,2.6,2.02,1.8,2);b([7.1,.16,.9],[0,1.4,2.35],'#579b9c');break;
 }
 if(detailed&&type!==7&&type!==6)b([.8,.4,.65],[type===9?1.8:-1,[2.5,3.8,1.7,2.1,2.9,3.7,2.5,2.4,4.1,2.6][type]+.3,-1],navy);
 return g;
}
