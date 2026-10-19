import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
/** First production Infiltration upgrade: fail closed unless SQLite creates a verified snapshot. */
export function backupBeforeInfiltrationMigration(db:DatabaseSync){
 const has=(name:string)=>!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
 if(has('infiltration_results'))return null;
 if(!has('foundation_saves')||!Number(db.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n))return null;
 const file=String(db.prepare('PRAGMA database_list').all().find(r=>r.name==='main')?.file||'');
 if(!file)throw new Error('Infiltration upgrade requires a persistent backup destination.');
 const folder=join(dirname(file),'backups');mkdirSync(folder,{recursive:true,mode:0o700});
 const target=join(folder,'pre-infiltration-'+Date.now()+'-'+randomUUID()+'.sqlite');
 // VACUUM INTO takes a consistent SQLite snapshot, including committed WAL data.
 db.prepare('VACUUM INTO ?').run(target);chmodSync(target,0o600);
 const copy=new DatabaseSync(target,{readOnly:true});
 try{if(copy.prepare('PRAGMA integrity_check').get()!.integrity_check!=='ok')throw new Error('Infiltration backup failed integrity verification.');}
 finally{copy.close();}
 console.log('Verified pre-infiltration SQLite backup saved on persistent volume.');
 return target;
}
