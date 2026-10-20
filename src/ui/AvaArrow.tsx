import {useEffect,useRef} from 'react';
/** Original gold tutorial arrow, shared by world landmarks and UI targets. */
export function AvaArrow(){return <svg className="ava-arrow" viewBox="0 0 48 64" aria-hidden="true"><path d="M14 3h20v30h11L24 60 3 33h11Z" fill="#ffce74" stroke="#a97832" strokeWidth="2.5" strokeLinejoin="round"/><path d="M18 7h12v30h7L24 53 11 37h7Z" fill="#ffdf96"/><path d="M19 8h10" stroke="#fff4d5" strokeWidth="3" strokeLinecap="round"/></svg>}
/** Follow actual viewport rectangles, including mobile resize and catalog scrolling. */
export function AvaTargetArrow({target}:{target:string|null}){
 const arrow=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!target)return;let frame=0;
 const update=()=>{const node=arrow.current,element=document.querySelector<HTMLElement>(target);
 if(node){
 const rect=element?.getBoundingClientRect(),catalog=element?.closest('.build-catalog'),isCard=!!element?.matches('.build-card');
 let visible=!!element&&getComputedStyle(element).visibility!=='hidden'&&!!rect&&rect.width>0&&rect.height>0&&rect.right>0&&rect.left<innerWidth&&rect.bottom>0&&rect.top<innerHeight&&!element.closest('[inert]');
 if(visible&&rect){
 const below=!isCard&&(rect.top<80||target==='.research-hud > svg');
 const x=Math.max(28,Math.min(innerWidth-28,rect.left+rect.width/2)),y=below?rect.bottom+8:rect.top-8;
 if(isCard&&catalog){
 // The entire arrow must fit in the visible catalog gutter, clear of tabs and card content.
 const bounds=catalog.getBoundingClientRect(),tabs=catalog.parentElement?.querySelector('.build-tabs')?.getBoundingClientRect();
 const clipTop=Math.max(0,bounds.top,tabs?.bottom??0),clipBottom=Math.min(innerHeight,bounds.bottom);
 const height=parseFloat(getComputedStyle(node).height);
 visible=y-height-6>=clipTop&&y<=clipBottom&&rect.top<clipBottom&&rect.left>=0&&rect.right<=innerWidth;
 }
 node.dataset.direction=below?'up':'down';node.style.left=x+'px';node.style.top=y+'px';
 }
 node.hidden=!visible;
 }

 };
 const tick=()=>{update();frame=requestAnimationFrame(tick);};tick();
 // Scroll events update immediately too, including WebKit's asynchronous overflow scrolling.
 document.addEventListener('scroll',update,true);window.addEventListener('resize',update);
 return()=>{cancelAnimationFrame(frame);document.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);};
 },[target]);
 return target?<div key={target} ref={arrow} data-target={target} className="ava-target-arrow" hidden aria-hidden="true"><AvaArrow/></div>:null;
}
