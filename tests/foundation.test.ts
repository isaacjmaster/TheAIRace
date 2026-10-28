import {assertLandscapeMigration} from './helpers/landscape';
import {identityHeaders,saveIdForCookie} from './helpers/identity';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {registerFoundation} from '../server/foundation-api';
import {initialFoundation} from '../shared/foundation';

test('foundation starts with only Founder HQ, no builder yet with separate Compute and Research balances',()=>{assert.deepEqual(initialFoundation(),{wallRebuild:{version:1,inventory:[],completed:true,migratedAt:0},version:1,revision:0,research:0,researchCapacity:500,founderHqLevel:1,companyName:'Garage Intelligence',level:1,compute:100,capacity:1000,builders:0,starterStation:'unplaced',raidRecord:{wins:[],completeHistory:true}});});
test('foundation saves are isolated; reset needs explicit confirmation, checks revision and never touches old data',async()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE sessions(id TEXT PRIMARY KEY,state TEXT); INSERT INTO sessions VALUES('old','preserve all legacy progress'); CREATE TABLE unrelated(value TEXT); INSERT INTO unrelated VALUES('untouched');");
 const app=express();app.use(express.json());registerFoundation(app,db);const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try{const first=await fetch(url+'/api/foundation',{headers:{cookie:'airace_integrated_session=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}});const cookie=first.headers.get('set-cookie')!.split(';')[0];assert.match(cookie,/^airace_foundation_session=/);assertLandscapeMigration((await first.json()).state,initialFoundation());
 const edited={...initialFoundation(),compute:350,revision:4,raidRecord:{wins:[1],completeHistory:true}};db.prepare('UPDATE foundation_saves SET state=?').run(JSON.stringify(edited));
 const get=async()=> (await(await fetch(url+'/api/foundation',{headers:{cookie}})).json()).state;
 const reset=(body:unknown)=>fetch(url+'/api/foundation/reset',{method:'POST',headers:identityHeaders(db,cookie),body:JSON.stringify(body)});
 assert.equal((await fetch(url+'/api/raid/start',{method:'POST',headers:identityHeaders(db,cookie),body:JSON.stringify({layout:0})})).status,410);const migrated=assertLandscapeMigration(await get(),edited);assert.equal((await reset({revision:4})).status,400);assert.equal((await reset({confirm:'RESET FOUNDATION',revision:3})).status,409);assert.deepEqual(await get(),migrated);
 const success=await reset({confirm:'RESET FOUNDATION',revision:migrated.revision});assert.equal(success.status,200);const resetState={...initialFoundation(6),catalysts:migrated.catalysts,generation:1,raidRecord:edited.raidRecord};assert.deepEqual((await success.json()).state,resetState);assertLandscapeMigration(await get(),resetState);assert.equal((await reset({confirm:'RESET FOUNDATION',revision:4})).status,409);
 assert.equal(db.prepare('SELECT state FROM sessions').get()!.state,'preserve all legacy progress');assert.equal(db.prepare('SELECT value FROM unrelated').get()!.value,'untouched');
 const other=await fetch(url+'/api/foundation');assertLandscapeMigration((await other.json()).state,initialFoundation());assert.equal(db.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n,2);
 }finally{await new Promise<void>(r=>server.close(()=>r()));db.close();}
});
test('active entry keeps retired multi-resource gameplay and legacy campus menus inaccessible',()=>{
 const entry=readFileSync('src/main.tsx','utf8');assert.match(entry,/FoundationApp/);
 const app=readFileSync('src/ui/FoundationApp.tsx','utf8');assert.doesNotMatch(app,/IntegratedRaid|CampusPanel|\/api\/raid|\/api\/campus|Credits|UPGRADES|Missions/);assert.match(app,/confirm:'RESET FOUNDATION'/);assert.match(app,/Cancel/);
 const world=readFileSync('src/ui/FoundationWorld.tsx','utf8');assert.match(world,/hq:1/);assert.match(world,/compute:0,revenue:0,training:0,gpu:0,research:0,defense:0/);
});
