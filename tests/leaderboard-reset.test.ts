import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {resetLaunchLeaderboard,LAUNCH_SCORE_RESET} from '../server/leaderboard-reset';

function fixture(){const db=new DatabaseSync(':memory:');db.exec(`CREATE TABLE company_influence(company_id TEXT PRIMARY KEY,total INTEGER NOT NULL CHECK(total>=0));
 CREATE TABLE foundation_saves(id TEXT PRIMARY KEY,state TEXT);INSERT INTO foundation_saves VALUES('save','{"compute":777,"research":123,"buildings":["hq"]}');
 CREATE TABLE award_receipts(id TEXT PRIMARY KEY,awarded INTEGER);INSERT INTO award_receipts VALUES('already-paid',50);
 INSERT INTO company_influence VALUES('owner',375),('other',25),('new',0);`);return db;}

test('launch reset zeros scores and archives previous totals without changing saves or receipts',()=>{const db=fixture();try{
 const saves=db.prepare('SELECT * FROM foundation_saves').all(),receipts=db.prepare('SELECT * FROM award_receipts').all();
 assert.deepEqual(resetLaunchLeaderboard(db,1000),{companies:2,previousTotal:400});
 assert.equal(db.prepare('SELECT SUM(total) n FROM company_influence').get()!.n,0);
 assert.deepEqual(db.prepare('SELECT * FROM foundation_saves').all(),saves);assert.deepEqual(db.prepare('SELECT * FROM award_receipts').all(),receipts);
 assert.equal(db.prepare('SELECT total FROM leaderboard_score_reset_backup WHERE reset_id=? AND company_id=?').get(LAUNCH_SCORE_RESET,'owner')!.total,375);
 db.prepare('UPDATE company_influence SET total=50 WHERE company_id=?').run('owner');
 assert.equal(resetLaunchLeaderboard(db,2000),null);assert.equal(db.prepare('SELECT total FROM company_influence WHERE company_id=?').get('owner')!.total,50);
 assert.equal(db.prepare('SELECT applied_at FROM leaderboard_score_resets').get()!.applied_at,1000);
 }finally{db.close();}});

test('reset failure rolls scores, backup and marker back together, then can safely retry',()=>{const db=fixture();try{
 db.exec("CREATE TRIGGER reject_reset BEFORE UPDATE ON company_influence BEGIN SELECT RAISE(ABORT,'simulated failure'); END;");
 assert.throws(()=>resetLaunchLeaderboard(db,1000),/simulated failure/);assert.equal(db.prepare('SELECT SUM(total) n FROM company_influence').get()!.n,400);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='leaderboard_score_resets'").get()!.n,0);
 db.exec('DROP TRIGGER reject_reset');assert.deepEqual(resetLaunchLeaderboard(db,2000),{companies:2,previousTotal:400});
 }finally{db.close();}});
