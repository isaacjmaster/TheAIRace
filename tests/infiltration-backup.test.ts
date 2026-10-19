import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {backupBeforeInfiltrationMigration} from '../server/infiltration-backup';
import {registerFoundation} from '../server/foundation-api';
import {initialFoundation} from '../shared/foundation';
test('first Infiltration upgrade backs up committed WAL saves before additive migration and skips future boots',()=>{
 const dir=mkdtempSync(join(tmpdir(),'airace-pre-infiltration-')),db=new DatabaseSync(join(dir,'game.sqlite'));
 try{db.exec('PRAGMA journal_mode=WAL;CREATE TABLE foundation_saves(id TEXT PRIMARY KEY,state TEXT NOT NULL);CREATE TABLE foundation_ava(session TEXT PRIMARY KEY,progress TEXT NOT NULL);CREATE TABLE foundation_actions(session TEXT,id TEXT,payload TEXT,amount INTEGER,PRIMARY KEY(session,id))');
 const state=JSON.stringify({...initialFoundation(),compute:735,bots:4}),progress=JSON.stringify({status:'complete',step:16,revision:5,collected:true});
 db.prepare('INSERT INTO foundation_saves VALUES(?,?)').run('legacy-secret',state);db.prepare('INSERT INTO foundation_ava VALUES(?,?)').run('legacy-secret',progress);db.exec("INSERT INTO foundation_actions VALUES('legacy-secret','receipt','original',12)");
 const path=backupBeforeInfiltrationMigration(db)!;assert.ok(existsSync(path));const copy=new DatabaseSync(path);
 try{for(const table of ['foundation_saves','foundation_ava','foundation_actions'])assert.deepEqual(copy.prepare('SELECT * FROM '+table).all(),db.prepare('SELECT * FROM '+table).all());registerFoundation(express(),copy);assert.equal(copy.prepare('SELECT state FROM foundation_saves').get()!.state,state);assert.equal(copy.prepare('SELECT progress FROM foundation_ava').get()!.progress,progress);assert.equal(copy.prepare('SELECT COUNT(*) n FROM company_players').get()!.n,1);assert.equal(copy.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');}finally{copy.close();}
 assert.equal(db.prepare("SELECT 1 FROM sqlite_master WHERE name='company_players'").get(),undefined);registerFoundation(express(),db);assert.equal(backupBeforeInfiltrationMigration(db),null);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('empty databases need no legacy backup',()=>{const db=new DatabaseSync(':memory:');try{assert.equal(backupBeforeInfiltrationMigration(db),null);}finally{db.close();}});
