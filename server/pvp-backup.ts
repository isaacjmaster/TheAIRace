import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
/** Called before additive PvP migration on production. A failed backup prevents startup. */
export function backupBeforePvPMigration(db:DatabaseSync){
 if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='pvp_battles'").get()&&db.prepare('PRAGMA table_info(pvp_battles)').all().some(c=>c.name==='breach_rating'))return null;
 if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='foundation_saves'").get()||!Number(db.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n))return null;
 const file=String(db.prepare('PRAGMA database_list').all().find(r=>r.name==='main')?.file??'');if(!file)throw Error('PvP migration requires a persistent backup destination.');
 const count=Number(db.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n);
 const folder=join(dirname(file),'backups');mkdirSync(folder,{recursive:true,mode:0o700});const target=join(folder,'pre-pvp-'+Date.now()+'-'+randomUUID()+'.sqlite');db.prepare('VACUUM INTO ?').run(target);chmodSync(target,0o600);
 const copy=new DatabaseSync(target,{readOnly:true});try{if(copy.prepare('PRAGMA integrity_check').get()!.integrity_check!=='ok')throw Error('PvP backup failed integrity verification.');if(Number(copy.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n)<count)throw Error('PvP backup company count mismatch.');}finally{copy.close();}
 console.log('Verified pre-PvP SQLite backup saved on the existing persistent volume.');return target;
}
