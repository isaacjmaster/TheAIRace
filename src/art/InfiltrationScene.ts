import {findPath} from '../../shared/navigation';
import {validDeployment,infiltrationSolids,INFILTRATION_BOUNDS,DRONE_CLEARANCE} from '../../shared/infiltration';
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
    private district:InfiltrationDistrict;
    private deployment=new THREE.Group();private preview:THREE.Group;private previewMaterials:THREE.Material[]=[];private deploymentPosition:Vec;private deploymentValid=true;private lesson:0|1|2|null=null;private lessonRing:THREE.Mesh;private labLessonRing:THREE.Mesh;private extraction:THREE.Mesh;
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
    private paths = new THREE.Group();
    private pathGeometry = new THREE.BufferGeometry();
    private pathLine: THREE.Line;
    private beamGeometry = new THREE.BufferGeometry();
    private beam: THREE.Line;
    private hackRing: THREE.Mesh;
    private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    constructor(private host: HTMLElement, o: Operation) {
        this.op = structuredClone(o);this.deploymentPosition=[...o.target.entry];this.district=new InfiltrationDistrict(o.target.id==='vector-works');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        lightWorld(this.renderer, this.scene);this.scene.background=new THREE.Color('#c9d7d1');this.scene.fog=new THREE.Fog('#c9d7d1',38,70);
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        this.renderer.domElement.setAttribute('aria-label', 'Rival company campus');
        this.host.append(this.renderer.domElement);
        this.scene.add(this.district.group);if(o.target.walls){this.walls=new SecurityWalls(o.target.walls);this.scene.add(this.walls.group);}
        this.k.box(this.scene, [25, .12, 17], [0, -.03, 0], '#adc795');
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
        const extraction = new THREE.Mesh(new THREE.RingGeometry(.9, 1.3, 32), new THREE.MeshBasicMaterial({ color: C.cyan, side: THREE.DoubleSide, transparent: true, opacity: .85, depthWrite: false }));
        extraction.rotation.x = -Math.PI / 2;
        extraction.position.set(...[o.target.exit[0], .12, o.target.exit[1]] as [
            number,
            number,
            number
        ]);
        this.scene.add(extraction);this.extraction=extraction;(extraction.material as THREE.MeshBasicMaterial).color.set(C.gold);
        const zone=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.1),new THREE.MeshBasicMaterial({color:C.cyan,transparent:true,opacity:.25,side:THREE.DoubleSide,depthWrite:false}));zone.rotation.x=-Math.PI/2;zone.position.y=.14;this.deployment.add(zone);
        for(const z of [-.55,.55])this.k.box(this.deployment,[2.4,.045,.06],[0,.16,z],C.cyan,.01,true);for(const x of [-1.2,1.2])this.k.box(this.deployment,[.06,.045,1.1],[x,.16,0],C.cyan,.01,true);
        this.deployment.position.set(o.target.entry[0],0,o.target.entry[1]);this.scene.add(this.deployment);
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
            const patrol=o.target.navigationVersion===2?d.route.flatMap((p,i)=>findPath(p,d.route[(i+1)%d.route.length],infiltrationSolids(o.target),INFILTRATION_BOUNDS,DRONE_CLEARANCE)):d.route.concat([d.route[0]]);
            const points = patrol.map(p => new THREE.Vector3(p[0], .16, p[1])), line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: '#785da9', dashSize: .3, gapSize: .25 }));
            line.computeLineDistances();
            this.paths.add(line);
        }
        this.scene.add(this.paths);
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
    resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);const parent=this.host.parentElement!,style=getComputedStyle(parent),host=this.host.getBoundingClientRect(),controls=parent.querySelector('.operation-controls')?.getBoundingClientRect(),header=parent.querySelector('.operation-header')?.getBoundingClientRect(),side=(parseFloat(style.getPropertyValue('--mission-right'))||0)>0;
        const right=side?Math.max(parseFloat(style.getPropertyValue('--mission-right'))||0,controls?host.right-controls.left+16:0):0,left=parseFloat(style.getPropertyValue('--mission-safe-left'))||0,top=header?header.bottom-host.top+12:85,bottom=side?12:controls?host.bottom-controls.top+12:235;
        frameInfiltration(this.camera,w,h,{right,left,top,bottom},this.center,this.span);this.renderer.domElement.dataset.cameraInsets=JSON.stringify({right,left,top,bottom});}
    setDeployment(position:Vec){this.deploymentPosition=[...position];this.deploymentValid=validDeployment(this.op.target,position);return this.deploymentValid;}
    setLesson(step:0|1|2|null){this.lesson=step;}
    pan(dx: number, dy: number) { const scale = (this.camera.right - this.camera.left) / this.host.clientWidth; this.center.x = Math.max(-7, Math.min(7, this.center.x - dx * scale * .9 + dy * scale * .5)); this.center.z = Math.max(-5, Math.min(5, this.center.z + dx * scale * .45 + dy * scale * .8)); this.resize(); }
    zoom(f: number) { this.span = Math.max(.65, Math.min(1.65, this.span * f)); this.resize(); }
    sync(o: Operation, serverTime: number) { this.op = structuredClone(o); this.server = serverTime; this.anchor = performance.now(); const points = [o.agent.position, ...o.agent.path].map(p => new THREE.Vector3(p[0], .15, p[1])); this.pathGeometry.setFromPoints(points); }
    labelPoint(id: string) { const a = this.op.target.assets.find(a => a.id === id), pos = id==='entry'?this.op.target.entry:a?.position ?? this.op.target.exit, p = new THREE.Vector3(pos[0], a ? 3.2 : .3, pos[1]).project(this.camera); return { x: (p.x + 1) * this.host.clientWidth / 2, y: (1 - p.y) * this.host.clientHeight / 2,z:p.z }; }
    groundPosition(x:number,y:number):Vec|undefined{const r=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),this.camera);const p=this.ray.ray.intersectPlane(this.plane,new THREE.Vector3());return p?[Math.round(p.x*2)/2,Math.round(p.z*2)/2]:undefined;}
    pick(x: number, y: number): {
        assetId?: string;
        position?: Vec;
    } { const r = this.renderer.domElement.getBoundingClientRect(); this.ray.setFromCamera(new THREE.Vector2((x - r.left) / r.width * 2 - 1, 1 - (y - r.top) / r.height * 2), this.camera); const hit = this.ray.intersectObjects([...this.buildings.values()], true)[0]; if (hit) {
        for (let n: THREE.Object3D | null = hit.object; n; n = n.parent)
            if (n.userData.assetId)
                return { assetId: n.userData.assetId };
    } const p = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3()); return p ? { position: [Math.round(p.x * 2) / 2, Math.round(p.z * 2) / 2] } : {}; }
    update(dt: number) { if (document.hidden)
        return; this.clock += dt; const o = this.op; advanceOperation(o, this.server + Math.min(1100, performance.now() - this.anchor)); const a = o.agent; this.agent.visible = o.status !== 'ready';this.deployment.visible=o.status==='ready';this.preview.visible=o.status==='ready';this.preview.position.set(this.deploymentPosition[0],.13,this.deploymentPosition[1]);this.preview.rotation.y=.5;for(const m of this.previewMaterials)if(m instanceof THREE.MeshStandardMaterial)m.color.set(this.deploymentValid?'#6adbd4':'#e98062');this.lessonRing.visible=this.lesson!==null;this.labLessonRing.visible=this.lesson===1;(this.lessonRing.material as THREE.MeshBasicMaterial).color.set(this.lesson===0?C.cyan:this.lesson===1?C.purple:C.gold);const highlight=this.lesson===0?o.target.entry:this.lesson===1?(o.target.assets.find(a=>a.kind==='gpu')?.position??o.target.entry):o.target.exit;this.lessonRing.position.set(highlight[0],.19,highlight[1]);this.lessonRing.scale.setScalar((this.lesson===1?2:1)*(this.reduced?1:1+Math.sin(this.clock*3)*.06));const lab=o.target.assets.find(a=>a.kind==='lab');if(lab){this.labLessonRing.position.set(lab.position[0],.19,lab.position[1]);this.labLessonRing.scale.copy(this.lessonRing.scale);}this.extraction.scale.setScalar(this.reduced?1:1+Math.sin(this.clock*2)*.04); this.agent.position.set(a.position[0], .13, a.position[1]); turnScrapBot(this.agent, a.yaw, dt, this.reduced); animateScrapBot(this.agent, dt, this.reduced, 0, a.mode === 'idle' ? .015 * Math.sin(this.clock * 2) : 0); this.hackRing.visible = a.mode === 'hacking';this.beam.visible=a.mode==='hacking';if(this.beam.visible){const target=o.target.assets.find(v=>v.id===a.target)!;const positions=this.beamGeometry.attributes.position as THREE.BufferAttribute;positions.setXYZ(0,a.position[0],1.15,a.position[1]);positions.setXYZ(1,target.position[0],1.65,target.position[1]);positions.needsUpdate=true;(this.beam.material as THREE.LineBasicMaterial).opacity=this.reduced?.7:.55+Math.sin(this.clock*7)*.2;} this.hackRing.position.set(a.position[0], .13, a.position[1]); this.hackRing.scale.setScalar(this.reduced ? 1 : 1 + Math.sin(this.clock * 5) * .05); for (const d of o.drones) {
        const v = this.drones.get(d.id)!;
        v.model.position.set(d.position[0], 2.6, d.position[1]);
        animateSecurityDrone(v.model, this.clock, this.reduced);if(d.yaw!==undefined){const delta=Math.atan2(Math.sin(d.yaw-v.model.rotation.y),Math.cos(d.yaw-v.model.rotation.y));v.model.rotation.y+=delta*(this.reduced?1:1-Math.exp(-dt*12));}
        v.scan.position.set(d.position[0], .12, d.position[1]);
        (v.scan.material as THREE.MeshBasicMaterial).color.set(d.mode === 'jammed' ? C.purple : d.mode === 'patrol' ? C.cyan : C.coral);
        v.alert.visible = d.mode === 'warning' || d.mode === 'pursuit';
        v.alert.position.set(d.position[0], 3.5, d.position[1]);
    } this.paths.visible = o.probeUntil > o.lastTick; for (const [id, g] of this.buildings) {
        if (id === 'gpu')
            animateGpu(g, this.clock, dt, true, this.reduced);
        if (id === 'lab')
            animateResearchLab(g, this.clock, true, this.reduced);
        if (id === 'hq')
            animateFounderIdle(g, this.clock, this.reduced);
    } this.renderer.render(this.scene, this.camera); this.renderer.domElement.dataset.cameraSpan=String(this.span);this.renderer.domElement.dataset.cameraCenter=this.center.x+','+this.center.z;this.renderer.domElement.dataset.deployment=this.deploymentPosition.join(',');this.renderer.domElement.dataset.drawCalls = String(this.renderer.info.render.calls); this.renderer.domElement.dataset.triangles = String(this.renderer.info.render.triangles); }
    dispose() { for(const m of this.previewMaterials)m.dispose();this.lessonRing.removeFromParent();this.labLessonRing.removeFromParent();this.lessonRing.geometry.dispose();(this.lessonRing.material as THREE.Material).dispose();this.deployment.traverse(n=>{if(n instanceof THREE.Mesh&&n.geometry.type==='PlaneGeometry'){n.geometry.dispose();(n.material as THREE.Material).dispose();}});this.walls?.dispose();this.observer.disconnect(); this.scene.traverse(o => { if (o instanceof THREE.DirectionalLight)
        o.shadow.dispose(); }); for (const v of this.drones.values()) {
        v.scan.geometry.dispose();
        (v.scan.material as THREE.Material).dispose();
        v.alert.geometry.dispose();
        (v.alert.material as THREE.Material).dispose();
    } this.paths.traverse(o => { if (o instanceof THREE.Line) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
    } }); this.beamGeometry.dispose();(this.beam.material as THREE.Material).dispose();this.pathGeometry.dispose(); (this.pathLine.material as THREE.Material).dispose(); this.hackRing.geometry.dispose(); (this.hackRing.material as THREE.Material).dispose(); this.scene.traverse(o => { if (o instanceof THREE.Mesh && o.geometry.type === 'RingGeometry' && o !== this.hackRing) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
    } }); this.district.dispose(); this.k.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
}
