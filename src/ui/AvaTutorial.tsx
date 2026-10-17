import {avaLine,type AvaProgress,type AvaCommand} from '../../shared/ava';
import type {FoundationState} from '../../shared/foundation';
import './ava.css';
export function AvaTutorial({progress,state,now,panel,placing,busy,error,onCommand}:{progress:AvaProgress;state:FoundationState;now:number;panel:string|null;placing:string|null;busy:boolean;error:string;onCommand:(command:AvaCommand)=>void}){
 const step=progress.step,interactive=step>=7&&step<=10||step===12;
 return <aside className={`ava-dialogue ${interactive?'ava-guidance':''} ${panel==='build'?'ava-in-catalog':''}`} aria-label="Ava, your AI cofounder">
 <img src="/characters/ava/portrait.png" alt="Ava, a friendly white robot with glowing magenta eyes" width="88" height="88"/>
 <div className="ava-copy"><div className="ava-heading"><strong>AVA <small>AI COFOUNDER</small></strong><button className="ava-skip" disabled={busy} onClick={()=>onCommand('skip')}>Skip Tutorial</button></div>
 <p aria-live="polite">{avaLine(progress,state,now,panel,placing)}</p>
 {error&&<span className="ava-error" role="alert">{error} <button onClick={()=>onCommand('skip')}>Dismiss tutorial</button></span>}
 {!interactive&&<button className="ava-continue" disabled={busy} onClick={()=>onCommand('continue')}>{step===15?'Let’s build':'Continue'} <span aria-hidden="true">→</span></button>}
 {interactive&&<small className="ava-wait" role="status">{step===10?'Builder at work…':step===12?'Waiting for your first collection':placing==='build'?'Position your GPU Rig below':'Your turn'}</small>}
 </div></aside>;
}
