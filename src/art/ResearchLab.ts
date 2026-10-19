import * as THREE from 'three';
import { WorldKit, palette as C } from './world';
export function researchLabModel(k: WorldKit) { const g = new THREE.Group(); g.name = 'Research Lab'; k.box(g, [3.9, .18, 2.9], [0, .09, 0], C.cream); k.grounding(g, 4.6, 3.6); k.box(g, [3.5, 1.9, 2.4], [0, 1.12, 0], C.cream, .12); k.box(g, [3.65, .28, 2.6], [0, 2.2, 0], C.dark, .1); k.box(g, [2.7, 1.2, .08], [-.14, 1.2, 1.24], '#203e61'); k.box(g, [2.4, .1, .09], [-.14, 1.73, 1.29], C.cyan, .02, true); for (const x of [-.9, -.15, .6]) {
    k.box(g, [.4, .65, .1], [x, 1.12, 1.31], '#8771cf', .05, true);
    k.box(g, [.24, .07, .12], [x, 1.28, 1.38], C.cyan, .01, true);
} k.box(g, [.55, 1.45, .1], [1.39, .85, 1.28], C.dark); k.box(g, [.1, .08, .06], [1.52, .9, 1.35], C.gold, .01, true); k.box(g, [2.1, .18, 1.5], [-.35, 2.44, -.15], C.slate); const core = new THREE.Group(); core.name = 'research-core'; core.position.set(-.35, 2.67, -.15); k.cylinder(core, .4, .34, [0, 0, 0], '#8771cf'); k.cylinder(core, .22, .4, [0, .04, 0], C.cyan); g.add(core); for (const x of [-1.3, 1.3])
    k.box(g, [.13, .12, 2.1], [x, 2.42, 0], C.cyan, .02, true); k.batchStatic(g, 'research-lab'); return g; }
export function animateResearchLab(g: THREE.Object3D | undefined, time: number, active: boolean, reduced: boolean) { const core = g?.getObjectByName('research-core'); if (core) {
    core.rotation.y = reduced ? 0 : time * .35;
    core.scale.setScalar(active && !reduced ? 1 + Math.sin(time * 2) * .025 : 1);
} }
