import {canPatrol} from './security';
import {ownedSecurityWalls,type OwnedWall} from './security-catalog';
import type {CompanySecurity} from './security';
import {advanceOperation,type Operation} from './infiltration';
import {ensureOwnedOperation,settleOwnedUnit,reservedAgent} from './infiltration-army';
import {advanceResearch,type ResearchLab} from './research';
import {decorationFootprint,type Decoration} from './decoration-catalog';
import {FOUNDATION_PLOT} from './foundation-plot';
import {FOUNDER_HQ,founderHqLevel,gpuRigCapacity,type FounderHQUpgrade} from './founder-hq';
import {advanceLandscape,landscapeRoute,type Landscape,obstacleSize} from './landscape';
import {createStarterRaid} from '../raid/starter';
import {deploy,tick,finish,STEP,destruction,type Raid,type Point} from '../raid/engine';
import {OBSTACLES} from './campus-layout';
export const STARTING_COMPUTE = 100;
export const COMPUTE_CAPACITY = 1000;
export const GPU_RIG={cost:50,buildSeconds:15,perMinute:10,storage:25,maxCount:2,width:4,depth:3} as const;
export type Orientation=0|1|2|3;
export type RotatableBuilding='hq'|'station'|'rig'|'rig2'|'fabricator'|'hangar'|'lab'|'droneStation';
export type BuildingLayout={position:RigPosition;orientation:Orientation;size?:'expanded'};
export const BUILDER_STATION_POSITION:RigPosition=[-1,4.8];
export type RigPosition=[number,number];
export type GpuRig={orientation?:Orientation;position:RigPosition;startedAt:number;completesAt:number;lastProducedAt:number;stored:number};
export type Hangar={size?:'expanded';orientation?:Orientation;position:RigPosition;startedAt:number;completesAt:number};
export type Fabricator={hangarSize?:'expanded';separateHangar?:boolean;orientation?:Orientation;hangarOrientation?:Orientation;position:RigPosition;hangarPosition:RigPosition;startedAt:number;completesAt:number};
export type BotRaid={id:string;simulation:Raid;lastTick:number;started:boolean;settled:boolean;reward:number;companyId?:string;result?:{mapId:string;companyId?:string;combatVersion:number;victory:boolean;previouslyCompleted:boolean|null;destruction:number;survivors:number;reason:string;reward:number}};
export const FABRICATOR={cost:50,buildSeconds:15,maxCount:1} as const;
export const HANGAR={cost:0,buildSeconds:15,maxCount:1} as const;
export const SCRAP_BOT={cost:5,trainSeconds:5,housing:1,capacity:10} as const;
export type FoundationState = {walls?:OwnedWall[];droneStation?:Hangar;security?:CompanySecurity;infiltrationTutorial?:'complete'|'skipped';infiltration?:Operation;infiltrationReserve?:{compute:number;research:number};research?:number;researchCapacity?:number;lab?:ResearchLab;decorations?:Decoration[];founderHqLevel?:1|2;hqUpgrade?:FounderHQUpgrade;starterStation?:'unplaced'|'placed';landscape?:Landscape;version:1;revision:number;companyName:string;level:number;compute:number;capacity:number;builders:number;buildersBusy?:number;rig?:GpuRig;rig2?:GpuRig;hangar?:Hangar;generation?:number;hqLayout?:BuildingLayout;stationLayout?:BuildingLayout;fabricator?:Fabricator;bots?:number;training?:number[];botRaid?:BotRaid;raidRecord?:{wins:number[];completeHistory:boolean}};
export function initialFoundation(revision=0):FoundationState{return {version:1,revision,research:0,researchCapacity:500,founderHqLevel:1,companyName:'Garage Intelligence',level:1,compute:STARTING_COMPUTE,capacity:COMPUTE_CAPACITY,builders:0,starterStation:'unplaced',raidRecord:{wins:[],completeHistory:true}};}
export const hasBuilderStation=(s:FoundationState)=>s.starterStation!=='unplaced';
export function establishBuilderStation(s:FoundationState,position:RigPosition,orientation:Orientation=0){if(hasBuilderStation(s))throw new Error('Builder Station — 1/1 Built');const reason=validFoundationPosition(s,position,'station',orientation);if(reason)throw new Error(reason);s.stationLayout={position:[...position],orientation};s.starterStation='placed';s.builders=1;s.buildersBusy=0;}
export const RIG_BOUNDS=FOUNDATION_PLOT;
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
 const rigs=[s.rig,s.rig2].filter((r):r is GpuRig=>!!r),jobs=[...rigs,s.fabricator,getHangar(s),s.lab,s.droneStation].filter((b):b is GpuRig|Fabricator|Hangar=>!!b);
 const clearing=!!s.landscape?.clearing;advanceLandscape(s,now);
 if(s.hqUpgrade&&now>=s.hqUpgrade.completesAt)s.founderHqLevel=2;
 if(jobs.length||clearing||s.hqUpgrade)s.buildersBusy=jobs.filter(b=>now<b.completesAt).length+Number(!!s.landscape?.clearing)+Number(!!s.hqUpgrade&&now<s.hqUpgrade.completesAt);
 if(s.training){const completed=s.training.filter(t=>t<=now).length;s.bots=(s.bots||0)+completed;s.training=s.training.filter(t=>t>now);}
 ensureOwnedOperation(s,now);if(s.infiltration)advanceOperation(s.infiltration,now);settleOwnedUnit(s);
 advanceResearch(s,now);advanceBotRaid(s,now);
 for(const r of rigs){const cursor=Math.max(r.lastProducedAt,r.completesAt);if(now>cursor){r.stored=Math.min(GPU_RIG.storage,r.stored+(now-cursor)*GPU_RIG.perMinute/60000);r.lastProducedAt=now;}}

 return s;
}
export function buildRig(s:FoundationState,position:RigPosition,now=Date.now(),orientation:Orientation=0){
 advanceFoundation(s,now);const owned=Number(!!s.rig)+Number(!!s.rig2);if(owned>=gpuRigCapacity(s))throw new Error(owned>=2?'GPU Rig — 2/2 Built':'Upgrade Founder HQ to Level 2 for another GPU Rig.');
 if((s.buildersBusy||0)>=s.builders)throw new Error('Your Builder Bot is busy.');
 const slot=s.rig?'rig2':'rig',reason=validFoundationPosition(s,position,slot,orientation);if(reason)throw new Error(reason);if(s.compute<GPU_RIG.cost)throw new Error('You need 50 Compute.');
 s.compute-=GPU_RIG.cost;s.buildersBusy=(s.buildersBusy||0)+1;s[slot]={orientation,position:[...position],startedAt:now,completesAt:now+GPU_RIG.buildSeconds*1000,lastProducedAt:now+GPU_RIG.buildSeconds*1000,stored:0};
}
export function moveRig(s:FoundationState,position:RigPosition,now=Date.now(),orientation?:Orientation,slot:'rig'|'rig2'='rig'){
 advanceFoundation(s,now);if(!s[slot])throw new Error('Build a GPU Rig first.');if(s.buildersBusy)throw new Error('Wait for construction to finish before moving.');const next=orientation??s[slot]!.orientation??0;const reason=validFoundationPosition(s,position,slot,next);if(reason)throw new Error(reason);s[slot]!.position=[...position];s[slot]!.orientation=next;
}
export function collectRig(s:FoundationState,now=Date.now(),slot:'rig'|'rig2'='rig'){
 advanceFoundation(s,now);if(!s[slot]||now<s[slot]!.completesAt)throw new Error('Your rig is not ready.');
 const amount=Math.min(Math.floor(s[slot]!.stored+1e-9),Math.max(0,s.capacity-s.compute));s[slot]!.stored=Math.max(0,s[slot]!.stored-amount);s.compute+=amount;return amount;
}
/** Existing saves gain optional fields only when the associated action is used. */
export function armyUsed(s:FoundationState){return reservedAgent(s.infiltration)+(s.bots||0)+(s.training?.length||0)+(!s.botRaid?.settled?(s.botRaid?.simulation.stock.scrap||0):0);}
/** Pure compatibility view: expand old Hangars only when the existing layout has room.
 * The candidate validation skips this Hangar, so this does not recurse through itself.
 * New purchases/moves persist the larger size; crowded old saves keep every coordinate. */
