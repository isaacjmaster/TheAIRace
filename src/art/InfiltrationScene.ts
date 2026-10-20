import {squadTarget,SQUAD_BALANCE,type SquadAgent} from '../../shared/squad-infiltration';
import {droneStationModel} from './DroneStation';
import {lightCampus} from './CampusFinish';
import {CampusLawn} from './CampusLawn';
import {segmentClear} from '../../shared/navigation';
import {AGENT_CLEARANCE,INFILTRATION_BOUNDS,infiltrationSolids,deploymentGround,validDeployment} from '../../shared/infiltration';
import {SecurityWalls} from './SecurityWalls';
import * as THREE from 'three';
import { WorldKit, lightWorld, palette as C } from './world';
import {InfiltrationDistrict} from './InfiltrationDistrict';
import {frameInfiltration} from './infiltrationCamera';
import { founderHQ, animateFounderIdle } from './FounderHQ';
import { gpuRigModel, animateGpu } from './GpuRig';
import { researchLabModel, animateResearchLab } from './ResearchLab';
import { scrapBotModel } from './BotBuildings';
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
    private deploymentActive=false;private zoneMaterial=new THREE.MeshBasicMaterial({color:0x40daca,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false});private displayAgent=new THREE.Vector3();private desiredAgent=new THREE.Vector3();private laserDirection=new THREE.Vector3();private up=new THREE.Vector3(0,1,0);private solids:ReturnType<typeof infiltrationSolids>;private displayReady=false;
    private deployment=new THREE.Group();private preview:THREE.Group;private previewMaterials:THREE.Material[]=[];private deploymentPosition:Vec;private deploymentValid=true;private lesson:0|1|2|null=null;private lessonRing:THREE.Mesh;private labLessonRing:THREE.Mesh;
    private squadModels=new Map<string,{model:THREE.Group;beam:THREE.Line;ring:THREE.Mesh;display:THREE.Vector3;initialized:boolean}>();private wallVersion='';
    private agent = scrapBotModel(this.k);
    private drones = new Map<string, {
        model: THREE.Group;
        scan: THREE.Mesh;
        alert: THREE.Mesh;
        laser:THREE.Mesh;
    }>();
    private buildings = new Map<string, THREE.Group>();
    private op: Operation;
    private anchor = 0;
    private server = 0;
    private observer: ResizeObserver;
    private ray = new THREE.Raycaster();
    private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    private center = new THREE.Vector3();
    private clock = 0;
    private span = 1;
        private pathGeometry = new THREE.BufferGeometry();
    private pathLine: THREE.Line;
    private beamGeometry = new THREE.BufferGeometry();
    private beam: THREE.Line;
    private hackRing: THREE.Mesh;
    private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    constructor(private host: HTMLElement, o: Operation,private options:{preview?:boolean}={}) {
        this.op = structuredClone(o);this.solids=infiltrationSolids(o.target);this.deploymentPosition=[...o.target.entry];this.district=new InfiltrationDistrict(o.target.id==='vector-works');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        const sun=lightWorld(this.renderer,this.scene);lightCampus(this.renderer,this.scene,sun);this.scene.background=new THREE.Color('#b5eafa');this.scene.fog=new THREE.Fog('#b5eafa',80,160);
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        this.renderer.domElement.setAttribute('aria-label', 'Rival company campus');
        this.host.append(this.renderer.domElement);
        this.scene.add(this.district.group);if(o.target.walls){this.walls=new SecurityWalls(o.target.walls);this.scene.add(this.walls.group);}
        this.k.box(this.scene,[28.7,.12,20.7],[0,-.08,0],'#d7d9b8');this.lawn=new CampusLawn(28.5,20.5);this.lawn.mesh.position.y=.015;this.scene.add(this.lawn.mesh);
        for (const x of [-14, 14])
            this.k.box(this.scene, [.12, .22, 20], [x, .12, 0], C.cream);
        for (const z of [-10, 10])
            this.k.box(this.scene, [28, .22, .12], [0, .12, z], C.cream);
        if(o.squad){this.k.box(this.scene,[8,.025,1.1],[-1,.06,3.9],'#e8dfc7');this.k.box(this.scene,[1,.025,5],[8.8,.06,0],'#e8dfc7');for(const x of [-9.3,9.5])for(const z of [-5,2]){this.k.box(this.scene,[.65,.16,1.2],[x,.16,z],C.cream,.08);this.k.box(this.scene,[.48,.4,.95],[x,.4,z],'#91b584',.15);}}
        for (const a of o.target.assets) {
            let g: THREE.Group;
            if (a.kind === 'hq') {
                g = new THREE.Group();
                const h = founderHQ(this.k, g, o.target.hqLevel??(o.target.id === 'lumen-labs' ? 1 : 2));
                h.position.set(0, 0, 0);
                g.scale.setScalar(.65);
            }
            else if (a.kind === 'gpu')
                g = gpuRigModel(this.k);
            else if(a.kind==='station')g=droneStationModel(this.k);
            else if (a.kind === 'lab')
                g = researchLabModel(this.k);
            else {
                g = new THREE.Group();
                this.k.box(g, [1.5, .2, 1.3], [0, .1, 0], C.cream);
                this.k.box(g, [.9, 1.5, .65], [0, .9, 0], C.dark);
                this.k.box(g, [.7, .65, .05], [0, 1.2, .36], C.purple, .03, true);
            }
            g.position.set(a.position[0], 0, a.position[1]);
            g.userData.assetId = a.id;
            this.scene.add(g);
            this.buildings.set(a.id, g);
        }
        // Rounded drop tiles use the exact same safe perimeter predicate as commands.
        const tileGeometry=new THREE.PlaneGeometry(.62,.62),tiles:THREE.Matrix4[]=[];
        for(let x=-13;x<=13;x+=.75)for(let z=-9;z<=9;z+=.75)if(deploymentGround(o.target,[x,z]))tiles.push(new THREE.Matrix4().makeRotationX(-Math.PI/2).setPosition(x,.15,z));
        const outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-13.3,-9.3],[13.3,-9.3],[13.3,9.3],[-13.3,9.3]].map(([x,z])=>new THREE.Vector3(x,.16,z))),new THREE.LineBasicMaterial({color:C.cyan,transparent:true,opacity:.7}));outline.name='deployment-outline';outline.raycast=()=>{};this.deployment.add(outline);
        const zone=new THREE.InstancedMesh(tileGeometry,this.zoneMaterial,tiles.length);tiles.forEach((matrix,i)=>zone.setMatrixAt(i,matrix));zone.raycast=()=>{};this.deployment.add(zone);this.scene.add(this.deployment);
        this.preview=this.agent.clone(true);const clones=new Map<THREE.Material,THREE.Material>();this.preview.traverse(n=>{if(n instanceof THREE.Mesh){const clone=(m:THREE.Material)=>{if(!clones.has(m)){const c=m.clone();c.transparent=true;c.opacity=.5;c.depthWrite=false;clones.set(m,c);this.previewMaterials.push(c);}return clones.get(m)!;};n.material=Array.isArray(n.material)?n.material.map(clone):clone(n.material);n.castShadow=false;}});this.preview.scale.setScalar(1.05);this.scene.add(this.preview);
        this.lessonRing=new THREE.Mesh(new THREE.RingGeometry(1.1,1.25,32),new THREE.MeshBasicMaterial({color:C.gold,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));this.lessonRing.rotation.x=-Math.PI/2;this.scene.add(this.lessonRing);this.labLessonRing=this.lessonRing.clone();this.scene.add(this.labLessonRing);

        this.agent.scale.setScalar(1.05);
        this.k.box(this.agent, [.6, .1, .3], [0, .7, -.28], C.purple, .04, true);
        this.scene.add(this.agent);
        for (const d of o.target.defenses) {
            const model = securityDroneModel(this.k), scan = new THREE.Mesh(new THREE.RingGeometry(d.radius - .045, d.radius, 48), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false })), alert = new THREE.Mesh(new THREE.ConeGeometry(.15, .45, 4), new THREE.MeshBasicMaterial({ color: C.coral }));
            scan.rotation.x = -Math.PI / 2;
            alert.position.y = 3.6;
            model.scale.setScalar(1.15);
            this.scene.add(model, scan, alert);
            const geometry=new THREE.CylinderGeometry(.055,.055,1,6);
            const laser=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#ff785b',transparent:true,opacity:.95}));laser.frustumCulled=false;this.scene.add(laser);
            this.drones.set(d.id, { model, scan, alert, laser });
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
        // A correctly projected arrow is still misleading if Ava covers its target.
        // Fit the campus beside the lesson in landscape, above it in portrait.
        const ava=!this.options.preview&&this.lesson!==null?parent?.querySelector('.infiltration-ava')?.getBoundingClientRect():undefined;
        if(ava){if(w>h&&host.right-ava.right>210){reserved.left=Math.max(reserved.left,ava.right-host.left+16);reserved.top=12;reserved.bottom=12;}else reserved.bottom=Math.max(reserved.bottom,host.bottom-ava.top+14);}
        frameInfiltration(this.camera,w,h,reserved,this.center,this.span);this.renderer.domElement.dataset.cameraInsets=JSON.stringify(reserved);}
    hackingProgress(id:string){const o=this.op;if(o.squad&&o.target.walls?.some(w=>w.id===id)){return o.squad.agents.some(a=>a.state==='active'&&a.wallTarget===id&&a.mode==='breaching'&&!a.path.length)?Math.min(1,(o.squad.wallDamage[id]??0)/SQUAD_BALANCE.wallHealth):null;}const asset=o.target.assets.find(a=>a.id===id);if(!asset?.hackSeconds)return null;if(o.squad){const workers=o.squad.agents.some(a=>a.state==='active'&&a.mode==='hacking'&&a.target===id);return workers?Math.min(1,(o.squad.progress[id]??0)/asset.hackSeconds):null;}return o.agent.mode==='hacking'&&o.agent.target===id?o.agent.hack/asset.hackSeconds:null;}
    setDeploymentActive(active:boolean){this.deploymentActive=active;}
    setDeployment(position:Vec){this.deploymentPosition=[...position];this.deploymentValid=validDeployment(this.op.target,position);return this.deploymentValid;}
    setLesson(step:0|1|2|null){this.lesson=step;}
    pan(dx:number,dy:number){const scale=(this.camera.right-this.camera.left)/Math.max(1,this.host.clientWidth);const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1);up.y=0;up.normalize();this.center.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);this.center.y=0;this.center.x=THREE.MathUtils.clamp(this.center.x,-7,7);this.center.z=THREE.MathUtils.clamp(this.center.z,-5,5);this.resize();}
    zoom(f: number) { this.span = Math.max(.65, Math.min(1.65, this.span * f)); this.resize(); }
    sync(o: Operation, serverTime: number) { this.op = structuredClone(o); this.server = serverTime; this.anchor = performance.now(); const points = [o.agent.position, ...o.agent.path].map(p => new THREE.Vector3(p[0], .15, p[1])); this.pathGeometry.setFromPoints(points); }
    labelPoint(id:string){const asset=this.op.target.assets.find(a=>a.id===id),wall=this.op.target.walls?.find(w=>w.id===id),position=id==='entry'?this.op.target.entry:asset?.position??(wall?[wall.x,wall.z]:this.op.target.exit),drone=id==='drone'&&this.op.drones[0]?this.drones.get(this.op.drones[0].id)?.model:undefined;
        const point=drone?drone.position.clone().add(new THREE.Vector3(0,.24,0)):new THREE.Vector3(position[0],asset?3.2:wall?(wall.height??1.3)+.6:.3,position[1]);point.project(this.camera);return{x:(point.x+1)*this.host.clientWidth/2,y:(1-point.y)*this.host.clientHeight/2,z:point.z};}
    groundPosition(x:number,y:number):Vec|undefined{const r=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),this.camera);const p=this.ray.ray.intersectPlane(this.plane,new THREE.Vector3());return p?[Math.round(p.x*2)/2,Math.round(p.z*2)/2]:undefined;}
    update(dt: number) { if (document.hidden)
        return; this.clock += dt;this.district.update(dt,this.host.clientWidth,this.host.clientHeight,this.reduced); const o = this.op; advanceOperation(o, this.server + Math.min(1100, performance.now() - this.anchor)); const a = o.agent; this.agent.visible = !o.squad&&o.status !== 'ready';this.deployment.visible=o.status==='ready'||o.status==='active'&&!!o.squad;this.preview.visible=this.deployment.visible&&this.deploymentActive;this.zoneMaterial.opacity=this.deploymentActive?.45:.12;this.preview.position.set(this.deploymentPosition[0],.13,this.deploymentPosition[1]);this.preview.rotation.y=.5;for(const m of this.previewMaterials)if(m instanceof THREE.MeshStandardMaterial)m.color.set(this.deploymentValid?'#6adbd4':'#e98062');this.lessonRing.visible=this.lesson!==null;this.labLessonRing.visible=this.lesson===1;(this.lessonRing.material as THREE.MeshBasicMaterial).color.set(this.lesson===0?C.cyan:this.lesson===1?C.purple:C.gold);const highlight=this.lesson===0?o.target.entry:this.lesson===1?(o.target.assets.find(a=>a.kind==='gpu')?.position??o.target.entry):(o.drones[0]?.position??o.target.entry);this.lessonRing.position.set(highlight[0],.19,highlight[1]);this.lessonRing.scale.setScalar((this.lesson===1?2:1)*(this.reduced?1:1+Math.sin(this.clock*3)*.06));const lab=o.target.assets.find(a=>a.kind==='lab');if(lab){this.labLessonRing.position.set(lab.position[0],.19,lab.position[1]);this.labLessonRing.scale.copy(this.lessonRing.scale);} const desired=this.desiredAgent.set(a.position[0],.13,a.position[1]);
        if(!this.displayReady||this.displayAgent.distanceTo(desired)>2||!segmentClear([this.displayAgent.x,this.displayAgent.z],a.position,this.solids,INFILTRATION_BOUNDS,AGENT_CLEARANCE)){this.displayAgent.copy(desired);this.displayReady=true;}
        else this.displayAgent.lerp(desired,1-Math.exp(-dt*18));
        this.agent.position.copy(this.displayAgent); turnScrapBot(this.agent, a.yaw, dt, this.reduced); animateScrapBot(this.agent, dt, this.reduced, a.mode==='hacking'?.55:0, a.mode === 'idle' ? .015 * Math.sin(this.clock * 2) : 0); this.hackRing.visible = !o.squad&&a.mode === 'hacking';this.beam.visible=!o.squad&&a.mode==='hacking';if(this.beam.visible){const target=o.target.assets.find(v=>v.id===a.target)!;const positions=this.beamGeometry.attributes.position as THREE.BufferAttribute;positions.setXYZ(0,this.agent.position.x,1.0,this.agent.position.z);positions.setXYZ(1,target.position[0],1.65,target.position[1]);positions.needsUpdate=true;(this.beam.material as THREE.LineBasicMaterial).opacity=this.reduced?.7:.55+Math.sin(this.clock*7)*.2;} this.hackRing.position.set(a.position[0], .13, a.position[1]); this.hackRing.scale.setScalar(this.reduced ? 1 : 1 + Math.sin(this.clock * 5) * .05); if(o.squad)this.updateSquad(dt);for (const d of o.drones) {
        const v = this.drones.get(d.id)!;
        v.model.position.set(d.position[0], 2.6, d.position[1]);
        animateSecurityDrone(v.model, this.clock, this.reduced);if(d.yaw!==undefined){const delta=Math.atan2(Math.sin(d.yaw-v.model.rotation.y),Math.cos(d.yaw-v.model.rotation.y));v.model.rotation.y+=delta*(this.reduced?1:1-Math.exp(-dt*12));}
        v.scan.position.set(d.position[0], .12, d.position[1]);
        (v.scan.material as THREE.MeshBasicMaterial).color.set(d.mode === 'patrol' ? C.cyan : C.coral);
        v.laser.visible=o.status==='active'&&d.lastShotAt!==undefined&&o.lastTick-d.lastShotAt<250;
        if(v.laser.visible){const target=o.squad?(d.shotPosition??o.agent.position):[this.agent.position.x,this.agent.position.z];this.laserDirection.set(target[0]-v.model.position.x,.85-(v.model.position.y-.25),target[1]-v.model.position.z);v.laser.scale.y=this.laserDirection.length();v.laser.quaternion.setFromUnitVectors(this.up,this.laserDirection.normalize());v.laser.position.set((v.model.position.x+(o.squad?d.shotPosition?.[0]??o.agent.position[0]:this.agent.position.x))/2,(v.model.position.y+.6)/2,(v.model.position.z+(o.squad?d.shotPosition?.[1]??o.agent.position[1]:this.agent.position.z))/2);}
        v.alert.visible = d.mode === 'warning' || d.mode === 'pursuit';
        v.alert.position.set(d.position[0], 3.5, d.position[1]);
    } if(this.lesson===2&&o.drones[0]){const highlighted=this.drones.get(o.drones[0].id);if(highlighted)this.lessonRing.position.copy(highlighted.model.position);} for (const [id, g] of this.buildings) {
        if (id === 'gpu')
            animateGpu(g, this.clock, dt, true, this.reduced);
        if (id === 'lab')
            animateResearchLab(g, this.clock, true, this.reduced);
        if (id === 'hq')
            animateFounderIdle(g, this.clock, this.reduced);
    } this.renderer.render(this.scene, this.camera); this.renderer.domElement.dataset.agentPosition=this.agent.position.x+','+this.agent.position.z;this.renderer.domElement.dataset.agentMode=a.mode;this.renderer.domElement.dataset.walkActivity=String(this.agent.userData.walkActivity??0);this.renderer.domElement.dataset.laserActive=String([...this.drones.values()].some(d=>d.laser.visible));this.renderer.domElement.dataset.lessonTarget=this.lesson===null?'':this.lesson===0?'entry':this.lesson===1?'gpu':'drone';if(this.lesson!==null)this.renderer.domElement.dataset.lessonScreen=JSON.stringify(this.labelPoint(this.lesson===0?'entry':this.lesson===1?'gpu':'drone')); this.renderer.domElement.dataset.cameraSpan=String(this.span);this.renderer.domElement.dataset.cameraCenter=this.center.x+','+this.center.z;this.renderer.domElement.dataset.deployment=this.deploymentPosition.join(',');this.renderer.domElement.dataset.drawCalls = String(this.renderer.info.render.calls); this.renderer.domElement.dataset.triangles = String(this.renderer.info.render.triangles); }
    private updateSquad(dt:number){const o=this.op,squad=o.squad!;
        const wallVersion=squad.breachedWalls.join(',');if(wallVersion!==this.wallVersion){this.wallVersion=wallVersion;this.walls?.group.removeFromParent();this.walls?.dispose();this.walls=new SecurityWalls(squadTarget(o).walls??[]);this.scene.add(this.walls.group);this.solids=infiltrationSolids(squadTarget(o));}
        for(const a of squad.agents){let v=this.squadModels.get(a.id);if(!v){const model=scrapBotModel(this.k);model.scale.setScalar(1.05);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));const beam=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:C.cyan,transparent:true,opacity:.75}));beam.frustumCulled=false;const ring=new THREE.Mesh(new THREE.RingGeometry(.62,.7,20),new THREE.MeshBasicMaterial({color:C.purple,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;v={model,beam,ring,display:new THREE.Vector3(),initialized:false};this.squadModels.set(a.id,v);this.scene.add(model,beam,ring);}
         v.model.visible=a.state==='active';const desired=this.desiredAgent.set(a.position[0],.13,a.position[1]);if(!v.initialized||v.display.distanceTo(desired)>2||!segmentClear([v.display.x,v.display.z],a.position,this.solids,INFILTRATION_BOUNDS,AGENT_CLEARANCE)){v.display.copy(desired);v.initialized=true;}else v.display.lerp(desired,1-Math.exp(-dt*18));v.model.position.copy(v.display);turnScrapBot(v.model,a.yaw,dt,this.reduced);
         const hacking=a.state==='active'&&a.mode==='hacking',breaching=a.state==='active'&&a.mode==='breaching'&&!a.path.length;animateScrapBot(v.model,dt,this.reduced,hacking?.75+(this.reduced?0:Math.sin(this.clock*9)*.07):breaching?.55+Math.sin(this.clock*11)*.4:0);
         v.ring.visible=hacking;v.ring.position.set(v.display.x,.16,v.display.z);v.beam.visible=hacking;const target=o.target.assets.find(t=>t.id===a.target);if(hacking&&target){const positions=v.beam.geometry.attributes.position as THREE.BufferAttribute;positions.setXYZ(0,v.display.x,1.05,v.display.z);positions.setXYZ(1,target.position[0],1.4,target.position[1]);positions.needsUpdate=true;}
        }
        this.renderer.domElement.dataset.agents=String(squad.agents.filter(a=>a.state==='active').length);this.renderer.domElement.dataset.breached=String(squad.breachedWalls.length);
    }
    dispose() {for(const v of this.squadModels.values()){v.beam.geometry.dispose();(v.beam.material as THREE.Material).dispose();v.ring.geometry.dispose();(v.ring.material as THREE.Material).dispose();v.ring.removeFromParent();} for(const m of this.previewMaterials)m.dispose();this.lessonRing.removeFromParent();this.labLessonRing.removeFromParent();this.lessonRing.geometry.dispose();(this.lessonRing.material as THREE.Material).dispose();this.deployment.traverse(n=>{if(n instanceof THREE.Line){n.geometry.dispose();(n.material as THREE.Material).dispose();}if(n instanceof THREE.InstancedMesh)n.dispose();if(n instanceof THREE.Mesh&&n.geometry.type==='PlaneGeometry'){n.geometry.dispose();(n.material as THREE.Material).dispose();}});this.walls?.dispose();this.observer.disconnect(); this.scene.traverse(o => { if (o instanceof THREE.DirectionalLight)
        o.shadow.dispose(); }); for (const v of this.drones.values()) {
        v.laser.geometry.dispose();(v.laser.material as THREE.Material).dispose();
        v.scan.geometry.dispose();
        (v.scan.material as THREE.Material).dispose();
        v.alert.geometry.dispose();
        (v.alert.material as THREE.Material).dispose();
    } this.beamGeometry.dispose();(this.beam.material as THREE.Material).dispose();this.pathGeometry.dispose(); (this.pathLine.material as THREE.Material).dispose(); this.hackRing.geometry.dispose(); (this.hackRing.material as THREE.Material).dispose(); this.scene.traverse(o => { if (o instanceof THREE.Mesh && o.geometry.type === 'RingGeometry' && o !== this.hackRing) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
    } }); this.lawn.dispose();this.district.dispose(); this.k.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
}
