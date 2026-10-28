import {addHqPowerBox} from './PowerConnections';
import * as THREE from 'three';
import {WorldKit,palette as c} from './world';

type FounderIdleRig={left:THREE.Group;right:THREE.Group;head:THREE.Group;mug:THREE.Group;steam:THREE.Group;steamMaterial:THREE.Material;shoulder:THREE.Vector3;elbow:THREE.Vector3;wrist:THREE.Vector3;delta:THREE.Vector3};
const founderIdleRigs=new WeakMap<THREE.Object3D,FounderIdleRig>(),up=new THREE.Vector3(0,1,0);
const ease=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function poseLink(mesh:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,d:THREE.Vector3){mesh.position.copy(a).add(b).multiplyScalar(.5);d.copy(b).sub(a);mesh.scale.set(1,d.length(),1);mesh.quaternion.setFromUnitVectors(up,d.normalize());}
function poseArm(group:THREE.Group,shoulder:THREE.Vector3,elbow:THREE.Vector3,wrist:THREE.Vector3,d:THREE.Vector3){
 poseLink(group.children[0],shoulder,elbow,d);poseLink(group.children[1],elbow,wrist,d);group.children[2].position.copy(wrist);
}
/** Smooth, occasional typing and a slow pickup / sip / replace cycle, with no scene allocation. */
export function animateFounderIdle(house:THREE.Object3D|undefined,time:number,reduced=false){
 const r=house&&founderIdleRigs.get(house);if(!r)return;
 const phase=((time%36)+36)%36,t=phase%10-4,typing=!reduced&&phase<28&&t>=0&&t<2,env=typing?ease(t/.35)*ease((2-t)/.35):0;
 let sip=0,pickup=0;if(!reduced&&phase>=28&&phase<33.3){if(phase<29)pickup=ease(phase-28);else if(phase<30){pickup=1;sip=ease(phase-29);}else if(phase<31.3){pickup=1;sip=1;}else if(phase<32.3){pickup=1;sip=1-ease(phase-31.3);}else pickup=1-ease(phase-32.3);}
 for(let i=0;i<2;i++){const side=i===0?-1:1,group=i===0?r.left:r.right;
  const x=side*.42,typingLift=env*(.012+.012*Math.sin(t*14+(side<0?0:Math.PI)));
  r.shoulder.set(side*.49,2.43,.08);r.elbow.set(side*.59,2.44,.36);r.wrist.set(x,2.50+typingLift,.73);
  if(side===1&&pickup){r.wrist.set(x+(.99-x)*pickup,2.50-.03*pickup,.73-.13*pickup);r.wrist.lerp(r.delta.set(.42,3.09,.62),sip);r.elbow.y+=sip*.18;r.elbow.x+=pickup*.06;}
  poseArm(group,r.shoulder,r.elbow,r.wrist,r.delta);
 }
 r.mug.position.set(.83,2.465,.6);r.mug.rotation.x=0;
 if(sip>0){r.mug.position.copy(r.right.children[2].position);r.mug.position.x-=.16;r.mug.position.y-=.005;r.mug.position.z+=.08*sip;r.mug.rotation.x=-.13*sip;}
 r.head.rotation.x=sip*.025+env*.012;
 const steam=!reduced&&!pickup&&(phase>=8&&phase<10||phase>=20&&phase<22),st=phase>=20?phase-20:phase-8;r.steam.visible=steam;
 if(steam){r.steamMaterial.opacity=.16*ease(st/.35)*ease((2-st)/.5);for(let i=0;i<r.steam.children.length;i++){const p=r.steam.children[i],rise=(st*.32+i*.25)%1;p.position.set(Math.sin(st*2+i)*.045,.25+rise*.4,Math.cos(st*1.5+i)*.035);p.scale.set(.025*(.7+rise*.55),.075*(.7+rise*.55),.025*(.7+rise*.55));}}
}

