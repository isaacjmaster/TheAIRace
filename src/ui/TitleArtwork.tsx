import {useEffect,useRef,useState} from 'react';
import type {TitleDiorama} from '../art/TitleDiorama';
import {TitleFallback} from './TitleFallback';

/** Decorative menu scene only: no player state, input handling, or game simulation. */
export function TitleArtwork({active=true}:{active?:boolean}){
 const host=useRef<HTMLDivElement>(null),scene=useRef<TitleDiorama|null>(null),activeRef=useRef(active);
 const [failed,setFailed]=useState(false);activeRef.current=active;
 useEffect(()=>{let cancelled=false;
  void import('../art/TitleDiorama').then(({TitleDiorama})=>{if(cancelled||!host.current)return;scene.current=new TitleDiorama(host.current,()=>setFailed(true));scene.current.setActive(activeRef.current);}).catch(()=>{if(!cancelled)setFailed(true);});
  return ()=>{cancelled=true;scene.current?.dispose();scene.current=null;};
 },[]);
 useEffect(()=>{scene.current?.setActive(active);},[active]);
 return <div className="title-artwork" aria-hidden="true"><div className="title-diorama" ref={host} hidden={failed}/>{failed&&<TitleFallback/>}</div>;
}
