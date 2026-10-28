import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync,existsSync,readFileSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,unlinkSync} from 'node:fs';
import {dirname,basename,join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
type Receipt={release:'five-tier-v1';file:string;companies:number};
function verify(path:string,count:number){const copy=new DatabaseSync(path,{readOnly:true});try{if(copy.prepare('PRAGMA integrity_check').get()!.integrity_check!=='ok')throw Error('Five-tier progression backup failed integrity verification.');if(Number(copy.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n)!==count)throw Error('Five-tier progression backup company count mismatch.');}finally{copy.close();}}
/** Before production routes/migrations run. Only backup files change; player rows and schema remain untouched. */
export function backupBeforeFiveTierV1(db:DatabaseSync){
 if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='foundation_saves'").get())return null;
 const count=Number(db.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n);if(!count)return null;
 const file=String(db.prepare('PRAGMA database_list').all().find(r=>r.name==='main')?.file??'');if(!file)throw Error('Five-tier progression update requires a persistent backup destination.');
 const folder=join(dirname(file),'backups'),key=createHash('sha256').update(basename(file)).digest('hex').slice(0,16),marker=join(folder,`five-tier-v1-${key}.json`);
 mkdirSync(folder,{recursive:true,mode:0o700});
 if(existsSync(marker)){
  const saved=JSON.parse(readFileSync(marker,'utf8')) as Receipt;
  if(saved.release!=='five-tier-v1'||typeof saved.file!=='string'||basename(saved.file)!==saved.file||!/^pre-five-tier-v1-[\w-]+\.sqlite$/.test(saved.file)||!Number.isSafeInteger(saved.companies)||saved.companies<1)throw Error('Five-tier progression backup receipt is invalid.');
  const target=join(folder,saved.file);if(existsSync(target)){verify(target,saved.companies);return null;}
 }
 const name=`pre-five-tier-v1-${Date.now()}-${randomUUID()}.sqlite`,target=join(folder,name);db.prepare('VACUUM INTO ?').run(target);chmodSync(target,0o600);verify(target,count);
 const receipt:Receipt={release:'five-tier-v1',file:name,companies:count},temporary=marker+'.'+randomUUID()+'.tmp';let handle:number|undefined;
 try{handle=openSync(temporary,'wx',0o600);writeFileSync(handle,JSON.stringify(receipt));fsyncSync(handle);closeSync(handle);handle=undefined;renameSync(temporary,marker);}finally{if(handle!==undefined)closeSync(handle);if(existsSync(temporary))unlinkSync(temporary);}
 console.log('Verified pre-five-tier-v1 SQLite backup saved on the existing persistent volume.');return target;
}
