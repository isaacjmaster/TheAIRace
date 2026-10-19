import {lightCampus} from './CampusFinish';
import {CampusLawn} from './CampusLawn';
import {validDeployment} from '../../shared/infiltration';
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
    private deployment=new THREE.Group();private preview:THREE.Group;private previewMaterials:THREE.Material[]=[];private deploymentPosition:Vec;private deploymentValid=true;private lesson:0|1|2|null=null;private lessonRing:THREE.Mesh;private labLessonRing:THREE.Mesh;
    private agent = scrapBotModel(this.k);
    private drones = new Map<string, {
        model: THREE.Group;
        scan: THREE.Mesh;
        alert: THREE.Mesh;
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
        this.op = structuredClone(o);this.deploymentPosition=[...o.target.entry];this.district=new InfiltrationDistrict(o.target.id==='vector-works');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        const sun=lightWorld(this.renderer,this.scene);lightCampus(this.renderer,this.scene,sun);this.scene.background=new THREE.Color('#b5eafa');this.scene.fog=new THREE.Fog('#b5eafa',48,90);
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        this.renderer.domElement.setAttribute('aria-label', 'Rival company campus');
        this.host.append(this.renderer.domElement);
        this.scene.add(this.district.group);if(o.target.walls){this.walls=new SecurityWalls(o.target.walls);this.scene.add(this.walls.group);}
        this.k.box(this.scene,[25,.12,17],[0,-.08,0],'#d7d9b8');this.lawn=new CampusLawn(24.7,16.7);this.lawn.mesh.position.y=.015;this.scene.add(this.lawn.mesh);
        for (const x of [-12, 12])
            this.k.box(this.scene, [.12, .22, 16], [x, .12, 0], C.cream);
        for (const z of [-8, 8])
            this.k.box(this.scene, [24, .22, .12], [0, .12, z], C.cream);
        for (const a of o.target.assets) {
            let g: THREE.Group;
            if (a.kind === 'hq') {
                g = new THREE.Group();
                const h = founderHQ(this.k, g, o.target.id === 'lumen-labs' ? 1 : 2);
                h.position.set(0, 0, 0);
                g.scale.setScalar(.65);
            }
            else if (a.kind === 'gpu')
                g = gpuRigModel(this.k);
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
        const zone=new THREE.Mesh(new THREE.PlaneGeometry(21,1.4),new THREE.MeshBasicMaterial({color:C.cyan,transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false}));zone.rotation.x=-Math.PI/2;zone.position.y=.14;this.deployment.add(zone);
        this.deployment.position.set(0,0,6.5);this.scene.add(this.deployment);
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
            this.drones.set(d.id, { model, scan, alert });
        }
        this.beamGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));this.beam=new THREE.Line(this.beamGeometry,new THREE.LineBasicMaterial({color:C.cyan,transparent:true,opacity:.8}));this.beam.frustumCulled=false;this.scene.add(this.beam);
        this.pathLine = new THREE.Line(this.pathGeometry, new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: .6 }));
        this.scene.add(this.pathLine);
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
    setDeployment(position:Vec){this.deploymentPosition=[...position];this.deploymentValid=validDeployment(this.op.target,position);return this.deploymentValid;}
    setLesson(step:0|1|2|null){this.lesson=step;}
    pan(dx:number,dy:number){const scale=(this.camera.right-this.camera.left)/Math.max(1,this.host.clientWidth);const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1);up.y=0;up.normalize();this.center.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);this.center.y=0;this.center.x=THREE.MathUtils.clamp(this.center.x,-7,7);this.center.z=THREE.MathUtils.clamp(this.center.z,-5,5);this.resize();}
    zoom(f: number) { this.span = Math.max(.65, Math.min(1.65, this.span * f)); this.resize(); }
    sync(o: Operation, serverTime: number) { this.op = structuredClone(o); this.server = serverTime; this.anchor = performance.now(); const points = [o.agent.position, ...o.agent.path].map(p => new THREE.Vector3(p[0], .15, p[1])); this.pathGeometry.setFromPoints(points); }
    labelPoint(id:string){const asset=this.op.target.assets.find(a=>a.id===id),position=id==='entry'?this.op.target.entry:asset?.position??this.op.target.exit,drone=id==='drone'&&this.op.drones[0]?this.drones.get(this.op.drones[0].id)?.model:undefined;
        const point=drone?drone.position.clone().add(new THREE.Vector3(0,.24,0)):new THREE.Vector3(position[0],asset?3.2:.3,position[1]);point.project(this.camera);return{x:(point.x+1)*this.host.clientWidth/2,y:(1-point.y)*this.host.clientHeight/2,z:point.z};}
    groundPosition(x:number,y:number):Vec|undefined{const r=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),this.camera);const p=this.ray.ray.intersectPlane(this.plane,new THREE.Vector3());return p?[Math.round(p.x*2)/2,Math.round(p.z*2)/2]:undefined;}
    update(dt: number) { if (document.hidden)
        return; this.clock += dt; const o = this.op; advanceOperation(o, this.server + Math.min(1100, performance.now() - this.anchor)); const a = o.agent; this.agent.visible = o.status !== 'ready';this.deployment.visible=o.status==='ready';this.preview.visible=o.status==='ready';this.preview.position.set(this.deploymentPosition[0],.13,this.deploymentPosition[1]);this.preview.rotation.y=.5;for(const m of this.previewMaterials)if(m instanceof THREE.MeshStandardMaterial)m.color.set(this.deploymentValid?'#6adbd4':'#e98062');this.lessonRing.visible=this.lesson!==null;this.labLessonRing.visible=this.lesson===1;(this.lessonRing.material as THREE.MeshBasicMaterial).color.set(this.lesson===0?C.cyan:this.lesson===1?C.purple:C.gold);const highlight=this.lesson===0?o.target.entry:this.lesson===1?(o.target.assets.find(a=>a.kind==='gpu')?.position??o.target.entry):(o.drones[0]?.position??o.target.entry);this.lessonRing.position.set(highlight[0],.19,highlight[1]);this.lessonRing.scale.setScalar((this.lesson===1?2:1)*(this.reduced?1:1+Math.sin(this.clock*3)*.06));const lab=o.target.assets.find(a=>a.kind==='lab');if(lab){this.labLessonRing.position.set(lab.position[0],.19,lab.position[1]);this.labLessonRing.scale.copy(this.lessonRing.scale);} this.agent.position.set(a.position[0], .13, a.position[1]); turnScrapBot(this.agent, a.yaw, dt, this.reduced); animateScrapBot(this.agent, dt, this.reduced, 0, a.mode === 'idle' ? .015 * Math.sin(this.clock * 2) : 0); this.hackRing.visible = a.mode === 'hacking';this.beam.visible=a.mode==='hacking';if(this.beam.visible){const target=o.target.assets.find(v=>v.id===a.target)!;const positions=this.beamGeometry.attributes.position as THREE.BufferAttribute;positions.setXYZ(0,a.position[0],1.15,a.position[1]);positions.setXYZ(1,target.position[0],1.65,target.position[1]);positions.needsUpdate=true;(this.beam.material as THREE.LineBasicMaterial).opacity=this.reduced?.7:.55+Math.sin(this.clock*7)*.2;} this.hackRing.position.set(a.position[0], .13, a.position[1]); this.hackRing.scale.setScalar(this.reduced ? 1 : 1 + Math.sin(this.clock * 5) * .05); for (const d of o.drones) {
        const v = this.drones.get(d.id)!;
        v.model.position.set(d.position[0], 2.6, d.position[1]);
        animateSecurityDrone(v.model, this.clock, this.reduced);if(d.yaw!==undefined){const delta=Math.atan2(Math.sin(d.yaw-v.model.rotation.y),Math.cos(d.yaw-v.model.rotation.y));v.model.rotation.y+=delta*(this.reduced?1:1-Math.exp(-dt*12));}
        v.scan.position.set(d.position[0], .12, d.position[1]);
        (v.scan.material as THREE.MeshBasicMaterial).color.set(d.mode === 'patrol' ? C.cyan : C.coral);
        v.alert.visible = d.mode === 'warning' || d.mode === 'pursuit';
        v.alert.position.set(d.position[0], 3.5, d.position[1]);
    } if(this.lesson===2&&o.drones[0]){const highlighted=this.drones.get(o.drones[0].id);if(highlighted)this.lessonRing.position.copy(highlighted.model.position);} for (const [id, g] of this.buildings) {
        if (id === 'gpu')
            animateGpu(g, this.clock, dt, true, this.reduced);
        if (id === 'lab')
            animateResearchLab(g, this.clock, true, this.reduced);
        if (id === 'hq')
            animateFounderIdle(g, this.clock, this.reduced);
    } this.renderer.render(this.scene, this.camera); this.renderer.domElement.dataset.lessonTarget=this.lesson===null?'':this.lesson===0?'entry':this.lesson===1?'gpu':'drone';if(this.lesson!==null)this.renderer.domElement.dataset.lessonScreen=JSON.stringify(this.labelPoint(this.lesson===0?'entry':this.lesson===1?'gpu':'drone')); this.renderer.domElement.dataset.cameraSpan=String(this.span);this.renderer.domElement.dataset.cameraCenter=this.center.x+','+this.center.z;this.renderer.domElement.dataset.deployment=this.deploymentPosition.join(',');this.renderer.domElement.dataset.drawCalls = String(this.renderer.info.render.calls); this.renderer.domElement.dataset.triangles = String(this.renderer.info.render.triangles); }
    dispose() { for(const m of this.previewMaterials)m.dispose();this.lessonRing.removeFromParent();this.labLessonRing.removeFromParent();this.lessonRing.geometry.dispose();(this.lessonRing.material as THREE.Material).dispose();this.deployment.traverse(n=>{if(n instanceof THREE.Mesh&&n.geometry.type==='PlaneGeometry'){n.geometry.dispose();(n.material as THREE.Material).dispose();}});this.walls?.dispose();this.observer.disconnect(); this.scene.traverse(o => { if (o instanceof THREE.DirectionalLight)
        o.shadow.dispose(); }); for (const v of this.drones.values()) {
        v.scan.geometry.dispose();
        (v.scan.material as THREE.Material).dispose();
        v.alert.geometry.dispose();
        (v.alert.material as THREE.Material).dispose();
    } this.beamGeometry.dispose();(this.beam.material as THREE.Material).dispose();this.pathGeometry.dispose(); (this.pathLine.material as THREE.Material).dispose(); this.hackRing.geometry.dispose(); (this.hackRing.material as THREE.Material).dispose(); this.scene.traverse(o => { if (o instanceof THREE.Mesh && o.geometry.type === 'RingGeometry' && o !== this.hackRing) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
    } }); this.lawn.dispose();this.district.dispose(); this.k.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
}
