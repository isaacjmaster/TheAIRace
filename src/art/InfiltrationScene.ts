import {ElectronicEffects} from './ElectronicEffects';
import {disruptorModel,animateDisruptor,turnDisruptor} from './Disruptor';
import {arcSpireModel,animateArcSpire} from './ArcSpire';
import {troopCombat} from '../../shared/combat-balance';
import {applyBuildingLevel,storageModel} from './BuildingLevels';
import {breacherBalance,wallBalance,wallHealth} from '../../shared/combat-balance';
import {breacherModel,animateBreacher,turnBreacher} from './Breacher';
import {BreachImpact} from './BreachImpact';
import {sameShotPosition,shotAsset} from './combatShotTarget';
import {DamageFeedback} from './DamageFeedback';
import {CombatBolts} from './CombatBolts';
import type {CombatCue} from '../audio/combatCues';
import {DRONE_ALTITUDE} from '../../shared/security';
import {CAMPUS_CAMERA_OFFSET,campusProjection} from './campusCamera';
import {hqZoomLimits} from './hqZoom';
import {sentinelModel,animateSentinel,SentinelPulse} from './SentinelTower';
import {HackEffects} from './HackEffects';
import {protectedAreas,protectedOutline} from '../../shared/deployment-boundary';
import {PowerConnections} from './PowerConnections';
import {decorationModel} from './Decorations';
import {rivalScenery} from '../../shared/rival-scenery';
import {landscapeModel} from './LandscapeObstacles';
import {tacticalBalance,TACTICAL_BALANCE} from '../../shared/tactical-infiltration';
import {squadTarget,type SquadAgent} from '../../shared/squad-infiltration';
import {droneStationModel} from './DroneStation';
import {lightCampus} from './CampusFinish';
import {CampusLawn} from './CampusLawn';
import {segmentClear} from '../../shared/navigation';
import {AGENT_CLEARANCE,targetBounds,infiltrationSolids,deploymentGround,validDeployment} from '../../shared/infiltration';
import {SecurityWalls,wallVisualHeight} from './SecurityWalls';
import * as THREE from 'three';
import { WorldKit, lightWorld, palette as C } from './world';
import {InfiltrationDistrict} from './InfiltrationDistrict';
import {frameInfiltration,infiltrationZoomLimits} from './infiltrationCamera';
import { founderHQ, animateFounderIdle } from './FounderHQ';
import { gpuRigModel, animateGpu } from './GpuRig';
import { researchLabModel, animateResearchLab } from './ResearchLab';
import { builderStationModel,fabricatorModel,hangarModel,scrapBotModel } from './BotBuildings';
import { animateScrapBot, turnScrapBot } from './ScrapBotMotion';
import { securityDroneModel, animateSecurityDrone } from './SecurityDrone';
import { advanceOperation, type Operation, type Vec } from '../../shared/infiltration';
/** Visual prediction only. The server owns all operation results and rewards. */
export class InfiltrationScene {
    readonly scene = new THREE.Scene();
    readonly camera = new THREE.OrthographicCamera();
    readonly renderer: THREE.WebGLRenderer;
    private k = new WorldKit('campus');
    private walls?:SecurityWalls;
    private district:InfiltrationDistrict;private lawn:CampusLawn;
    private deploymentActive=false;private zoneMaterial=new THREE.MeshBasicMaterial({color:0x40daca,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false});private displayAgent=new THREE.Vector3();private desiredAgent=new THREE.Vector3();private laserDirection=new THREE.Vector3();private up=new THREE.Vector3(0,1,0);private shotStart=new THREE.Vector3();private shotEnd=new THREE.Vector3();private solids:ReturnType<typeof infiltrationSolids>;private displayReady=false;
    private deployment=new THREE.Group();private deploymentPosition:Vec;private deploymentValid=true;
    private squadModels=new Map<string,{model:THREE.Group;ring:THREE.Mesh;muzzle:THREE.Object3D;display:THREE.Vector3;initialized:boolean;spawnedAt:number}>();private wallVersion='';
    private agent = scrapBotModel(this.k);
    private drones = new Map<string, {
        model: THREE.Group;
        scan: THREE.Mesh;
        alert: THREE.Mesh;
        laser:THREE.Mesh;impact:THREE.Mesh;muzzle:THREE.Mesh;
    }>();
    private heavyImpacts=new BreachImpact();private feedback=new DamageFeedback();private bolts=new CombatBolts();private shotKeys=new Map<string,number>();private lastHealth=new Map<string,number>();private hitUntil=new Map<string,number>();private cueEvents=new Set<string>();
    private power=new PowerConnections();private hacks=new HackEffects();
    private brokenWalls=new Map<string,THREE.Group>();private solidVersion='';
    private electronicEffects=new ElectronicEffects();
    private sentinelPulses=new Map<string,SentinelPulse>();
    private buildings = new Map<string, THREE.Group>();
    private buildingLabelHeights = new Map<string,number>();
    private op: Operation;
    private anchor = 0;
    private server = 0;
    private observer: ResizeObserver;
    private ray = new THREE.Raycaster();
    private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    private center = new THREE.Vector3();
    private clock = 0;
    private span = 1;private zoomBounds={min:.2,max:1,default:.62};private framed=false;
        private pathGeometry = new THREE.BufferGeometry();
    private pathLine: THREE.Line;
    private beamGeometry = new THREE.BufferGeometry();
    private beam: THREE.Line;
    private hackRing: THREE.Mesh;
    private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    constructor(private host: HTMLElement, o: Operation,private options:{preview?:boolean;replay?:boolean;onCombatCue?:(cue:CombatCue)=>void}={}) {
        this.op = structuredClone(o);this.solids=infiltrationSolids(o.target);this.deploymentPosition=[...o.target.entry];this.district=new InfiltrationDistrict(o.target.id==='vector-works',o.target.arena==='campus-v2',targetBounds(o.target));this.span=o.target.arena==='campus-v2'?.82:1;
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        const sun=lightWorld(this.renderer,this.scene);lightCampus(this.renderer,this.scene,sun);this.scene.background=new THREE.Color('#b5eafa');this.scene.fog=null;
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        this.renderer.domElement.setAttribute('aria-label', 'Rival company campus');
        this.host.append(this.renderer.domElement);
        this.scene.add(this.heavyImpacts.group,this.bolts.group);this.scene.add(this.district.group);if(o.target.walls){this.walls=new SecurityWalls(o.target.walls);this.scene.add(this.walls.group);}
        const arena=targetBounds(o.target),hx=arena.maxX,hz=arena.maxZ;this.k.box(this.scene,[hx*2+.7,.12,hz*2+.7],[0,-.08,0],'#d7d9b8');this.lawn=new CampusLawn(hx*2+.5,hz*2+.5);this.lawn.mesh.position.y=.015;this.scene.add(this.lawn.mesh);
        for (const x of [-hx,hx])
            this.k.box(this.scene, [.12,.22,hz*2], [x, .12, 0], C.cream);
        for (const z of [-hz,hz])
            this.k.box(this.scene, [hx*2,.22,.12], [0, .12, z], C.cream);
        if(o.squad&&!o.pvp){this.k.box(this.scene,[8,.025,1.1],[-1,.06,3.9],'#e8dfc7');this.k.box(this.scene,[1,.025,5],[8.8,.06,0],'#e8dfc7');for(const x of [-9.3,9.5])for(const z of [-5,2]){this.k.box(this.scene,[.65,.16,1.2],[x,.16,z],C.cream,.08);this.k.box(this.scene,[.48,.4,.95],[x,.4,z],'#91b584',.15);}}
        for (const a of o.target.assets) {
            let g: THREE.Group;
            if (a.kind === 'hq') {
                g = new THREE.Group();
                const h = founderHQ(this.k, g, a.level??o.target.hqLevel??(o.target.id === 'lumen-labs' ? 1 : 2));
                h.position.set(0, 0, 0);
                g.scale.setScalar(o.pvp?1:.65);
            }
            else if (a.kind === 'gpu')
                g = gpuRigModel(this.k);
            else if(a.model==='computeStorage'||a.model==='researchStorage')g=storageModel(this.k,a.model,a.level??1);
            else if(a.model==='station')g=builderStationModel(this.k);
            else if(a.model==='fabricator')g=fabricatorModel(this.k);
            else if(a.model==='hangar')g=hangarModel(this.k,0,o.target.publicBase?.buildings.find(b=>b.id===a.id)?.size==='compound'?'compound':o.target.publicBase?.buildings.find(b=>b.id===a.id)?.size==='expanded');
            else if(a.model==='arcSpire'){g=arcSpireModel(this.k);}else if(a.model==='sentinel'){g=sentinelModel(this.k);const pulse=new SentinelPulse();this.sentinelPulses.set(a.id,pulse);this.scene.add(pulse.group);}
            else if(a.kind==='station')g=droneStationModel(this.k);
            else if (a.kind === 'lab')
                g = researchLabModel(this.k);
            else {
                g = new THREE.Group();
                this.k.box(g, [1.5, .2, 1.3], [0, .1, 0], C.cream);
                this.k.box(g, [.9, 1.5, .65], [0, .9, 0], C.dark);
                this.k.box(g, [.7, .65, .05], [0, 1.2, .36], C.purple, .03, true);
            }
            const visualKind=a.kind==='gpu'?'rig':a.kind==='lab'?'lab':a.model??(a.kind==='station'?'droneStation':a.kind);applyBuildingLevel(this.k,g,visualKind,a.level??1);
            const pivot=a.visualPosition??a.position;g.position.set(pivot[0],0,pivot[1]);g.rotation.y=(a.orientation??0)*Math.PI/2;
            g.userData.assetId = a.id;
            this.scene.add(g);
            this.buildings.set(a.id, g);
            g.updateWorldMatrix(true,true);this.buildingLabelHeights.set(a.id,new THREE.Box3().setFromObject(g).max.y+.45);
        }
        const hqAsset=o.target.assets.find(a=>a.kind==='hq'),house=hqAsset&&this.buildings.get(hqAsset.id);
        this.scene.add(this.electronicEffects.group);this.scene.add(this.power.group);this.power.sync(house,o.target.assets.filter(a=>a.kind==='gpu').map(a=>({id:a.id,model:this.buildings.get(a.id)!})),o.target.assets.map(a=>{const p=a.visualPosition??a.position;const odd=(a.orientation??0)%2;let w=a.kind==='hq'?8.1:4,d=a.kind==='hq'?6.8:a.model==='sentinel'?4:3;if(a.kind==='hq'&&!o.pvp){w*=.65;d*=.65;}return {x:p[0],z:p[1],w:odd?d:w,d:odd?w:d};}),o.target.walls??[]);
        const scenery=new THREE.Group();scenery.name='rival-natural-details';for(const item of o.target.publicBase?.scenery??rivalScenery(o.target)){const model=landscapeModel(this.k,item);model.hit.removeFromParent();if(!o.target.publicBase)model.group.scale.setScalar(item.kind==='tree'?.5:.45);model.group.traverse(n=>{n.raycast=()=>{};});scenery.add(model.group);}for(const d of o.target.publicBase?.decorations??[]){const g=decorationModel(this.k,d.kind);g.position.set(d.position[0],0,d.position[1]);g.rotation.y=d.orientation*Math.PI/2;scenery.add(g);}this.scene.add(scenery);this.renderer.domElement.dataset.sceneryCount=String(scenery.children.length);this.renderer.domElement.dataset.deploymentGhost='none';
        // One continuous lawn wash, not a grid of tiny target tiles. Match server bounds exactly.
        const vertices:number[]=[];const rect=(x0:number,z0:number,x1:number,z1:number)=>vertices.push(x0,.12,z0,x1,.12,z0,x1,.12,z1,x0,.12,z0,x1,.12,z1,x0,.12,z1);
        if(o.target.publicBase){const edges=protectedOutline(protectedAreas(o.target)),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(edges,3));const outline=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#aec6d1',transparent:true,opacity:.8,depthWrite:false}));outline.name='protected-deployment-boundary';outline.raycast=()=>{};this.deployment.add(outline);}else if(o.target.compound){const [x,z]=o.target.compound;rect(-hx+.8,-hz+.8,-x,hz-.8);rect(x,-hz+.8,hx-.8,hz-.8);rect(-x,-hz+.8,x,-z);rect(-x,z,x,hz-.8);}else if(o.target.arena==='campus-v2'){rect(-20,-16,-14.2,16);rect(14.2,-16,20,16);rect(-14.2,-16,14.2,-10.4);rect(-14.2,7.4,14.2,16);}else for(let x=-hx;x<hx;x+=.5)for(let z=-hz;z<hz;z+=.5)if(deploymentGround(o.target,[x+.25,z+.25]))rect(x,z,x+.5,z+.5);
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));const zone=new THREE.Mesh(geometry,this.zoneMaterial);zone.name='continuous-deployment-lawn';zone.raycast=()=>{};this.deployment.add(zone);this.scene.add(this.deployment);

        this.agent.scale.setScalar(1.05);
        this.k.box(this.agent, [.6, .1, .3], [0, .7, -.28], C.purple, .04, true);
        this.scene.add(this.agent);
        for (const d of o.target.defenses) {
            const model = securityDroneModel(this.k), scan = new THREE.Mesh(new THREE.RingGeometry(d.radius - .045, d.radius, 48), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false })), alert = new THREE.Mesh(new THREE.ConeGeometry(.15, .45, 4), new THREE.MeshBasicMaterial({ color: C.coral }));
            scan.rotation.x = -Math.PI / 2;
            alert.position.y = 3.6;
            model.scale.setScalar(1.15);
            this.scene.add(model, scan, alert);
            const geometry=new THREE.CylinderGeometry(.11,.11,1,8);
            const laser=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#ffca69',transparent:true,opacity:.95}));laser.frustumCulled=false;this.scene.add(laser);
            const impact=new THREE.Mesh(new THREE.SphereGeometry(.24,8,6),new THREE.MeshBasicMaterial({color:'#c4ebff',transparent:true,opacity:.95})),muzzle=impact.clone();this.scene.add(impact,muzzle);this.drones.set(d.id, { model, scan, alert, laser,impact,muzzle });
        }
        this.beamGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));this.beam=new THREE.Line(this.beamGeometry,new THREE.LineBasicMaterial({color:C.cyan,transparent:true,opacity:.8}));this.beam.frustumCulled=false;this.scene.add(this.beam);
        this.pathLine = new THREE.Line(this.pathGeometry, new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: .6 }));
        this.pathLine.visible=false;this.scene.add(this.pathLine);
        this.hackRing = new THREE.Mesh(new THREE.RingGeometry(.7, .82, 32), new THREE.MeshBasicMaterial({ color: C.purple, side: THREE.DoubleSide, transparent: true, opacity: .75 }));
        this.hackRing.rotation.x = -Math.PI / 2;
        this.scene.add(this.hackRing);
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(host);const controls=host.parentElement?.querySelector('.operation-controls');if(controls)this.observer.observe(controls);
        this.resize();
        this.sync(o, o.lastTick);
    }
    resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
        this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2,Math.sqrt(3_000_000/(w*h))));this.renderer.setSize(w,h);
        const host=this.host.getBoundingClientRect(),parent=this.host.parentElement,header=parent?.querySelector(this.options.replay?'.replay-header':'.operation-header')?.getBoundingClientRect(),controls=parent?.querySelector(this.options.replay?'.replay-controls':'.deploy-control')?.getBoundingClientRect();
        const reserved=this.options.preview?{left:10,right:10,top:12,bottom:12}:{left:Math.max(12,parseFloat(getComputedStyle(parent!).getPropertyValue('--mission-safe-left'))||0),right:Math.max(12,parseFloat(getComputedStyle(parent!).getPropertyValue('--mission-safe-right'))||0),top:header?header.bottom-host.top+16:80,bottom:controls?host.bottom-controls.top+12:24};
        if(!this.options.preview){const limits=hqZoomLimits(matchMedia('(hover: hover) and (pointer: fine)').matches);this.zoomBounds={min:1/limits.max,max:1/limits.min,default:1};if(!this.framed){const b=targetBounds(this.op.target);this.center.set((b.minX+b.maxX)/2,0,(b.minZ+b.maxZ)/2);this.span=1;this.framed=true;}this.camera.clearViewOffset();campusProjection(this.camera,w,h);this.camera.zoom=1/this.span;this.camera.position.copy(this.center).addScaledVector(CAMPUS_CAMERA_OFFSET,3);this.camera.lookAt(this.center);this.camera.near=.1;this.camera.far=500;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();return;}
        const limits=infiltrationZoomLimits(w,h,reserved,targetBounds(this.op.target));this.zoomBounds=this.op.pvp?{min:limits.min,max:1.15,default:.9}:limits;if(!this.framed){this.span=this.zoomBounds.default;this.framed=true;}this.span=THREE.MathUtils.clamp(this.span,this.zoomBounds.min,this.zoomBounds.max);frameInfiltration(this.camera,w,h,reserved,this.center,this.span,targetBounds(this.op.target));this.renderer.domElement.dataset.zoomLimits=JSON.stringify(this.zoomBounds);this.renderer.domElement.dataset.cameraInsets=JSON.stringify(reserved);this.renderer.domElement.dataset.arenaBounds=JSON.stringify(targetBounds(this.op.target));}
    isJammed(id:string){return !this.op.hacked.includes(id)&&(this.op.electronic?.statuses[id]?.disabledUntil??0)>this.visualNow();}
    hackingProgress(id:string){const o=this.op,unit=o.squad?.agents.find(a=>a.id===id);if(unit){const max=troopCombat(o,unit.troop).health;return o.status==='active'&&unit.state==='active'&&unit.health!<max?unit.health!/max:null;}const drone=o.drones.find(d=>d.id===id);if(drone){const max=o.squad?.balanceVersion===4?(o.target.defenses.find(d=>d.id===id)?.maxHealth??tacticalBalance(o).droneHealth):tacticalBalance(o).droneHealth;return o.status==='active'&&drone.health!==undefined&&drone.health>0&&drone.health<max?drone.health/max:null;}if(o.squad&&o.target.walls?.some(w=>w.id===id)){return o.squad.agents.some(a=>a.state==='active'&&a.wallTarget===id&&a.mode==='breaching'&&!a.path.length)?Math.min(1,(o.squad.wallDamage[id]??0)/wallHealth(o,id)):null;}const asset=o.target.assets.find(a=>a.id===id);if(!asset?.hackSeconds)return null;if(o.squad){const workers=o.squad.agents.some(a=>a.state==='active'&&a.mode==='hacking'&&a.target===id);return workers?(o.pvp?Math.max(0,1-(o.squad.progress[id]??0)/(asset.maxHealth??asset.hackSeconds)):Math.min(1,(o.squad.progress[id]??0)/asset.hackSeconds)):null;}return o.agent.mode==='hacking'&&o.agent.target===id?o.agent.hack/asset.hackSeconds:null;}
    setDeploymentActive(active:boolean){this.deploymentActive=active;}
    setDeployment(position:Vec){this.deploymentPosition=[...position];this.deploymentValid=validDeployment(this.op.target,position);return this.deploymentValid;}
    pan(dx:number,dy:number){const scale=(this.camera.right-this.camera.left)/Math.max(1,this.host.clientWidth)/this.camera.zoom;const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1);up.y=0;up.normalize();this.center.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);this.center.y=0;const b=targetBounds(this.op.target);this.center.x=THREE.MathUtils.clamp(this.center.x,b.minX,b.maxX);this.center.z=THREE.MathUtils.clamp(this.center.z,b.minZ,b.maxZ);this.resize();}
    zoom(f: number) { this.span = THREE.MathUtils.clamp(this.span*f,this.zoomBounds.min,this.zoomBounds.max); this.resize(); }
    sync(o: Operation, serverTime: number) { this.op = structuredClone(o); this.server = serverTime; this.anchor = performance.now(); const points = [o.agent.position, ...o.agent.path].map(p => new THREE.Vector3(p[0], .15, p[1])); this.pathGeometry.setFromPoints(points); }
    labelPoint(id:string){const asset=this.op.target.assets.find(a=>a.id===id),wall=this.op.target.walls?.find(w=>w.id===id),position=id==='entry'?this.op.target.entry:asset?.position??(wall?[wall.x,wall.z]:this.op.target.exit),drone=this.drones.get(id==='drone'?(this.op.drones[0]?.id??''):id)?.model;
        const tracked=this.squadModels.get(id)?.model??drone;const point=tracked?tracked.position.clone().add(new THREE.Vector3(0,tracked===drone?.24:this.op.squad?.agents.find(a=>a.id===id)?.troop==='breacher'?3.15:this.op.squad?.agents.find(a=>a.id===id)?.troop==='disruptor'?2.5:1.7,0)):new THREE.Vector3(position[0],asset?(this.buildingLabelHeights.get(id)??3.2):wall?wallVisualHeight(wall.level??1,wall.height??1.3)+.85:.3,position[1]);point.project(this.camera);return{x:(point.x+1)*this.host.clientWidth/2,y:(1-point.y)*this.host.clientHeight/2,z:point.z};}
    groundPosition(x:number,y:number):Vec|undefined{const r=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),this.camera);const p=this.ray.ray.intersectPlane(this.plane,new THREE.Vector3());return p?[p.x,p.z]:undefined;}
    update(dt: number) { if (document.hidden)
        return; this.clock += dt;this.district.update(dt,this.host.clientWidth,this.host.clientHeight,this.reduced); const o = this.op; if(!this.options.replay)advanceOperation(o, this.server + Math.min(1100, performance.now() - this.anchor)); const a = o.agent; this.agent.visible = !o.squad&&o.status !== 'ready';this.deployment.visible=o.status==='ready'||o.status==='active'&&!!o.squad;this.zoneMaterial.opacity=this.deploymentActive?.16:.025;const desired=this.desiredAgent.set(a.position[0],.13,a.position[1]);
        if(!this.displayReady||this.displayAgent.distanceTo(desired)>2||!segmentClear([this.displayAgent.x,this.displayAgent.z],a.position,this.solids,targetBounds(o.target),AGENT_CLEARANCE)){this.displayAgent.copy(desired);this.displayReady=true;}
        else this.displayAgent.lerp(desired,1-Math.exp(-dt*18));
        this.agent.position.copy(this.displayAgent); turnScrapBot(this.agent, a.yaw, dt, this.reduced); animateScrapBot(this.agent, dt, this.reduced, a.mode==='hacking'?.55:0, a.mode === 'idle' ? .015 * Math.sin(this.clock * 2) : 0); this.hackRing.visible = !o.squad&&a.mode === 'hacking';this.beam.visible=false;if(this.beam.visible){const target=o.target.assets.find(v=>v.id===a.target)!;const positions=this.beamGeometry.attributes.position as THREE.BufferAttribute;this.agent.getObjectByName('cipher-muzzle')!.getWorldPosition(this.shotStart);positions.setXYZ(0,this.shotStart.x,this.shotStart.y,this.shotStart.z);positions.setXYZ(1,target.position[0],1.65,target.position[1]);positions.needsUpdate=true;(this.beam.material as THREE.LineBasicMaterial).opacity=this.reduced?.7:.55+Math.sin(this.clock*7)*.2;} if(!o.squad&&o.status==='active'&&a.mode==='hacking'&&a.hack>0){const target=o.target.assets.find(t=>t.id===a.target);if(target&&this.newShot('solo:'+target.id,Math.floor(a.hack/.8))){this.agent.getObjectByName('cipher-muzzle')!.getWorldPosition(this.shotStart);this.shotEnd.set(target.position[0],1.65,target.position[1]);this.cue('pulsewheel-fire');this.bolts.fire('pulsewheel',this.shotStart,this.shotEnd,this.visualNow(),()=>{this.cue('pulsewheel-impact');const model=this.buildings.get(target.id);if(model)this.feedback.hit(model,this.visualNow());});}} this.hackRing.position.set(a.position[0], .13, a.position[1]); this.hackRing.scale.setScalar(this.reduced ? 1 : 1 + Math.sin(this.clock * 5) * .05); if(o.squad)this.updateSquad(dt);for (const d of o.drones) {
        const v = this.drones.get(d.id)!,disabled=d.mode==='disabled';
        v.model.position.set(d.position[0], disabled?.35:o.target.defenses.find(c=>c.id===d.id)?.aerial?DRONE_ALTITUDE:2.6, d.position[1]);v.model.rotation.z=disabled?.28:0;v.scan.visible=!disabled;
        if(!disabled&&o.status!=='extracted')animateSecurityDrone(v.model, this.clock, this.reduced,o.target.defenses.find(c=>c.id===d.id)?.aerial?DRONE_ALTITUDE:2.6);if(d.yaw!==undefined){const delta=Math.atan2(Math.sin(d.yaw-v.model.rotation.y),Math.cos(d.yaw-v.model.rotation.y));v.model.rotation.y+=delta*(this.reduced?1:1-Math.exp(-dt*12));}
        v.scan.position.set(d.position[0], .12, d.position[1]);
        (v.scan.material as THREE.MeshBasicMaterial).color.set(d.mode === 'patrol' ? C.cyan : C.coral);
        v.laser.visible=v.impact.visible=v.muzzle.visible=false;
        if(!disabled&&o.status==='active'&&d.lastShotAt!==undefined&&o.lastTick-d.lastShotAt<350&&this.newShot('drone:'+d.id,d.lastShotAt)){
            v.model.updateWorldMatrix(true,false);v.model.localToWorld(this.shotStart.set(0,-.3,.19));const target=d.shotPosition??o.agent.position;this.shotEnd.set(target[0],.85,target[1]);const victim=d.targetAgentId&&sameShotPosition(d.shotPosition,o.squad?.agents.find(a=>a.id===d.targetAgentId)?.position)?this.squadModels.get(d.targetAgentId)?.model.position:undefined;this.cue('drone-fire');this.bolts.fire('drone',this.shotStart,this.shotEnd,this.visualNow(),()=>this.cue('drone-impact'),victim?()=>victim:undefined,.7);
        }
        const shotAge=d.lastShotAt===undefined?Infinity:this.visualNow()-d.lastShotAt,until=d.lastShotAt===undefined?tacticalBalance(o).droneWarmupMs-(this.visualNow()-(d.acquiredAt??this.visualNow())):tacticalBalance(o).droneIntervalMs-shotAge,preparing=!disabled&&!((o.electronic?.statuses[d.id]?.disabledUntil??0)>this.visualNow())&&o.status==='active'&&d.mode==='attacking'&&until>0&&until<100;v.muzzle.visible=preparing;if(preparing){if(this.newShot('drone-charge:'+d.id,d.lastShotAt??d.acquiredAt??0))this.cue('drone-charge');v.model.updateWorldMatrix(true,false);v.model.localToWorld(v.muzzle.position.set(0,-.3,.19));v.muzzle.scale.setScalar(.25+(1-until/100)*.3);}v.model.rotation.x=disabled?0:this.reduced?0:shotAge<180?-.06*Math.sin(shotAge/180*Math.PI):Math.sin(this.clock*2.3)*.018;v.model.rotation.z=disabled?.28:this.reduced?0:Math.sin(this.clock*1.7+d.position[0])*.025;
        v.alert.visible = d.mode === 'warning' || d.mode === 'pursuit' || d.mode === 'attacking';
        v.alert.position.set(d.position[0],v.model.position.y+.9,d.position[1]);
    } for(const [id,pulse] of this.sentinelPulses){const model=this.buildings.get(id)!,state=o.sentinels?.find(s=>s.id===id),active=o.status==='active'&&!o.hacked.includes(id),jammed=(o.electronic?.statuses[id]?.disabledUntil??0)>this.visualNow(),now=Math.max(o.lastTick,this.server+(this.options.replay?0:Math.min(1100,performance.now()-this.anchor)));const config=o.target.sentinels?.find(t=>t.id===id),nextShot=state?.lastShotAt!==undefined?state.lastShotAt+(config?.intervalMs??1250):(state?.acquiredAt??Infinity)+(config?.warmupMs??450);if(active&&!jammed&&state?.targetId&&nextShot-now>0&&nextShot-now<160&&this.newShot('sentinel-charge:'+id,nextShot))this.cue('sentinel-charge');if(!o.hacked.includes(id))animateSentinel(model,state,now,dt,active&&!jammed,o.target.sentinels?.find(t=>t.id===id)?.damage);pulse.update(model,state,now,active,o.target.walls?.filter(w=>!o.squad?.breachedWalls.includes(w.id)),o.target.sentinels?.find(t=>t.id===id)?.damage,state?.targetId&&sameShotPosition(state.shotPosition,o.squad?.agents.find(a=>a.id===state.targetId)?.position)?this.squadModels.get(state.targetId)?.model.position:undefined);if(active&&state?.lastShotAt!==undefined&&now-state.lastShotAt<340){if(this.newShot('sentinel:'+id,state.lastShotAt))this.cue('sentinel-fire');if(now-state.lastShotAt>=230&&this.newShot('sentinel-impact:'+id,state.lastShotAt))this.cue('sentinel-impact');}}
    for(const [id,status] of Object.entries(o.electronic?.statuses??{}))this.electronicEffects.jam(id,this.buildings.get(id)??this.drones.get(id)?.model,status.disabledUntil>this.visualNow()&&!o.hacked.includes(id),this.visualNow());
    for(const state of o.arcSpires??[]){const model=this.buildings.get(state.id);if(!model)continue;const now=this.visualNow(),active=o.status==='active'&&!o.hacked.includes(state.id)&&!((o.electronic?.statuses[state.id]?.disabledUntil??0)>now);if(!o.hacked.includes(state.id))animateArcSpire(model,state,now,dt,active);if(state.lastShotAt!==undefined&&now-state.lastShotAt<500&&this.newShot('arc:'+state.id,state.lastShotAt)){model.updateWorldMatrix(true,true);(model.getObjectByName('arc-muzzle')??model).getWorldPosition(this.shotStart);for(const hit of state.chain??[]){this.shotEnd.set(hit.position[0],.9,hit.position[1]);this.electronicEffects.fire('arc',this.shotStart,this.shotEnd,now);this.shotStart.copy(this.shotEnd);}this.cue('arc-fire');}}
    this.electronicEffects.update(this.visualNow(),this.reduced);
    for (const [id, g] of this.buildings) {this.power.setActive(id,!o.hacked.includes(id)&&!o.hacked.includes(o.target.assets.find(a=>a.kind==='hq')?.id??''));if(o.hacked.includes(id)){const at=o.events.find(e=>e.type==='hacked'&&e.detail===id)?.at;this.feedback.settle(g);this.hacks.apply(id,g,this.reduced||at===undefined?1200:Math.max(o.lastTick,this.server+(this.options.replay?0:Math.min(1100,performance.now()-this.anchor)))-at,(o.target.assets.find(a=>a.id===id)?.model==='arcSpire'?'arcSpire':o.target.assets.find(a=>a.id===id)?.model==='sentinel'?'sentinel':o.target.assets.find(a=>a.id===id)?.kind) as 'hq'|'gpu'|'lab'|'station');continue;}
        if (o.target.assets.find(a=>a.id===id)?.kind === 'gpu')
            animateGpu(g, this.clock, dt, true, this.reduced);
        if (o.target.assets.find(a=>a.id===id)?.kind === 'lab')
            animateResearchLab(g, this.clock, true, this.reduced);
        if (o.target.assets.find(a=>a.id===id)?.kind === 'hq')
            animateFounderIdle(g, this.clock, this.reduced);
    } for(const e of o.events){if(e.type!=='hacked'&&e.type!=='agent-lost'&&e.type!=='drone-disabled')continue;const key=e.type+':'+e.detail+':'+e.at;if(this.cueEvents.has(key))continue;this.cueEvents.add(key);if(this.visualNow()-e.at<500)this.cue(e.type==='hacked'?'building-shutdown':'unit-destroyed');}this.heavyImpacts.update(this.visualNow(),this.camera,this.reduced);this.feedback.update(this.visualNow());this.bolts.update(this.visualNow(),this.reduced);this.renderer.domElement.dataset.combatBolts=String(this.bolts.active);this.renderer.render(this.scene, this.camera); this.renderer.domElement.dataset.agentPosition=this.agent.position.x+','+this.agent.position.z;this.renderer.domElement.dataset.agentMode=a.mode;this.renderer.domElement.dataset.walkActivity=String(this.agent.userData.walkActivity??0);this.renderer.domElement.dataset.laserActive=String([...this.drones.values()].some(d=>d.laser.visible));this.renderer.domElement.dataset.cameraSpan=String(this.span);this.renderer.domElement.dataset.cameraCenter=this.center.x+','+this.center.z;this.renderer.domElement.dataset.deployment=this.deploymentPosition.join(',');this.renderer.domElement.dataset.drawCalls = String(this.renderer.info.render.calls); this.renderer.domElement.dataset.triangles = String(this.renderer.info.render.triangles); }
    private updateSquad(dt:number){const o=this.op,squad=o.squad!;
        const wallVersion=squad.breachedWalls.join(',');const solidVersion=wallVersion+(o.pvp?'|'+o.hacked.join(','):'');if(solidVersion!==this.solidVersion){this.solidVersion=solidVersion;this.solids=infiltrationSolids(squadTarget(o));}if(wallVersion!==this.wallVersion){this.wallVersion=wallVersion;this.walls?.group.removeFromParent();this.walls?.dispose();this.walls=new SecurityWalls(squadTarget(o).walls??[]);this.scene.add(this.walls.group);this.solids=infiltrationSolids(squadTarget(o));}
        for(const id of squad.breachedWalls){const wall=o.target.walls?.find(w=>w.id===id);if(!wall)continue;let model=this.brokenWalls.get(id);if(!model){model=new THREE.Group();model.position.set(wall.x,0,wall.z);this.brokenWalls.set(id,model);this.scene.add(model);}const at=o.events.find(e=>e.type==='breached'&&e.detail===id)?.at;this.hacks.apply('wall:'+id,model,this.reduced||at===undefined?1200:Math.max(o.lastTick,this.server+(this.options.replay?0:Math.min(1100,performance.now()-this.anchor)))-at,'wall');}
        for(const a of squad.agents){const heavy=a.troop==='breacher',support=a.troop==='disruptor';let v=this.squadModels.get(a.id);if(!v){const model=support?disruptorModel(this.k,a.troopLevel??1):heavy?breacherModel(this.k,a.troopLevel??1):scrapBotModel(this.k,a.troopLevel??1);model.scale.setScalar(1.05);const ring=new THREE.Mesh(new THREE.RingGeometry(heavy?.82:.62,heavy?.9:.7,20),new THREE.MeshBasicMaterial({color:C.purple,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;const muzzle=model.getObjectByName('cipher-muzzle')!;v={model,ring,muzzle,display:new THREE.Vector3(),initialized:false,spawnedAt:this.clock};this.squadModels.set(a.id,v);this.scene.add(model,ring);}
         if(a.state==='lost'&&v.model.userData.defeatedAt===undefined)v.model.userData.defeatedAt=o.events.find(e=>e.type==='agent-lost'&&e.detail===a.id)?.at??this.visualNow();v.model.visible=((heavy||support)&&a.state==='lost'&&this.visualNow()-v.model.userData.defeatedAt<1200)||a.state==='active'||!!squad.rules&&o.status==='extracted'&&a.state==='extracted';const desired=this.desiredAgent.set(a.position[0],.13,a.position[1]);if(!v.initialized||v.display.distanceTo(desired)>2||!segmentClear([v.display.x,v.display.z],a.position,this.solids,targetBounds(o.target),AGENT_CLEARANCE)){v.display.copy(desired);v.initialized=true;}else v.display.lerp(desired,1-Math.exp(-dt*18));v.model.position.copy(v.display);(support?turnDisruptor:heavy?turnBreacher:turnScrapBot)(v.model,a.yaw,dt,this.reduced);
         const hacking=a.state==='active'&&a.mode==='hacking',attacking=a.state==='active'&&a.mode==='attacking',breaching=a.state==='active'&&a.mode==='breaching'&&!a.path.length;
         const now=this.visualNow(),target=o.target.assets.find(t=>t.id===a.target),phase=(a.work??0)% .8;
         // Continuous mission hacking has no discrete damage event: pulses visualize advancing work.
         const workPulse=!support&&!heavy&&hacking&&!o.pvp&&!o.squad?.behaviorVersion?Math.floor((a.work??0)/.8):-1;
         const discreteShot=(heavy||o.status==='active'&&a.state==='active')&&a.lastShotAt!==undefined&&now>=a.lastShotAt&&now-a.lastShotAt<350&&this.newShot('bot:'+a.id,a.lastShotAt),shot=discreteShot||(o.status==='active'&&a.state==='active'&&workPulse>0&&this.newShot('work:'+a.id+':'+a.target,workPulse));
         if(shot){const hitAsset=discreteShot?shotAsset(o.target.assets,a.shotPosition):target;v.model.updateWorldMatrix(true,true);v.muzzle.getWorldPosition(this.shotStart);if(hitAsset){const halfX=hitAsset.size[0]/2,halfZ=hitAsset.size[1]/2;this.shotEnd.set(THREE.MathUtils.clamp(v.display.x,hitAsset.position[0]-halfX,hitAsset.position[0]+halfX),1.4,THREE.MathUtils.clamp(v.display.z,hitAsset.position[1]-halfZ,hitAsset.position[1]+halfZ));}else if(a.shotPosition)this.shotEnd.set(a.shotPosition[0],o.target.defenses.find(c=>c.id===a.droneTarget)?.aerial?DRONE_ALTITUDE:2.6,a.shotPosition[1]);else this.shotEnd.copy(this.shotStart);const victim=discreteShot&&a.droneTarget&&sameShotPosition(a.shotPosition,o.drones.find(d=>d.id===a.droneTarget)?.position)?this.drones.get(a.droneTarget)?.model.position:undefined;v.model.userData.pulsewheelShotAt=now;if(heavy){this.cue('breacher-impact');if(a.shotPosition){this.shotEnd.set(a.shotPosition[0],1.1,a.shotPosition[1]);if(hitAsset){this.shotEnd.set(THREE.MathUtils.clamp(v.display.x,hitAsset.position[0]-hitAsset.size[0]/2,hitAsset.position[0]+hitAsset.size[0]/2),1.1,THREE.MathUtils.clamp(v.display.z,hitAsset.position[1]-hitAsset.size[1]/2,hitAsset.position[1]+hitAsset.size[1]/2));}}if(hitAsset){const model=this.buildings.get(hitAsset.id);if(model)this.feedback.hit(model,now);}}else if(support){this.cue('disruptor-fire');this.electronicEffects.fire('emp',this.shotStart,this.shotEnd,now);if(hitAsset){const model=this.buildings.get(hitAsset.id);if(model)this.feedback.hit(model,now);}}else{this.cue('pulsewheel-fire');this.bolts.fire('pulsewheel',this.shotStart,this.shotEnd,now,()=>{this.cue('pulsewheel-impact');if(hitAsset){const model=this.buildings.get(hitAsset.id);if(model)this.feedback.hit(model,this.visualNow());}},victim?()=>victim:undefined);}}
         const health=a.health??100,previous=this.lastHealth.get(a.id);if(previous!==undefined&&health<previous){this.hitUntil.set(a.id,now+180);if(health<=0){this.shotStart.copy(v.display);this.shotStart.y+=.6;if(heavy)this.heavyImpacts.fire(this.shotStart,now);else this.bolts.fire('pulsewheel',this.shotStart,this.shotStart,now);}}this.lastHealth.set(a.id,health);
         v.model.userData.pulsewheelHit=Math.max(0,((this.hitUntil.get(a.id)??0)-now)/180);const interval=tacticalBalance(o).botIntervalMs,until=a.lastShotAt===undefined?Infinity:interval-(now-a.lastShotAt);v.model.userData.pulsewheelCharge=(o.pvp||attacking)?((hacking||attacking)&&until>0&&until<150?1-until/150:0):hacking?Math.max(0,(phase-.62)/.18):0;if(!support&&!heavy&&v.model.userData.pulsewheelCharge>.05&&this.newShot('bot-charge:'+a.id+':'+a.target,(o.pvp||attacking)?a.lastShotAt??0:Math.floor((a.work??0)/.8)))this.cue('pulsewheel-charge');v.model.userData.pulsewheelShotAge=now-(v.model.userData.pulsewheelShotAt??-Infinity);v.model.userData.pulsewheelFiring=v.model.userData.pulsewheelShotAge<85;
         if(heavy){v.model.userData.breacherLowStrike=breaching||now-(a.lastShotAt??-Infinity)<500&&!!a.shotPosition&&!!o.target.walls?.some(w=>w.x===a.shotPosition![0]&&w.z===a.shotPosition![1]);const due=Math.max(a.attackReadyAt??-Infinity,(a.lastShotAt??-Infinity)+breacherBalance(o).intervalMs),remain=due-now;v.model.userData.breacherCharge=a.state==='active'&&!a.path.length&&(hacking||breaching)&&remain>0&&remain<=300?1-remain/300:0;v.model.userData.breacherShotAge=now-(a.lastShotAt??-Infinity);v.model.userData.breacherDeath=a.state==='lost'?Math.min(1,(now-v.model.userData.defeatedAt)/900):0;v.model.userData.breacherSpawn=Math.min(1,(this.clock-v.spawnedAt)/.45);if(v.model.userData.breacherCharge>.05&&this.newShot('heavy-charge:'+a.id,due))this.cue('breacher-charge');animateBreacher(v.model,dt,this.reduced);if(shot){v.model.updateWorldMatrix(true,true);v.muzzle.getWorldPosition(this.shotStart);this.shotEnd.y=v.model.userData.breacherLowStrike?Math.min(1.15,this.shotStart.y):Math.max(.35,Math.min(2.5,this.shotStart.y));this.heavyImpacts.fire(this.shotEnd,now);}if(a.state==='active'&&v.model.userData.walkActivity>.2&&this.newShot('heavy-step:'+a.id,v.model.userData.breacherFootstep??0))this.cue('breacher-step');}else if(support){v.model.userData.disruptorDeath=a.state==='lost'?Math.min(1,(now-v.model.userData.defeatedAt)/900):0;v.model.userData.disruptorSpawn=Math.min(1,(this.clock-v.spawnedAt)/.4);v.model.userData.disruptorCharge=a.empChargeAt!==undefined?Math.min(1,Math.max(0,(now-a.empChargeAt)/150)):v.model.userData.pulsewheelCharge;if(a.empPendingPosition){turnDisruptor(v.model,Math.atan2(a.empPendingPosition[0]-a.position[0],a.empPendingPosition[1]-a.position[1]),dt,this.reduced);if(this.newShot('emp-charge:'+a.id,a.empChargeAt!))this.cue('disruptor-charge');}v.model.userData.disruptorShotAge=now-Math.max(a.lastEmpAt??-Infinity,a.lastShotAt??-Infinity);v.model.userData.disruptorHit=v.model.userData.pulsewheelHit;animateDisruptor(v.model,dt,this.reduced);if(a.lastEmpAt!==undefined&&now-a.lastEmpAt<500&&this.newShot('emp:'+a.id,a.lastEmpAt)&&a.empPosition){v.model.updateWorldMatrix(true,true);v.muzzle.getWorldPosition(this.shotStart);this.shotEnd.set(a.empPosition[0],a.empTargetId&&this.drones.has(a.empTargetId)?DRONE_ALTITUDE:2.5,a.empPosition[1]);this.electronicEffects.fire('emp',this.shotStart,this.shotEnd,now);this.cue('disruptor-fire');}}else animateScrapBot(v.model,dt,this.reduced,attacking?.4:hacking?.75:breaching?.55:0);
         const age=this.clock-v.spawnedAt,spawning=age<.65&&a.state==='active';v.ring.visible=hacking||spawning;v.ring.scale.setScalar(spawning?.6+age*2:1);(v.ring.material as THREE.MeshBasicMaterial).color.set(spawning?C.cyan:C.purple);(v.ring.material as THREE.MeshBasicMaterial).opacity=spawning?.8*(1-age/.65):.55;v.ring.position.set(v.display.x,.16,v.display.z);
        }
        this.renderer.domElement.dataset.cipherShots=String(squad.agents.filter(a=>a.lastShotAt!==undefined&&o.lastTick-a.lastShotAt<200).length);this.renderer.domElement.dataset.disabledDrones=String(o.drones.filter(d=>d.mode==='disabled').length);this.renderer.domElement.dataset.droneModes=o.drones.map(d=>d.mode).join(',');this.renderer.domElement.dataset.hackingAgents=String(squad.agents.filter(a=>a.mode==='hacking').length);this.renderer.domElement.dataset.agents=String(squad.agents.filter(a=>a.state==='active').length);this.renderer.domElement.dataset.breached=String(squad.breachedWalls.length);
    }
    private visualNow(){return Math.max(this.op.lastTick,this.server+(this.options.replay?0:Math.min(1100,performance.now()-this.anchor)));}
    private newShot(id:string,at:number){if((this.shotKeys.get(id)??-Infinity)>=at)return false;this.shotKeys.set(id,at);return true;}
    private cue(cue:CombatCue){if(!this.options.preview&&!this.options.replay)this.options.onCombatCue?.(cue);}
    dispose() {this.electronicEffects.dispose();this.heavyImpacts.dispose();this.feedback.dispose();this.bolts.dispose();for(const pulse of this.sentinelPulses.values())pulse.dispose();this.hacks.dispose();this.power.dispose();for(const v of this.squadModels.values()){v.ring.geometry.dispose();(v.ring.material as THREE.Material).dispose();v.ring.removeFromParent();} this.deployment.traverse(n=>{if(n instanceof THREE.Line){n.geometry.dispose();(n.material as THREE.Material).dispose();}if(n instanceof THREE.InstancedMesh)n.dispose();if(n instanceof THREE.Mesh&&n.name==='continuous-deployment-lawn'){n.geometry.dispose();(n.material as THREE.Material).dispose();}});this.walls?.dispose();this.observer.disconnect(); this.scene.traverse(o => { if (o instanceof THREE.DirectionalLight)
        o.shadow.dispose(); }); for (const v of this.drones.values()) {
        v.impact.geometry.dispose();(v.impact.material as THREE.Material).dispose();v.laser.geometry.dispose();(v.laser.material as THREE.Material).dispose();
        v.scan.geometry.dispose();
        (v.scan.material as THREE.Material).dispose();
        v.alert.geometry.dispose();
        (v.alert.material as THREE.Material).dispose();
    } this.beamGeometry.dispose();(this.beam.material as THREE.Material).dispose();this.pathGeometry.dispose(); (this.pathLine.material as THREE.Material).dispose(); this.hackRing.geometry.dispose(); (this.hackRing.material as THREE.Material).dispose(); this.scene.traverse(o => { if (o instanceof THREE.Mesh && o.geometry.type === 'RingGeometry' && o !== this.hackRing) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
    } }); this.lawn.dispose();this.district.dispose(); this.k.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
}
