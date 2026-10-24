import {securityDroneCount,securitySolids,homePatrolPoints,HOME_DRONE_CLEARANCE} from '../../shared/security';
import {findPath,nearestOpen,type NavPoint,type NavRect} from '../../shared/navigation';
import {FOUNDATION_PLOT as P} from '../../shared/foundation-plot';
import {buildingLayout,footprint,type FoundationState} from '../../shared/foundation';
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
class SingleSecurityPatrol {

 readonly group=new THREE.Group();private k=new WorldKit('campus');private drone=securityDroneModel(this.k);private key='';private rects:NavRect[]=[];private route:NavPoint[]=[];private corners:NavPoint[]=[];private segment=0;private retryAt=0;private enabled=false;private launching=0;private launchFrom:NavPoint=[0,0];private launchTo:NavPoint=[0,0];
 get active(){return this.enabled;}get phase(){return !this.enabled?'none':this.launching>0?'launching':'patrolling';}
 constructor(private index=0){this.group.name='HQ security patrol';this.group.add(this.drone);this.drone.visible=false;}
 sync(s:FoundationState,now=Date.now()){this.enabled=securityDroneCount(s,now)>this.index;if(!this.enabled){this.drone.visible=false;this.key='';return;}const rects=securitySolids(s);const key=JSON.stringify([rects,s.droneStation]);if(key===this.key)return;this.key=key;this.rects=rects;const radius=HOME_DRONE_CLEARANCE;this.corners=homePatrolPoints(s);const station=s.droneStation!;this.launchFrom=[...station.position];this.launchTo=[...station.position];const start=nearestOpen(this.index?this.corners[2]??station.position:station.position,rects,P,radius);this.launching=1.8;this.drone.visible=!!start;if(start)this.drone.position.set(this.launchFrom[0],1.5,this.launchFrom[1]);if(start){this.launchFrom=start;this.launchTo=start;}this.route=[];this.segment=this.index*2;this.retryAt=0;}
 update(time:number,dt:number,reduced:boolean){if(!this.drone.visible||!this.enabled)return;if(reduced&&this.launching>0){this.launching=0;this.drone.position.set(this.launchTo[0],2.6,this.launchTo[1]);}if(this.launching>0){this.launching=Math.max(0,this.launching-dt);const t=1-this.launching/1.8,e=t*t*(3-2*t);this.drone.position.set(this.launchFrom[0]+(this.launchTo[0]-this.launchFrom[0])*e,1.5+1.1*e,this.launchFrom[1]+(this.launchTo[1]-this.launchFrom[1])*e);if(!reduced)for(const c of this.drone.children)if(c.name==='rotor')c.rotation.y=time*12;return;}const p:NavPoint=[this.drone.position.x,this.drone.position.z];if(!this.route.length&&this.corners.length&&time>=this.retryAt){this.segment=(this.segment+1)%this.corners.length;this.route=findPath(p,this.corners[this.segment],this.rects,P,HOME_DRONE_CLEARANCE,.5);this.retryAt=this.route.length?0:time+1;}let budget=reduced?0:dt*1.5;while(budget>0&&this.route.length){const q=this.route[0],dx=q[0]-this.drone.position.x,dz=q[1]-this.drone.position.z,d=Math.hypot(dx,dz);if(d<.001){this.route.shift();continue;}const step=Math.min(d,budget);this.drone.position.x+=dx/d*step;this.drone.position.z+=dz/d*step;const angle=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(angle-this.drone.rotation.y),Math.cos(angle-this.drone.rotation.y));this.drone.rotation.y+=delta*(1-Math.exp(-dt*10));budget-=step;if(step>=d)this.route.shift();}animateSecurityDrone(this.drone,time,reduced);}
 dispose(){this.k.dispose();}
}

export class HQSecurityPatrol {
 private patrols=[new SingleSecurityPatrol(0),new SingleSecurityPatrol(1)];readonly group=this.patrols[0].group;private second=this.patrols[1].group.children[0];
 get count(){return this.patrols.filter(p=>p.active).length;}
 get active(){return this.count>0;}
 get phase(){return this.patrols[0].phase;}
 sync(s:FoundationState,now=Date.now()){for(const p of this.patrols)p.sync(s,now);if(this.patrols[1].active)this.group.add(this.second);else this.second.removeFromParent();}
 update(time:number,dt:number,reduced:boolean){for(const p of this.patrols)p.update(time,dt,reduced);}
 dispose(){for(const p of this.patrols)p.dispose();}
}
