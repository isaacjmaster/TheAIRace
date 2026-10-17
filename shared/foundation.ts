import {createRaid,deploy,tick,finish,STEP,type Raid,type Point} from '../raid/engine';
import {OBSTACLES} from './campus-layout';
export const STARTING_COMPUTE = 100;
export const COMPUTE_CAPACITY = 1000;
export const GPU_RIG={cost:50,buildSeconds:15,perMinute:5,storage:25,maxCount:1,width:4,depth:3} as const;
export type Orientation=0|1|2|3;
export type RotatableBuilding='rig'|'fabricator'|'hangar';
export const BUILDER_STATION_POSITION:RigPosition=[-1,4.8];
export type RigPosition=[number,number];
export type GpuRig={orientation?:Orientation;position:RigPosition;startedAt:number;completesAt:number;lastProducedAt:number;stored:number};
export type Fabricator={orientation?:Orientation;hangarOrientation?:Orientation;position:RigPosition;hangarPosition:RigPosition;startedAt:number;completesAt:number};
export type BotRaid={id:string;simulation:Raid;lastTick:number;started:boolean;settled:boolean;reward:number};
export const FABRICATOR={cost:50,buildSeconds:15,maxCount:1} as const;
export const SCRAP_BOT={cost:5,trainSeconds:5,housing:1,capacity:10} as const;
export type FoundationState = {version:1;revision:number;companyName:string;level:number;compute:number;capacity:number;builders:number;buildersBusy?:number;rig?:GpuRig;generation?:number;fabricator?:Fabricator;bots?:number;training?:number[];botRaid?:BotRaid};
export function initialFoundation(revision=0):FoundationState{return {version:1,revision,companyName:'Garage Intelligence',level:1,compute:STARTING_COMPUTE,capacity:COMPUTE_CAPACITY,builders:1};}
export const RIG_BOUNDS={minX:-24,maxX:28,minZ:-19,maxZ:24};
export function validRigPosition(position:RigPosition,orientation:Orientation=0):string|null{
 if(position.length!==2||!position.every(n=>Number.isFinite(n)&&Number.isInteger(n)))return 'Snap the rig to the grid.';
 const [x,z]=position,b=RIG_BOUNDS,[width,depth]=buildingFootprint(orientation);if(x-width/2<b.minX||x+width/2>b.maxX||z-depth/2<b.minZ||z+depth/2>b.maxZ)return 'Keep the rig inside the campus.';
 const overlap=(px:number,pz:number,w:number,d:number)=>Math.abs(x-px)<(width+w)/2&&Math.abs(z-pz)<(depth+d)/2;
 if(overlap(-5,-1,14,10))return 'Leave space around the garage.';
 if(overlap(-1,4.5,4,3))return 'Keep the Builder Bot’s work area clear.';
 for(const o of OBSTACLES.filter(o=>o.kind==='tree'||o.kind==='rock'))if(overlap(o.position[0],o.position[1],o.width,o.depth))return 'Choose open ground away from trees and rocks.';
 // The permanent road and its lamps are scenery, not building lots.
 if(z+depth/2>7.1&&z-depth/2<10.9)return 'Keep the road clear.';
 for(const [px,pz] of [[-16,7],[13,7],[-16,11],[25,11]])if(overlap(px,pz,1.4,1.4))return 'Leave space around the lights.';
 return null;
}
export function advanceFoundation(s:FoundationState,now=Date.now()){
 const r=s.rig,f=s.fabricator;
 if(r||f)s.buildersBusy=(r&&now<r.completesAt)||(f&&now<f.completesAt)?1:0;
 if(s.training){const completed=s.training.filter(t=>t<=now).length;s.bots=(s.bots||0)+completed;s.training=s.training.filter(t=>t>now);}
 advanceBotRaid(s,now);
 if(!r)return s;
 const cursor=Math.max(r.lastProducedAt,r.completesAt);if(now>cursor){r.stored=Math.min(GPU_RIG.storage,r.stored+(now-cursor)*GPU_RIG.perMinute/60000);r.lastProducedAt=now;}
 return s;
}
export function buildRig(s:FoundationState,position:RigPosition,now=Date.now(),orientation:Orientation=0){
 advanceFoundation(s,now);if(s.rig)throw new Error('GPU Rig — 1/1 Built');
 if((s.buildersBusy||0)>=s.builders)throw new Error('Your Builder Bot is busy.');
 const reason=validFoundationPosition(s,position,'rig',orientation);if(reason)throw new Error(reason);if(s.compute<GPU_RIG.cost)throw new Error('You need 50 Compute.');
 s.compute-=GPU_RIG.cost;s.buildersBusy=1;s.rig={orientation,position:[...position],startedAt:now,completesAt:now+GPU_RIG.buildSeconds*1000,lastProducedAt:now+GPU_RIG.buildSeconds*1000,stored:0};
}
export function moveRig(s:FoundationState,position:RigPosition,now=Date.now(),orientation?:Orientation){
 advanceFoundation(s,now);if(!s.rig)throw new Error('Build a GPU Rig first.');if(s.buildersBusy)throw new Error('Wait for construction to finish before moving.');const next=orientation??s.rig.orientation??0;const reason=validFoundationPosition(s,position,'rig',next);if(reason)throw new Error(reason);s.rig.position=[...position];s.rig.orientation=next;
}
export function collectRig(s:FoundationState,now=Date.now()){
 advanceFoundation(s,now);if(!s.rig||now<s.rig.completesAt)throw new Error('Your rig is not ready.');
 const amount=Math.min(Math.floor(s.rig.stored+1e-9),Math.max(0,s.capacity-s.compute));s.rig.stored=Math.max(0,s.rig.stored-amount);s.compute+=amount;return amount;
}
/** Existing saves gain optional fields only when the associated action is used. */
export function armyUsed(s:FoundationState){return (s.bots||0)+(s.training?.length||0)+(!s.botRaid?.settled?(s.botRaid?.simulation.stock.scrap||0):0);}
export function hangarReady(s:FoundationState,now=Date.now()){return !!s.fabricator&&now>=s.fabricator.completesAt;}
export function buildingFootprint(orientation:Orientation=0):[number,number]{return orientation%2?[3,4]:[4,3];}
export function hangarPlacement(p:RigPosition,orientation:Orientation=0):RigPosition{const offsets:RigPosition[]=[[6,0],[0,-6],[-6,0],[0,6]];return [p[0]+offsets[orientation][0],p[1]+offsets[orientation][1]];}
export function validFoundationPosition(s:FoundationState,p:RigPosition,kind:RotatableBuilding,orientation:Orientation=0,placingPair=kind==='fabricator'):string|null{
 const candidates=placingPair?[{position:p,orientation},{position:hangarPlacement(p,orientation),orientation}]:[{position:p,orientation}];
 const existing=[s.rig&&{kind:'rig',position:s.rig.position,orientation:s.rig.orientation??0},s.fabricator&&{kind:'fabricator',position:s.fabricator.position,orientation:s.fabricator.orientation??0},s.fabricator&&{kind:'hangar',position:s.fabricator.hangarPosition,orientation:s.fabricator.hangarOrientation??0}].filter((v):v is {kind:string;position:RigPosition;orientation:Orientation}=>!!v&&v.kind!==kind&&!(placingPair&&v.kind==='hangar'));
 for(const candidate of candidates){const reason=validRigPosition(candidate.position,candidate.orientation);if(reason)return reason.replaceAll('rig','building').replace('garage','Founder HQ');
 const [w,d]=buildingFootprint(candidate.orientation);
 for(const other of existing){const [ow,od]=buildingFootprint(other.orientation);if(Math.abs(candidate.position[0]-other.position[0])<(w+ow)/2+1&&Math.abs(candidate.position[1]-other.position[1])<(d+od)/2+1)return 'Leave space between buildings.';}}
 return null;
}
export function rotateBuilding(s:FoundationState,kind:RotatableBuilding,orientation:Orientation,now=Date.now()){
 advanceFoundation(s,now);
 const building=kind==='rig'?s.rig:s.fabricator;if(!building)throw new Error('Build this structure first.');
 if(now<building.completesAt)throw new Error('Wait for this building to finish construction.');
 const position=kind==='hangar'?s.fabricator!.hangarPosition:building.position;
 const reason=validFoundationPosition(s,position,kind,orientation,false);if(reason)throw new Error(reason);
 if(kind==='rig')s.rig!.orientation=orientation;else if(kind==='hangar')s.fabricator!.hangarOrientation=orientation;else s.fabricator!.orientation=orientation;
}
export function buildFabricator(s:FoundationState,p:RigPosition,now=Date.now(),orientation:Orientation=0){
 advanceFoundation(s,now);if(s.fabricator)throw new Error('Bot Fabricator — 1/1 Built');
 if(s.buildersBusy)throw new Error('Your Builder Bot is busy.');
 const reason=validFoundationPosition(s,p,'fabricator',orientation);if(reason)throw new Error(reason);
 if(s.compute<FABRICATOR.cost)throw new Error('You need 50 Compute.');
 s.compute-=FABRICATOR.cost;s.fabricator={orientation,hangarOrientation:orientation,position:[...p],hangarPosition:hangarPlacement(p,orientation),startedAt:now,completesAt:now+15000};s.buildersBusy=1;
 s.bots??=0;s.training??=[];
}
export function trainScrap(s:FoundationState,count:number,now=Date.now()){
 advanceFoundation(s,now);if(!hangarReady(s,now))throw new Error('Finish building your Bot Fabricator first.');
 if(!Number.isInteger(count)||count<1||count>10)throw new Error('Choose 1 to 10 Scrap Bots.');
 if(armyUsed(s)+count>10)throw new Error('Hangar full — deployed bots free housing.');
 if(s.compute<count*5)throw new Error('Each Scrap Bot costs 5 Compute.');
 s.compute-=count*5;s.training??=[];
 let cursor=Math.max(now,s.training.at(-1)||0);for(let i=0;i<count;i++){cursor+=5000;s.training.push(cursor);}
}
export function startBotRaid(s:FoundationState,id:string,layout:number,now=Date.now()){
 advanceFoundation(s,now);if(s.botRaid&&!s.botRaid.settled)throw new Error('Resume your current raid.');
 if(!s.bots)throw new Error('Train a Scrap Bot first.');
 if(layout!==0&&layout!==1)throw new Error('Choose a starter network.');
 const simulation=createRaid(layout,{scout:0,tank:0,breaker:0,scrap:s.bots});simulation.starter=true;
 for(const b of simulation.buildings){b.hp=b.maxHp=b.kind==='wall'?40:b.kind==='core'?300:b.kind==='vault'?120:160;}
 s.botRaid={id,simulation,lastTick:now,started:false,settled:false,reward:0};s.bots=0;
}
export function advanceBotRaid(s:FoundationState,now:number){
 const r=s.botRaid;if(!r||r.settled)return;
 if(r.started&&!r.simulation.ended){const steps=Math.min(1801,Math.max(0,Math.floor((now-r.lastTick)/(STEP*1000))));
 for(let i=0;i<steps&&!r.simulation.ended;i++){tick(r.simulation);r.lastTick+=STEP*1000;}}
 if(r.simulation.ended){s.bots=(s.bots||0)+r.simulation.stock.scrap;r.simulation.stock.scrap=0;r.settled=true;
 const loot=r.simulation.buildings.filter(b=>b.kind!=='wall'&&b.hp<=0).length*15;r.reward=Math.min(loot,Math.max(0,s.capacity-s.compute));s.compute+=r.reward;}
}
export function deployScrap(s:FoundationState,id:string,p:Point,now=Date.now()){
 advanceFoundation(s,now);const r=s.botRaid;if(!r||r.id!==id||r.settled)throw new Error('This raid has ended.');
 if(!deploy(r.simulation,'scrap',p))throw new Error('Tap open ground outside the deployment boundary.');
 if(!r.started){r.started=true;r.lastTick=now;}
}
export function retreatBots(s:FoundationState,id:string,now=Date.now()){
 advanceFoundation(s,now);const r=s.botRaid;if(!r||r.id!==id)throw new Error('Unknown raid.');if(r.settled)return;
 finish(r.simulation,'Retreated');advanceBotRaid(s,now);
}
