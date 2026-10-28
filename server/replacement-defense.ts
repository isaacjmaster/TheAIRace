import type {DatabaseSync} from 'node:sqlite';
import type {FoundationState} from '../shared/foundation';
import {publicBase} from '../shared/player-base';

/** Migration protection is a preserved defense, not an unlimited invulnerability shield. */
export function replacementDefense(db:DatabaseSync,saveId:string,s:FoundationState,now:number){
 if(!s.buildingUpdate?.pending||s.wallRebuild?.firstCommittedAt!==undefined)return {state:s,protected:false};
 let snapshot:FoundationState|undefined;
 try{const row=db.prepare('SELECT state FROM wall_rebuild_v1_snapshots WHERE save_id=?').get(saveId);if(row)snapshot=JSON.parse(String(row.state));}catch{/* Older isolated saves may not have migration snapshots. */}
 if(snapshot?.walls?.length&&publicBase(snapshot,'migration',now))return {state:snapshot,protected:false};
 // Old entitlement-only saves have no defensible snapshot. The fallback is explicitly bounded.
 const until=(s.wallRebuild?.migratedAt??0)+24*60*60*1000;
 return {state:s,protected:now<until};
}
