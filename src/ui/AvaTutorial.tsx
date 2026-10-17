import type {CompanyIdentity} from '../../shared/identity';
import {CompanyNameForm,companyRequest} from './CompanyProfile';
import {useEffect} from 'react';
import {avaLine,avaPose,type AvaProgress,type AvaCommand} from '../../shared/ava';
import type {FoundationState} from '../../shared/foundation';
import './ava.css';
import {AvaTargetArrow} from './AvaArrow';
export function AvaTutorial({progress,state,now,panel,placing,busy,error,onCommand,company,onCompany}:{company:CompanyIdentity;onCompany:(company:CompanyIdentity)=>void;progress:AvaProgress;state:FoundationState;now:number;panel:string|null;placing:string|null;busy:boolean;error:string;onCommand:(command:AvaCommand)=>void}){
 useEffect(()=>{for(const pose of ['welcome','point','build']){const image=new Image();image.src=`/characters/ava/${pose}-v2.png`;}},[]);
 const naming=progress.step===2&&!company.name&&!company.nameDeferred;
 const step=progress.step,interactive=step>=7&&step<=10||step===12;
 const showBuildPrompt=step>=7&&step<=9&&!state.rig&&!state.buildersBusy&&state.compute>=50&&panel!=='build'&&placing!=='build';
 const pose=showBuildPrompt?'build':avaPose(step);
 const arrowTarget=showBuildPrompt?'.foundation-build':step>=5&&step<=6?'.compute-hud':panel==='build'&&step>=7&&step<=9?'.ava-build-target':step===12?'.ava-collect-target':null;
 return <><AvaTargetArrow target={arrowTarget}/><aside className={`ava-dialogue ava-stage ${naming?'ava-naming':''} ${showBuildPrompt?'ava-beside-build':''} ${interactive?'ava-guidance':''} ${panel==='build'?'ava-in-catalog':''} ${step===12?'ava-collection':''}`} aria-label="Ava, your AI cofounder">
 <img key={pose} className="ava-character" data-pose={pose} src={`/characters/ava/${pose}-v2.png`} alt={pose==='build'?'Ava points down toward the Build button':pose==='point'?'Ava points encouragingly as she explains':'Ava welcomes you with an open hand'} width="256" height="384"/>
 <div className="ava-copy"><div className="ava-heading"><strong>AVA <small>AI COFOUNDER</small></strong><button className="ava-skip" disabled={busy} onClick={()=>onCommand('skip')}>Skip Tutorial</button></div>
 <p aria-live="polite">{naming?"Every great company needs a name. What should we call ours?":step===2&&company.name?`Welcome to the AI race, ${company.name}. Let's build something extraordinary.`:avaLine(progress,state,now,panel,placing)}</p>
 {naming&&<CompanyNameForm company={company} onCompany={onCompany} onLater={async()=>onCompany((await companyRequest('later',{},company.playerId)).company)}/>}
 {error&&<span className="ava-error" role="alert">{error} <button onClick={()=>onCommand('skip')}>Dismiss tutorial</button></span>}
 {!interactive&&!naming&&<button className="ava-continue" disabled={busy} onClick={()=>onCommand('continue')}>{step===15?'Let’s build':'Continue'} <span aria-hidden="true">→</span></button>}
 {interactive&&<small className="ava-wait" role="status">{step===10?'Builder at work…':step===12?'Waiting for your first collection':placing==='build'?'Position your GPU Rig below':'Your turn'}</small>}
 </div></aside></>;
}
