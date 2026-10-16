import React from 'react';
import type {FoundationState} from '../../shared/foundation';
function BuilderIcon(){return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4v5M7 23l-3 4m21-4 3 4"/><rect x="5" y="9" width="22" height="17" rx="5"/><path d="M10 16v3m12-3v3"/></svg>;}
export function CompanyStatus({state}:{state:FoundationState}){
 const available=Math.max(0,state.builders-(state.buildersBusy??0));
 return <div className="foundation-status"><div className="foundation-player glass" aria-label={`Level ${state.level} — Company`}><span className="foundation-level">{state.level}</span><div className="foundation-company-label"><small>LEVEL {state.level}</small><strong>Company</strong></div></div><div className="foundation-builder-box glass"><span className="foundation-builders" role="status" aria-label={`${available}/${state.builders} Builders`}><BuilderIcon/>{available}/{state.builders} Builders</span></div></div>;
}