/** A closed cottage with a flush front window: the founder is real interior geometry. */
export function founderHQ(k:WorldKit,parent:THREE.Group,level:1|2|3=1):THREE.Group{
 if(level===3)return founderHQLevel3(k,parent);
 if(level===2)return founderHQLevel2(k,parent);
 const polished=k.finish==='campus';
 const house=new THREE.Group();house.name='Founder HQ';house.position.set(-5,0,-1);parent.add(house);
 const box=(size:[number,number,number],pos:[number,number,number],color:string,r=.06,glow=false)=>k.box(house,size,pos,color,r,glow);
 box([8.6,.35,7.8],[0,.2,.5],'#8f9e91',.15);
 box([7.8,.18,6.5],[0,.45,0],c.cream);
 box([7.8,4.2,.3],[0,2.6,-3],c.cream);
 for(const x of [-3.75,3.75])box([.3,4.2,6],[x,2.6,0],c.cream);
 // Front wall wraps a broad window and a separate front door.
 box([7.8,.8,.3],[0,.85,3],c.cream);
 box([7.8,.55,.3],[0,4.45,3],c.cream);
 box([2.1,3.3,.3],[2.7,2.7,3],c.cream);
 box([.4,3.3,.3],[-3.6,2.7,3],c.cream);
 box([1.35,2.6,.18],[2.65,1.95,3.2],c.dark);
 box([.9,.65,.06],[2.65,2.65,3.32],c.cyan);
 box([.13,.13,.12],[3.1,1.8,3.37],c.gold);
 box([2,.2,1.1],[2.65,.45,3.7],c.slate);
 // Pitched roof runs along Z; triangular gables close the roof ends.
 for(const side of [-1,1]){const roof=box([4.6,.28,6.8],[side*2.05,5.35,0],polished?'#155976':c.dark);roof.rotation.z=-side*.36;}
 for(const z of [-3,3]){
  k.gable(house,7.8,1.44,.22,[0,4.55,z],c.cream);
 }
 box([.3,.25,6.9],[0,6.15,0],c.gold);
 // Restrained standing-seam roof and warm workspace lighting; footprint is unchanged.
 for(const side of [-1,1])for(const z of [-2.4,-1.2,0,1.2,2.4]){const seam=box([4.56,.045,.045],[side*2.05,5.51,z],polished?'#397991':'#4b6b7d',.01);seam.rotation.z=-side*.36;}
 const deskLight=new THREE.PointLight(polished?'#ffd080':'#ffd29a',polished?16:5,polished?8:7,2);deskLight.position.set(-.9,3.6,2);house.add(deskLight);
 k.box(house,[2.6,.045,.18],[-.9,4.1,2.75],'#ffe0a7',.02,true);
 // Window trim sits against the front wall, with the entire workspace inside.
 box([4.8,.18,.3],[-.9,1.2,3.08],c.gold);
 for(const x of [-3.3,1.5])box([.13,3.1,.13],[x,2.75,3.12],c.dark);
 box([4.95,.14,.15],[-.9,4.3,3.12],c.dark);
 // No opaque pane: the window stays readable on small mobile screens.
 founderDesk(k,house,-.9,3.6,polished);
 const founder=founderCharacter(k,house);
 founderLaptop(k,house,-.8);
 box([.6,.12,.5],[0,6.37,0],c.cyan);
 if(polished){
  // Layered standing-seam panels preserve the original roof outline and footprint.
  for(const side of [-1,1])for(let i=0;i<5;i++){
   const panel=box([4.54,.025,1.13],[side*2.05,5.51,-2.4+i*1.2],i%2?'#155976':'#185d7a',.015);panel.rotation.z=-side*.36;
  }
  box([7.4,.16,.09],[0,1.28,3.18],'#fff8e6',.025);
  for(const x of [-3.53,3.53])box([.16,3.9,.12],[x,2.8,3.18],'#fff8e6',.025);
  box([7.1,.18,.08],[0,.64,3.2],'#d7c9ac',.02);
  // Warm interior surfaces and a pendant make the existing window inviting.
  box([6.9,3.05,.045],[0,2.8,-2.8],'#f0d4a0',.015);
  k.cylinder(house,.035,.55,[-2.1,3.85,1.5],'#876f4e');k.cylinder(house,.24,.13,[-2.1,3.56,1.5],c.gold);
  const warm=k.box(house,[.3,.025,.22],[-2.1,3.48,1.5],'#fff1bb',.02,true);warm.castShadow=false;
  box([.8,1.15,.22],[.7,2.35,.5],'#bb854b',.03);
  for(let i=0;i<3;i++)box([.16,.65,.15],[.47+i*.2,2.45,.65],i%2?'#61b8ad':'#ebbc65',.015);
  k.batchStatic(founder,'campus-founder');k.batchStatic(house,'campus-house');
  k.grounding(house,10,9,0,.4);
 }
 addHqPowerBox(k,house,1);return house;
}

