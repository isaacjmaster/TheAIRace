import {animateCompoundBot,syncCompoundInstances} from './HangarCompound';
import {sentinelModel,animateSentinel} from './SentinelTower';
import {titleBuilderPose,TITLE_BUILDER_START} from './titleBuilderRoute';
import {PowerConnections} from './PowerConnections';
import * as THREE from 'three';
import {titlePixelRatio} from './titleQuality';
import {WorldKit,palette as c} from './world';
import {founderHQ,animateFounderIdle} from './FounderHQ';
import {researchLabModel,animateResearchLab} from './ResearchLab';
import {fabricatorModel,hangarModel,animateFabricator,builderStationModel} from './BotBuildings';
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
 private fabricator:THREE.Group;private hangar:THREE.Group;private sentinel:THREE.Group;private house:THREE.Group;private research:THREE.Group;private drone:THREE.Group;private walls:SecurityWalls;
 private power=new PowerConnections(.67);
 private startupProgress=()=>1;private energy=new THREE.Group();private powerLights:THREE.Object3D[]=[];
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
  k.box(this.campus,[30,.65,26],[0,-.16,0],'#239eaa',.3);
  k.box(this.campus,[30,.3,26],[0,.28,0],'#fff3d9',.18);
  k.box(this.campus,[29,.08,25],[0,.48,0],'#9ebc75',.08);
  k.box(this.campus,[25,.04,1.2],[0,.54,10],'#dedcc2',.04);
  k.box(this.campus,[1.1,.04,20],[-2,.54,-.5],'#dedcc2',.04);
  this.house=founderHQ(k,this.campus,2);this.house.position.set(-7,.55,-5);this.house.scale.setScalar(.9);
  this.gpu=gpuRigModel(k);this.gpu.position.set(0,.55,-3);this.gpu.scale.setScalar(1.15);this.campus.add(this.gpu);
  this.research=researchLabModel(k);this.research.position.set(6,.55,-7);this.research.scale.setScalar(1.15);this.campus.add(this.research);
  this.fabricator=fabricatorModel(k);this.fabricator.position.set(-7,.55,4.5);this.fabricator.scale.setScalar(1.2);this.campus.add(this.fabricator);
  this.hangar=hangarModel(k,3,'compound');this.hangar.position.set(7,.55,4);this.campus.add(this.hangar);
  this.sentinel=sentinelModel(k);this.sentinel.position.set(-.5,.55,6.8);this.sentinel.scale.setScalar(1.2);this.campus.add(this.sentinel);
  this.scene.add(this.power.group);this.power.sync(this.house,[{id:'rig',model:this.gpu}],[{x:-7,z:-5,w:8.1,d:7.2},{x:0,z:-3,w:4.6,d:3.5},{x:6,z:-7,w:5,d:4}]);
  const station=builderStationModel(k);station.position.set(-11,.55,4.5);this.campus.add(station);
  const dronePad=droneStationModel(k);dronePad.position.set(11,.55,-3);this.campus.add(dronePad);
  this.drone=securityDroneModel(k);this.drone.scale.setScalar(1.4);this.drone.position.set(9.3,10,-.2);this.campus.add(this.drone);
  this.walls=new SecurityWalls([{id:'west',x:-14,z:-1,w:.5,d:21,height:1.25},{id:'rear',x:0,z:-11.5,w:28,d:.5,height:1.25},{id:'front-left',x:-10,z:11.8,w:6,d:.5,height:1.15},{id:'front-right',x:8,z:11.8,w:10,d:.5,height:1.15}]);this.walls.group.position.y=.55;this.campus.add(this.walls.group);
  for(const [kind,x,z,scale] of [['cypress',-12.5,-8,.8],['ornamental',12,-8,.85],['planter',-7,-.2,.8],['flowers',-11,8,.8],['flowers',11,9,.8]] as const){const m=decorationModel(k,kind);m.position.set(x,.55,z);m.scale.setScalar(scale);this.campus.add(m);}
  // A small yellow builder, deliberately simple and readable at menu scale.
  this.bot.position.set(TITLE_BUILDER_START.x,.56,TITLE_BUILDER_START.z);this.bot.scale.setScalar(1.25);this.campus.add(this.bot);
  k.box(this.bot,[.85,.7,.7],[0,.8,0],c.gold,.14);k.box(this.bot,[1,.72,.8],[0,1.5,0],c.cream,.15);
  k.box(this.bot,[.8,.42,.06],[0,1.5,.43],c.dark,.1);
  for(const x of [-.22,.22])k.box(this.bot,[.1,.13,.04],[x,1.52,.48],c.cyan,.025,true);
  k.box(this.bot,[1.08,.16,.88],[0,1.91,0],c.gold,.08);k.box(this.bot,[.65,.3,.65],[0,2.07,-.02],c.gold,.12);
  for(const x of [-.3,.3])k.box(this.bot,[.35,.25,.52],[x,.24,.1],c.dark,.06);
  const arm=k.box(this.bot,[.24,.65,.28],[.6,.9,0],c.cream,.06);arm.name='wave-arm';arm.rotation.z=-.3;
  k.box(this.bot,[.24,.65,.28],[-.6,.9,0],c.cream,.06);
  this.campus.add(this.energy);k.box(this.energy,[.28,.14,.28],[0,0,0],c.cyan,.08,true);
  for(const x of [5.5,6,6.5]){const light=new THREE.Group();light.position.set(x,3.5,-7);k.box(light,[.22,.12,.22],[0,0,0],c.cyan,.05,true);this.campus.add(light);this.powerLights.push(light);}
  // Only static siblings are merged; fans, founder joints and the drone stay animated.
  k.batchStatic(this.campus,'title-campus-plinth');k.batchStatic(this.gpu,'title-gpu');k.batchStatic(this.research,'title-research');k.batchStatic(this.drone,'title-drone');
  for(const rotor of this.drone.children)if(rotor.name==='rotor')k.batchStatic(rotor,'title-drone-'+rotor.position.x);
  this.renderer.domElement.dataset.showcase='hq2,gpu,builder,research,fabricator,hangar,cipherBots,sentinel,droneStation,drone,walls,gardens';
  this.camera.position.set(23,29,35);this.camera.lookAt(0,1,0);
  this.observer=new ResizeObserver(this.resize);this.observer.observe(host);
  window.addEventListener('resize',this.resize);document.addEventListener('visibilitychange',this.updateActivity);this.motion.addEventListener('change',this.updateActivity);
  this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
  this.resize();this.updateActivity();
 }
 private resize=()=>{if(this.disposed)return;const {width,height}=this.host.getBoundingClientRect();if(width<1||height<1)return;
  const aspect=width/height,span=Math.max(28,40/aspect);this.camera.left=-span*aspect/2;this.camera.right=span*aspect/2;this.camera.top=span/2;this.camera.bottom=-span/2;this.camera.updateProjectionMatrix();
  this.renderer.setPixelRatio(titlePixelRatio(width,height,devicePixelRatio||1));this.renderer.setSize(width,height,false);const canvas=this.renderer.domElement;canvas.dataset.pixelRatio=String(this.renderer.getPixelRatio());canvas.dataset.bufferSize=canvas.width+'x'+canvas.height;this.render();
 };
 private render=()=>{this.renderer.render(this.scene,this.camera);this.renderer.domElement.dataset.drawCalls=String(this.renderer.info.render.calls);this.renderer.domElement.dataset.triangles=String(this.renderer.info.render.triangles);};
 private tick=(now:number)=>{this.frame=0;if(this.disposed||!this.active||document.hidden||this.motion.matches)return;
  if(now-this.last>=1000/30){const dt=Math.min((now-this.last)/1000,.05);this.last=now;this.elapsed+=dt;
   const p=this.startupProgress();animateGpu(this.gpu,this.elapsed,dt,p>=.18);animateResearchLab(this.research,this.elapsed,p>=.65,false);animateFounderIdle(this.house,this.elapsed);animateSecurityDrone(this.drone,this.elapsed,false);this.drone.position.set(9.3+Math.sin(this.elapsed*.3)*.6,8.6+Math.sin(this.elapsed*1.6)*.09,-.2+Math.cos(this.elapsed*.3)*.5);this.drone.rotation.y=.5+Math.sin(this.elapsed*.3)*.2;this.bot.position.y=.56+Math.sin(this.elapsed*2)*.035;this.bot.rotation.y=Math.sin(this.elapsed*.8)*.12;
   for(let i=0;i<3;i++){const bot=this.hangar.getObjectByName('docked-bot-'+i);if(bot)animateCompoundBot(bot,i,this.elapsed,false,dt);}syncCompoundInstances(this.hangar);
   animateFabricator(this.fabricator,this.elapsed,(this.elapsed%5)/5,true,false);animateSentinel(this.sentinel,{id:'showcase',yaw:Math.sin(this.elapsed*.22)*.65,lockShots:0},0,dt);
   this.powerOn(p);
   const arm=this.bot.getObjectByName('wave-arm');if(arm)arm.rotation.z=-.3+Math.sin(this.elapsed*1.7)*.12;
   this.render();
  }this.frame=requestAnimationFrame(this.tick);
 };
 private updateActivity=()=>{cancelAnimationFrame(this.frame);this.frame=0;if(this.disposed)return;
  if(this.active&&!document.hidden&&!this.motion.matches){this.last=performance.now();this.frame=requestAnimationFrame(this.tick);}else{animateGpu(this.gpu,0,0,true,true);animateResearchLab(this.research,0,true,true);animateFounderIdle(this.house,0,true);animateSecurityDrone(this.drone,0,true);this.drone.position.set(9.3,8.6,-.2);this.bot.position.y=.56;this.bot.rotation.y=0;this.render();}
 };
 private contextLost=(event:Event)=>{event.preventDefault();cancelAnimationFrame(this.frame);this.frame=0;this.active=false;this.onFailure();};
 setStartupProgress(read:()=>number){this.startupProgress=read;if(this.motion.matches){this.powerOn(1);this.render();}}
 private powerOn(p:number){
  const pose=titleBuilderPose(p);this.bot.position.x=pose.x;this.bot.position.z=pose.z;this.bot.rotation.y=pose.yaw;
  const pulse=p>=.18&&p<=.32?Math.sin((p-.18)/.14*Math.PI)*.035:0;this.gpu.scale.setScalar(1.15+pulse);
  this.powerLights.forEach((light,i)=>light.visible=p>=.65+i*.035);
  const t=THREE.MathUtils.clamp((p-.52)/.4,0,1),a=t<.5?[3.1,3.5]:[-4.4,-2.1],b=t<.5?[-4.4,-2.1]:[4.5,-4.3],u=t<.5?t*2:(t-.5)*2;
  this.energy.visible=false;this.energy.position.set(a[0]+(b[0]-a[0])*u,.7,a[1]+(b[1]-a[1])*u);this.renderer.domElement.dataset.powerProgress=p.toFixed(3);
 }
 setActive(active:boolean){this.active=active;this.updateActivity();}
 dispose(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);this.observer.disconnect();window.removeEventListener('resize',this.resize);document.removeEventListener('visibilitychange',this.updateActivity);this.motion.removeEventListener('change',this.updateActivity);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);this.walls.dispose();this.power.dispose();this.kit.dispose();this.scene.traverse(o=>{if(o instanceof THREE.Light)o.dispose();});this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
