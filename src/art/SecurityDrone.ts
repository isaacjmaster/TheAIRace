import {separateDronePositions} from '../../shared/drone-separation';
import {DRONE_ALTITUDE,droneGuardPosition,securityDroneCount,securitySolids,homePatrolPoints,HOME_DRONE_CLEARANCE} from '../../shared/security';
import {findPath,nearestOpen,segmentClear,type NavPoint,type NavRect} from '../../shared/navigation';
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
export function animateSecurityDrone(g: THREE.Object3D, time: number, reduced: boolean, altitude=2.6) { g.position.y = altitude + (reduced ? 0 : Math.sin(time * 2) * .09); if (!reduced)
    for (const c of g.children)
        if (c.name === 'rotor')
            c.rotation.y = time * 12; }
class SingleSecurityPatrol {

 readonly group=new THREE.Group();private k=new WorldKit('campus');private drone=securityDroneModel(this.k);private key='';private stationKey='';private rects:NavRect[]=[];private route:NavPoint[]=[];private corners:NavPoint[]=[];private segment=0;private retryAt=0;private enabled=false;private launching=0;private launchFrom:NavPoint=[0,0];private launchTo:NavPoint=[0,0];
 get active(){return this.enabled;}get phase(){return !this.enabled?'none':this.launching>0?'launching':'patrolling';}
 constructor(private index=0){this.group.name='HQ security patrol';this.group.add(this.drone);this.drone.visible=false;}
 sync(s:FoundationState,now=Date.now()){this.enabled=securityDroneCount(s,now)>this.index;if(!this.enabled){this.drone.visible=false;this.key='';return;}const rects:NavRect[]=[];const key=JSON.stringify([s.droneStation,droneGuardPosition(s,this.index)]);if(key===this.key)return;const stationKey=JSON.stringify(s.droneStation),previous=this.key&&this.stationKey===stationKey&&this.drone.visible?this.position:null;this.stationKey=stationKey;this.key=key;this.rects=rects;const radius=HOME_DRONE_CLEARANCE;this.corners=homePatrolPoints(s,this.index);const station=s.droneStation!;this.launchFrom=[...station.position];this.launchTo=[...station.position];const start=nearestOpen(previous??[station.position[0]+this.index*1.8,station.position[1]],rects,P,radius);this.launching=previous?0:1.8;this.drone.visible=!!start;if(start)this.drone.position.set(start[0],1.5+this.index*.65,start[1]);if(start){this.launchFrom=start;this.launchTo=start;}this.route=[];this.segment=this.index*2;this.retryAt=0;}
 update(time:number,dt:number,reduced:boolean){if(!this.drone.visible||!this.enabled)return;if(reduced&&this.launching>0){this.launching=0;this.drone.position.set(this.launchTo[0],DRONE_ALTITUDE,this.launchTo[1]);}if(this.launching>0){this.launching=Math.max(0,this.launching-dt);const t=1-this.launching/1.8,e=t*t*(3-2*t);this.drone.position.set(this.launchFrom[0]+(this.launchTo[0]-this.launchFrom[0])*e,1.5+(DRONE_ALTITUDE-1.5)*e+this.index*.65,this.launchFrom[1]+(this.launchTo[1]-this.launchFrom[1])*e);if(!reduced)for(const c of this.drone.children)if(c.name==='rotor')c.rotation.y=time*12;return;}const p:NavPoint=[this.drone.position.x,this.drone.position.z];if(!this.route.length&&this.corners.length&&time>=this.retryAt){this.segment=(this.segment+1)%this.corners.length;this.route=findPath(p,this.corners[this.segment],this.rects,P,HOME_DRONE_CLEARANCE,.5);this.retryAt=this.route.length?0:time+1;}let budget=reduced?0:dt*1.5;while(budget>0&&this.route.length){const q=this.route[0],dx=q[0]-this.drone.position.x,dz=q[1]-this.drone.position.z,d=Math.hypot(dx,dz);if(d<.001){this.route.shift();continue;}const step=Math.min(d,budget);this.drone.position.x+=dx/d*step;this.drone.position.z+=dz/d*step;const angle=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(angle-this.drone.rotation.y),Math.cos(angle-this.drone.rotation.y));this.drone.rotation.y+=delta*(1-Math.exp(-dt*10));budget-=step;if(step>=d)this.route.shift();}animateSecurityDrone(this.drone,time+this.index*.8,reduced,DRONE_ALTITUDE);this.drone.position.y+=this.index*.65;}
 highlight(active:boolean){this.drone.scale.setScalar(active?1.25:1);}
 get position():NavPoint{return [this.drone.position.x,this.drone.position.z];}
 canSeparate(from:NavPoint,to:NavPoint){return segmentClear(from,to,this.rects,P,HOME_DRONE_CLEARANCE);}
 separate(p:NavPoint){if(Math.hypot(p[0]-this.drone.position.x,p[1]-this.drone.position.z)>.001){this.drone.position.x=p[0];this.drone.position.z=p[1];this.route=[];}}
 dispose(){this.k.dispose();}
}

export class HQSecurityPatrol {
 private patrols=[new SingleSecurityPatrol(0),new SingleSecurityPatrol(1)];readonly group=this.patrols[0].group;private second=this.patrols[1].group.children[0];
 highlight(index:number|undefined){this.patrols.forEach((p,i)=>p.highlight(i===index));}
 get count(){return this.patrols.filter(p=>p.active).length;}
 get active(){return this.count>0;}
 get phase(){return this.patrols[0].phase;}
 sync(s:FoundationState,now=Date.now()){for(const p of this.patrols)p.sync(s,now);if(this.patrols[1].active)this.group.add(this.second);else this.second.removeFromParent();}
 update(time:number,dt:number,reduced:boolean){for(const p of this.patrols)p.update(time,dt,reduced);const active=this.patrols.filter(p=>p.active),positions=separateDronePositions(active.map(p=>p.position),dt,(i,a,b)=>active[i].canSeparate(a,b));active.forEach((p,i)=>p.separate(positions[i]));}
 dispose(){for(const p of this.patrols)p.dispose();}
}
