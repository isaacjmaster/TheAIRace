import type {DatabaseSync} from 'node:sqlite';
import type {FoundationState} from '../shared/foundation';
import {reconcileTroopResearch} from '../shared/technology';
/** One all-account transaction, original full saves retained before any mutation. Fail closed on unknown jobs. */
export function preflightTroopResearch(db:DatabaseSync,now:number){
 for(const row of db.prepare('SELECT state FROM foundation_saves').all())reconcileTroopResearch(JSON.parse(String(row.state)),now);
}
export function migrateTroopResearch(db:DatabaseSync,now:number){
 const rows=db.prepare('SELECT id,state FROM foundation_saves').all() as {id:string;state:string}[];
 const pending=rows.flatMap(row=>{const state=JSON.parse(row.state) as FoundationState;if(state.researchMigration?.version===1)return [];reconcileTroopResearch(state,now);return [{...row,next:state}];});
 if(!pending.length)return {migrated:0};
 db.exec('BEGIN IMMEDIATE');try{
  db.exec('CREATE TABLE IF NOT EXISTS troop_research_migration_v1(save_id TEXT PRIMARY KEY,original_state TEXT NOT NULL,audit TEXT NOT NULL,migrated_at INTEGER NOT NULL)');
  for(const row of pending){db.prepare('INSERT INTO troop_research_migration_v1 VALUES(?,?,?,?)').run(row.id,row.state,JSON.stringify(row.next.researchMigration),now);row.next.revision++;db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(row.next),row.id);}
  db.exec('COMMIT');return {migrated:pending.length};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
