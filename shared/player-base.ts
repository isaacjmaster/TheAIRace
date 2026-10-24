import {FOUNDATION_BUILDINGS,buildingLayout,footprint,initialFoundation,type FoundationState,type RotatableBuilding,type BuildingLayout} from './foundation';
import {founderHqLevel,founderBuilderCapacity} from './founder-hq';
import {FOUNDATION_PLOT} from './foundation-plot';
import {DECORATIONS,type Decoration} from './decoration-catalog';
import type {OwnedWall} from './security-catalog';
import type {LandscapeObstacle} from './landscape';
export type PublicCompany={id:string;name:string;level:number;hqLevel:1|2;influence:number;rank:number|null;visitable:boolean;message?:string};
export type PublicBuilding=BuildingLayout&{id:RotatableBuilding;level:1|2;complete:boolean};
/** Only visual geometry leaves the server. Never include the owner's save, resources or credentials. */
export type PublicBase={version:1;companyId:string;capturedAt:number;buildings:PublicBuilding[];walls:OwnedWall[];decorations:Decoration[];scenery:LandscapeObstacle[]};
const position=(p:unknown):p is [number,number]=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=FOUNDATION_PLOT.minX&&p[0]<=FOUNDATION_PLOT.maxX&&p[1]>=FOUNDATION_PLOT.minZ&&p[1]<=FOUNDATION_PLOT.maxZ;
const layout=(b:BuildingLayout)=>position(b.position)&&Number.isInteger(b.orientation)&&b.orientation>=0&&b.orientation<=3;
export function publicBase(s:FoundationState,companyId:string,now:number):PublicBase|null{
 try{const buildings:PublicBuilding[]=[];for(const id of FOUNDATION_BUILDINGS){const b=buildingLayout(s,id);if(!b)continue;if(!layout(b))return null;const job=id==='hq'?s.hqUpgrade:id==='station'?undefined:id==='hangar'?s.hangar??s.fabricator:s[id];buildings.push({id,position:[...b.position],orientation:b.orientation,...(b.size?{size:b.size}:{}),level:id==='hq'?(s.hqUpgrade&&now>=s.hqUpgrade.completesAt?2:founderHqLevel(s)):1,complete:!job||now>=job.completesAt});}
 const walls=s.walls??[];if(walls.length>512||walls.some(w=>!layout(w)||typeof w.id!=='string'))return null;
 return {version:1,companyId,capturedAt:now,buildings,walls:walls.map(w=>({id:w.id,position:[...w.position],orientation:w.orientation})),decorations:(s.decorations??[]).filter(d=>layout(d)&&Object.hasOwn(DECORATIONS,d.kind)).slice(0,512).map(d=>({id:d.id,kind:d.kind,position:[...d.position],orientation:d.orientation})),scenery:(s.landscape?.items??[]).filter(o=>position(o.position)&&['tree','rock','scrap'].includes(o.kind)).slice(0,40).map(o=>({id:o.id,kind:o.kind,position:[...o.position],variant:Number.isInteger(o.variant)?o.variant:0}))};
 }catch{return null;}
}
/** Reconstitute a presentation-only state for the existing HQ renderer. All private values are absent/zero. */
export function baseVisualState(b:PublicBase):FoundationState{
 const s=initialFoundation();s.compute=0;s.builders=0;s.starterStation='unplaced';s.walls=structuredClone(b.walls);s.decorations=structuredClone(b.decorations);s.landscape={version:1,epoch:'public',sequence:0,nextSpawnAt:Number.MAX_SAFE_INTEGER,items:structuredClone(b.scenery),pendingCompute:0};
 for(const v of b.buildings){const shape={position:[...v.position] as [number,number],orientation:v.orientation},job={...shape,startedAt:0,completesAt:v.complete?0:Number.MAX_SAFE_INTEGER};if(v.id==='hq'){s.hqLayout=shape;s.founderHqLevel=v.level;}else if(v.id==='station'){s.stationLayout=shape;s.starterStation='placed';}else if(v.id==='rig'||v.id==='rig2'||v.id==='lab')s[v.id]={...job,lastProducedAt:b.capturedAt,stored:0};else if(v.id==='hangar')s.hangar={...job,size:v.size};else if(v.id==='fabricator')s.fabricator={...job,separateHangar:true,hangarPosition:b.buildings.find(x=>x.id==='hangar')?.position??shape.position};else if(v.id==='sentinel')s.sentinel=job;else s.droneStation=job;}
 if(s.starterStation==='placed')s.builders=founderBuilderCapacity(s);
 return s;
}
export const publicFootprint=(v:PublicBuilding)=>footprint(v.id,v);
export type PlayerScout={id:string;company:PublicCompany;base:PublicBase;eligibleAt:number;expiresAt:number;serverTime:number};
export type PvPHistory={breachTokens?:boolean[];id:string;opponent:PublicCompany;outcome:string;destruction:number;influence:number;finishedAt:number};
