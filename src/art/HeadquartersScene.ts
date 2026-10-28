import {troopLevel} from '../../shared/troops';
import {disruptorModel,animateDisruptor,turnDisruptor} from './Disruptor';
import {arcSpireModel,animateArcSpire} from './ArcSpire';
import {clearingJobs} from '../../shared/landscape';
import {applyBuildingLevel,storageModel} from './BuildingLevels';
import {buildingLevel,buildingStats} from '../../shared/building-levels';
import {BreacherArrivals,breacherDockingRoute,breacherHomePose} from './breacherLife';
import {breacherModel,animateBreacher,turnBreacher} from './Breacher';
import {CAMPUS_CAMERA_OFFSET,campusProjection} from './campusCamera';
import {DRONE_PATROL_RADIUS} from '../../shared/security';
import {builderBotModel} from './BuilderBot';
import {sentinelModel} from './SentinelTower';
import {syncCompoundInstances} from './HangarCompound';
import {adjacentWallPreviews} from '../../shared/wall-assistance';
import {PowerConnections} from './PowerConnections';
import {ConstructionVisuals} from './ConstructionVisuals';
import {droneStationModel} from './DroneStation';
import {landscapeRoute,routePosition,campusSecurityWalls,clearingActive} from '../../shared/landscape';
import {SecurityWalls,securityWallModel} from './SecurityWalls';
import {HQSecurityPatrol} from './SecurityDrone';
import {RESEARCH} from '../../shared/research';
import {researchLabModel,animateResearchLab} from './ResearchLab';
import {hqZoomLimits} from './hqZoom';
import {DecorationModels,decorationModel} from './Decorations';
import type {DecorationKind} from '../../shared/decoration-catalog';
import {FOUNDATION_PLOT as P,FOUNDATION_PLOT_WIDTH as W,FOUNDATION_PLOT_DEPTH as D} from '../../shared/foundation-plot';
import {foundationGrid} from './foundationGrid';
import {TechnologyDistrict,districtEnabled} from './TechnologyDistrict';
import {founderHqLevel} from '../../shared/founder-hq';
import {lightCampus} from './CampusFinish';
import {constructionSignature,constructionWork,builderReturn,type BuilderWork} from './builderWork';
import {animateScrapBot,turnScrapBot,handoffScrapPose} from './ScrapBotMotion';
import {MapBoundary,boundaryView} from './MapBoundary';
import {landscapeModel} from './LandscapeObstacles';
import type {ClearingJob,LandscapeObstacle} from '../../shared/landscape';
import {BotArrivals,dockingRoute,DeliveryMotion} from './botLife';
import * as THREE from 'three';
import {portraitCampusSpan} from './portraitCamera';
import {animateFounderIdle,animateFounderHQEnergy,founderHQ,pickFoundationBuilding,type FoundationBuilding} from './FounderHQ';
import {fabricatorModel,hangarModel,builderStationModel,scrapBotModel,animateDockedBot,animateFabricator} from './BotBuildings';
import {animateGpu,gpuRigModel} from './GpuRig';
import {GPU_RIG,FOUNDATION_BUILDINGS,footprint,getHangar,BUILDER_STATION_POSITION,buildingLayout,buildingFootprint,type RotatableBuilding,type Orientation,type FoundationState,type RigPosition} from '../../shared/foundation';
import { FACILITIES, constructionJobs, builderCount, type CampusState, type BuildingId } from '../../shared/progression';
import { positionFor, BUILDING_FOOTPRINTS, OBSTACLES } from '../../shared/campus-layout';
import { lightWorld, palette as c, WorldKit } from './world';

