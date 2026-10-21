import {RetreatIcon} from './RetreatIcon';
import {useEffect,useRef,useState} from 'react';
import {deploymentCount,npcBaseName,validDeployment,type Vec,type Operation,type InfiltrationCommand} from '../../shared/infiltration';
import {InfiltrationScene} from '../art/InfiltrationScene';
import {ResearchIcon} from './ResearchIcon';
import {ComputeIcon} from './ComputeIcon';
import {InfluenceIcon} from './InfluenceIcon';
import {sound} from '../audio/sound';
export function InfiltrationView({operation,stock,serverTime,busy,error,onCommand,onRetry,onReturn}:{
 operation:Operation;stock:number;serverTime:number;busy:boolean;error:string;onCommand:(c:InfiltrationCommand)=>Promise<boolean|undefined>;onRetry?:()=>void;onReturn:()=>void;
}){
 const [selected,setSelected]=useState(false);
 const [failed,setFailed]=useState(false),[quit,setQuit]=useState(false),[notice,setNotice]=useState('');
 const retreating=useRef(false);
 const host=useRef<HTMLDivElement>(null),view=useRef<InfiltrationScene|null>(null),labels=useRef(new Map<string,HTMLSpanElement>());
 const pointers=useRef(new Map<number,{x:number;y:number;startX:number;startY:number;moved:boolean}>()),pinch=useRef(0),deploying=useRef(false),lastEvent=useRef(operation.events.length);
 const ready=operation.status==='ready',live=operation.status==='active',done=!ready&&!live,asset=operation.target.assets.find(a=>a.id===operation.agent.target),result=operation.settlement;
 const count=deploymentCount(stock,operation);
 const hacking=live&&(operation.squad?operation.squad.agents.some(a=>a.state==='active'&&a.mode==='hacking'):operation.agent.mode==='hacking');
 useEffect(()=>{if(!hacking)return;const pulse=()=>{if(!document.hidden)sound.cue('cipher-hacking');};pulse();const timer=setInterval(pulse,650);return()=>clearInterval(timer);},[hacking,operation.id]);
 useEffect(()=>{if(done)setQuit(false);},[done]);
 useEffect(()=>{setSelected(false);setNotice('');lastEvent.current=operation.events.length;},[operation.id]);
 useEffect(()=>{let scene:InfiltrationScene|undefined,frame=0,last=performance.now();try{
  scene=new InfiltrationScene(host.current!,operation);view.current=scene;
  const draw=(time:number)=>{scene!.update(Math.min(.05,(time-last)/1000));for(const[id,node]of labels.current){const p=scene!.labelPoint(id),progress=scene!.hackingProgress(id);node.hidden=progress===null||p.z< -1||p.z>1||p.x<0||p.x>host.current!.clientWidth||p.y<0||p.y>host.current!.clientHeight;node.style.left=p.x+'px';node.style.top=p.y+'px';const bar=node.querySelector('progress');if(bar)bar.value=progress??0;}
   last=time;frame=requestAnimationFrame(draw);
  };frame=requestAnimationFrame(draw);
 }catch{setFailed(true);}return()=>{cancelAnimationFrame(frame);scene?.dispose();view.current=null;};},[operation.id]);
 useEffect(()=>{view.current?.setDeploymentActive(selected&&count>0);},[selected,count]);
 useEffect(()=>{view.current?.sync(operation,serverTime);for(const e of operation.events.slice(lastEvent.current)){if(e.type==='laser'&&live&&e.at>=serverTime-1500)sound.cue('drone-laser');if(e.type==='cipher-shot'&&live&&e.at>=serverTime-1500)sound.cue('cipher-shot');if(e.type==='breached')sound.cue('clear-scrap');if(e.type==='hacked')sound.cue('hack');if(e.type==='detected')sound.cue('security-alert');if(e.type==='extracted')sound.cue('extraction');}lastEvent.current=operation.events.length;},[operation,serverTime]);
 async function retreat(){if(busy||retreating.current)return;retreating.current=true;try{if(await onCommand({action:'abandon'})){setQuit(false);onReturn();}}finally{retreating.current=false;}}
 async function deploy(position?:Vec){if(busy||deploying.current||(!ready&&!(live&&operation.squad))||!selected||count<1)return;if(position&&!validDeployment(operation.target,position)){setNotice('Deploy on the outer lawn.');return;}deploying.current=true;setNotice('');try{if(await onCommand({action:'deploy',...(position?{position}:{})}))sound.cue('cipher-deploy');}finally{deploying.current=false;}}
 return <section className="infiltration-view simple-mission" aria-label="Infiltration operation">
  <button className="mission-retreat" aria-label="Retreat" disabled={busy} onClick={()=>{if(done)onReturn();else if(ready)void retreat();else setQuit(true);}}><RetreatIcon/></button>
  <div className="operation-canvas" ref={host} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});pinch.current=0;if(pointers.current.size>1)for(const p of pointers.current.values())p.moved=true;}}
   onPointerMove={e=>{const p=pointers.current.get(e.pointerId);if(!p){if((ready||live&&operation.squad)&&selected){const point=view.current?.groundPosition(e.clientX,e.clientY);if(point)view.current?.setDeployment(point);}return;}if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>8)p.moved=true;if(pointers.current.size===1&&p.moved)view.current?.pan(e.clientX-p.x,e.clientY-p.y);p.x=e.clientX;p.y=e.clientY;if(pointers.current.size>1){const[a,b]=[...pointers.current.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch.current&&distance>0)view.current?.zoom(pinch.current/distance);pinch.current=distance;}}}
   onPointerUp={e=>{const p=pointers.current.get(e.pointerId),single=pointers.current.size===1;pointers.current.delete(e.pointerId);pinch.current=0;if(single&&p&&!p.moved&&(ready||live&&operation.squad)){const position=view.current?.groundPosition(e.clientX,e.clientY);if(position){view.current?.setDeployment(position);void deploy(position);}}}}
   onPointerCancel={e=>{pointers.current.delete(e.pointerId);pinch.current=0;}} onLostPointerCapture={e=>{pointers.current.delete(e.pointerId);pinch.current=0;}} onWheel={e=>view.current?.zoom(e.deltaY>0?1.06:.94)}>
   <div className="operation-world-labels" aria-hidden="true">{[...operation.target.assets.filter(a=>a.access),...operation.drones,...(operation.squad?.agents??[]),...(operation.squad?operation.target.walls??[]:[])].map(a=><span key={a.id} className={'world-hack-progress'+(operation.drones.some(d=>d.id===a.id)||operation.squad?.agents.some(b=>b.id===a.id)?' world-unit-health':'')} hidden ref={node=>{if(node)labels.current.set(a.id,node);else labels.current.delete(a.id);}}><progress max={1} value={0}/></span>)}</div>{failed&&<p role="alert">Graphics unavailable. Your mission is saved.</p>}
  </div>
  {live&&<aside className="operation-livehud glass squad-readout" aria-label="Mission progress"><div className="operation-status"><span>{Math.max(0,180-Math.floor((operation.lastTick-operation.startedAt!)/1000))}s</span></div><div className="operation-loot"><span aria-label={`${operation.carried.compute} Compute`}><ComputeIcon className="mission-compute-icon"/><b>{operation.carried.compute}</b></span><span aria-label={`${operation.carried.research} Research`}><ResearchIcon/><b>{operation.carried.research}</b></span></div></aside>}
  {!done&&<div className="operation-controls deploy-control troop-tray"><button className="cipher-deploy" aria-label="Select Cipher Bot" aria-description={`${count} available${live?', bots on mission':''}`} aria-pressed={selected} disabled={busy||failed||(!ready&&!(live&&operation.squad))||count<1} onClick={()=>setSelected(v=>!v)}><img src="/portraits/cipher-v1.png" alt="Cipher Bot" width="512" height="640" draggable={false}/><b className="troop-count">×{count}</b></button>{notice&&<small role="status">{notice}</small>}</div>}
  {done&&<div className="mission-result-backdrop"><section className="operation-controls mission-result glass" role="status"><h2 className={operation.status==='caught'?'infiltration-failed':undefined}>{operation.status==='extracted'?'Mission complete':operation.status==='caught'?'INFILTRATION FAILED':'Mission ended'}</h2><div className="operation-loot result-loot"><span><ComputeIcon className="mission-compute-icon"/><b>{result?.compute??0}</b><small>Compute</small></span><span><ResearchIcon/><b>{result?.research??0}</b><small>Research</small></span><span><InfluenceIcon/><b>+{result?.influence??0}</b><small>Influence</small></span></div>{(result?.pendingCompute||result?.pendingResearch)?<small className="reserve-note">Storage full — extra loot is safely reserved.</small>:null}<button className="primary" onClick={onReturn}>Return to HQ</button></section></div>}
  {error&&<div className="operation-error glass" role="alert">{error}{onRetry&&<button disabled={busy} onClick={onRetry}>Retry</button>}</div>}
  {operation.ownershipRequired&&<div className="operation-ownership-note">Return to HQ to train a Cipher Bot for your next mission.</div>}
  {quit&&<div className="foundation-backdrop"><section className="foundation-dialog glass" role="alertdialog" aria-label="Retreat confirmation"><h2>Retreat?</h2><p>{ready?'Your Cipher Bot will return to the Hangar.':'Active bots and unbanked loot will be lost.'}</p><button onClick={()=>setQuit(false)}>Stay</button><button disabled={busy} onClick={()=>void retreat()}>Retreat</button></section></div>}
 </section>;
}
