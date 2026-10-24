import {sentinelModel,animateSentinel,SentinelPulse} from './SentinelTower';
import {HackEffects} from './HackEffects';
import {protectedAreas,protectedOutline} from '../../shared/deployment-boundary';
import {PowerConnections} from './PowerConnections';
import {decorationModel} from './Decorations';
import {rivalScenery} from '../../shared/rival-scenery';
import {landscapeModel} from './LandscapeObstacles';
import {tacticalBalance,TACTICAL_BALANCE} from '../../shared/tactical-infiltration';
import {squadTarget,SQUAD_BALANCE,type SquadAgent} from '../../shared/squad-infiltration';
import {droneStationModel} from './DroneStation';
import {lightCampus} from './CampusFinish';
import {CampusLawn} from './CampusLawn';
import {segmentClear} from '../../shared/navigation';
import {AGENT_CLEARANCE,targetBounds,infiltrationSolids,deploymentGround,validDeployment} from '../../shared/infiltration';
import {SecurityWalls} from './SecurityWalls';
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
    private squadModels=new Map<string,{model:THREE.Group;beam:THREE.Line;ring:THREE.Mesh;shot:THREE.Mesh;muzzle:THREE.Object3D;display:THREE.Vector3;initialized:boolean;spawnedAt:number}>();private wallVersion='';
    private agent = scrapBotModel(this.k);
    private drones = new Map<string, {
        model: THREE.Group;
        scan: THREE.Mesh;
        alert: THREE.Mesh;
        laser:THREE.Mesh;impact:THREE.Mesh;muzzle:THREE.Mesh;
    }>();
    private power=new PowerConnections();private hacks=new HackEffects();
    private sentinelPulses=new Map<string,SentinelPulse>();
    private buildings = new Map<string, THREE.Group>();
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
    constructor(private host: HTMLElement, o: Operation,private options:{preview?:boolean}={}) {
        this.op = structuredClone(o);this.solids=infiltrationSolids(o.target);this.deploymentPosition=[...o.target.entry];this.district=new InfiltrationDistrict(o.target.id==='vector-works',o.target.arena==='campus-v2',targetBounds(o.target));this.span=o.target.arena==='campus-v2'?.82:1;
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        const sun=lightWorld(this.renderer,this.scene);lightCampus(this.renderer,this.scene,sun);this.scene.background=new THREE.Color('#b5eafa');this.scene.fog=null;
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        this.renderer.domElement.setAttribute('aria-label', 'Rival company campus');
        this.host.append(this.renderer.domElement);
        this.scene.add(this.district.group);if(o.target.walls){this.walls=new SecurityWalls(o.target.walls);this.scene.add(this.walls.group);}
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
            else if(a.model==='station')g=builderStationModel(this.k);
            else if(a.model==='fabricator')g=fabricatorModel(this.k);
            else if(a.model==='hangar')g=hangarModel(this.k,0,o.target.publicBase?.buildings.find(b=>b.id===a.id)?.size==='compound'?'compound':o.target.publicBase?.buildings.find(b=>b.id===a.id)?.size==='expanded');
            else if(a.model==='sentinel'){g=sentinelModel(this.k);const pulse=new SentinelPulse();this.sentinelPulses.set(a.id,pulse);this.scene.add(pulse.group);}
            else if(a.kind==='station')g=droneStationModel(this.k);
            else if (a.kind === 'lab')
                g = researchLabModel(this.k);
            else {
                g = new THREE.Group();
                this.k.box(g, [1.5, .2, 1.3], [0, .1, 0], C.cream);
                this.k.box(g, [.9, 1.5, .65], [0, .9, 0], C.dark);
                this.k.box(g, [.7, .65, .05], [0, 1.2, .36], C.purple, .03, true);
            }
            const pivot=a.visualPosition??a.position;g.position.set(pivot[0],0,pivot[1]);g.rotation.y=(a.orientation??0)*Math.PI/2;
            g.userData.assetId = a.id;
            this.scene.add(g);
            this.buildings.set(a.id, g);
        }
        const hqAsset=o.target.assets.find(a=>a.kind==='hq'),house=hqAsset&&this.buildings.get(hqAsset.id);
        this.scene.add(this.power.group);this.power.sync(house,o.target.assets.filter(a=>a.kind==='gpu').map(a=>({id:a.id,model:this.buildings.get(a.id)!})),o.target.assets.map(a=>{const p=a.visualPosition??a.position;const odd=(a.orientation??0)%2;let w=a.kind==='hq'?8.1:4,d=a.kind==='hq'?6.8:a.model==='sentinel'?4:3;if(a.kind==='hq'&&!o.pvp){w*=.65;d*=.65;}return {x:p[0],z:p[1],w:odd?d:w,d:odd?w:d};}),o.target.walls??[]);
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
            const impact=new THREE.Mesh(new THREE.SphereGeometry(.24,8,6),new THREE.MeshBasicMaterial({color:'#fff0bd',transparent:true,opacity:.95})),muzzle=impact.clone();this.scene.add(impact,muzzle);this.drones.set(d.id, { model, scan, alert, laser,impact,muzzle });
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
        const host=this.host.getBoundingClientRect(),parent=this.host.parentElement,header=parent?.querySelector('.operation-header')?.getBoundingClientRect(),controls=parent?.querySelector('.deploy-control')?.getBoundingClientRect();
        const reserved=this.options.preview?{left:10,right:10,top:12,bottom:12}:{left:Math.max(12,parseFloat(getComputedStyle(parent!).getPropertyValue('--mission-safe-left'))||0),right:Math.max(12,parseFloat(getComputedStyle(parent!).getPropertyValue('--mission-safe-right'))||0),top:header?header.bottom-host.top+16:80,bottom:controls?host.bottom-controls.top+12:24};
        const limits=infiltrationZoomLimits(w,h,reserved,targetBounds(this.op.target));this.zoomBounds=this.op.pvp?{min:limits.min,max:1.15,default:.9}:limits;if(!this.framed){this.span=this.zoomBounds.default;this.framed=true;}this.span=THREE.MathUtils.clamp(this.span,this.zoomBounds.min,this.zoomBounds.max);frameInfiltration(this.camera,w,h,reserved,this.center,this.span,targetBounds(this.op.target));this.renderer.domElement.dataset.zoomLimits=JSON.stringify(this.zoomBounds);this.renderer.domElement.dataset.cameraInsets=JSON.stringify(reserved);this.renderer.domElement.dataset.arenaBounds=JSON.stringify(targetBounds(this.op.target));}
    hackingProgress(id:string){const o=this.op,unit=o.squad?.agents.find(a=>a.id===id);if(unit)return o.status==='active'&&unit.state==='active'&&unit.health!<TACTICAL_BALANCE.botHealth?unit.health!/TACTICAL_BALANCE.botHealth:null;const drone=o.drones.find(d=>d.id===id);if(drone)return o.status==='active'&&drone.health!==undefined&&drone.health>0&&drone.health<tacticalBalance(o).droneHealth?drone.health/tacticalBalance(o).droneHealth:null;if(o.squad&&o.target.walls?.some(w=>w.id===id)){return o.squad.agents.some(a=>a.state==='active'&&a.wallTarget===id&&a.mode==='breaching'&&!a.path.length)?Math.min(1,(o.squad.wallDamage[id]??0)/SQUAD_BALANCE.wallHealth):null;}const asset=o.target.assets.find(a=>a.id===id);if(!asset?.hackSeconds)return null;if(o.squad){const workers=o.squad.agents.some(a=>a.state==='active'&&a.mode==='hacking'&&a.target===id);return workers?(o.pvp?Math.max(0,1-(o.squad.progress[id]??0)/(asset.maxHealth??asset.hackSeconds)):Math.min(1,(o.squad.progress[id]??0)/asset.hackSeconds)):null;}return o.agent.mode==='hacking'&&o.agent.target===id?o.agent.hack/asset.hackSeconds:null;}
    setDeploymentActive(active:boolean){this.deploymentActive=active;}
    setDeployment(position:Vec){this.deploymentPosition=[...position];this.deploymentValid=validDeployment(this.op.target,position);return this.deploymentValid;}
    pan(dx:number,dy:number){const scale=(this.camera.right-this.camera.left)/Math.max(1,this.host.clientWidth);const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1);up.y=0;up.normalize();this.center.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);this.center.y=0;const b=targetBounds(this.op.target);this.center.x=THREE.MathUtils.clamp(this.center.x,this.op.pvp?b.minX:-15,this.op.pvp?b.maxX:15);this.center.z=THREE.MathUtils.clamp(this.center.z,this.op.pvp?b.minZ:-11,this.op.pvp?b.maxZ:11);this.resize();}
    zoom(f: number) { this.span = THREE.MathUtils.clamp(this.span*f,this.zoomBounds.min,this.zoomBounds.max); this.resize(); }
    sync(o: Operation, serverTime: number) { this.op = structuredClone(o); this.server = serverTime; this.anchor = performance.now(); const points = [o.agent.position, ...o.agent.path].map(p => new THREE.Vector3(p[0], .15, p[1])); this.pathGeometry.setFromPoints(points); }
    labelPoint(id:string){const asset=this.op.target.assets.find(a=>a.id===id),wall=this.op.target.walls?.find(w=>w.id===id),position=id==='entry'?this.op.target.entry:asset?.position??(wall?[wall.x,wall.z]:this.op.target.exit),drone=this.drones.get(id==='drone'?(this.op.drones[0]?.id??''):id)?.model;
        const tracked=this.squadModels.get(id)?.model??drone;const point=tracked?tracked.position.clone().add(new THREE.Vector3(0,tracked===drone?.24:1.7,0)):new THREE.Vector3(position[0],asset?3.2:wall?(wall.height??1.3)+.6:.3,position[1]);point.project(this.camera);return{x:(point.x+1)*this.host.clientWidth/2,y:(1-point.y)*this.host.clientHeight/2,z:point.z};}
    groundPosition(x:number,y:number):Vec|undefined{const r=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),this.camera);const p=this.ray.ray.intersectPlane(this.plane,new THREE.Vector3());return p?[p.x,p.z]:undefined;}
    update(dt: number) { if (document.hidden)
        return; this.clock += dt;this.district.update(dt,this.host.clientWidth,this.host.clientHeight,this.reduced); const o = this.op; advanceOperation(o, this.server + Math.min(1100, performance.now() - this.anchor)); const a = o.agent; this.agent.visible = !o.squad&&o.status !== 'ready';this.deployment.visible=o.status==='ready'||o.status==='active'&&!!o.squad;this.zoneMaterial.opacity=this.deploymentActive?.16:.025;const desired=this.desiredAgent.set(a.position[0],.13,a.position[1]);
        if(!this.displayReady||this.displayAgent.distanceTo(desired)>2||!segmentClear([this.displayAgent.x,this.displayAgent.z],a.position,this.solids,targetBounds(o.target),AGENT_CLEARANCE)){this.displayAgent.copy(desired);this.displayReady=true;}
        else this.displayAgent.lerp(desired,1-Math.exp(-dt*18));
        this.agent.position.copy(this.displayAgent); turnScrapBot(this.agent, a.yaw, dt, this.reduced); animateScrapBot(this.agent, dt, this.reduced, a.mode==='hacking'?.55:0, a.mode === 'idle' ? .015 * Math.sin(this.clock * 2) : 0); this.hackRing.visible = !o.squad&&a.mode === 'hacking';this.beam.visible=!o.squad&&a.mode==='hacking';if(this.beam.visible){const target=o.target.assets.find(v=>v.id===a.target)!;const positions=this.beamGeometry.attributes.position as THREE.BufferAttribute;positions.setXYZ(0,this.agent.position.x,1.0,this.agent.position.z);positions.setXYZ(1,target.position[0],1.65,target.position[1]);positions.needsUpdate=true;(this.beam.material as THREE.LineBasicMaterial).opacity=this.reduced?.7:.55+Math.sin(this.clock*7)*.2;} this.hackRing.position.set(a.position[0], .13, a.position[1]); this.hackRing.scale.setScalar(this.reduced ? 1 : 1 + Math.sin(this.clock * 5) * .05); if(o.squad)this.updateSquad(dt);for (const d of o.drones) {
        const v = this.drones.get(d.id)!,disabled=d.mode==='disabled';
        v.model.position.set(d.position[0], disabled?.35:2.6, d.position[1]);v.model.rotation.z=disabled?.28:0;v.scan.visible=!disabled;
        if(!disabled&&o.status!=='extracted')animateSecurityDrone(v.model, this.clock, this.reduced);if(d.yaw!==undefined){const delta=Math.atan2(Math.sin(d.yaw-v.model.rotation.y),Math.cos(d.yaw-v.model.rotation.y));v.model.rotation.y+=delta*(this.reduced?1:1-Math.exp(-dt*12));}
        v.scan.position.set(d.position[0], .12, d.position[1]);
        (v.scan.material as THREE.MeshBasicMaterial).color.set(d.mode === 'patrol' ? C.cyan : C.coral);
        v.laser.visible=!disabled&&o.status==='active'&&d.lastShotAt!==undefined&&o.lastTick-d.lastShotAt<350;
        v.impact.visible=v.muzzle.visible=v.laser.visible;if(v.laser.visible){const target=o.squad?(d.shotPosition??o.agent.position):[this.agent.position.x,this.agent.position.z];v.impact.position.set(target[0],.85,target[1]);v.muzzle.position.copy(v.model.position);v.muzzle.position.y-=.25;this.laserDirection.set(target[0]-v.model.position.x,.85-(v.model.position.y-.25),target[1]-v.model.position.z);v.laser.scale.y=this.laserDirection.length();v.laser.quaternion.setFromUnitVectors(this.up,this.laserDirection.normalize());v.laser.position.set((v.model.position.x+(o.squad?d.shotPosition?.[0]??o.agent.position[0]:this.agent.position.x))/2,(v.model.position.y+.6)/2,(v.model.position.z+(o.squad?d.shotPosition?.[1]??o.agent.position[1]:this.agent.position.z))/2);}
        v.alert.visible = d.mode === 'warning' || d.mode === 'pursuit' || d.mode === 'attacking';
        v.alert.position.set(d.position[0], 3.5, d.position[1]);
    } for(const [id,pulse] of this.sentinelPulses){const model=this.buildings.get(id)!,state=o.sentinels?.find(s=>s.id===id),active=o.status==='active'&&!o.hacked.includes(id),now=Math.max(o.lastTick,this.server+Math.min(1100,performance.now()-this.anchor));animateSentinel(model,state,now,dt,active);pulse.update(model,state,now,active);}
    for (const [id, g] of this.buildings) {this.power.setActive(id,!o.hacked.includes(id)&&!o.hacked.includes(o.target.assets.find(a=>a.kind==='hq')?.id??''));if(o.hacked.includes(id)){const at=o.events.find(e=>e.type==='hacked'&&e.detail===id)?.at;this.hacks.apply(id,g,this.reduced||at===undefined?1000:Math.max(o.lastTick,this.server+Math.min(1100,performance.now()-this.anchor))-at);continue;}
        if (o.target.assets.find(a=>a.id===id)?.kind === 'gpu')
            animateGpu(g, this.clock, dt, true, this.reduced);
        if (id === 'lab')
            animateResearchLab(g, this.clock, true, this.reduced);
        if (id === 'hq')
            animateFounderIdle(g, this.clock, this.reduced);
    } this.renderer.render(this.scene, this.camera); this.renderer.domElement.dataset.agentPosition=this.agent.position.x+','+this.agent.position.z;this.renderer.domElement.dataset.agentMode=a.mode;this.renderer.domElement.dataset.walkActivity=String(this.agent.userData.walkActivity??0);this.renderer.domElement.dataset.laserActive=String([...this.drones.values()].some(d=>d.laser.visible));this.renderer.domElement.dataset.cameraSpan=String(this.span);this.renderer.domElement.dataset.cameraCenter=this.center.x+','+this.center.z;this.renderer.domElement.dataset.deployment=this.deploymentPosition.join(',');this.renderer.domElement.dataset.drawCalls = String(this.renderer.info.render.calls); this.renderer.domElement.dataset.triangles = String(this.renderer.info.render.triangles); }
    private updateSquad(dt:number){const o=this.op,squad=o.squad!;
        const wallVersion=squad.breachedWalls.join(',')+(o.pvp?'|'+o.hacked.join(','):'');if(wallVersion!==this.wallVersion){this.wallVersion=wallVersion;this.walls?.group.removeFromParent();this.walls?.dispose();this.walls=new SecurityWalls(squadTarget(o).walls??[]);this.scene.add(this.walls.group);this.solids=infiltrationSolids(squadTarget(o));}
        for(const a of squad.agents){let v=this.squadModels.get(a.id);if(!v){const model=scrapBotModel(this.k);model.scale.setScalar(1.05);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));const beam=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:C.cyan,transparent:true,opacity:.75}));beam.frustumCulled=false;const ring=new THREE.Mesh(new THREE.RingGeometry(.62,.7,20),new THREE.MeshBasicMaterial({color:C.purple,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;const shot=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1,6),new THREE.MeshBasicMaterial({color:'#53fff2',transparent:true,opacity:.95}));shot.frustumCulled=false;const muzzle=model.getObjectByName('cipher-muzzle')!;v={model,beam,ring,shot,muzzle,display:new THREE.Vector3(),initialized:false,spawnedAt:this.clock};this.squadModels.set(a.id,v);this.scene.add(model,beam,ring,shot);}
         v.model.visible=a.state==='active'||!!squad.rules&&o.status==='extracted'&&a.state==='extracted';const desired=this.desiredAgent.set(a.position[0],.13,a.position[1]);if(!v.initialized||v.display.distanceTo(desired)>2||!segmentClear([v.display.x,v.display.z],a.position,this.solids,targetBounds(o.target),AGENT_CLEARANCE)){v.display.copy(desired);v.initialized=true;}else v.display.lerp(desired,1-Math.exp(-dt*18));v.model.position.copy(v.display);turnScrapBot(v.model,a.yaw,dt,this.reduced);
         const hacking=a.state==='active'&&a.mode==='hacking',attacking=a.state==='active'&&a.mode==='attacking',breaching=a.state==='active'&&a.mode==='breaching'&&!a.path.length;v.model.userData.cipherAiming=attacking||!!o.pvp&&hacking;animateScrapBot(v.model,dt,this.reduced,attacking?.4:hacking?.75+(this.reduced?0:Math.sin(this.clock*9)*.07):breaching?.55+Math.sin(this.clock*11)*.4:0);
         v.shot.visible=o.status==='active'&&a.state==='active'&&a.lastShotAt!==undefined&&o.lastTick-a.lastShotAt<200;if(v.shot.visible&&a.shotPosition){v.muzzle.getWorldPosition(this.shotStart);this.shotEnd.set(a.shotPosition[0],2.6,a.shotPosition[1]);this.laserDirection.subVectors(this.shotEnd,this.shotStart);v.shot.scale.y=this.laserDirection.length();v.shot.quaternion.setFromUnitVectors(this.up,this.laserDirection.normalize());v.shot.position.copy(this.shotStart).add(this.shotEnd).multiplyScalar(.5);}
         const age=this.clock-v.spawnedAt,spawning=age<.65&&a.state==='active';v.ring.visible=hacking||spawning;v.ring.scale.setScalar(spawning?.6+age*2:1);(v.ring.material as THREE.MeshBasicMaterial).color.set(spawning?C.cyan:C.purple);(v.ring.material as THREE.MeshBasicMaterial).opacity=spawning?.8*(1-age/.65):.55;v.ring.position.set(v.display.x,.16,v.display.z);v.beam.visible=hacking&&!o.pvp;const target=o.target.assets.find(t=>t.id===a.target);if(hacking&&target){const positions=v.beam.geometry.attributes.position as THREE.BufferAttribute;positions.setXYZ(0,v.display.x,1.05,v.display.z);positions.setXYZ(1,target.position[0],1.4,target.position[1]);positions.needsUpdate=true;}
        }
        this.renderer.domElement.dataset.cipherShots=String(squad.agents.filter(a=>a.lastShotAt!==undefined&&o.lastTick-a.lastShotAt<200).length);this.renderer.domElement.dataset.disabledDrones=String(o.drones.filter(d=>d.mode==='disabled').length);this.renderer.domElement.dataset.droneModes=o.drones.map(d=>d.mode).join(',');this.renderer.domElement.dataset.hackingAgents=String(squad.agents.filter(a=>a.mode==='hacking').length);this.renderer.domElement.dataset.agents=String(squad.agents.filter(a=>a.state==='active').length);this.renderer.domElement.dataset.breached=String(squad.breachedWalls.length);
    }
    dispose() {for(const pulse of this.sentinelPulses.values())pulse.dispose();this.hacks.dispose();this.power.dispose();for(const v of this.squadModels.values()){v.shot.geometry.dispose();(v.shot.material as THREE.Material).dispose();v.beam.geometry.dispose();(v.beam.material as THREE.Material).dispose();v.ring.geometry.dispose();(v.ring.material as THREE.Material).dispose();v.ring.removeFromParent();} this.deployment.traverse(n=>{if(n instanceof THREE.Line){n.geometry.dispose();(n.material as THREE.Material).dispose();}if(n instanceof THREE.InstancedMesh)n.dispose();if(n instanceof THREE.Mesh&&n.name==='continuous-deployment-lawn'){n.geometry.dispose();(n.material as THREE.Material).dispose();}});this.walls?.dispose();this.observer.disconnect(); this.scene.traverse(o => { if (o instanceof THREE.DirectionalLight)
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