export function getHangar(s:FoundationState):Hangar|undefined{const h=s.hangar||(s.fabricator&&!s.fabricator.separateHangar?{size:s.fabricator.hangarSize,position:s.fabricator.hangarPosition,orientation:s.fabricator.hangarOrientation,startedAt:s.fabricator.startedAt,completesAt:s.fabricator.completesAt}:undefined);if(!h)return;const expanded=h.size==='expanded'||!validateLayout(s,h.position,'hangar',h.orientation??0,false,true);return {...h,...(expanded?{size:'expanded' as const}:{})};}
export function hangarReady(s:FoundationState,now=Date.now()){const h=getHangar(s);return !!h&&now>=h.completesAt;}
export function buildingFootprint(orientation:Orientation=0):[number,number]{return orientation%2?[3,4]:[4,3];}
export function hangarPlacement(p:RigPosition,orientation:Orientation=0):RigPosition{const offsets:RigPosition[]=[[6,0],[0,-6],[-6,0],[0,6]];return [p[0]+offsets[orientation][0],p[1]+offsets[orientation][1]];}
export const FOUNDATION_BUILDINGS:RotatableBuilding[]=['hq','station','rig','rig2','fabricator','hangar','lab','droneStation'];
export function buildingLayout(s:FoundationState,kind:RotatableBuilding):BuildingLayout|undefined{
 if(kind==='hq')return s.hqLayout??{position:[-5,-1],orientation:0};
 if(kind==='station')return !hasBuilderStation(s)?undefined:s.stationLayout??{position:[...BUILDER_STATION_POSITION],orientation:0};
 if(kind==='rig'||kind==='rig2'){const r=s[kind];return r?{position:r.position,orientation:r.orientation??0}:undefined;}
 if(kind==='lab'||kind==='droneStation'){const l=s[kind];return l?{position:l.position,orientation:l.orientation??0}:undefined;}
 if(kind==='hangar'){const h=getHangar(s);return h?{position:h.position,orientation:h.orientation??0,...(h.size?{size:h.size}:{})}:undefined;}
 return s.fabricator?{position:s.fabricator.position,orientation:s.fabricator.orientation??0}:undefined;
}
export function buildingReady(s:FoundationState,kind:RotatableBuilding,now=Date.now()){
 if(kind==='hq')return !s.hqUpgrade||now>=s.hqUpgrade.completesAt;
 if(kind==='lab'||kind==='droneStation')return !!s[kind]&&now>=s[kind]!.completesAt;
 return kind==='station'||(kind==='rig'||kind==='rig2'?!!s[kind]&&now>=s[kind]!.completesAt:kind==='fabricator'?!!s.fabricator&&now>=s.fabricator.completesAt:hangarReady(s,now));
}
export function footprint(kind:RotatableBuilding,layout:BuildingLayout,reserved=false){
 let [w,d]=kind==='droneStation'?[3,3]:kind==='hq'?(reserved?[14,10]:[9,8]):kind==='station'?(reserved?[4,3]:[2.7,1.8]):kind==='hangar'&&layout.size==='expanded'?[5.6,4.2]:[4,3];
 if(layout.orientation%2)[w,d]=[d,w];
 const [x,z]=layout.position;
 // The house's foundation extends 0.6 forward from its rotation pivot.
 const offsets:RigPosition[]=[[0,.6],[.6,0],[0,-.6],[-.6,0]],offset=kind==='hq'&&!reserved?offsets[layout.orientation]:[0,0];
 return {x:x+offset[0],z:z+offset[1],w,d};
}
function validateLayout(s:FoundationState,p:RigPosition,kind:RotatableBuilding,orientation:Orientation,pair:boolean,editing:boolean):string|null{
 const legacyStation=kind==='station'&&p[0]===BUILDER_STATION_POSITION[0]&&p[1]===BUILDER_STATION_POSITION[1];
 if(p.length!==2||!p.every(Number.isFinite)||(!legacyStation&&!p.every(Number.isInteger)))return 'Snap the building to the grid.';
 const candidates=[{kind,layout:{position:p,orientation,...(kind==='hangar'?{size:'expanded' as const}:{})}},...(pair?[{kind:'hangar' as const,layout:{position:hangarPlacement(p,orientation),orientation,size:'expanded' as const}}]:[])];
 for(const candidate of candidates){
 const a=footprint(candidate.kind,candidate.layout),b=RIG_BOUNDS;
 if(a.x-a.w/2<b.minX||a.x+a.w/2>b.maxX||a.z-a.d/2<b.minZ||a.z+a.d/2>b.maxZ)return 'Keep the building inside the campus.';
 const overlaps=(x:number,z:number,w:number,d:number,gap=0)=>Math.abs(a.x-x)<(a.w+w)/2+gap&&Math.abs(a.z-z)<(a.d+d)/2+gap;
 if(a.z+a.d/2>7.1&&a.z-a.d/2<10.9)return 'Keep the road clear.';
 for(const obstacle of OBSTACLES.filter(o=>o.kind==='rock'||!s.landscape&&o.kind==='tree'))if(overlaps(...obstacle.position,obstacle.width,obstacle.depth))return 'Choose open ground away from trees and rocks.';
 for(const o of s.landscape?.items||[]){const [w,d]=obstacleSize(o);if(overlaps(...o.position,w,d))return 'Clear the '+(o.kind==='tree'?'Tree':o.kind==='rock'?'Boulder':'Scrap Pile')+' before building here.';}
 for(const [x,z] of [[-16,7],[13,7],[-16,11],[25,11]])if(overlaps(x,z,1.4,1.4))return 'Leave space around the lights.';
 for(const wall of ownedSecurityWalls(s))if(overlaps(wall.x,wall.z,wall.w,wall.d,.15))return 'Move the Security Wall before building here.';
 for(const o of s.decorations||[]){const r=decorationFootprint(o);if(overlaps(r.x,r.z,r.w,r.d,.2))return 'Move the decoration before building here.';}
 for(const other of FOUNDATION_BUILDINGS){if(other===kind||(pair&&other==='hangar'))continue;const layout=buildingLayout(s,other);if(!layout)continue;
 const reserved=!editing&&(other==='hq'||other==='station');const o=footprint(other,layout,reserved);
 // Preserve the old protected worker area for purchases on untouched saves.
 if(reserved&&other==='station'&&!s.stationLayout)o.z=4.5;
 const landmarks=(candidate.kind==='hq'||candidate.kind==='station'||other==='hq'||other==='station');
 if(overlaps(o.x,o.z,o.w,o.d,editing&&landmarks ? .1 : reserved ? 0 : 1))return other==='hq'?'Leave space around the Founder HQ.':other==='station'?'Keep the Builder Station clear.':'Leave space between buildings.';
 }
 }
 return null;
}
export function validFoundationPosition(s:FoundationState,p:RigPosition,kind:RotatableBuilding,orientation:Orientation=0,placingPair=false){return validateLayout(s,p,kind,orientation,placingPair,false);}
export function validLayoutPosition(s:FoundationState,p:RigPosition,kind:RotatableBuilding,orientation:Orientation=0){return validateLayout(s,p,kind,orientation,false,true);}
export function moveBuilding(s:FoundationState,kind:RotatableBuilding,position:RigPosition,orientation:Orientation,now=Date.now()){
 advanceFoundation(s,now);if(s.landscape?.clearing)throw new Error('Wait for your Builder Bot to return before rearranging buildings.');if(!buildingLayout(s,kind))throw new Error('Build this structure first.');if(!buildingReady(s,kind,now))throw new Error('Wait for this building to finish construction.');
 const reason=validLayoutPosition(s,position,kind,orientation);if(reason)throw new Error(reason);
 if(kind==='droneStation'&&!canPatrol({...s,droneStation:{...s.droneStation!,position,orientation}}))throw Error('Leave a wide route for the Security Drone.');
 const layout:BuildingLayout={position:[...position],orientation};
 if(kind==='hq')s.hqLayout=layout;else if(kind==='station')s.stationLayout=layout;
 else if(kind==='rig'||kind==='rig2'){s[kind]!.position=layout.position;s[kind]!.orientation=orientation;}
 else if(kind==='lab'||kind==='droneStation'){s[kind]!.position=layout.position;s[kind]!.orientation=orientation;}
 else if(kind==='fabricator'){s.fabricator!.position=layout.position;s.fabricator!.orientation=orientation;}
 else if(s.hangar){s.hangar.position=layout.position;s.hangar.orientation=orientation;s.hangar.size='expanded';}else {s.fabricator!.hangarPosition=layout.position;s.fabricator!.hangarOrientation=orientation;s.fabricator!.hangarSize='expanded';}
}
export function rotateBuilding(s:FoundationState,kind:RotatableBuilding,orientation:Orientation,now=Date.now()){
 const layout=buildingLayout(s,kind);if(!layout)throw new Error('Build this structure first.');moveBuilding(s,kind,layout.position,orientation,now);
}
export function buildFabricator(s:FoundationState,p:RigPosition,now=Date.now(),orientation:Orientation=0,independent=true){
 advanceFoundation(s,now);if(s.fabricator)throw new Error('Bot Fabricator — 1/1 Built');
 if(!hasBuilderStation(s)||s.builders<1)throw new Error('Place your free Builder Station first.');if(s.buildersBusy)throw new Error('Your Builder Bot is busy.');
 const reason=validFoundationPosition(s,p,'fabricator',orientation,!independent);if(reason)throw new Error(reason);
 if(s.compute<FABRICATOR.cost)throw new Error('You need 50 Compute.');
 s.compute-=FABRICATOR.cost;s.fabricator={...(independent?{separateHangar:true}:{}),orientation,hangarOrientation:orientation,position:[...p],hangarPosition:hangarPlacement(p,orientation),startedAt:now,completesAt:now+15000};s.buildersBusy=1;
 s.bots??=0;s.training??=[];
}
export function buildHangar(s:FoundationState,p:RigPosition,now=Date.now(),orientation:Orientation=0){
 advanceFoundation(s,now);if(getHangar(s))throw new Error('Bot Hangar — 1/1 Built');if(!hasBuilderStation(s)||s.builders<1)throw new Error('Place your free Builder Station first.');if(s.buildersBusy)throw new Error('Your Builder Bot is busy.');const reason=validFoundationPosition(s,p,'hangar',orientation);if(reason)throw new Error(reason);s.hangar={size:'expanded',position:[...p],orientation,startedAt:now,completesAt:now+HANGAR.buildSeconds*1000};s.buildersBusy=1;s.bots??=0;
}
export function trainScrap(s:FoundationState,count:number,now=Date.now()){
 advanceFoundation(s,now);if(!s.fabricator||now<s.fabricator.completesAt)throw new Error('Finish building your Bot Fabricator first.');if(!hangarReady(s,now))throw new Error('Build and finish a Bot Hangar first.');
 if(!Number.isInteger(count)||count<1||count>10)throw new Error('Choose 1 to 10 Scrap Bots.');
 if(armyUsed(s)+count>10)throw new Error('Hangar full — finish an operation or cancel waiting bots.');
 if(s.compute<count*5)throw new Error('Each Scrap Bot costs 5 Compute.');
 s.compute-=count*5;s.training??=[];
 let cursor=Math.max(now,s.training.at(-1)||0);for(let i=0;i<count;i++){cursor+=5000;s.training.push(cursor);}
}
export function startBotRaid(s:FoundationState,id:string,layout:number,now=Date.now()){
 advanceFoundation(s,now);if(s.botRaid&&!s.botRaid.settled)throw new Error('Resume your current raid.');
 if(!s.bots)throw new Error('Train a Scrap Bot first.');
 if(layout!==0&&layout!==1)throw new Error('Choose a starter network.');
 const simulation=createStarterRaid(layout,{scout:0,tank:0,breaker:0,scrap:s.bots});
 s.botRaid={id,simulation,lastTick:now,started:false,settled:false,reward:0};s.bots=0;
}
export function advanceBotRaid(s:FoundationState,now:number){
 const r=s.botRaid;if(!r||r.settled)return;
 if(r.started&&!r.simulation.ended){const steps=Math.min(1801,Math.max(0,Math.floor((now-r.lastTick)/(STEP*1000))));
 for(let i=0;i<steps&&!r.simulation.ended;i++){tick(r.simulation);r.lastTick+=STEP*1000;}}
 if(r.simulation.ended){s.bots=(s.bots||0)+r.simulation.stock.scrap;r.simulation.stock.scrap=0;r.settled=true;
 const loot=r.simulation.buildings.filter(b=>b.kind!=='wall'&&b.hp<=0).length*15;r.reward=Math.min(45,loot,Math.max(0,s.capacity-s.compute));s.compute+=r.reward;
 if(r.simulation.combatVersion===2){const victory=r.simulation.reason==='Network cleared',layout=r.simulation.layout,record=s.raidRecord;
 r.result={mapId:layout===0?'first-contact':'stronger-network',companyId:r.companyId,combatVersion:2,victory,previouslyCompleted:record?.wins.includes(layout)?true:record?.completeHistory?false:null,destruction:destruction(r.simulation),survivors:r.simulation.units.filter(u=>u.hp>0).length,reason:r.simulation.reason,reward:r.reward};
 s.raidRecord??={wins:[],completeHistory:false};if(victory&&!s.raidRecord.wins.includes(layout))s.raidRecord.wins.push(layout);
 }}
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

export function founderHQWorkSites(s:FoundationState):RigPosition[]{
 const layout=buildingLayout(s,'hq')!,a=footprint('hq',layout),candidates:RigPosition[]=[];
 for(let x=Math.ceil(a.x-a.w/2);x<=Math.floor(a.x+a.w/2);x+=2){candidates.push([x,Math.ceil(a.z+a.d/2+1.5)],[x,Math.floor(a.z-a.d/2-1.5)]);}
 for(let z=Math.ceil(a.z-a.d/2);z<=Math.floor(a.z+a.d/2);z+=2){candidates.push([Math.ceil(a.x+a.w/2+1.5),z],[Math.floor(a.x-a.w/2-1.5),z]);}
 return candidates.filter(p=>landscapeRoute(s,p,undefined,1.1).length>0);
}
export function upgradeFounderHQ(s:FoundationState,now:number,id:string){
 advanceFoundation(s,now);
 if(founderHqLevel(s)>=FOUNDER_HQ.maxLevel)throw new Error('Founder HQ is already Level 2.');
 if(s.hqUpgrade&&now<s.hqUpgrade.completesAt)throw new Error('Founder HQ upgrade is already in progress.');
 if(!hasBuilderStation(s)||s.builders<1)throw new Error('Place your free Builder Station first.');
 if((s.buildersBusy||0)>=s.builders)throw new Error('Your Builder Bot is busy.');
 if(s.compute<FOUNDER_HQ.upgradeCost)throw new Error(`You need ${FOUNDER_HQ.upgradeCost} Compute.`);
 if(!founderHQWorkSites(s).length)throw new Error('Clear a path from the Builder Station to Founder HQ first.');
 s.compute-=FOUNDER_HQ.upgradeCost;s.hqUpgrade={id,targetLevel:2,startedAt:now,completesAt:now+FOUNDER_HQ.upgradeMs};s.buildersBusy=(s.buildersBusy||0)+1;
}
