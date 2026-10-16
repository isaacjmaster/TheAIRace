import * as THREE from 'three';
import { FACILITIES, constructionJobs, builderCount, type CampusState, type BuildingId } from '../../shared/progression';
import { positionFor, BUILDING_FOOTPRINTS, OBSTACLES } from '../../shared/campus-layout';
import { lightWorld, palette as c, WorldKit } from './world';

/** Reconstructs the original garage's objects in the raid's low-poly material language. */
export class HeadquartersScene {
 readonly renderer:THREE.WebGLRenderer;
 private scene=new THREE.Scene();private camera=new THREE.OrthographicCamera();private kit=new WorldKit();
 private center=new THREE.Vector3(-3,0,0);private target=new THREE.Vector3(-3,0,0);private zoomTarget=1;
 private home=new THREE.Vector3(-3,0,0);private worldSpan=30;private pickables:THREE.Object3D[]=[];private raycaster=new THREE.Raycaster();
 private garage=new THREE.Group();private buildingGroups=new Map<BuildingId,THREE.Group>();
 private obstacles=new Map<string,THREE.Group>();private obstacleHits:THREE.Object3D[]=[];
 private builders:{group:THREE.Group;from:THREE.Vector3;to:THREE.Vector3;working:boolean;spark:THREE.Object3D}[]=[];
 private accents:THREE.Object3D[]=[];private clearing:{group:THREE.Group;time:number}[]=[];
 private reserved:THREE.Group|undefined;private reservedKit:WorldKit|undefined;private reservedEdges:THREE.LineSegments|undefined;private previewId:BuildingId|undefined;private previewValid=false;private preview:THREE.Group|undefined;private grid:THREE.GridHelper|undefined;private previewMaterials:THREE.Material[]=[];
 private agent=new THREE.Group();private observer:ResizeObserver;private clock=0;private paused=false;
 private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 private lost=(e:Event)=>{e.preventDefault();this.paused=true;this.onError();};
 constructor(private host:HTMLDivElement,level:number,training:number,private campus:CampusState,private onError:()=>void,private minimal=false){
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});lightWorld(this.renderer,this.scene);
  this.renderer.domElement.setAttribute('role','img');this.renderer.domElement.setAttribute('aria-label',`3D headquarters level ${campus.hq}. ${level===0?'One laptop and a mint AI agent in the original garage.':level===1?'A furnished workstation, chair, lamp and plants.':'GPU workbench, server racks and upgraded lighting.'} Drag to pan and pinch to zoom.`);
  this.renderer.domElement.dataset.stage=String(level);host.appendChild(this.renderer.domElement);this.renderer.domElement.addEventListener('webglcontextlost',this.lost);
  this.buildEnvironment();this.build(Math.min(2,level),training);this.buildCampus(campus);this.buildObstacles(campus);this.buildBots(campus);if(this.minimal){this.home.set(-5,0,0);this.worldSpan=36;}this.center.copy(this.home);this.target.copy(this.home);this.camera.position.copy(this.home).add(new THREE.Vector3(7,23,30));this.camera.lookAt(this.center);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
 }
 private build(level:number,training:number){
  const k=this.kit,s=this.garage;this.scene.add(s);this.buildingGroups.set('hq',s);
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
  if(training>0){k.box(s,[1.7,.25,1.7],[1,.3,1.4],c.slate);k.box(s,[1.2,1.35,1.1],[1,1.05,1.4],c.cream);k.box(s,[.9,.55,.06],[1,1.2,2],c.purple,.03,true);for(let i=0;i<Math.min(3,training);i++)k.box(s,[.18,.1,.04],[.65+i*.3,.7,2],c.cyan,.01,true);}
  // Cutaway architecture keeps the original laptop visible while strengthening the silhouette.
  k.box(s,[12.5,.3,2.3],[-5,4.65,-4.6],c.dark,.12);
  k.box(s,[12.6,.08,.12],[-5,4.83,-3.44],c.cyan,.02,true);
  for(const x of [-9,-5,-1]){k.box(s,[2.5,.08,1.25],[x,4.86,-4.7],'#244b68',.03);for(let j=0;j<3;j++)k.box(s,[.025,.02,1.15],[x-.7+j*.7,4.91,-4.7],c.cyan,.005);}
  for(const x of [-10.5,.5]){k.box(s,[.4,.4,1.8],[x,.4,3],c.slate);k.box(s,[.45,.04,1.9],[x,.63,3],c.cyan,.01,true);}
  k.box(s,[3.2,.1,1],[-5,.25,3.7],c.slate);
  k.label(s,'AI / STARTUP',[-5,4.1,-3.36],3);

 }
 private buildEnvironment(){
  const k=this.kit,s=this.scene;k.terrain(s,33,29);
  // Low retaining walls, a continuous service road and planted border make this a miniature campus.
  k.box(s,[55,.1,3.2],[1,-.02,9],c.dark,.03);
  for(const z of [7.3,10.7])k.box(s,[55,.18,.24],[1,.01,z],c.slate);
  for(let x=-24;x<28;x+=5)k.box(s,[1.7,.025,.07],[x,.045,9],'#749bb5',.01);
  for(const z of [-20,25]){k.box(s,[55,.4,.65],[2,.08,z],c.dark);k.box(s,[55,.04,.12],[2,.31,z],c.slate);}
  for(const x of [-25,29])k.box(s,[.65,.4,45],[x,.08,2.5],c.dark);
  for(let i=0;i<14;i++){const x=-24+i*4;for(const z of [-23,28])k.tree(s,x,z,1.1+(i%3)*.3);}
  for(const [x,z] of [[-27,-12],[-28,2],[-27,16],[32,-13],[32,2],[32,18]])k.tree(s,x,z,1.7);
  for(const [x,z] of [[-16,7],[13,7],[-16,11],[25,11]]){
   k.box(s,[.18,2.5,.18],[x,1.2,z],c.slate);k.box(s,[1.2,.15,.4],[x,2.5,z],c.dark);k.box(s,[1,.04,.3],[x,2.4,z],c.cyan,.02,true);
  }
  // Drainage strips, a gate and delivery station sit outside the editable building area.
  for(let i=0;i<8;i++)k.box(s,[1,.06,.18],[-26,.06,-9+i*.5],c.slate);
  for(const x of [-5,5]){k.box(s,[.7,2.5,.7],[x,1.1,25],c.slate);k.box(s,[.45,.1,.45],[x,2.4,25],c.cyan,.02,true);}
  if(!this.minimal){k.box(s,[4,.7,1.6],[-17,.3,26.3],c.dark);k.label(s,'CAMPUS / 01',[-17,1,27.15],3.8);}
  // A few dark ground panels add texture without drawing over the placement grid.
  for(const [x,z] of [[-18,-15],[23,-15],[-18,19],[22,20]])k.box(s,[3,.03,2],[x,-.07,z],'#2b5360',.1);
 }
 private buildObstacles(campus:CampusState){
  const k=this.kit;
  for(const obstacle of OBSTACLES){
   if(campus.clearedObstacles?.includes(obstacle.id)||this.minimal&&(obstacle.kind==='equipment'||obstacle.kind==='debris'))continue;
   const g=new THREE.Group();g.position.set(obstacle.position[0],0,obstacle.position[1]);this.scene.add(g);this.obstacles.set(obstacle.id,g);
   if(obstacle.kind==='tree'){k.tree(g,-.65,-.3,1.3);k.tree(g,.7,.6,.9);k.cylinder(g,1.3,.13,[0,0,0],'#244954');}
   else if(obstacle.kind==='rock'){for(let i=0;i<3;i++){const rock=k.box(g,[1.3,1+i*.25,1.25],[-.8+i*.7,.45,-.4+i*.4],'#51697c',.3);rock.rotation.y=i*.65;rock.rotation.z=i*.08;}}
   else if(obstacle.kind==='equipment'){k.box(g,[2,1.7,1.5],[0,.8,0],c.slate);k.box(g,[1.6,1.2,.1],[0,.8,.8],c.dark);for(let i=0;i<3;i++)k.box(g,[1.25,.08,.04],[0,.5+i*.3,.87],'#667d86');k.cylinder(g,.4,.5,[.7,1.9,-.4],c.terracotta);}
   else{for(let i=0;i<4;i++){const piece=k.box(g,[1.7,.3,.8],[-.6+i*.35,.2+i*.15,0],i%2?c.slate:c.terracotta);piece.rotation.y=i*.7;}}
   const hit=k.box(g,[obstacle.width,3,obstacle.depth],[0,1.5,0],c.dark);hit.visible=false;hit.userData.obstacleId=obstacle.id;this.obstacleHits.push(hit);
  }
 }
 private buildBots(campus:CampusState){
  const k=this.kit,jobs=constructionJobs(campus),[hx,hz]=positionFor(campus,'hq');
  for(let i=0;i<builderCount(campus);i++){
   const group=new THREE.Group();this.scene.add(group);const job=jobs[i];const from=new THREE.Vector3(hx+4-i*1.2,0,hz+5);
   const destination=job?positionFor(campus,job.building):[hx+4-i*1.2,hz+5];const footprint=job?BUILDING_FOOTPRINTS[job.building]:{width:0,depth:0};
   const to=new THREE.Vector3(destination[0]+(job?footprint.width/2-.4:0),0,destination[1]+(job?footprint.depth/2+.4:0));
   group.position.copy(from);k.box(group,[.8,.6,.7],[0,.7,0],c.gold,.14);k.box(group,[.65,.3,.08],[0,.76,.38],c.dark);
   for(const x of [-.17,.17])k.box(group,[.09,.1,.04],[x,.8,.44],c.cyan,.02,true);
   for(const x of [-.4,.4]){const wheel=k.cylinder(group,.23,.18,[x,.3,0],c.dark);wheel.rotation.z=Math.PI/2;}
   k.box(group,[.2,.6,.2],[.55,.7,0],c.slate);k.box(group,[.55,.15,.15],[.55,1.05,.1],c.cream);
   k.cylinder(group,.04,.3,[0,1.15,0],c.slate);k.box(group,[.14,.14,.14],[0,1.35,0],c.cyan,.03,true);
   const spark=k.box(group,[.17,.17,.17],[.72,1.15,.25],c.cyan,.01,true);spark.visible=false;
   this.builders.push({group,from,to,working:!!job,spark});
   if(job&&job.building==='hq'){for(const x of [-6.6,6.6]){k.box(this.garage,[.14,5,.14],[-5+x,2.5,3],c.gold);k.box(this.garage,[.14,.15,8],[-5+x,4.5,-1],c.gold);}}
  }
  this.renderer.domElement.dataset.builders=String(builderCount(campus));
 }
 private setRay(clientX:number,clientY:number){
  const rect=this.renderer.domElement.getBoundingClientRect();if(!rect.width||!rect.height)return false;
  this.camera.updateMatrixWorld();this.scene.updateMatrixWorld(true);this.raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),this.camera);return true;
 }
 pickObstacle(clientX:number,clientY:number):string|undefined{
  if(!this.setRay(clientX,clientY))return;
  return this.raycaster.intersectObjects(this.obstacleHits,false)[0]?.object.userData.obstacleId as string|undefined;
 }
 groundPoint(clientX:number,clientY:number):[number,number]|undefined{
  if(!this.setRay(clientX,clientY))return;const hit=this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());return hit?[Math.round(hit.x),Math.round(hit.z)]:undefined;
 }
 previewPlacement(id:BuildingId,position:[number,number],valid:boolean){
  if(this.preview&&this.previewId===id&&this.previewValid===valid){this.preview.position.set(position[0],.15,position[1]);return;}
  this.clearPlacement();this.previewId=id;this.previewValid=valid;const color=valid?c.cyan:c.coral,foot=BUILDING_FOOTPRINTS[id];
  // Locked future lots are still reserved by the placement validator, so expose their boundaries here.
  this.reserved=new THREE.Group();this.scene.add(this.reserved);this.reservedKit=new WorldKit();const lines:number[]=[];
  for(const other of Object.keys(BUILDING_FOOTPRINTS) as BuildingId[]){
   if(other===id)continue;const [x,z]=positionFor(this.campus,other),f=BUILDING_FOOTPRINTS[other];
   const left=x-f.width/2,right=x+f.width/2,back=z-f.depth/2,front=z+f.depth/2;
   lines.push(left,.19,back,right,.19,back,right,.19,back,right,.19,front,right,.19,front,left,.19,front,left,.19,front,left,.19,back);
   const facility=FACILITIES.find(item=>item.id===other),locked=facility&&this.campus.hq<facility.unlock;
   this.reservedKit.label(this.reserved,(facility?.name||'AI Headquarters').toUpperCase()+(locked?' / LOCKED':''),[x,.65,front],Math.min(f.width,6.8));
  }
  const edgeGeometry=new THREE.BufferGeometry();edgeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
  this.reservedEdges=new THREE.LineSegments(edgeGeometry,new THREE.LineBasicMaterial({color:c.gold,transparent:true,opacity:.9}));this.reserved.add(this.reservedEdges);
  this.grid=new THREE.GridHelper(56,56,'#53e1ec','#355873');this.grid.position.set(2,.13,3);this.scene.add(this.grid);
  this.preview=new THREE.Group();this.preview.position.set(position[0],.15,position[1]);this.scene.add(this.preview);
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.28,depthWrite:false});this.previewMaterials.push(material);
  const shape=new THREE.Mesh(new THREE.BoxGeometry(foot.width,.2,foot.depth),material);shape.userData.previewGeometry=true;this.preview.add(shape);
  const original=this.buildingGroups.get(id);
  if(original){const ghost=original.clone(true);ghost.position.set(id==='hq'?5:0,.2,id==='hq'?1:0);ghost.traverse(o=>{if(o instanceof THREE.Mesh){o.material=material;o.castShadow=false;}});this.preview.add(ghost);}
 }
 clearPlacement(){
  this.previewId=undefined;
  if(this.reserved){this.scene.remove(this.reserved);this.reserved=undefined;}
  this.reservedKit?.dispose();this.reservedKit=undefined;
  if(this.reservedEdges){this.reservedEdges.geometry.dispose();(this.reservedEdges.material as THREE.Material).dispose();this.reservedEdges=undefined;}
  if(this.preview){this.preview.traverse(o=>{if(o instanceof THREE.Mesh&&o.userData.previewGeometry)o.geometry.dispose();});this.scene.remove(this.preview);this.preview=undefined;}
  if(this.grid){this.scene.remove(this.grid);this.grid.geometry.dispose();const materials=Array.isArray(this.grid.material)?this.grid.material:[this.grid.material];materials.forEach(m=>m.dispose());this.grid=undefined;}
  this.previewMaterials.forEach(m=>m.dispose());this.previewMaterials=[];
 }
 animateClear(obstacleId:string){const group=this.obstacles.get(obstacleId);if(!group)return;this.obstacleHits=this.obstacleHits.filter(o=>o.userData.obstacleId!==obstacleId);this.clearing.push({group,time:0});this.obstacles.delete(obstacleId);}
 private animateWorld(dt:number){
  for(const item of this.clearing){item.time+=dt;item.group.scale.setScalar(Math.max(0,1-item.time/.65));item.group.rotation.y=item.time*2;item.group.position.y=item.time*.5;if(item.time>=.65)this.scene.remove(item.group);}this.clearing=this.clearing.filter(item=>item.time<.65);
  if(this.reduced){for(const bot of this.builders)bot.group.position.copy(bot.to);return;}
  for(const accent of this.accents)accent.rotation.y+=dt*.28;
  for(let i=0;i<this.builders.length;i++){const bot=this.builders[i],travel=Math.min(1,this.clock/2.4);bot.group.position.lerpVectors(bot.from,bot.to,travel);if(bot.working&&travel===1){bot.group.rotation.z=Math.sin(this.clock*8+i)*.06;bot.spark.visible=Math.sin(this.clock*18+i)>.5;bot.spark.scale.setScalar(.7+Math.sin(this.clock*12)*.3);}else if(!bot.working){bot.group.rotation.y=Math.sin(this.clock*.4+i)*.2;}}
 }
 private hitVolume(id:BuildingId,x:number,z:number,width:number,depth:number,height:number){
  const mesh=this.kit.box(this.scene,[width,height,depth],[x,height/2,z],c.dark);mesh.visible=false;mesh.userData.buildingId=id;this.pickables.push(mesh);
 }
 /** Fixed lots grow into a campus; unopened land stays empty and the original garage remains. */
 private buildCampus(campus:CampusState){
  const k=this.kit,s=this.scene;const [hx,hz]=positionFor(campus,'hq');this.garage.position.set(hx+5,0,hz+1);this.hitVolume('hq',hx,hz,12,9,6.8);
  let maxX=hx+6,minX=hx-6,minZ=hz-5,maxZ=hz+5;
  for(const facility of FACILITIES){
   if(campus.hq<facility.unlock)continue;
   const [x,z]=positionFor(campus,facility.id),level=campus.buildings[facility.id];minX=Math.min(minX,x-4);maxX=Math.max(maxX,x+3.6);minZ=Math.min(minZ,z-3.6);maxZ=Math.max(maxZ,z+3.6);
   // Walkways branch from the existing garage approach without enclosing the landscape.
   k.box(s,[Math.max(1,Math.abs(x-(hx+8))),.08,1],[hx+8+(x-(hx+8))/2,.01,z],c.slate,.04);
   k.box(s,[1,.08,Math.max(1,Math.abs(z-(hz+6)))],[hx+8,.01,(z+hz+6)/2],c.slate,.04);
   this.hitVolume(facility.id,x,z,6.8,6.4,level?6:1);
   const g=new THREE.Group();g.position.set(x,0,z);s.add(g);this.buildingGroups.set(facility.id,g);
   if(constructionJobs(campus).some(job=>job.building===facility.id)){for(const px of [-3,3]){k.box(g,[.12,2.8,.12],[px,1.4,-2.7],c.gold);k.box(g,[.12,2.8,.12],[px,1.4,2.7],c.gold);k.box(g,[.12,.12,5.5],[px,2.7,0],c.gold);}}
   if(!level){
    for(const side of [-1,1]){k.box(g,[5.8,.1,.12],[0,.03,side*2.8],c.slate);k.box(g,[.12,.1,5.6],[side*2.9,.03,0],c.slate);}
    k.box(g,[.75,.1,.75],[0,.08,0],c.slate);k.box(g,[.4,.035,.08],[0,.15,0],c.cyan);k.box(g,[.08,.035,.4],[0,.15,0],c.cyan);
    k.label(g,facility.name.toUpperCase(),[0,.85,2.8],4.8);continue;
   }
   const tier=Math.min(4,level),height=1.2+level*.25;
   // Shared perimeter service deck and illuminated entrance tie the facilities together.
   for(const px of [-2.8,2.8]){k.box(g,[.22,.65,5],[px,.56,-.2],c.slate);k.box(g,[.06,.06,4.8],[px,.92,-.2],c.cyan,.01,true);}
   k.box(g,[1.5,.18,.65],[0,.14,3],c.slate);k.box(g,[1,.04,.12],[0,.25,3.24],c.cyan,.01,true);
   k.box(g,[.6,1.1,.65],[2.1,.85,1.7],c.dark);k.box(g,[.4,.4,.04],[2.1,1.05,2.05],c.cyan,.02,true);

   k.box(g,[6.2,.22,5.8],[0,.08,0],c.dark,.12);
   k.box(g,[5.6,.12,5.2],[0,.24,0],c.slate,.06);
   if(facility.id==='compute'){
    // Open server hall: growing rows of independently readable cyan racks.
    for(let i=0;i<Math.min(6,level+2);i++){const px=-1.8+(i%3)*1.8,pz=-1.4+Math.floor(i/3)*2.2;k.box(g,[1.2,height,1.4],[px,.35+height/2,pz],c.dark,.1);for(let j=0;j<tier+2;j++)k.box(g,[.94,.12,.05],[px,.5+j*(height-.3)/(tier+1),pz+.73],c.cyan,.02,true);}
    k.box(g,[5.6,.18,.24],[0,height+.65,-2.3],c.cyan,.03,true);
   }else if(facility.id==='revenue'){
    // Credit vault: gold transit rings and protected storage columns.
    k.box(g,[4.4,height,3.6],[0,.35+height/2,-.4],c.slate,.18);
    for(let i=0;i<Math.min(4,level+1);i++)k.cylinder(g,.48,.55+tier*.15,[-1.65+i*1.1,height+.6,-.4],c.gold);
    k.box(g,[2,1.1,.12],[0,1.1,1.48],c.dark);k.box(g,[1.7,.12,.04],[0,1.1,1.56],c.gold,.02,true);
   }else if(facility.id==='training'){
    // Training floor, paired hoops and holographic practice agent.
    for(const px of [-2,2]){k.box(g,[.35,height+1,.4],[px,(height+1)/2+.3,-.5],c.slate);k.box(g,[.09,height,.06],[px,(height+1)/2+.3,-.25],c.purple,.02,true);}
    k.box(g,[4.4,.25,.5],[0,height+1.3,-.5],c.slate);k.cylinder(g,1.3,.12,[0,.4,0],c.purple);
    k.box(g,[.85,1.2,.7],[0,1.1,0],c.cyan,.12,true);for(let i=0;i<tier;i++)k.box(g,[.38,.3,.5],[-1.5+i, .5,1.7],c.purple);
   }else if(facility.id==='gpu'){
    // Parallel accelerator banks with cooling fans and raised cyan heat sinks.
    k.box(g,[4.9,1.2,3.7],[0,.95,0],c.slate,.15);
    for(let i=0;i<Math.min(5,level+1);i++){const px=-1.8+i*.9;k.box(g,[.55,.8+tier*.3,2.8],[px,1.7+tier*.15,-.2],c.dark);k.box(g,[.3,.1,2.5],[px,2.15+tier*.3,-.2],c.cyan,.02,true);}
    for(const px of [-1.3,1.3]){const fan=k.cylinder(g,.48,.12,[px,1,1.95],c.cream);fan.rotation.x=Math.PI/2;}
   }else if(facility.id==='research'){
    // Octagonal lab, antenna and a luminous data crystal.
    k.cylinder(g,2.25,height,[0,height/2+.35,0],c.slate);k.cylinder(g,2.4,.2,[0,height+.45,0],c.dark);
    const crystal=k.box(g,[.85,1.3+tier*.15,.85],[0,height+1.15,0],c.purple,.1,true);crystal.rotation.z=.4;crystal.rotation.y=Math.PI/4;this.accents.push(crystal);
    for(const px of [-1.5,1.5]){k.cylinder(g,.08,1.6,[px,height+1,-.7],c.cream);k.box(g,[.2,.2,.2],[px,height+1.85,-.7],c.cyan,.04,true);}
   }else if(facility.id==='defense'){
    // Armor workshop: heavy corners, shield wall and a compact test emitter.
    k.box(g,[4.8,height,3.6],[0,.35+height/2,0],c.dark,.2);
    for(const px of [-2,2])for(const pz of [-1.4,1.4])k.box(g,[.65,height+.5,.65],[px,.6+height/2,pz],c.slate);
    k.cylinder(g,.85,.6,[0,height+.6,0],c.slate);k.box(g,[.6,.4,2.1],[0,height+1,-.4],c.cyan,.07);
    for(let i=0;i<tier;i++)k.box(g,[.6,.5,.08],[-1.2+i*.8,1.1,1.84],c.coral,.03,true);
   }
   for(let i=0;i<level;i++)k.box(g,[.3,.06,.08],[-2.25+i*.5,.35,2.5],c.cyan,.01,true);
   k.label(g,facility.name.toUpperCase()+' / '+level,[0,.76,2.95],5);
  }
  // Higher HQ tiers visibly expand the garage without replacing its starting laptop.
  if(campus.hq>=4){k.box(this.garage,[12.4,.2,.5],[-5,4.85,-5.4],c.cyan,.03,true);for(let i=0;i<Math.min(6,campus.hq-3);i++)k.box(this.garage,[.5,.55,.3],[-9.8+i*1.7,5.15,-5.4],c.slate);}
  if(campus.hq>=7){for(const x of [-10.8,.7]){k.box(this.garage,[.22,2,.22],[x,5.5,-5.2],c.slate);k.box(this.garage,[.35,.18,.35],[x,6.6,-5.2],c.cyan,.04,true);}}
  this.worldSpan=Math.max(30,(maxX-minX+4)*1.15,(maxZ-minZ+10)*1.3);this.home.set(campus.hq>1?(maxX+minX)/2:hx+2,0,campus.hq>1?(minZ+maxZ)/2:hz+1);
  this.renderer.domElement.dataset.hqLevel=String(campus.hq);
 }
 pick(clientX:number,clientY:number):BuildingId|undefined{
  const rect=this.renderer.domElement.getBoundingClientRect();if(!rect.width||!rect.height)return;
  this.camera.updateMatrixWorld();this.scene.updateMatrixWorld(true);this.raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),this.camera);
  return this.raycaster.intersectObjects(this.pickables,false)[0]?.object.userData.buildingId as BuildingId|undefined;
 }
 private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);const aspect=w/h,span=Math.max(this.worldSpan,this.worldSpan*17/30*aspect);this.camera.left=-span/2;this.camera.right=span/2;this.camera.top=span/aspect/2;this.camera.bottom=-span/aspect/2;this.camera.updateProjectionMatrix();}
 snapshot(){return {x:this.target.x,z:this.target.z,zoom:this.zoomTarget};}
 restore(view:{x:number;z:number;zoom:number}){this.target.set(view.x,0,view.z);this.camera.position.add(this.target.clone().sub(this.center));this.center.copy(this.target);this.zoomTarget=view.zoom;this.camera.zoom=view.zoom;this.camera.lookAt(this.center);this.camera.updateProjectionMatrix();}
 zoom(factor:number){this.zoomTarget=THREE.MathUtils.clamp(this.zoomTarget*factor,.8,1.65);}
 pan(dx:number,dy:number){const scale=(this.camera.right-this.camera.left)/Math.max(1,this.host.clientWidth)/this.camera.zoom;const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0);const up=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1);up.y=0;up.normalize();this.target.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);this.target.y=0;const flat=new THREE.Vector2(this.target.x-this.home.x,this.target.z-this.home.z);const limit=this.worldSpan*.28;if(flat.length()>limit)flat.setLength(limit);this.target.set(this.home.x+flat.x,0,this.home.z+flat.y);}
 reset(){this.target.copy(this.home);this.zoomTarget=1;}
 update(dt:number){if(this.paused)return;this.clock+=dt;const next=this.center.clone().lerp(this.target,this.reduced?1:Math.min(1,dt*10));this.camera.position.add(next.clone().sub(this.center));this.center.copy(next);this.camera.lookAt(this.center);this.camera.zoom=THREE.MathUtils.lerp(this.camera.zoom,this.zoomTarget,this.reduced?1:Math.min(1,dt*10));this.camera.updateProjectionMatrix();this.animateWorld(dt);if(!this.reduced){this.agent.position.y=.55+Math.sin(this.clock*1.4)*.06;this.agent.rotation.y=Math.sin(this.clock*.35)*.15;}this.renderer.render(this.scene,this.camera);this.renderer.domElement.dataset.drawCalls=String(this.renderer.info.render.calls);this.renderer.domElement.dataset.triangles=String(this.renderer.info.render.triangles);}
 dispose(){this.clearPlacement();this.observer.disconnect();this.renderer.domElement.removeEventListener('webglcontextlost',this.lost);this.scene.traverse(o=>{if(o instanceof THREE.DirectionalLight)o.shadow.dispose();});this.kit.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
