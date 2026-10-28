import type {DatabaseSync} from 'node:sqlite';
import type {FoundationState} from '../shared/foundation';
import {prepareWallRebuild} from '../shared/wall-rebuild';
import {buildingLevel} from '../shared/building-levels';
/** Full row backup + inventory transition share one transaction. Restart cannot duplicate inventory. */
export function migrateWallRebuild(db:DatabaseSync,now=Date.now()){
 db.exec('CREATE TABLE IF NOT EXISTS wall_rebuild_v1_snapshots(save_id TEXT PRIMARY KEY,state TEXT NOT NULL,inventory_audit TEXT NOT NULL,created_at INTEGER NOT NULL)');
 let total=0,affected=0,walls=0;db.exec('BEGIN IMMEDIATE');
 try{
  for(const row of db.prepare('SELECT id,state FROM foundation_saves').all()){
   const s=JSON.parse(String(row.state)) as FoundationState;if(s.version!==1||!Number.isInteger(s.revision)||s.wallRebuild)continue;
   const original=String(row.state);prepareWallRebuild(s,now);
   const inventory=s.wallRebuild!.inventory,audit=inventory.map(w=>({wall:w,level:buildingLevel(s,'wall:'+w.id),upgrade:s.buildingUpgrades?.['wall:'+w.id]??null}));
   db.prepare('INSERT INTO wall_rebuild_v1_snapshots VALUES(?,?,?,?)').run(String(row.id),original,JSON.stringify(audit),now);
   s.revision++;db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s),String(row.id));total++;if(inventory.length)affected++;walls+=inventory.length;
  }
  db.exec('COMMIT');return {total,affected,walls};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
