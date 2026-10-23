import type {DatabaseSync} from 'node:sqlite';
import {getHangar,hasBuilderStation,type FoundationState} from '../shared/foundation';
import {BUILDING_CATEGORIES,CONSTRUCTION_INFLUENCE} from '../shared/building-categories';
/** Permanent company/slot receipts survive moves, removal and foundation resets.
 * There is one of each catalog slot, with two separately rewarded GPU slots.
 * Caller holds IMMEDIATE through receipt, score and authoritative state writes. */
export function developmentInfluenceStore(db:DatabaseSync,now:number){
 const first=!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='construction_influence_receipts'").get();
 function settle(company:string,s:FoundationState,time:number,source='construction'){
  const instances=[['station',hasBuilderStation(s)?{completesAt:0}:undefined],['rig',s.rig],['rig2',s.rig2],['lab',s.lab],['fabricator',s.fabricator],['hangar',getHangar(s)],['droneStation',s.droneStation]] as const;
  for(const [slot,building] of instances){const category=BUILDING_CATEGORIES[slot==='rig2'?'rig':slot];if(!building||!Number.isFinite(building.completesAt)||building.completesAt>time||!(slot==='droneStation'||['Robotics','Resources'].includes(category)))continue;
   const inserted=db.prepare('INSERT OR IGNORE INTO construction_influence_receipts(company_id,building,amount,awarded_at,source) VALUES(?,?,?,?,?)').run(company,slot,CONSTRUCTION_INFLUENCE,time,source);
   if(inserted.changes)db.prepare('INSERT INTO company_influence VALUES(?,?) ON CONFLICT(company_id) DO UPDATE SET total=total+excluded.total').run(company,CONSTRUCTION_INFLUENCE);
  }
 }
 db.exec('BEGIN IMMEDIATE');try{
  db.exec(`CREATE TABLE IF NOT EXISTS construction_influence_receipts(id INTEGER PRIMARY KEY,company_id TEXT NOT NULL REFERENCES company_players(id),building TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount=5),awarded_at INTEGER NOT NULL,source TEXT NOT NULL CHECK(source IN ('retroactive','construction')),announced INTEGER NOT NULL DEFAULT 0,UNIQUE(company_id,building));`);
  for(const row of db.prepare('SELECT p.id,s.state FROM company_players p JOIN foundation_saves s ON s.id=p.save_id').all())settle(String(row.id),JSON.parse(String(row.state)),now,first?'retroactive':'construction');
  db.exec('COMMIT');
  if(first){const count=Number(db.prepare('SELECT COUNT(*) n FROM construction_influence_receipts').get()!.n);console.log(`Construction Influence migration applied: ${count} eligible buildings, +${count*CONSTRUCTION_INFLUENCE} Influence. Existing saves preserved.`);}
 }catch(e){db.exec('ROLLBACK');throw e;}
 function snapshot(company:string){const r=db.prepare("SELECT COALESCE(SUM(amount),0) total,COALESCE(SUM(CASE WHEN announced=0 THEN amount ELSE 0 END),0) pending,COALESCE(SUM(CASE WHEN announced=0 AND source='retroactive' THEN amount ELSE 0 END),0) retroactive,COALESCE(MAX(id),0) through FROM construction_influence_receipts WHERE company_id=?").get(company)!;return {total:Number(r.total),pending:Number(r.pending),retroactive:Number(r.retroactive),through:Number(r.through)};}
 function acknowledge(company:string,through:number){db.prepare('UPDATE construction_influence_receipts SET announced=1 WHERE company_id=? AND id<=?').run(company,through);}
 return {settle,snapshot,acknowledge};
}
