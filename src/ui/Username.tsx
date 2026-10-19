import {useEffect,useRef,useState} from 'react';
import {cleanUsername,type CompanyIdentity} from '../../shared/identity';
import {companyRequest} from './companyRequest';
import './company.css';
import {UsernameLabel} from './UsernameLabel';
export function UsernameForm({company,onCompany}:{company:CompanyIdentity;onCompany:(c:CompanyIdentity)=>void;onLater?:()=>void|Promise<void>}){
 const [username,setUsername]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const submitting=useRef(false);
 async function save(e:React.FormEvent){e.preventDefault();if(submitting.current)return;submitting.current=true;setBusy(true);setError('');try{const result=await companyRequest('username',{username:cleanUsername(username)},company.playerId);onCompany(result.company);}catch(e){const failure=e as Error&{company?:CompanyIdentity};if(failure.company)onCompany(failure.company);setError(failure.message);}finally{submitting.current=false;setBusy(false);}}
 return <form noValidate className="company-name-form username-form" onSubmit={e=>void save(e)}><label htmlFor="username">Username</label><input id="username" name="username" value={username} onChange={e=>setUsername(e.target.value)} maxLength={64} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Your username" required disabled={busy}/>{error&&<p role="alert">{error}</p>}<button className="primary" type="submit" disabled={busy}>{busy?'Saving…':'Save'}</button></form>;
}
export function UsernamePanel({company,onCompany,onSaved}:{company:CompanyIdentity;onCompany:(c:CompanyIdentity)=>void;onSaved?:()=>void}){
 const [success,setSuccess]=useState(false),[elapsed,setElapsed]=useState(0);
 const anchor=useRef({server:company.serverTime,local:performance.now()});
 useEffect(()=>{anchor.current={server:company.serverTime,local:performance.now()};setElapsed(0);},[company.serverTime]);
 useEffect(()=>{const timer=setInterval(()=>setElapsed(performance.now()-anchor.current.local),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(!success)return;const timer=setTimeout(()=>setSuccess(false),3000);return()=>clearTimeout(timer);},[success]);
 const remaining=Math.max(0,(company.usernameAvailableAt??0)-anchor.current.server-elapsed);
 const unit=remaining>86400000?'days':remaining>3600000?'hours':remaining>60000?'minutes':'seconds';
 const amount=Math.ceil(remaining/(unit==='days'?86400000:unit==='hours'?3600000:unit==='minutes'?60000:1000));
 return <div className="username-panel">{company.username&&<UsernameLabel username={company.username}/>}{remaining>0?<><p className="username-cooldown" role="status">Available in {amount} {amount===1?unit.slice(0,-1):unit}</p><button className="primary" disabled>Save</button></>:<UsernameForm company={company} onCompany={next=>{onCompany(next);if(next.username&&next.username!==company.username){setSuccess(true);onSaved?.();}}}/>} {success&&<p className="username-success" role="status">Username saved</p>}</div>;
}
