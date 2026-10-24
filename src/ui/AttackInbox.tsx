import {useEffect,useState} from 'react';

export function AttackInbox({companyId,onWatch}:{companyId:string;onWatch:(id:string)=>void}){
 const [attack,setAttack]=useState<{id:string;name:string}|null>(null),[error,setError]=useState('');
 useEffect(()=>{let disposed=false;const check=async()=>{try{const r=await fetch('/api/foundation/pvp/notifications',{cache:'no-store'});if(r.ok){const d=await r.json();if(!disposed)setAttack(d.notification);}}catch{}};void check();const interval=setInterval(()=>{if(!document.hidden)void check();},15000);return()=>{disposed=true;clearInterval(interval);};},[companyId]);
 async function dismiss(watch:boolean){if(!attack)return;const id=attack.id;try{const r=await fetch(`/api/foundation/pvp/notifications/${encodeURIComponent(id)}/dismiss`,{method:'POST',headers:{'Content-Type':'application/json','X-Company-ID':companyId},body:'{}'});if(!r.ok)throw Error();setAttack(null);if(watch)onWatch(id);}catch{setError('Could not acknowledge this attack. Please try again.');}}
 return attack?<div className="foundation-backdrop"><section className="foundation-dialog glass" role="dialog" aria-modal="true" aria-label="You were attacked"><h2>You were attacked!</h2><p>{attack.name} infiltrated your base.</p><button className="primary" onClick={()=>void dismiss(true)}>Watch Replay</button><button onClick={()=>void dismiss(false)}>Dismiss</button>{error&&<p role="alert">{error}</p>}</section></div>:null;
}

