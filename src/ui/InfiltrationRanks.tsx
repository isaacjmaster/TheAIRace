import {useEffect,useRef,useState} from 'react';
import {INFILTRATION_RANKS,INFILTRATION_RATING,infiltrationRank} from '../../shared/ranking';
import type {Operation} from '../../shared/infiltration';
import {sound} from '../audio/sound';

export function InfiltrationBadge({rating=0,size=48}:{rating?:number;size?:number}){const rank=infiltrationRank(rating);return <img className="infiltration-badge" src={`/ranks/${rank.id}.png`} width={size} height={size} alt={`${rank.name} league badge`}/>;}
export function LeagueIdentity({rating=0}:{rating?:number}){return <span className="league-identity"><InfiltrationBadge rating={rating}/><span><strong>{infiltrationRank(rating).name}</strong><small>{rating.toLocaleString()} Rating</small></span></span>;}
export function InfiltrationRanks({rating=0,onClose,onLeaderboard}:{rating?:number;onClose:()=>void;onLeaderboard:()=>void}){
 const rank=infiltrationRank(rating),index=INFILTRATION_RANKS.findIndex(r=>r.id===rank.id),next=INFILTRATION_RANKS[index+1],progress=next?Math.max(0,Math.min(100,(rating-rank.minRating)/(next.minRating-rank.minRating)*100)):100;
 const [selected,setSelected]=useState(rank.id),close=useRef<HTMLButtonElement>(null),inspected=INFILTRATION_RANKS.find(r=>r.id===selected)!;
 useEffect(()=>{close.current?.focus();},[]);
 return <div className="foundation-backdrop"><section className="infiltration-ranks" role="dialog" aria-modal="true" aria-labelledby="infiltration-ranks-title" onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const b=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')],first=b[0],last=b.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
 <header><h2 id="infiltration-ranks-title">Infiltration Ranks</h2><button ref={close} onClick={onClose} aria-label="Close infiltration ranks">×</button></header>
 <div className="rank-current"><InfiltrationBadge rating={rating} size={130}/><div><h3>{rank.name}</h3><strong>{rating.toLocaleString()} <small>Rating</small></strong>{next?<><div className="rank-progress" role="progressbar" aria-label={`Progress toward ${next.name}`} aria-valuemin={rank.minRating} aria-valuemax={next.minRating} aria-valuenow={rating}><span style={{width:`${progress}%`}}/></div><p>Next rank: {next.name} ({next.minRating.toLocaleString()})</p><small>{(next.minRating-rating).toLocaleString()} Rating to go</small></>:<p>Highest league achieved</p>}</div></div>
 <div className="rank-gallery" aria-label="Seven infiltration leagues">{INFILTRATION_RANKS.map(r=><button key={r.id} className={r.id===rank.id?'rank-owned':''} aria-pressed={selected===r.id} aria-label={`${r.name}, ${r.minRating.toLocaleString()} Rating${r.id===rank.id?', current league':rating<r.minRating?', not yet reached':''}`} onClick={()=>setSelected(r.id)}><InfiltrationBadge rating={r.minRating} size={70}/><strong>{r.name}</strong><small>{r.minRating.toLocaleString()}{r.maxRating===null?'+':`–${r.maxRating.toLocaleString()}`}</small></button>)}</div>
 <div className="rank-inspect" aria-live="polite"><InfiltrationBadge rating={inspected.minRating} size={94}/><div><h3>{inspected.name}</h3><p>{inspected.minRating.toLocaleString()} Rating required</p><small>{inspected.id===rank.id?'Your current league':rating<inspected.minRating?'Keep infiltrating to reach this league':'Below your current league'}</small></div></div>
 <p className="rank-rules">Earn Rating in eligible PvP infiltrations: 1 / 2 / 3 Breach Tokens award {INFILTRATION_RATING.rewards.slice(1).map(v=>`+${v}`).join(' / ')}. Zero tokens: {INFILTRATION_RATING.rewards[0]}, never below zero. One rated battle per opponent every six hours. Missions do not affect Rating.</p><button className="rank-leaderboards" onClick={onLeaderboard}>View leaderboards</button>
 </section></div>;
}
const celebratedBattles=new Set<string>();
function alreadyCelebrated(id:string){try{return celebratedBattles.has(id)||sessionStorage.getItem(`rank-promotion:${id}`)==='1';}catch{return celebratedBattles.has(id);}}
function markCelebrated(id:string){celebratedBattles.add(id);try{sessionStorage.setItem(`rank-promotion:${id}`,'1');}catch{}}
export function InfiltrationRatingResult({operation}:{operation:Operation}){
 const result=operation.settlement?.rating,promoted=!!result&&result.eligible&&infiltrationRank(result.after).minRating>infiltrationRank(result.before).minRating;
 const [celebrate,setCelebrate]=useState(false);
 useEffect(()=>{if(!promoted||alreadyCelebrated(operation.id))return;markCelebrated(operation.id);setCelebrate(true);if(celebratedBattles.size>100)celebratedBattles.delete(celebratedBattles.values().next().value!);sound.cue('rank-promotion');},[operation.id,promoted]);
 if(!result)return null;
 return <div className={`rating-result ${result.delta<0?'rating-loss':'rating-gain'} ${celebrate?'rank-promotion':''}`}>{celebrate&&<strong className="promotion-label">PROMOTED!</strong>}<LeagueIdentity rating={result.after}/><div><small>Infiltration Rating</small><strong>{result.delta>0?'+':''}{result.delta.toLocaleString()}</strong></div>{!result.eligible&&<small className="rating-ineligible">No Rating change · {result.reason||'this battle is not rating eligible'}</small>}</div>;
}
