import {LevelBadge} from './BuildingCard';
import {founderHqLevel} from '../../shared/founder-hq';
import type {FoundationState} from '../../shared/foundation';
import {BuildingImage} from './BuildingImage';
export function FounderHQPanel({state,now,busy,onUpgrade}:{state:FoundationState;now:number;busy:boolean;onUpgrade:()=>void}){
 const level=founderHqLevel(state),job=state.hqUpgrade&&state.hqUpgrade.completesAt>now?state.hqUpgrade:undefined;
 return <><div className="hq-panel-heading"><strong className="hq-panel-title">Founder HQ</strong><LevelBadge level={level}/></div><div className="hq-current-model"><BuildingImage id="hq" level={level} name="Founder HQ"/></div>{job?<p role="status">Upgrading · {Math.ceil((job.completesAt-now)/1000)}s</p>:level<5?<button className="primary building-upgrade-link" disabled={busy} onClick={onUpgrade}>Explore Level {level+1}</button>:<strong>Fully upgraded · Level 5</strong>}</>;
}
