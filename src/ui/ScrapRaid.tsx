import {CircuitRating,raidRating,ScrapBotIcon} from './RaidSymbols';
import './raid-experience.css';
import {InfluenceIcon} from './InfluenceIcon';
import type {InfluenceResult} from '../../shared/influence';
import {useEffect,useRef,useState} from 'react';
import {RaidScene} from '../../raid/scene';
import {DeploymentGesture} from '../../raid/gestures';
import {tick,STEP,destruction,validDeployment,type Raid} from '../../raid/engine';
import type {BotRaid} from '../../shared/foundation';
import {sound} from '../audio/sound';
export function ScrapRaid({raid,influence,busy,error,onDeploy,onReturn}:{raid:BotRaid;influence?:InfluenceResult|null;busy:boolean;error?:string;onDeploy:(p:{x:number;y:number})=>Promise<boolean|undefined>;onReturn:()=>void}){
 const host=useRef<HTMLDivElement>(null),scene=useRef<RaidScene|null>(null),sim=useRef<Raid>(structuredClone(raid.simulation));
 const gesture=useRef(new DeploymentGesture()),pointers=useRef(new Map<number,{x:number;y:number}>()),pinch=useRef(0),started=useRef(raid.started),heard=useRef(new Set<number>());
 const [notice,setNotice]=useState(''),[battle,setBattle]=useState({time:raid.simulation.time,destroyed:destruction(raid.simulation),alive:raid.simulation.units.filter(u=>u.hp>0).length});
 const deploying=useRef(false);
 useEffect(()=>{Object.assign(sim.current,structuredClone(raid.simulation));started.current=raid.started;},[raid]);
 useEffect(()=>{let view:RaidScene|undefined,frame=0,last=performance.now(),elapsed=0,uiAt=0;try{view=new RaidScene(host.current!,setNotice,true);scene.current=view;
 const draw=(time:number)=>{const dt=Math.min(.1,(time-last)/1000);last=time;if(!document.hidden){elapsed+=dt;while(elapsed>=STEP){if(started.current)tick(sim.current);elapsed-=STEP;}
 for(const e of sim.current.effects){if(heard.current.has(e.id))continue;heard.current.add(e.id);sound.cue(e.destroyed?'destroy':e.source<100?'laser':sim.current.units.some(u=>u.id===e.source&&u.kind==='scrap')?'punch':'impact');}
 view!.update(sim.current,'scrap',dt);if(time-uiAt>200){uiAt=time;setBattle({time:sim.current.time,destroyed:destruction(sim.current),alive:sim.current.units.filter(u=>u.hp>0).length});}}frame=requestAnimationFrame(draw);};frame=requestAnimationFrame(draw);}catch{setNotice('Graphics unavailable. Return to HQ and retry.');}
 return()=>{cancelAnimationFrame(frame);view?.dispose();};},[]);
 useEffect(()=>{if(raid.settled){if(raid.simulation.reason==='Network cleared')sound.cue('win');if(raid.reward)sound.cue('resources');}},[raid.settled]);
 const ended=raid.settled;
 return <section className="scrap-raid" aria-label="Scrap Bot raid"><div className="scrap-battlefield" ref={host}
 onPointerDown={e=>{if(e.button!==0||ended)return;e.currentTarget.setPointerCapture(e.pointerId);const p={x:e.clientX,y:e.clientY};gesture.current.begin(e.pointerId,p);pointers.current.set(e.pointerId,p);pinch.current=0;}}
 onPointerMove={e=>{scene.current?.hover(scene.current?.pick(e.clientX,e.clientY)??null);const p={x:e.clientX,y:e.clientY},delta=gesture.current.move(e.pointerId,p);if(pointers.current.has(e.pointerId))pointers.current.set(e.pointerId,p);if(pointers.current.size>1){const [a,b]=[...pointers.current.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch.current)scene.current?.zoom(d/pinch.current);pinch.current=d;}else if(delta)scene.current?.pan(delta.x,delta.y);}}
 onPointerUp={e=>{const tap=gesture.current.release(e.pointerId,{x:e.clientX,y:e.clientY});pointers.current.delete(e.pointerId);pinch.current=0;scene.current?.hover(null);if(tap&&!busy&&!deploying.current&&!ended){const p=scene.current?.pick(e.clientX,e.clientY);if(p&&validDeployment(p)&&raid.simulation.stock.scrap>0){setNotice('');deploying.current=true;void onDeploy(p).finally(()=>{deploying.current=false;});}else setNotice(raid.simulation.stock.scrap?'Tap the cyan deployment lanes.':'All Scrap Bots deployed.');}}}
 onPointerCancel={e=>{gesture.current.cancel(e.pointerId);pointers.current.delete(e.pointerId);pinch.current=0;}}
 onLostPointerCapture={e=>{gesture.current.cancel(e.pointerId);pointers.current.delete(e.pointerId);pinch.current=0;}}
 onWheel={e=>scene.current?.zoom(e.deltaY>0?.95:1.05)} onContextMenu={e=>e.preventDefault()}/>
 <header className="scrap-raid-header glass" aria-label="Raid progress"><span className="raid-time" aria-label={`Time elapsed ${Math.floor(battle.time)} seconds`}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2M9 2h6"/></svg>{Math.floor(battle.time/60)}:{String(Math.floor(battle.time%60)).padStart(2,'0')}</span><strong aria-label={`${battle.destroyed}% destruction`}>{battle.destroyed}<small>%</small></strong></header>
 {!ended&&<><footer className="scrap-raid-controls"><div className="raid-troop glass" role="status" aria-label={`${raid.simulation.stock.scrap} Scrap Bots available`}><ScrapBotIcon/><strong>{raid.simulation.stock.scrap}</strong></div><button className="raid-return" disabled={busy} onClick={onReturn}>Return to HQ</button></footer>{(error||notice)&&<div className="raid-notice glass" role="status">{error||notice}</div>}</>}
 {ended&&<div className="raid-result-backdrop"><div className={`scrap-result glass ${raid.simulation.reason==='Network cleared'?'is-victory':''}`} role="dialog" aria-modal="true" aria-labelledby="raid-result-title"><h2 id="raid-result-title">{raid.simulation.reason==='Network cleared'?'Victory':raid.simulation.reason==='Retreated'?'Raid ended':'Defeat'}</h2><CircuitRating value={raidRating(destruction(raid.simulation))}/><div className="raid-destruction"><strong>{destruction(raid.simulation)}<span>%</span></strong><small>DESTRUCTION</small></div><div className="raid-rewards"><div className="influence-result"><InfluenceIcon/><strong>+{influence?.awarded??0}</strong><small>Influence</small></div>{raid.reward>0&&<div className="raid-compute-reward"><strong>+{raid.reward}</strong><small>Compute</small></div>}</div><button className="primary" autoFocus disabled={busy} onClick={onReturn}>Return to HQ</button>{error&&<p role="alert">{error}</p>}</div></div>}
 </section>;
}
