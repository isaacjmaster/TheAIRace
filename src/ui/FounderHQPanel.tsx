import {FOUNDER_HQ,founderHqLevel} from '../../shared/founder-hq';
import type {FoundationState} from '../../shared/foundation';
export function FounderHQPanel({state,now,busy,onUpgrade}:{state:FoundationState;now:number;busy:boolean;onUpgrade:()=>void}){
 const level=founderHqLevel(state),job=level===1?state.hqUpgrade:undefined,remaining=job?Math.max(0,Math.ceil((job.completesAt-now)/1000)):0;
 const available=state.builders-(state.buildersBusy||0),cost=FOUNDER_HQ.upgradeCost;
 return <><strong>Founder HQ — Level {level}</strong>{job?<><span role="status">{remaining?`Upgrading · ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`:'Completing upgrade…'}</span><progress aria-label="Founder HQ upgrade progress" max={FOUNDER_HQ.upgradeMs} value={Math.min(FOUNDER_HQ.upgradeMs,Math.max(0,now-job.startedAt))}/><small>Unlocks: 2 GPU Rigs</small></>:level===1?<><span>Upgrade to Level 2</span><span>{cost} Compute · {FOUNDER_HQ.upgradeMs/60000} min</span><small>Unlocks: 2 GPU Rigs</small><button className="primary" disabled={busy||state.compute<cost||available<1} onClick={onUpgrade}>{busy?'Saving…':'Upgrade'}</button>{available<1?<small>{state.builders<1?'Place Builder Station first':'Builder Bot is busy'}</small>:state.compute<cost?<small>Need {cost-state.compute} more Compute</small>:null}</>:<small>2 GPU Rigs unlocked</small>}</>;
}
