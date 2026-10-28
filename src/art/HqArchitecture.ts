import * as THREE from 'three';
import {WorldKit} from './world';
import {armoredHull} from './TechnologyMaterials';

type EnergyRig={rotor?:THREE.Group;traveller?:THREE.Group;materials:THREE.MeshStandardMaterial[]};
const rigs=new WeakMap<THREE.Object3D,EnergyRig>();
const cream='#eee3ce',white='#f6eedf',graphite='#263440',dark='#14212c',steel='#687986',gold='#e8ac42',bronze='#ad783a';
/** Cosmetic only; the scene owns all resources through WorldKit. */
export function animateFounderHQEnergy(house:THREE.Object3D|undefined,time:number,reduced=false){
 const r=house&&rigs.get(house);if(!r)return;
 if(r.rotor)r.rotor.rotation.y=reduced?0:time*.12;
 if(r.traveller)r.traveller.position.y=reduced?0:((time*.21)%1)*2.1;
 r.materials.forEach((m,i)=>{m.emissiveIntensity=reduced?.48:.48+Math.sin(time*.85+i*1.9)*.09;});
}
function surfaceGeometry(radius:number,height:number,dish=false){
 const positions:number[]=[],colors:number[]=[],n=12,rings=4;
 const point=(row:number,col:number)=>{const a=col/n*Math.PI*2,r=dish?radius*row/rings:radius*Math.sin(row/rings*Math.PI/2),y=dish?height*(row/rings)**2:height*Math.cos(row/rings*Math.PI/2);return [Math.cos(a)*r,y,Math.sin(a)*r];};
 for(let row=0;row<rings;row++)for(let col=0;col<n;col++){
 const a=point(row,col),b=point(row+1,col),c=point(row+1,col+1),d=point(row,col+1);
 for(const tri of [[a,c,b],[a,d,c]]){const shade=.64+((col*7+row*3)%7)*.06;for(const p of tri){positions.push(...p);colors.push(shade,Math.min(1,shade+.12),1);}}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
export function hqArchitecture(k:WorldKit,house:THREE.Group,level:1|2|3|4|5){
 const root=new THREE.Group();root.name='hq-architecture';house.add(root);
 const energy=level===5?'#a65bff':level===4?'#26adff':'#48d9ec',skin=level===5?'#cbd0d5':cream;
 for(const [color,metalness] of [[cream,.12],[white,.1],[graphite,.35],[steel,.4],[gold,.38],[bronze,.38]] as const){const m=k.mat(color) as THREE.MeshStandardMaterial;m.metalness=metalness;m.roughness=.39;}
 const box=(g:THREE.Object3D,s:[number,number,number],p:[number,number,number],c:string,r=.04,glow=false)=>k.box(g,s,p,c,r,glow);
 const hull=(g:THREE.Object3D,w:number,h:number,d:number,p:[number,number,number],c:string,cut=.14)=>armoredHull(k,g,w,h,d,p,c,cut);
 const group=(name:string)=>{const g=new THREE.Group();g.name=name;root.add(g);return g;};
 const ring=(g:THREE.Object3D,r:number,t:number,y:number,c:string,z=-.25,glow=false)=>{const m=k.ring(g,r,t,[0,y,z],c,glow);m.rotation.x=Math.PI/2;return m;};
 const base=group('hq-founder-office');
 box(base,[8.55,.26,7.7],[0,.15,.5],steel,.08);hull(base,8.05,.36,6.7,[0,.43,0],dark);
 // The front office is deliberately open: the established founder remains visible.
 box(base,[7.65,3.45,.24],[0,2.23,-2.93],skin);for(const x of [-3.72,3.72])box(base,[.22,3.45,5.85],[x,2.23,0],level>=2?graphite:skin);
 box(base,[7.6,.54,.24],[0,.88,2.94],skin);box(base,[7.6,.20,.26],[0,4.43,2.94],graphite);
 for(const x of [-3.51,1.52])box(base,[.23,2.85,.32],[x,2.48,3.02],graphite);
 box(base,[5.04,.13,.2],[-1,1.16,3.10],bronze);box(base,[5.04,.10,.2],[-1,4.15,3.10],energy,.02,true);
 box(base,[7.1,2.8,.035],[0,2.25,-2.78],'#d8c4a4');box(base,[3.2,.035,.12],[-.9,3.53,2.7],'#ffe3b0',.01,true);
 box(base,[2.0,3.15,.28],[2.67,2.3,2.98],skin);hull(base,1.48,2.7,.35,[2.65,1.93,3.18],dark);
 box(base,[.84,2.1,.07],[2.65,1.81,3.40],level>=4?energy:'#dd902e',.04,true);
 box(base,[.1,2.10,.09],[2.65,1.81,3.45],graphite);for(const x of [1.83,3.47])hull(base,.26,2.85,.46,[x,2.02,3.22],level>=3?gold:steel,.08);
 hull(base,2.0,.32,.85,[2.65,3.45,3.2],skin);box(base,[1.4,.10,.10],[2.65,3.4,3.65],energy,.01,true);
 for(let i=0;i<3;i++)box(base,[1.65,.12,.30],[2.65,.30+i*.1,3.94-i*.23],i%2?steel:cream,.02);
 // Facade armor is divided into engineered panels; dark seams remain visible.
 for(const side of [-1,1])for(let i=0;i<3;i++){
 hull(base,.18,2.34,1.55,[side*3.87,2.35,-1.8+i*1.8],level===5?graphite:skin,.09);
 box(base,[.10,.13,1.28],[side*4.00,1.18,-1.8+i*1.8],level>=3?gold:bronze,.02);
 if(level>=2)box(base,[.07,.17,.92],[side*4.00,3.30,-1.8+i*1.8],energy,.02,true);
 }
 const corners=group('hq-structural-corners');
 for(const x of [-3.72,3.72])for(const z of [-2.65,2.85]){
 hull(corners,level>=2?1.25:.85,.48,level>=2?1.18:.84,[x,.72,z],dark);hull(corners,level>=2?.94:.62,3.2,level>=2?.92:.63,[x,2.22,z],graphite);
 const structural=level===3?gold:level===5?gold:level===4?white:skin;
 hull(corners,level>=3?.64:.36,3.03,level>=2?1.04:.73,[x+(x<0?-.17:.17),2.43,z],structural,.12);
 hull(corners,level>=2?1.18:.86,.58,level>=2?1.12:.88,[x,4.12,z],level===3?gold:skin,.16);
 if(level>=3){box(corners,[.13,2.05,.08],[x,2.6,z+.54],energy,.025,true);hull(corners,1.14,.42,1.1,[x,1.0,z],level===4?steel:gold,.11);}
 if(level>=4){hull(corners,.6,.20,.62,[x,4.39,z],graphite);box(corners,[.33,.08,.32],[x,4.53,z],energy,.04,true);}
 }
 if(level>=2){
 const armor=group('hq-tiered-facade-armor');
 for(const side of [-1,1]){
 for(const z of [-1.75,0,1.65]){
 hull(armor,.26,.67,1.40,[side*4.02,3.29,z],level===5?steel:white,.12);
 box(armor,[.07,.11,1.12],[side*4.17,2.84,z],level>=3?energy:bronze,.02,level>=3);
 hull(armor,.27,.5,1.4,[side*4.01,.93,z],graphite,.12);
 }
 }
 if(level>=3)for(const x of [-3.72,3.72])for(const z of [-2.65,2.85]){
 hull(armor,.58,.25,.67,[x,4.55,z],graphite,.09);
 box(armor,[.26,.10,.29],[x,4.72,z],energy,.035,true);
 }
 }
 const roof=group('hq-roof-armor');
 hull(roof,7.75,.32,5.6,[0,4.38,-.3],graphite,.22);
 // Broad beveled ceramic roof quadrants, with structural channels between panels.
 for(const x of [-1.92,1.92])for(const z of [-1.55,1.12])hull(roof,3.65,.37,2.48,[x,4.64,z],level===5?graphite:skin,.18);
 for(const x of [-3.65,3.65])box(roof,[.14,.15,5.2],[x,4.69,0],level>=3?gold:bronze,.03);
 const antenna=(x:number,z:number,y:number,h:number,lit:string)=>{
 const g=group('hq-communications-mast');hull(g,.65,.26,.65,[x,y,z],graphite);hull(g,.35,h,.37,[x,y+h/2,z],level>=3?gold:steel,.08);
 hull(g,.22,h-.22,.41,[x,y+h/2+.02,z],graphite,.05);box(g,[.09,h*.64,.045],[x,y+h*.57,z+.23],lit,.01,true);
 k.cylinder(g,.035,.4,[x,y+h+.16,z],steel);box(g,[.06,.17,.06],[x,y+h+.39,z],lit,.015,true);
 };
 if(level===1){const vent=group('hq-startup-computing-vent');hull(vent,2.75,.20,2.4,[0,4.74,-.2],steel);hull(vent,2.3,.16,1.98,[0,4.89,-.2],dark);for(let i=0;i<7;i++)box(vent,[1.8,.06,.13],[0,5.00,-.9+i*.23],steel,.01);antenna(-2.65,-2.35,4.65,.55,energy);}
 if(level===2){const module=group('hq-developed-computing-module');hull(module,3.3,.85,2.8,[.1,5.02,-.35],graphite,.25);hull(module,3.55,.32,3.04,[.1,5.59,-.35],white,.28);hull(module,1.8,.10,1.54,[.1,5.81,-.35],dark);box(module,[1.12,.06,.92],[.1,5.91,-.35],energy,.12,true);for(const x of [-1.30,1.50])box(module,[.15,.1,1.5],[x,5.8,-.35],bronze);
 antenna(-2.65,-2.25,4.65,1.25,energy);antenna(2.85,-2.05,4.65,.70,energy);
 for(const x of [-2.85,2.85]){hull(module,.95,.3,1.2,[x,4.85,.85],steel);for(let i=0;i<4;i++)box(module,[.7,.06,.12],[x,5.03,.47+i*.24],dark,.01);}}
 const core=group(level===3?'hq-cyan-roof-apparatus':level===4?'hq-crystal-containment':level===5?'hq-violet-containment':'hq-roof-services');
 if(level>=3){const r=level===3?1.80:2.13;core.position.y=level===3?.25:.18;hull(roof,level===3?4.9:5.5,.32,level===3?4.3:4.9,[0,4.91,-.25],level===5?steel:skin,.55); k.cylinder(core,r+.24,.32,[0,4.78,-.25],dark);ring(core,r+.12,.16,4.99,steel);ring(core,r,.10,5.14,level>=4?gold:cream);
 for(let i=0;i<8;i++){const a=i*Math.PI/4,g=new THREE.Group();core.add(g);g.position.set(Math.sin(a)*(r+.14),5.04,-.25+Math.cos(a)*(r+.14));g.rotation.y=a;hull(g,.72,.27,.47,[0,0,0],i%2?steel:skin,.10);box(g,[.28,.06,.18],[0,.18,.02],i%2?gold:energy,.025,i%2===0);}
 if(level===3){k.cylinder(core,1.10,.08,[0,5.02,-.25],graphite);ring(core,.94,.09,5.08,energy,-.25,true);k.cylinder(core,.66,.05,[0,5.08,-.25],energy);ring(core,.70,.07,5.12,white);for(let i=0;i<6;i++){const a=i*Math.PI/3;box(core,[.15,.09,.30],[Math.sin(a)*1.23,5.15,-.25+Math.cos(a)*1.23],gold);}
 antenna(-2.7,-2.08,4.68,2.06,energy);}
 }
 const pulseMaterials:THREE.MeshStandardMaterial[]=[];
 if(level===4){const dome=group('hq-faceted-blue-hemisphere');dome.position.y=.18;const m=k.cachedMesh(dome,'hq-blue-hemisphere',()=>surfaceGeometry(1.95,1.80),[0,5.12,-.25],'#268be9',true);m.name='hq-crystal-facets';const mat=k.ownMaterial((m.material as THREE.MeshStandardMaterial).clone());m.material=mat;mat.vertexColors=true;mat.roughness=.25;mat.metalness=.16;mat.emissiveIntensity=.5;pulseMaterials.push(mat);
 const seams=k.cachedMesh(dome,'hq-blue-facet-seams',()=>surfaceGeometry(1.958,1.808),[0,5.12,-.25],'#56ceff',true);
 const seamMaterial=k.ownMaterial((seams.material as THREE.MeshStandardMaterial).clone());seams.material=seamMaterial;seamMaterial.wireframe=true;seamMaterial.emissiveIntensity=.55;seams.castShadow=false;
 antenna(2.9,-2.20,4.7,2.60,'#38baff');antenna(3.1,2.0,4.65,1.0,energy);
 }
 if(level>=4){const dish=(x:number,z:number,y:number,r:number)=>{const g=group('hq-satellite-dish');g.position.set(x,y,z);hull(g,.65,.5,.65,[0,0,0],graphite);k.cylinder(g,.11,.55,[0,.42,0],steel);const bowl=new THREE.Group();bowl.position.y=.75;bowl.rotation.x=.63;bowl.rotation.z=-.28;g.add(bowl);const m=k.cachedMesh(bowl,'hq-parabolic-dish-'+r,()=>surfaceGeometry(r,.25,true),[0,0,0],white);m.material=k.ownMaterial((m.material as THREE.MeshStandardMaterial).clone());(m.material as THREE.MeshStandardMaterial).side=THREE.DoubleSide;const rim=k.ring(bowl,r,.035,[0,.25,0],steel);rim.rotation.x=Math.PI/2;k.cylinder(bowl,.025,.6,[0,.4,0],graphite);box(bowl,[.09,.09,.09],[0,.73,0],energy,.02,true);};dish(-2.9,-1.7,5.0,.70);if(level===4)dish(-3.1,1.1,4.4,.44);}
 let rotor:THREE.Group|undefined,traveller:THREE.Group|undefined;
 if(level===5){
 const command=group('hq-articulated-command-spire');k.cylinder(core,1.85,.12,[0,4.98,-.25],'#65309a');ring(core,1.66,.10,5.10,energy,-.25,true);ring(core,1.35,.05,5.12,'#db8cff',-.25,true);
 rotor=new THREE.Group();rotor.name='hq-circulating-core-energy';rotor.position.z=-.25;core.add(rotor);for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=box(rotor,[.11,.03,.42],[Math.sin(a)*1.49,5.16,Math.cos(a)*1.49],'#e3a0ff',.025,true);m.rotation.y=a;}
 hull(command,1.85,.4,1.70,[0,5.39,-.25],steel,.3);hull(command,1.18,2.1,1.12,[0,6.46,-.25],dark,.26);hull(command,1.04,1.10,.94,[0,7.65,-.25],graphite,.22);hull(command,1.44,.28,1.3,[0,7.20,-.25],steel,.24);hull(command,.96,.24,.88,[0,8.10,-.25],skin,.20);
 for(const side of [-1,1]){hull(command,.24,2.0,.34,[side*.64,6.47,-.25],skin,.08);hull(command,.17,1.65,.34,[side*.78,6.27,-.25],gold,.06);box(command,[.12,1.7,.05],[side*.30,6.55,.33],energy,.015,true);box(command,[.07,.8,.04],[side*.19,7.69,.17],'#d997ff',.01,true);}
 hull(command,.52,.58,.5,[0,8.12,-.25],gold,.12);k.crystal(command,.38,.78,[0,8.24,-.25],'#c37cff');k.cylinder(command,.025,.42,[0,9.16,-.25],steel);
 traveller=new THREE.Group();traveller.name='hq-spire-energy-traveller';command.add(traveller);box(traveller,[.13,.18,.06],[.30,5.73,.37],'#efc3ff',.01,true);
 for(const side of [-1,1]){const brace=hull(command,.30,1.2,.5,[side*.83,5.7,-.25],skin,.08);brace.rotation.z=side*.35;}
 antenna(-2.85,1.65,4.70,.95,energy);antenna(2.85,-2.1,4.70,1.20,'#eaaa44');
 for(const color of ['#a65bff','#d997ff']){const original=k.mat(color,true),own=k.ownMaterial((original as THREE.MeshStandardMaterial).clone());root.traverse(o=>{if(o instanceof THREE.Mesh&&o.material===original)o.material=own;});pulseMaterials.push(own);}
 }
 // Keep semantic assembly nodes for inspection, but combine static architecture across
 // assemblies into material batches. Only the two light-weight energy rigs move.
 root.updateWorldMatrix(true,true);const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),staticMeshes:THREE.Mesh[]=[];
 root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;for(let p:THREE.Object3D|null=o.parent;p&&p!==root;p=p.parent)if(p===rotor||p===traveller)return;staticMeshes.push(o);});
 const batches=new THREE.Group();batches.name='hq-static-material-batches';root.add(batches);
 for(const mesh of staticMeshes){const local=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);mesh.removeFromParent();batches.add(mesh);local.decompose(mesh.position,mesh.quaternion,mesh.scale);}
 k.batchStatic(batches,'approved-hq-static-'+level);
 rigs.set(house,{rotor,traveller,materials:pulseMaterials});animateFounderHQEnergy(house,0,true);
 return root;
}
