import type {RatingLeaderboard} from '../../shared/ranking';
import {InfiltrationBadge} from './InfiltrationRanks';
import {PlayerProfile} from './PlayerProfile';
import {UsernameLabel} from './UsernameLabel';
import {useEffect,useRef,useState} from 'react';
import './leaderboard.css';
export function Leaderboard({onClose}:{onClose:()=>void}){
 const [ratingData,setRatingData]=useState<RatingLeaderboard|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [error,setError]=useState('');const close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{close.current?.focus();const controller=new AbortController();let active=true;
  async function load(){try{const r=await fetch('/api/foundation/rating-leaderboard',{signal:controller.signal,cache:'no-store'});if(!r.ok)throw new Error();const next=await r.json();if(active){setRatingData(next);setError('');}}catch{if(active)setError('Rankings unavailable. Retrying…');}}
  void load();const timer=setInterval(()=>void load(),10000);return()=>{active=false;controller.abort();clearInterval(timer);};
 },[]);
 if(selected)return <PlayerProfile key={selected} companyId={selected} onClose={()=>setSelected(null)}/>;
 return <div className="foundation-backdrop leaderboard-backdrop"><section className="leaderboard glass" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title" onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const buttons=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
 <header><h2 id="leaderboard-title">Global Leaderboard</h2><button autoFocus ref={close} onClick={onClose} aria-label="Close leaderboard">×</button></header>
 <p className="leaderboard-subtitle">Global competitive standings · Infiltration Rating</p><div className="leaderboard-columns"><span>Player</span><span>Rating</span></div>
 {error&&<p role="status">{error}</p>}
 {!ratingData&&!error&&<p role="status">Loading rankings…</p>}
 <><ol className="leaderboard-rows">{ratingData?.rows.map(row=><li key={row.companyId} className={row.current?'is-current':''}><button className="leaderboard-player" onClick={()=>setSelected(row.companyId)} aria-label={`View ${row.name}'s profile`}><span className="rank-medal">{row.position}</span><InfiltrationBadge rating={row.rating} size={40}/><UsernameLabel username={row.name}/><b>{row.rating.toLocaleString()}</b></button></li>)}</ol>{ratingData&&!ratingData.rows.length&&<p>No rated players yet.</p>}{ratingData?.own&&!ratingData.rows.some(row=>row.companyId===ratingData.own!.companyId)&&<footer><button className="leaderboard-player" onClick={()=>setSelected(ratingData.own!.companyId)}><span className="rank-medal">{ratingData.own.position}</span><InfiltrationBadge rating={ratingData.own.rating} size={40}/><UsernameLabel username={ratingData.own.name}/><b>{ratingData.own.rating.toLocaleString()}</b></button></footer>} </> </section></div>;
}
