import { useEffect, useId, useRef, useState } from 'react';
import type { ExpeditionCommand, ExpeditionState, Point, Resource, Resources } from '../../shared/expedition';
import { DESTINATIONS, type Destination } from '../../shared/operation';
import { WORLD, cargoCount, rigStats } from '../game/expedition';
import './operation.css';

const resources:Resource[]=['scrap','cells','gpu'];
const names:Record<Resource,string>={scrap:'Scrap',cells:'Cells',gpu:'GPU'};
const symbols:Record<Resource,string>={scrap:'▤',cells:'ϟ',gpu:'◈'};
const same=(a:Point,b:Point)=>a.x===b.x&&a.y===b.y;
const iso=(p:Point)=>({x:300+(p.x-p.y)*38,y:90+(p.x+p.y)*21});
function Haul({value}:{value:Resources}){return <div className="op-haul">{resources.map(r=><span className={r} key={r}><b aria-hidden="true">{symbols[r]}</b> {value[r]} <small>{names[r]}</small></span>)}</div>;}

/** Snapshot renderer. All motion, decisions, resource awards and timers belong to the engine. */
export function OperationView({state,busy,onCommand,muted}:{state:ExpeditionState;busy:boolean;onCommand:(cmd:ExpeditionCommand)=>Promise<ExpeditionState|null>;muted:boolean;clockOffset?:number}){
 const run=state.run,op=run?.operation,world=op?.world??WORLD,stats=rigStats(state.rigLevel),uid=useId().replace(/:/g,'');
 const [selected,setSelected]=useState<Destination>('safe'),[evacuate,setEvacuate]=useState(false),[error,setError]=useState(''),[burst,setBurst]=useState<string|null>(null);
 const previous=useRef<{id:string;eventId:number;cargo:Resources}|null>(null),audio=useRef<AudioContext|null>(null),dialog=useRef<HTMLElement|null>(null);
 function unlockAudio(){if(muted)return;try{audio.current??=new AudioContext();void audio.current.resume();}catch{}}
 useEffect(()=>{const prev=previous.current;if(run&&op){if(prev?.id===run.id&&prev.eventId!==op.eventId&&resources.some(r=>run.cargo[r]>prev.cargo[r])){
   const gained=resources.filter(r=>run.cargo[r]>prev.cargo[r]).map(r=>`+${run.cargo[r]-prev.cargo[r]} ${names[r]}`).join(' ');setBurst(gained||'Recovered!');
   if(!muted&&audio.current)try{const ctx=audio.current;[570,850,1140].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f;g.gain.setValueAtTime(.035,ctx.currentTime+i*.07);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.07+.2);o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime+i*.07);o.stop(ctx.currentTime+i*.07+.2);});}catch{}
  }previous.current={id:run.id,eventId:op.eventId,cargo:{...run.cargo}};}else previous.current=null;
 },[run,op,muted]);
 useEffect(()=>{if(!burst)return;const t=setTimeout(()=>setBurst(null),1100);return()=>clearTimeout(t);},[burst]);
 useEffect(()=>()=>{void audio.current?.close();},[]);
 useEffect(()=>{if(!evacuate)return;const previousFocus=document.activeElement as HTMLElement|null;const focusable=()=>Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);focusable().at(-1)?.focus();const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setEvacuate(false);}if(e.key==='Tab'){const buttons=focusable(),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',close);return()=>{document.removeEventListener('keydown',close);previousFocus?.focus();};},[evacuate]);
 async function act(cmd:ExpeditionCommand){if(busy)return;unlockAudio();setError('');const result=await onCommand(cmd);if(!result)setError('Order not received. Try again.');else if(cmd.type==='evacuate')setEvacuate(false);}
 async function showRescue(){if(busy)return;if(op&&!op.paused){const paused=await onCommand({type:'pause',paused:true});if(!paused){setError('Try again.');return;}}setEvacuate(true);}
 const destination:Destination=op?.destination??(op?.focus==='gpu'?'dangerous':op?.focus==='cells'?'medium':selected);
 const returning=op?.order==='return'&&!op.paused;
 const needsRescue=!!run&&run.energy===0&&!same(run.position,world.dock);
 function choose(id:Destination){setSelected(id);if(run)void act({type:'destination',destination:id});}
 function locations(){return <div className="op-locations" aria-label="Choose a destination">{DESTINATIONS.map(d=><button key={d.id} className={`op-location ${d.id} ${(run?destination:selected)===d.id?'selected':''}`} aria-pressed={(run?destination:selected)===d.id} disabled={busy||returning||(d.id==='dangerous'&&!state.rigLevel)} onClick={()=>choose(d.id)}><span className="op-location-icon" aria-hidden="true">{d.symbol}</span><strong>{d.name}</strong><span>{d.id==='safe'?'Scrap':d.id==='medium'?'Energy cells':'GPU parts'}</span><small>{d.id==='dangerous'&&!state.rigLevel?'Upgrade to unlock':d.risk}</small></button>)}</div>;}
 const tiles=Array.from({length:world.width*world.height},(_,i)=>({x:i%world.width,y:Math.floor(i/world.width)})).sort((a,b)=>a.x+a.y-b.x-b.y);
 const position=iso(run?.position??world.dock),cargo=run?cargoCount(run.cargo):0,target=world.deposits.find(d=>d.id===op?.targetId);
 return <section className={`operation-view ${op?.event==='hazard'?'op-hit':''} ${run?'op-running':'op-standby'} ${op?.paused?'op-paused':''}`} data-order={op?.order} data-paused={op?.paused} aria-label="Neon Salvage operation">
  <header className="op-heading"><div><span>OPERATIONS</span><h1>Neon Salvage</h1></div></header>
  <p className="op-objective">Collect resources to upgrade your AI company.</p>
  {run&&<div className="op-meters"><div><span>Battery</span><b className={run.energy<8?'op-danger':''}>{run.energy}<small>/{stats.energy}</small></b><i><em style={{width:`${run.energy/stats.energy*100}%`}}/></i></div><div><span>Cargo</span><b>{cargo}<small>/{stats.capacity}</small></b><i><em style={{width:`${cargo/stats.capacity*100}%`}}/></i></div></div>}
  <div className="op-world">
   <svg viewBox="20 35 560 365" role="img" aria-label={`Isometric salvage yard. ${op?`${op.paused?'Paused. ':''}Pixel ${op.order}. ${op.patrols.length} moving patrols. ${op.discovered.length} caches located.`:'A changing recovery zone with resource caches, machinery, and patrol routes.'}`}>
    <defs><linearGradient id={`${uid}-floor`} x2="0" y2="1"><stop stopColor="#48787a"/><stop offset="1" stopColor="#1b3d53"/></linearGradient><linearGradient id={`${uid}-pixel`} x2="1" y2="1"><stop stopColor="#d6ffe1"/><stop offset="1" stopColor="#58cdb8"/></linearGradient><radialGradient id={`${uid}-glow`}><stop stopColor="#85ffd5" stopOpacity=".4"/><stop offset="1" stopColor="#85ffd5" stopOpacity="0"/></radialGradient></defs>
    <ellipse cx="300" cy="288" rx="259" ry="99" fill="#061c30" opacity=".65"/>
    <path d="M34 216 300 69 566 216v30L300 393 34 246Z" fill="#102c40"/><path d="m34 216 266 147 266-147v20L300 383 34 236Z" fill="#355971"/>
    {tiles.map(p=>{const q=iso(p),block=world.blocked.some(b=>same(b,p)),dock=same(p,world.dock),hazard=world.hazards.some(h=>same(h,p)),locked=p.x>=4&&!state.rigLevel;const nextPatrol=op?.patrols.some(h=>same(h.route[(h.index+1)%h.route.length],p));return <g key={`${p.x}-${p.y}`} transform={`translate(${q.x} ${q.y})`} opacity={locked?.48:1}>
     <path d="m0-21 38 21-38 21-38-21Z" fill={dock?'#4a9594':hazard?'#806745':p.x>=4?((p.x+p.y)%2?'#5d4c73':'#493c60'):p.x>=2?((p.x+p.y)%2?'#73644c':'#605444'):((p.x+p.y)%2?'#356f67':'#2d5e58')} stroke="#89b6b52c" strokeWidth="1.5"/>
     {!block&&!dock&&<path d="m-24 1 24 13 24-13" fill="none" stroke="#8da2a119"/>}
     {hazard&&<path d="m-19-3 6-3 26 14-6 3Zm12-7 6-3 26 14-6 3Z" fill="#eebd77" opacity=".65"/>}
     {nextPatrol&&<path className="op-warning-tile" d="m0-17 31 17-31 17-31-17Z" fill="#ff8b6640" stroke="#ffb786" strokeWidth="2" strokeDasharray="4 3"/>}
     {dock&&<><path d="m-26 0 26-14 26 14-26 14Z" fill="none" stroke="#b0ffdd" strokeWidth="3"/><path d="m-27-1v-22l6-3v20m48 5v-22l-6-3v20" stroke="#a6e2d6" strokeWidth="4"/><text y="-32" textAnchor="middle" fontSize="12" fontWeight="900" fill="#baffdc">HQ UPLINK</text></>}
     {block&&<><ellipse cy="6" rx="30" ry="15" fill="#081e2d" opacity=".35"/><path d="m-27-7 27 15 27-15v-39L0-61-27-46Z" fill="#365365"/><path d="m-27-46 27-15 27 15L0-31Z" fill="#647e89"/><path d="M0-31v39l27-15v-39Z" fill="#233d51"/><path d="m6-24 15-8v5l-15 8Zm0 10 15-8v5L6-9Z" fill="#79bab6" opacity=".5"/></>}
    </g>;})}
    {world.deposits.map(d=>{const p=iso(d.position),known=!op||op.discovered.includes(d.id),remaining=run?run.remaining[d.id]??0:d.charges,locked=d.requiredRig>state.rigLevel;return <g key={d.id} transform={`translate(${p.x} ${p.y})`} className={`op-cache ${target?.id===d.id?'op-target':''} ${remaining===0?'op-empty':''}`} opacity={locked?.42:1}>
     <ellipse cy="2" rx="30" ry="17" fill={d.resource==='gpu'?'#c299ef44':d.resource==='cells'?'#ffcf8844':'#aaffbc3d'}/>
     <path d="m-23-5 23 13 23-13v-30L0-48-23-35Z" fill={d.resource==='gpu'?'#73649d':d.resource==='cells'?'#b99a62':'#62aa97'}/><path d="m-23-35 23-13 23 13L0-22Z" fill={d.resource==='gpu'?'#c2a4e8':d.resource==='cells'?'#f5d3a0':'#a2e1c3'}/><path d="M0-22v30l23-13v-30Z" fill={d.resource==='gpu'?'#4c427b':d.resource==='cells'?'#8d704b':'#367e72'}/>
     <text x="-11" y="-14" textAnchor="middle" fill="#ecffdf" fontSize="21" fontWeight="900">{symbols[d.resource]}</text><path d="m6-14 10-6v5L6-9Z" fill="#b6f0cc"/>
     {target?.id===d.id&&<path className="op-target-arrow" d="m-9-67 9 8 9-8Z" fill="#ffdfa0"/>}
     {known&&<g><rect x="-13" y="13" width="26" height="15" rx="7" fill="#112b40"/><text y="24" textAnchor="middle" fill="#f5dfb9" fontSize="10" fontWeight="800">{locked?'⌑':`${remaining}×`}</text></g>}
    </g>;})}
    {op?.patrols.map(h=>{const p=iso(h.position);return <g key={h.id} className="op-patrol" style={{transform:`translate(${p.x}px,${p.y}px)`}}><ellipse cy="1" rx="25" ry="13" fill="#ff8c6333"/><g className="op-patrol-body"><path d="m-20-26 20-12 20 12L0-14Z" fill="#ffca8b"/><path d="m-20-26 20 12 20-12v9L0-5-20-17Z" fill="#af6056"/><path d="m-12-26 12-7 12 7-12 7Z" fill="#794354"/><circle cx="0" cy="-25" r="4" fill="#fff0b4"/><path d="m-23-30-10 5m56-5 10 5" stroke="#f7b07f" strokeWidth="4" strokeLinecap="round"/></g><path d="M0-7-16 2 16 2Z" fill="#ffb177" opacity=".15"/></g>;})}
    <g className={`op-pixel ${op&&!op.paused&&op.event==='move'?'op-moving':''}`} style={{transform:`translate(${position.x}px,${position.y}px)`}}><ellipse cy="3" rx="22" ry="10" fill="#041c2c99"/><ellipse cy="-8" rx="42" ry="24" fill={`url(#${uid}-glow)`}/><g className="op-pixel-body"><path d="m-18-13 1-29 20-11 22 12v28L4 0Z" fill={`url(#${uid}-pixel)`}/><path d="m4-31 21-10v28L4 0Z" fill="#43afa2"/><rect x="-12" y="-40" width="26" height="19" rx="7" fill="#163b4e"/><rect x="-7" y="-35" width="4" height="9" rx="2" fill="#b0ffe3"/><rect x="5" y="-35" width="4" height="9" rx="2" fill="#b0ffe3"/><path d="M1-50v-10" stroke="#99d9cb" strokeWidth="4"/><circle cx="1" cy="-62" r="5" fill="#c1ffe4"/><path d="m-11-12-6 8m26-8 8 6" stroke="#b1f1d3" strokeWidth="6" strokeLinecap="round"/>{state.rigLevel>0&&<path d="m15-44 17 8v25l-8 5v-23l-9-6Z" fill="#efbd83"/>}</g>{burst&&<text key={`${op?.eventId}-${burst}`} className="op-burst" textAnchor="middle" y="-80" fill="#ffdfa0" fontSize="17" fontWeight="900">{burst}</text>}</g>
   </svg>
   {op?.paused&&<span className="op-paused-badge">{cargo>0?'RESOURCES COLLECTED!':'PAUSED'}</span>}
   {!run&&<span className="op-map-note">Choose your destination below</span>}
  </div>
  {run?<>
   <div className="op-live-status" role="status"><span className="op-agent-mark" aria-hidden="true">••</span><p>{error||(needsRescue?'Battery empty. Rescue your cargo.':run.energy===0?'You’re home. Bank your resources.':returning?'Pixel is bringing your cargo home…':(op?.paused||!op)?'Keep collecting or return home?':op?.event==='hazard'?'Patrol nearby! Watch your battery.':`Pixel is collecting ${destination==='safe'?'scrap':destination==='medium'?'energy cells':'GPU parts'}…`)}</p></div>
   <Haul value={run.cargo}/>
   {locations()}
   <div className="op-decisions">
    {(op?.paused||!op)&&!returning&&run.energy>0&&<button className="secondary op-continue" disabled={busy} onClick={()=>void act({type:'destination',destination})}>Continue</button>}
    <button className="primary op-return" disabled={busy||returning} onClick={()=>needsRescue?void showRescue():void act({type:'headHome'})}>{needsRescue?'Rescue cargo':returning?'Returning to HQ…':'Return to HQ'}</button>
   </div>
  </>:<div className="op-launch-panel">
   {locations()}
   <button className="primary op-launch" disabled={busy} onClick={()=>void act({type:'launch',destination:selected})}>Start · {DESTINATIONS.find(d=>d.id===selected)?.name} <span>→</span></button>
   {error&&<p className="op-inline-error" role="alert">{error}</p>}
  </div>}
  {evacuate&&<div className="op-overlay" onClick={()=>setEvacuate(false)}><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="op-dialog-title" onClick={e=>e.stopPropagation()}><h2 id="op-dialog-title">Rescue your cargo?</h2><p>Battery is empty. Rescue brings home half your resources, rounded down.</p><button className="primary" disabled={busy} onClick={()=>void act({type:'evacuate'})}>Rescue · save half</button><button className="secondary" onClick={()=>setEvacuate(false)}>Back</button></section></div>}

 </section>;
}


