import type {DatabaseSync} from 'node:sqlite';
import type {FoundationState} from '../shared/foundation';
import {getHangar} from '../shared/foundation';
import {COMPANY_XP,xpProgress} from '../shared/company-xp';
/** Called inside the same IMMEDIATE transaction as authoritative state settlement. */
export function companyXPStore(db:DatabaseSync,now:number){
 db.exec(`BEGIN IMMEDIATE;
 CREATE TABLE IF NOT EXISTS company_xp(company_id TEXT PRIMARY KEY REFERENCES company_players(id),total INTEGER NOT NULL DEFAULT 0 CHECK(total>=0),floor_level INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS company_xp_receipts(company_id TEXT NOT NULL REFERENCES company_players(id),event TEXT NOT NULL,amount INTEGER NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(company_id,event));
 COMMIT;`);
 const events=(s:FoundationState,time:number)=>{const list:{key:string;amount:number}[]=[];
 for(const [kind,b] of [['rig',s.rig],['rig2',s.rig2],['fabricator',s.fabricator],['hangar',getHangar(s)]] as const)if(b&&time>=b.completesAt)list.push({key:'building:'+kind,amount:COMPANY_XP.construction});
 if(s.landscape?.lastClear)list.push({key:'clear:'+s.landscape.lastClear.id,amount:COMPANY_XP.clearing});
 if(s.botRaid?.settled)list.push({key:'raid:'+s.botRaid.id,amount:COMPANY_XP.raid[s.botRaid.simulation.layout]||0});return list;};
 function initialize(company:string,s:FoundationState,time:number){if(db.prepare('SELECT 1 FROM company_xp WHERE company_id=?').get(company))return;
 db.prepare('INSERT INTO company_xp VALUES(?,0,?)').run(company,Math.max(1,s.level));
 // Historical completed actions establish receipts, never invented XP. Pending work remains eligible.
 for(const e of events(s,time))db.prepare('INSERT OR IGNORE INTO company_xp_receipts VALUES(?,?,0,?)').run(company,e.key,time);
 }
 db.exec('BEGIN IMMEDIATE');try{for(const row of db.prepare('SELECT p.id,s.state FROM company_players p JOIN foundation_saves s ON s.id=p.save_id').all())initialize(String(row.id),JSON.parse(String(row.state)),now);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 function settle(company:string,s:FoundationState,time:number){initialize(company,s,time);for(const e of events(s,time)){
 if(e.key.startsWith('raid:')){const r=s.botRaid!,receipt=db.prepare('SELECT settled_at FROM influence_battles WHERE raid_id=? AND company_id=?').get(r.id,company),sim=r.simulation;
 if(!receipt||receipt.settled_at===null||r.companyId!==company||!r.started||sim.combatVersion!==2||!sim.ended||sim.reason!=='Network cleared'||!sim.buildings.filter(b=>b.kind!=='wall').every(b=>b.hp<=0))continue;}
 const inserted=db.prepare('INSERT OR IGNORE INTO company_xp_receipts VALUES(?,?,?,?)').run(company,e.key,e.amount,time);if(inserted.changes)db.prepare('UPDATE company_xp SET total=total+? WHERE company_id=?').run(e.amount,company);
 }}
 function snapshot(company:string){const r=db.prepare('SELECT total,floor_level FROM company_xp WHERE company_id=?').get(company);return xpProgress(Number(r?.total||0),Number(r?.floor_level||1));}
 return {settle,snapshot};
}
