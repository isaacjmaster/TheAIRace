/** CSS owns the dynamic viewport, matching Maze Sprint's working mobile approach. */
export const SCREEN_BACKGROUNDS={splash:'#07090c',menu:'#ace8f5',game:'#b5eafa'} as const;
export function setPresentationBackground(phase:keyof typeof SCREEN_BACKGROUNDS){
 const color=SCREEN_BACKGROUNDS[phase];
 document.documentElement.dataset.presentation=phase;
 document.documentElement.style.setProperty('--app-background',color);
 // The standalone native region can paint the page background rather than artwork.
 // Keep the studio fade's endpoint synchronized with the menu sky, not HQ blue.
 document.documentElement.style.setProperty('--title-sky-color',SCREEN_BACKGROUNDS.menu);
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color);
}
export function fallbackViewportHeight(dynamicUnits:boolean,innerHeight:number){
 return dynamicUnits||innerHeight<=0?null:innerHeight;
}
export function installViewport(win:Window,root:HTMLElement){
 // Safari and standalone share CSS sizing; visualViewport offsets must not move
 // or shrink the whole page away from the region WebKit can paint.
 if(CSS.supports('height','100dvh'))return ()=>{};
 let frame=0;
 const update=()=>{frame=0;const height=fallbackViewportHeight(false,win.innerHeight);if(height!==null)root.style.setProperty('--legacy-viewport-height',height+'px');};
 const schedule=()=>{if(!frame)frame=win.requestAnimationFrame(update);};
 update();win.addEventListener('resize',schedule);win.addEventListener('orientationchange',schedule);win.addEventListener('pageshow',schedule);
 return ()=>{win.cancelAnimationFrame(frame);win.removeEventListener('resize',schedule);win.removeEventListener('orientationchange',schedule);win.removeEventListener('pageshow',schedule);};
}
