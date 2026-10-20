import {useEffect,useRef} from 'react';
/** Original gold tutorial arrow, shared by world landmarks and UI targets. */
export function AvaArrow(){return <svg className="ava-arrow" viewBox="0 0 48 64" aria-hidden="true"><path d="M14 3h20v30h11L24 60 3 33h11Z" fill="#ffce74" stroke="#a97832" strokeWidth="2.5" strokeLinejoin="round"/><path d="M18 7h12v30h7L24 53 11 37h7Z" fill="#ffdf96"/><path d="M19 8h10" stroke="#fff4d5" strokeWidth="3" strokeLinecap="round"/></svg>}
/** Follow actual viewport rectangles, including mobile resize and catalog scrolling. */
export function AvaTargetArrow({target}:{target:string|null}){
 const arrow=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!target)return;let frame=0;
 const update=()=>{const node=arrow.current,element=document.querySelector<HTMLElement>(target);
 if(node){let rect=element?.getBoundingClientRect();const catalog=element?.closest('.build-catalog')?.getBoundingClientRect();if(rect&&catalog)rect=new DOMRect(rect.left,Math.max(rect.top,catalog.top),rect.width,Math.max(0,Math.min(rect.bottom,catalog.bottom)-Math.max(rect.top,catalog.top)));const visible=!!element&&getComputedStyle(element).visibility!=='hidden'&&!!rect&&rect.width>0&&rect.height>0&&rect.right>0&&rect.left<innerWidth&&rect.bottom>0&&rect.top<innerHeight&&!element.closest('[inert]');node.hidden=!visible;
 if(visible&&rect){const inside=target.includes('.build-card-image'),below=!inside&&(rect.top<80||target==='.research-hud > svg');node.dataset.direction=below?'up':'down';node.style.left=Math.max(28,Math.min(innerWidth-28,rect.left+rect.width/2))+'px';node.style.top=(inside?rect.top+Math.min(rect.height*.75,75):below?rect.bottom+8:rect.top-8)+'px';}}
 frame=requestAnimationFrame(update);};update();return()=>cancelAnimationFrame(frame);
 },[target]);
 return target?<div key={target} ref={arrow} data-target={target} className="ava-target-arrow" hidden aria-hidden="true"><AvaArrow/></div>:null;
}
