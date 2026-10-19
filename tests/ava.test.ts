import {establishedFoundation as initialFoundation,placeTestStation} from './helpers/established-foundation';
import {assertLandscapeMigration} from './helpers/landscape';
import {identityHeaders,saveIdForCookie} from './helpers/identity';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {buildRig,advanceFoundation} from '../shared/foundation';
import {newAva,legacyAva,reconcileAva,commandAva,avaLine,avaPose} from '../shared/ava';
import {registerFoundation} from '../server/foundation-api';
const epoch=1700000000000;
test('Ava observes construction and offline completion without mutating gameplay',()=>{
 const s=initialFoundation(),before=JSON.stringify(s);let p=newAva();
 for(let i=0;i<7;i++)p=commandAva(p,'continue',s,epoch);
 assert.equal(p.step,7);assert.equal(JSON.stringify(s),before);
 p=commandAva(p,'continue',s,epoch);assert.equal(p.step,7);
 p=commandAva(p,'build-menu',s,epoch);assert.equal(p.step,8);
 p=commandAva(p,'rig-selected',s,epoch);assert.equal(p.step,9);
 p=commandAva(p,'continue',s,epoch);assert.equal(p.step,9);
 buildRig(s,[6,0],epoch);const built=JSON.stringify(s);
 p=reconcileAva(p,s,epoch);assert.equal(p.step,10);
 assert.equal(commandAva(p,'continue',s,epoch).step,10);
 p=reconcileAva(JSON.parse(JSON.stringify(p)),s,epoch+15000);assert.equal(p.step,11);
 assert.equal(JSON.stringify(s),built);p=commandAva(p,'continue',s,epoch+15000);assert.equal(p.step,12);
 assert.equal(commandAva(p,'continue',s,epoch+15000).step,12);
 p=reconcileAva({...p,collected:true},s,epoch+27000);assert.equal(p.step,13);
 for(let i=0;i<3;i++)p=commandAva(p,'continue',s,epoch+27000);
 assert.equal(p.status,'complete');assert.equal(s.compute,50);
});
test('legacy, skip, replay, already-owned rig, busy builder, insufficient funds and full capacity',()=>{
 const s=initialFoundation();assert.equal(reconcileAva(legacyAva(),s,epoch).status,'legacy');
 assert.equal(commandAva(newAva(),'skip',s,epoch).status,'skipped');
 let p=commandAva(legacyAva(),'replay',s,epoch);assert.equal(p.step,0);assert.equal(p.status,'active');
 buildRig(s,[6,0],epoch);advanceFoundation(s,epoch+27000);
 for(let i=0;i<7;i++)p=commandAva(p,'continue',s,epoch+27000);
 assert.equal(p.step,11);assert.equal(s.compute,50);assert.ok(s.rig);
 const waiting={...newAva(),step:7};const empty=initialFoundation();empty.buildersBusy=1;
 assert.match(avaLine(waiting,empty,epoch,null,null),/finishing another job/);
 empty.buildersBusy=0;empty.compute=0;assert.match(avaLine(waiting,empty,epoch,null,null),/don't have enough/);
 s.compute=s.capacity;assert.match(avaLine({...waiting,step:12},s,epoch+27000,null,null),/storage is full/);
});
test('foundation Ava API preserves legacy saves, persists progress, ignores stale retries, and requires actual collection',async()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE foundation_saves(id TEXT PRIMARY KEY,state TEXT NOT NULL)');
 const legacyId=randomUUID(),legacy=initialFoundation();legacy.compute=83;
 db.prepare('INSERT INTO foundation_saves VALUES(?,?)').run(legacyId,JSON.stringify(legacy));
 const app=express();app.use(express.json());registerFoundation(app,db);
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/foundation`;
 try{
 const oldCookie=`airace_foundation_session=${legacyId}`;
 const old=await(await fetch(base,{headers:{cookie:oldCookie}})).json();assert.equal(old.ava.status,'legacy');assertLandscapeMigration(old.state,legacy);
 const first=await fetch(base),cookie=first.headers.get('set-cookie')!.split(';')[0],id=saveIdForCookie(db,cookie);let snapshot=await first.json();assert.equal(snapshot.ava.step,0);
 const headers=identityHeaders(db,cookie);
 const read=async()=>{snapshot=await(await fetch(base,{headers})).json();return snapshot;};
 const command=async(command:string,revision=snapshot.ava.revision)=>{const r=await fetch(base+'/ava',{method:'POST',headers,body:JSON.stringify({command,revision,generation:0})});assert.equal(r.status,200);snapshot.ava=(await r.json()).ava;};
 assert.equal(snapshot.ava.opening,'pending');const openingRevision=snapshot.ava.revision;await command('begin-opening');await read();assert.equal(snapshot.ava.opening,'shown');assert.equal(snapshot.ava.step,0);await command('begin-opening',openingRevision);assert.equal(snapshot.ava.opening,'shown');
 const initialRevision=snapshot.ava.revision;await command('continue');await command('continue',initialRevision);assert.equal(snapshot.ava.step,1);
 await read();assert.equal(snapshot.ava.step,1); // Reload restores the exact dialogue moment.
 while(snapshot.ava.step<7){if(snapshot.ava.step===5&&snapshot.ava.builderStep===1){await command('build-menu');await command('station-selected');await placeTestStation(base,headers);await read();}else await command('continue');}assert.equal(snapshot.ava.step,7);
 await command('continue');assert.equal(snapshot.ava.step,7);
 await command('build-menu');await command('rig-selected');assert.equal(snapshot.ava.step,9);
 const purchase={action:'build',position:[6,0],generation:0,requestId:randomUUID()};
 const rig=await fetch(base+'/rig',{method:'POST',headers,body:JSON.stringify(purchase)});assert.equal(rig.status,200);snapshot=await rig.json();assert.equal(snapshot.ava.step,10);assert.equal(snapshot.state.compute,50);
 await fetch(base+'/rig',{method:'POST',headers,body:JSON.stringify(purchase)});assert.equal((await read()).state.compute,50);
 const saved=JSON.parse(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(id)!.state as string);
 saved.rig.completesAt=Date.now()-30000;saved.rig.lastProducedAt=Date.now()-30000;
 db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(saved),id);
 await read();assert.equal(snapshot.ava.step,11);await command('continue');assert.equal(snapshot.ava.step,12);
 await command('continue');assert.equal(snapshot.ava.step,12);
 const request={action:'collect',generation:0,requestId:randomUUID()};
 const collect=await fetch(base+'/rig',{method:'POST',headers,body:JSON.stringify(request)});snapshot=await collect.json();assert.ok(snapshot.amount>0);assert.equal(snapshot.ava.step,13);
 const balance=snapshot.state.compute;
 await fetch(base+'/rig',{method:'POST',headers,body:JSON.stringify(request)});await read();assert.equal(snapshot.state.compute,balance);assert.equal(snapshot.ava.step,13);
 for(let i=0;i<3;i++)await command('continue');assert.equal(snapshot.ava.status,'complete');
 await command('replay');assert.equal(snapshot.ava.step,0);await command('skip');await read();assert.equal(snapshot.ava.status,'skipped');assert.equal(snapshot.state.compute,balance);
 assert.equal(snapshot.ava.opening,undefined);
 // Replaying a legacy save changes only its separate tutorial row.
 const replay=await fetch(base+'/ava',{method:'POST',headers:identityHeaders(db,oldCookie),body:JSON.stringify({command:'replay',revision:0,generation:0})});assert.equal((await replay.json()).ava.status,'active');
 assert.equal(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(legacyId)!.state,JSON.stringify(old.state));
 const invalid=await fetch(base+'/ava',{method:'POST',headers,body:JSON.stringify({command:'continue',revision:0,generation:99})});assert.equal(invalid.status,409);
 }finally{await new Promise<void>(r=>server.close(()=>r()));db.close();}
});

test('Ava gesture follows dialogue without changing tutorial or company state',()=>{
 const s=initialFoundation(),p=newAva(),before=JSON.stringify({s,p});
 for(const step of [0,1,2,10,13,14,15])assert.equal(avaPose(step),'welcome');
 for(const step of [3,4,5,6,7,8,9,11,12])assert.equal(avaPose(step),'point');
 assert.equal(JSON.stringify({s,p}),before);
});
