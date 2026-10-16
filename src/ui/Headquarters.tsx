import { useEffect, useRef, useState } from 'react';
import { HeadquartersScene } from '../art/HeadquartersScene';
import { Garage } from '../art/Garage';
import type { GameState } from '../../shared/contracts';

export function Headquarters({state}:{state:GameState}) {
 const host=useRef<HTMLDivElement>(null),scene=useRef<HeadquartersScene|null>(null),pointers=useRef(new Map<number,{x:number;y:number}>()),pinch=useRef(0);
 const [error,setError]=useState(false);
 useEffect(()=>{let view:HeadquartersScene;let id=0,last=performance.now();setError(false);
  try{view=new HeadquartersScene(host.current!,state.hardwareLevel,state.agentLevel||0,()=>setError(true));scene.current=view;const frame=(now:number)=>{if(!document.hidden)view.update(Math.min(.05,(now-last)/1000));last=now;id=requestAnimationFrame(frame);};id=requestAnimationFrame(frame);}catch{setError(true);}
  return()=>{cancelAnimationFrame(id);view?.dispose();scene.current=null;};
 },[state.hardwareLevel,state.agentLevel]);
 const release=(id:number)=>{pointers.current.delete(id);pinch.current=0;};
 return <section className="hq-world" aria-label="Company headquarters">
  <div className="hq-canvas" ref={host} onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});pinch.current=0;}}
   onPointerMove={e=>{const before=pointers.current.get(e.pointerId);if(!before)return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.current.size>1){const [a,b]=[...pointers.current.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch.current)scene.current?.zoom(d/pinch.current);pinch.current=d;}else scene.current?.pan(e.clientX-before.x,e.clientY-before.y);}}
   onPointerUp={e=>release(e.pointerId)} onPointerCancel={e=>release(e.pointerId)} onWheel={e=>scene.current?.zoom(e.deltaY>0?.95:1.05)} onContextMenu={e=>e.preventDefault()}/>
  {error&&<div className="hq-fallback"><Garage level={state.hardwareLevel} working={false} rigLevel={state.agentLevel?1:0}/><p role="alert">3D view unavailable. Your company is safe. Reload to restore graphics.</p></div>}
  <div className="world-camera" aria-label="Headquarters camera"><button aria-label="Zoom in" onClick={()=>scene.current?.zoom(1.12)}>+</button><button aria-label="Zoom out" onClick={()=>scene.current?.zoom(1/1.12)}>−</button><button aria-label="Reset camera" onClick={()=>scene.current?.reset()}>⌖</button></div>
 </section>;
}
