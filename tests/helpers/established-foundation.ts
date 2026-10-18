import {initialFoundation,type FoundationState} from '../../shared/foundation';
import {randomUUID} from 'node:crypto';
/** Representative pre-onboarding save: implicit station at its original location. */
export function establishedFoundation(revision=0):FoundationState{const s=initialFoundation(revision);delete s.starterStation;s.builders=1;return s;}
export async function placeTestStation(base:string,headers:Record<string,string>,generation=0){const r=await fetch(base+'/bots',{method:'POST',headers,body:JSON.stringify({generation,requestId:randomUUID(),command:{action:'establish-station',position:[3,5]}})});if(!r.ok)throw Error(await r.text());return r.json();}
