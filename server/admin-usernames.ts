import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';import {dirname,join} from 'node:path';import {randomUUID,createHash} from 'node:crypto';
import {cleanUsername} from '../shared/identity';
type Targets={tigerId:string;renameId:string};
/** Trusted console only. Not registered as an HTTP route or startup migration. */
export function adjustTestUsernames(db:DatabaseSync,targets:Targets,apply=false,now=Date.now()){
 const tiger=db.prepare('SELECT * FROM player_usernames WHERE player_id=?').get(targets.tigerId),rename=db.prepare('SELECT * FROM player_usernames WHERE player_id=?').get(targets.renameId);
 if(!tiger||String(tiger.username).toLowerCase()!=='tiger'||!rename||!['isaactheking','neuralvex'].includes(String(rename.username).toLowerCase()))throw Error('Exact account identity does not match.');
 const newName=cleanUsername('NeuralVex'),taken=db.prepare('SELECT player_id FROM player_usernames WHERE username=? COLLATE NOCASE').get(newName);if(taken&&taken.player_id!==targets.renameId)throw Error('Requested name is unavailable.');
 // A successful repeat is a no-op: never grant a second cooldown exception.
 if(rename.username===newName)return {applied:false,alreadyApplied:true};
 if(!apply)return {applied:false,targets:[{id:targets.tigerId,name:tiger.username,action:'one cooldown exception'},{id:targets.renameId,name:rename.username,action:'rename to NeuralVex'}]};
 const file=String(db.prepare('PRAGMA database_list').all().find(r=>r.name==='main')?.file??'');if(!file)throw Error('A persistent backup is required.');
 const folder=join(dirname(file),'backups');mkdirSync(folder,{recursive:true,mode:0o700});const backup=join(folder,'pre-requested-usernames-'+now+'-'+randomUUID()+'.sqlite');db.prepare('VACUUM INTO ?').run(backup);chmodSync(backup,0o600);const copy=new DatabaseSync(backup,{readOnly:true});try{if(copy.prepare('PRAGMA integrity_check').get()!.integrity_check!=='ok')throw Error('Backup verification failed.');}finally{copy.close();}
 db.exec('BEGIN IMMEDIATE');try{
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name!='player_usernames' ORDER BY name").all().map(r=>String(r.name));
  const fingerprint=()=>createHash('sha256').update(JSON.stringify(tables.map(n=>[n,db.prepare('SELECT * FROM "'+n.replaceAll('"','""')+'"').all().map(r=>JSON.stringify(r)).sort()]))).digest('hex');
  const before=fingerprint(),others=JSON.stringify(db.prepare('SELECT * FROM player_usernames WHERE player_id NOT IN (?,?) ORDER BY player_id').all(targets.tigerId,targets.renameId));
  const a=db.prepare('UPDATE player_usernames SET changed_at=NULL WHERE player_id=? AND username=? COLLATE NOCASE').run(targets.tigerId,'tiger');
  const b=db.prepare('UPDATE player_usernames SET username=?,changed_at=? WHERE player_id=? AND username=? COLLATE NOCASE').run(newName,now,targets.renameId,'isaactheking');
  if(a.changes!==1||b.changes!==1||before!==fingerprint()||others!==JSON.stringify(db.prepare('SELECT * FROM player_usernames WHERE player_id NOT IN (?,?) ORDER BY player_id').all(targets.tigerId,targets.renameId)))throw Error('Account update verification failed.');
  db.exec('COMMIT');return {applied:true,backup,unchangedOtherData:true};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
