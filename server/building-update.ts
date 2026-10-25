import type {DatabaseSync} from 'node:sqlite';
import {prepareBuildingUpdate} from '../shared/building-update';
import type {FoundationState} from '../shared/foundation';
export function migrateBuildingUpdate(db:DatabaseSync){
 db.exec('CREATE TABLE IF NOT EXISTS building_update_snapshots(save_id TEXT PRIMARY KEY,state TEXT NOT NULL,wall_count INTEGER NOT NULL,created_at INTEGER NOT NULL)');
 let affected=0,total=0;db.exec('BEGIN IMMEDIATE');
 try{for(const row of db.prepare('SELECT id,state FROM foundation_saves').all()){
 const s=JSON.parse(String(row.state)) as FoundationState;if(s.buildingUpdate||s.version!==1||!Number.isInteger(s.revision))continue;
 const count=s.walls?.length??0;
 db.prepare('INSERT OR IGNORE INTO building_update_snapshots VALUES(?,?,?,?)').run(String(row.id),String(row.state),count,Date.now());
 if(!db.prepare('SELECT 1 FROM building_update_snapshots WHERE save_id=? AND state=?').get(String(row.id),String(row.state)))throw Error('Building update rollback snapshot mismatch');
 prepareBuildingUpdate(s);s.revision++;db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s),String(row.id));total++;if(count>100)affected++;
 }db.exec('COMMIT');if(total)console.log('Building grid migration verified: '+total+' accounts; '+affected+' staged wall replacements. Original layouts retained in rollback snapshots.');return {total,affected};}catch(e){db.exec('ROLLBACK');throw e;}
}
