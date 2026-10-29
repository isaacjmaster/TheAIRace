import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {TitleFallback} from './TitleFallback';

/** Promotional art only; loading readiness and account recovery remain live UI. */
export function TitleArtwork({onReady}:{active?:boolean;progress?:MutableRefObject<number>;onReady?:()=>void}){
 const ready=useRef(onReady);ready.current=onReady;
 const [failed,setFailed]=useState(false);
 // Cached images and load failures both release the decorative-art readiness gate.
 const image=useRef<HTMLImageElement>(null);
 useEffect(()=>{if(image.current?.complete)ready.current?.();},[]);
 return <div className="title-artwork" aria-hidden="true">{failed?<TitleFallback/>:<img ref={image} className="title-promo" src="/art/loading-campus-v2.webp" alt="" fetchPriority="high" onLoad={()=>ready.current?.()} onError={()=>{setFailed(true);ready.current?.();}}/>}</div>;
}