export type FoundationBuilding='arcSpire'|'hq'|'rig'|'rig2'|'fabricator'|'hangar'|'station'|'lab'|'droneStation'|'sentinel'|'computeStorage'|'researchStorage';
/** Resolve the nearest visible building mesh, never the old invisible campus lots. */
export function pickFoundationBuilding(ray:THREE.Raycaster,hq:THREE.Object3D,rig?:THREE.Object3D,fabricator?:THREE.Object3D,hangar?:THREE.Object3D,station?:THREE.Object3D,rig2?:THREE.Object3D,lab?:THREE.Object3D,droneStation?:THREE.Object3D,sentinel?:THREE.Object3D,computeStorage?:THREE.Object3D,researchStorage?:THREE.Object3D,arcSpire?:THREE.Object3D):FoundationBuilding|undefined{
 const hit=ray.intersectObjects([hq,rig,fabricator,hangar,station,rig2,lab,droneStation,sentinel,computeStorage,researchStorage,arcSpire].filter((g):g is THREE.Object3D=>!!g),true)[0];
 if(!hit)return;
 for(let node:THREE.Object3D|null=hit.object;node;node=node.parent){if(node===arcSpire)return 'arcSpire';if(node===computeStorage)return 'computeStorage';if(node===researchStorage)return 'researchStorage';if(node===hq)return 'hq';if(node===rig)return 'rig';if(node===rig2)return 'rig2';if(node===fabricator)return 'fabricator';if(node===hangar)return 'hangar';if(node===station)return 'station';if(node===lab)return 'lab';if(node===sentinel)return 'sentinel';if(node===droneStation)return 'droneStation';}
}


