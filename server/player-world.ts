import {breachRating} from '../shared/breach-rating';
import type express from 'express';
import type {DatabaseSync} from 'node:sqlite';
import {randomInt,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {advanceFoundation,hasBuilderStation,type FoundationState} from '../shared/foundation';
import {startOwnedOperation} from '../shared/infiltration-army';
import {commandOperation} from '../shared/infiltration';
import {publicBase,type PublicCompany,type PublicBase,type PlayerScout} from '../shared/player-base';
import {PVP,playerOperation,playerDestruction} from '../shared/player-combat';
import {xpProgress} from '../shared/company-xp';
import type {LeaderboardData} from '../shared/influence';
type Player={companyId:string;saveId:string};
/** Additive only. No owner-state mutation is performed when building a public view. */
export function playerWorldStore(db:DatabaseSync,clock:()=>number,leaderboard:(id:string)=>LeaderboardData){
 db.exec(`CREATE TABLE IF NOT EXISTS pvp_scouts(id TEXT PRIMARY KEY,attacker_id TEXT NOT NULL,defender_id TEXT NOT NULL,request_id TEXT NOT NULL,seen TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,UNIQUE(attacker_id,request_id));
 CREATE TABLE IF NOT EXISTS pvp_battles(id TEXT PRIMARY KEY,scout_id TEXT NOT NULL UNIQUE,attacker_id TEXT NOT NULL,defender_id TEXT NOT NULL,snapshot TEXT NOT NULL,attacker_name TEXT NOT NULL,defender_name TEXT NOT NULL,created_at INTEGER NOT NULL,finished_at INTEGER,status TEXT NOT NULL,destruction INTEGER NOT NULL DEFAULT 0,influence INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS pvp_attack_history ON pvp_battles(attacker_id,created_at DESC);CREATE INDEX IF NOT EXISTS pvp_defense_history ON pvp_battles(defender_id,created_at DESC);
 CREATE INDEX IF NOT EXISTS pvp_unfinished ON pvp_battles(created_at) WHERE finished_at IS NULL;
 CREATE TABLE IF NOT EXISTS pvp_reward_cooldowns(attacker_id TEXT NOT NULL,defender_id TEXT NOT NULL,eligible_at INTEGER NOT NULL,PRIMARY KEY(attacker_id,defender_id));`);
 if(!db.prepare('PRAGMA table_info(pvp_battles)').all().some(c=>c.name==='breach_rating'))db.exec('ALTER TABLE pvp_battles ADD COLUMN breach_rating TEXT');
 const eligible=(a:string,d:string)=>Number(db.prepare('SELECT eligible_at FROM pvp_reward_cooldowns WHERE attacker_id=? AND defender_id=?').get(a,d)?.eligible_at??0);
 function view(id:string):{company:PublicCompany;base:PublicBase|null}|null{
  const row=db.prepare('SELECT p.save_id,s.state,u.username,x.total,x.floor_level FROM company_players p JOIN foundation_saves s ON s.id=p.save_id JOIN player_usernames u ON u.player_id=p.id LEFT JOIN company_xp x ON x.company_id=p.id WHERE p.id=?').get(id);if(!row)return null;
  let s:FoundationState;try{s=JSON.parse(String(row.state));}catch{return null;}if(!s||typeof s!=='object')return null;const now=clock(),base=publicBase(s,id,now);let onboarding=false;try{const a=db.prepare('SELECT progress FROM foundation_ava WHERE session=?').get(String(row.save_id));onboarding=!a||['complete','skipped'].includes(JSON.parse(String(a.progress)).status);}catch{}
  const own=leaderboard(id).own,visitable=!!base&&onboarding&&hasBuilderStation(s);
  const company:PublicCompany={id,name:String(row.username),level:xpProgress(Number(row.total??0),Number(row.floor_level??s.level??1)).level,hqLevel:base?.buildings.find(b=>b.id==='hq')?.level??1,influence:own?.influence??0,rank:own?.rank??null,visitable,...(!visitable?{message:'This founder is still preparing their campus. Check back soon.'}:{})};return {company,base:visitable?base:null};
 }
 function start(s:FoundationState,attacker:string,scoutId:string,now:number){
  const scout=db.prepare('SELECT * FROM pvp_scouts WHERE id=? AND attacker_id=?').get(scoutId,attacker);if(!scout||Number(scout.expires_at)<=now)throw Error('This scouting session expired. Find another opponent.');
  if(db.prepare('SELECT 1 FROM pvp_battles WHERE scout_id=?').get(scoutId))throw Error('This scouting session already started a battle. Resume your operation.');
  const defender=String(scout.defender_id),target=view(defender);if(defender===attacker||!target?.base)throw Error('This campus is no longer available. Find another opponent.');const id=randomUUID();
  startOwnedOperation(s,id,defender,now,()=>playerOperation(id,target.base!,target.company,attacker,now));
  db.prepare('INSERT INTO pvp_battles(id,scout_id,attacker_id,defender_id,snapshot,attacker_name,defender_name,created_at,status) VALUES(?,?,?,?,?,?,?,?,?)').run(id,scoutId,attacker,defender,JSON.stringify(target.base),view(attacker)?.company.name??'Founder',target.company.name,now,'ready');
 }
 /** Only the saved, server-simulated operation associated with this receipt can award Influence. */
 function settle(attacker:string,s:FoundationState,now:number){
  const o=s.infiltration;if(!o?.pvp)return;const row=db.prepare('SELECT * FROM pvp_battles WHERE id=? AND attacker_id=? AND defender_id=?').get(o.id,attacker,o.pvp.defenderId);if(!row||row.finished_at!==null)return;
  if(o.status==='ready'&&now>=Number(row.created_at)+PVP.readyMs)commandOperation(o,{action:'abandon'},Number(row.created_at)+PVP.readyMs);
  if(['ready','active'].includes(o.status)){db.prepare('UPDATE pvp_battles SET status=? WHERE id=?').run(o.status,o.id);return;}
  const rating=breachRating(o),success=rating.count>0,at=o.finishedAt??now;let award=0,next=eligible(attacker,o.pvp.defenderId);
  if(success&&at>=next){award=PVP.award;next=at+PVP.cooldownMs;db.prepare('INSERT INTO company_influence VALUES(?,?) ON CONFLICT(company_id) DO UPDATE SET total=total+excluded.total').run(attacker,award);db.prepare('INSERT INTO pvp_reward_cooldowns VALUES(?,?,?) ON CONFLICT(attacker_id,defender_id) DO UPDATE SET eligible_at=excluded.eligible_at').run(attacker,o.pvp.defenderId,next);}
  o.settlement={compute:0,research:0,influence:award,eligibleAt:next,pendingCompute:0,pendingResearch:0};
  db.prepare('UPDATE pvp_battles SET finished_at=?,status=?,destruction=?,influence=?,breach_rating=? WHERE id=? AND finished_at IS NULL').run(at,success?'victory':o.status,playerDestruction(o),award,JSON.stringify(rating.tokens),o.id);
 }
 // A returning defender can see an offline attack without requiring the attacker to reconnect.
 function sweep(){const now=clock();for(const row of db.prepare("SELECT b.id,b.attacker_id,p.save_id,s.state FROM pvp_battles b JOIN company_players p ON p.id=b.attacker_id JOIN foundation_saves s ON s.id=p.save_id WHERE b.finished_at IS NULL ORDER BY b.created_at LIMIT 100").all()){
  const s=JSON.parse(String(row.state)) as FoundationState;if(s.infiltration?.id!==row.id){db.prepare("UPDATE pvp_battles SET status='abandoned',finished_at=? WHERE id=? AND finished_at IS NULL").run(now,String(row.id));continue;}
  const before=JSON.stringify(s);advanceFoundation(s,now);settle(String(row.attacker_id),s,now);if(JSON.stringify(s)!==before){s.revision++;db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s),String(row.save_id));}
 }}
 function register(app:express.Express,authorize:(req:express.Request,res:express.Response)=>Player|undefined){
  app.get('/api/foundation/players/:companyId',(req,res)=>{if(!authorize(req,res))return;const v=view(String(req.params.companyId));res.set('Cache-Control','private, no-store');if(!v){res.status(404).json({error:'This company is no longer available.'});return;}res.json({company:v.company});});
  app.get('/api/foundation/players/:companyId/base',(req,res)=>{if(!authorize(req,res))return;const v=view(String(req.params.companyId));res.set('Cache-Control','private, no-store');if(!v?.base){res.status(v?409:404).json({error:v?.company.message??'This company is no longer available.'});return;}res.json(v);});
  app.post('/api/foundation/pvp/search',(req,res)=>{const player=authorize(req,res);if(!player)return;const input=z.object({requestId:z.string().uuid(),previous:z.string().uuid().optional()}).strict().safeParse(req.body);if(!input.success){res.status(400).json({error:'Find an opponent through matchmaking.'});return;}
   db.exec('BEGIN IMMEDIATE');try{const now=clock(),existing=db.prepare('SELECT * FROM pvp_scouts WHERE attacker_id=? AND request_id=?').get(player.companyId,input.data.requestId);let row=existing;
    if(!row){const previous=input.data.previous?db.prepare('SELECT * FROM pvp_scouts WHERE id=? AND attacker_id=?').get(input.data.previous,player.companyId):undefined;if(input.data.previous&&!previous)throw Error('This scouting session is unavailable.');
     const pool=db.prepare('SELECT p.id FROM company_players p JOIN player_usernames u ON u.player_id=p.id WHERE p.id<>?').all(player.companyId).map(r=>view(String(r.id))).filter((v):v is {company:PublicCompany;base:PublicBase}=>!!v?.base);if(!pool.length){db.exec('COMMIT');res.json({scout:null,message:'No player campuses are ready yet. Try Missions or check back soon.'});return;}
     let seen:string[]=previous?JSON.parse(String(previous.seen)):[];let candidates=pool.filter(v=>v.company.id!==previous?.defender_id);if(!candidates.length)candidates=pool;
     const eligiblePool=candidates.filter(v=>eligible(player.companyId,v.company.id)<=now);if(eligiblePool.length)candidates=eligiblePool;
     const unseen=candidates.filter(v=>!seen.includes(v.company.id));if(unseen.length)candidates=unseen;else if(pool.every(v=>seen.includes(v.company.id)))seen=[];
     if(pool.length>=8){const level=view(player.companyId)?.company.level??1,near=candidates.filter(v=>Math.abs(v.company.level-level)<=1);if(near.length)candidates=near;}
     const chosen=candidates[randomInt(candidates.length)],id=randomUUID();db.prepare('INSERT INTO pvp_scouts VALUES(?,?,?,?,?,?,?)').run(id,player.companyId,chosen.company.id,input.data.requestId,JSON.stringify([...new Set([...seen,chosen.company.id])]),now,now+PVP.scoutMs);row=db.prepare('SELECT * FROM pvp_scouts WHERE id=?').get(id);
    }
    const target=view(String(row!.defender_id));if(!target?.base||Number(row!.expires_at)<=now)throw Error('This scout expired or its campus is unavailable. Find another opponent.');
    const scout:PlayerScout={id:String(row!.id),company:target.company,base:target.base,eligibleAt:eligible(player.companyId,target.company.id),expiresAt:Number(row!.expires_at),serverTime:now};db.exec('COMMIT');res.set('Cache-Control','private, no-store').json({scout});
   }catch(e){db.exec('ROLLBACK');res.status(409).json({error:(e as Error).message});}
  });
  app.get('/api/foundation/pvp/history',(req,res)=>{const player=authorize(req,res);if(!player)return;db.exec('BEGIN IMMEDIATE');try{sweep();const map=(direction:'attacker'|'defender')=>db.prepare(`SELECT * FROM pvp_battles WHERE ${direction}_id=? AND finished_at IS NOT NULL ORDER BY finished_at DESC,id DESC LIMIT 30`).all(player.companyId).map(r=>{const id=String(direction==='attacker'?r.defender_id:r.attacker_id),known=view(id)?.company;return {id:String(r.id),opponent:known??{id,name:String(direction==='attacker'?r.defender_name:r.attacker_name),level:1,hqLevel:1,influence:0,rank:null,visitable:false},outcome:String(r.status),...(r.breach_rating?{breachTokens:JSON.parse(String(r.breach_rating))}:{}),destruction:Number(r.destruction),influence:direction==='attacker'?Number(r.influence):0,finishedAt:Number(r.finished_at)};});const data={attacks:map('attacker'),defenses:map('defender'),serverTime:clock()};db.exec('COMMIT');res.set('Cache-Control','private, no-store').json(data);}catch{db.exec('ROLLBACK');res.status(503).json({error:'Battle history is temporarily unavailable.'});}});
 }
 return {register,start,settle,view,eligible};
}
