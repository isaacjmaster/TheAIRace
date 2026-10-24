import {useState} from 'react';
import {BASE_IDS,craftCampusTarget} from '../../shared/infiltration-bases';
import {InfiltrationTargetPreview} from './InfiltrationTargetPreview';
export function MissionCarousel({available,busy,onLaunch}:{available:number;busy:boolean;onLaunch:(id:string)=>Promise<void>}){
 const [index,setIndex]=useState(0),id=BASE_IDS[index],name=craftCampusTarget(id).name;
 return <section className="mission-carousel" aria-label="Mission selection"><header aria-live="polite"><small>MISSION {index+1}</small><h3>{name}</h3></header><div className="mission-base-preview"><InfiltrationTargetPreview key={id} id={id} name={name}/></div><nav aria-label="Browse missions"><button aria-label="Previous mission" disabled={busy||index===0} onClick={()=>setIndex(i=>i-1)}>◀</button><button aria-label="Next mission" disabled={busy||index===BASE_IDS.length-1} onClick={()=>setIndex(i=>i+1)}>▶</button></nav><button className="player-visit-button" aria-label={`Infiltrate ${name}`} disabled={busy||available<1} onClick={()=>void onLaunch(id)}>INFILTRATE</button>{available<1&&<p>Train a Pulsewheel to begin.</p>}</section>;
}