function founderCharacter(k:WorldKit,house:THREE.Group){
 const founder=new THREE.Group();founder.name='Founder at laptop';founder.position.set(-.8,-.5,1.45);house.add(founder);
 k.box(founder,[.95,1.0,.5],[0,2.15,0],c.coral,.18);
 const head=new THREE.Group();head.name='founder-head';head.position.set(0,2.87,.15);founder.add(head);k.cylinder(founder,.14,.24,[0,2.74,.10],'#f3c399');
 k.box(head,[.85,.85,.75],[0,.39,0],'#f3c399',.2);
 // A swept front fringe, longer side pieces and a tapered back replace the flat cap.
 const hair=new THREE.Group();hair.name='founder-hair';head.add(hair);
 k.box(hair,[.98,.28,.86],[0,.79,-.04],'#624837',.13);
 const fringe=k.box(hair,[.72,.19,.19],[-.10,.64,.36],'#624837',.07);fringe.rotation.z=-.13;
 k.box(hair,[.14,.35,.65],[-.43,.50,-.04],'#624837',.055);k.box(hair,[.14,.31,.63],[.43,.52,-.06],'#624837',.055);
 k.box(hair,[.84,.49,.19],[0,.52,-.36],'#624837',.08);
 const sweep=k.box(hair,[.64,.07,.49],[.10,.92,-.02],'#856047',.035);sweep.rotation.z=.08;k.batchStatic(hair,'founder-swept-hair');
 for(const x of [-.2,.2])k.box(head,[.08,.1,.04],[x,.43,.39],c.dark,.01);
 // Separate upholstery, pants and bent legs make the seated silhouette explicit.
 const chair=new THREE.Group();chair.name='founder-chair';founder.add(chair);
 k.box(chair,[1.20,.16,.90],[0,1.51,-.05],'#426b7c',.09);
 k.box(chair,[1.15,1.08,.16],[0,2.03,-.36],'#426b7c',.10);
 k.box(chair,[.97,.84,.045],[0,2.06,-.265],'#779eaa',.055);
 for(const x of [-.44,.44])for(const z of [-.34,.28])k.cylinder(chair,.055,.45,[x,1.265,z],'#d4dfd8');
 k.batchStatic(chair,'founder-chair');
 k.box(founder,[.82,.26,.50],[0,1.72,0],'#34576c',.07);
 const legs=new THREE.Group();legs.name='founder-seated-legs';founder.add(legs);
 for(const side of [-1,1]){const leg=new THREE.Group();leg.name=side<0?'founder-left-leg':'founder-right-leg';legs.add(leg);
 k.box(leg,[.29,.28,.62],[side*.24,1.70,.30],'#34576c',.065);
 k.box(leg,[.27,.53,.27],[side*.24,1.395,.58],'#34576c',.055);
 k.box(leg,[.35,.20,.55],[side*.24,1.13,.72],'#e7e8d9',.065);}
 const arms:THREE.Group[]=[];
 for(const side of [-1,1]){const arm=new THREE.Group();arm.name=side<0?'founder-left-arm':'founder-right-arm';founder.add(arm);k.box(arm,[.2,1,.2],[0,0,0],c.coral,.055);k.box(arm,[.18,1,.18],[0,0,0],c.coral,.05);const hand=k.box(arm,[.22,.12,.22],[0,0,0],'#f3c399',.045);hand.name=side<0?'founder-left-hand':'founder-right-hand';arms.push(arm);}
 const mug=new THREE.Group();mug.name='founder-coffee';founder.add(mug);
 k.cylinder(mug,.145,.32,[0,0,0],'#f1e8ce');k.cylinder(mug,.12,.015,[0,.165,0],'#725239');
 for(const [size,pos]of [[[.10,.04,.15],[.18,.08,0]],[[.05,.18,.15],[.21,0,0]],[[.10,.04,.15],[.18,-.08,0]]] as [[number,number,number],[number,number,number]][])k.box(mug,size,pos,'#f1e8ce',.02);
 k.batchStatic(mug,'founder-coffee');
 const steam=new THREE.Group();steam.name='founder-steam';mug.add(steam);let steamMaterial:THREE.Material|undefined;
 for(let i=0;i<3;i++){const puff=k.boulder(steam,[0,.3,0],[.025,.075,.025],'#e5eee9',0);puff.castShadow=false;puff.receiveShadow=false;steamMaterial=puff.material as THREE.Material;steamMaterial.transparent=true;steamMaterial.depthWrite=false;}
 founderIdleRigs.set(house,{left:arms[0],right:arms[1],head,mug,steam,steamMaterial:steamMaterial!,shoulder:new THREE.Vector3(),elbow:new THREE.Vector3(),wrist:new THREE.Vector3(),delta:new THREE.Vector3()});animateFounderIdle(house,0,true);
 return founder;
}
function founderDesk(k:WorldKit,house:THREE.Group,x:number,width:number,polished:boolean){
 const desk=new THREE.Group();desk.name='founder-desk';house.add(desk);
 k.box(desk,[width,.16,.9],[x,1.725,2.15],polished?'#e3ac62':'#e7b789');
 for(const side of [-1,1])k.box(desk,[.12,1.2,.12],[x+side*(width/2-.3),1.05,2.2],c.dark);
 k.batchStatic(desk,'founder-desk-'+width+polished);
}
function founderLaptop(k:WorldKit,house:THREE.Group,x:number){
 const laptop=new THREE.Group();laptop.name='founder-laptop';laptop.position.set(x,1.86,2.15);house.add(laptop);
 k.box(laptop,[1.6,.08,.9],[0,0,0],'#3b5264',.035);k.box(laptop,[1.43,.015,.71],[0,.046,-.03],'#87a4b2',.018);
 for(let row=0;row<3;row++)for(let col=0;col<6;col++)k.box(laptop,[.16,.012,.09],[-.5+col*.2,.061,-.04+row*.12],'#294a60',.012);
 k.box(laptop,[.4,.012,.12],[0,.061,-.26],'#c2d7d9',.012);
 const screen=new THREE.Group();screen.name='founder-laptop-screen';screen.position.set(0,.035,.39);screen.rotation.x=.18;laptop.add(screen);
 k.box(screen,[1.5,.72,.085],[0,.36,0],'#294353',.05);k.box(screen,[1.28,.51,.012],[0,.37,-.05],'#305c70',.025);
 for(let i=0;i<3;i++)k.box(screen,[.74-i*.12,.035,.008],[-.16,.49-i*.1,-.06],i===0?'#90ded8':'#77acb8',.005,true);
 k.box(screen,[.28,.13,.012],[0,.37,.05],c.cyan,.025);k.batchStatic(screen,'founder-laptop-screen');k.batchStatic(laptop,'founder-laptop-base');
}
/** An attached office wing and taller main roof fit the original 9 x 8 gameplay lot. */
function founderHQLevel2(k:WorldKit,parent:THREE.Group){
 const house=new THREE.Group();house.name='Founder HQ Level 2';house.position.set(-5,0,-1);parent.add(house);
 const box=(size:[number,number,number],pos:[number,number,number],color:string,r=.06,glow=false)=>k.box(house,size,pos,color,r,glow);
 box([8.6,.35,7.8],[0,.2,.5],'#8f9e91',.15);box([8.2,.18,6.8],[0,.46,0],c.cream,.1);
 // Taller main office occupies the left side; attached studio occupies the right.
 box([5.9,4.65,.24],[-1.1,2.86,-3],c.cream);box([.24,4.65,6.3],[-3.93,2.86,.1],c.cream);
 box([.23,4.65,6.3],[1.72,2.86,.1],c.cream);
 box([5.8,.75,.26],[-1.1,.94,3.1],c.cream);box([5.8,.6,.26],[-1.1,4.88,3.1],c.cream);
 for(const x of [-3.88,1.68])box([.25,3.6,.27],[x,2.8,3.1],c.cream);
 // Main roof has a raised clerestory, panel seams and a warm ridge.
 for(const side of [-1,1]){const x=-1.1+side*1.55;const roof=box([3.45,.25,6.8],[x,5.88,.05],'#155976');roof.rotation.z=-side*.36;
  for(let i=0;i<5;i++){const panel=box([3.4,.025,1.13],[x,6.03,-2.35+i*1.2],i%2?'#155976':'#185d7a',.015);panel.rotation.z=-side*.36;}}
 for(const z of [-3.05,3.12])k.gable(house,5.8,1.1,.2,[-1.1,5.18,z],c.cream);
 box([.24,.22,6.85],[-1.1,6.65,.05],c.gold);box([1.6,.1,.8],[2.8,4.64,-.75],c.dark);
 box([1.3,.04,.5],[2.8,4.72,-.75],c.cyan,.035,true);
 // Broad flush window keeps the same founder and laptop visible.
 for(const x of [-3.65,1.42])box([.12,3.3,.12],[x,2.95,3.25],c.dark);
 box([5.15,.14,.14],[-1.1,4.6,3.25],c.dark);box([5.15,.18,.2],[-1.1,1.3,3.24],c.gold);
 founderDesk(k,house,-1.1,3.8,true);
 const founder=founderCharacter(k,house);founder.position.x=-1.05;
 founderLaptop(k,house,-1.05);
 box([5.4,3.5,.04],[-1.1,3,-2.83],'#f0d4a0');const light=new THREE.PointLight('#ffd080',18,8,2);light.position.set(-1.1,3.8,2);house.add(light);
 k.box(house,[3.3,.05,.16],[-1.1,4.35,2.8],'#ffe0a7',.02,true);
 // Lower side wing: front door, an extra workspace window and a sloped canopy.
 box([2.35,3.55,.23],[2.87,2.35,-2.8],c.cream);box([.23,3.55,5.8],[4,2.35,.1],c.cream);
 box([2.35,.45,.25],[2.87,.73,3.1],c.cream);box([2.35,.45,.25],[2.87,3.98,3.1],c.cream);
 box([.22,3.0,.25],[1.82,2.35,3.1],c.cream);box([.22,3.0,.25],[3.95,2.35,3.1],c.cream);
 box([1.03,2.5,.15],[2.38,1.95,3.24],c.dark);box([.66,.6,.04],[2.38,2.55,3.33],c.cyan);box([.1,.1,.1],[2.78,1.8,3.35],c.gold);
 box([.78,1.8,.12],[3.4,2.5,3.22],c.dark);box([.59,1.54,.035],[3.4,2.5,3.3],'#ffe0a7',.025,true);box([.055,1.6,.04],[3.4,2.5,3.33],c.cream);
 box([.065,1.7,2.2],[4.14,2.5,-.2],c.dark,.025);box([.025,1.45,1.95],[4.18,2.5,-.2],'#a0dfe4',.015);box([.03,1.5,.07],[4.2,2.5,-.2],c.cream,.01);
 const canopy=box([2.65,.22,6.35],[2.9,4.42,.15],'#155976',.08);canopy.rotation.z=-.08;
 box([2.55,.07,.07],[2.9,4.33,3.34],c.cyan,.025,true);box([1.65,.18,.8],[2.38,.48,3.82],c.slate,.05);
 for(const x of [-3.86,1.69,3.98])box([.12,3.7,.11],[x,2.5,3.25],'#fff8e6',.025);
 k.batchStatic(founder,'campus-founder-level2');k.batchStatic(house,'campus-house-level2');k.grounding(house,10,9,0,.4);addHqPowerBox(k,house,2);return house;
}

