import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {redesignHangar,type FoundationState} from '../shared/foundation';

/** Explicit maintenance command, never a startup migration or public HTTP action.
 * Run with writes paused; BEGIN IMMEDIATE also excludes concurrent SQLite writers.
 * Dry run does not write a byte. Apply always verifies a private complete backup first. */
export function migrateHangars(db:DatabaseSync,apply=false){
 const rows=db.prepare('SELECT id,state FROM foundation_saves ORDER BY id').all();
 const planned=rows.map(row=>{const state=JSON.parse(String(row.state)) as FoundationState;const result=redesignHangar(state);return {id:String(row.id),before:String(row.state),state,result};}).filter(r=>r.result!=='unchanged');
 const report={expanded:planned.filter(r=>r.result==='expanded').length,unplaced:planned.filter(r=>r.result==='unplaced').length,total:planned.length};
 if(!apply||!planned.length)return {...report,applied:false};
 const file=String(db.prepare('PRAGMA database_list').all().find(r=>r.name==='main')?.file??'');if(!file)throw Error('A persistent database is required for the verified backup.');
 const folder=join(dirname(file),'backups');mkdirSync(folder,{recursive:true,mode:0o700});const backup=join(folder,'pre-hangar-redesign-'+Date.now()+'-'+randomUUID()+'.sqlite');db.prepare('VACUUM INTO ?').run(backup);chmodSync(backup,0o600);const copy=new DatabaseSync(backup,{readOnly:true});try{if(copy.prepare('PRAGMA integrity_check').get()?.integrity_check!=='ok')throw Error('Backup integrity check failed.');}finally{copy.close();}
 db.exec('BEGIN IMMEDIATE');try{
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name!='foundation_saves' ORDER BY name").all().map(r=>String(r.name));
  const fingerprint=()=>createHash('sha256').update(JSON.stringify(tables.map(n=>[n,db.prepare('SELECT * FROM "'+n.replaceAll('"','""')+'"').all().map(r=>JSON.stringify(r)).sort()]))).digest('hex'),before=fingerprint();
  for(const row of planned){row.state.revision++;const updated=db.prepare('UPDATE foundation_saves SET state=? WHERE id=? AND state=?').run(JSON.stringify(row.state),row.id,row.before);if(updated.changes!==1)throw Error('A save changed during preflight. No migration applied; retry in maintenance.');}
  if(before!==fingerprint())throw Error('Unexpected change outside building layouts.');
  db.exec('COMMIT');return {...report,applied:true,backup};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
