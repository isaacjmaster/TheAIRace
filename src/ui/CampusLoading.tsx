import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import './campus-loading.css';
import {CAMPUS_LOADING_MS,CAMPUS_FADE_MS,loadingProgress} from './loadingTiming';
/** Owner timing: 4.65s linear sequence, then a readiness-gated 350ms fade. */
export function CampusLoading({active,ready,progress,onComplete}:{active:boolean;ready:boolean;progress:MutableRefObject<number>;onComplete:()=>void}){
 const [value,setValue]=useState(0),[leaving,setLeaving]=useState(false),elapsed=useRef(0),done=useRef(onComplete);done.current=onComplete;
 useEffect(()=>{let frame=0,last=performance.now();const draw=(now:number)=>{const dt=now-last;last=now;if(active&&!document.hidden)elapsed.current+=Math.min(dt,100);const next=loadingProgress(elapsed.current,ready);progress.current=next;setValue(next);frame=requestAnimationFrame(draw);};frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);},[active,ready,progress]);
 useEffect(()=>{const finished=active&&ready&&value>=1;setLeaving(finished);if(!finished)return;const t=setTimeout(()=>done.current(),matchMedia('(prefers-reduced-motion: reduce)').matches?0:CAMPUS_FADE_MS);return()=>clearTimeout(t);},[active,ready,value]);
 useEffect(()=>{document.documentElement.toggleAttribute('data-campus-leaving',leaving);return()=>document.documentElement.removeAttribute('data-campus-leaving');},[leaving]);
 return <div className="campus-loading" data-duration={CAMPUS_LOADING_MS}><div className="campus-loading-track" role="progressbar" aria-label="Loading Founder HQ" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value*100)}><span style={{transform:`scaleX(${value})`}}/></div><p role="status">Loading</p></div>;
}
