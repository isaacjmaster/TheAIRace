import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import type {TitleDiorama} from '../art/TitleDiorama';
import {TitleFallback} from './TitleFallback';

/** Decorative menu scene only: no player state, input handling, or game simulation. */
export function TitleArtwork({active=true,progress,onReady}:{active?:boolean;progress?:MutableRefObject<number>;onReady?:()=>void}){
 const host=useRef<HTMLDivElement>(null),scene=useRef<TitleDiorama|null>(null),activeRef=useRef(active);
 const ready=useRef(onReady);ready.current=onReady;
 const [failed,setFailed]=useState(false);activeRef.current=active;
 useEffect(()=>{let cancelled=false;
  void import('../art/TitleDiorama').then(({TitleDiorama})=>{if(cancelled||!host.current)return;scene.current=new TitleDiorama(host.current,()=>{setFailed(true);ready.current?.();});scene.current.setStartupProgress(()=>progress?.current??1);scene.current.setActive(activeRef.current);ready.current?.();}).catch(()=>{if(!cancelled){setFailed(true);ready.current?.();}});
  return ()=>{cancelled=true;scene.current?.dispose();scene.current=null;};
 },[]);
 useEffect(()=>{scene.current?.setActive(active);},[active]);
 return <div className="title-artwork" aria-hidden="true"><div className="title-diorama" ref={host} hidden={failed}/>{failed&&<TitleFallback/>}</div>;
}
