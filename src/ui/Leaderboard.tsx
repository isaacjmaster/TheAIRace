import type {RatingLeaderboard} from '../../shared/ranking';
import {InfiltrationBadge} from './InfiltrationRanks';
import {PlayerProfile} from './PlayerProfile';
import {UsernameLabel} from './UsernameLabel';
import {RankBadge} from './RankBadge';
import {useEffect,useRef,useState} from 'react';
import type {LeaderboardData} from '../../shared/influence';
import './leaderboard.css';
import {InfluenceIcon} from './InfluenceIcon';
export function Leaderboard({onClose}:{onClose:()=>void}){
 const [mode,setMode]=useState<'influence'|'rating'>('influence');
 const [ratingData,setRatingData]=useState<RatingLeaderboard|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [data,setData]=useState<LeaderboardData|null>(null),[error,setError]=useState('');const close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{close.current?.focus();const controller=new AbortController();let active=true;
  async function load(){try{const r=await fetch(mode==='rating'?'/api/foundation/rating-leaderboard':'/api/foundation/leaderboard',{signal:controller.signal,cache:'no-store'});if(!r.ok)throw new Error();const next=await r.json();if(active){if(mode==='rating')setRatingData(next);else setData(next);setError('');}}catch{if(active)setError('Rankings unavailable. Retrying…');}}
  void load();const timer=setInterval(()=>void load(),10000);return()=>{active=false;controller.abort();clearInterval(timer);};
 },[mode]);
 if(selected)return <PlayerProfile key={selected} companyId={selected} onClose={()=>setSelected(null)}/>;
 return <div className="foundation-backdrop leaderboard-backdrop"><section className="leaderboard glass" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title" onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const buttons=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
 <header><h2 id="leaderboard-title">Global Leaderboard</h2><button autoFocus ref={close} onClick={onClose} aria-label="Close leaderboard">×</button></header>
 <nav className="player-world-tabs" aria-label="Leaderboard score"><button aria-pressed={mode==='influence'} onClick={()=>setMode('influence')}>Influence</button><button aria-pressed={mode==='rating'} onClick={()=>setMode('rating')}>Infiltration Rating</button></nav><p className="leaderboard-subtitle">Top 10 Players</p><div className="leaderboard-columns"><span>Player</span><span>{mode==='rating'?'Rating':'Influence'}</span></div>
 {error&&<p role="status">{error}</p>}
 {!(mode==='rating'?ratingData:data)&&!error&&<p role="status">Loading rankings…</p>}
 {mode==='rating'?<><ol className="leaderboard-rows">{ratingData?.rows.map(row=><li key={row.companyId} className={row.current?'is-current':''}><button className="leaderboard-player" onClick={()=>setSelected(row.companyId)} aria-label={`View ${row.name}'s profile`}><span className="rank-medal">{row.position}</span><InfiltrationBadge rating={row.rating} size={40}/><UsernameLabel username={row.name}/><b>{row.rating.toLocaleString()}</b></button></li>)}</ol>{ratingData&&!ratingData.rows.length&&<p>No rated players yet.</p>}{ratingData?.own&&ratingData.own.position>10&&<footer><button className="leaderboard-player" onClick={()=>setSelected(ratingData.own!.companyId)}><span className="rank-medal">{ratingData.own.position}</span><InfiltrationBadge rating={ratingData.own.rating} size={40}/><UsernameLabel username={ratingData.own.name}/><b>{ratingData.own.rating.toLocaleString()}</b></button></footer>}</>:<><ol className="leaderboard-rows">{data?.rows.map(row=><li key={row.companyId} className={row.current?'is-current':''} aria-current={row.current?'true':undefined}><button className="leaderboard-player" onClick={()=>setSelected(row.companyId)} aria-label={`View ${row.name}'s profile`}><RankBadge rank={row.rank}/><UsernameLabel username={row.name}/><b className="influence-score" aria-label={`${row.influence.toLocaleString()} Influence`}><span>{row.influence.toLocaleString()}</span><InfluenceIcon/></b></button></li>)}</ol>
 {data&&!data.rows.length&&<p className="leaderboard-empty">No ranked players yet.</p>}
 {data?.own&&data.own.rank>10&&<footer><button className="leaderboard-player" onClick={()=>setSelected(data.own!.companyId)} aria-label={`View ${data.own.name}'s profile`}><RankBadge rank={data.own.rank}/><UsernameLabel username={data.own.name}/><b className="influence-score" aria-label={`${data.own.influence.toLocaleString()} Influence`}><span>{data.own.influence.toLocaleString()}</span><InfluenceIcon/></b></button></footer>}
 </>} </section></div>;
}
