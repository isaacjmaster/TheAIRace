import {useEffect,useRef,useState} from 'react';
import type {LeaderboardData} from '../../shared/influence';
import './leaderboard.css';
import {MedalsIcon} from './MedalsIcon';
export function Leaderboard({onClose}:{onClose:()=>void}){
 const [data,setData]=useState<LeaderboardData|null>(null),[error,setError]=useState('');const close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{close.current?.focus();const controller=new AbortController();let active=true;
  async function load(){try{const r=await fetch('/api/foundation/leaderboard',{signal:controller.signal,cache:'no-store'});if(!r.ok)throw new Error();const next=await r.json();if(active){setData(next);setError('');}}catch{if(active)setError('Rankings unavailable. Retrying…');}}
  void load();const timer=setInterval(()=>void load(),10000);return()=>{active=false;controller.abort();clearInterval(timer);};
 },[]);
 return <div className="foundation-backdrop leaderboard-backdrop"><section className="leaderboard glass" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title" onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){e.preventDefault();close.current?.focus();}}}>
 <header><MedalsIcon/><h2 id="leaderboard-title">Global Leaderboard</h2><button ref={close} onClick={onClose} aria-label="Close leaderboard">×</button></header>
 <div className="leaderboard-columns"><span>Company</span><span>Influence</span></div>
 {error&&<p role="status">{error}</p>}
 {!data&&!error&&<p role="status">Loading rankings…</p>}
 <ol className="leaderboard-rows">{data?.rows.map(row=><li key={row.rank} className={row.current?'is-current':''} aria-current={row.current?'true':undefined}><span className={`rank-medal rank-${row.rank}`}>{row.rank}</span><strong title={row.name}>{row.name}</strong><b>{row.influence.toLocaleString()}</b></li>)}</ol>
 {data&&!data.rows.length&&<p className="leaderboard-empty">No named companies yet.</p>}
 {data?.own&&data.own.rank>5&&<footer><span>#{data.own.rank}</span><strong>{data.own.name}</strong><b>{data.own.influence.toLocaleString()}</b></footer>}
 </section></div>;
}
