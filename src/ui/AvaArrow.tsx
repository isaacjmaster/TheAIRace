import {useEffect,useRef} from 'react';
/** Original gold tutorial arrow, shared by world landmarks and UI targets. */
export function AvaArrow(){return <svg className="ava-arrow" viewBox="0 0 48 64" aria-hidden="true"><path d="M14 3h20v30h11L24 60 3 33h11Z" fill="#ffce74" stroke="#a97832" strokeWidth="2.5" strokeLinejoin="round"/><path d="M18 7h12v30h7L24 53 11 37h7Z" fill="#ffdf96"/><path d="M19 8h10" stroke="#fff4d5" strokeWidth="3" strokeLinecap="round"/></svg>}
/** Follow actual viewport rectangles, including mobile resize and catalog scrolling. */
export function AvaTargetArrow({target}:{target:string|null}){
 const arrow=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!target)return;let frame=0;
 const update=()=>{const node=arrow.current,element=document.querySelector<HTMLElement>(target);
 if(node){const rect=element?.getBoundingClientRect();const visible=!!element&&!!rect&&rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight&&!element.closest('[inert]');node.hidden=!visible;
 if(visible&&rect){const below=rect.top<80;node.dataset.direction=below?'up':'down';node.style.left=Math.max(28,Math.min(innerWidth-28,rect.left+rect.width/2))+'px';node.style.top=(below?rect.bottom+8:rect.top-8)+'px';}}
 frame=requestAnimationFrame(update);};update();return()=>cancelAnimationFrame(frame);
 },[target]);
 return target?<div key={target} ref={arrow} className="ava-target-arrow" hidden aria-hidden="true"><AvaArrow/></div>:null;
}
