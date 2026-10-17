import type {InfluenceResult} from '../../shared/influence';
import {STARTER_NETWORKS} from '../../raid/starter';
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
 const deploying=useRef(false);const network=STARTER_NETWORKS[raid.simulation.layout];
 useEffect(()=>{Object.assign(sim.current,structuredClone(raid.simulation));started.current=raid.started;},[raid]);
 useEffect(()=>{let view:RaidScene|undefined,frame=0,last=performance.now(),elapsed=0,uiAt=0;try{view=new RaidScene(host.current!,setNotice,true);scene.current=view;
 const draw=(time:number)=>{const dt=Math.min(.1,(time-last)/1000);last=time;if(!document.hidden){elapsed+=dt;while(elapsed>=STEP){if(started.current)tick(sim.current);elapsed-=STEP;}
 for(const e of sim.current.effects){if(heard.current.has(e.id))continue;heard.current.add(e.id);sound.cue(e.destroyed?'destroy':e.source<100?'laser':'impact');}
 view!.update(sim.current,'scrap',dt);if(time-uiAt>200){uiAt=time;setBattle({time:sim.current.time,destroyed:destruction(sim.current),alive:sim.current.units.filter(u=>u.hp>0).length});}}frame=requestAnimationFrame(draw);};frame=requestAnimationFrame(draw);}catch{setNotice('Graphics unavailable. Return to HQ and retry.');}
 return()=>{cancelAnimationFrame(frame);view?.dispose();};},[]);
 useEffect(()=>{if(raid.settled){if(raid.simulation.reason==='Network cleared')sound.cue('win');if(raid.reward)sound.cue('resources');}},[raid.settled]);
 const ended=raid.settled;
 return <section className="scrap-raid" aria-label="Scrap Bot raid"><div className="scrap-battlefield" ref={host}
 onPointerDown={e=>{if(e.button!==0||ended)return;e.currentTarget.setPointerCapture(e.pointerId);const p={x:e.clientX,y:e.clientY};gesture.current.begin(e.pointerId,p);pointers.current.set(e.pointerId,p);pinch.current=0;}}
 onPointerMove={e=>{scene.current?.hover(scene.current?.pick(e.clientX,e.clientY)??null);const p={x:e.clientX,y:e.clientY},delta=gesture.current.move(e.pointerId,p);if(pointers.current.has(e.pointerId))pointers.current.set(e.pointerId,p);if(pointers.current.size>1){const [a,b]=[...pointers.current.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch.current)scene.current?.zoom(d/pinch.current);pinch.current=d;}else if(delta)scene.current?.pan(delta.x,delta.y);}}
 onPointerUp={e=>{const tap=gesture.current.release(e.pointerId,{x:e.clientX,y:e.clientY});pointers.current.delete(e.pointerId);pinch.current=0;scene.current?.hover(null);if(tap&&!busy&&!deploying.current&&!ended){const p=scene.current?.pick(e.clientX,e.clientY);if(p&&validDeployment(p)&&raid.simulation.stock.scrap>0){setNotice('');deploying.current=true;void onDeploy(p).finally(()=>{deploying.current=false;});}else setNotice(raid.simulation.stock.scrap?'Deploy outside the marked boundary.':'All Scrap Bots deployed.');}}}
 onPointerCancel={e=>{gesture.current.cancel(e.pointerId);pointers.current.delete(e.pointerId);pinch.current=0;}}
 onLostPointerCapture={e=>{gesture.current.cancel(e.pointerId);pointers.current.delete(e.pointerId);pinch.current=0;}}
 onWheel={e=>scene.current?.zoom(e.deltaY>0?.95:1.05)} onContextMenu={e=>e.preventDefault()}/>
 <header className="scrap-raid-header glass"><strong>{raid.simulation.combatVersion===2?network.name:raid.simulation.layout===0?'Vault Gate':'Crossfire'}<small>{network.difficulty} · {battle.alive} active</small></strong><span>{Math.max(0,Math.ceil(90-battle.time))}s · {battle.destroyed}%</span></header>
 {!ended&&<footer className="scrap-raid-controls glass"><div><strong>▣ Scrap Bot × {raid.simulation.stock.scrap}</strong><small>{error||notice||'Tap outer ground to deploy · drag to pan'}</small></div><button disabled={busy} onClick={onReturn}>Return to HQ</button></footer>}
 {ended&&<div className="scrap-result glass" role="status"><h2>{raid.simulation.reason==='Network cleared'?'Victory!':raid.simulation.reason==='Retreated'?'Raid ended':'Defeat'}</h2><p>{raid.simulation.reason} · {raid.result?.survivors??raid.simulation.units.filter(u=>u.hp>0).length} bots standing</p><p>{destruction(raid.simulation)}% destroyed · +{raid.reward} Compute</p>{influence&&<p className="influence-result">{raid.simulation.reason==='Network cleared'?`Victory — +${influence.awarded} Influence`:'+0 Influence'}{raid.simulation.reason==='Network cleared'&&influence.awarded===0&&<small> · raid cooldown active</small>}</p>}<p>Undeployed bots returned to your Hangar.<br/>Deployed bots are consumed.</p><button className="primary" disabled={busy} onClick={onReturn}>Return to HQ</button></div>}
 </section>;
}