/** Reconstructs the original garage's objects in the raid's low-poly material language. */
export class HeadquartersScene {
 private storageGroups=new Map<string,THREE.Group>();private storageKits=new Map<string,WorldKit>();private storageKeys=new Map<string,string>();
 private levelDetails=new Map<string,{group:THREE.Group;level:number;kit:WorldKit;details?:THREE.Object3D}>();
 private hutGroups=new Map<string,THREE.Group>();private hutKey='';private hutKit?:WorldKit;private hiddenHut?:string;
 private arcSpireGroup?:THREE.Group;private arcSpireKit?:WorldKit;private arcSpireKey='';
 private sentinelGroup?:THREE.Group;private sentinelKit?:WorldKit;private sentinelKey='';private lastSecurityNow=0;private droneStationGroup?:THREE.Group;private droneKit?:WorldKit;private droneKey='';private wallHits:THREE.Object3D[]=[];private hiddenWall?:string;private hiddenWalls=new Set<string>();private rowPreviewKey='';private walls=new SecurityWalls([]);private wallKey='';private security=new HQSecurityPatrol();
 private decorations=new DecorationModels();private decorationPreviewId?:string;
 private district?:TechnologyDistrict;private mapBoundary?:MapBoundary;
 private landscapeKit?:WorldKit;private landscapeGroup?:THREE.Group;private landscapeKey='';private landscapeHits:THREE.Object3D[]=[];private landscapeItems:LandscapeObstacle[]=[];private cleanupJob?:ClearingJob;private cleanupNow=0;private cleanupEnd?:number;private lastCleanup?:string;
 private cleanupVisuals=new Map<number,{job:ClearingJob;route:RigPosition[];returnRoute:RigPosition[];now:number;startAt:number}>();
 private cleanupRoute:RigPosition[]=[];private cleanupReturnRoute:RigPosition[]=[];
 private cleanupParticles:{group:THREE.Group;time:number}[]=[];private particleKit=new WorldKit('campus');
 private stationOwned=true;private workPlan?:BuilderWork;private builderRoute:RigPosition[]=[];private builderSegment=1;private workRoute=0;private workPause=0;private returning=false;private constructionKey='';
 private landmarksSynced=false;private builderHomeYaw=0;
 private layoutPreviewKind?:RotatableBuilding;
 private stationGroup?:THREE.Group;
 private fabricatorGroup?:THREE.Group;private hangarGroup?:THREE.Group;private botKit?:WorldKit;private botKey='';private producing=false;private assemblyProgress=0;private assemblyAt=0;
 private disruptorArrivals=new BreacherArrivals('disruptor',4);private disruptorCount=0;private heavyArrivals=new BreacherArrivals();private heavyCount=0;private arrivals=new BotArrivals();private lastBotState?:FoundationState;private catchup=false;private stagedCount=0;private gpuActive=false;private lifeClock=0;
 private walkers:{troop?:'breacher'|'disruptor';slot:number;group:THREE.Group;motion:DeliveryMotion;delay:number;settled:number;finished:boolean}[]=[];
 private visibility=()=>{this.catchup=true;};
 private labGroup?:THREE.Group;private labKit?:WorldKit;private labKey='';private labActive=false;
 private rig2Group?:THREE.Group;private rig2Kit?:WorldKit;private rig2Position?:RigPosition;private gpu2Active=false;
 private rigGroup?:THREE.Group;private rigKit?:WorldKit;private rigKey='';private rigPosition?:RigPosition;
 private rigPreview?:THREE.Group;private rigPreviewKit?:WorldKit;private rigPreviewMaterial?:THREE.MeshBasicMaterial;private rigGrid?:THREE.LineSegments;
 readonly renderer:THREE.WebGLRenderer;
 private scene=new THREE.Scene();private constructionVisuals=new ConstructionVisuals(this.scene);private camera=new THREE.OrthographicCamera();private kit=new WorldKit('campus');
 private center=new THREE.Vector3(-3,0,0);private target=new THREE.Vector3(-3,0,0);private zoomTarget=1;
 private home=new THREE.Vector3(-3,0,0);private worldSpan=30;private pickables:THREE.Object3D[]=[];private raycaster=new THREE.Raycaster();
 private power=new PowerConnections();private cablePreview?:{kind:RotatableBuilding;position:RigPosition;orientation:Orientation};
 private hqReveal=0;private founderHouse?:THREE.Group;private founderLevel:1|2|3|4|5=1;
 private garage=new THREE.Group();private buildingGroups=new Map<BuildingId,THREE.Group>();
 private obstacles=new Map<string,THREE.Group>();private obstacleHits:THREE.Object3D[]=[];
 private wallGhosts=new THREE.Group();private wallGhostKit?:WorldKit;private wallGhostMaterial?:THREE.MeshBasicMaterial;private wallGhostKey='';
 private extraBuilderKey='';private extraBuilderPath:RigPosition[]=[];private extraBuilderCenter?:RigPosition;
 private builders:{group:THREE.Group;from:THREE.Vector3;to:THREE.Vector3;working:boolean;spark:THREE.Object3D}[]=[];
 private accents:THREE.Object3D[]=[];private clearing:{group:THREE.Group;time:number}[]=[];
 private reserved:THREE.Group|undefined;private reservedKit:WorldKit|undefined;private reservedEdges:THREE.LineSegments|undefined;private previewId:BuildingId|undefined;private previewValid=false;private preview:THREE.Group|undefined;private grid:THREE.LineSegments|undefined;private previewMaterials:THREE.Material[]=[];
 private observer:ResizeObserver;private clock=0;private paused=false;
 private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 private lost=(e:Event)=>{e.preventDefault();this.paused=true;this.onError();};
 constructor(private host:HTMLDivElement,level:number,training:number,private campus:CampusState,private onError:()=>void,private minimal=false){
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});const sun=lightWorld(this.renderer,this.scene);lightCampus(this.renderer,this.scene,sun);if(this.minimal)this.scene.fog=null;this.renderer.domElement.dataset.hqFog=this.scene.fog?'distance':'none';
  this.renderer.localClippingEnabled=true;this.renderer.domElement.setAttribute('role','img');this.renderer.domElement.setAttribute('aria-label',`3D headquarters level ${campus.hq}. ${level===0?'Founder HQ, with a founder working at a laptop through the window and a Builder Bot nearby.':level===1?'A furnished workstation, chair, lamp and plants.':'GPU workbench, server racks and upgraded lighting.'} Drag to pan and pinch to zoom.`);
  this.renderer.domElement.dataset.stage=String(level);host.appendChild(this.renderer.domElement);this.renderer.domElement.addEventListener('webglcontextlost',this.lost);
  document.addEventListener('visibilitychange',this.visibility);this.buildEnvironment();this.build(Math.min(2,level),training);this.buildCampus(campus);this.buildObstacles(campus);this.buildBots(campus);if(this.minimal){this.stationGroup=builderStationModel(this.kit);this.kit.grounding(this.stationGroup,3.7,2.8);this.stationGroup.position.set(BUILDER_STATION_POSITION[0],0,BUILDER_STATION_POSITION[1]);this.scene.add(this.stationGroup);this.home.set(-3,0,0);this.worldSpan=36;}this.center.copy(this.home);this.target.copy(this.home);const offset=this.minimal?CAMPUS_CAMERA_OFFSET.clone():new THREE.Vector3(7,23,30);if(this.minimal){const extended=boundaryView(offset);offset.copy(extended.offset);if(this.scene.fog instanceof THREE.Fog){this.scene.fog.near+=extended.fogShift;this.scene.fog.far+=extended.fogShift;}}this.camera.position.copy(this.home).add(offset);this.camera.lookAt(this.center);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
 }
 private build(level:number,training:number){
  const k=this.kit,s=this.garage;this.scene.add(s);this.buildingGroups.set('hq',s);
  if(this.minimal){this.founderHouse=founderHQ(k,s);return;}
  k.box(s,[12,.25,9],[-5,.09,-1],'#d9e9df',.15);
  for(let x=-10;x<=0;x+=2)for(let z=-4;z<=2;z+=2)k.box(s,[1.94,.035,1.94],[x,.24,z],'#fff5dc',.03);
  k.box(s,[12,4.3,.28],[-5,2.35,-5.4],c.dark);k.box(s,[.28,4.3,9],[-11,2.35,-1],c.slate);
  k.box(s,[12.4,.24,.5],[-5,4.55,-5.4],c.slate);k.box(s,[.5,.24,9.4],[-11,4.55,-1],c.slate);
  // The recognizable garage door, warm window and exposed floor are retained.
  k.box(s,[3.5,3.5,.12],[-1.8,2.05,-5.18],c.slate);
  for(let i=0;i<9;i++)k.box(s,[3.35,.065,.08],[-1.8,.48+i*.37,-5.09],'#a5d3dd',.015);
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
  if(training>0){k.box(s,[1.7,.25,1.7],[1,.3,1.4],c.slate);k.box(s,[1.2,1.35,1.1],[1,1.05,1.4],c.cream);k.box(s,[.9,.55,.06],[1,1.2,2],c.purple,.03,true);for(let i=0;i<Math.min(3,training);i++)k.box(s,[.18,.1,.04],[.65+i*.3,.7,2],c.cyan,.01,true);}
  // Cutaway architecture keeps the original laptop visible while strengthening the silhouette.
  k.box(s,[12.5,.3,2.3],[-5,4.65,-4.6],c.dark,.12);
  k.box(s,[12.6,.08,.12],[-5,4.83,-3.44],c.cyan,.02,true);
  for(const x of [-9,-5,-1]){k.box(s,[2.5,.08,1.25],[x,4.86,-4.7],'#559ebc',.03);for(let j=0;j<3;j++)k.box(s,[.025,.02,1.15],[x-.7+j*.7,4.91,-4.7],c.cyan,.005);}
  for(const x of [-10.5,.5]){k.box(s,[.4,.4,1.8],[x,.4,3],c.slate);k.box(s,[.45,.04,1.9],[x,.63,3],c.cyan,.01,true);}
  k.box(s,[3.2,.1,1],[-5,.25,3.7],c.slate);
  k.label(s,'AI / STARTUP',[-5,4.1,-3.36],3);

 }
 private buildEnvironment(){
  if(this.minimal&&districtEnabled()){this.district=new TechnologyDistrict('hq');this.scene.add(this.district.group);return;}
  this.buildLegacyEnvironment();
 }
 /** Preserved pre-district landscape; use ?landscape=legacy to compare/revert. */
 private buildLegacyEnvironment(){
  const k=this.kit,s=this.scene;k.terrain(s,this.minimal?W/2+7:33,this.minimal?D/2+7:29,this.minimal?{minX:P.minX-7.5,maxX:P.maxX+7.5,minZ:P.minZ-7,maxZ:P.maxZ+7}:undefined);
  if(this.minimal){this.mapBoundary=new MapBoundary();this.mapBoundary.group.scale.set(W/52,1,D/43);this.mapBoundary.group.position.set(2*(1-W/52),0,2.5*(1-D/43));s.add(this.mapBoundary.group);}
  // Low retaining walls and planted borders frame the grassy campus.
  for(const z of [P.minZ-1,P.maxZ+1]){k.box(s,[W+3,.4,.65],[2,.08,z],c.dark);k.box(s,[W+3,.04,.12],[2,.31,z],c.slate);}
  for(const x of [P.minX-1,P.maxX+1])k.box(s,[.65,.4,D+2],[x,.08,2.5],c.dark);
  for(let i=0;i<14;i++){const x=P.minX+i*W/13;for(const z of [P.minZ-4,P.maxZ+4])k.tree(s,x,z,1.1+(i%3)*.3);}
  for(const [x,z] of [[P.minX-3,-12],[P.minX-4,2],[P.minX-3,16],[P.maxX+4,-13],[P.maxX+4,2],[P.maxX+4,18]])k.tree(s,x,z,1.7);
  // Drainage strips, a gate and delivery station sit outside the editable building area.
  for(let i=0;i<8;i++)k.box(s,[1,.06,.18],[-26,.06,-9+i*.5],c.slate);
  for(const x of [-5,5]){k.box(s,[.7,2.5,.7],[x,1.1,25],c.slate);k.box(s,[.45,.1,.45],[x,2.4,25],c.cyan,.02,true);}
  if(!this.minimal){k.box(s,[4,.7,1.6],[-17,.3,26.3],c.dark);k.label(s,'CAMPUS / 01',[-17,1,27.15],3.8);}
  // A few dark ground panels add texture without drawing over the placement grid.
  for(const [x,z] of [[-18,-15],[23,-15],[-18,19],[22,20]])k.box(s,[3,.03,2],[x,-.07,z],'#c7e8d3',.1);
 }
 private buildObstacles(campus:CampusState){
  const k=this.kit;
  for(const obstacle of OBSTACLES){
   if(campus.clearedObstacles?.includes(obstacle.id)||this.minimal&&(obstacle.kind==='equipment'||obstacle.kind==='debris'||obstacle.kind==='tree'))continue;
   const g=new THREE.Group();g.position.set(obstacle.position[0],0,obstacle.position[1]);this.scene.add(g);this.obstacles.set(obstacle.id,g);
   if(obstacle.kind==='tree'){k.tree(g,-.65,-.3,1.3);k.tree(g,.7,.6,.9);k.cylinder(g,1.3,.13,[0,0,0],'#95cfa9');}
   else if(obstacle.kind==='rock'){for(let i=0;i<3;i++){const rock=k.box(g,[1.3,1+i*.25,1.25],[-.8+i*.7,.45,-.4+i*.4],'#b8cad0',.3);rock.rotation.y=i*.65;rock.rotation.z=i*.08;}}
   else if(obstacle.kind==='equipment'){k.box(g,[2,1.7,1.5],[0,.8,0],c.slate);k.box(g,[1.6,1.2,.1],[0,.8,.8],c.dark);for(let i=0;i<3;i++)k.box(g,[1.25,.08,.04],[0,.5+i*.3,.87],'#d0e4e7');k.cylinder(g,.4,.5,[.7,1.9,-.4],c.terracotta);}
   else{for(let i=0;i<4;i++){const piece=k.box(g,[1.7,.3,.8],[-.6+i*.35,.2+i*.15,0],i%2?c.slate:c.terracotta);piece.rotation.y=i*.7;}}
   const hit=k.box(g,[obstacle.width,3,obstacle.depth],[0,1.5,0],c.dark);hit.visible=false;hit.userData.obstacleId=obstacle.id;this.obstacleHits.push(hit);
  }
 }
 private buildBots(campus:CampusState){
  const k=this.kit,jobs=constructionJobs(campus),[hx,hz]=positionFor(campus,'hq');
  for(let i=0;i<builderCount(campus);i++){
   const group=new THREE.Group();this.scene.add(group);const job=jobs[i];const from=this.minimal?new THREE.Vector3(...[BUILDER_STATION_POSITION[0],.12,BUILDER_STATION_POSITION[1]] as [number,number,number]):new THREE.Vector3(hx+4-i*1.2,0,hz+5);
   const destination=job?positionFor(campus,job.building):[hx+4-i*1.2,hz+5];const footprint=job?BUILDING_FOOTPRINTS[job.building]:{width:0,depth:0};
   const to=new THREE.Vector3(destination[0]+(job?footprint.width/2-.4:0),0,destination[1]+(job?footprint.depth/2+.4:0));
   if(this.minimal&&!job)to.copy(from);group.position.copy(from);const {spark}=builderBotModel(k,group);
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
  if(!this.setRay(clientX,clientY))return;const hit=this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());return hit?[hit.x,hit.z]:undefined;
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
  this.grid=foundationGrid('#53e1ec','#355873');this.scene.add(this.grid);
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
 syncLandmarks(state:FoundationState){this.syncBuilderHuts(state);this.syncStorage(state);
  this.district?.syncLots(state,this.draftPlaced);this.decorations.sync(state.decorations||[]);if(!this.decorations.group.parent)this.scene.add(this.decorations.group);if(this.decorationPreviewId)this.decorations.show(this.decorationPreviewId,false);
  const level=founderHqLevel(state);if(this.minimal&&level!==this.founderLevel){this.founderHouse?.removeFromParent();this.founderHouse=founderHQ(this.kit,this.garage,level);this.founderLevel=level;this.renderer.domElement.dataset.founderHqLevel=String(level);if(this.landmarksSynced&&!this.reduced){this.hqReveal=.45;const fx=new THREE.Group();const layout=buildingLayout(state,'hq')!;fx.position.set(layout.position[0],1,layout.position[1]);for(let i=0;i<10;i++)this.particleKit.box(fx,[.13,.12,.13],[Math.sin(i*2.4)*3,1+i*.25,Math.cos(i*2.4)*2],i%2?c.gold:c.cyan,.025);this.scene.add(fx);this.cleanupParticles.push({group:fx,time:0});}}
  const hq=buildingLayout(state,'hq')!,station=buildingLayout(state,'station');this.stationOwned=!!station;this.builderHomeYaw=(station?.orientation??0)*Math.PI/2;const bot=this.builders[0];if(bot)bot.group.visible=!!station;
  if(this.minimal&&bot&&state.builders>=2&&this.builders.length<2){const group=bot.group.clone(true);group.name='Second Builder Bot';group.traverse(n=>{if(n instanceof THREE.Mesh){const materials=(Array.isArray(n.material)?n.material:[n.material]).map(m=>{const c=m.clone();c.opacity=m.userData.baseOpacity??m.opacity;c.transparent=m.userData.baseTransparent??m.transparent;c.depthWrite=m.userData.baseDepthWrite??m.depthWrite;c.userData.baseOpacity=c.opacity;c.userData.baseTransparent=c.transparent;c.userData.baseDepthWrite=c.depthWrite;return c;});n.material=Array.isArray(n.material)?materials:materials[0];n.userData.phaseMaterials=true;}});const spark=group.children.at(-1)!;spark.visible=false;this.scene.add(group);this.builders.push({group,from:bot.from.clone(),to:bot.to.clone(),working:false,spark});this.extraBuilderKey='';}
  const second=this.builders[1];if(this.minimal&&second){second.group.visible=!!station&&state.builders>=2;if(station&&!this.extraBuilderKey){const hut=state.builderHuts?.find(h=>!h.unplaced)??station;second.group.position.set(hut.position[0],.12,hut.position[1]);second.group.rotation.y=this.builderHomeYaw;}}
 if(this.stationGroup)this.stationGroup.visible=!!station;this.renderer.domElement.dataset.builders=String(state.builders);this.home.set(hq.position[0]+2,0,hq.position[1]+1);if(!this.landmarksSynced&&state.hqLayout)this.target.copy(this.home);this.landmarksSynced=true;
  this.garage.position.set(hq.position[0]+5,0,hq.position[1]+1);if(this.founderHouse)this.founderHouse.rotation.y=hq.orientation*Math.PI/2;
  if(station){this.stationGroup?.position.set(station.position[0],0,station.position[1]);if(this.stationGroup)this.stationGroup.rotation.y=station.orientation*Math.PI/2;}
 }
 syncBuilderHuts(state:FoundationState){const key=JSON.stringify(state.builderHuts);if(key===this.hutKey)return;this.hutKey=key;for(const g of this.hutGroups.values())g.removeFromParent();this.hutGroups.clear();this.hutKit?.dispose();this.hutKit=new WorldKit('campus');for(const h of state.builderHuts??[]){if(h.unplaced)continue;const g=builderStationModel(this.hutKit);g.position.set(h.position[0],0,h.position[1]);g.rotation.y=h.orientation*Math.PI/2;g.userData.hutId=h.id;this.hutGroups.set(h.id,g);this.scene.add(g);}}
 pickBuilderHut(x:number,y:number){if(!this.setRay(x,y))return;const hits=this.raycaster.intersectObjects([...this.hutGroups.values(),...(['hq','station','rig','rig2','fabricator','hangar','lab','droneStation','sentinel','arcSpire','computeStorage','researchStorage'] as const).map(k=>this.layoutGroup(k)).filter((g):g is THREE.Group=>!!g)],true);let obj:THREE.Object3D|undefined=hits[0]?.object;while(obj){if(obj.userData.hutId)return obj.userData.hutId as string;obj=obj.parent??undefined;}return;}
 hutScreenPoint(id:string){const g=this.hutGroups.get(id);if(!g)return this.buildingScreenPoint('station');const p=g.position.clone().add(new THREE.Vector3(0,2,0)).project(this.camera);return {x:(p.x+1)*this.host.clientWidth/2,y:(1-p.y)*this.host.clientHeight/2,z:p.z};}
 previewBuilderHut(id:string,p:RigPosition,o:Orientation,valid:boolean){this.previewRig(p,valid,'station',o);this.hiddenHut=id;const g=this.hutGroups.get(id);if(g)g.visible=false;}
 private layoutGroup(kind:RotatableBuilding){return kind==='computeStorage'||kind==='researchStorage'?this.storageGroups.get(kind):kind==='hq'?this.garage:kind==='station'?this.stationGroup:kind==='rig'?this.rigGroup:kind==='rig2'?this.rig2Group:kind==='arcSpire'?this.arcSpireGroup:kind==='sentinel'?this.sentinelGroup:kind==='droneStation'?this.droneStationGroup:kind==='lab'?this.labGroup:kind==='fabricator'?this.fabricatorGroup:this.hangarGroup;}
 previewLayout(kind:RotatableBuilding,position:RigPosition,orientation:Orientation,valid:boolean){
  if(this.layoutPreviewKind!==kind){this.clearRigPreview();this.layoutPreviewKind=kind;const k=this.rigPreviewKit=new WorldKit();
   if(kind==='hq'){this.rigPreview=new THREE.Group();const house=founderHQ(k,this.rigPreview,this.founderLevel);house.position.set(0,0,0);}
   else this.rigPreview=kind==='computeStorage'||kind==='researchStorage'?storageModel(k,kind,this.lastBotState?buildingLevel(this.lastBotState,kind):1):kind==='arcSpire'?arcSpireModel(k):kind==='sentinel'?sentinelModel(k):kind==='droneStation'?droneStationModel(k):kind==='lab'?researchLabModel(k):kind==='station'?builderStationModel(k):kind==='rig'||kind==='rig2'?gpuRigModel(k):kind==='fabricator'?fabricatorModel(k):hangarModel(k,0,this.lastBotState&&getHangar(this.lastBotState)?.size==='compound'?'compound':this.lastBotState&&getHangar(this.lastBotState)?.size==='expanded');
   if(this.lastBotState)applyBuildingLevel(k,this.rigPreview,kind,buildingLevel(this.lastBotState,kind));
   this.rigPreviewMaterial=new THREE.MeshBasicMaterial({color:c.cyan,transparent:true,opacity:.55,depthWrite:false});this.rigPreview.traverse(o=>{if(o instanceof THREE.Mesh){o.material=this.rigPreviewMaterial!;o.castShadow=false;}if(o instanceof THREE.Light)o.visible=false;});this.scene.add(this.rigPreview);
   this.rigGrid=foundationGrid(c.cyan,c.slate);this.scene.add(this.rigGrid);
  }
  const original=this.layoutGroup(kind);if(original)original.visible=false;
  this.rigPreview!.position.set(position[0],.2,position[1]);this.rigPreview!.rotation.y=orientation*Math.PI/2;this.rigPreviewMaterial!.color.set(valid?c.cyan:c.coral);if(this.lastBotState)this.syncPower(this.lastBotState,this.lastSecurityNow,{kind,position,orientation});
 }
 syncArcSpire(state:FoundationState){const b=state.arcSpire,key=JSON.stringify(b);if(key===this.arcSpireKey)return;this.arcSpireKey=key;this.arcSpireGroup?.removeFromParent();this.arcSpireKit?.dispose();this.arcSpireGroup=undefined;if(!b)return;const k=this.arcSpireKit=new WorldKit('campus'),g=this.arcSpireGroup=arcSpireModel(k);g.position.set(b.position[0],0,b.position[1]);g.rotation.y=(b.orientation??0)*Math.PI/2;this.scene.add(g);}
 syncSentinel(state:FoundationState,now:number){const b=state.sentinel,key=JSON.stringify([b,!!b&&now<b.completesAt]);if(key===this.sentinelKey)return;this.sentinelKey=key;this.sentinelGroup?.removeFromParent();this.sentinelKit?.dispose();this.sentinelGroup=undefined;if(!b)return;const k=this.sentinelKit=new WorldKit('campus'),g=this.sentinelGroup=sentinelModel(k);g.position.set(b.position[0],0,b.position[1]);g.rotation.y=(b.orientation??0)*Math.PI/2;this.scene.add(g);}
 syncDroneStation(state:FoundationState,now:number){const b=state.droneStation,key=JSON.stringify([b,!!b&&now<b.completesAt]);if(key===this.droneKey)return;this.droneKey=key;this.droneStationGroup?.removeFromParent();this.droneKit?.dispose();this.droneStationGroup=undefined;if(!b)return;const k=this.droneKit=new WorldKit('campus'),g=this.droneStationGroup=droneStationModel(k);g.position.set(b.position[0],0,b.position[1]);g.rotation.y=(b.orientation??0)*Math.PI/2;this.scene.add(g);}
 syncWallGhosts(state:FoundationState,enabled:boolean,selected?:string){const choices=enabled?adjacentWallPreviews(state,selected):[],key=JSON.stringify(choices);if(key===this.wallGhostKey)return;this.wallGhostKey=key;this.wallGhosts.clear();this.wallGhostKit?.dispose();this.wallGhostMaterial?.dispose();if(!choices.length)return;const k=this.wallGhostKit=new WorldKit('campus'),m=this.wallGhostMaterial=new THREE.MeshBasicMaterial({color:'#81d7d4',transparent:true,opacity:.22,depthWrite:false});for(const choice of choices){const g=securityWallModel(k);g.position.set(choice.position[0],.08,choice.position[1]);g.rotation.y=choice.orientation*Math.PI/2;g.traverse(n=>{if(n instanceof THREE.Mesh){n.material=m;n.castShadow=false;n.userData.wallGhost=choice;}});this.wallGhosts.add(g);}if(!this.wallGhosts.parent)this.scene.add(this.wallGhosts);}
 pickWallGhost(x:number,y:number){if(!this.setRay(x,y))return;const hit=this.raycaster.intersectObject(this.wallGhosts,true)[0]?.object.userData.wallGhost as {position:RigPosition;orientation:Orientation}|undefined;if(hit)return hit;if(this.pickWall(x,y)||this.pickFoundation(x,y))return;const rect=this.renderer.domElement.getBoundingClientRect();let best:{position:RigPosition;orientation:Orientation}|undefined,distance=22;for(const g of this.wallGhosts.children){const p=g.position.clone();p.y+=.6;p.project(this.camera);const d=Math.hypot(rect.left+(p.x+1)*rect.width/2-x,rect.top+(1-p.y)*rect.height/2-y);if(d<distance){distance=d;best=g.children.find(n=>n.userData.wallGhost)?.userData.wallGhost;}}return best;}
 pickWall(x:number,y:number){if(!this.setRay(x,y))return;const hit=this.raycaster.intersectObjects(this.wallHits,false)[0];if(!hit)return;const front=this.raycaster.intersectObjects(['hq','station','rig','rig2','fabricator','hangar','lab','droneStation','sentinel','arcSpire','computeStorage','researchStorage'].map(k=>this.layoutGroup(k as RotatableBuilding)).filter((g):g is THREE.Group=>!!g),true)[0];return !front||hit.distance<front.distance?hit.object.userData.wallId as string:undefined;}
 previewWallRow(moves:{id:string;position:RigPosition;orientation:Orientation}[],valid:boolean){
 const key=moves.map(w=>w.id).join(',');if(this.rowPreviewKey!==key){this.clearRigPreview();this.previewWall(moves[0].position,moves[0].orientation,valid);this.rigPreview!.clear();this.rigPreview!.rotation.y=0;this.hiddenWalls=new Set(moves.map(w=>w.id));this.rowPreviewKey=key;for(const w of moves){const model=securityWallModel(this.rigPreviewKit!,1,1.2,this.lastBotState?buildingLevel(this.lastBotState,`wall:${w.id}`):1);model.rotation.y=w.orientation*Math.PI/2;model.traverse(o=>{if(o instanceof THREE.Mesh){o.material=this.rigPreviewMaterial!;o.castShadow=false;}});this.rigPreview!.add(model);}this.wallKey='';if(this.lastBotState)this.syncLab(this.lastBotState,this.lastSecurityNow);}
 this.rigPreview!.position.set(0,.15,0);moves.forEach((w,i)=>this.rigPreview!.children[i].position.set(w.position[0],0,w.position[1]));this.rigPreviewMaterial!.color.set(valid?c.cyan:c.coral);
 }
 previewWall(position:RigPosition,orientation:Orientation,valid:boolean,id?:string){const level=id&&this.lastBotState?buildingLevel(this.lastBotState,`wall:${id}`):1;if(this.rigPreview&&!this.rowPreviewKey&&this.rigPreview.userData.visualLevel!==level)this.clearRigPreview();if(!this.rigPreview){const k=this.rigPreviewKit=new WorldKit('campus');this.rigPreview=securityWallModel(k,1,1.2,id&&this.lastBotState?buildingLevel(this.lastBotState,`wall:${id}`):1);const tile=k.box(this.rigPreview,[1,.025,1],[0,-.07,0],c.cyan,.01);tile.name='occupied-wall-tile';this.rigPreviewMaterial=new THREE.MeshBasicMaterial({color:c.cyan,transparent:true,opacity:.6,depthWrite:false});this.rigPreview.traverse(o=>{if(o instanceof THREE.Mesh){o.material=this.rigPreviewMaterial!;o.castShadow=false;}});this.scene.add(this.rigPreview);this.rigGrid=foundationGrid(c.cyan,c.slate);this.scene.add(this.rigGrid);}if(this.hiddenWall!==id){this.hiddenWall=id;this.wallKey='';if(this.lastBotState)this.syncLab(this.lastBotState,this.lastSecurityNow);}this.rigPreview.position.set(position[0],.15,position[1]);this.rigPreview.rotation.y=orientation*Math.PI/2;this.rigPreviewMaterial!.color.set(valid?c.cyan:c.coral);}
 syncLab(state:FoundationState,now:number){this.lastSecurityNow=now;if(!this.walls.group.parent)this.scene.add(this.walls.group);const barriers=campusSecurityWalls(state).map(w=>({...w,level:buildingLevel(state,`wall:${w.id}`)})).filter(w=>w.id!==this.hiddenWall&&!this.hiddenWalls.has(w.id)),wallKey=JSON.stringify(barriers);if(wallKey!==this.wallKey){this.walls.group.removeFromParent();this.walls.dispose();this.walls=new SecurityWalls(barriers);this.scene.add(this.walls.group);this.wallKey=wallKey;this.wallHits=[];for(const w of barriers){const hit=this.kit.box(this.walls.group,[w.w,1.4,w.d],[w.x,.7,w.z],c.dark);hit.visible=false;hit.userData.wallId=w.id;this.wallHits.push(hit);}}this.syncSentinel(state,now);this.syncArcSpire(state);this.syncDroneStation(state,now);this.security.sync(state,now);if(!this.security.group.parent)this.scene.add(this.security.group);const l=state.lab,key=JSON.stringify([l?.position,l?.orientation,!!l&&now<l.completesAt]);this.labActive=!!l&&now>=l.completesAt&&l.stored<buildingStats('lab',buildingLevel(state,'lab')).buffer;if(key===this.labKey)return;this.labKey=key;this.labGroup?.removeFromParent();this.labKit?.dispose();this.labGroup=undefined;if(!l)return;const k=this.labKit=new WorldKit('campus'),g=this.labGroup=researchLabModel(k);g.position.set(l.position[0],0,l.position[1]);g.rotation.y=(l.orientation??0)*Math.PI/2;this.scene.add(g);}
 syncRig(state:FoundationState,now=Date.now()){
  this.syncLab(state,now);
  this.syncConstruction(state,now);this.syncExtraBuilder(state,now);
  const rig=state.rig,rig2=state.rig2,h=getHangar(state),key=JSON.stringify([state.stationLayout,rig?.position,rig?.orientation,rig2?.position,rig2?.orientation,state.fabricator,h,!!state.buildersBusy,!!state.landscape?.clearing,rig?.completesAt,rig2?.completesAt]);if(key===this.rigKey){this.syncPower(state,now);return;}this.rigKey=key;
  this.rigGroup?.removeFromParent();this.rigKit?.dispose();this.rig2Group?.removeFromParent();this.rig2Kit?.dispose();this.rigGroup=undefined;this.rig2Group=undefined;this.rigPosition=rig?.position;this.rig2Position=rig2?.position;
  const bot=this.builders[0];if(bot){bot.working=!!state.buildersBusy;const home=buildingLayout(state,'station')?.position;if(home)bot.to.set(home[0],.12,home[1]);}
  for(const [slot,r] of [['rig',rig],['rig2',rig2]] as const){if(!r)continue;const k=new WorldKit('campus'),group=gpuRigModel(k);k.grounding(group,5,3.15);group.position.set(r.position[0],0,r.position[1]);group.rotation.y=(r.orientation??0)*Math.PI/2;this.scene.add(group);if(slot==='rig'){this.rigKit=k;this.rigGroup=group;}else{this.rig2Kit=k;this.rig2Group=group;}
  }
  this.syncPower(state,now);
 }
 private syncPower(state:FoundationState,now:number,preview?:{kind:RotatableBuilding;position:RigPosition;orientation:Orientation}){
  if(preview)this.cablePreview=preview;preview=this.rigPreview?preview??this.cablePreview:undefined;
  if(!this.power.group.parent)this.scene.add(this.power.group);
  const layouts=FOUNDATION_BUILDINGS.map(kind=>{const layout=preview?.kind===kind?preview:buildingLayout(state,kind);if(!layout)return;const r=footprint(kind,layout);if(kind==='hq'){r.w*=.9;r.d*=.85;}return r;}).filter((r):r is NonNullable<typeof r>=>!!r);
  const rigs=(['rig','rig2'] as const).flatMap(id=>{const model=preview?.kind===id?this.rigPreview:this.layoutGroup(id);return model&&(preview?.kind===id||!!state[id]&&now>=state[id]!.completesAt)?[{id,model}]:[];});
  this.power.sync(preview?.kind==='hq'?this.rigPreview:this.founderHouse,rigs,layouts,campusSecurityWalls(state));
 }
 syncBots(state:FoundationState,now:number){
  this.producing=!!state.training?.length;this.assemblyAt=this.lifeClock;this.assemblyProgress=this.producing?Math.max(0,Math.min(1,1-(state.training![0]-now)/(state.trainingDurations?.[0]??10000))):0;
  this.gpuActive=!!state.rig&&now>=state.rig.completesAt&&state.rig.stored<buildingStats('rig',buildingLevel(state,'rig')).buffer;this.gpu2Active=!!state.rig2&&now>=state.rig2.completesAt&&state.rig2.stored<buildingStats('rig',buildingLevel(state,'rig2')).buffer;
  const f=state.fabricator,h=getHangar(state)?.unplaced?undefined:getHangar(state),ready=!!h&&now>=h.completesAt,bots=Math.min(h?.size==='compound'?8:10,(state.bots||0)+(!state.botRaid?.settled?(state.botRaid?.simulation.stock.scrap||0):0));
  const key=JSON.stringify([f?.position,h?.position,f?.orientation,h?.orientation,h?.size,ready,state.troopLevels]),reset=this.catchup||document.hidden||this.reduced;
  const incoming=this.arrivals.sync(state,now,reset),heavyIncoming=this.heavyArrivals.sync(state,now,reset),disruptorIncoming=this.disruptorArrivals.sync(state,now,reset);if(!document.hidden&&state!==this.lastBotState)this.catchup=false;this.lastBotState=state;
  if(reset||bots<this.stagedCount||(state.breachers??0)<this.heavyCount||(state.disruptors??0)<this.disruptorCount||key!==this.botKey){for(const w of this.walkers)w.group.removeFromParent();this.walkers=[];}
  this.stagedCount=bots;this.heavyCount=ready?Math.min(4,state.breachers??0):0;this.disruptorCount=ready?Math.min(4,state.disruptors??0):0;
  if(key!==this.botKey){this.botKey=key;this.fabricatorGroup?.removeFromParent();this.hangarGroup?.removeFromParent();this.botKit?.dispose();this.fabricatorGroup=undefined;this.hangarGroup=undefined;
   if(f||h){const k=this.botKit=new WorldKit('campus');if(f){this.fabricatorGroup=fabricatorModel(k,troopLevel(state,'pulsewheel'));k.grounding(this.fabricatorGroup,4.7,3.7);this.fabricatorGroup.position.set(f.position[0],0,f.position[1]);this.fabricatorGroup.rotation.y=(f.orientation??0)*Math.PI/2;this.scene.add(this.fabricatorGroup);}
    if(h){this.hangarGroup=hangarModel(k,h.size==='compound'?8:10,h.size==='compound'?'compound':h.size==='expanded',troopLevel(state,'pulsewheel'));k.grounding(this.hangarGroup,h.size==='compound'?8.7:h.size==='expanded'?6.3:4.7,h.size==='compound'?7.7:h.size==='expanded'?4.9:3.7);this.hangarGroup.position.set(h.position[0],0,h.position[1]);this.hangarGroup.rotation.y=(h.orientation??0)*Math.PI/2;this.scene.add(this.hangarGroup);}}

  }
  if(ready&&this.botKit&&!reset)for(const slot of incoming){const points=dockingRoute(state,slot);if(!points.length)continue;const group=scrapBotModel(this.botKit,troopLevel(state,'pulsewheel'));group.name='walking-scrapbot';const phaseRing=this.botKit.ring(group,.6,.04,[0,.2,0],c.cyan,true);phaseRing.name='friendly-phase';phaseRing.rotation.x=-Math.PI/2;phaseRing.visible=false;group.scale.setScalar(.7);group.position.set(...points[0]);group.visible=false;this.scene.add(group);this.walkers.push({slot,group,motion:new DeliveryMotion(points),delay:this.walkers.length*.35,settled:0,finished:false});}
  if(this.fabricatorGroup&&this.botKit){const heavy=this.producing&&state.trainingKinds?.[0]==='breacher';this.fabricatorGroup.userData.heavyAssembly=heavy;let mech=this.fabricatorGroup.getObjectByName('assembly-breacher');if(heavy&&!mech){mech=breacherModel(this.botKit,troopLevel(state,'breacher'));mech.name='assembly-breacher';mech.scale.setScalar(.7);mech.position.y=.6;this.fabricatorGroup.add(mech);}if(mech)mech.visible=heavy;}const assembly=this.fabricatorGroup?.getObjectByName('assembly-bot');if(assembly)assembly.visible=this.producing&&!this.fabricatorGroup?.userData.heavyAssembly;
  if(ready&&this.botKit&&!reset)for(const slot of heavyIncoming){const points=breacherDockingRoute(state,slot);if(!points.length)continue;const group=breacherModel(this.botKit,troopLevel(state,'breacher'));group.name='walking-breacher';group.scale.setScalar(h?.size==='compound'?.7:.42);group.position.set(...points[0]);group.visible=false;const phaseRing=this.botKit.ring(group,.8,.04,[0,.12,0],c.cyan,true);phaseRing.name='friendly-phase';phaseRing.rotation.x=-Math.PI/2;phaseRing.visible=false;this.scene.add(group);this.walkers.push({troop:'breacher',slot,group,motion:new DeliveryMotion(points),delay:this.walkers.length*.6+.45,settled:0,finished:false});}
  if(this.hangarGroup&&this.botKit){for(let i=0;i<4;i++){let mech=this.hangarGroup.getObjectByName('docked-breacher-'+i);if(!mech&&this.heavyCount>i){mech=breacherModel(this.botKit,troopLevel(state,'breacher'));mech.name='docked-breacher-'+i;mech.scale.setScalar(h?.size==='compound'?.7:.42);mech.position.set(...breacherHomePose(i,0,h?.size==='compound').position);mech.userData.arrivalTime=this.lifeClock;this.hangarGroup.add(mech);}}}
  if(this.fabricatorGroup&&this.botKit){const active=this.producing&&state.trainingKinds?.[0]==='disruptor';let unit=this.fabricatorGroup.getObjectByName('assembly-disruptor');if(active&&!unit){unit=disruptorModel(this.botKit,troopLevel(state,'disruptor'));unit.name='assembly-disruptor';unit.scale.setScalar(.7);unit.position.y=.6;this.fabricatorGroup.add(unit);}if(unit)unit.visible=active;if(active&&assembly)assembly.visible=false;}
  if(ready&&this.botKit&&!reset)for(const slot of disruptorIncoming){const points=breacherDockingRoute(state,slot);if(!points.length)continue;const end=this.disruptorPose(slot,0,h?.size==='compound').position;const a=(h?.orientation??0)*Math.PI/2;points[points.length-1]=[h!.position[0]+end[0]*Math.cos(a)+end[2]*Math.sin(a),end[1],h!.position[1]-end[0]*Math.sin(a)+end[2]*Math.cos(a)];const group=disruptorModel(this.botKit,troopLevel(state,'disruptor'));group.name='walking-disruptor';group.scale.setScalar(.7);group.position.set(...points[0]);group.visible=false;this.scene.add(group);this.walkers.push({troop:'disruptor',slot,group,motion:new DeliveryMotion(points),delay:this.walkers.length*.45+.3,settled:0,finished:false});}
  if(this.hangarGroup&&this.botKit)for(let i=0;i<4;i++){let unit=this.hangarGroup.getObjectByName('docked-disruptor-'+i);if(!unit&&this.disruptorCount>i){unit=disruptorModel(this.botKit,troopLevel(state,'disruptor'));unit.name='docked-disruptor-'+i;unit.scale.setScalar(.7);unit.position.set(...this.disruptorPose(i,0,h?.size==='compound').position);unit.userData.arrivalTime=this.lifeClock;this.hangarGroup.add(unit);}}
  this.syncDockVisibility();
 }
 private disruptorPose(slot:number,time:number,compound=true){const pose=breacherHomePose(slot,time+3,compound);pose.position[0]*=.65;pose.position[2]-=compound?1.5:.5;return pose;}
 syncStorage(state:FoundationState){
  for(const kind of ['computeStorage','researchStorage'] as const){const b=state[kind],level=buildingLevel(state,kind),key=JSON.stringify([b?.position,b?.orientation,level]);if(this.storageKeys.get(kind)===key)continue;this.storageKeys.set(kind,key);this.storageGroups.get(kind)?.removeFromParent();this.storageKits.get(kind)?.dispose();this.storageGroups.delete(kind);this.storageKits.delete(kind);if(!b)continue;const k=new WorldKit('campus'),g=storageModel(k,kind,level);g.position.set(b.position[0],0,b.position[1]);g.rotation.y=(b.orientation??0)*Math.PI/2;this.scene.add(g);this.storageGroups.set(kind,g);this.storageKits.set(kind,k);}
 }
 syncBuildingVisuals(state:FoundationState,now:number){
  this.syncStorage(state);
  for(const kind of ['rig','rig2','fabricator','hangar','lab','droneStation','sentinel','arcSpire'] as const){const group=this.layoutGroup(kind),level=buildingLevel(state,kind),old=this.levelDetails.get(kind);if(old&&old.group===group&&old.level===level)continue;if(old){(old.details?.userData.attached as THREE.Object3D|undefined)?.removeFromParent();old.details?.removeFromParent();old.kit.dispose();this.levelDetails.delete(kind);}if(!group)continue;const kit=new WorldKit('campus');applyBuildingLevel(kit,group,kind,level);this.levelDetails.set(kind,{group,level,kit,details:group.getObjectByName('building-level-details')});}

  for(const kind of ['hq','rig','rig2','fabricator','hangar','lab','droneStation','sentinel','arcSpire','computeStorage','researchStorage'] as const){const timer=state.buildingUpgrades?.[kind]??(kind==='hq'?state.hqUpgrade:kind==='hangar'?getHangar(state):state[kind]);this.constructionVisuals.sync(kind,kind==='hq'?this.founderHouse:this.layoutGroup(kind),buildingLayout(state,kind),timer,now);}
  this.renderer.domElement.dataset.constructionStages=JSON.stringify(this.constructionVisuals.stages);
 }
 private syncDockVisibility(){
  for(let i=0;i<10;i++){const bot=this.hangarGroup?.getObjectByName('docked-bot-'+i);if(bot)bot.visible=i<this.stagedCount&&!this.walkers.some(w=>!w.troop&&w.slot===i);}
  for(let i=0;i<4;i++){const bot=this.hangarGroup?.getObjectByName('docked-breacher-'+i);if(bot)bot.visible=i<this.heavyCount&&!this.walkers.some(w=>w.troop==='breacher'&&w.slot===i);}
  for(let i=0;i<4;i++){const unit=this.hangarGroup?.getObjectByName('docked-disruptor-'+i);if(unit)unit.visible=i<this.disruptorCount&&!this.walkers.some(w=>w.troop==='disruptor'&&w.slot===i);}
  syncCompoundInstances(this.hangarGroup);
  this.renderer.domElement.dataset.walkingBreachers=String(this.walkers.filter(w=>w.troop==='breacher').length);this.renderer.domElement.dataset.dockedBreachers=String(Math.max(0,this.heavyCount-this.walkers.filter(w=>w.troop==='breacher').length));this.renderer.domElement.dataset.walkingBots=String(this.walkers.length);this.renderer.domElement.dataset.dockedBots=String(Math.max(0,this.stagedCount-this.walkers.filter(w=>!w.troop).length));this.renderer.domElement.dataset.gpuActive=String(this.gpuActive);this.renderer.domElement.dataset.gpu2Active=String(this.gpu2Active);
 }
 private animationProbe=new THREE.Vector3();
 private animationVisible(group:THREE.Object3D|undefined){if(!group||!group.visible||document.hidden)return false;this.animationProbe.copy(group.position).project(this.camera);return Math.abs(this.animationProbe.x)<1.3&&Math.abs(this.animationProbe.y)<1.3;}
 private animateBotLife(dt:number){
  this.lifeClock+=dt;this.walls.update(this.lifeClock,this.reduced);if(this.arcSpireGroup)animateArcSpire(this.arcSpireGroup,undefined,this.lifeClock*1000,dt,!!this.lastBotState?.arcSpire&&this.lastSecurityNow>=this.lastBotState.arcSpire.completesAt);for(let i=0;i<4;i++){const unit=this.hangarGroup?.getObjectByName('docked-disruptor-'+i);if(unit?.visible&&this.animationVisible(this.hangarGroup)){const pose=this.disruptorPose(i,this.reduced?0:this.lifeClock-(unit.userData.arrivalTime??0),getHangar(this.lastBotState!)?.size==='compound');unit.position.set(...pose.position);turnDisruptor(unit,pose.yaw,dt,this.reduced);animateDisruptor(unit,dt,this.reduced);}}animateFabricator(this.animationVisible(this.fabricatorGroup)?this.fabricatorGroup:undefined,this.lifeClock,Math.min(1,this.assemblyProgress+(this.lifeClock-this.assemblyAt)/((this.lastBotState?.trainingDurations?.[0]??10000)/1000)),this.producing,this.reduced);this.security.group.visible=this.security.active;this.security.update(this.lifeClock,dt,this.reduced);this.renderer.domElement.dataset.securityDroneCount=String(this.security.count);this.renderer.domElement.dataset.securityDronePhase=this.security.phase;this.renderer.domElement.dataset.securityWalls=String(this.lastBotState?.walls?.length??0);animateResearchLab(this.labGroup,this.lifeClock,this.labActive,this.reduced);animateGpu(this.rigGroup,this.lifeClock,dt,this.gpuActive,this.reduced);animateGpu(this.rig2Group,this.lifeClock,dt,this.gpu2Active,this.reduced);
  for(let i=0;i<10;i++){const bot=this.hangarGroup?.getObjectByName('docked-bot-'+i);if(bot?.visible&&this.animationVisible(this.hangarGroup))animateDockedBot(bot,i,this.lifeClock,this.reduced,dt);}
  if(this.animationVisible(this.hangarGroup)){syncCompoundInstances(this.hangarGroup);for(let i=0;i<4;i++){const mech=this.hangarGroup?.getObjectByName('docked-breacher-'+i);if(mech?.visible){const pose=breacherHomePose(i,this.reduced?0:this.lifeClock-(mech.userData.arrivalTime??0),getHangar(this.lastBotState!)?.size==='compound');mech.position.set(...pose.position);turnBreacher(mech,pose.yaw,dt,this.reduced);animateBreacher(mech,dt,this.reduced);}}}
  for(let i=0;i<this.walkers.length;i++){
   const w=this.walkers[i],m=w.motion;w.delay-=dt;if(w.delay>0){w.group.visible=false;continue;}
   if(!w.group.visible&&this.walkers.some((leader,j)=>j<i&&leader.group.visible&&!leader.finished&&Math.hypot(leader.group.position.x-m.x,leader.group.position.z-m.z)<(w.troop==='breacher'||leader.troop==='breacher'?1.9:.85)))continue;
   w.group.visible=true;let allowance=Infinity;const next=m.route[m.segment];
   if(next){const dx=next[0]-m.x,dz=next[2]-m.z;for(let j=0;j<i;j++){const lead=this.walkers[j];if(!lead.group.visible||lead.finished)continue;const x=lead.group.position.x-m.x,z=lead.group.position.z-m.z;if(x*dx+z*dz>0)allowance=Math.min(allowance,Math.max(0,Math.hypot(x,z)-(w.troop==='breacher'||lead.troop==='breacher'?1.9:.85)));}}
   m.advance(w.troop==='breacher'?dt*.5:w.troop==='disruptor'?dt*.85:dt,allowance);w.group.position.set(m.x,m.y,m.z);const phaseRing=w.group.getObjectByName('friendly-phase');if(phaseRing)phaseRing.visible=(this.lastBotState?.walls??[]).some(wall=>Math.abs(m.x-wall.position[0])<(wall.orientation%2?.25:1)+.5&&Math.abs(m.z-wall.position[1])<(wall.orientation%2?1:.25)+.5);
   const facing=m.route[m.segment];if(facing&&!m.arrived)(w.troop==='disruptor'?turnDisruptor:w.troop==='breacher'?turnBreacher:turnScrapBot)(w.group,Math.atan2(facing[0]-m.x,facing[2]-m.z),dt,this.reduced);
   if(m.arrived){w.settled+=dt;(w.troop==='disruptor'?turnDisruptor:w.troop==='breacher'?turnBreacher:turnScrapBot)(w.group,this.hangarGroup?.rotation.y??0,dt,this.reduced);}
   if(w.troop==='breacher'){w.group.userData.breacherSpawn=Math.min(1,Math.max(0,-w.delay/.45));animateBreacher(w.group,dt,this.reduced);}else if(w.troop==='disruptor')animateDisruptor(w.group,dt,this.reduced);else animateScrapBot(w.group,dt,this.reduced);
   if(m.arrived&&w.settled>=.28){const dock=this.hangarGroup?.getObjectByName((w.troop==='disruptor'?'docked-disruptor-':w.troop==='breacher'?'docked-breacher-':'docked-bot-')+w.slot);if(dock){dock.userData.arrivalTime=this.lifeClock;dock.rotation.y=w.group.rotation.y-(this.hangarGroup?.rotation.y??0);if(!w.troop)handoffScrapPose(w.group,dock);}w.group.removeFromParent();w.finished=true;}
  }
  const count=this.walkers.length;this.walkers=this.walkers.filter(w=>!w.finished);if(count!==this.walkers.length)this.syncDockVisibility();
  for(let i=0;i<3;i++){const lamp=this.hangarGroup?.getObjectByName('hangar-lamp-'+i);if(lamp)lamp.visible=this.reduced||this.walkers.length===0||Math.sin(this.lifeClock*3-i)>.1;}
 }

 rigScreenPoint(kind:'rig'|'rig2'|'lab'='rig'){const position=kind==='lab'?this.labGroup?[this.labGroup.position.x,this.labGroup.position.z]:undefined:kind==='rig2'?this.rig2Position:this.rigPosition;if(!position)return;const p=new THREE.Vector3(position[0],3.5,position[1]).project(this.camera);return {x:(p.x+1)*this.host.clientWidth/2,y:(1-p.y)*this.host.clientHeight/2};}
 pickFoundation(x:number,y:number){if(!this.setRay(x,y))return;return pickFoundationBuilding(this.raycaster,this.garage,this.rigGroup,this.fabricatorGroup,this.hangarGroup,this.stationOwned?this.stationGroup:undefined,this.rig2Group,this.labGroup,this.droneStationGroup,this.sentinelGroup,this.storageGroups.get('computeStorage'),this.storageGroups.get('researchStorage'),this.arcSpireGroup);}
 buildingScreenPoint(id:FoundationBuilding){
  const extra=id==='computeStorage'||id==='researchStorage'?this.storageGroups.get(id):id==='arcSpire'?this.arcSpireGroup:id==='sentinel'?this.sentinelGroup:id==='droneStation'?this.droneStationGroup:id==='lab'?this.labGroup:id==='rig2'?this.rig2Group:id==='station'?this.stationGroup:id==='fabricator'?this.fabricatorGroup:id==='hangar'?this.hangarGroup:undefined;
  const point=extra?extra.position.clone().add(new THREE.Vector3(0,id==='droneStation'?2.8:5,0)):id==='rig'&&this.rigPosition?new THREE.Vector3(this.rigPosition[0],5.7,this.rigPosition[1]):new THREE.Vector3(-5,7,-1).add(this.garage.position);
  const p=point.project(this.camera);return {x:(p.x+1)*this.host.clientWidth/2,y:(1-p.y)*this.host.clientHeight/2,z:p.z};
 }
 pickDecoration(x:number,y:number){if(!this.setRay(x,y))return;const hit=this.decorations.hit(this.raycaster);if(!hit)return;const foreground=this.raycaster.intersectObjects([this.garage,this.rigGroup,this.rig2Group,this.labGroup,this.fabricatorGroup,this.hangarGroup,this.stationOwned?this.stationGroup:undefined].filter((g):g is THREE.Group=>!!g),true)[0];if(!foreground||hit.distance<foreground.distance)return hit.object.userData.decorationId as string;}
 decorationScreenPoint(id:string){const p=this.decorations.screenPosition(id)?.clone();if(!p)return;p.y+=3;const v=p.project(this.camera);return {x:(v.x+1)*this.host.clientWidth/2,y:(1-v.y)*this.host.clientHeight/2};}
 pickPlacementPreview(x:number,y:number){if(!this.rigPreview||!this.setRay(x,y))return false;return this.raycaster.intersectObject(this.rigPreview,true).length>0;}
 previewDecoration(kind:DecorationKind,position:RigPosition,orientation:Orientation,valid:boolean,id?:string){
  if(!this.rigPreview){const k=this.rigPreviewKit=new WorldKit('campus');this.rigPreview=decorationModel(k,kind);this.rigPreviewMaterial=new THREE.MeshBasicMaterial({color:c.cyan,transparent:true,opacity:.6,depthWrite:false});this.rigPreview.traverse(o=>{if(o instanceof THREE.Mesh){o.material=this.rigPreviewMaterial!;o.castShadow=false;}});this.scene.add(this.rigPreview);this.rigGrid=foundationGrid(c.cyan,c.slate);this.scene.add(this.rigGrid);}
  this.decorationPreviewId=id;if(id)this.decorations.show(id,false);this.rigPreview.position.set(position[0],.1,position[1]);this.rigPreview.rotation.y=orientation*Math.PI/2;this.rigPreviewMaterial!.color.set(valid?c.cyan:c.coral);
 }
 pickRig(x:number,y:number){if(!this.rigGroup||!this.setRay(x,y))return false;return this.raycaster.intersectObject(this.rigGroup,true).length>0;}
 previewRig(position:RigPosition,valid:boolean,kind:'arcSpire'|'sentinel'|'droneStation'|'station'|'rig'|'fabricator'|'hangar'|'lab'|'computeStorage'|'researchStorage'='rig',orientation:Orientation=0){
  if(!this.rigPreview){this.rigPreviewKit=new WorldKit();this.rigPreview=kind==='computeStorage'||kind==='researchStorage'?storageModel(this.rigPreviewKit,kind):kind==='arcSpire'?arcSpireModel(this.rigPreviewKit):kind==='sentinel'?sentinelModel(this.rigPreviewKit):kind==='droneStation'?droneStationModel(this.rigPreviewKit):kind==='lab'?researchLabModel(this.rigPreviewKit):kind==='station'?builderStationModel(this.rigPreviewKit):kind==='fabricator'?fabricatorModel(this.rigPreviewKit):kind==='hangar'?hangarModel(this.rigPreviewKit,0,'compound'):gpuRigModel(this.rigPreviewKit);applyBuildingLevel(this.rigPreviewKit,this.rigPreview,kind,1);this.rigPreviewMaterial=new THREE.MeshBasicMaterial({color:c.cyan,transparent:true,opacity:.48,depthWrite:false});this.rigPreview.traverse(o=>{if(o instanceof THREE.Mesh){o.material=this.rigPreviewMaterial!;o.castShadow=false;}});this.scene.add(this.rigPreview);this.rigGrid=foundationGrid(c.cyan,c.slate);this.scene.add(this.rigGrid);}
  this.rigPreview.rotation.y=orientation*Math.PI/2;this.rigPreview.position.set(position[0],.2,position[1]);this.rigPreviewMaterial!.color.set(valid?c.cyan:c.coral);if(kind==='rig'&&this.lastBotState)this.syncPower(this.lastBotState,this.lastSecurityNow,{kind:this.lastBotState.rig?'rig2':'rig',position,orientation});
 }
 clearRigPreview(){if(this.hiddenHut){const hut=this.hutGroups.get(this.hiddenHut);if(hut)hut.visible=true;}this.hiddenHut=undefined;const hadRow=this.hiddenWalls.size>0;this.hiddenWalls.clear();this.rowPreviewKey='';this.wallKey='';if(hadRow&&this.lastBotState)this.syncLab(this.lastBotState,this.lastSecurityNow);this.cablePreview=undefined;if(this.hiddenWall){this.hiddenWall=undefined;this.wallKey='';if(this.lastBotState)this.syncLab(this.lastBotState,this.lastSecurityNow);}if(this.decorationPreviewId)this.decorations.show(this.decorationPreviewId,true);this.decorationPreviewId=undefined;for(const kind of ['hq','station','rig','rig2','fabricator','hangar','lab','droneStation','sentinel','arcSpire','computeStorage','researchStorage'] as const){const group=this.layoutGroup(kind);if(group)group.visible=kind!=='station'||this.stationOwned;}this.layoutPreviewKind=undefined;this.rigPreview?.removeFromParent();this.rigPreviewKit?.dispose();this.rigPreviewMaterial?.dispose();this.rigPreview=undefined;this.rigPreviewKit=undefined;this.rigPreviewMaterial=undefined;if(this.rigGrid){this.rigGrid.removeFromParent();this.rigGrid.geometry.dispose();const m=this.rigGrid.material;(Array.isArray(m)?m:[m]).forEach(item=>item.dispose());this.rigGrid=undefined;}if(this.lastBotState)this.syncPower(this.lastBotState,this.lastSecurityNow);}
 animateClear(obstacleId:string){const group=this.obstacles.get(obstacleId);if(!group)return;this.obstacleHits=this.obstacleHits.filter(o=>o.userData.obstacleId!==obstacleId);this.clearing.push({group,time:0});this.obstacles.delete(obstacleId);}
 syncLandscape(state:FoundationState,now:number){
  const assigned=clearingJobs(state);const retained=new Set<number>();
  for(const job of assigned){const index=job.builderIndex??0;if(now>=job.clearedAt&&constructionSignature(state,now,index,true))continue;const bot=this.builders[index];if(!bot)continue;retained.add(index);const prior=this.cleanupVisuals.get(index);
   if(prior?.job.id===job.id){prior.job=job;prior.now=now;continue;}
   const from:RigPosition=[bot.group.position.x,bot.group.position.z],restoring=!this.landscapeKey&&now>job.startedAt+500;
   let route=restoring?job.route:landscapeRoute(state,job.route.at(-1)!,from,1.1);
   if(!route.length&&Math.hypot(from[0]-job.route[0][0],from[1]-job.route[0][1])<3)route=[from,...job.route.slice(1)];
   this.cleanupVisuals.set(index,{job,route,returnRoute:job.returnRoute??[...job.route].reverse(),now,startAt:restoring?job.startedAt:now});
   if(index===0){this.returning=false;this.workPause=0;}
  }
  for(const index of this.cleanupVisuals.keys())if(!retained.has(index))this.cleanupVisuals.delete(index);
  this.cleanupJob=this.cleanupVisuals.get(0)?.job;this.cleanupNow=now;const items=state.landscape?.items||[],key=JSON.stringify(items);if(state.landscape?.legacyRocksRegistered)for(const rock of OBSTACLES.filter(o=>o.kind==='rock')){const old=this.obstacles.get(rock.id);if(old)old.visible=false;}
  if(key!==this.landscapeKey){this.landscapeKey=key;this.landscapeGroup?.removeFromParent();this.landscapeKit?.dispose();this.landscapeKit=new WorldKit('campus');this.landscapeGroup=new THREE.Group();this.scene.add(this.landscapeGroup);this.landscapeHits=[];this.landscapeItems=items;
   for(const o of items){const model=landscapeModel(this.landscapeKit,o);this.landscapeGroup.add(model.group);this.landscapeHits.push(model.hit);}}
  const last=state.landscape?.lastClear;if(last&&this.lastCleanup&&last.id!==this.lastCleanup&&now-last.at<6000&&!this.reduced){const g=new THREE.Group();g.position.set(last.position[0],.5,last.position[1]);for(let i=0;i<10;i++){const p=this.particleKit.box(g,[.12,.1,.15],[Math.sin(i*2.4)*.8,.3+i*.1,Math.cos(i*2.4)*.8],last.kind==='tree'?'#75bd83':last.kind==='rock'?'#a6b1a9':i%3===0?c.gold:c.slate,.02);p.rotation.y=i;}this.scene.add(g);this.cleanupParticles.push({group:g,time:0});}this.lastCleanup=last?.id||'none';
  this.renderer.domElement.dataset.obstacles=String(items.length);
 }
 pickLandscapeObstacle(x:number,y:number){if(!this.setRay(x,y))return;return this.raycaster.intersectObjects(this.landscapeHits,false)[0]?.object.userData.obstacleId as string|undefined;}
 obstacleScreenPoint(id:string){const o=this.landscapeItems.find(o=>o.id===id)||this.cleanupJob?.obstacle;if(!o)return;const p=new THREE.Vector3(o.position[0],o.kind==='tree'?4.5:2,o.position[1]).project(this.camera);return {x:(p.x+1)*this.host.clientWidth/2,y:(1-p.y)*this.host.clientHeight/2};}
 private animateCleanup(dt:number){
  for(const item of this.cleanupParticles){item.time+=dt;item.group.position.y+=dt*1.8;item.group.scale.setScalar(Math.max(0,1-item.time/1.1));item.group.rotation.y+=dt;if(item.time>=1.1)item.group.removeFromParent();}this.cleanupParticles=this.cleanupParticles.filter(p=>p.time<1.1);
  for(const [index,v] of this.cleanupVisuals){const j=v.job,bot=this.builders[index];if(!bot)continue;v.now+=dt*1000;const now=v.now,returning=now>=j.clearedAt,working=now>=j.workAt&&!returning;
   const phase=working?'clearing':returning?'returning':'traveling';this.renderer.domElement.dataset['builderPhase'+index]=phase;if(index===0)this.renderer.domElement.dataset.builderPhase=phase;
   const route=returning?v.returnRoute:v.route;if(!route.length){bot.spark.visible=false;continue;}
   const progress=working?1:returning?(now-j.clearedAt)/Math.max(1,j.completesAt-j.clearedAt):(now-v.startAt)/Math.max(1,j.workAt-v.startAt);
   const next=routePosition(route,progress),dx=next[0]-bot.group.position.x,dz=next[1]-bot.group.position.z;
   if(!working&&Math.hypot(dx,dz)>.001)turnScrapBot(bot.group,Math.atan2(dx,dz),dt,this.reduced);
   bot.group.position.set(next[0],.12,next[1]);if(working)bot.group.rotation.y=Math.atan2(j.obstacle.position[0]-next[0],j.obstacle.position[1]-next[1]);bot.group.rotation.z=working&&!this.reduced?Math.sin(this.lifeClock*12)*.07:0;bot.spark.visible=working&&!this.reduced&&Math.sin(this.lifeClock*18)>0;
   this.renderer.domElement.dataset['builderPosition'+index]=next.map(n=>n.toFixed(2)).join(',');if(index===0)this.renderer.domElement.dataset.builderPosition=next.map(n=>n.toFixed(2)).join(',');
  }
  return this.cleanupVisuals.has(0);
 }

 private syncExtraBuilder(state:FoundationState,now:number){
  const bot=this.builders[1];if(!this.minimal||!bot||!bot.group.visible)return;
  const index=1,station=state.builderHuts?.find(h=>h.id==='builder-hut-2'&&!h.unplaced)??buildingLayout(state,'station');
  if(clearingJobs(state).some(j=>(j.builderIndex??0)===1&&now<j.completesAt)&&!constructionSignature(state,now,1,true)){this.extraBuilderKey='';return;}
  const key=constructionSignature(state,now,index,true)||JSON.stringify(['idle',station]);if(key===this.extraBuilderKey)return;this.extraBuilderKey=key;const plan=constructionWork(state,now,index,true);
  const from:RigPosition=[bot.group.position.x,bot.group.position.z];this.extraBuilderCenter=plan?.center;
  const homeState=station?{...state,stationLayout:station,builderHuts:[...(state.builderHuts??[]).filter(h=>h.id!==('id' in station?station.id:'')),{id:'original-hut',...buildingLayout(state,'station')!}]}:state;
  this.extraBuilderPath=plan?.positions.length?landscapeRoute(state,plan.positions[0],from,1.1):builderReturn(homeState,from);
  if(plan?.positions.length&&!this.extraBuilderPath.length&&station&&Math.hypot(from[0]-station.position[0],from[1]-station.position[1])<2)this.extraBuilderPath=landscapeRoute(homeState,plan.positions[0],undefined,1.1);
 }
 private animateExtraBuilder(dt:number){
  const bot=this.builders[1];if(!this.minimal||!bot?.group.visible||this.cleanupVisuals.has(1))return;let budget=dt*6;const g=bot.group;
  while(budget>0&&this.extraBuilderPath.length){const q=this.extraBuilderPath[0],dx=q[0]-g.position.x,dz=q[1]-g.position.z,d=Math.hypot(dx,dz);if(d<.01){this.extraBuilderPath.shift();continue;}turnScrapBot(g,Math.atan2(dx,dz),dt,this.reduced);const step=Math.min(d,budget);g.position.x+=dx/d*step;g.position.z+=dz/d*step;budget-=step;if(step>=d)this.extraBuilderPath.shift();}
  const working=!!this.extraBuilderCenter&&!this.extraBuilderPath.length;
  if(working)turnScrapBot(g,Math.atan2(this.extraBuilderCenter![0]-g.position.x,this.extraBuilderCenter![1]-g.position.z),dt,this.reduced);
  g.rotation.z=working&&!this.reduced?Math.sin(this.lifeClock*13)*.045:0;const tool=g.getObjectByName('builder-tool');if(tool)tool.rotation.x=working&&!this.reduced?-.25+Math.sin(this.lifeClock*18)*.3:0;bot.spark.visible=working&&!this.reduced&&Math.sin(this.lifeClock*23)>.65;
 }
 private syncConstruction(state:FoundationState,now:number){
  const bot=this.builders[0];if(!bot)return;const signature=constructionSignature(state,now);if(signature&&signature===this.constructionKey)return;const plan=signature?constructionWork(state,now):undefined;
  if(plan){if(plan.key!==this.constructionKey){this.constructionKey=plan.key;this.workPlan=plan;this.workRoute=0;this.workPause=0;this.returning=false;const from:RigPosition=[bot.group.position.x,bot.group.position.z];this.builderRoute=plan.positions.length?landscapeRoute(state,plan.positions[0],from,1.1):[];const home=buildingLayout(state,'station');if(!this.builderRoute.length&&home&&Math.hypot(from[0]-home.position[0],from[1]-home.position[1])<3)this.builderRoute=[from,...(plan.routes[0]?.slice(1)||[])];this.builderSegment=1;}}
  else if(this.workPlan){this.workPlan=undefined;this.constructionKey='';this.returning=true;this.workPause=0;this.builderRoute=builderReturn(state,[bot.group.position.x,bot.group.position.z]);this.builderSegment=1;}
  else if(!this.returning&&!clearingJobs(state).some(j=>(j.builderIndex??0)===0)){const home=buildingLayout(state,'station');if(home)bot.group.position.set(home.position[0],.12,home.position[1]);}
 }
 private animateConstruction(dt:number){
  const bot=this.builders[0];if(!bot||!this.stationOwned)return false;if(!this.workPlan&&!this.returning)return false;if(this.workPlan&&(!this.workPlan.positions.length||!this.builderRoute.length)){bot.spark.visible=false;this.renderer.domElement.dataset.builderPhase='waiting-for-access';return true;}
  const g=bot.group,tool=g.getObjectByName('builder-tool');let moving=false,travel=dt*6;
  if(this.workPause>0)this.workPause-=dt;else while(travel>0&&this.builderSegment<this.builderRoute.length){const next=this.builderRoute[this.builderSegment],dx=next[0]-g.position.x,dz=next[1]-g.position.z,d=Math.hypot(dx,dz);moving=true;turnScrapBot(g,Math.atan2(dx,dz),dt,this.reduced);if(d<=travel){g.position.set(next[0],.12,next[1]);travel-=d;this.builderSegment++;}else{g.position.x+=dx/d*travel;g.position.z+=dz/d*travel;travel=0;}}
  const working=!!this.workPlan&&!moving&&(this.workPause>0||this.builderSegment>=this.builderRoute.length);
  if(working){turnScrapBot(g,Math.atan2(this.workPlan!.center[0]-g.position.x,this.workPlan!.center[1]-g.position.z),dt,this.reduced);if(this.workPause<=0&&this.builderSegment>=this.builderRoute.length){this.workPause=1.1;if(this.workPlan!.positions.length>1){this.workRoute=this.workRoute%this.workPlan!.positions.length+1;this.builderRoute=this.workPlan!.routes[this.workRoute]||[];this.builderSegment=1;}}}
  if(this.returning&&this.builderSegment>=this.builderRoute.length){this.returning=false;turnScrapBot(g,this.builderHomeYaw,dt,this.reduced);}
  g.rotation.z=working&&!this.reduced?Math.sin(this.lifeClock*13)*.045:0;if(tool)tool.rotation.x=working&&!this.reduced?-.25+Math.sin(this.lifeClock*18)*.3:0;bot.spark.visible=working&&!this.reduced&&Math.sin(this.lifeClock*23)>.65;
  this.renderer.domElement.dataset.builderPhase=this.returning?'returning':working?'construction-working':'construction-traveling';this.renderer.domElement.dataset.builderPosition=g.position.x.toFixed(2)+','+g.position.z.toFixed(2);return true;
 }
 private phaseBuilder(){
  for(const bot of this.builders){const p=bot.group.position;
  const phasing=(this.lastBotState?.walls??[]).some(w=>Math.abs(p.x-w.position[0])<(w.orientation%2?.25:1)+.5&&Math.abs(p.z-w.position[1])<(w.orientation%2?1:.25)+.5);
  bot.group.traverse(n=>{if(!(n instanceof THREE.Mesh))return;if(!n.userData.phaseMaterials){const materials=(Array.isArray(n.material)?n.material:[n.material]).map(m=>{const c=m.clone();c.userData.baseOpacity=m.opacity;c.userData.baseTransparent=m.transparent;c.userData.baseDepthWrite=m.depthWrite;return c;});n.material=Array.isArray(n.material)?materials:materials[0];n.userData.phaseMaterials=true;}for(const m of Array.isArray(n.material)?n.material:[n.material]){m.transparent=phasing||m.userData.baseTransparent;m.opacity=m.userData.baseOpacity*(phasing?.38:1);m.depthWrite=phasing?false:m.userData.baseDepthWrite;}});
  if(bot===this.builders[0])this.renderer.domElement.dataset.builderPhasing=String(phasing);}
 }
 private animateWorld(dt:number){
  if(this.hqReveal>0&&this.founderHouse){this.hqReveal=Math.max(0,this.hqReveal-dt);this.founderHouse.scale.setScalar(1-.025*this.hqReveal/.45);}
  this.mapBoundary?.update(dt,this.reduced);
  this.animateBotLife(dt);
  animateFounderIdle(this.founderHouse,this.lifeClock,this.reduced||document.hidden);
  animateFounderHQEnergy(this.founderHouse,this.lifeClock,this.reduced||document.hidden);
  const lamp=this.fabricatorGroup?.getObjectByName('production-light');if(lamp)lamp.visible=!this.producing||this.reduced||Math.sin(this.clock*5)>-.4;
  for(const item of this.clearing){item.time+=dt;item.group.scale.setScalar(Math.max(0,1-item.time/.65));item.group.rotation.y=item.time*2;item.group.position.y=item.time*.5;if(item.time>=.65)this.scene.remove(item.group);}this.clearing=this.clearing.filter(item=>item.time<.65);
  this.animateExtraBuilder(dt);
  if(this.animateCleanup(dt))return;
  if(this.minimal){if(this.animateConstruction(dt))return;for(const bot of this.builders.slice(0,1)){bot.spark.visible=false;bot.group.rotation.z=0;const tool=bot.group.getObjectByName('builder-tool');if(tool)tool.rotation.x=0;bot.group.rotation.y=this.builderHomeYaw+(this.reduced?0:Math.sin(this.lifeClock*.4)*.08);}return;}
  if(this.reduced){for(const bot of this.builders){bot.group.position.copy(bot.to);if(!bot.working)bot.group.rotation.y=this.builderHomeYaw;}return;}
  for(const accent of this.accents)accent.rotation.y+=dt*.28;
  for(let i=0;i<this.builders.length;i++){const bot=this.builders[i],travel=Math.min(1,this.clock/2.4);bot.group.position.lerpVectors(bot.from,bot.to,travel);if(bot.working&&travel===1){bot.group.rotation.z=Math.sin(this.clock*8+i)*.06;bot.spark.visible=Math.sin(this.clock*18+i)>.5;bot.spark.scale.setScalar(.7+Math.sin(this.clock*12)*.3);}else if(!bot.working){bot.group.rotation.z=0;bot.group.rotation.y=this.builderHomeYaw+Math.sin(this.clock*.4+i)*.2;}}
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
 private draftPlaced?:Set<string>;
 setDraftPlaced(ids:string[]){this.draftPlaced=new Set(ids);if(this.lastBotState)this.district?.syncLots(this.lastBotState,this.draftPlaced);}
 private applyDraftVisibility(){if(!this.draftPlaced)return;for(const kind of ['hq','station','rig','rig2','fabricator','hangar','lab','droneStation','sentinel','arcSpire','computeStorage','researchStorage'] as const){const g=this.layoutGroup(kind);if(g)g.visible=this.draftPlaced.has(kind)&&this.layoutPreviewKind!==kind;}for(const b of this.builders)b.group.visible=false;this.security.group.visible=false;this.power.group.visible=false;for(const w of this.walkers)w.group.visible=false;}
 private currentGuard?:THREE.Mesh;
 selectGuard(index?:number,p?:RigPosition){this.security.highlight(index);if(!p){if(this.currentGuard)this.currentGuard.visible=false;return;}if(!this.currentGuard){this.currentGuard=new THREE.Mesh(new THREE.RingGeometry(DRONE_PATROL_RADIUS-.07,DRONE_PATROL_RADIUS,48),new THREE.MeshBasicMaterial({color:0xffdc68,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));this.currentGuard.rotation.x=-Math.PI/2;this.scene.add(this.currentGuard);}this.currentGuard.visible=true;this.currentGuard.position.set(p[0],10,p[1]);}
 private guardOverlay?:THREE.Mesh;
 private fadedHq=new Map<THREE.Mesh,THREE.Material|THREE.Material[]>();
 private arrangementGrid?:THREE.LineSegments;
 setArrangementGrid(active:boolean){if(active&&!this.arrangementGrid){this.arrangementGrid=foundationGrid(c.cyan,c.slate);this.scene.add(this.arrangementGrid);}if(this.arrangementGrid)this.arrangementGrid.visible=active;}
 wallVisibility(active:boolean){
  if(!active){for(const [mesh,original] of this.fadedHq){for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();mesh.material=original;}this.fadedHq.clear();return;}
  this.layoutGroup('hq')?.traverse(n=>{if(!(n instanceof THREE.Mesh)||this.fadedHq.has(n))return;this.fadedHq.set(n,n.material);const copies=(Array.isArray(n.material)?n.material:[n.material]).map(m=>{const copy=m.clone();copy.transparent=true;copy.opacity=.38;copy.depthWrite=false;return copy;});n.material=Array.isArray(n.material)?copies:copies[0];});
 }
 previewGuard(p:RigPosition|undefined,valid=true){if(!p){if(this.guardOverlay)this.guardOverlay.visible=false;return;}if(!this.guardOverlay){const geometry=new THREE.CircleGeometry(DRONE_PATROL_RADIUS,48),material=new THREE.MeshBasicMaterial({color:c.cyan,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide});this.guardOverlay=new THREE.Mesh(geometry,material);this.guardOverlay.rotation.x=-Math.PI/2;this.scene.add(this.guardOverlay);}this.guardOverlay.visible=true;this.guardOverlay.position.set(p[0],10.03,p[1]);(this.guardOverlay.material as THREE.MeshBasicMaterial).color.set(valid?c.cyan:c.coral);}
 private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);if(this.minimal){campusProjection(this.camera,w,h);return;}const aspect=w/h,span=this.minimal?portraitCampusSpan(aspect):Math.max(this.worldSpan,this.worldSpan*17/30*aspect);this.camera.left=-span/2;this.camera.right=span/2;this.camera.top=span/aspect/2;this.camera.bottom=-span/aspect/2;this.camera.updateProjectionMatrix();}
 snapshot(){return {x:this.target.x,z:this.target.z,zoom:this.zoomTarget};}
 restore(view:{x:number;z:number;zoom:number}){this.target.set(view.x,0,view.z);this.camera.position.add(this.target.clone().sub(this.center));this.center.copy(this.target);this.zoomTarget=view.zoom;this.camera.zoom=view.zoom;this.camera.lookAt(this.center);this.camera.updateProjectionMatrix();}
 frameIntroduction(position:RigPosition){this.camera.updateMatrixWorld(true);const p=new THREE.Vector3(position[0],0,position[1]);if(this.host.clientWidth>this.host.clientHeight&&this.host.clientHeight<=600){const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0);p.addScaledVector(right,-(this.camera.right-this.camera.left)*.27);}this.restore({x:p.x,z:p.z,zoom:1});}
 focusRig(position:RigPosition){this.target.set(position[0],0,position[1]);}
 zoom(factor:number){const limits=this.minimal?hqZoomLimits(matchMedia('(hover: hover) and (pointer: fine)').matches):{min:.8,max:1.65};this.zoomTarget=THREE.MathUtils.clamp(this.zoomTarget*factor,limits.min,limits.max);}
 pan(dx:number,dy:number){const scale=(this.camera.right-this.camera.left)/Math.max(1,this.host.clientWidth)/this.camera.zoom;const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0);const up=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1);up.y=0;up.normalize();this.target.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);this.target.y=0;if(this.minimal){this.target.x=THREE.MathUtils.clamp(this.target.x,P.minX,P.maxX);this.target.z=THREE.MathUtils.clamp(this.target.z,P.minZ,P.maxZ);return;}const flat=new THREE.Vector2(this.target.x-this.home.x,this.target.z-this.home.z);const limit=this.worldSpan*.28;if(flat.length()>limit)flat.setLength(limit);this.target.set(this.home.x+flat.x,0,this.home.z+flat.y);}
 reset(){this.target.copy(this.home);this.zoomTarget=1;}
 update(dt:number){if(this.paused)return;this.district?.update(dt,this.host.clientWidth,this.host.clientHeight,this.reduced,document.hidden);this.clock+=dt;const next=this.center.clone().lerp(this.target,this.reduced?1:Math.min(1,dt*10));this.camera.position.add(next.clone().sub(this.center));this.center.copy(next);this.camera.lookAt(this.center);this.camera.zoom=THREE.MathUtils.lerp(this.camera.zoom,this.zoomTarget,this.reduced?1:Math.min(1,dt*10));this.camera.updateProjectionMatrix();this.animateWorld(dt);this.phaseBuilder();this.constructionVisuals.update(dt,this.reduced);this.applyDraftVisibility();this.renderer.render(this.scene,this.camera);if(this.rigPreview){const p=this.rigPreview.position.clone();this.renderer.domElement.dataset.previewPosition=p.x+','+p.z;this.renderer.domElement.dataset.previewOrientation=String(this.rigPreview.rotation.y);p.y+=.3;p.project(this.camera);this.renderer.domElement.dataset.previewScreen=((p.x+1)*this.host.clientWidth/2).toFixed(1)+','+((1-p.y)*this.host.clientHeight/2).toFixed(1);}else{delete this.renderer.domElement.dataset.previewPosition;delete this.renderer.domElement.dataset.previewScreen;}this.renderer.domElement.dataset.cameraZoom=this.camera.zoom.toFixed(3);this.renderer.domElement.dataset.cameraTarget=this.target.x.toFixed(2)+','+this.target.z.toFixed(2);this.renderer.domElement.dataset.drawCalls=String(this.renderer.info.render.calls);this.renderer.domElement.dataset.triangles=String(this.renderer.info.render.triangles);}
 dispose(){this.arcSpireKit?.dispose();for(const v of this.levelDetails.values())v.kit.dispose();for(const k of this.storageKits.values())k.dispose();if(this.arrangementGrid){this.arrangementGrid.geometry.dispose();(this.arrangementGrid.material as THREE.Material).dispose();}this.currentGuard?.geometry.dispose();(this.currentGuard?.material as THREE.Material|undefined)?.dispose();this.wallVisibility(false);this.guardOverlay?.geometry.dispose();(this.guardOverlay?.material as THREE.Material|undefined)?.dispose();this.hutKit?.dispose();this.sentinelKit?.dispose();this.wallGhostKit?.dispose();this.wallGhostMaterial?.dispose();for(const b of this.builders)b.group.traverse(n=>{if(n instanceof THREE.Mesh&&n.userData.phaseMaterials)for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();});this.constructionVisuals.dispose();this.droneKit?.dispose();this.walls.dispose();this.security.dispose();this.labKit?.dispose();this.decorations.dispose();this.district?.dispose();this.mapBoundary?.dispose();this.landscapeKit?.dispose();this.particleKit.dispose();document.removeEventListener('visibilitychange',this.visibility);for(const w of this.walkers)w.group.removeFromParent();this.walkers=[];this.botKit?.dispose();this.clearRigPreview();this.power.dispose();this.rigKit?.dispose();this.rig2Kit?.dispose();this.clearPlacement();this.observer.disconnect();this.renderer.domElement.removeEventListener('webglcontextlost',this.lost);this.scene.traverse(o=>{if(o instanceof THREE.DirectionalLight)o.shadow.dispose();});this.kit.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
