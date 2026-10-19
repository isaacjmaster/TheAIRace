import {CloudCurtain,cloudsAvailable,CLOUD_REVEAL_MS} from './CloudCurtain';
import {useEffect,useRef,useState} from 'react';
import type {AvaProgress} from '../../shared/ava';
import './company-opening.css';
/** Persist the claim before showing motion. A reload resumes Ava, never the entire cinematic. */
export function useCompanyOpening({ava,enabled,ready,companyKey,suppressed,claim}:{ava:AvaProgress|null;enabled:boolean;ready:boolean;companyKey:string;suppressed:boolean;claim:()=>Promise<boolean|undefined>}){
 const [playing,setPlaying]=useState(false);
 const [running,setRunning]=useState<string|null>(null),[bypassed,setBypassed]=useState('');
 const claimed=useRef(''),claimRef=useRef(claim);claimRef.current=claim;
 const pending=enabled&&ava?.status==='active'&&ava.opening==='pending';
 useEffect(()=>{
  if(!enabled){setRunning(null);return;}
  if(!ready||!pending||claimed.current===companyKey)return;
  let cancelled=false,timer:ReturnType<typeof setTimeout>|undefined;
  claimed.current=companyKey;
  // Mark running before the response changes Ava's saved flag, avoiding a one-frame HUD flash.
  setPlaying(false);setRunning(companyKey);
  void claimRef.current().then(async ok=>{if(cancelled)return;if(!ok){setRunning(null);setBypassed(companyKey);return;}
   const artReady=await cloudsAvailable();if(cancelled)return;setPlaying(true);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   timer=setTimeout(()=>setRunning(null),suppressed||reduced||!artReady?0:CLOUD_REVEAL_MS);
  });
  return()=>{cancelled=true;clearTimeout(timer);};
 // Claim's saved flag changes during this effect; it must not cancel the reveal timer.
 },[enabled,ready,companyKey]);
 useEffect(()=>{if(ava?.status!=='active')setRunning(null);},[ava?.status]);
 useEffect(()=>{if(!running)return;const motion=matchMedia('(prefers-reduced-motion: reduce)'),finish=()=>setRunning(null),visibility=()=>{if(document.hidden)finish();};document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',finish);motion.addEventListener('change',finish);return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',finish);motion.removeEventListener('change',finish);};},[running]);
 return {concealed:enabled&&ava?.status==='active'&&(pending&&bypassed!==companyKey||running===companyKey),animating:playing&&running===companyKey&&ava?.status==='active'&&!suppressed};
}
export const CompanyOpening=CloudCurtain;
