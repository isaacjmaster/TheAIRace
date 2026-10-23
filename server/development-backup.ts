import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
/** Called before additive development Influence migration on production. A failed backup prevents startup. */
export function backupBeforeDevelopmentMigration(db:DatabaseSync){
 if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='construction_influence_receipts'").get())return null;
 if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='foundation_saves'").get()||!Number(db.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n))return null;
 const file=String(db.prepare('PRAGMA database_list').all().find(r=>r.name==='main')?.file??'');if(!file)throw Error('development Influence migration requires a persistent backup destination.');
 const count=Number(db.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n);
 const folder=join(dirname(file),'backups');mkdirSync(folder,{recursive:true,mode:0o700});const target=join(folder,'pre-development-influence-'+Date.now()+'-'+randomUUID()+'.sqlite');db.prepare('VACUUM INTO ?').run(target);chmodSync(target,0o600);
 const copy=new DatabaseSync(target,{readOnly:true});try{if(copy.prepare('PRAGMA integrity_check').get()!.integrity_check!=='ok')throw Error('development Influence backup failed integrity verification.');if(Number(copy.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n)<count)throw Error('development Influence backup company count mismatch.');}finally{copy.close();}
 console.log('Verified pre-development Influence SQLite backup saved on the existing persistent volume.');return target;
}
