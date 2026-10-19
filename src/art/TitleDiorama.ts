import * as THREE from 'three';
import {titlePixelRatio} from './titleQuality';
import {WorldKit,palette as c} from './world';
import {founderHQ,animateFounderIdle} from './FounderHQ';
import {researchLabModel,animateResearchLab} from './ResearchLab';
import {builderStationModel} from './BotBuildings';
import {droneStationModel} from './DroneStation';
import {securityDroneModel,animateSecurityDrone} from './SecurityDrone';
import {SecurityWalls} from './SecurityWalls';
import {decorationModel} from './Decorations';
import {gpuRigModel,animateGpu} from './GpuRig';

/** A small, isolated toy campus; it never reads or changes the saved base. */
export class TitleDiorama {
 private renderer:THREE.WebGLRenderer;
 private scene=new THREE.Scene();private camera=new THREE.OrthographicCamera(-12,12,12,-12,.1,100);
 private kit=new WorldKit('campus');private campus=new THREE.Group();private gpu:THREE.Group;private bot=new THREE.Group();
 private house:THREE.Group;private research:THREE.Group;private drone:THREE.Group;private walls:SecurityWalls;
 private frame=0;private last=0;private elapsed=0;private active=true;private disposed=false;
 private observer:ResizeObserver;private motion=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(private host:HTMLElement,private onFailure:()=>void){
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.renderer.setClearColor(0x000000,0);this.renderer.domElement.setAttribute('aria-hidden','true');host.append(this.renderer.domElement);
  this.scene.add(new THREE.HemisphereLight('#e1f4ff','#88a48d',1.9));
  const sun=new THREE.DirectionalLight('#fff2cf',3);sun.position.set(-10,22,16);sun.castShadow=true;
  sun.shadow.mapSize.set(devicePixelRatio>=2?1024:512,devicePixelRatio>=2?1024:512);Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:1,far:70});sun.shadow.normalBias=.04;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;this.scene.add(sun);
  this.scene.add(this.campus);const k=this.kit;
  // A curated showcase, never a snapshot of the player's save.
  k.box(this.campus,[24,.65,20],[0,-.16,0],'#239eaa',.3);
  k.box(this.campus,[24,.3,20],[0,.28,0],'#fff3d9',.18);
  k.box(this.campus,[22.9,.06,18.9],[0,.46,0],'#d8dfd5',.08);
  k.box(this.campus,[9.8,.06,9.5],[-4.3,.51,-2.1],'#a6c995',.14);
  k.box(this.campus,[6.4,.06,6.1],[4.6,.51,-4.4],'#b2ce9c',.14);
  k.box(this.campus,[21.5,.05,1.8],[0,.53,6.9],'#385666',.05);
  for(const x of [-9,-6,-3,0,3,6,9])k.box(this.campus,[1.2,.02,.055],[x,.57,6.9],'#f2d88c',.01);
  k.box(this.campus,[1.5,.04,12],[.1,.54,-.8],'#f7f0dc',.04);
  k.box(this.campus,[20.8,.04,1.3],[0,.54,2.1],'#f7f0dc',.04);
  this.house=founderHQ(k,this.campus,2);this.house.position.set(-4.4,.55,-2.1);this.house.scale.setScalar(.9);
  this.gpu=gpuRigModel(k);this.gpu.position.set(3.1,.55,3.5);this.gpu.scale.setScalar(1.25);this.campus.add(this.gpu);
  this.research=researchLabModel(k);this.research.position.set(4.5,.55,-4.3);this.research.scale.setScalar(1.45);this.campus.add(this.research);
  const station=builderStationModel(k);station.position.set(-3.2,.55,4.6);station.scale.setScalar(.92);this.campus.add(station);
  const dronePad=droneStationModel(k);dronePad.position.set(7.9,.55,1.6);dronePad.scale.setScalar(1.05);this.campus.add(dronePad);
  this.drone=securityDroneModel(k);this.drone.scale.setScalar(1.7);this.drone.position.set(9.3,8.6,-.2);this.campus.add(this.drone);
  this.walls=new SecurityWalls([{id:'west',x:-10.3,z:-1,w:.5,d:13,height:1.25},{id:'rear',x:0,z:-8.4,w:20.6,d:.5,height:1.25},{id:'front-left',x:-7.3,z:8.6,w:6,d:.5,height:1.15},{id:'front-right',x:6.5,z:8.6,w:7.6,d:.5,height:1.15}]);this.walls.group.position.y=.55;this.campus.add(this.walls.group);
  for(const [kind,x,z,scale] of [['cypress',-9,3.1,.8],['ornamental',8.9,-5.6,.85],['planter',-3.3,1.9,.8],['flowers',-7.8,4.4,.8]] as const){const m=decorationModel(k,kind);m.position.set(x,.55,z);m.scale.setScalar(scale);this.campus.add(m);}
  // A small yellow builder, deliberately simple and readable at menu scale.
  this.bot.position.set(.25,.56,5);this.bot.scale.setScalar(1.25);this.campus.add(this.bot);
  k.box(this.bot,[.85,.7,.7],[0,.8,0],c.gold,.14);k.box(this.bot,[1,.72,.8],[0,1.5,0],c.cream,.15);
  k.box(this.bot,[.8,.42,.06],[0,1.5,.43],c.dark,.1);
  for(const x of [-.22,.22])k.box(this.bot,[.1,.13,.04],[x,1.52,.48],c.cyan,.025,true);
  k.box(this.bot,[1.08,.16,.88],[0,1.91,0],c.gold,.08);k.box(this.bot,[.65,.3,.65],[0,2.07,-.02],c.gold,.12);
  for(const x of [-.3,.3])k.box(this.bot,[.35,.25,.52],[x,.24,.1],c.dark,.06);
  const arm=k.box(this.bot,[.24,.65,.28],[.6,.9,0],c.cream,.06);arm.name='wave-arm';arm.rotation.z=-.3;
  k.box(this.bot,[.24,.65,.28],[-.6,.9,0],c.cream,.06);
  // Only static siblings are merged; fans, founder joints and the drone stay animated.
  k.batchStatic(this.campus,'title-campus-plinth');k.batchStatic(this.gpu,'title-gpu');k.batchStatic(this.research,'title-research');k.batchStatic(this.drone,'title-drone');
  for(const rotor of this.drone.children)if(rotor.name==='rotor')k.batchStatic(rotor,'title-drone-'+rotor.position.x);
  this.renderer.domElement.dataset.showcase='hq2,gpu,builder,research,droneStation,drone,walls,gardens';
  this.camera.position.set(23,29,35);this.camera.lookAt(0,1,0);
  this.observer=new ResizeObserver(this.resize);this.observer.observe(host);
  window.addEventListener('resize',this.resize);document.addEventListener('visibilitychange',this.updateActivity);this.motion.addEventListener('change',this.updateActivity);
  this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
  this.resize();this.updateActivity();
 }
 private resize=()=>{if(this.disposed)return;const {width,height}=this.host.getBoundingClientRect();if(width<1||height<1)return;
  const aspect=width/height,span=Math.max(22,32/aspect);this.camera.left=-span*aspect/2;this.camera.right=span*aspect/2;this.camera.top=span/2;this.camera.bottom=-span/2;this.camera.updateProjectionMatrix();
  this.renderer.setPixelRatio(titlePixelRatio(width,height,devicePixelRatio||1));this.renderer.setSize(width,height,false);const canvas=this.renderer.domElement;canvas.dataset.pixelRatio=String(this.renderer.getPixelRatio());canvas.dataset.bufferSize=canvas.width+'x'+canvas.height;this.render();
 };
 private render=()=>{this.renderer.render(this.scene,this.camera);this.renderer.domElement.dataset.drawCalls=String(this.renderer.info.render.calls);this.renderer.domElement.dataset.triangles=String(this.renderer.info.render.triangles);};
 private tick=(now:number)=>{this.frame=0;if(this.disposed||!this.active||document.hidden||this.motion.matches)return;
  if(now-this.last>=1000/30){const dt=Math.min((now-this.last)/1000,.05);this.last=now;this.elapsed+=dt;
   animateGpu(this.gpu,this.elapsed,dt,true);animateResearchLab(this.research,this.elapsed,true,false);animateFounderIdle(this.house,this.elapsed);animateSecurityDrone(this.drone,this.elapsed,false);this.drone.position.set(9.3+Math.sin(this.elapsed*.3)*.6,8.6+Math.sin(this.elapsed*1.6)*.09,-.2+Math.cos(this.elapsed*.3)*.5);this.drone.rotation.y=.5+Math.sin(this.elapsed*.3)*.2;this.bot.position.y=.56+Math.sin(this.elapsed*2)*.035;this.bot.rotation.y=Math.sin(this.elapsed*.8)*.12;
   const arm=this.bot.getObjectByName('wave-arm');if(arm)arm.rotation.z=-.3+Math.sin(this.elapsed*1.7)*.12;
   this.render();
  }this.frame=requestAnimationFrame(this.tick);
 };
 private updateActivity=()=>{cancelAnimationFrame(this.frame);this.frame=0;if(this.disposed)return;
  if(this.active&&!document.hidden&&!this.motion.matches){this.last=performance.now();this.frame=requestAnimationFrame(this.tick);}else{animateGpu(this.gpu,0,0,true,true);animateResearchLab(this.research,0,true,true);animateFounderIdle(this.house,0,true);animateSecurityDrone(this.drone,0,true);this.drone.position.set(9.3,8.6,-.2);this.bot.position.y=.56;this.bot.rotation.y=0;this.render();}
 };
 private contextLost=(event:Event)=>{event.preventDefault();cancelAnimationFrame(this.frame);this.frame=0;this.active=false;this.onFailure();};
 setActive(active:boolean){this.active=active;this.updateActivity();}
 dispose(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);this.observer.disconnect();window.removeEventListener('resize',this.resize);document.removeEventListener('visibilitychange',this.updateActivity);this.motion.removeEventListener('change',this.updateActivity);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);this.walls.dispose();this.kit.dispose();this.scene.traverse(o=>{if(o instanceof THREE.Light)o.dispose();});this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
