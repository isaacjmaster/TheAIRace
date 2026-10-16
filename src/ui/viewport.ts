/** Only the shell follows browser chrome. The mounted game state is never recreated. */
export const SCREEN_BACKGROUNDS={splash:'#07090c',menu:'#091829',game:'#0e2037'} as const;
export function setPresentationBackground(phase:keyof typeof SCREEN_BACKGROUNDS){
 const color=SCREEN_BACKGROUNDS[phase];
 document.documentElement.style.setProperty('--app-background',color);
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color);
}
export function viewportBox(standalone:boolean,dynamicUnits:boolean,innerWidth:number,innerHeight:number,visual?:{width:number;height:number;offsetTop:number;offsetLeft:number;scale:number}|null){
 // Standalone owns the full CSS viewport, including the home-indicator region.
 // Do not subtract safe-area insets or shrink the canvas when the user pinch-zooms.
 if(standalone&&dynamicUnits)return null;
 if(!standalone&&visual&&Math.abs(visual.scale-1)<.01&&visual.width>0&&visual.height>0)
  return {width:visual.width,height:visual.height,top:visual.offsetTop,left:visual.offsetLeft};
 return {width:innerWidth,height:innerHeight,top:0,left:0};
}
export function installViewport(win:Window,root:HTMLElement){
 const standalone=win.matchMedia('(display-mode: standalone)');let frame=0;
 const update=()=>{frame=0;const box=viewportBox(standalone.matches||!!(win.navigator as Navigator&{standalone?:boolean}).standalone,CSS.supports('height','100dvh'),win.innerWidth,win.innerHeight,win.visualViewport);
  for(const [name,value] of Object.entries({width:box?.width,height:box?.height,top:box?.top,left:box?.left})){
   if(value===undefined)root.style.removeProperty('--viewport-'+name);else root.style.setProperty('--viewport-'+name,value+'px');
  }
 };
 const schedule=()=>{if(!frame)frame=win.requestAnimationFrame(update);};
 update();win.addEventListener('resize',schedule);win.addEventListener('orientationchange',schedule);win.addEventListener('pageshow',schedule);win.document.addEventListener('visibilitychange',schedule);standalone.addEventListener('change',schedule);win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);
 return ()=>{win.cancelAnimationFrame(frame);win.removeEventListener('resize',schedule);win.removeEventListener('orientationchange',schedule);win.removeEventListener('pageshow',schedule);win.document.removeEventListener('visibilitychange',schedule);standalone.removeEventListener('change',schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);};
}
