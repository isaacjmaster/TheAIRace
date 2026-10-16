import * as THREE from 'three';
import { lightWorld, palette as c, WorldKit } from './world';

/** Reconstructs the original garage's objects in the raid's low-poly material language. */
export class HeadquartersScene {
 readonly renderer:THREE.WebGLRenderer;
 private scene=new THREE.Scene();private camera=new THREE.OrthographicCamera();private kit=new WorldKit();
 private center=new THREE.Vector3(-3,0,0);private target=new THREE.Vector3(-3,0,0);private zoomTarget=1;
 private agent=new THREE.Group();private observer:ResizeObserver;private clock=0;private paused=false;
 private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 private lost=(e:Event)=>{e.preventDefault();this.paused=true;this.onError();};
 constructor(private host:HTMLDivElement,level:number,training:number,private onError:()=>void){
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});lightWorld(this.renderer,this.scene);
  this.renderer.domElement.setAttribute('role','img');this.renderer.domElement.setAttribute('aria-label',`3D headquarters level ${level+1}. ${level===0?'One laptop and a mint AI agent in the original garage.':level===1?'A furnished workstation, chair, lamp and plants.':'GPU workbench, server racks and upgraded lighting.'} Drag to pan and pinch to zoom.`);
  this.renderer.domElement.dataset.stage=String(level);host.appendChild(this.renderer.domElement);this.renderer.domElement.addEventListener('webglcontextlost',this.lost);
  this.build(level,training);this.camera.position.set(4,23,30);this.camera.lookAt(this.center);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
 }
 private build(level:number,training:number){
  const k=this.kit,s=this.scene;
  k.terrain(s,19,14);
  // A through-road, curb and driveway connect the garage to the surrounding campus.
  k.box(s,[100,.09,3.6],[0,-.015,8.8],'#182c41',.04);
  for(const z of [6.9,10.7])k.box(s,[100,.16,.22],[0,.02,z],'#496b7d',.04);
  for(let x=-45;x<=45;x+=4)k.box(s,[1.5,.02,.07],[x,.045,8.8],'#8fa9b7',.01);
  k.box(s,[7,.12,4.5],[-5,.02,5],'#3a586b',.06);
  for(const x of [-8.6,-1.4])k.box(s,[.12,.035,4.4],[x,.1,5],c.cyan,.01,true);
  // A level lawn to the east is intentionally unbuilt; no fake building pads.
  k.box(s,[2,.08,13],[3,.0,-.5],'#36556a');
  k.box(s,[12,.25,9],[-5,.09,-1],'#243e57',.15);
  for(let x=-10;x<=0;x+=2)for(let z=-4;z<=2;z+=2)k.box(s,[1.94,.035,1.94],[x,.24,z],'#35526a',.03);
  k.box(s,[12,4.3,.28],[-5,2.35,-5.4],c.dark);k.box(s,[.28,4.3,9],[-11,2.35,-1],c.slate);
  k.box(s,[12.4,.24,.5],[-5,4.55,-5.4],c.slate);k.box(s,[.5,.24,9.4],[-11,4.55,-1],c.slate);
  // The recognizable garage door, warm window and exposed floor are retained.
  k.box(s,[3.5,3.5,.12],[-1.8,2.05,-5.18],c.slate);
  for(let i=0;i<9;i++)k.box(s,[3.35,.065,.08],[-1.8,.48+i*.37,-5.09],'#557994',.015);
  k.box(s,[.1,1.6,2.5],[-10.8,2.7,-2.7],c.gold,.02,true);
  k.box(s,[.12,1.8,.09],[-10.72,2.7,-2.7],c.cream);k.box(s,[.12,.09,2.6],[-10.72,2.7,-2.7],c.cream);
  for(const x of [-10.7,.7]){k.box(s,[.3,4.25,.3],[x,2.35,-5.12],c.slate);k.box(s,[.06,2.8,.04],[x,2.6,-4.94],c.cyan,.01,true);}
  k.box(s,[12,.12,.13],[-5,.46,-5.15],c.cyan,.02,true);
  k.box(s,[.22,1.6,1.7],[-11.25,1.25,1.2],c.dark);
  k.label(s,'GARAGE INTELLIGENCE',[-6.5,3.3,-5.19],4.6);
  const deskY=level>0?1.45:.32;
  if(level>0){
   k.box(s,[4.6,.2,2.1],[-5,1.32,-.8],'#9d8269');
   for(const x of [-6.9,-3.1])for(const z of [-1.5,-.1])k.box(s,[.15,1.05,.15],[x,.73,z],c.slate);
   k.box(s,[1.5,.9,.12],[-5.8,2.01,-1.4],c.dark);k.box(s,[1.3,.68,.04],[-5.8,2.02,-1.32],c.cyan,.02,true);k.box(s,[.15,.32,.15],[-5.8,1.54,-1.4],c.slate);
   k.box(s,[.8,.08,.3],[-5.8,1.45,-.5],c.slate);k.box(s,[.65,1.1,.8],[-3.4,1.95,-1],c.dark);
   for(let i=0;i<3;i++)k.box(s,[.4,.07,.025],[-3.4,1.7+i*.2,-.58],c.cyan,.01,true);
   k.cylinder(s,.3,.08,[-7,1.47,-1.1],c.gold);k.cylinder(s,.05,.8,[-7,1.9,-1.1],c.slate);k.box(s,[.7,.12,.45],[-7,2.3,-1.1],c.gold);
   k.box(s,[1,.18,.9],[-5,.75,1.25],c.slate);k.box(s,[1,.85,.13],[-5,1.18,1.66],c.slate);k.cylinder(s,.08,.55,[-5,.42,1.25],c.dark);
   k.cylinder(s,.42,.6,[-9.6,.55,-3.5],c.terracotta);k.tree(s,-9.6,-3.5,.55);
  }
  // The starting laptop stays in every stage, moving onto the earned desk.
  k.box(s,[1.35,.08,.9],[-4.5,deskY,-.5],c.slate);const lid=k.box(s,[1.35,.85,.07],[-4.5,deskY+.42,-.91],c.dark);lid.rotation.x=-.12;
  k.box(s,[1.16,.65,.035],[-4.5,deskY+.44,-.855],c.cyan,.015,true);
  if(level>=2){
   for(const x of [-9.3,-7.8]){k.box(s,[1.1,2.8,1.2],[x,1.68,-4],c.dark,.1);for(let i=0;i<6;i++){k.box(s,[.88,.25,.07],[x,.6+i*.4,-3.35],c.slate);k.box(s,[.12,.06,.02],[x+.3,.6+i*.4,-3.3],c.cyan,.01,true);}}
   k.box(s,[2.4,1.1,1.3],[-9, .82,.8],c.slate);k.box(s,[2.6,.16,1.5],[-9,1.48,.8],c.gold);
   for(let i=0;i<3;i++)k.box(s,[.5,.25,.9],[-9.7+i*.7,1.67,.8],c.purple);
   for(const x of [-8,-4])k.box(s,[2.2,.1,.12],[x,4.12,-5.1],c.cyan,.03,true);
  }
  this.agent.position.set(-2.8,.55,1.8);s.add(this.agent);
  k.box(this.agent,[.8,.8,.7],[0,.4,0],c.cyan,.12);k.box(this.agent,[.58,.42,.06],[0,.44,.38],c.dark);
  for(const x of [-.15,.15])k.box(this.agent,[.08,.15,.03],[x,.45,.42],c.cream,.02,true);
  k.cylinder(this.agent,.04,.35,[0,.97,0],c.slate);k.box(this.agent,[.16,.16,.16],[0,1.18,0],c.cyan,.06,true);
  for(const x of [-.5,.5])k.box(this.agent,[.12,.4,.12],[x,.3,0],c.cyan);
  if(training>0){k.box(s,[1.7,.25,1.7],[1,.3,1.4],c.slate);k.box(s,[1.2,1.35,1.1],[1,1.05,1.4],c.cream);k.box(s,[.9,.55,.06],[1,1.2,2],c.purple,.03,true);for(let i=0;i<training;i++)k.box(s,[.18,.1,.04],[.65+i*.3,.7,2],c.cyan,.01,true);}
  // Layered tree lines and retaining edges define a larger world without crowding the startup.
  for(const [x,z,size] of [[-15,-7,1.5],[-16,2,1.1],[14,-6,1.6],[17,3,1.3],[8,-12,1.3],[-7,-11,1.5],[-19,-12,2],[20,-12,2],[24,4,1.7],[-23,1,1.8]])k.tree(s,x,z,size);
  for(const x of [-13,12]){k.box(s,[.28,2.6,.28],[x,1.2,5.8],c.dark);k.box(s,[1,.12,.4],[x,2.55,5.8],c.cyan,.03,true);}
  for(let i=0;i<4;i++)k.box(s,[.65,.12,1.3],[1+i*.7,.03,4.1],c.slate);
  for(const z of [-7.3,-7.8])k.box(s,[10,.35,.3],[8,.1,z],c.slate);

 }
 private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);const aspect=w/h,span=Math.max(30,17*aspect);this.camera.left=-span/2;this.camera.right=span/2;this.camera.top=span/aspect/2;this.camera.bottom=-span/aspect/2;this.camera.updateProjectionMatrix();}
 zoom(factor:number){this.zoomTarget=THREE.MathUtils.clamp(this.zoomTarget*factor,.8,1.65);}
 pan(dx:number,dy:number){const scale=(this.camera.right-this.camera.left)/Math.max(1,this.host.clientWidth)/this.camera.zoom;const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0);const up=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1);up.y=0;up.normalize();this.target.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);this.target.y=0;const flat=new THREE.Vector2(this.target.x,this.target.z);if(flat.length()>5)flat.setLength(5);this.target.set(flat.x,0,flat.y);}
 reset(){this.target.set(-3,0,0);this.zoomTarget=1;}
 update(dt:number){if(this.paused)return;this.clock+=dt;const next=this.center.clone().lerp(this.target,this.reduced?1:Math.min(1,dt*10));this.camera.position.add(next.clone().sub(this.center));this.center.copy(next);this.camera.lookAt(this.center);this.camera.zoom=THREE.MathUtils.lerp(this.camera.zoom,this.zoomTarget,this.reduced?1:Math.min(1,dt*10));this.camera.updateProjectionMatrix();if(!this.reduced){this.agent.position.y=.55+Math.sin(this.clock*1.4)*.06;this.agent.rotation.y=Math.sin(this.clock*.35)*.15;}this.renderer.render(this.scene,this.camera);this.renderer.domElement.dataset.drawCalls=String(this.renderer.info.render.calls);this.renderer.domElement.dataset.triangles=String(this.renderer.info.render.triangles);}
 dispose(){this.observer.disconnect();this.renderer.domElement.removeEventListener('webglcontextlost',this.lost);this.scene.traverse(o=>{if(o instanceof THREE.DirectionalLight)o.shadow.dispose();});this.kit.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
