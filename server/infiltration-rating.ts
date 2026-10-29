import type {DatabaseSync} from 'node:sqlite';
import {INFILTRATION_RATING,infiltrationRank,ratingAfter,type RatingSettlement,type RatingLeaderboard,type RatingRow} from '../shared/ranking';
/** Caller holds the foundation BEGIN IMMEDIATE transaction, including operation and save updates. */
export function infiltrationRatingStore(db:DatabaseSync){
 db.exec(`CREATE TABLE IF NOT EXISTS company_infiltration_ratings(company_id TEXT PRIMARY KEY,total INTEGER NOT NULL DEFAULT 0 CHECK(total>=0));
 CREATE TABLE IF NOT EXISTS pvp_rating_cooldowns(attacker_id TEXT NOT NULL,defender_id TEXT NOT NULL,eligible_at INTEGER NOT NULL,PRIMARY KEY(attacker_id,defender_id));
 CREATE TABLE IF NOT EXISTS pvp_rating_events(battle_id TEXT PRIMARY KEY,attacker_id TEXT NOT NULL,defender_id TEXT NOT NULL,tokens INTEGER NOT NULL,finished_at INTEGER NOT NULL,result TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS pvp_rating_history ON pvp_rating_events(attacker_id,finished_at);
 INSERT OR IGNORE INTO company_infiltration_ratings(company_id,total) SELECT id,0 FROM company_players;`);
 const total=(id:string)=>Number(db.prepare('SELECT total FROM company_infiltration_ratings WHERE company_id=?').get(id)?.total??0);
 const eligibleAt=(a:string,d:string)=>Number(db.prepare('SELECT eligible_at FROM pvp_rating_cooldowns WHERE attacker_id=? AND defender_id=?').get(a,d)?.eligible_at??0);
 const event=(id:string):RatingSettlement|undefined=>{const r=db.prepare('SELECT result FROM pvp_rating_events WHERE battle_id=?').get(id);return r?JSON.parse(String(r.result)):undefined;};
 function settle(input:{battleId:string;attacker:string;defender:string;tokens:number;at:number;started:boolean;eligible:boolean}):RatingSettlement{
  const prior=event(input.battleId);if(prior)return prior;
  const {attacker,defender,at}=input,before=total(attacker),next=eligibleAt(attacker,defender);
  const eligible=input.started&&input.eligible&&attacker!==defender&&at>=next;
  const after=eligible?ratingAfter(before,input.tokens):before;
  const result:RatingSettlement={before,after,delta:after-before,eligible,nextEligibleAt:eligible?at+INFILTRATION_RATING.cooldownMs:next,beforeRank:infiltrationRank(before).id,afterRank:infiltrationRank(after).id,...(!eligible?{reason:!input.started?'Battle canceled before deployment.':attacker===defender?'Own campus is not eligible.':'Opponent rating cooldown: one scored battle every six hours.'}:{})};
  if(eligible){db.prepare('INSERT INTO company_infiltration_ratings VALUES(?,?) ON CONFLICT(company_id) DO UPDATE SET total=excluded.total').run(attacker,after);db.prepare('INSERT INTO pvp_rating_cooldowns VALUES(?,?,?) ON CONFLICT(attacker_id,defender_id) DO UPDATE SET eligible_at=excluded.eligible_at').run(attacker,defender,result.nextEligibleAt);}
  db.prepare('INSERT INTO pvp_rating_events VALUES(?,?,?,?,?,?)').run(input.battleId,attacker,defender,input.tokens,at,JSON.stringify(result));return result;
 }
 function leaderboard(current:string):RatingLeaderboard{
  const rows=db.prepare(`SELECT p.id,u.username,COALESCE(r.total,0) rating FROM company_players p JOIN player_usernames u ON u.player_id=p.id LEFT JOIN company_infiltration_ratings r ON r.company_id=p.id ORDER BY rating DESC,p.id ASC`).all().map((r,i):RatingRow=>({companyId:String(r.id),name:String(r.username),rating:Number(r.rating),rank:infiltrationRank(Number(r.rating)).id,position:i+1,current:r.id===current}));
  return {rows:rows.slice(0,100),own:rows.find(r=>r.current)??null};
 }
 return {total,eligibleAt,event,settle,leaderboard};
}
