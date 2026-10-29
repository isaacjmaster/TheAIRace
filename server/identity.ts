import {installUsernames,usernameProfile,saveUsername} from './usernames';
import {xpProgress} from '../shared/company-xp';
import {newShortRecoveryCode,recoveryVerifier} from './recovery-code';
import type express from 'express';
import type {DatabaseSync} from 'node:sqlite';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import type {CompanyIdentity} from '../shared/identity';
const YEAR=365*86400000,COOKIE='airace_foundation_session';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const token=()=>randomUUID();
type Player={id:string;save_id:string;name:string|null;name_key:string|null;name_deferred:number;recovery_hash:string|null;recovery_updated_at:number|null};
export function identityStore(db:DatabaseSync,cookieName=COOKIE,clock:()=>number=Date.now){
 if(!/^[a-zA-Z0-9_-]+$/.test(cookieName))throw new Error('Invalid session cookie configuration.');
 db.exec('PRAGMA foreign_keys=ON');
 db.exec('BEGIN IMMEDIATE');
 try{db.exec(`CREATE TABLE IF NOT EXISTS identity_migrations(version INTEGER PRIMARY KEY,applied_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS company_players(id TEXT PRIMARY KEY,save_id TEXT NOT NULL UNIQUE REFERENCES foundation_saves(id),name TEXT,name_key TEXT UNIQUE,name_deferred INTEGER NOT NULL DEFAULT 0,recovery_hash TEXT UNIQUE,recovery_updated_at INTEGER,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS company_sessions(token_hash TEXT PRIMARY KEY,player_id TEXT NOT NULL REFERENCES company_players(id),expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS company_recovery_tickets(token_hash TEXT PRIMARY KEY,current_player TEXT,target_player TEXT NOT NULL,recovery_hash TEXT NOT NULL,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS company_rate_limits(bucket TEXT PRIMARY KEY,started_at INTEGER NOT NULL,attempts INTEGER NOT NULL);`);
 if(!db.prepare('SELECT version FROM identity_migrations WHERE version=1').get()){
  for(const row of db.prepare('SELECT id FROM foundation_saves').all()){
   const id=randomUUID();db.prepare('INSERT INTO company_players(id,save_id,created_at) VALUES(?,?,?)').run(id,row.id as string,Date.now());
   // Existing secret cookies continue to work, but are no longer permanent player IDs.
   db.prepare('INSERT INTO company_sessions VALUES(?,?,?)').run(hash(row.id as string),id,Date.now()+YEAR);
  }
  db.prepare('INSERT INTO identity_migrations VALUES(1,?)').run(Date.now());
 }
 // An older app can add a save after migration version 1. Map only genuinely unmapped rows.
 for(const row of db.prepare('SELECT s.id FROM foundation_saves s LEFT JOIN company_players p ON p.save_id=s.id WHERE p.id IS NULL').all()){
  const id=randomUUID();db.prepare('INSERT INTO company_players(id,save_id,created_at) VALUES(?,?,?)').run(id,row.id as string,Date.now());
  db.prepare('INSERT INTO company_sessions VALUES(?,?,?)').run(hash(row.id as string),id,Date.now()+YEAR);
 }
 db.prepare('INSERT OR IGNORE INTO identity_migrations VALUES(2,?)').run(Date.now());
 db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 installUsernames(db);
 const publicProfile=(p:Player):CompanyIdentity=>{const state=JSON.parse(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(p.save_id)!.state as string);return {infiltrationRating:db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='company_infiltration_ratings'").get()?Number(db.prepare('SELECT total FROM company_infiltration_ratings WHERE company_id=?').get(p.id)?.total??0):0,playerId:p.id,...usernameProfile(db,p.id,clock()),level:db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='company_xp'").get()?(()=>{const xp=db.prepare('SELECT total,floor_level FROM company_xp WHERE company_id=?').get(p.id);return xpProgress(Number(xp?.total||0),Math.max(state.level,Number(xp?.floor_level||1))).level;})():state.level,nameDeferred:false,secured:!!p.recovery_hash,recoveryUpdatedAt:p.recovery_updated_at};};
 const getPlayer=(id:string)=>db.prepare('SELECT * FROM company_players WHERE id=?').get(id) as Player|undefined;
 function cookie(res:express.Response,req:express.Request,credential:string){res.cookie(cookieName,credential,{httpOnly:true,sameSite:'strict',secure:req.secure||process.env.NODE_ENV==='production',maxAge:YEAR,path:'/'});}
 function issue(res:express.Response,p:Player,req:express.Request,credential:string=token(),sendCookie=true){
  db.prepare('INSERT INTO company_sessions VALUES(?,?,?) ON CONFLICT(token_hash) DO UPDATE SET expires_at=excluded.expires_at').run(hash(credential),p.id,Date.now()+YEAR);
  if(sendCookie)cookie(res,req,credential);return credential;
 }
 function cookieValue(req:express.Request){
  for(const name of cookieName===COOKIE?[COOKIE]:[cookieName,COOKIE]){
   const value=new RegExp('(?:^|;\\s*)'+name+'=([^;]*)(?:;|$)').exec(req.headers.cookie||'')?.[1];
   if(value!==undefined)return {name,value};
  }return undefined;
 }
 function credential(req:express.Request){const value=cookieValue(req)?.value;return value&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)?value:undefined;}
 function status(req:express.Request):'missing'|'invalid'|'expired'|'unrecognized'{
  if(!cookieValue(req))return 'missing';const value=credential(req);if(!value)return 'invalid';
  const session=db.prepare('SELECT expires_at FROM company_sessions WHERE token_hash=?').get(hash(value));
  return session&&Number(session.expires_at)<=Date.now()?'expired':'unrecognized';
 }
 function authenticate(req:express.Request,res:express.Response):Player|undefined{
  const value=credential(req);if(!value)return;
  const session=db.prepare('SELECT player_id,expires_at FROM company_sessions WHERE token_hash=? AND expires_at>?').get(hash(value),Date.now());if(!session)return;
  const p=getPlayer(session.player_id as string);
  if(p&&cookieValue(req)!.name!==cookieName)issue(res,p,req);
  else if(p&&Number(session.expires_at)-Date.now()<YEAR-86400000)issue(res,p,req,value);
  return p;
 }
 function enroll(saveId:string,res:express.Response,req:express.Request){const id=randomUUID();db.prepare('INSERT INTO company_players(id,save_id,created_at) VALUES(?,?,?)').run(id,saveId,Date.now());const p=getPlayer(id)!,credential=issue(res,p,req,token(),false);return {player:p,credential};}
 function guard(req:express.Request,res:express.Response,p:Player,required=false){const expected=req.get('X-Company-ID');if((expected&&expected!==p.id)||(!expected&&(required||!!p.recovery_hash))){res.status(409).json({error:'Your active company changed. Reload before continuing.',identityChanged:true});return false;}return true;}
 function rate(req:express.Request,p:Player|undefined,kind:string,limit:number){
  const now=Date.now(),window=15*60000;db.prepare('DELETE FROM company_rate_limits WHERE started_at<?').run(now-window);db.prepare('DELETE FROM company_recovery_tickets WHERE expires_at<?').run(now);
  for(const [key,max] of [[kind+':ip:'+hash(req.ip||req.socket.remoteAddress||'unknown'),120],[kind+':player:'+(p?.id||hash(req.ip||'unknown')),limit]] as const){
   db.prepare('INSERT INTO company_rate_limits VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1').run(key,now);if(Number(db.prepare('SELECT attempts FROM company_rate_limits WHERE bucket=?').get(key)!.attempts)>max)return false;
  }return true;
 }
 return {authenticate,credential,status,hasCookie:(req:express.Request)=>!!cookieValue(req),enroll,guard,profile:publicProfile,getPlayer,issue,cookie,rate,clock};
}
export type IdentityStore=ReturnType<typeof identityStore>;
export function registerIdentity(app:express.Express,db:DatabaseSync,store:IdentityStore){
 app.use('/api/foundation/company',(req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');if(req.method==='POST'){const origin=req.get('Origin');if(!req.is('application/json')||(origin&&new URL(origin).host!==req.get('host'))){res.status(403).json({error:'Open recovery directly from The AI Race.'});return;}}next();});
 const current=(req:express.Request,res:express.Response)=>{const p=store.authenticate(req,res);if(!p)res.status(401).json({error:'Open your company or use Recover Company.'});else if(!store.guard(req,res,p,true))return;return p;};
 app.post('/api/foundation/company/name',(_req,res)=>{res.status(410).json({error:'Choose a username in the updated game.'});});
 app.post('/api/foundation/company/username',(req,res)=>{const p=current(req,res);if(!p)return;if(!store.rate(req,p,'username',20)){res.status(429).json({error:'Too many attempts. Try again later.'});return;}try{saveUsername(db,p.id,req.body.username,store.clock());res.json({company:store.profile(p)});}catch(e){const error=e as Error&{status?:number};res.status(error.status??400).json({error:error.message,company:store.profile(p)});}});
 app.post('/api/foundation/company/later',(req,res)=>{const p=current(req,res);if(!p)return;db.prepare('UPDATE company_players SET name_deferred=1 WHERE id=?').run(p.id);res.json({company:store.profile(store.getPlayer(p.id)!)});});
 app.post('/api/foundation/company/recovery-code',async(req,res)=>{const p=current(req,res);if(!p)return;if(!store.rate(req,p,'rotate',6)){res.status(429).json({error:'Please wait 15 minutes before generating another code.'});return;}if(p.recovery_hash&&req.body.confirmRegenerate!==true){res.status(409).json({error:'Confirm replacing your old recovery code first.'});return;}
  try{for(let attempt=0;attempt<4;attempt++){
   const code=newShortRecoveryCode(),verifier=await recoveryVerifier(code),live=store.authenticate(req,res);
   if(!live||live.id!==p.id){res.status(401).json({error:'Your company session changed. Reload before continuing.'});return;}
   if(live.recovery_hash!==p.recovery_hash){res.status(409).json({error:'Your recovery code changed. Reopen Company Settings before replacing it.'});return;}
   try{db.prepare('UPDATE company_players SET recovery_hash=?,recovery_updated_at=? WHERE id=?').run(verifier,Date.now(),p.id);res.json({company:store.profile(store.getPlayer(p.id)!),code});return;}
   catch(e){if(!(e as Error).message.includes('company_players.recovery_hash'))throw e;}
  }throw new Error('Code generation unavailable');}catch{res.status(503).json({error:'Recovery is busy. Please try again shortly.'});}
 });
 app.post('/api/foundation/company/recover/check',async(req,res)=>{const p=store.authenticate(req,res);if(p&&!store.guard(req,res,p,true))return;if(!p&&req.get('X-Company-ID')){res.status(409).json({error:'Your active company changed. Reload before recovering.',identityChanged:true});return;}if(!store.rate(req,p,'recover',8)){res.status(429).json({error:'Too many recovery attempts. Please wait 15 minutes and try again.'});return;}
 let digest:string;try{digest=await recoveryVerifier(req.body.code);}catch{res.status(503).json({error:'Recovery is busy. Please try again shortly.'});return;}
 if(store.authenticate(req,res)?.id!==p?.id){res.status(409).json({error:'Your company session changed. Reload before recovering.',identityChanged:true});return;}
 const target=db.prepare('SELECT * FROM company_players WHERE recovery_hash=?').get(digest) as Player|undefined;if(!target){res.status(400).json({error:'That code could not be verified. Check it and try again.'});return;}
 const ticket=randomBytes(32).toString('hex');db.prepare('INSERT INTO company_recovery_tickets VALUES(?,?,?,?,?)').run(hash(ticket),p?.id||null,target.id,digest,Date.now()+5*60000);
 const view=store.profile(target);res.json({ticket,target:{name:view.name,level:view.level},switching:!!p&&p.id!==target.id,current:p?{name:store.profile(p).username,level:store.profile(p).level}:null});});
 app.post('/api/foundation/company/recover/confirm',(req,res)=>{const p=store.authenticate(req,res);if(p&&!store.guard(req,res,p,true))return;if(!store.rate(req,p,'confirm',12)){res.status(429).json({error:'Please wait 15 minutes before trying recovery again.'});return;}if(req.body.confirm!==true||typeof req.body.ticket!=='string'||req.body.ticket.length!==64){res.status(400).json({error:'Confirm the company switch before continuing.'});return;}
 db.exec('BEGIN IMMEDIATE');try{const proof=db.prepare('SELECT * FROM company_recovery_tickets WHERE token_hash=?').get(hash(req.body.ticket));if(!proof||proof.current_player!==(p?.id||null)||Number(proof.expires_at)<Date.now())throw Error('Recovery confirmation expired or your company changed. Enter the code again.');const target=store.getPlayer(proof.target_player as string);if(!target||target.recovery_hash!==proof.recovery_hash)throw Error('The recovery code changed. Enter the latest code.');db.prepare('DELETE FROM company_sessions WHERE player_id=?').run(target.id);const credential=store.issue(res,target,req,token(),false);db.prepare('DELETE FROM company_recovery_tickets WHERE target_player=?').run(target.id);db.exec('COMMIT');store.cookie(res,req,credential);res.json({recovered:true});}catch(e){db.exec('ROLLBACK');res.status(409).json({error:(e as Error).message});}});
}
