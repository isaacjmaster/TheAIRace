import * as THREE from 'three';
import {WorldKit,palette as c} from './world';
import {founderHQ} from './FounderHQ';
import {gpuRigModel,animateGpu} from './GpuRig';

/** A small, isolated toy campus; it never reads or changes the saved base. */
export class TitleDiorama {
 private renderer:THREE.WebGLRenderer;
 private scene=new THREE.Scene();private camera=new THREE.OrthographicCamera(-12,12,12,-12,.1,100);
 private kit=new WorldKit();private campus=new THREE.Group();private gpu:THREE.Group;private bot=new THREE.Group();
 private frame=0;private last=0;private elapsed=0;private active=true;private disposed=false;
 private observer:ResizeObserver;private motion=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(private host:HTMLElement,private onFailure:()=>void){
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.renderer.setClearColor(0x000000,0);this.renderer.domElement.setAttribute('aria-hidden','true');host.append(this.renderer.domElement);
  this.scene.add(new THREE.HemisphereLight('#ffffff','#82b9bd',2.3));
  const sun=new THREE.DirectionalLight('#fff2cf',3);sun.position.set(-10,22,16);sun.castShadow=true;
  sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:60});sun.shadow.normalBias=.04;this.scene.add(sun);
  this.scene.add(this.campus);const k=this.kit;
  k.box(this.campus,[18,.65,14],[0,-.16,0],'#20b9b4',.3);
  k.box(this.campus,[18,.3,14],[0,.28,0],'#fffbed',.18);
  k.box(this.campus,[16.9,.06,12.9],[0,.46,0],'#bce2c0',.08);
  // Broad, simple paths connect the three silhouettes.
  k.box(this.campus,[15,.045,1.45],[0,.51,3.7],'#fffbed',.08);
  k.box(this.campus,[1.3,.045,9],[2.4,.51,-.2],'#fffbed',.08);
  const house=founderHQ(k,this.campus);house.position.set(-3.2,.52,-1.6);house.scale.setScalar(.82);
  this.gpu=gpuRigModel(k);this.gpu.position.set(5,.55,2);this.gpu.scale.setScalar(1.2);this.campus.add(this.gpu);
  const fab=new THREE.Group();fab.position.set(4.5,.55,-3.7);this.campus.add(fab);
  k.box(fab,[3.5,.25,2.5],[0,.12,0],c.dark,.12);k.box(fab,[3.1,.12,2.2],[0,.3,0],c.cream,.08);
  for(const x of [-1.35,1.35]){k.box(fab,[.5,2.1,1],[x,1.35,-.55],c.dark,.08);k.box(fab,[.17,.7,.08],[x,1.4,.01],c.cyan,.025,true);}
  k.box(fab,[3.4,.6,1.3],[0,2.65,-.55],c.cream,.1);k.box(fab,[1.8,.2,.08],[0,2.65,.15],c.cyan,.03,true);
  k.cylinder(fab,.65,.12,[0,.48,.25],c.gold);k.box(fab,[.8,.75,.65],[0,.9,.25],c.cream,.12);k.box(fab,[.65,.25,.05],[0,1,.6],c.dark,.05);
  // A small yellow builder, deliberately simple and readable at menu scale.
  this.bot.position.set(-.2,.56,3.7);this.bot.scale.setScalar(1.65);this.campus.add(this.bot);
  k.box(this.bot,[.85,.7,.7],[0,.8,0],c.gold,.14);k.box(this.bot,[1,.72,.8],[0,1.5,0],c.cream,.15);
  k.box(this.bot,[.8,.42,.06],[0,1.5,.43],c.dark,.1);
  for(const x of [-.22,.22])k.box(this.bot,[.1,.13,.04],[x,1.52,.48],c.cyan,.025,true);
  k.box(this.bot,[1.08,.16,.88],[0,1.91,0],c.gold,.08);k.box(this.bot,[.65,.3,.65],[0,2.07,-.02],c.gold,.12);
  for(const x of [-.3,.3])k.box(this.bot,[.35,.25,.52],[x,.24,.1],c.dark,.06);
  const arm=k.box(this.bot,[.24,.65,.28],[.6,.9,0],c.cream,.06);arm.name='wave-arm';arm.rotation.z=-.3;
  k.box(this.bot,[.24,.65,.28],[-.6,.9,0],c.cream,.06);
  for(const [x,z] of [[-7,-4],[7,-5],[-7,4]])k.tree(this.campus,x,z,.8);
  // Merge static pieces by material, keeping fans and the bot arm movable.
  for(const [i,group] of [house,house.getObjectByName('Founder at laptop'),fab,this.campus].entries())if(group)k.batchStatic(group,'title-campus-'+i);
  this.camera.position.set(22,25,32);this.camera.lookAt(0,1.4,0);
  this.observer=new ResizeObserver(this.resize);this.observer.observe(host);
  document.addEventListener('visibilitychange',this.updateActivity);this.motion.addEventListener('change',this.updateActivity);
  this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
  this.resize();this.updateActivity();
 }
 private resize=()=>{if(this.disposed)return;const {width,height}=this.host.getBoundingClientRect();if(width<1||height<1)return;
  const aspect=width/height,span=Math.max(16,23/aspect);this.camera.left=-span*aspect/2;this.camera.right=span*aspect/2;this.camera.top=span/2;this.camera.bottom=-span/2;this.camera.updateProjectionMatrix();
  this.renderer.setSize(width,height);this.render();
 };
 private render=()=>{this.renderer.render(this.scene,this.camera);};
 private tick=(now:number)=>{this.frame=0;if(this.disposed||!this.active||document.hidden||this.motion.matches)return;
  if(now-this.last>=1000/30){const dt=Math.min((now-this.last)/1000,.05);this.last=now;this.elapsed+=dt;
   animateGpu(this.gpu,this.elapsed,dt,true);this.bot.position.y=.56+Math.sin(this.elapsed*2)*.035;this.bot.rotation.y=Math.sin(this.elapsed*.8)*.12;
   const arm=this.bot.getObjectByName('wave-arm');if(arm)arm.rotation.z=-.3+Math.sin(this.elapsed*1.7)*.12;
   this.render();
  }this.frame=requestAnimationFrame(this.tick);
 };
 private updateActivity=()=>{cancelAnimationFrame(this.frame);this.frame=0;if(this.disposed)return;
  if(this.active&&!document.hidden&&!this.motion.matches){this.last=performance.now();this.frame=requestAnimationFrame(this.tick);}else{animateGpu(this.gpu,0,0,true,true);this.bot.position.y=.56;this.bot.rotation.y=0;this.render();}
 };
 private contextLost=(event:Event)=>{event.preventDefault();cancelAnimationFrame(this.frame);this.frame=0;this.active=false;this.onFailure();};
 setActive(active:boolean){this.active=active;this.updateActivity();}
 dispose(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);this.observer.disconnect();document.removeEventListener('visibilitychange',this.updateActivity);this.motion.removeEventListener('change',this.updateActivity);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);this.kit.dispose();this.scene.traverse(o=>{if(o instanceof THREE.Light)o.dispose();});this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
