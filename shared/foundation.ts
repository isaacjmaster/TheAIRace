import {OBSTACLES} from './campus-layout';
export const STARTING_COMPUTE = 100;
export const COMPUTE_CAPACITY = 1000;
export const GPU_RIG={cost:50,buildSeconds:15,perMinute:5,storage:25,maxCount:1,width:4,depth:3} as const;
export type RigPosition=[number,number];
export type GpuRig={position:RigPosition;startedAt:number;completesAt:number;lastProducedAt:number;stored:number};
export type FoundationState = {version:1;revision:number;companyName:string;level:number;compute:number;capacity:number;builders:number;buildersBusy?:number;rig?:GpuRig;generation?:number};
export function initialFoundation(revision=0):FoundationState{return {version:1,revision,companyName:'Garage Intelligence',level:1,compute:STARTING_COMPUTE,capacity:COMPUTE_CAPACITY,builders:1};}
export const RIG_BOUNDS={minX:-24,maxX:28,minZ:-19,maxZ:24};
export function validRigPosition(position:RigPosition):string|null{
 if(position.length!==2||!position.every(n=>Number.isFinite(n)&&Number.isInteger(n)))return 'Snap the rig to the grid.';
 const [x,z]=position,b=RIG_BOUNDS;if(x-2<b.minX||x+2>b.maxX||z-1.5<b.minZ||z+1.5>b.maxZ)return 'Keep the rig inside the campus.';
 const overlap=(px:number,pz:number,w:number,d:number)=>Math.abs(x-px)<(4+w)/2&&Math.abs(z-pz)<(3+d)/2;
 if(overlap(-5,-1,14,10))return 'Leave space around the garage.';
 if(overlap(-1,4.5,4,3))return 'Keep the Builder Bot’s work area clear.';
 for(const o of OBSTACLES.filter(o=>o.kind==='tree'||o.kind==='rock'))if(overlap(o.position[0],o.position[1],o.width,o.depth))return 'Choose open ground away from trees and rocks.';
 // The permanent road and its lamps are scenery, not building lots.
 if(z+1.5>7.1&&z-1.5<10.9)return 'Keep the road clear.';
 for(const [px,pz] of [[-16,7],[13,7],[-16,11],[25,11]])if(overlap(px,pz,1.4,1.4))return 'Leave space around the lights.';
 return null;
}
export function advanceFoundation(s:FoundationState,now=Date.now()){
 const r=s.rig;if(!r)return s;
 s.buildersBusy=now<r.completesAt?1:0;
 const cursor=Math.max(r.lastProducedAt,r.completesAt);if(now>cursor){r.stored=Math.min(GPU_RIG.storage,r.stored+(now-cursor)*GPU_RIG.perMinute/60000);r.lastProducedAt=now;}
 return s;
}
export function buildRig(s:FoundationState,position:RigPosition,now=Date.now()){
 advanceFoundation(s,now);if(s.rig)throw new Error('GPU Rig — 1/1 Built');
 if((s.buildersBusy||0)>=s.builders)throw new Error('Your Builder Bot is busy.');
 const reason=validRigPosition(position);if(reason)throw new Error(reason);if(s.compute<GPU_RIG.cost)throw new Error('You need 50 Compute.');
 s.compute-=GPU_RIG.cost;s.buildersBusy=1;s.rig={position:[...position],startedAt:now,completesAt:now+GPU_RIG.buildSeconds*1000,lastProducedAt:now+GPU_RIG.buildSeconds*1000,stored:0};
}
export function moveRig(s:FoundationState,position:RigPosition,now=Date.now()){
 advanceFoundation(s,now);if(!s.rig)throw new Error('Build a GPU Rig first.');if(s.buildersBusy)throw new Error('Wait for construction to finish before moving.');const reason=validRigPosition(position);if(reason)throw new Error(reason);s.rig.position=[...position];
}
export function collectRig(s:FoundationState,now=Date.now()){
 advanceFoundation(s,now);if(!s.rig||s.buildersBusy)throw new Error('Your rig is not ready.');
 const amount=Math.min(Math.floor(s.rig.stored+1e-9),Math.max(0,s.capacity-s.compute));s.rig.stored=Math.max(0,s.rig.stored-amount);s.compute+=amount;return amount;
}
