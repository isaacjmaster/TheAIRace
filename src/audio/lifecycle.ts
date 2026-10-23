/** iOS may terminate without unload. Quiesce at the first background signal. */
export function installAudioLifecycle(sound:{visibility:(hidden:boolean)=>void},win:EventTarget,doc:EventTarget&{readonly hidden:boolean}){
 const visibility=()=>sound.visibility(doc.hidden),hide=()=>sound.visibility(true),show=()=>sound.visibility(doc.hidden);
 doc.addEventListener('visibilitychange',visibility);doc.addEventListener('freeze',hide);doc.addEventListener('resume',show);
 win.addEventListener('pagehide',hide);win.addEventListener('pageshow',show);visibility();
 return()=>{doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('freeze',hide);doc.removeEventListener('resume',show);win.removeEventListener('pagehide',hide);win.removeEventListener('pageshow',show);};
}
