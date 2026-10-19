import {findPath,nearestOpen,type NavPoint,type NavRect} from '../../shared/navigation';
import {FOUNDATION_PLOT as P} from '../../shared/foundation-plot';
import {FOUNDATION_BUILDINGS,buildingLayout,footprint,type FoundationState} from '../../shared/foundation';
import {obstacleSize,campusSecurityWalls} from '../../shared/landscape';
import {decorationFootprint} from '../../shared/decoration-catalog';
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
 readonly group=new THREE.Group();private k=new WorldKit('campus');private drone=securityDroneModel(this.k);private key='';private rects:NavRect[]=[];private route:NavPoint[]=[];private corners:NavPoint[]=[];private segment=0;private retryAt=0;
 constructor(){this.group.name='HQ security patrol';this.group.add(this.drone);this.drone.visible=false;}
 sync(s:FoundationState){const rects=FOUNDATION_BUILDINGS.flatMap(kind=>{const l=buildingLayout(s,kind);return l?[footprint(kind,l)]:[]});for(const o of s.landscape?.items??[]){const [w,d]=obstacleSize(o);rects.push({x:o.position[0],z:o.position[1],w,d});}for(const d of s.decorations??[])rects.push(decorationFootprint(d));rects.push(...campusSecurityWalls(s));const key=JSON.stringify(rects);if(key===this.key)return;this.key=key;this.rects=rects;const hq=footprint('hq',buildingLayout(s,'hq')!),radius=1.15;this.corners=[[-1,-1],[1,-1],[1,1],[-1,1]].flatMap(([x,z])=>{const p=nearestOpen([hq.x+x*(hq.w/2+2.2),hq.z+z*(hq.d/2+2.2)],rects,P,radius);return p?[p]:[];});const old:NavPoint=[this.drone.position.x,this.drone.position.z],start=nearestOpen(this.drone.visible?old:this.corners[0]??[hq.x,hq.z+8],rects,P,radius);this.drone.visible=!!start;if(start)this.drone.position.set(start[0],2.6,start[1]);this.route=[];this.segment=0;this.retryAt=0;}
 update(time:number,dt:number,reduced:boolean){if(!this.drone.visible)return;const p:NavPoint=[this.drone.position.x,this.drone.position.z];if(!this.route.length&&this.corners.length&&time>=this.retryAt){this.segment=(this.segment+1)%this.corners.length;this.route=findPath(p,this.corners[this.segment],this.rects,P,1.15,1);this.retryAt=this.route.length?0:time+1;}let budget=reduced?0:dt*1.5;while(budget>0&&this.route.length){const q=this.route[0],dx=q[0]-this.drone.position.x,dz=q[1]-this.drone.position.z,d=Math.hypot(dx,dz);if(d<.001){this.route.shift();continue;}const step=Math.min(d,budget);this.drone.position.x+=dx/d*step;this.drone.position.z+=dz/d*step;const angle=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(angle-this.drone.rotation.y),Math.cos(angle-this.drone.rotation.y));this.drone.rotation.y+=delta*(1-Math.exp(-dt*10));budget-=step;if(step>=d)this.route.shift();}animateSecurityDrone(this.drone,time,reduced);}
 dispose(){this.k.dispose();}
}
