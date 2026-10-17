import { palette as colors, lightWorld, material, WorldKit } from '../src/art/world';
import {scrapBotModel} from '../src/art/BotBuildings';
import { MAP, raidLevel } from './level';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { STATS, validDeployment, type Building, type Effect, type Kind, type Point, type Raid, type Unit } from './engine';

type Visual = { group: THREE.Group; body: THREE.Group; hp: THREE.Sprite; hpTexture: THREE.CanvasTexture; hpCanvas: HTMLCanvasElement; lastHp: number; lastHit: number; born: number; lastAttack?:number; lastDamage?:number; turret?: THREE.Group; rotor?: THREE.Object3D; dead: boolean; destroyedAt?: number };
type Burst = { group: THREE.Group; age: number; life: number; particles: { mesh: THREE.Mesh; velocity: THREE.Vector3 }[] };
const world = (p: Point, height = 0) => new THREE.Vector3(p.x - MAP.center.x, height, p.y - MAP.center.y);


/** Read-only view of the engine. Every shot, death, position and HP comes from Raid. */
export class RaidScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera();
  private root = new THREE.Group();
  private terrainKit = new WorldKit();
  private visuals = new Map<number, Visual>();
  private compound = new THREE.Group();
  private pulses: {mesh: THREE.Mesh; age:number; life:number; size:number}[] = [];
  private wallMeshes: THREE.InstancedMesh[] = [];
  private wallIndices = new Map<number, number>();
  private bursts: Burst[] = [];
  private beams = new Map<number, { group: THREE.Group; life: number; age: number; effect: Effect }>();
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private geometries = new Map<string, THREE.BufferGeometry>();
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private center = new THREE.Vector3(0, .2, 0);
  private pointer: Point | null = null;
  private cursor: THREE.Mesh;
  private resizeObserver: ResizeObserver;
  private width = 1;
  private height = 1;
  private lastState?: Raid;
  private seenEffects = new Set<number>();
  private clock = 0;
  private statsAt = -1;
  private paused = false;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private contextLost = (e: Event) => { e.preventDefault(); this.paused = true; this.onError('Graphics paused. Reload to restore the battlefield.'); };

  constructor(readonly host: HTMLDivElement, readonly onError: (message: string) => void, private starterPortrait=false) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    lightWorld(this.renderer, this.scene);
    this.renderer.domElement.setAttribute('aria-label', '3D raid battlefield. Tap the cyan perimeter to deploy. Drag to move the camera.');
    this.renderer.domElement.setAttribute('role', 'img');
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    this.scene.add(this.root);
    this.environment();
    this.cursor = new THREE.Mesh(new THREE.RingGeometry(.36, .46, 40), new THREE.MeshBasicMaterial({ color: colors.cyan, transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide }));
    this.cursor.rotation.x = -Math.PI / 2; this.cursor.visible = false; this.scene.add(this.cursor);
    this.camera.position.set(7, 25, 32); this.camera.lookAt(this.center);
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(host); this.resize();
  }
  private mat(color: string, glow = false) {
    const key = color + glow; let m = this.materials.get(key);
    if (!m) { m = material(color, glow); this.materials.set(key, m); } return m;
  }
  private geometry(key: string, create: () => THREE.BufferGeometry) { let g = this.geometries.get(key); if (!g) { g = create(); this.geometries.set(key, g); } return g; }
  private box(parent: THREE.Object3D, size: [number, number, number], pos: [number, number, number], color: string, radius = .06, glow = false) {
    const key = `box-${size.join(',')}-${radius}`;
    const mesh = new THREE.Mesh(this.geometry(key, () => new RoundedBoxGeometry(...size, 1, radius)), this.mat(color, glow));
    mesh.position.set(...pos); mesh.castShadow = !glow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private cylinder(parent: THREE.Object3D, radius: number, height: number, pos: [number, number, number], color: string, sides = 12, glow = false) {
    const key = `cyl-${radius}-${height}-${sides}`;
    const mesh = new THREE.Mesh(this.geometry(key, () => new THREE.CylinderGeometry(radius, radius, height, sides)), this.mat(color, glow));
    mesh.position.set(...pos); mesh.castShadow = !glow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private environment() {
    this.terrainKit.terrain(this.scene,17,12);
    // Defense compound sits within a continuous valley, with infrastructure beyond the drop zone.
    this.box(this.root,[80,.08,2.6],[0,-.07,-12.3],'#182c41');
    for(const z of [-10.9,-13.7])this.box(this.root,[80,.12,.18],[0,-.04,z],colors.slate);
    for(const x of [-18,18])for(const z of [-9,0,8])this.terrainKit.tree(this.scene,x,z,1.3);
    for(const x of [-11,11]){
      this.box(this.root,[3,.35,1.5],[x,.04,-10.5],colors.dark);
      this.box(this.root,[2.5,.06,.08],[x,.25,-9.72],colors.cyan,.01,true);
    }
    // Wide lanes exactly match the shared deployment bounds.
    const d = MAP.deployment;
    const outerWidth = d.maxX - d.minX, outerDepth = d.maxY - d.minY;
    const northDepth = d.innerTop - d.minY, westWidth = d.innerLeft - d.minX;
    for (const z of [-1, 1]) this.box(this.root, [outerWidth, .025, northDepth], [0, .015, z * (outerDepth - northDepth) / 2], '#286875', .04);
    for (const x of [-1, 1]) this.box(this.root, [westWidth, .025, outerDepth - northDepth * 2], [x * (outerWidth - westWidth) / 2, .016, 0], '#286875', .04);
    this.box(this.root, [15.7, .06, 11.7], [0, .025, 0], '#29445c', .12);
    for (const sign of [-1, 1]) {
      this.box(this.root, [outerWidth, .035, .06], [0, .043, sign * outerDepth / 2], '#70ddec', .01, true);
      this.box(this.root, [.06, .035, outerDepth], [sign * outerWidth / 2, .043, 0], '#70ddec', .01, true);
    }
    for (const [x, z] of [[-13.4,-9.3],[13.35,9.3],[-13.4,9.3],[13.35,-9.3]]) {
      this.box(this.root, [.75, .35, .65], [x, .1, z], '#36536b', .18);
      const tree = new THREE.Group(); tree.position.set(x + .22, 0, z - .35); this.root.add(tree);
      this.cylinder(tree, .09, .65, [0, .3, 0], '#334c59', 7);
      const foliage = new THREE.Mesh(this.geometry('tree', () => new THREE.IcosahedronGeometry(.56, 0)), this.mat('#287b80')); foliage.position.y = .9; foliage.scale.y = 1.35; foliage.castShadow = true; tree.add(foliage);
      this.cylinder(this.root, .15, .5, [x - .4, .22, z + .4], '#819eb7', 8);
      this.cylinder(this.root, .11, .08, [x - .4, .51, z + .4], colors.cyan, 8, true);
    }
    // Distant infrastructure and landscaping never occupy a deployable cell.
    for(let i=0;i<10;i++) {
      const x=-24+i*5;
      this.box(this.root,[1.8,.06,.08],[x,.02,-12.3],'#7895ad',.01);
      for(const z of [-16,16]) {
        this.terrainKit.tree(this.scene,x,z,1+(i%3)*.24);
        this.box(this.root,[1.3,.25,.9],[x+1,.02,z+1],'#35586b',.16);
      }
    }
    for(const x of [-16,16])for(const z of [-7,7]) {
      this.box(this.root,[.7,.12,.7],[x,.03,z],colors.dark);
      this.cylinder(this.root,.08,2.1,[x,1.05,z],colors.slate,6);
      this.box(this.root,[.6,.12,.32],[x,2.15,z],colors.cream);
      this.box(this.root,[.5,.05,.25],[x,2.08,z],colors.cyan,.02,true);
    }
    this.batchStatic(this.root);
    this.root.traverse(node => { if (node instanceof THREE.Mesh) { node.geometry.computeBoundingBox(); const bounds = node.geometry.boundingBox!; if (bounds.max.y - bounds.min.y < .3) node.castShadow = false; } });
  }
  /** Static scenery is instanced by geometry/material to keep mobile draw calls bounded. */
  private batchStatic(parent: THREE.Group, animated: (THREE.Object3D|undefined)[] = []) {
    parent.updateMatrixWorld(true);
    const batches=new Map<string,THREE.Mesh[]>();
    parent.traverse(node=>{let ancestor:THREE.Object3D|null=node;while(ancestor&&ancestor!==parent){if(animated.includes(ancestor))return;ancestor=ancestor.parent;}if(node instanceof THREE.Mesh && !(node instanceof THREE.InstancedMesh)){const key=node.geometry.uuid+ (node.material as THREE.Material).uuid;const list=batches.get(key)??[];list.push(node);batches.set(key,list);}});
    const inverse=parent.matrixWorld.clone().invert();
    for(const meshes of batches.values()) {
      if(meshes.length<2)continue;
      const first=meshes[0],instance=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
      instance.castShadow=first.castShadow;instance.receiveShadow=true;
      meshes.forEach((mesh,i)=>{instance.setMatrixAt(i,inverse.clone().multiply(mesh.matrixWorld));mesh.removeFromParent();});parent.add(instance);
    }
  }
  private compoundEnvironment(s:Raid) {
    const level=raidLevel(s.layout,s.version), bounds=level.walls??MAP.walls;
    const g=this.compound;this.root.add(g);
    const left=bounds.left-MAP.center.x,right=bounds.right-MAP.center.x,top=bounds.top-MAP.center.y,bottom=bounds.bottom-MAP.center.y;
    // A network of inset service roads joins functional buildings, not decorative collision boxes.
    for(const b of s.buildings.filter(b=>b.kind!=='wall')) {
      const x=b.x-MAP.center.x,z=b.y-MAP.center.y;
      this.box(g,[2.15,.025,2.15],[x,.072,z],'#36566f',.08);
      this.box(g,[Math.abs(x)+.5,.022,.48],[x/2,.071,z],'#3d6079',.025);
      this.box(g,[.48,.022,Math.abs(z)+.5],[0,.071,z/2],'#3d6079',.025);
      this.box(g,[1.4,.025,.04],[x,.09,z+1.03],b.kind==='vault'?colors.gold:colors.cyan,.01,true);
    }
    // Gate posts are mounted on the neighboring wall cells; the actual breach stays clear.
    const gates=[{x:level.gate,y:bounds.top},...(level.openings??[])];
    for(const gate of gates){const x=gate.x-MAP.center.x,z=gate.y-MAP.center.y,side=gate.x===bounds.left||gate.x===bounds.right;
      this.box(g,side?[1.4,.025,1]:[1,.025,1.4],[x,.08,z],'#50717e',.01);
      for(const sign of [-1,1]) {
        this.box(g,[.22,1.22,.22],[x+(side?0:sign*.7),.65,z+(side?sign*.7:0)],colors.dark);
        this.box(g,[.24,.11,.24],[x+(side?0:sign*.7),1.3,z+(side?sign*.7:0)],colors.cyan,.02,true);
      }
      for(const offset of [-.3,0,.3])this.box(g,side?[.06,.025,.45]:[.45,.025,.06],[x+(side?offset:0),.1,z+(side?0:offset)],colors.cream,.01);
    }
    // Low inset utility channels, drainage, and planters add scale without masking troops.
    for(let x=left+1;x<right;x+=2){this.box(g,[.7,.025,.28],[x,.075,bottom-.65],'#152c43',.02);for(const dz of [-.08,.08])this.box(g,[.6,.03,.025],[x,.09,bottom-.65+dz],'#54738a',.01);}
    for(const x of [left+.65,right-.65])for(const z of [top+1.2,bottom-1.2])this.box(g,[.28,.08,.7],[x,.085,z],'#527579',.05);
    this.batchStatic(g);
  }
  private pulse(position:THREE.Vector3,color:string,size:number) {
    if(this.pulses.length>=20){const old=this.pulses.shift()!;old.mesh.removeFromParent();(old.mesh.material as THREE.Material).dispose();}
    const mesh=new THREE.Mesh(this.geometry('impact-ring',()=>new THREE.RingGeometry(.83,1,24)),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));
    mesh.rotation.x=-Math.PI/2;mesh.position.copy(position);mesh.position.y=.11;this.root.add(mesh);this.pulses.push({mesh,age:0,life:.45,size});
  }
  private health(height: number, color: string) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 20;
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.position.y = height; sprite.scale.set(1.12, .175, 1); sprite.renderOrder = 10; sprite.visible = false;
    this.paintHealth(canvas, texture, 1, color); return { hp: sprite, hpTexture: texture, hpCanvas: canvas };
  }
  private paintHealth(canvas: HTMLCanvasElement, texture: THREE.CanvasTexture, fraction: number, color: string) {
    const c = canvas.getContext('2d')!; c.clearRect(0, 0, 128, 20); c.fillStyle = '#183b43'; c.beginPath(); c.roundRect(0, 0, 128, 20, 8); c.fill();
    c.fillStyle = fraction < .3 ? '#ff756c' : color; c.beginPath(); c.roundRect(4, 4, 120 * Math.max(0, fraction), 12, 5); c.fill(); texture.needsUpdate = true;
  }
  private building(b: Building) {
    const group = new THREE.Group(), body = new THREE.Group(); group.position.copy(world(b)); group.add(body); this.root.add(group);
    let turret: THREE.Group | undefined, rotor: THREE.Object3D | undefined;
    const height = (b.kind === 'core' ? 3 : b.kind === 'vault' ? 2.1 : b.kind !== 'wall' ? 1.9 : 1.05) * (b.kind === 'wall' ? 1 : 1.18);
    if (b.kind !== 'wall') body.scale.setScalar(1.18);
    const color = b.kind === 'core' ? colors.purple : b.kind === 'vault' ? colors.gold : colors.coral;
    if (b.kind === 'wall') {
      // Wall geometry is instanced across the base; each segment still has its own HP.
    } else if (b.kind === 'core') {
      this.box(body, [1.85, .24, 1.85], [0, .16, 0], colors.dark, .14);
      this.box(body, [1.62, .18, 1.62], [0, .35, 0], colors.cream, .12);
      this.box(body, [1.24, 1.3, 1.24], [0, 1.04, 0], '#3c527e', .14);
      for (const [x,z] of [[-.66,-.66],[.66,-.66],[-.66,.66],[.66,.66]]) this.box(body, [.22, 1.65, .22], [x, 1.22, z], colors.cream, .055);
      this.box(body, [1.62, .24, 1.62], [0, 1.96, 0], colors.cream, .12);
      this.cylinder(body, .48, .14, [0, 2.17, 0], colors.dark, 8);
      rotor = new THREE.Mesh(this.geometry('core-crystal', () => new THREE.OctahedronGeometry(.51)), this.mat('#c5bdff', true)); rotor.position.y = 2.52; body.add(rotor);
      for (const side of [-1, 1]) {
        this.box(body, [.58, .5, .035], [0, 1.18, side * .632], '#9ae9f0', .04, true);
        this.box(body, [.035, .5, .58], [side * .632, 1.18, 0], '#9ae9f0', .04, true);
      }
    } else if (b.kind === 'vault') {
      this.box(body, [1.75, .23, 1.5], [0, .16, 0], colors.dark, .12);
      this.box(body, [1.5, 1.13, 1.23], [0, .82, 0], '#786445', .16);
      this.box(body, [1.65, .22, 1.37], [0, 1.45, 0], '#caa776', .12);
      this.box(body, [1.1, .92, .1], [0, .86, .64], colors.dark, .06);
      for (let i = 0; i < 3; i++) { this.box(body, [.91, .14, .06], [0, .56 + i * .27, .71], '#7fedcf', .02, true); this.box(body, [.14, .14, .07], [.32, .56 + i * .27, .75], '#f9e5ad', .02); }
      this.cylinder(body, .24, .35, [-.39, 1.7, 0], colors.gold, 8);
      this.cylinder(body, .24, .35, [.39, 1.7, 0], colors.gold, 8);
      this.box(body, [.14, .6, 1.27], [-.68, .85, 0], colors.cream, .02);
      this.box(body, [.14, .6, 1.27], [.68, .85, 0], colors.cream, .02);
    } else if(b.kind==='shield'||b.kind==='repair') {
      this.box(body,[1.5,.22,1.5],[0,.15,0],colors.dark,.12);
      this.box(body,[1,.9,1],[0,.7,0],b.kind==='shield'?'#5969a6':'#427b85',.14);
      this.cylinder(body,.56,.18,[0,1.25,0],b.kind==='shield'?'#bd9cff':'#90efab',8);
      this.cylinder(body,.16,.7,[0,1.6,0],colors.cream,8);
      if(b.kind==='shield'){const ring=new THREE.Mesh(this.geometry('shield-ring',()=>new THREE.TorusGeometry(.65,.055,6,16)),this.mat('#bd9cff',true));ring.position.y=1.7;body.add(ring);}
      else {this.box(body,[.7,.16,.16],[0,1.75,0],'#90efab',.03,true);this.box(body,[.16,.7,.16],[0,1.75,0],'#90efab',.03,true);}
    } else if(b.kind==='missile') {
      this.box(body,[1.5,.3,1.5],[0,.2,0],colors.dark,.12);
      this.box(body,[1.1,.8,1.1],[0,.75,0],'#456082',.1);
      turret=new THREE.Group();turret.position.y=1.2;body.add(turret);
      for(const x of [-.32,.32]){this.box(turret,[.45,.55,.9],[x,.15,0],'#c18c66',.06);this.cylinder(turret,.12,.55,[x,.65,0],colors.gold,6);}
    } else {
      this.box(body, [1.45, .22, 1.45], [0, .14, 0], colors.dark, .12);
      this.cylinder(body, .52, .6, [0, .54, 0], colors.cream, 8);
      this.cylinder(body, .44, .18, [0, .94, 0], '#80566f', 12);
      turret = new THREE.Group(); turret.position.y = 1.13; body.add(turret);
      this.box(turret, [.75, .45, .7], [0, .1, 0], '#a26983', .12);
      this.box(turret, [.29, .25, 1.04], [0, .18, .68], colors.dark, .05);
      this.box(turret, [.35, .3, .16], [0, .18, 1.2], colors.coral, .04, true);
      this.box(turret, [.5, .07, .37], [0, .36, 0], colors.cream, .03);
    }
    if(b.kind!=='wall') {
      // Shared architectural grammar: raised foundations, front entry, lit status band.
      this.box(body,[1.65,.12,.3],[0,.12,.9],colors.slate,.035);
      this.box(body,[.44,.065,.28],[0,.21,.91],colors.cream,.02);
      for(const side of [-1,1])this.box(body,[.07,.08,1.2],[side*.78,.29,0],b.kind==='vault'?colors.gold:colors.cyan,.02,true);
    }
    if(b.kind==='core') {
      for(const side of [-1,1]) {
        this.box(body,[.25,1.1,.72],[side*.86,.9,0],colors.dark,.055);
        for(let n=0;n<4;n++)this.box(body,[.035,.055,.54],[side*1,.57+n*.22,0],colors.cyan,.01,true);
      }
      this.cylinder(body,.045,.72,[.65,2.3,-.65],colors.cream,6);
      this.cylinder(body,.09,.1,[.65,2.7,-.65],colors.coral,6,true);
    }
    if(b.kind==='vault') {
      // Secondary vaults read as compute storage; the primary keeps warm credit stacks.
      const compute=b.id>3;
      for(const side of [-1,1]) {
        this.box(body,[.22,.8,.65],[side*.83,.75,0],colors.dark,.04);
        for(let n=0;n<3;n++)this.box(body,[.025,.07,.5],[side*.95,.5+n*.24,0],compute?colors.cyan:colors.gold,.01,true);
      }
      if(compute){this.box(body,[1.1,.32,.7],[0,1.66,0],colors.slate,.06);for(const x of [-.3,.3])this.cylinder(body,.2,.08,[x,1.86,0],colors.cyan,8,true);}
    }
    if(b.kind==='shield'||b.kind==='repair')for(const x of [-.6,.6]) {
      this.cylinder(body,.19,.7,[x,.65,0],colors.cream,8);
      this.cylinder(body,.2,.1,[x,1,0],b.kind==='shield'?colors.purple:colors.cyan,8,true);
    }
    if(b.kind==='missile')for(const x of [-.58,.58])this.box(body,[.18,.5,.75],[x,.65,0],colors.cream,.05);
    if(b.kind==='shield') {const aura=new THREE.Mesh(this.geometry('shield-aura',()=>new THREE.RingGeometry(3.91/1.18,4/1.18,48)),this.mat('#524e80'));aura.rotation.x=-Math.PI/2;aura.position.y=.045;aura.name='shield-aura';body.add(aura);}
    if(['turret','missile','shield','repair'].includes(b.kind)){const status=new THREE.Mesh(this.geometry('disabled-ring',()=>new THREE.TorusGeometry(.6,.045,5,16)),this.mat('#bd9cff',true));status.rotation.x=Math.PI/2;status.position.y=2;status.name='disabled-ring';status.visible=false;body.add(status);}
    this.batchStatic(body,[turret,rotor]);
    const health = this.health(height + .2, color); group.add(health.hp);
    return { group, body, ...health, lastHp: b.hp, lastHit: -10, born: this.clock, dead: false, turret, rotor };
  }
  private walls(buildings: Building[]) {
    const walls = buildings.filter(b => b.kind === 'wall'); walls.forEach((b, i) => this.wallIndices.set(b.id, i));
    const specs: { size: [number, number, number]; y: number; color: string; radius: number; glow?: boolean }[] = [
      { size: [.94, .66, .94], y: .36, color: '#365570', radius: .075 },
      { size: [.75, .15, .99], y: .2, color: '#182e48', radius: .025 },
      { size: [.97, .17, .97], y: .75, color: '#8ba9c1', radius: .07 },
      { size: [.65, .035, .1], y: .85, color: colors.cyan, radius: .01, glow: true },
    ];
    for (const spec of specs) {
      const g = this.geometry(`wall-${spec.y}`, () => new RoundedBoxGeometry(...spec.size, 1, spec.radius));
      const mesh = new THREE.InstancedMesh(g, this.mat(spec.color, spec.glow), walls.length); mesh.castShadow = !spec.glow; mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      walls.forEach((b, i) => mesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(b.x - MAP.center.x, spec.y, b.y - MAP.center.y)));
      mesh.instanceMatrix.needsUpdate = true; this.root.add(mesh); this.wallMeshes.push(mesh);
    }
  }
  private unit(u: Unit) {
    const group = new THREE.Group(), body = new THREE.Group(); group.position.copy(world(u)); group.add(body); this.root.add(group);
    let rotor: THREE.Object3D | undefined;
    const color = STATS[u.kind].color;
    if(u.kind==='scrap'){body.add(scrapBotModel(this.terrainKit));} else if (u.kind === 'tank') {
      this.box(body, [.67, .24, .83], [0, .24, 0], '#485e93', .075);
      for (const x of [-.34, .34]) { this.box(body, [.2, .24, .83], [x, .16, 0], '#283c55', .07); for (const z of [-.26, 0, .26]) this.box(body, [.215, .12, .09], [x, .16, z], '#7990b8', .02); }
      this.box(body, [.59, .33, .6], [0, .48, 0], '#a2b9fb', .1);
      this.box(body, [.2, .14, .46], [0, .5, .43], colors.cream, .04);
      this.box(body, [.35, .06, .06], [0, .62, .31], colors.cyan, .02, true);
    } else {
      for (const x of [-.13, .13]) this.box(body, [.14, .22, .24], [x, .15, 0], colors.dark, .04);
      this.box(body, [.46, .35, .34], [0, .4, 0], color, .09);
      this.box(body, [.37, .25, .32], [0, .68, .015], colors.cream, .08);
      this.box(body, [.28, .09, .06], [0, .68, .19], u.kind === 'scout' ? '#187b85' : '#9e502b', .025);
      if(u.kind==='medic') {
        this.box(body,[.32,.1,.08],[0,.42,.2],'#ecfff4',.015,true);this.box(body,[.1,.3,.08],[0,.42,.2],'#ecfff4',.015,true);
        this.cylinder(body,.13,.4,[-.29,.42,0],'#90efab',6);
      } else if(u.kind==='striker') {
        this.box(body,[.18,.18,.85],[.28,.43,.27],colors.dark,.04);this.box(body,[.19,.12,.16],[.28,.44,.72],color,.025,true);
        this.box(body,[.5,.08,.4],[0,.8,0],color,.035);
      } else if(u.kind==='disruptor') {
        this.cylinder(body,.04,.55,[-.2,.9,-.06],color,6);this.cylinder(body,.17,.13,[.29,.42,.15],color,8);
        const ring=new THREE.Mesh(this.geometry('disruptor-ring',()=>new THREE.TorusGeometry(.2,.035,5,12)),this.mat(color,true));ring.position.set(.29,.5,.22);body.add(ring);
      } else if (u.kind === 'breaker') {
        this.box(body, [.2, .4, .25], [-.27, .35, .04], '#db8d3d', .05);
        this.box(body, [.2, .22, .43], [.27, .35, .14], colors.dark, .06);
        const drill = new THREE.Mesh(this.geometry('drill', () => new THREE.ConeGeometry(.16, .38, 8)), this.mat('#ffdc8c')); drill.rotation.x = Math.PI / 2; drill.position.set(.27, .35, .53); body.add(drill); rotor = drill;
      } else {
        this.box(body, [.1, .3, .17], [-.28, .35, .05], color, .04);
        this.box(body, [.12, .13, .4], [.27, .4, .21], colors.dark, .04);
        this.box(body, [.15, .12, .13], [0, .7, -.2], color, .02);
      }
    }
    const health = this.health(1.08, color); health.hp.scale.set(.75, .12, 1); group.add(health.hp);
    return { group, body, ...health, lastHp: u.hp, lastHit: -10, born: this.clock, dead: false, rotor };
  }
  private burst(position: THREE.Vector3, color: string, big = false) {
    const group = new THREE.Group(); group.position.copy(position); this.root.add(group);
    const particles: Burst['particles'] = []; const count = this.reduced ? 3 : big ? 14 : 5;
    for (let i = 0; i < count; i++) {
      const a = i * 2.39996, radius = big ? .11 : .05;
      const mesh = new THREE.Mesh(this.geometry(`spark-${radius}`, () => new THREE.BoxGeometry(radius, radius, radius)), this.mat(i % 3 === 0 ? '#fff0bc' : color, true)); group.add(mesh);
      particles.push({ mesh, velocity: new THREE.Vector3(Math.cos(a) * (big ? 1.6 : .8), 1.1 + (i % 4) * .3, Math.sin(a) * (big ? 1.6 : .8)) });
    }
    this.bursts.push({ group, age: 0, life: big ? .85 : .35, particles });
    if (this.bursts.length > 24) { const old = this.bursts.shift()!; this.root.remove(old.group); }
  }
  private shot(e: Effect) {
    const group = new THREE.Group(); this.root.add(group);
    const start = world(e.from, e.source < 100 ? 1.3 : .48), end = world(e.to, e.target < 100 ? .7 : .38), delta = end.clone().sub(start);
    const melee=this.lastState?.units.some(u=>u.id===e.source&&u.kind==='scrap');
    const beam = new THREE.Mesh(this.geometry('beam', () => new THREE.CylinderGeometry(.032, .032, 1, 6)), this.mat(e.color, true));
    beam.position.copy(start.clone().add(end).multiplyScalar(.5)); beam.scale.y = delta.length(); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); if(!melee)group.add(beam);
    this.beams.set(e.id, { group, life: .17, age: 0, effect: e });
    this.burst(end, e.color);
    const attacker=this.lastState?.buildings.find(b=>b.id===e.source);
    if(attacker?.kind==='missile'||e.destroyed||e.damage<0)this.pulse(end,e.color,attacker?.kind==='missile'?1.1:e.damage<0?.6:.85);
    const source = this.visuals.get(e.source); if (source) {source.lastHit = this.clock;source.lastAttack=this.clock;}
    const target = this.visuals.get(e.target); if (target) {target.lastHit = this.clock;target.lastDamage=this.clock;}
  }
  update(s: Raid, selected: Kind, dt: number) {
    if (this.paused) return;
    this.clock += dt;
    if (s !== this.lastState) { this.clearBattle(); this.lastState = s; this.compoundEnvironment(s); this.walls(s.buildings); for (const b of s.buildings) this.visuals.set(b.id, this.building(b)); this.center.set(0, .2, 0); this.camera.position.set(7, 25, 32); this.camera.zoom = 1; this.camera.lookAt(this.center); this.camera.updateProjectionMatrix(); }
    for (const entity of [...s.buildings, ...s.units]) {
      let v = this.visuals.get(entity.id); if (!v) { v = this.unit(entity as Unit); this.visuals.set(entity.id, v); this.burst(world(entity, .1), STATS[(entity as Unit).kind].color); }
      const isUnit = entity.id >= 100;
      if(!isUnit){const disabled=((entity as Building).disabledUntil??0)>s.time;const status=v.body.getObjectByName('disabled-ring');if(status)status.visible=disabled;const aura=v.body.getObjectByName('shield-aura');if(aura)aura.visible=!disabled;}
      if (entity.hp <= 0) {
        if (!v.dead) { v.dead = true; v.destroyedAt=this.clock; v.hp.visible = false; this.burst(world(entity, .4), isUnit ? STATS[(entity as Unit).kind].color : '#ffb568', !isUnit); v.body.visible = !isUnit && entity.kind!=='wall' && !this.reduced;
          const wallIndex = this.wallIndices.get(entity.id); if (wallIndex !== undefined) for (const mesh of this.wallMeshes) { mesh.setMatrixAt(wallIndex, new THREE.Matrix4().makeScale(0, 0, 0)); mesh.instanceMatrix.needsUpdate = true; }
          if (!isUnit) { this.pulse(world(entity), '#ffb568', entity.kind==='wall'?.7:1.5); const rubble = new THREE.Group(); v.group.add(rubble); for (let i = 0; i < 4; i++) { const mesh = this.box(rubble, [.3, .16 + i * .035, .3], [Math.cos(i * 2) * .3, .13, Math.sin(i * 2) * .3], '#6a8381', .03); mesh.rotation.y = i; } }
        }
        if(v.body.visible){const collapse=Math.max(0,1-(this.clock-(v.destroyedAt??0))/.35);v.body.scale.y=1.18*collapse;v.body.position.y=-.15*(1-collapse);if(collapse===0)v.body.visible=false;}
        continue;
      }
      if (entity.hp !== v.lastHp) { v.lastHit = this.clock; this.paintHealth(v.hpCanvas, v.hpTexture, entity.hp / entity.maxHp, isUnit ? STATS[(entity as Unit).kind].color : colors.cyan); v.lastHp = entity.hp; }
      v.hp.visible = isUnit ? entity.hp < entity.maxHp : entity.hp < entity.maxHp || this.clock - v.lastHit < 1.2;
      if (isUnit) {
        const u = entity as Unit, desired = world(entity), old = v.group.position.clone(); v.group.position.lerp(desired, 1 - Math.exp(-24 * dt));
        const target = s.buildings.find(b => b.id === u.target);
        const direction = u.waypoint ? world(u.waypoint).sub(v.group.position) : target ? world(target).sub(v.group.position) : desired.clone().sub(old);
        if (direction.lengthSq() > .001) v.body.rotation.y = Math.atan2(direction.x, direction.z);
        const moving = old.distanceTo(desired) > .025;
        const bounce = this.reduced ? 0 : moving ? Math.sin(this.clock * (u.kind === 'scout' ? 18 : 11) + u.id) * .035 : 0;
        const recoil = this.reduced ? 0 : Math.max(0, 1 - (this.clock - (v.lastDamage??-10)) / .18) * .12;
        v.body.position.y = bounce; v.body.rotation.x = recoil;
        // Small cosmetic lane offsets keep agents sharing a grid path readable.
        // Their group/health/shot positions still follow the authoritative simulation.
        const crowded = s.units.some(other => other.id !== entity.id && other.hp > 0 && Math.hypot(other.x - entity.x, other.y - entity.y) < .4);
        v.body.position.x = crowded ? Math.cos(u.id * 2.4) * .16 : 0; v.body.position.z = crowded ? Math.sin(u.id * 2.4) * .16 : 0;
        if(u.kind==='scrap'&&!this.reduced){for(const [name,sign] of [['leg-left',1],['leg-right',-1]] as const){const leg=v.body.getObjectByName(name);if(leg)leg.rotation.x=moving?Math.sin(this.clock*12+u.id)*.4*sign:0;}const arm=v.body.getObjectByName('arm-right');if(arm)arm.rotation.x=!moving&&!this.reduced?Math.max(0,1-(this.clock-(v.lastAttack??-10))/.28)*-1.15:0;}
        const spawn = this.reduced ? 1 : Math.min(1, (this.clock - v.born) * 5); v.body.scale.setScalar(Math.max(.05, spawn) * (u.kind === 'tank' ? 1.12 : 1.22));
        if (v.rotor) v.rotor.rotation.y += dt * 16;
      } else {
        if (v.rotor) { v.rotor.rotation.y += dt * .7; v.rotor.position.y = 2.52 + (this.reduced ? 0 : Math.sin(this.clock * 2) * .08); }
        if (v.turret) { const target = s.units.find(u => u.id === (entity as Building).target && u.hp > 0); if (target) { const angle = Math.atan2(target.x - entity.x, target.y - entity.y); let delta = angle - v.turret.rotation.y; delta = Math.atan2(Math.sin(delta), Math.cos(delta)); v.turret.rotation.y += delta * Math.min(1, dt * 14); } else v.turret.rotation.y = Math.sin(this.clock * .4) * .65;
          v.turret.position.z = this.reduced ? 0 : -Math.max(0, 1 - (this.clock - v.lastHit) / .2) * .09;
        }
        const hit = Math.max(0, 1 - (this.clock - v.lastHit) / .18); v.body.rotation.z = this.reduced ? 0 : Math.sin(hit * 15) * hit * .025;
      }
    }
    for (const e of s.effects) if (!this.seenEffects.has(e.id)) { this.seenEffects.add(e.id); this.shot(e); }
    for (const [id, beam] of this.beams) { beam.age += dt; if (beam.age >= beam.life) { this.root.remove(beam.group); this.beams.delete(id); } }
    this.bursts = this.bursts.filter(b => { b.age += dt; for (const p of b.particles) { p.mesh.position.addScaledVector(p.velocity, dt); p.velocity.y -= dt * 4; p.mesh.scale.setScalar(Math.max(0, 1 - b.age / b.life)); p.mesh.rotation.x += dt * 4; } if (b.age >= b.life) { this.root.remove(b.group); return false; } return true; });
    this.pulses=this.pulses.filter(p=>{p.age+=dt;const t=p.age/p.life;p.mesh.scale.setScalar((.2+t)*p.size);(p.mesh.material as THREE.MeshBasicMaterial).opacity=Math.max(0,(1-t)*.65);if(t>=1){p.mesh.removeFromParent();(p.mesh.material as THREE.Material).dispose();return false;}return true;});
    this.cursor.visible = !!this.pointer && !s.ended && s.stock[selected] > 0;
    if (this.pointer) { this.cursor.position.copy(world(this.pointer, .09)); (this.cursor.material as THREE.MeshBasicMaterial).color.set(validDeployment(this.pointer) ? STATS[selected].color : '#ff6f72'); }
    this.renderer.render(this.scene, this.camera);
    if (this.clock - this.statsAt > 1) {
      this.statsAt = this.clock;
      this.renderer.domElement.dataset.drawCalls = String(this.renderer.info.render.calls);
      this.renderer.domElement.dataset.triangles = String(this.renderer.info.render.triangles);
    }
  }
  private resize() {
    this.width = this.host.clientWidth; this.height = this.host.clientHeight; if (!this.width || !this.height) return;
    this.renderer.setSize(this.width, this.height, false);
    const aspect = this.width / this.height, span = this.starterPortrait&&aspect<1?28:Math.max(34, 22 * aspect);
    const offset = aspect < 1 ? -1 : 0;
    this.camera.left = -span / 2; this.camera.right = span / 2; this.camera.top = span / aspect / 2 + offset; this.camera.bottom = -span / aspect / 2 + offset; this.camera.updateProjectionMatrix();
  }
  pick(clientX: number, clientY: number): Point | null {
    const r = this.renderer.domElement.getBoundingClientRect(); this.ray.setFromCamera(new THREE.Vector2((clientX - r.left) / r.width * 2 - 1, -(clientY - r.top) / r.height * 2 + 1), this.camera);
    const p = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3()); return p ? { x: p.x + MAP.center.x, y: p.z + MAP.center.y } : null;
  }
  hover(p: Point | null) { this.pointer = p; }
  zoom(factor: number) { this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * factor, .85, 1.55); this.camera.updateProjectionMatrix(); }
  pan(dx: number, dy: number) {
    const scale = (this.camera.right - this.camera.left) / this.width / this.camera.zoom;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1); up.y = 0; up.normalize(); right.y = 0; right.normalize();
    const next = this.center.clone().addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale); next.y = .2; const flat = new THREE.Vector2(next.x, next.z); if (flat.length() > 4) flat.setLength(4); next.x = flat.x; next.z = flat.y;
    this.camera.position.add(next.clone().sub(this.center)); this.center.copy(next); this.camera.lookAt(this.center);
  }
  private clearBattle() {
    this.compound.traverse(node=>{if(node instanceof THREE.InstancedMesh)node.dispose();});this.compound.removeFromParent();this.compound=new THREE.Group();
    for(const p of this.pulses){p.mesh.removeFromParent();(p.mesh.material as THREE.Material).dispose();}this.pulses=[];
    for (const mesh of this.wallMeshes) { this.root.remove(mesh); mesh.dispose(); } this.wallMeshes = []; this.wallIndices.clear();
    for (const v of this.visuals.values()) { v.group.traverse(node=>{if(node instanceof THREE.InstancedMesh)node.dispose();});this.root.remove(v.group); v.hpTexture.dispose(); (v.hp.material as THREE.Material).dispose(); }
    this.visuals.clear(); for (const b of this.bursts) this.root.remove(b.group); this.bursts = [];
    for (const b of this.beams.values()) this.root.remove(b.group); this.beams.clear(); this.seenEffects.clear();
  }
  dispose() {
    this.resizeObserver.disconnect(); this.clearBattle(); this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    for (const g of this.geometries.values()) g.dispose(); for (const m of this.materials.values()) m.dispose();
    this.scene.traverse(node => { if(node instanceof THREE.InstancedMesh)node.dispose(); if (node instanceof THREE.DirectionalLight) node.shadow.dispose(); });
    this.cursor.geometry.dispose(); (this.cursor.material as THREE.Material).dispose(); this.terrainKit.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  }
}
