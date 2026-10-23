import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {registerFoundation} from '../server/foundation-api';
import {backupBeforeIdentityMigration} from '../server/identity-backup';
import {saveUsername,usernameProfile} from '../server/usernames';
import {USERNAME_COOLDOWN_MS} from '../shared/identity';

test('username migration on a verified representative save copy never adopts legacy labels or alters progression',()=>{
 const dir=mkdtempSync(join(tmpdir(),'airace-usernames-')),db=new DatabaseSync(join(dir,'existing.sqlite'));
 try{
  registerFoundation(express(),db);
  const state=JSON.stringify({version:1,level:3,compute:743,research:72,bots:6,buildings:['preserve']}),ava='{"status":"complete","step":16,"revision":12}';
  db.prepare('INSERT INTO foundation_saves VALUES(?,?)').run('save',state);
  db.prepare('INSERT INTO foundation_ava VALUES(?,?)').run('save',ava);
  db.prepare('INSERT INTO company_players(id,save_id,name,name_key,recovery_hash,created_at) VALUES(?,?,?,?,?,?)').run('permanent','save','LegacyValid','legacyvalid','credential-hash',100);
  db.prepare('INSERT INTO company_influence VALUES(?,?)').run('permanent',250);
  db.exec('DROP TABLE player_usernames;DELETE FROM identity_migrations WHERE version=3');
  const path=backupBeforeIdentityMigration(db,3)!;const copy=new DatabaseSync(path);
  try{
   const tables=['company_players','foundation_saves','foundation_ava','company_influence','company_sessions'];
   const before=tables.map(t=>copy.prepare('SELECT * FROM '+t).all());
   registerFoundation(express(),copy);registerFoundation(express(),copy);
   tables.forEach((t,i)=>assert.deepEqual(copy.prepare('SELECT * FROM '+t).all(),before[i]));
   assert.equal(copy.prepare('SELECT COUNT(*) n FROM player_usernames').get()!.n,0);
   assert.equal(usernameProfile(copy,'permanent',1000).username,null);
   saveUsername(copy,'permanent','Fresh_Name',1000);
   assert.equal(usernameProfile(copy,'permanent',1001).usernameChangedAt,null);
   assert.equal(copy.prepare('SELECT state FROM foundation_saves').get()!.state,state);
   assert.equal(copy.prepare('SELECT total FROM company_influence').get()!.total,250);
   assert.equal(copy.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');
  }finally{copy.close();}
  const reopened=new DatabaseSync(path);try{registerFoundation(express(),reopened);assert.equal(usernameProfile(reopened,'permanent',2000).username,'Fresh_Name');saveUsername(reopened,'permanent','Renamed_Founder',2000);}finally{reopened.close();}
  const restarted=new DatabaseSync(path);try{registerFoundation(express(),restarted);assert.equal(usernameProfile(restarted,'permanent',2001).usernameAvailableAt,2000+USERNAME_COOLDOWN_MS);assert.throws(()=>saveUsername(restarted,'permanent','Too_Soon',2001),/not available/);assert.equal(restarted.prepare('SELECT recovery_hash FROM company_players').get()!.recovery_hash,'credential-hash');}finally{restarted.close();}
  assert.equal(db.prepare("SELECT 1 FROM sqlite_master WHERE name='player_usernames'").get(),undefined);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});

test('authoritative username API handles retries, exact 14-day boundary, concurrency, score identity and recovery',async()=>{
 const db=new DatabaseSync(':memory:');let now=1_800_000_000_000;
 const app=express();app.use(express.json());registerFoundation(app,db,{clock:()=>now});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/foundation`;
 const fresh=async()=>{const r=await fetch(base),data=await r.json();return {id:data.company.playerId,cookie:r.headers.get('set-cookie')!.split(';')[0]};};
 type Actor=Awaited<ReturnType<typeof fresh>>;
 const post=async(p:Actor,path:string,body:unknown)=>{const r=await fetch(base+'/company/'+path,{method:'POST',headers:{cookie:p.cookie,'content-type':'application/json','X-Company-ID':p.id},body:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
  const a=await fresh(),b=await fresh();
  assert.equal((await post(a,'username',{username:'Isaac'})).data.company.usernameChangedAt,null);
  assert.equal((await post(b,'username',{username:'isaac'})).status,409);
  const first=await post(a,'username',{username:'Thunderbolt'});assert.equal(first.status,200);assert.equal(first.data.company.usernameAvailableAt,now+USERNAME_COOLDOWN_MS);
  const changedAt=first.data.company.usernameChangedAt;
  assert.equal((await post(a,'username',{username:' thunderBOLT '})).data.company.usernameChangedAt,changedAt);
  assert.equal((await post(a,'username',{username:'Bad Name'})).status,400);
  assert.equal((await post(a,'username',{username:'Next_Name',now:now+99999999999})).status,409);
  assert.equal((await post(b,'username',{username:'Isaac'})).status,200); // old name immediately released
  now=changedAt+USERNAME_COOLDOWN_MS-1;assert.equal((await post(a,'username',{username:'Next_Name'})).status,409);
  now++;const concurrent=await Promise.all([post(a,'username',{username:'Next_Name'}),post(a,'username',{username:'Other_Name'})]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  const final=concurrent.find(r=>r.status===200)!.data.company;
  db.prepare('INSERT INTO company_influence VALUES(?,?)').run(a.id,375);
  const ranking=await(await fetch(base+'/leaderboard',{headers:{cookie:a.cookie}})).json();assert.equal(ranking.rows[0].name,final.username);assert.equal(ranking.rows[0].influence,375);assert.equal(ranking.own.companyId,a.id);
  const code=(await post(a,'recovery-code',{})).data.code;
  const ticket=(await post(b,'recover/check',{code})).data.ticket;
  const recovered=await post(b,'recover/confirm',{ticket,confirm:true});
  const restored=await(await fetch(base,{headers:{cookie:recovered.cookie!}})).json();assert.equal(restored.company.username,final.username);assert.equal(restored.company.usernameChangedAt,now);assert.equal(restored.company.playerId,a.id);assert.equal(restored.competition.total,375);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM company_players').get()!.n,2);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM company_influence WHERE company_id=?').get(a.id)!.n,1);
  // Database constraints are a second line of defense, independent of API validation.
  for(const invalid of ['ab','has space','a'.repeat(17),'SYSTEM','mod_erator','Good\0Name'])assert.throws(()=>db.prepare('UPDATE player_usernames SET username=? WHERE player_id=?').run(invalid,a.id),/CHECK/);
  assert.throws(()=>db.prepare('UPDATE player_usernames SET username=? WHERE player_id=?').run('ISAAC',a.id),/UNIQUE/);
 }finally{await new Promise<void>(r=>server.close(()=>r()));db.close();}
});
