import type express from 'express';
import type {DatabaseSync} from 'node:sqlite';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import type {CompanyIdentity} from '../shared/identity';
const YEAR=365*86400000,COOKIE='airace_foundation_session';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const token=()=>randomUUID();
type Player={id:string;save_id:string;name:string|null;name_key:string|null;name_deferred:number;recovery_hash:string|null;recovery_updated_at:number|null};
export function identityStore(db:DatabaseSync){
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
 }db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 const publicProfile=(p:Player):CompanyIdentity=>{const state=JSON.parse(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(p.save_id)!.state as string);return {playerId:p.id,name:p.name,level:state.level,nameDeferred:!!p.name_deferred,secured:!!p.recovery_hash,recoveryUpdatedAt:p.recovery_updated_at};};
 const getPlayer=(id:string)=>db.prepare('SELECT * FROM company_players WHERE id=?').get(id) as Player|undefined;
 function cookie(res:express.Response,req:express.Request,credential:string){res.cookie(COOKIE,credential,{httpOnly:true,sameSite:'strict',secure:req.secure||process.env.NODE_ENV==='production',maxAge:YEAR,path:'/'});}
 function issue(res:express.Response,p:Player,req:express.Request,credential:string=token(),sendCookie=true){
  db.prepare('INSERT INTO company_sessions VALUES(?,?,?) ON CONFLICT(token_hash) DO UPDATE SET expires_at=excluded.expires_at').run(hash(credential),p.id,Date.now()+YEAR);
  if(sendCookie)cookie(res,req,credential);return credential;
 }
 function authenticate(req:express.Request,res:express.Response):Player|undefined{
  const credential=/(?:^|;\s*)airace_foundation_session=([a-f0-9-]{36})(?:;|$)/.exec(req.headers.cookie||'')?.[1];if(!credential)return;
  const session=db.prepare('SELECT player_id,expires_at FROM company_sessions WHERE token_hash=? AND expires_at>?').get(hash(credential),Date.now());if(!session)return;
  const p=getPlayer(session.player_id as string);if(p&&Number(session.expires_at)-Date.now()<YEAR-86400000)issue(res,p,req,credential);return p;
 }
 function enroll(saveId:string,res:express.Response,req:express.Request){const id=randomUUID();db.prepare('INSERT INTO company_players(id,save_id,created_at) VALUES(?,?,?)').run(id,saveId,Date.now());const p=getPlayer(id)!,credential=issue(res,p,req,token(),false);return {player:p,credential};}
 function guard(req:express.Request,res:express.Response,p:Player,required=false){const expected=req.get('X-Company-ID');if((expected&&expected!==p.id)||(!expected&&(required||!!p.recovery_hash))){res.status(409).json({error:'Your active company changed. Reload before continuing.',identityChanged:true});return false;}return true;}
 function rate(req:express.Request,p:Player|undefined,kind:string,limit:number){
  const now=Date.now(),window=15*60000;db.prepare('DELETE FROM company_rate_limits WHERE started_at<?').run(now-window);db.prepare('DELETE FROM company_recovery_tickets WHERE expires_at<?').run(now);
  for(const [key,max] of [[kind+':ip:'+hash(req.ip||req.socket.remoteAddress||'unknown'),120],[kind+':player:'+(p?.id||hash(req.ip||'unknown')),limit]] as const){
   db.prepare('INSERT INTO company_rate_limits VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1').run(key,now);if(Number(db.prepare('SELECT attempts FROM company_rate_limits WHERE bucket=?').get(key)!.attempts)>max)return false;
  }return true;
 }
 return {authenticate,enroll,guard,profile:publicProfile,getPlayer,issue,cookie,rate};
}
export type IdentityStore=ReturnType<typeof identityStore>;
function cleanName(value:unknown){if(typeof value!=='string')throw Error('Enter a company name.');const name=value.trim().replace(/ +/g,' ');if(name.length<3||name.length>24)throw Error('Use 3–24 characters for your company name.');if(!/^[A-Za-z0-9 -]+$/.test(name)||!/[A-Za-z]/.test(name))throw Error('Use letters, numbers, spaces and hyphens, with at least one letter.');const words=name.toLowerCase().split(/[ -]+/),compact=words.join('');if(['admin','administrator','moderator','support','official','fuck','shit','cunt','nazi','hitler'].some(w=>words.includes(w))||['masterstudios','theairace','ava'].includes(compact))throw Error('Please choose another name. Avoid offensive names or names that impersonate the game team.');return name;}
const recoveryHash=(value:unknown)=>{if(typeof value!=='string'||value.length>100)return hash('invalid');const normalized=value.trim().toUpperCase().replace(/[\s-]/g,'');return /^AIR[A-F0-9]{40}$/.test(normalized)?hash(normalized):hash('invalid');};
export function registerIdentity(app:express.Express,db:DatabaseSync,store:IdentityStore){
 app.use('/api/foundation/company',(req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');if(req.method==='POST'){const origin=req.get('Origin');if(!req.is('application/json')||(origin&&new URL(origin).host!==req.get('host'))){res.status(403).json({error:'Open recovery directly from The AI Race.'});return;}}next();});
 const current=(req:express.Request,res:express.Response)=>{const p=store.authenticate(req,res);if(!p)res.status(401).json({error:'Open your company or use Recover Company.'});else if(!store.guard(req,res,p,true))return;return p;};
 app.post('/api/foundation/company/name',(req,res)=>{const p=current(req,res);if(!p)return;if(!store.rate(req,p,'name',12)){res.status(429).json({error:'Too many name attempts. Please try again in 15 minutes.'});return;}try{const name=cleanName(req.body.name),key=name.toLowerCase();if(p.name_key&&p.name_key!==key){res.status(409).json({error:'Your company already has a name. Renaming is not available yet.'});return;}
 try{const result=db.prepare('UPDATE company_players SET name=COALESCE(name,?),name_key=?,name_deferred=0 WHERE id=? AND (name_key IS NULL OR name_key=?)').run(name,key,p.id,key);if(!result.changes){res.status(409).json({error:'Your company name changed. Reload before continuing.'});return;}}catch(e){if(!(e as Error).message.includes('UNIQUE'))throw e;const suggestions=[];for(let n=2;n<=9&&suggestions.length<3;n++){const alternative=name.slice(0,21)+' '+n;if(!db.prepare('SELECT id FROM company_players WHERE name_key=?').get(alternative.toLowerCase()))suggestions.push(alternative);}res.status(409).json({error:'That company name is already taken. Try one of these or choose your own.',suggestions});return;}
 res.json({company:store.profile(store.getPlayer(p.id)!)});}catch(e){res.status(400).json({error:(e as Error).message});}});
 app.post('/api/foundation/company/later',(req,res)=>{const p=current(req,res);if(!p)return;db.prepare('UPDATE company_players SET name_deferred=1 WHERE id=?').run(p.id);res.json({company:store.profile(store.getPlayer(p.id)!)});});
 app.post('/api/foundation/company/recovery-code',(req,res)=>{const p=current(req,res);if(!p)return;if(!store.rate(req,p,'rotate',6)){res.status(429).json({error:'Please wait 15 minutes before generating another code.'});return;}if(p.recovery_hash&&req.body.confirmRegenerate!==true){res.status(409).json({error:'Confirm replacing your old recovery code first.'});return;}
 const raw=randomBytes(20).toString('hex').toUpperCase(),code='AIR-'+raw.match(/.{8}/g)!.join('-');db.prepare('UPDATE company_players SET recovery_hash=?,recovery_updated_at=? WHERE id=?').run(recoveryHash(code),Date.now(),p.id);res.json({company:store.profile(store.getPlayer(p.id)!),code});});
 app.post('/api/foundation/company/recover/check',(req,res)=>{const p=store.authenticate(req,res);if(p&&!store.guard(req,res,p,true))return;if(!p&&req.get('X-Company-ID')){res.status(409).json({error:'Your active company changed. Reload before recovering.',identityChanged:true});return;}if(!store.rate(req,p,'recover',8)){res.status(429).json({error:'Too many recovery attempts. Please wait 15 minutes and try again.'});return;}
 const digest=recoveryHash(req.body.code),target=db.prepare('SELECT * FROM company_players WHERE recovery_hash=?').get(digest) as Player|undefined;if(!target){res.status(400).json({error:'That code could not be verified. Check it and try again.'});return;}
 const ticket=randomBytes(32).toString('hex');db.prepare('INSERT INTO company_recovery_tickets VALUES(?,?,?,?,?)').run(hash(ticket),p?.id||null,target.id,digest,Date.now()+5*60000);
 const view=store.profile(target);res.json({ticket,target:{name:view.name,level:view.level},switching:!!p&&p.id!==target.id,current:p?{name:p.name,level:store.profile(p).level}:null});});
 app.post('/api/foundation/company/recover/confirm',(req,res)=>{const p=store.authenticate(req,res);if(p&&!store.guard(req,res,p,true))return;if(!store.rate(req,p,'confirm',12)){res.status(429).json({error:'Please wait 15 minutes before trying recovery again.'});return;}if(req.body.confirm!==true||typeof req.body.ticket!=='string'||req.body.ticket.length!==64){res.status(400).json({error:'Confirm the company switch before continuing.'});return;}
 db.exec('BEGIN IMMEDIATE');try{const proof=db.prepare('SELECT * FROM company_recovery_tickets WHERE token_hash=?').get(hash(req.body.ticket));if(!proof||proof.current_player!==(p?.id||null)||Number(proof.expires_at)<Date.now())throw Error('Recovery confirmation expired or your company changed. Enter the code again.');const target=store.getPlayer(proof.target_player as string);if(!target||target.recovery_hash!==proof.recovery_hash)throw Error('The recovery code changed. Enter the latest code.');db.prepare('DELETE FROM company_sessions WHERE player_id=?').run(target.id);const credential=store.issue(res,target,req,token(),false);db.prepare('DELETE FROM company_recovery_tickets WHERE target_player=?').run(target.id);db.exec('COMMIT');store.cookie(res,req,credential);res.json({recovered:true});}catch(e){db.exec('ROLLBACK');res.status(409).json({error:(e as Error).message});}});
}
