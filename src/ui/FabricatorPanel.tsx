import {buildingLevel,buildingStats,housingCapacity} from '../../shared/building-levels';
import {useState} from 'react';
import {LevelBadge,StatIcon,type StatKind} from './BuildingCard';
import {trainingMilliseconds} from '../../shared/technology';
import {availableTroops,armyUsed,hangarReady,getHangar,type FoundationState} from '../../shared/foundation';
import {TROOPS,type TroopKind} from '../../shared/troops';
import {BuildingImage} from './BuildingImage';
import {ComputeIcon} from './ComputeIcon';
export function availableTraining(state:FoundationState,now:number,kind:TroopKind='pulsewheel'){const t=TROOPS[kind];return hangarReady(state,now)&&(state.founderHqLevel??1)>=t.unlockHq?Math.max(0,Math.min(10,Math.floor((housingCapacity(state)-armyUsed(state))/t.housing),Math.floor(state.compute/t.cost))):0;}
export function FabricatorPanel({state,now,busy,onTrain,onClose,onBuildingUpgrade}:{state:FoundationState;now:number;busy:boolean;onTrain:(count:number,troop?:TroopKind)=>Promise<boolean|undefined>;onCancelWaiting?:()=>void;onClose:()=>void;onBuildingUpgrade?:()=>void}){
 const [kind,setKind]=useState<TroopKind>('pulsewheel'),t=TROOPS[kind],queued=state.training?.length??0,used=armyUsed(state),max=availableTraining(state,now,kind),locked=(state.founderHqLevel??1)<t.unlockHq;
 const duration=Math.round(trainingMilliseconds(state)*t.trainSeconds/10*buildingStats('fabricator',buildingLevel(state,'fabricator')).trainingMultiplier)/1000;
 const reason=locked?'Unlocks at Founder HQ Level 2':!hangarReady(state,now)?getHangar(state)?'Hangar building':'Build Bot Hangar':housingCapacity(state)-used<t.housing?'Not enough housing':state.compute<t.cost?'Not enough Compute':'';
 const next=state.trainingKinds?.[0]??'pulsewheel';
 return <section className="bot-panel fabricator-panel glass" aria-label="Bot Fabricator"><button className="bot-close" aria-label="Close building panel" onClick={onClose}>×</button><header className="fabricator-heading"><h2>Bot Fabricator</h2><LevelBadge level={buildingLevel(state,'fabricator')}/><button className="fabricator-upgrade" onClick={onBuildingUpgrade} aria-label="Upgrade Bot Fabricator">Upgrade</button></header>
 <div className="fabricator-troop-tabs" role="group" aria-label="Choose troop">{(['pulsewheel','breacher'] as const).map(k=><button key={k} aria-pressed={kind===k} onClick={()=>setKind(k)}><BuildingImage id={k==='pulsewheel'?'cipher':'breacher'} name={TROOPS[k].name}/><strong>{TROOPS[k].name}</strong><small>{availableTroops(state,k)} ready · {TROOPS[k].housing} housing</small></button>)}</div>
 <p className="troop-role">{t.description}</p>
 <div className="troop-stats" aria-label={`${t.name} statistics`}>{([{kind:'health',value:t.health,label:'Health'},{kind:'damage',value:t.damage,label:'Damage per hit'},{kind:'capacity',value:t.housing,label:'Housing'},{kind:'time',value:`${duration}s`,label:'Training time'},{kind:'compute',value:t.cost,label:'Compute cost'}] as {kind:StatKind;value:string|number;label:string}[]).map(stat=><span key={stat.kind} className={`stat-${stat.kind}`} title={stat.label} aria-label={`${stat.label}: ${stat.value}`}><StatIcon kind={stat.kind}/><strong>{stat.value}</strong></span>)}</div>
 <div className="fabricator-overview"><span>Housing</span><strong aria-label={`${used} of ${housingCapacity(state)} housing used`}>{used} / {housingCapacity(state)}</strong><meter min={0} max={housingCapacity(state)} value={used} aria-label="Housing used"/></div>
 {queued>0&&<div className="mixed-training-queue" role="status"><strong>{TROOPS[next].name} · {Math.max(0,Math.ceil((state.training![0]-now)/1000))}s</strong><progress max={1} value={Math.max(0,Math.min(1,1-(state.training![0]-now)/(state.trainingDurations?.[0]??10000)))}/><small title={state.training!.map((_,i)=>TROOPS[state.trainingKinds?.[i]??'pulsewheel'].name).join(', ')}>{queued} queued</small></div>}
 <div className="fabricator-training"><button className="queue-confirm" aria-label={`Train ${t.name}`} disabled={busy||max<1} onClick={()=>void onTrain(1,kind)}>Train {t.name}<span className="train-cost"><ComputeIcon className="train-compute"/>{t.cost}</span></button><button aria-label="Train Maximum" disabled={busy||max<1} onClick={()=>void onTrain(max,kind)}>Train maximum · {max} · {max*t.cost} Compute</button></div>{reason&&<small className="fabricator-hint" role="status">{reason}</small>}</section>;
}
