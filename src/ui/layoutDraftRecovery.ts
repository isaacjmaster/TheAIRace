import {layoutFingerprint,layoutInventory,layoutPlacementReason,type LayoutPlacement} from '../../shared/layout-draft';
import type {FoundationState,Orientation,RigPosition} from '../../shared/foundation';
export type SavedLayoutDraft={version:1;expected:string;placed:LayoutPlacement[];selected?:string;position:RigPosition;orientation:Orientation};
export function recoverLayoutDraft(state:FoundationState,raw:string|null):SavedLayoutDraft|null{
 try{const d=JSON.parse(raw??'null') as SavedLayoutDraft;if(!d||d.version!==1||d.expected!==layoutFingerprint(state)||!Array.isArray(d.placed))return null;
 const ids=new Set(layoutInventory(state).map(i=>i.id));
 if(new Set(d.placed.map(p=>p.id)).size!==d.placed.length||d.placed.some(p=>!ids.has(p.id)||!Array.isArray(p.position)||p.position.length!==2||layoutPlacementReason(state,d.placed,p)))return null;
 if(!Array.isArray(d.position)||d.position.length!==2||!d.position.every(Number.isFinite)||![0,1,2,3].includes(d.orientation)||d.selected&&!ids.has(d.selected))return null;
 return d;}catch{return null;}
}
/** A deliberate manual placement establishes the next cardinal direction; never skip a blocked tile. */
export function wallAdvance(from:RigPosition,to:RigPosition,fallback:RigPosition):RigPosition{
 const x=to[0]-from[0],z=to[1]-from[1];return Math.abs(x)+Math.abs(z)<.01?fallback:Math.abs(x)>=Math.abs(z)?[Math.sign(x),0]:[0,Math.sign(z)];
}
