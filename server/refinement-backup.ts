import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
/** Called before additive gameplay-refinement migration on production. A failed backup prevents startup. */
export function backupBeforeGameplayRefinement(db:DatabaseSync){
 if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='gameplay_refinement_release'").get())return null;
 if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='foundation_saves'").get()||!Number(db.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n))return null;
 const file=String(db.prepare('PRAGMA database_list').all().find(r=>r.name==='main')?.file??'');if(!file)throw Error('gameplay-refinement migration requires a persistent backup destination.');
 const count=Number(db.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n);
 const folder=join(dirname(file),'backups');mkdirSync(folder,{recursive:true,mode:0o700});const target=join(folder,'pre-gameplay-refinement-'+Date.now()+'-'+randomUUID()+'.sqlite');db.prepare('VACUUM INTO ?').run(target);chmodSync(target,0o600);
 const copy=new DatabaseSync(target,{readOnly:true});try{if(copy.prepare('PRAGMA integrity_check').get()!.integrity_check!=='ok')throw Error('gameplay-refinement backup failed integrity verification.');if(Number(copy.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n)<count)throw Error('gameplay-refinement backup company count mismatch.');}finally{copy.close();}
 db.exec('CREATE TABLE gameplay_refinement_release (version INTEGER PRIMARY KEY); INSERT INTO gameplay_refinement_release VALUES(1)');
 console.log('Verified pre-gameplay-refinement SQLite backup saved on the existing persistent volume.');return target;
}
