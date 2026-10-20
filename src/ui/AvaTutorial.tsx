import type {CompanyIdentity} from '../../shared/identity';
import {UsernameForm} from './Username';
import {useEffect,useState} from 'react';
import {avaHudTarget,avaReadTime,avaWaiting} from './avaPresentation';
import {builderLesson,avaLine,avaPose,type AvaProgress,type AvaCommand} from '../../shared/ava';
import type {FoundationState} from '../../shared/foundation';
import './ava.css';
import {AvaTargetArrow} from './AvaArrow';
export function AvaTutorial({progress,state,now,panel,placing,busy,error,onCommand,company,onCompany,namingOnly=false,onDismissNaming}:{namingOnly?:boolean;onDismissNaming?:()=>void;company:CompanyIdentity;onCompany:(company:CompanyIdentity)=>void;progress:AvaProgress;state:FoundationState;now:number;panel:string|null;placing:string|null;busy:boolean;error:string;onCommand:(command:AvaCommand)=>void}){
 useEffect(()=>{for(const pose of ['welcome','point','build']){const image=new Image();image.src=`/characters/ava/${pose}-v2.png`;}},[]);
 const step=namingOnly?2:progress.step;
 const naming=step===2&&!company.username&&(namingOnly||!company.nameDeferred);
 const stationLesson=!namingOnly&&builderLesson(progress),stationInteractive=stationLesson&&(progress.builderStep===1||progress.builderStep===2);
 const interactive=stationInteractive||step>=7&&step<=10||step===12;
 const showBuildPrompt=stationInteractive&&panel!=='build'&&placing!=='station'||step>=7&&step<=9&&!state.rig&&!state.buildersBusy&&state.compute>=50&&panel!=='build'&&placing!=='build';
 const pose=showBuildPrompt?'build':avaPose(step);
 const arrowTarget=namingOnly?null:showBuildPrompt?'.foundation-build':stationInteractive&&panel==='build'?'.ava-build-target':avaHudTarget(progress)??(panel==='build'&&step>=7&&step<=9?'.ava-build-target':null);
 const text=naming?"What should we call you, Founder?":step===2&&company.username?`Welcome to the AI race, ${company.username}.`:avaLine(progress,state,now,panel,placing);
 const waiting=!namingOnly&&!stationLesson&&avaWaiting(step,state);
 const waitKey=waiting?`${company.playerId}:${step}:${progress.revision}:${state.rig?.startedAt}`:'';
 const [dismissed,setDismissed]=useState(()=>{try{return sessionStorage.getItem('ava-wait-dismissed')||'';}catch{return '';}});
 const dismiss=()=>{setDismissed(waitKey);try{sessionStorage.setItem('ava-wait-dismissed',waitKey);}catch{/* Guidance still works without browser storage. */}};
 const collapsed=waiting&&dismissed===waitKey&&!error;
 useEffect(()=>{if(!waiting||collapsed)return;const timer=setTimeout(dismiss,avaReadTime(text));return()=>clearTimeout(timer);},[waitKey,text,collapsed]);
 if(collapsed)return null;
 return <><AvaTargetArrow target={arrowTarget}/><aside className={`ava-dialogue ava-stage ${naming?'ava-naming':''} ${showBuildPrompt?'ava-beside-build':''} ${interactive?'ava-guidance':''} ${panel==='build'?'ava-in-catalog':''} ${step===12?'ava-collection':''}`} aria-label="Ava, your AI cofounder">
 <img key={pose} className="ava-character" data-pose={pose} src={`/characters/ava/${pose}-v2.png`} alt={pose==='build'?'Ava points down toward the Build button':pose==='point'?'Ava points encouragingly as she explains':'Ava welcomes you with an open hand'} width="256" height="384"/>
 <div className="ava-copy"><div className="ava-heading"><strong>AVA <small>AI COFOUNDER</small></strong>{!namingOnly&&<button className="ava-skip" disabled={busy} onClick={()=>onCommand('skip')}>Skip Tutorial</button>}</div>
 <p aria-live="polite">{text}</p>
 {naming&&<UsernameForm company={company} onCompany={onCompany}/>}
 {error&&<span className="ava-error" role="alert">{error} <button onClick={()=>namingOnly?onDismissNaming?.():onCommand('skip')}>Dismiss tutorial</button></span>}
 {!interactive&&!naming&&<button className="ava-continue" disabled={busy} onClick={()=>namingOnly?onDismissNaming?.():onCommand('continue')}>{step===15?'Let’s build':'Continue'} <span aria-hidden="true">→</span></button>}
 {waiting&&<button className="ava-continue" disabled={busy} onClick={dismiss}>Explore <span aria-hidden="true">→</span></button>}
 {interactive&&<small className="ava-wait" role="status">{step===10?'Builder at work…':step===12?'Waiting for your first collection':placing==='station'?'Position your Builder Station below':placing==='build'?'Position your GPU Rig below':'Your turn'}</small>}
 </div></aside></>;
}
