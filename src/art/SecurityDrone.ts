import * as THREE from 'three';
import { WorldKit, palette as C } from './world';
export function securityDroneModel(k: WorldKit) { const g = new THREE.Group(); g.name = 'Security Drone'; k.box(g, [.9, .28, .65], [0, 0, 0], C.cream, .12); k.box(g, [.52, .16, .08], [0, -.02, .35], C.dark, .04); k.box(g, [.32, .055, .09], [0, 0, .4], C.cyan, .02, true); k.cylinder(g, .2, .15, [0, -.22, 0], C.dark); k.box(g, [.18, .08, .14], [0, -.3, .12], C.cyan, .02, true); for (const x of [-.62, .62]) {
    k.box(g, [.48, .08, .16], [x, 0, 0], C.dark);
    const rotor = new THREE.Group();
    rotor.name = 'rotor';
    rotor.position.set(x, .02, 0);
    k.cylinder(rotor, .3, .07, [0, 0, 0], C.slate);
    for (const a of [0, Math.PI / 2]) {
        const blade = k.box(rotor, [.54, .035, .07], [0, .07, 0], C.dark, .01);
        blade.rotation.y = a;
    }
    g.add(rotor);
} return g; }
export function animateSecurityDrone(g: THREE.Object3D, time: number, reduced: boolean) { g.position.y = 2.6 + (reduced ? 0 : Math.sin(time * 2) * .09); if (!reduced)
    for (const c of g.children)
        if (c.name === 'rotor')
            c.rotation.y = time * 12; }
export class HQSecurityPatrol {
    readonly group = new THREE.Group();
    private k = new WorldKit('campus');
    private drone = securityDroneModel(this.k);
    constructor() { this.group.name = 'HQ security patrol'; this.group.add(this.drone); }
    update(time: number, x: number, z: number, reduced: boolean) { const a = reduced ? .7 : time * .11; this.drone.position.set(x + Math.cos(a) * 6, 2.6, z + Math.sin(a) * 5); this.drone.rotation.y = -a; animateSecurityDrone(this.drone, time, reduced); }
    dispose() { this.k.dispose(); }
}