/** The original founder studio remains below a compact upper research wing. */
function founderHQLevel3(k:WorldKit,parent:THREE.Group){
 const house=founderHQLevel2(k,parent);house.name='Founder HQ Level 3';
 const wing=new THREE.Group();wing.name='hq-elite-wing';house.add(wing);
 k.box(wing,[2.7,.25,5.9],[2.75,4.63,.05],c.cream,.08);
 k.box(wing,[2.55,2.0,5.65],[2.75,5.7,-.05],'#264a60',.08);
 for(const z of [-2.7,2.7]){k.box(wing,[2.3,1.5,.045],[2.75,5.72,z],'#7dcfdc',.025);for(const x of [1.65,2.75,3.85])k.box(wing,[.1,1.65,.09],[x,5.73,z],c.cream,.015);k.box(wing,[2.45,.09,.1],[2.75,5.12,z],c.gold,.015);}
 for(const z of [-1.8,0,1.8]){k.box(wing,[.05,1.5,1.55],[4.05,5.73,z],'#7dcfdc',.02);k.box(wing,[.09,1.7,.12],[4.1,5.73,z+.8],c.cream,.015);}
 k.box(wing,[2.95,.25,6.15],[2.75,6.82,.05],'#155976',.07);k.box(wing,[2.7,.06,.12],[2.75,6.96,3.05],c.cyan,.015,true);
 for(const x of [1.6,3.9])k.box(wing,[.24,2.5,.3],[x,5.78,-2.6],c.cream,.035);
 k.box(wing,[1.35,.35,1.65],[2.75,7.04,-1.35],c.dark,.05);for(let i=0;i<4;i++)k.box(wing,[1.1,.035,.13],[2.75,7.24,-1.9+i*.35],c.slate,.01);
 k.cylinder(wing,.12,1.1,[3.7,7.4,-2.5],c.gold);k.box(wing,[.7,.4,.15],[3.7,7.9,-2.5],c.dark);k.box(wing,[.5,.15,.035],[3.7,7.94,-2.4],c.cyan,.01,true);
 k.box(wing,[5.8,.2,.65],[-1.1,4.7,3.35],c.cream,.045);k.box(wing,[5.25,.06,.035],[-1.1,4.62,3.69],c.cyan,.01,true);
 k.batchStatic(wing,'hq-elite-wing');return house;
}
