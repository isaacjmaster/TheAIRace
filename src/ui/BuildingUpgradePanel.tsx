import {useState} from 'react';
import {buildingKind,buildingLevel,buildingStats} from '../../shared/building-levels';
import {quoteBuildingUpgrade,type FoundationState} from '../../shared/foundation';
import {BuildingImage} from './BuildingImage';
import {ComputeIcon} from './ComputeIcon';
import {LevelBadge,StatIcon} from './BuildingCard';
import './building-upgrades.css';
const names:Record<string,string>={hq:'Founder HQ',rig:'GPU Rig',lab:'Research Lab',fabricator:'Bot Fabricator',hangar:'Bot Hangar',sentinel:'Sentinel Tower',droneStation:'Security Drone Station',wall:'Security Wall',computeStorage:'Compute Storage',researchStorage:'Research Storage',station:'Builder Station'};
const duration=(ms:number)=>ms===0?'Instant':ms<60000?`${Math.ceil(ms/1000)}s`:`${Math.ceil(ms/60000)}m`;
export function BuildingUpgradePanel({state,ids,now,busy,error,onUpgrade,onClose}:{state:FoundationState;ids:string[];now:number;busy:boolean;error?:string;onUpgrade:(ids:string[],expectedLevels:Record<string,number>)=>Promise<boolean|undefined>;onClose:()=>void}){
 const [selected,setSelected]=useState(ids);const quotes=selected.map(id=>quoteBuildingUpgrade(state,id,now));
 const first=quotes[0],id=selected[0]??ids[0],kind=buildingKind(id),level=buildingLevel(state,id),current=buildingStats(kind,level),next=buildingStats(kind,Math.min(3,level+1));
 const rows:{label:string;from:string|number;to:string|number}[]=[{label:'Structure HP',from:current.maxHealth,to:next.maxHealth}];
 if(kind==='rig'||kind==='lab')rows.push({label:kind==='rig'?'Compute / min':'Research / min',from:current.productionPerMinute,to:next.productionPerMinute},{label:'Production buffer',from:current.buffer,to:next.buffer});
 if(kind==='hangar')rows.push({label:'Army housing',from:current.housing,to:next.housing});
 if(kind==='fabricator')rows.push({label:'Base training time',from:`${Math.round(current.trainingMultiplier*100)}%`,to:`${Math.round(next.trainingMultiplier*100)}%`});
 if(kind==='sentinel')rows.push({label:'Damage / Target Lock cap',from:`${current.sentinelDamage} / ${current.maxDamage}`,to:`${next.sentinelDamage} / ${next.maxDamage}`});
 if(kind==='droneStation')rows.push({label:'Drone HP',from:current.droneHealth,to:next.droneHealth},{label:'Drone damage',from:current.droneDamage,to:next.droneDamage});
 if(kind.endsWith('Storage'))rows.push({label:'Added global capacity',from:current.capacity,to:next.capacity});
 const total=quotes.reduce((n,q)=>n+q.cost,0),reason=quotes.find(q=>q.reason)?.reason??(state.compute<total?'Not enough Compute for this selection.':undefined),job=first?.job;
 return <div className="foundation-backdrop upgrade-backdrop"><section className="building-upgrade-panel glass" role="dialog" aria-modal="true" aria-label={`${names[kind]} upgrade`} onKeyDown={e=>{if(e.key==='Escape')onClose();}}><header><h2>{names[kind]}{ids.length>1?` · ${selected.length} selected`:''}</h2><LevelBadge level={level}/><button className="ui-icon-button" autoFocus onClick={onClose} aria-label="Close building upgrade">×</button></header>
 <div className="upgrade-panel-scroll"><div className="upgrade-models"><div><BuildingImage id={kind} level={level} name={names[kind]}/><span>Level {level}</span></div>{level<3&&<><b aria-hidden="true">→</b><div><BuildingImage id={kind} level={level+1} name={names[kind]}/><span>Level {level+1}</span></div></>}</div>
 {ids.length>1&&<small>Preview shows the first selected segment. Each wall advances one level; review individual costs below.</small>}<div className="upgrade-comparison">{rows.map(row=><div key={row.label}><span>{row.label}</span><strong>{row.from}{level<3&&<> <i>→</i> {row.to}</>}</strong></div>)}</div>
 {kind==='hq'&&level<3&&<p className="upgrade-benefit">{level===1?'Unlock Level 2 buildings, a second GPU Rig, Builder Bot and Security Drone.':'Unlock elite Level 3 buildings, 30-space Hangar upgrades and advanced resource storage.'}</p>}
 {(kind==='rig'||kind==='lab')&&<small>Building base values shown. Existing technology bonuses apply separately.</small>}
 {kind==='fabricator'&&<small>New orders use the shorter duration. Your existing training queue stays unchanged.</small>}
 {ids.length>1&&<details><summary>Review selected wall segments ({selected.length})</summary><div className="wall-upgrade-selection">{ids.map((wall,i)=><label key={wall}><input type="checkbox" checked={selected.includes(wall)} disabled={busy} onChange={e=>setSelected(s=>e.target.checked?[...s,wall]:s.filter(id=>id!==wall))}/>Segment {i+1} · Level {buildingLevel(state,wall)}</label>)}</div></details>}
 </div><footer>{job&&job.completesAt>now?<><strong role="status">Upgrading · {duration(job.completesAt-now)} remaining</strong><progress max={job.completesAt-job.startedAt} value={Math.max(0,now-job.startedAt)}/></>:level===3?<strong className="upgrade-max">Fully upgraded · Level 3</strong>:<><div className="upgrade-price"><span><ComputeIcon className="stat-icon"/>{total} Compute</span><span><StatIcon kind="time"/>{duration(first?.durationMs??0)}</span><span>HQ {first?.requiredHq??level+1}</span></div><button className="primary" disabled={busy||!selected.length||!!reason} onClick={()=>void onUpgrade(selected,Object.fromEntries(selected.map(id=>[id,buildingLevel(state,id)])))}>Upgrade {selected.length>1?`${selected.length} walls`:`to Level ${level+1}`}</button>{reason&&<small role="status">{reason}</small>}</>}{error&&<p role="alert">{error}</p>}</footer></section></div>;
}
