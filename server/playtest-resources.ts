import type {DatabaseSync} from 'node:sqlite';
import type {FoundationState} from '../shared/foundation';
const KEY='neuralvex-resources-2026-10-29';
export const PLAYTEST_BALANCE=1_000_000_000;
/** Explicit owner-requested grant. Resolve once, then pin the save ID and reset generation.
 * No HTTP grant endpoint; a later username owner cannot inherit the override. */
export function playtestResources(db:DatabaseSync,enable=false){
 db.exec(`CREATE TABLE IF NOT EXISTS playtest_resource_grants(key TEXT PRIMARY KEY,save_id TEXT,generation INTEGER,before_state TEXT,created_at INTEGER NOT NULL)`);
 if(enable&&!db.prepare('SELECT 1 FROM playtest_resource_grants WHERE key=?').get(KEY)){
  db.exec('BEGIN IMMEDIATE');try{
   const target=db.prepare(`SELECT p.save_id,s.state FROM player_usernames u JOIN company_players p ON p.id=u.player_id JOIN foundation_saves s ON s.id=p.save_id WHERE u.username=? COLLATE NOCASE`).get('NeuralVex');
   // Record even an absent target: never grant to a future account claiming this name.
   const state=target?JSON.parse(String(target.state)) as FoundationState:null;
   db.prepare('INSERT INTO playtest_resource_grants VALUES(?,?,?,?,?)').run(KEY,target?String(target.save_id):null,state?.generation??null,target?String(target.state):null,Date.now());
   if(state){state.compute=PLAYTEST_BALANCE;state.research=PLAYTEST_BALANCE;state.revision++;db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(state),String(target!.save_id));}
   db.exec('COMMIT');console.log(`NeuralVex playtest resources: ${target?'enabled until account reset':'account absent; no grant applied'}.`);
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
 const grant=db.prepare('SELECT save_id,generation FROM playtest_resource_grants WHERE key=?').get(KEY);
 return (saveId:string,state:FoundationState)=>{
  if(grant?.save_id===saveId&&(state.generation??0)===Number(grant.generation??0)){
   state.compute=PLAYTEST_BALANCE;state.research=PLAYTEST_BALANCE;
  }
 };
}
