import type { GameState, Hardware } from '../../shared/contracts';
import type { ExpeditionState } from '../../shared/expedition';
import { Garage } from '../art/Garage';
import './headquarters.css';

export function Headquarters({state,hardware,expedition,now,installing,onRename,onNavigate}:{
  state:GameState;hardware:Hardware;expedition:ExpeditionState;now:number;installing:boolean;
  onRename:()=>void;onNavigate:(screen:'Explore'|'Missions'|'Upgrades')=>void;
}) {
  const ready=!!state.activeJob&&now>=state.activeJob.completesAt;
  const stage=['Humble beginnings','Your first workspace','A company taking shape'][Math.min(state.hardwareLevel,2)];
  return <div className={`headquarters-view ${installing?'equipment-installed':''}`}>
    <div className="hq-founder-heading"><div><span>FOUNDER’S HEADQUARTERS</span><button className="hq-company" onClick={onRename}>{state.companyName}<span aria-hidden="true"> ✎</span></button></div><span className="hq-stage-badge">LV {state.hardwareLevel+1}</span></div>
    <div className="hq-scene" aria-label="Headquarters scene"><div className="hq-ambient-light"/><Garage level={state.hardwareLevel} working={!!state.activeJob||!!expedition.run} rigLevel={(state.agentLevel||0)>0?1:0} installing={installing}/>{installing&&<span className="hq-install-feedback" role="status">✦ Equipment installed</span>}</div>
    <div className="hq-command-footer"><div className="hq-stage-summary"><span>{stage}</span><strong>{hardware.name}</strong></div><button className="hq-upgrades-link hq-operations-link" onClick={()=>onNavigate('Explore')}>ATTACK <span aria-hidden="true">↗</span></button>
      <span className="hq-founder-note">{state.activeJob?(ready?'Pixel’s contract is ready · Open Missions':'Pixel is working on a contract · Open Missions'):expedition.run?'Pixel is deployed · Review Operations':'Raid for credits and compute. Upgrade your company.'}</span>
    </div>
  </div>;
}
