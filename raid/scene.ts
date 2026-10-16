import { palette as colors, lightWorld, material } from '../src/art/world';
import { MAP } from './level';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { STATS, validDeployment, type Building, type Effect, type Kind, type Point, type Raid, type Unit } from './engine';

type Visual = { group: THREE.Group; body: THREE.Group; hp: THREE.Sprite; hpTexture: THREE.CanvasTexture; hpCanvas: HTMLCanvasElement; lastHp: number; lastHit: number; born: number; turret?: THREE.Group; rotor?: THREE.Object3D; dead: boolean };
type Burst = { group: THREE.Group; age: number; life: number; particles: { mesh: THREE.Mesh; velocity: THREE.Vector3 }[] };
const world = (p: Point, height = 0) => new THREE.Vector3(p.x - MAP.center.x, height, p.y - MAP.center.y);


/** Read-only view of the engine. Every shot, death, position and HP comes from Raid. */
export class RaidScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera();
  private root = new THREE.Group();
  private visuals = new Map<number, Visual>();
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

  constructor(readonly host: HTMLDivElement, readonly onError: (message: string) => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    lightWorld(this.renderer, this.scene);
    this.renderer.domElement.setAttribute('aria-label', '3D raid battlefield. Tap the mint perimeter to deploy. Drag to move the camera.');
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
    this.box(this.scene, [200, .2, 200], [0, -1.45, 0], '#9bbdb7', .05);
    this.box(this.root, [28.1, .65, 20.1], [0, -.65, 0], '#496c70', .3);
    this.box(this.root, [28.3, .24, 20.3], [0, -.23, 0], '#dbd7b1', .22);
    this.box(this.root, [28.05, .16, 20.05], [0, -.08, 0], '#76b393', .22);
    // Wide lanes exactly match the shared deployment bounds.
    const d = MAP.deployment;
    const outerWidth = d.maxX - d.minX, outerDepth = d.maxY - d.minY;
    const northDepth = d.innerTop - d.minY, westWidth = d.innerLeft - d.minX;
    for (const z of [-1, 1]) this.box(this.root, [outerWidth, .025, northDepth], [0, .015, z * (outerDepth - northDepth) / 2], '#58d0a9', .04);
    for (const x of [-1, 1]) this.box(this.root, [westWidth, .025, outerDepth - northDepth * 2], [x * (outerWidth - westWidth) / 2, .016, 0], '#58d0a9', .04);
    this.box(this.root, [13.7, .06, 9.7], [0, .025, 0], '#a4bcb3', .12);
    // Broad walkways and separate structure pads keep the larger courtyard readable.
    this.box(this.root, [11.8, .025, 1.35], [0, .065, 0], '#b6cac0', .04);
    this.box(this.root, [1.35, .025, 7.8], [0, .066, 0], '#b6cac0', .04);
    for (const [x, z] of [[0, 0], [-4, -2], [4, -2], [-4, 2], [4, 2]]) this.box(this.root, [2.3, .025, 2.3], [x, .067, z], '#b6cac0', .05);
    for (const sign of [-1, 1]) {
      this.box(this.root, [outerWidth, .035, .06], [0, .043, sign * outerDepth / 2], '#dcfff0', .01, true);
      this.box(this.root, [.06, .035, outerDepth], [sign * outerWidth / 2, .043, 0], '#dcfff0', .01, true);
    }
    for (const [x, z] of [[-13.4,-9.3],[13.35,9.3],[-13.4,9.3],[13.35,-9.3]]) {
      this.box(this.root, [.75, .35, .65], [x, .1, z], '#759b96', .18);
      const tree = new THREE.Group(); tree.position.set(x + .22, 0, z - .35); this.root.add(tree);
      this.cylinder(tree, .09, .65, [0, .3, 0], '#637c64', 7);
      const foliage = new THREE.Mesh(this.geometry('tree', () => new THREE.IcosahedronGeometry(.56, 0)), this.mat('#3f997e')); foliage.position.y = .9; foliage.scale.y = 1.35; foliage.castShadow = true; tree.add(foliage);
      this.cylinder(this.root, .15, .5, [x - .4, .22, z + .4], '#e6ecd5', 8);
      this.cylinder(this.root, .11, .08, [x - .4, .51, z + .4], colors.cyan, 8, true);
    }
    // Cables lead the eye to the central network.
    this.box(this.root, [11.5, .025, .08], [0, .083, 0], '#648b8a', .02);
    this.box(this.root, [.08, .025, 7.5], [0, .084, 0], '#648b8a', .02);
    this.root.traverse(node => { if (node instanceof THREE.Mesh) { node.geometry.computeBoundingBox(); const bounds = node.geometry.boundingBox!; if (bounds.max.y - bounds.min.y < .3) node.castShadow = false; } });
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
    const height = (b.kind === 'core' ? 3 : b.kind === 'vault' ? 2.1 : b.kind === 'turret' ? 1.9 : 1.05) * (b.kind === 'wall' ? 1 : 1.18);
    if (b.kind !== 'wall') body.scale.setScalar(1.18);
    const color = b.kind === 'core' ? colors.purple : b.kind === 'vault' ? colors.gold : colors.coral;
    if (b.kind === 'wall') {
      // Wall geometry is instanced across the base; each segment still has its own HP.
    } else if (b.kind === 'core') {
      this.box(body, [1.85, .24, 1.85], [0, .16, 0], colors.dark, .14);
      this.box(body, [1.62, .18, 1.62], [0, .35, 0], colors.cream, .12);
      this.box(body, [1.24, 1.3, 1.24], [0, 1.04, 0], '#716bb6', .14);
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
      this.box(body, [1.5, 1.13, 1.23], [0, .82, 0], '#d79b48', .16);
      this.box(body, [1.65, .22, 1.37], [0, 1.45, 0], '#ffe2a1', .12);
      this.box(body, [1.1, .92, .1], [0, .86, .64], colors.dark, .06);
      for (let i = 0; i < 3; i++) { this.box(body, [.91, .14, .06], [0, .56 + i * .27, .71], '#7fedcf', .02, true); this.box(body, [.14, .14, .07], [.32, .56 + i * .27, .75], '#f9e5ad', .02); }
      this.cylinder(body, .24, .35, [-.39, 1.7, 0], colors.gold, 8);
      this.cylinder(body, .24, .35, [.39, 1.7, 0], colors.gold, 8);
      this.box(body, [.14, .6, 1.27], [-.68, .85, 0], colors.cream, .02);
      this.box(body, [.14, .6, 1.27], [.68, .85, 0], colors.cream, .02);
    } else {
      this.box(body, [1.45, .22, 1.45], [0, .14, 0], colors.dark, .12);
      this.cylinder(body, .52, .6, [0, .54, 0], colors.cream, 8);
      this.cylinder(body, .44, .18, [0, .94, 0], '#d9627c', 12);
      turret = new THREE.Group(); turret.position.y = 1.13; body.add(turret);
      this.box(turret, [.75, .45, .7], [0, .1, 0], '#ed92a3', .12);
      this.box(turret, [.29, .25, 1.04], [0, .18, .68], colors.dark, .05);
      this.box(turret, [.35, .3, .16], [0, .18, 1.2], colors.coral, .04, true);
      this.box(turret, [.5, .07, .37], [0, .36, 0], colors.cream, .03);
    }
    const health = this.health(height + .2, color); group.add(health.hp);
    return { group, body, ...health, lastHp: b.hp, lastHit: -10, born: this.clock, dead: false, turret, rotor };
  }
  private walls(buildings: Building[]) {
    const walls = buildings.filter(b => b.kind === 'wall'); walls.forEach((b, i) => this.wallIndices.set(b.id, i));
    const specs: { size: [number, number, number]; y: number; color: string; radius: number; glow?: boolean }[] = [
      { size: [.94, .66, .94], y: .36, color: '#617c8a', radius: .075 },
      { size: [.97, .17, .97], y: .75, color: '#d4e3d7', radius: .07 },
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
    if (u.kind === 'tank') {
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
      if (u.kind === 'breaker') {
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
    const beam = new THREE.Mesh(this.geometry('beam', () => new THREE.CylinderGeometry(.032, .032, 1, 6)), this.mat(e.color, true));
    beam.position.copy(start.clone().add(end).multiplyScalar(.5)); beam.scale.y = delta.length(); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); group.add(beam);
    this.beams.set(e.id, { group, life: .17, age: 0, effect: e });
    this.burst(end, e.color);
    const source = this.visuals.get(e.source); if (source) source.lastHit = this.clock;
    const target = this.visuals.get(e.target); if (target) target.lastHit = this.clock;
  }
  update(s: Raid, selected: Kind, dt: number) {
    if (this.paused) return;
    this.clock += dt;
    if (s !== this.lastState) { this.clearBattle(); this.lastState = s; this.walls(s.buildings); for (const b of s.buildings) this.visuals.set(b.id, this.building(b)); this.center.set(0, .2, 0); this.camera.position.set(7, 25, 32); this.camera.zoom = 1; this.camera.lookAt(this.center); this.camera.updateProjectionMatrix(); }
    for (const entity of [...s.buildings, ...s.units]) {
      let v = this.visuals.get(entity.id); if (!v) { v = this.unit(entity as Unit); this.visuals.set(entity.id, v); this.burst(world(entity, .1), STATS[(entity as Unit).kind].color); }
      const isUnit = entity.id >= 100;
      if (entity.hp <= 0) {
        if (!v.dead) { v.dead = true; v.hp.visible = false; this.burst(world(entity, .4), isUnit ? STATS[(entity as Unit).kind].color : '#ffb568', !isUnit); v.body.visible = false;
          const wallIndex = this.wallIndices.get(entity.id); if (wallIndex !== undefined) for (const mesh of this.wallMeshes) { mesh.setMatrixAt(wallIndex, new THREE.Matrix4().makeScale(0, 0, 0)); mesh.instanceMatrix.needsUpdate = true; }
          if (!isUnit) { const rubble = new THREE.Group(); v.group.add(rubble); for (let i = 0; i < 4; i++) { const mesh = this.box(rubble, [.3, .16 + i * .035, .3], [Math.cos(i * 2) * .3, .13, Math.sin(i * 2) * .3], '#6a8381', .03); mesh.rotation.y = i; } }
        } continue;
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
        const recoil = this.reduced ? 0 : Math.max(0, 1 - (this.clock - v.lastHit) / .18) * .08;
        v.body.position.y = bounce; v.body.rotation.x = recoil;
        // Small cosmetic lane offsets keep agents sharing a grid path readable.
        // Their group/health/shot positions still follow the authoritative simulation.
        const crowded = s.units.some(other => other.id !== entity.id && other.hp > 0 && Math.hypot(other.x - entity.x, other.y - entity.y) < .4);
        v.body.position.x = crowded ? Math.cos(u.id * 2.4) * .16 : 0; v.body.position.z = crowded ? Math.sin(u.id * 2.4) * .16 : 0;
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
    const aspect = this.width / this.height, span = Math.max(34, 22 * aspect);
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
    for (const mesh of this.wallMeshes) { this.root.remove(mesh); mesh.dispose(); } this.wallMeshes = []; this.wallIndices.clear();
    for (const v of this.visuals.values()) { this.root.remove(v.group); v.hpTexture.dispose(); (v.hp.material as THREE.Material).dispose(); }
    this.visuals.clear(); for (const b of this.bursts) this.root.remove(b.group); this.bursts = [];
    for (const b of this.beams.values()) this.root.remove(b.group); this.beams.clear(); this.seenEffects.clear();
  }
  dispose() {
    this.resizeObserver.disconnect(); this.clearBattle(); this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    for (const g of this.geometries.values()) g.dispose(); for (const m of this.materials.values()) m.dispose();
    this.scene.traverse(node => { if (node instanceof THREE.DirectionalLight) node.shadow.dispose(); });
    this.cursor.geometry.dispose(); (this.cursor.material as THREE.Material).dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  }
}
