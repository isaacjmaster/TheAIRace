import {useEffect,useState} from 'react';
import type {AvaPose as Pose} from '../../shared/ava';
const cache=new Map<Pose,{src?:string;pending:Promise<string|null>}>();
/** Keep one decoded, versioned portrait per pose for this app session. */
export function preloadAvaPortrait(pose:Pose):Promise<string|null>{
 const existing=cache.get(pose);if(existing)return existing.pending;
 if(typeof Image==='undefined')return Promise.resolve(null);
 const record:{src?:string;pending:Promise<string|null>}={pending:Promise.resolve(null)};
 record.pending=(async()=>{let src:string|undefined;try{
  const response=await fetch(`/characters/ava/${pose}-v4.webp`,{cache:'force-cache',priority:pose==='welcome'?'high':'auto',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Portrait unavailable');
  // A local URL avoids a second network revalidation when React mounts the image.
  src=URL.createObjectURL(await response.blob());const image=new Image();image.decoding='async';image.src=src;await image.decode();record.src=src;return src;
 }catch{if(src)URL.revokeObjectURL(src);cache.delete(pose);return null;}})();cache.set(pose,record);return record.pending;
}
export function useAvaPortrait(pose:Pose,enabled:boolean){
 const [src,setSrc]=useState<string|undefined>(()=>cache.get(pose)?.src);
 useEffect(()=>{if(!enabled)return;let live=true;void preloadAvaPortrait(pose).then(value=>{if(live&&value)setSrc(value);});return()=>{live=false;};},[pose,enabled]);
 return src;
}
