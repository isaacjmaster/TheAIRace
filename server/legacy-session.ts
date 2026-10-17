import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import type express from 'express';
import type {IdentityStore} from './identity';
type Imported={saveId:string;state:string;ava?:string;actions:Record<string,unknown>[];player?:Record<string,unknown>};
/** Local-only bridge. Authorize by a presented secret, never by name or public player ID. */
export function restoreLocalLegacy(req:express.Request,res:express.Response,db:DatabaseSync,store:IdentityStore,paths:string[]){
 if(process.env.NODE_ENV==='production'||!paths.length)return undefined;
 const secret=store.credential(req);if(!secret||store.status(req)==='expired')return undefined;
 const digest=createHash('sha256').update(secret).digest('hex');
 // Never revive an expired/revoked credential for an already mapped destination company.
 if(db.prepare('SELECT token_hash FROM company_sessions WHERE token_hash=?').get(digest))return undefined;
 const matches:Imported[]=[];
 for(const path of paths){if(!existsSync(path))continue;const source=new DatabaseSync(path,{readOnly:true});
  try{source.exec('BEGIN');const tables=new Set(source.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));if(!tables.has('foundation_saves'))continue;
   let saveId=secret,player:Record<string,unknown>|undefined;
   if(tables.has('company_players')){
    const auth=tables.has('company_sessions')?source.prepare('SELECT player_id FROM company_sessions WHERE token_hash=? AND expires_at>?').get(digest,Date.now()):undefined;
    if(auth){player=source.prepare('SELECT * FROM company_players WHERE id=?').get(auth.player_id as string);if(!player)continue;saveId=player.save_id as string;}
    else if(source.prepare('SELECT id FROM company_players WHERE save_id=?').get(secret))continue;
   }
   const row=source.prepare('SELECT state FROM foundation_saves WHERE id=?').get(saveId);if(!row)continue;
   const ava=tables.has('foundation_ava')?source.prepare('SELECT progress FROM foundation_ava WHERE session=?').get(saveId):undefined;
   const actions=tables.has('foundation_actions')?source.prepare('SELECT id,payload,amount FROM foundation_actions WHERE session=?').all(saveId):[];
   matches.push({saveId,state:row.state as string,ava:ava?.progress as string|undefined,actions,player});
  }finally{source.exec('ROLLBACK');source.close();}
 }
 if(matches.length>1)throw new Error('LOCAL_SESSION_AMBIGUOUS');if(!matches.length)return undefined;
 const saved=matches[0];
 const state=JSON.parse(saved.state);if(!state||state.version!==1||!Number.isFinite(state.compute)||!Number.isFinite(state.level))throw new Error('LOCAL_SAVE_INVALID');
 if(saved.ava)JSON.parse(saved.ava);
 if(db.prepare('SELECT id FROM foundation_saves WHERE id=?').get(saved.saveId)||db.prepare('SELECT id FROM company_players WHERE id=?').get((saved.player?.id||'') as string))return undefined;
 db.exec('BEGIN IMMEDIATE');try{
  db.prepare('INSERT INTO foundation_saves(id,state) VALUES(?,?)').run(saved.saveId,saved.state);
  if(saved.ava)db.prepare('INSERT INTO foundation_ava(session,progress) VALUES(?,?)').run(saved.saveId,saved.ava);
  for(const a of saved.actions)db.prepare('INSERT INTO foundation_actions(session,id,payload,amount) VALUES(?,?,?,?)').run(saved.saveId,a.id as string,a.payload as string,a.amount as number);
  let player,credential;
  if(saved.player){const p=saved.player;db.prepare('INSERT INTO company_players(id,save_id,name,name_key,name_deferred,recovery_hash,recovery_updated_at,created_at) VALUES(?,?,?,?,?,?,?,?)').run(p.id as string,saved.saveId,p.name as string|null,p.name_key as string|null,p.name_deferred as number,p.recovery_hash as string|null,p.recovery_updated_at as number|null,p.created_at as number);player=store.getPlayer(p.id as string)!;credential=store.issue(res,player,req,randomUUID(),false);}
  else {const enrolled=store.enroll(saved.saveId,res,req);player=enrolled.player;credential=enrolled.credential;}
  // Retain the verified old secret as a hashed compatibility credential until normal revocation.
  store.issue(res,player,req,secret,false);
  db.exec('COMMIT');store.cookie(res,req,credential);return player;
 }catch(e){db.exec('ROLLBACK');throw e;}
}
