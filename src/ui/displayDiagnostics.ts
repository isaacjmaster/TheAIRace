/** Deliberately exports only geometry, never page text, URLs, storage or game state. */
export function bottomGap(parentBottom:number,childBottom:number){return Math.round(Math.max(0,parentBottom-childBottom)*100)/100;}
export function displayMode(standalone:boolean,displayStandalone:boolean){return standalone||displayStandalone?'standalone':'browser';}
export function installDisplayDiagnostics(autoOpen=false){
 if(document.getElementById('display-diagnostics'))return;
 const selectors=['html','body','#root','.race-app','.game-session','.studio-splash','.race-menu','.scene-loading','.foundation-home','.foundation-world','.foundation-world canvas'];
 const number=(v:number)=>Math.round(v*100)/100;
 const rect=(e:Element)=>{const r=e.getBoundingClientRect();return {x:number(r.x),y:number(r.y),width:number(r.width),height:number(r.height),bottom:number(r.bottom)};};
 const styles=['height','min-height','max-height','width','position','top','bottom','overflow-x','overflow-y','background-color','background-image','padding-top','padding-bottom','margin-top','margin-bottom','box-sizing','transform','contain','color-scheme'];
 const probes=new Map<string,HTMLDivElement>();
 for(const unit of ['100vh','100svh','100lvh','100dvh','100%','fixed-inset']){
  const p=document.createElement('div');p.setAttribute('aria-hidden','true');p.style.cssText='position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;contain:strict;';
  if(unit==='fixed-inset')p.style.bottom='0';else p.style.height=unit;
  document.body.append(p);probes.set(unit,p);
 }
 const safe=document.createElement('div');safe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;width:0;height:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';document.body.append(safe);
 const host=document.createElement('div');host.id='display-diagnostics';document.body.append(host);
 const shadow=host.attachShadow({mode:'open'});
 shadow.innerHTML=`<style>:host{display:block;position:fixed;z-index:2147483647;top:calc(env(safe-area-inset-top,0px) + 8px);left:50%;transform:translateX(-50%);font:16px system-ui;color:#142c42}button{min-height:52px;border:1px solid #44697b;border-radius:8px;background:#fffbea;color:#142c42;padding:6px 10px;font:inherit}section{width:min(340px,90vw);max-height:65vh;max-height:65dvh;overflow:auto;background:#fffbea;border:2px solid #44697b;padding:10px;border-radius:12px;box-sizing:border-box}section[hidden]{display:none}textarea{box-sizing:border-box;width:100%;height:160px;font:10px monospace}p{margin:8px 0}nav{display:grid;grid-template-columns:1fr 1fr;gap:8px}nav button:last-child{grid-column:1/-1}</style><button id="toggle">Display diagnostics</button><section hidden><b>AI Race diagnostics v2</b><p>No cookies, saves, names, IP addresses or page text. Nothing is uploaded.</p><nav><button id="capture">Capture</button><button id="copy">Copy Report</button><button id="close">Hide</button></nav><p id="status" role="status"></p><textarea readonly aria-label="Display diagnostic report"></textarea></section>`;
 const panel=shadow.querySelector('section')!,output=shadow.querySelector('textarea')!,status=shadow.querySelector('#status')!;
 panel.hidden=!autoOpen;
 let manifestInfo:unknown={status:'pending'};
 const manifestLink=document.querySelector<HTMLLinkElement>('link[rel=manifest]');
 if(manifestLink)void fetch(manifestLink.href,{cache:'no-store'}).then(r=>r.json()).then(m=>{manifestInfo={display:m.display,orientation:m.orientation,startPath:typeof m.start_url==='string'?m.start_url.split('?')[0]:null,scope:m.scope,background:m.background_color,theme:m.theme_color};capture('manifest-loaded');}).catch(()=>{manifestInfo={status:'unavailable'};});
 const history:unknown[]=[];const started=performance.now();
 function capture(reason:string){
  const vv=window.visualViewport,ss=getComputedStyle(safe);
  const elements=Object.fromEntries(selectors.map(selector=>{const e=document.querySelector(selector);if(!e)return[selector,null];const cs=getComputedStyle(e);return[selector,{rect:rect(e),client:[e.clientWidth,e.clientHeight],scroll:[e.scrollWidth,e.scrollHeight],style:Object.fromEntries(styles.map(k=>[k,cs.getPropertyValue(k)])),...(e instanceof HTMLCanvasElement?{buffer:[e.width,e.height]}:{})}];}));
  const root=document.querySelector('#root')!,canvas=document.querySelector('.foundation-world canvas');
  const points=[window.innerHeight-1,...(vv?[vv.offsetTop+vv.height-1]:[])].map(y=>({x:number(innerWidth/2),y:number(y),layers:document.elementsFromPoint(innerWidth/2,y).filter(e=>selectors.some(s=>e.matches(s))).map(e=>selectors.find(s=>e.matches(s)))}));
  const snapshot={reason,elapsedMs:Math.round(performance.now()-started),phase:document.querySelector('.studio-splash')?'splash':document.querySelector('.race-menu')?'title':document.querySelector('.foundation-home')?'hq':'before-game-mount',mode:displayMode((navigator as Navigator&{standalone?:boolean}).standalone===true,matchMedia('(display-mode: standalone)').matches),iosVersion:/OS (\d+[\d_]*) like Mac OS X/.exec(navigator.userAgent)?.[1]?.replaceAll('_','.')||null,visibility:document.visibilityState,window:{innerWidth,innerHeight,scrollX,scrollY,dpr:devicePixelRatio,screen:{width:screen.width,height:screen.height},clientHeight:document.documentElement.clientHeight},visualViewport:vv?{width:number(vv.width),height:number(vv.height),offsetTop:number(vv.offsetTop),offsetLeft:number(vv.offsetLeft),pageTop:number(vv.pageTop),scale:vv.scale}:null,probes:Object.fromEntries([...probes].map(([u,p])=>[u,rect(p)])),safeArea:{top:ss.paddingTop,right:ss.paddingRight,bottom:ss.paddingBottom,left:ss.paddingLeft},meta:{viewport:document.querySelector('meta[name="viewport"]')?.getAttribute('content'),appleStatusBar:document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute('content')},elements,edgeHits:points,gaps:{innerToRoot:bottomGap(innerHeight,root.getBoundingClientRect().bottom),rootToCanvas:canvas?bottomGap(root.getBoundingClientRect().bottom,canvas.getBoundingClientRect().bottom):null}};
  history.push(snapshot);if(history.length>24)history.shift();output.value=JSON.stringify({schema:1,release:'20af739+diagnostics-v2',runtime:{secureContext:isSecureContext,serviceWorkerSupported:'serviceWorker' in navigator,serviceWorkerControlled:!!navigator.serviceWorker?.controller,appleStandalone:(navigator as Navigator&{standalone?:boolean}).standalone===true,displayStandalone:matchMedia('(display-mode: standalone)').matches,diagnosticRoute:location.pathname==='/display-diagnostics',manifest:manifestInfo},note:'Physical screen minus viewport is not proof of a CSS gap. Compare with screenshot. Probe elements are invisible; layout is unmodified.',snapshots:history},null,2);
  status.textContent=`${snapshot.mode} · ${snapshot.phase} · inner ${innerHeight} · root ${rect(root).height} · ${history.length} captures`;
 }
 shadow.querySelector('#toggle')!.addEventListener('click',()=>{capture('open-panel');panel.hidden=!panel.hidden;});
 shadow.querySelector('#close')!.addEventListener('click',()=>{panel.hidden=true;});
 shadow.querySelector('#capture')!.addEventListener('click',()=>capture('user-band-visible'));
 shadow.querySelector('#copy')!.addEventListener('click',async()=>{capture('copy');try{await navigator.clipboard.writeText(output.value);status.textContent='Copied. Paste the report in this chat.';}catch{output.focus();output.select();output.setSelectionRange(0,output.value.length);const copied=document.execCommand('copy');status.textContent=copied?'Copied. Paste the report in this chat.':'Long-press the selected report and choose Copy.';}});
 let timer=0;const changed=()=>{clearTimeout(timer);timer=window.setTimeout(()=>capture('viewport-or-visibility-change'),250);};
 window.addEventListener('resize',changed);window.addEventListener('orientationchange',changed);window.addEventListener('pageshow',changed);document.addEventListener('visibilitychange',changed);visualViewport?.addEventListener('resize',changed);visualViewport?.addEventListener('scroll',changed);
 capture('startup');for(const delay of [500,2500,5000])window.setTimeout(()=>capture('startup-settled'),delay);
 new MutationObserver(changed).observe(document.getElementById('root')!,{childList:true,subtree:true});
}
