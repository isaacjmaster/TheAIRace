import { sound } from '../audio/sound';
import { useEffect, useState } from 'react';
import { RaidScreen } from '../../raid/RaidScreen';
import type { RaidRun, Transcript } from '../../shared/raid';
import type { GameState } from '../../shared/contracts';
async function post(path:string,body:unknown){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error);return data;}
const key='airace-integrated-pending-raid-v1';
export function IntegratedRaid({onBank,onExit}:{onBank:(s:GameState)=>void;onExit:()=>void}){
 const [run,setRun]=useState<RaidRun|null>(null),[error,setError]=useState(''),[banked,setBanked]=useState(false),[saving,setSaving]=useState(false);
 const [pending,setPending]=useState<{id:string;log:Transcript}|null>(()=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}});
 async function claim(record:NonNullable<typeof pending>){setSaving(true);setError('');try{const r=await post('/api/raid/claim',record);onBank(r.state);try{localStorage.removeItem(key);}catch{}setPending(null);setBanked(true);}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 async function start(){setError('');try{const r=await post('/api/raid/start',{layout:0});setRun(r.run);}catch(e){setError((e as Error).message);}}
 useEffect(()=>{if(pending)void claim(pending);else void start();},[]);
 return <div className="integrated-raid">{run&&<RaidScreen initialLayout={run.layout} squad={run.squad} power={run.power} onCue={sound.cue} integrated onComplete={(_,log)=>{const record={id:run.id,log};try{localStorage.setItem(key,JSON.stringify(record));}catch{}setPending(record);void claim(record);}} onExit={banked?onExit:undefined}/>}
 {(!run||pending||error||saving)&&<div className="raid-bank-status" role="status"><p>{error|| (saving?'Banking raid rewards…':banked?'Rewards saved':'Preparing raid…')}</p>{error&&<button disabled={saving} onClick={()=>pending?void claim(pending):void start()}>Retry</button>}{banked&&!run&&<button onClick={onExit}>Return to garage</button>}{!pending&&!saving&&!run&&<button onClick={onExit}>Back to garage</button>}</div>}</div>;
}
