import {useState} from 'react';
import {LevelBadge} from './BuildingCard';
import {trainingMilliseconds} from '../../shared/technology';
import {availableTroops,armyUsed,hangarReady,getHangar,type FoundationState} from '../../shared/foundation';
import {TROOPS,HANGAR_HOUSING,type TroopKind} from '../../shared/troops';
import {BuildingImage} from './BuildingImage';
import {ComputeIcon} from './ComputeIcon';
export function availableTraining(state:FoundationState,now:number,kind:TroopKind='pulsewheel'){const t=TROOPS[kind];return hangarReady(state,now)&&(state.founderHqLevel??1)>=t.unlockHq?Math.max(0,Math.min(10,Math.floor((HANGAR_HOUSING-armyUsed(state))/t.housing),Math.floor(state.compute/t.cost))):0;}
export function FabricatorPanel({state,now,busy,onTrain,onClose}:{state:FoundationState;now:number;busy:boolean;onTrain:(count:number,troop?:TroopKind)=>Promise<boolean|undefined>;onCancelWaiting?:()=>void;onClose:()=>void}){
 const [kind,setKind]=useState<TroopKind>('pulsewheel'),t=TROOPS[kind],queued=state.training?.length??0,used=armyUsed(state),max=availableTraining(state,now,kind),locked=(state.founderHqLevel??1)<t.unlockHq;
 const duration=kind==='breacher'?t.trainSeconds*trainingMilliseconds(state)/10000:trainingMilliseconds(state)/1000;
 const reason=locked?'Unlocks at Founder HQ Level 2':!hangarReady(state,now)?getHangar(state)?'Hangar building':'Build Bot Hangar':HANGAR_HOUSING-used<t.housing?'Not enough housing':state.compute<t.cost?'Not enough Compute':'';
 const next=state.trainingKinds?.[0]??'pulsewheel';
 return <section className="bot-panel fabricator-panel glass" aria-label="Bot Fabricator"><button className="bot-close" aria-label="Close building panel" onClick={onClose}>×</button><header className="fabricator-heading"><h2>Bot Fabricator</h2><LevelBadge level={1}/></header>
 <div className="fabricator-troop-tabs" role="group" aria-label="Choose troop">{(['pulsewheel','breacher'] as const).map(k=><button key={k} aria-pressed={kind===k} onClick={()=>setKind(k)}><BuildingImage id={k==='pulsewheel'?'cipher':'breacher'} name={TROOPS[k].name}/><strong>{TROOPS[k].name}</strong><small>{availableTroops(state,k)} ready · {TROOPS[k].housing} housing</small></button>)}</div>
 <div className="troop-details"><strong>{t.name}</strong><p>{t.description}</p><div className="troop-stats"><span>{t.health} HP</span><span>{t.damage} DMG</span><span>{t.housing} housing</span></div></div>
 <div className="fabricator-overview"><strong className="fabricator-capacity" aria-label={`${used} of ${HANGAR_HOUSING} housing used`}>{used}<small>/ {HANGAR_HOUSING}<br/>housing</small></strong><span className="fabricator-time">{duration}s</span><span className="train-cost"><ComputeIcon className="train-compute"/>{t.cost}</span></div>
 {queued>0&&<div className="mixed-training-queue" role="status"><strong>{TROOPS[next].name} · {Math.max(0,Math.ceil((state.training![0]-now)/1000))}s</strong><progress max={1} value={Math.max(0,Math.min(1,1-(state.training![0]-now)/(state.trainingDurations?.[0]??10000)))}/><small>{queued} queued · {state.training!.map((_,i)=>TROOPS[state.trainingKinds?.[i]??'pulsewheel'].name).join(', ')}</small></div>}
 <div className="fabricator-training"><button className="queue-confirm" aria-label={`Train ${t.name}`} disabled={busy||max<1} onClick={()=>void onTrain(1,kind)}>Train {t.name}<span className="train-cost"><ComputeIcon className="train-compute"/>{t.cost}</span></button><button aria-label="Train Maximum" disabled={busy||max<1} onClick={()=>void onTrain(max,kind)}>Train maximum · {max} · {max*t.cost} Compute</button></div>{reason&&<small className="fabricator-hint" role="status">{reason}</small>}</section>;
}
