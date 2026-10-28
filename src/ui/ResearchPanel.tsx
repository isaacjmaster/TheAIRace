import {FinishNowButton} from './Catalysts';
import {buildingLevel} from '../../shared/building-levels';
import {useState} from 'react';
import {TROOP_RESEARCH} from '../../shared/technology';
import {TROOPS,troopLevel,troopStats,type TroopKind} from '../../shared/troops';
import type {FoundationState} from '../../shared/foundation';
import {TaskCountdown} from './TaskCountdown';
import {ResearchIcon} from './ResearchIcon';
import {BuildingImage} from './BuildingImage';
import './research-panel.css';
const kinds:TroopKind[]=['pulsewheel','breacher','disruptor'];
const model=(kind:TroopKind)=>kind==='pulsewheel'?'cipher':kind;
export function ResearchPanel({state,now,busy,error,onUpgrade,onClose,onBuildingUpgrade}:{state:FoundationState;now:number;busy:boolean;error:string;onUpgrade:(id:TroopKind,level:number)=>void;onClose:()=>void;onBuildingUpgrade?:()=>void}){
 const [selected,setSelected]=useState<TroopKind>(state.troopResearch?.troop??state.completedTroopResearch?.troop??'pulsewheel');
 const [dismissedCompletion,setDismissedCompletion]=useState<number>();
 const ready=!!state.lab&&now>=state.lab.completesAt,job=state.troopResearch,level=troopLevel(state,selected),next=level===3?3:level+1 as 2|3,current=troopStats(selected,level),cfg=level<3?TROOP_RESEARCH[selected][next as 2|3]:undefined;
 const locked=!!cfg&&buildingLevel(state,'lab')<cfg.requiredLab,unavailable=(state.founderHqLevel??1)<TROOPS[selected].unlockHq,affordable=!cfg||(state.research??0)>=cfg.cost,notice=state.completedTroopResearch,justCompleted=!job&&notice?.troop===selected&&now-notice.completedAt<60000&&dismissedCompletion!==notice.completedAt;
 const comparisonLevel=justCompleted?(Math.max(1,level-1) as 1|2|3):level,comparisonNext=justCompleted?level:next,fromStats=troopStats(selected,comparisonLevel),toStats=troopStats(selected,comparisonNext),showChange=comparisonLevel!==comparisonNext;
 return <div className="research-backdrop"><section className="research-panel glass troop-research" role="dialog" aria-modal="true" aria-label="Research Lab" onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const b=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')],first=b[0],last=b.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
 <header><div><h2>Research Lab · Lv. {buildingLevel(state,'lab')}</h2><button onClick={onBuildingUpgrade}>Upgrade building</button></div><button autoFocus className="research-close" aria-label="Close Research Lab" onClick={onClose}>×</button></header>
 <nav className="troop-research-tabs" aria-label="Troop upgrades">{kinds.map(kind=><button key={kind} aria-label={`Select ${TROOPS[kind].name} upgrades`} aria-pressed={selected===kind} onClick={()=>setSelected(kind)}><BuildingImage id={model(kind)} level={troopLevel(state,kind)} name={TROOPS[kind].name}/><strong>{TROOPS[kind].name}</strong><small>Lv. {troopLevel(state,kind)}</small></button>)}</nav>
 <h3>{current.name} · {justCompleted?`Level ${level} unlocked`:level===3?'Level 3 — Elite':`Level ${level} → ${next}`}</h3>
 <div className={`troop-research-comparison${justCompleted?' research-evolved':''}`} key={selected+level}><figure><BuildingImage id={model(selected)} level={comparisonLevel} name={current.name}/><figcaption>{justCompleted?'Previous':'Current'}</figcaption></figure>{(level<3||justCompleted)&&<><span aria-hidden="true">→</span><figure><BuildingImage id={model(selected)} level={comparisonNext} name={current.name}/><figcaption>{justCompleted?'Upgraded!':'Next level'}</figcaption></figure></>}</div>
 <div className="troop-research-stats"><span>Health <b>{fromStats.health}{showChange&&` → ${toStats.health}`}</b></span><span>Damage <b>{fromStats.damage}{showChange&&` → ${toStats.damage}`}</b></span>{selected==='disruptor'&&<span>EMP <b>{fromStats.empDurationMs/1000}s{showChange&&` → ${toStats.empDurationMs/1000}s`}</b></span>}</div>
 {justCompleted&&<p role="status">{current.name} Level {level} unlocked — all your {current.name}s are upgraded.</p>}
 {justCompleted?<button className="technology-upgrade" onClick={()=>setDismissedCompletion(notice!.completedAt)}>{level<3?'View next upgrade':'Continue'}</button>:job?<div className="research-active" role="status"><strong>{TROOPS[job.troop].name} · Level {job.level}</strong><TaskCountdown clock name="Troop upgrade" startedAt={job.startedAt} completesAt={job.completesAt} now={now}/></div>:cfg?<><div className="troop-research-cost"><span><ResearchIcon/>{cfg.cost} / {Math.floor(state.research??0)} available</span><span>{cfg.durationMs/60000} min · Lab Lv. {cfg.requiredLab}</span></div><button className="technology-upgrade" disabled={busy||!ready||locked||unavailable||!affordable} onClick={()=>onUpgrade(selected,level)}>{!ready?'Finish Research Lab':unavailable?`Requires HQ Level ${TROOPS[selected].unlockHq}`:locked?`Requires Lab Level ${cfg.requiredLab}`:!affordable?`Need ${cfg.cost-(state.research??0)} more Research`:`Upgrade ${current.name}`}</button></>:<div className="technology-max">MAX LEVEL</div>}
 <FinishNowButton kind="research"/>{error&&<p role="alert">{error}</p>}<small className="troop-research-note">One troop upgrade at a time. Current battles keep their starting troop levels.</small>
 </section></div>;
}
