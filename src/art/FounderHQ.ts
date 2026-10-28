import {hqArchitecture} from './HqArchitecture';
export {animateFounderHQEnergy} from './HqArchitecture';
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

/** Five architectural stages on the same lot. The founder studio and cable port stay grounded. */
export function founderHQ(k:WorldKit,parent:THREE.Group,level:1|2|3|4|5=1):THREE.Group{
 const house=new THREE.Group();house.name='Founder HQ Level '+level;house.userData.visualLevel=level;house.position.set(-5,0,-1);parent.add(house);
 hqArchitecture(k,house,level);
 founderDesk(k,house,-.9,3.6,true);const founder=founderCharacter(k,house);founderLaptop(k,house,-.8);
 k.batchStatic(founder,'hq-five-tier-founder');k.grounding(house,9,8,0,.6);addHqPowerBox(k,house,1);return house;
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
