import type {DatabaseSync} from 'node:sqlite';
import type {FoundationState} from '../shared/foundation';
import {INFLUENCE,type Competition,type InfluenceResult,type LeaderboardData,type Ranking} from '../shared/influence';
/** External additive tables leave legacy save JSON and recovery credentials untouched. */
export function influenceStore(db:DatabaseSync){
 db.exec(`BEGIN IMMEDIATE;
 CREATE TABLE IF NOT EXISTS company_influence(company_id TEXT PRIMARY KEY REFERENCES company_players(id),total INTEGER NOT NULL DEFAULT 0 CHECK(total>=0));
 CREATE TABLE IF NOT EXISTS influence_cooldowns(company_id TEXT NOT NULL REFERENCES company_players(id),layout INTEGER NOT NULL CHECK(layout IN (0,1)),eligible_at INTEGER NOT NULL,PRIMARY KEY(company_id,layout));
 CREATE TABLE IF NOT EXISTS influence_battles(raid_id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES company_players(id),layout INTEGER NOT NULL CHECK(layout IN (0,1)),registered_at INTEGER NOT NULL,settled_at INTEGER,awarded INTEGER NOT NULL DEFAULT 0,eligible_at INTEGER);
 CREATE INDEX IF NOT EXISTS influence_battles_company ON influence_battles(company_id);
 COMMIT;`);
 const total=(company:string)=>Number(db.prepare('SELECT total FROM company_influence WHERE company_id=?').get(company)?.total||0);
 const eligible=(company:string,layout:number)=>Number(db.prepare('SELECT eligible_at FROM influence_cooldowns WHERE company_id=? AND layout=?').get(company,layout)?.eligible_at||0);
 function register(company:string,state:FoundationState,now:number){const r=state.botRaid!;db.prepare('INSERT INTO influence_battles(raid_id,company_id,layout,registered_at) VALUES(?,?,?,?)').run(r.id,company,r.simulation.layout,now);}
 /** Caller holds BEGIN IMMEDIATE through saving the corresponding game state. Only
  * registered, server-created battles qualify. Legacy battles are never backfilled. */
 function settle(company:string,state:FoundationState,now:number){
  const r=state.botRaid;if(!r?.settled)return;
  const receipt=db.prepare('SELECT * FROM influence_battles WHERE raid_id=? AND company_id=?').get(r.id,company);
  if(!receipt||receipt.settled_at!==null)return;
  const layout=Number(receipt.layout),sim=r.simulation;
  const victory=r.companyId===company&&r.started&&sim.combatVersion===2&&sim.ended&&sim.reason==='Network cleared'&&sim.layout===layout&&sim.buildings.filter(b=>b.kind!=='wall').every(b=>b.hp<=0);
  // Simulation lastTick is derived from server deployment time, never device time.
  // Offline completion keeps its actual victory time rather than delaying a claim.
  const completedAt=Math.min(now,Math.max(Number(receipt.registered_at),r.lastTick));
  let awarded=0,next=eligible(company,layout);
  if(victory&&completedAt>=next){awarded=INFLUENCE.awards[layout];next=completedAt+INFLUENCE.cooldownMs;
   db.prepare('INSERT INTO company_influence VALUES(?,?) ON CONFLICT(company_id) DO UPDATE SET total=total+excluded.total').run(company,awarded);
   db.prepare('INSERT INTO influence_cooldowns VALUES(?,?,?) ON CONFLICT(company_id,layout) DO UPDATE SET eligible_at=excluded.eligible_at').run(company,layout,next);
  }
  db.prepare('UPDATE influence_battles SET settled_at=?,awarded=?,eligible_at=? WHERE raid_id=? AND settled_at IS NULL').run(completedAt,awarded,next||null,r.id);
 }
 function snapshot(company:string,state:FoundationState,now:number):Competition{
  const row=state.botRaid?db.prepare('SELECT awarded,eligible_at,settled_at FROM influence_battles WHERE raid_id=? AND company_id=?').get(state.botRaid.id,company):undefined;
  const result:InfluenceResult|null=row&&row.settled_at!==null?{awarded:Number(row.awarded),eligibleAt:row.eligible_at===null?null:Number(row.eligible_at)}:null;
  return {total:total(company),raids:INFLUENCE.awards.map((award,layout)=>({award,eligibleAt:eligible(company,layout)})),result,serverTime:now};
 }
 function leaderboard(company:string):LeaderboardData{
  // Company names are public. No IDs, cookies, recovery verifiers or save JSON leave here.
  const query=`WITH ranked AS (SELECT p.id,p.name,COALESCE(i.total,0) AS influence,ROW_NUMBER() OVER (ORDER BY COALESCE(i.total,0) DESC,p.name_key ASC) AS rank FROM company_players p LEFT JOIN company_influence i ON i.company_id=p.id WHERE p.name IS NOT NULL) SELECT * FROM ranked`;
  const map=(r:Record<string,unknown>):Ranking=>({rank:Number(r.rank),name:String(r.name),influence:Number(r.influence),current:r.id===company});
  return {rows:db.prepare(query+' WHERE rank<=5 ORDER BY rank').all().map(map),own:(()=>{const row=db.prepare(query+' WHERE id=?').get(company);return row?map(row):null;})()};
 }
 return {register,settle,snapshot,leaderboard};
}
