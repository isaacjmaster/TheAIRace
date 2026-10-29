import {useEffect,useRef,useState} from 'react';
import {INFILTRATION_RANKS,INFILTRATION_RATING,infiltrationRank} from '../../shared/ranking';
import type {Operation} from '../../shared/infiltration';
import {sound} from '../audio/sound';

export function InfiltrationBadge({rating=0,size=48}:{rating?:number;size?:number}){const rank=infiltrationRank(rating);return <img className="infiltration-badge" src={`/ranks/${rank.id}.png`} width={size} height={size} alt={`${rank.name} league badge`}/>;}
export function LeagueIdentity({rating=0}:{rating?:number}){return <span className="league-identity"><InfiltrationBadge rating={rating}/><span><strong>{infiltrationRank(rating).name}</strong><small>{rating.toLocaleString()} Rating</small></span></span>;}
const leagueDescriptions:Record<string,string>={prototype:'Every great company starts here. Make your first mark on the network.',circuit:'Connected, coordinated, competitive. Build momentum with precise infiltrations.',alloy:'A proven contender. Turn strong planning into a lasting competitive edge.',prism:'Break through the ordinary. Precision and adaptability define this league.',quantum:'Master complex defenses. Consistent execution separates the exceptional.',singularity:'An elite presence on the network. Sustain your advantage against formidable rivals.',ascendant:'The pinnacle of the ladder. Set the standard for competitive infiltration.'};
export function InfiltrationRanks({rating=0,onClose,onLeaderboard}:{rating?:number;onClose:()=>void;onLeaderboard:()=>void}){
 const rank=infiltrationRank(rating),index=INFILTRATION_RANKS.findIndex(r=>r.id===rank.id),next=INFILTRATION_RANKS[index+1],progress=next?Math.max(0,Math.min(100,(rating-rank.minRating)/(next.minRating-rank.minRating)*100)):100;
 const [selected,setSelected]=useState(rank.id),close=useRef<HTMLButtonElement>(null),inspected=INFILTRATION_RANKS.find(r=>r.id===selected)!;
 useEffect(()=>{close.current?.focus();},[]);
 return <div className="foundation-backdrop"><section className="infiltration-ranks" role="dialog" aria-modal="true" aria-labelledby="infiltration-ranks-title" onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const b=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')],first=b[0],last=b.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
 <header><div><small>COMPETITIVE NETWORK</small><h2 id="infiltration-ranks-title">Infiltration Ranks</h2></div><button ref={close} onClick={onClose} aria-label="Close infiltration ranks">×</button></header>
 <div className="rank-screen-scroll">
 <div className="rank-current"><div className="rank-hero-emblem"><InfiltrationBadge rating={rating} size={130}/></div><div><small className="rank-kicker">YOUR LEAGUE</small><h3>{rank.name}</h3><strong>{rating.toLocaleString()} <small>Rating</small></strong><p className="rank-description">{leagueDescriptions[rank.id]}</p></div></div>
 <div className="rank-next">{next?<><div><span>Next: <b>{next.name}</b></span><strong>{(next.minRating-rating).toLocaleString()} <small>to go</small></strong></div><div className="rank-progress" role="progressbar" aria-label={`Progress toward ${next.name}`} aria-valuemin={rank.minRating} aria-valuemax={next.minRating} aria-valuenow={rating}><span style={{width:`${progress}%`}}/></div><small>{rating.toLocaleString()} / {next.minRating.toLocaleString()} Rating</small></>:<strong>Ascendant · Highest league achieved</strong>}</div>
 <div className="rank-ladder-heading"><h3>League ladder</h3><small>7 leagues · earned in PvP</small></div>
 <div className="rank-gallery" aria-label="Seven infiltration leagues">{INFILTRATION_RANKS.map((r,i)=><button key={r.id} style={{'--league-step':i} as import('react').CSSProperties} className={r.id===rank.id?'rank-owned':''} aria-pressed={selected===r.id} aria-label={`${r.name}, ${r.minRating.toLocaleString()} Rating${r.id===rank.id?', current league':rating<r.minRating?', not yet reached':''}`} onClick={()=>setSelected(r.id)}><InfiltrationBadge rating={r.minRating} size={64}/><strong>{r.name}</strong><small>{r.minRating.toLocaleString()}{r.maxRating===null?'+':''}</small><span className="league-pedestal" aria-hidden="true"/></button>)}</div>
 <div className="rank-inspect" aria-live="polite"><InfiltrationBadge rating={inspected.minRating} size={56}/><div><strong>{inspected.name}</strong><small>{inspected.minRating.toLocaleString()}{inspected.maxRating===null?'+':`–${inspected.maxRating.toLocaleString()}`} Rating · {inspected.id===rank.id?'Your league':rating<inspected.minRating?'Upcoming':'Reached'}</small><p>{leagueDescriptions[inspected.id]}</p></div></div>
 <details className="rank-rules"><summary>How Rating works</summary><p>Earn Rating in eligible PvP infiltrations: 1 / 2 / 3 Breach Tokens award {INFILTRATION_RATING.rewards.slice(1).map(v=>`+${v}`).join(' / ')}. Zero tokens: {INFILTRATION_RATING.rewards[0]}, never below zero. One rated battle per opponent every six hours. Missions do not affect Rating.</p></details>
 </div><footer><button className="rank-leaderboards" onClick={onLeaderboard}>View leaderboards <span aria-hidden="true">↗</span></button></footer>
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
