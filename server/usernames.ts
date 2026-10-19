import type {DatabaseSync} from 'node:sqlite';
import {USERNAME_COOLDOWN_MS,USERNAME_RESERVED,cleanUsername} from '../shared/identity';
export function installUsernames(db:DatabaseSync){
 // Deliberately no backfill from company_players.name. Legacy labels remain unused.
 db.exec(`CREATE TABLE IF NOT EXISTS player_usernames(
 player_id TEXT NOT NULL PRIMARY KEY REFERENCES company_players(id),
 username TEXT NOT NULL COLLATE NOCASE UNIQUE
 CHECK(instr(username,char(0))=0)
 CHECK(length(username) BETWEEN 3 AND 16 AND username NOT GLOB '*[^A-Za-z0-9_]*')
 CHECK(lower(replace(username,'_','')) NOT IN (${USERNAME_RESERVED.map(n=>`'${n}'`).join(',')})),
 changed_at INTEGER,created_at INTEGER NOT NULL);
 INSERT OR IGNORE INTO identity_migrations VALUES(3,${Date.now()});`);
}
export function usernameProfile(db:DatabaseSync,id:string,now:number){
 const row=db.prepare('SELECT username,changed_at FROM player_usernames WHERE player_id=?').get(id);
 const username=row?String(row.username):null,changed=row?.changed_at==null?null:Number(row.changed_at);
 return {username,name:username,usernameChangedAt:changed,usernameAvailableAt:changed===null?null:changed+USERNAME_COOLDOWN_MS,serverTime:now};
}
export function saveUsername(db:DatabaseSync,id:string,value:unknown,now:number){
 const username=cleanUsername(value);
 db.exec('BEGIN IMMEDIATE');
 try{
  const row=db.prepare('SELECT username,changed_at FROM player_usernames WHERE player_id=?').get(id);
  // Case-only retries are unchanged, including during cooldown. Display capitalization stays intact.
  if(row&&String(row.username).toLowerCase()===username.toLowerCase()){db.exec('COMMIT');return;}
  if(row?.changed_at!=null&&now<Number(row.changed_at)+USERNAME_COOLDOWN_MS)throw Object.assign(Error('Your next change is not available yet.'),{status:409});
  if(row)db.prepare('UPDATE player_usernames SET username=?,changed_at=? WHERE player_id=?').run(username,now,id);
  else db.prepare('INSERT INTO player_usernames VALUES(?,?,NULL,?)').run(id,username,now);
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');if((e as Error).message.includes('UNIQUE'))throw Object.assign(Error('That username is taken.'),{status:409});throw e;}
}
