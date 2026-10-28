import type {FoundationState} from './foundation';
import {wallCapacity} from './founder-hq';
import {prepareBuildingUpdate} from './building-update';
/** New accounts are already on the current wall geometry, so never need a forced rebuild. */
export function markWallRebuildCurrent(s:FoundationState,now=0){s.wallRebuild??={version:1,inventory:[],completed:true,migratedAt:now};}
/** Only used by the versioned server migration, never accepted from a client save. */
export function prepareWallRebuild(s:FoundationState,now:number){
 if(s.wallRebuild)return false;
 const owned=structuredClone(s.walls??[]);
 if(new Set(owned.map(w=>w.id)).size!==owned.length)throw Error('Wall inventory has duplicate IDs; manual reconciliation required.');
 // A previous migration may hold an explicit, unspent replacement entitlement.
 if(!owned.length&&s.buildingUpdate?.pending&&s.buildingUpdate.replacementCount){
  const count=s.buildingUpdate.replacementCount;
  if(!Number.isSafeInteger(count)||count<0||count>1000)throw Error('Invalid prior wall replacement entitlement.');
  for(let i=0;i<count;i++)owned.push({id:'replacement-wall-'+i,position:[.5,.5],orientation:0});
 }
 const priorCap=wallCapacity(s);s.wallAllowance=Math.max(priorCap,owned.length);
 prepareBuildingUpdate(s);
 s.wallRebuild={version:1,inventory:owned,completed:owned.length===0,migratedAt:now};
 if(owned.length){s.walls=[];s.buildingUpdate={version:1,acknowledged:false,pending:true,replacementCount:owned.length};}
 return true;
}
