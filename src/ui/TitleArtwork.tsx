import {useEffect,useRef,useState} from 'react';
import type {TitleDiorama} from '../art/TitleDiorama';

/** Decorative menu scene only: no player state, input handling, or game simulation. */
export function TitleArtwork({active=true}:{active?:boolean}){
 const host=useRef<HTMLDivElement>(null),scene=useRef<TitleDiorama|null>(null),activeRef=useRef(active);
 const [failed,setFailed]=useState(false);activeRef.current=active;
 useEffect(()=>{let cancelled=false;
  void import('../art/TitleDiorama').then(({TitleDiorama})=>{if(cancelled||!host.current)return;scene.current=new TitleDiorama(host.current,()=>setFailed(true));scene.current.setActive(activeRef.current);}).catch(()=>{if(!cancelled)setFailed(true);});
  return ()=>{cancelled=true;scene.current?.dispose();scene.current=null;};
 },[]);
 useEffect(()=>{scene.current?.setActive(active);},[active]);
 return <div className="title-artwork" aria-hidden="true"><div className="title-diorama" ref={host} hidden={failed}/>{failed&&<svg className="title-scene-fallback" viewBox="0 0 480 340"><path d="M40 200 240 85 440 200 240 315Z" fill="#24b9b4"/><path d="M40 184 240 69 440 184 240 299Z" fill="#fffbe8"/><path d="m120 162 80-46 76 44v80l-76 44-80-46Z" fill="#f1f5ef"/><path d="m105 163 95-79 90 73-90 53Z" fill="#294a60"/><path d="m155 191 42 24v36l-42-24Z" fill="#ffd359"/><path d="m306 180 47-27 38 22v55l-47 27-38-22Z" fill="#294a60"/><circle cx="325" cy="212" r="12" fill="#33d9d5"/><circle cx="350" cy="227" r="12" fill="#33d9d5"/></svg>}</div>;
}
