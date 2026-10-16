import { useEffect, useRef, useState } from 'react';
import { HeadquartersScene } from '../art/HeadquartersScene';
import { Garage } from '../art/Garage';
import type { GameState } from '../../shared/contracts';
import { ensureCampus, type BuildingId } from '../../shared/progression';

type Pointer = {x:number;y:number;startX:number;startY:number;moved:boolean};
export function Headquarters({state,onSelect}:{state:GameState;onSelect:(id:BuildingId)=>void}) {
 const host=useRef<HTMLDivElement>(null),scene=useRef<HeadquartersScene|null>(null),pointers=useRef(new Map<number,Pointer>()),pinch=useRef(0);
 const previousView=useRef<{hq:number;camera:{x:number;z:number;zoom:number}}|null>(null);
 const [error,setError]=useState(false);
 const campus=state.campus||ensureCampus(structuredClone(state));
 const campusKey=JSON.stringify({hq:campus.hq,buildings:campus.buildings,construction:campus.construction?.id});
 useEffect(()=>{let view:HeadquartersScene;let id=0,last=performance.now();setError(false);
  try{view=new HeadquartersScene(host.current!,state.hardwareLevel,state.agentLevel||0,campus,()=>setError(true));scene.current=view;if(previousView.current?.hq===campus.hq)view.restore(previousView.current.camera);const frame=(now:number)=>{if(!document.hidden)view.update(Math.min(.05,(now-last)/1000));last=now;id=requestAnimationFrame(frame);};id=requestAnimationFrame(frame);}catch{setError(true);}
  return()=>{cancelAnimationFrame(id);if(view)previousView.current={hq:campus.hq,camera:view.snapshot()};view?.dispose();scene.current=null;pointers.current.clear();};
 },[state.hardwareLevel,state.agentLevel,campusKey]);
 const release=(id:number)=>{pointers.current.delete(id);pinch.current=0;};
 return <section className="hq-world" aria-label="Company headquarters">
  <div className="hq-canvas" ref={host} onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});pinch.current=0;if(pointers.current.size>1)for(const p of pointers.current.values())p.moved=true;}}
   onPointerMove={e=>{const before=pointers.current.get(e.pointerId);if(!before)return;const moved=before.moved||Math.hypot(e.clientX-before.startX,e.clientY-before.startY)>8;pointers.current.set(e.pointerId,{...before,x:e.clientX,y:e.clientY,moved});if(pointers.current.size>1){const [a,b]=[...pointers.current.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch.current)scene.current?.zoom(d/pinch.current);pinch.current=d;}else if(moved)scene.current?.pan(e.clientX-before.x,e.clientY-before.y);}}
   onPointerUp={e=>{const p=pointers.current.get(e.pointerId);if(p&&!p.moved&&pointers.current.size===1){const id=scene.current?.pick(e.clientX,e.clientY);if(id)onSelect(id);}release(e.pointerId);}} onPointerCancel={e=>release(e.pointerId)} onLostPointerCapture={e=>release(e.pointerId)} onWheel={e=>scene.current?.zoom(e.deltaY>0?.95:1.05)} onContextMenu={e=>e.preventDefault()}/>
  {error&&<div className="hq-fallback"><Garage level={Math.min(2,state.hardwareLevel)} working={false} rigLevel={state.agentLevel?1:0}/><p role="alert">3D view unavailable. Your company is safe. Reload to restore graphics.</p></div>}
  <div className="world-camera" aria-label="Headquarters camera"><button aria-label="Zoom in" onClick={()=>scene.current?.zoom(1.12)}>+</button><button aria-label="Zoom out" onClick={()=>scene.current?.zoom(1/1.12)}>−</button><button aria-label="Reset camera" onClick={()=>scene.current?.reset()}>⌖</button></div>
 </section>;
}
