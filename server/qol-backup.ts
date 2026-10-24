import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
/** Called before additive quality-of-life migration on production. A failed backup prevents startup. */
export function backupBeforeQualityOfLifeMigration(db:DatabaseSync){
 if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='pvp_replays'").get())return null;
 if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='foundation_saves'").get()||!Number(db.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n))return null;
 const file=String(db.prepare('PRAGMA database_list').all().find(r=>r.name==='main')?.file??'');if(!file)throw Error('quality-of-life migration requires a persistent backup destination.');
 const count=Number(db.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n);
 const folder=join(dirname(file),'backups');mkdirSync(folder,{recursive:true,mode:0o700});const target=join(folder,'pre-quality-of-life-'+Date.now()+'-'+randomUUID()+'.sqlite');db.prepare('VACUUM INTO ?').run(target);chmodSync(target,0o600);
 const copy=new DatabaseSync(target,{readOnly:true});try{if(copy.prepare('PRAGMA integrity_check').get()!.integrity_check!=='ok')throw Error('quality-of-life backup failed integrity verification.');if(Number(copy.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n)<count)throw Error('quality-of-life backup company count mismatch.');}finally{copy.close();}
 console.log('Verified pre-quality-of-life SQLite backup saved on the existing persistent volume.');return target;
}
