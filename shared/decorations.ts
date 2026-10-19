import {ownedSecurityWalls} from './security-catalog';
import {DECORATIONS,decorationFootprint,overlapsRect,type DecorationKind,type Decoration} from './decoration-catalog';
import {FOUNDATION_BUILDINGS,buildingLayout,footprint,type FoundationState,type RigPosition,type Orientation} from './foundation';
import {FOUNDATION_PLOT as P} from './foundation-plot';
import {OBSTACLES} from './campus-layout';
import {obstacleSize,landscapeRoute,door} from './landscape';
export function validDecorationPosition(s:FoundationState,kind:DecorationKind,position:RigPosition,orientation:Orientation,ignoreId?:string,verifyAccess=true):string|null{
 if(!DECORATIONS[kind]||position.length!==2||!position.every(Number.isInteger)||![0,1,2,3].includes(orientation))return 'Choose a valid decoration position.';
 const a=decorationFootprint({kind,position,orientation});
 if(a.x-a.w/2<P.minX||a.x+a.w/2>P.maxX||a.z-a.d/2<P.minZ||a.z+a.d/2>P.maxZ)return 'Keep the decoration inside the campus.';
 if(a.z+a.d/2>7.1&&a.z-a.d/2<10.9)return 'Keep the road clear.';
 for(const k of FOUNDATION_BUILDINGS){const l=buildingLayout(s,k);if(l&&overlapsRect(a,footprint(k,l),.25))return 'Leave space around buildings.';}
 for(const o of OBSTACLES.filter(o=>o.kind==='rock'||!s.landscape&&o.kind==='tree'))if(overlapsRect(a,{x:o.position[0],z:o.position[1],w:o.width,d:o.depth},.2))return 'Choose open ground.';
 for(const o of s.landscape?.items||[]){const [w,d]=obstacleSize(o);if(overlapsRect(a,{x:o.position[0],z:o.position[1],w,d},.2))return 'Clear the obstacle first.';}
 for(const wall of ownedSecurityWalls(s))if(overlapsRect(a,wall,.2))return 'Keep Security Walls clear.';
 for(const o of s.decorations||[])if(o.id!==ignoreId&&overlapsRect(a,decorationFootprint(o),.15))return 'Leave space between decorations.';
 for(const [x,z] of [[-16,7],[13,7],[-16,11],[25,11]])if(overlapsRect(a,{x,z,w:1.4,d:1.4},.2))return 'Keep the streetlight clear.';
 if(s.landscape?.clearing?.route.some(([x,z])=>overlapsRect(a,{x,z,w:1,d:1},.2)))return 'Keep the Builder Bot’s route clear.';
 // Connectivity checks are authoritative; dragging uses the cheap footprint checks above.
 if(!verifyAccess)return null;
 const trial={...s,decorations:[...(s.decorations||[]).filter(o=>o.id!==ignoreId),{id:ignoreId||'preview',kind,position,orientation}]};
 if(!FOUNDATION_BUILDINGS.filter(k=>buildingLayout(s,k)).every(k=>landscapeRoute(trial,door(s,k)).length>0))return 'Leave a path to each building.';
 return null;
}
export function purchaseDecoration(s:FoundationState,kind:DecorationKind,position:RigPosition,orientation:Orientation,id:string){
 if(!DECORATIONS[kind])throw new Error('Choose a decoration.');const reason=validDecorationPosition(s,kind,position,orientation);if(reason)throw new Error(reason);
 const price=DECORATIONS[kind].cost;if(s.compute<price)throw new Error(`Need ${price-s.compute} more Compute`);
 if(s.decorations?.some(o=>o.id===id))throw new Error('Decoration already purchased.');
 s.compute-=price;(s.decorations??=[]).push({id,kind,position:[...position],orientation});
}
export function moveDecoration(s:FoundationState,id:string,position:RigPosition,orientation:Orientation){const o=s.decorations?.find(o=>o.id===id);if(!o)throw new Error('Decoration not found.');const reason=validDecorationPosition(s,o.kind,position,orientation,id);if(reason)throw new Error(reason);o.position=[...position];o.orientation=orientation;}
export function removeDecoration(s:FoundationState,id:string){if(!s.decorations?.some(o=>o.id===id))throw new Error('Decoration not found.');s.decorations=s.decorations.filter(o=>o.id!==id);}
